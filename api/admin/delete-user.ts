import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminFirestore } from '../_lib/firebaseAdmin.js';
import { requireAdmin, HttpError } from '../_lib/requireAdmin.js';

// ============================================================
// POST /api/admin/delete-user
// ============================================================
// Exclusão administrativa de usuário — Authentication + Firestore.
// Roda inteiramente no servidor (Vercel Serverless Function); o
// frontend NUNCA usa o Client SDK para excluir a conta de outro
// usuário. A requisição envia somente o UID do usuário-alvo.
//
// Authentication e Firestore não formam uma transação única, então a
// ordem das etapas importa: primeiro NEUTRALIZA o acesso (desabilita +
// revoga refresh tokens) e registra o UID na lista de bloqueio — só
// depois remove o documento em users/{uid} e, por último, a conta do
// Authentication em si. Cada etapa é idempotente (tolera repetição),
// então uma falha no meio do processo pode ser corrigida repetindo a
// mesma chamada: nunca fica uma conta ATIVA com privilégios indevidos,
// mesmo que a operação pare antes do fim.
function respostaErro(res: VercelResponse, status: number, code: string, error: string) {
  return res.status(status).json({ code, error });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respostaErro(res, 405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
  }

  let requester: { uid: string; email: string | null };
  try {
    requester = await requireAdmin(req);
  } catch (e) {
    if (e instanceof HttpError) return respostaErro(res, e.status, e.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', e.message);
    console.error('delete-user: erro inesperado ao verificar administrador');
    return respostaErro(res, 500, 'INTERNAL_ERROR', 'Erro interno ao excluir usuário.');
  }

  const body = (req.body ?? {}) as { targetUid?: unknown };
  const targetUid = typeof body.targetUid === 'string' ? body.targetUid.trim() : '';
  if (!targetUid) {
    return respostaErro(res, 400, 'INVALID_PAYLOAD', 'Informe o usuário a ser excluído.');
  }

  // Proteção 1 (seção 4.1): impedir autoexclusão.
  if (targetUid === requester.uid) {
    return respostaErro(res, 403, 'SELF_DELETE', 'Você não pode excluir a própria conta.');
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminFirestore();

  // Proteção 5 (seção 4.5): validar UID e confirmar existência da conta.
  let targetUser;
  try {
    targetUser = await adminAuth.getUser(targetUid);
  } catch (e: any) {
    if (e?.code === 'auth/user-not-found') {
      return respostaErro(res, 404, 'NOT_FOUND', 'Usuário não encontrado.');
    }
    console.error('delete-user: erro ao buscar usuário-alvo', requester.uid, e?.code);
    return respostaErro(res, 500, 'INTERNAL_ERROR', 'Erro interno ao excluir usuário.');
  }

  // Proteção 2 (seção 4.2): impedir exclusão do administrador bootstrap.
  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (bootstrapAdminEmail && targetUser.email === bootstrapAdminEmail) {
    return respostaErro(res, 403, 'BOOTSTRAP_PROTECTED', 'Esta conta é o administrador protegido do sistema e não pode ser excluída.');
  }

  // Proteção 3 (seção 4.3): impedir exclusão do último administrador operacional
  // (conta com role='admin' gravado em Firestore — o bootstrap já está
  // protegido separadamente acima, independente do que estiver em seu doc).
  const targetSnap = await adminDb.doc(`users/${targetUid}`).get();
  const targetEraAdmin = targetSnap.exists && targetSnap.data()?.role === 'admin';
  if (targetEraAdmin) {
    const admins = await adminDb.collection('users').where('role', '==', 'admin').get();
    if (admins.size <= 1) {
      return respostaErro(res, 403, 'LAST_ADMIN', 'Não é possível excluir o último administrador operacional. Torne outro usuário administrador antes de continuar.');
    }
  }

  // Etapa 1 — neutraliza o acesso imediatamente (idempotente: desabilitar
  // uma conta já desabilitada, ou revogar tokens de novo, não é erro).
  try {
    await adminAuth.updateUser(targetUid, { disabled: true });
    await adminAuth.revokeRefreshTokens(targetUid);
  } catch (e: any) {
    console.error('delete-user: falha ao neutralizar conta', requester.uid, targetUid, e?.code);
    return respostaErro(res, 500, 'AUTH_DISABLE_FAILED', 'Não foi possível neutralizar o acesso do usuário. Tente novamente.');
  }

  // Etapa 2 — registra o UID na lista de bloqueio ANTES de remover
  // qualquer coisa: mesmo que uma etapa seguinte falhe, o token antigo
  // desta conta já não conseguirá recriar users/{uid} (ver firestore.rules,
  // regra de create de users/{userId}).
  try {
    await adminDb.doc(`deletedUsers/${targetUid}`).set({ deletedAt: new Date().toISOString() }, { merge: true });
  } catch (e: any) {
    console.error('delete-user: falha ao registrar bloqueio', requester.uid, targetUid, e?.code);
    return respostaErro(res, 500, 'PARTIAL_FAILURE', 'A conta foi neutralizada, mas a exclusão não foi concluída. Tente novamente — a operação pode ser repetida com segurança.');
  }

  // Etapa 3 — remove o documento em users/{uid} (idempotente: apagar um
  // documento que já não existe não é erro no Firestore).
  try {
    await adminDb.doc(`users/${targetUid}`).delete();
  } catch (e: any) {
    console.error('delete-user: falha ao remover documento Firestore', requester.uid, targetUid, e?.code);
    return respostaErro(res, 500, 'FIRESTORE_DELETE_FAILED', 'A conta foi neutralizada, mas o cadastro não foi totalmente removido. Tente novamente — a operação pode ser repetida com segurança.');
  }

  // Etapa 4 — remove a conta do Authentication.
  try {
    await adminAuth.deleteUser(targetUid);
  } catch (e: any) {
    console.error('delete-user: falha ao remover conta do Authentication', requester.uid, targetUid, e?.code);
    return respostaErro(res, 500, 'AUTH_DELETE_FAILED', 'O cadastro foi removido, mas a conta de acesso não foi totalmente excluída. Tente novamente — a operação pode ser repetida com segurança.');
  }

  return res.status(200).json({ uid: targetUid });
}
