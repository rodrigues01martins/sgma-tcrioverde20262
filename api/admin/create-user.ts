import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';
import { getAdminAuth, getAdminFirestore } from '../_lib/firebaseAdmin.js';
import { requireAdmin, HttpError } from '../_lib/requireAdmin.js';
import { DEFAULT_PERMISSIONS } from '../../src/config/permissions.js';

// ============================================================
// POST /api/admin/create-user
// ============================================================
// Criação administrativa de usuário — Authentication + Firestore.
// Roda inteiramente no servidor (Vercel Serverless Function, Node.js
// runtime); o frontend NUNCA usa createUserWithEmailAndPassword para
// isso (seção 5), o que trocaria a sessão do administrador autenticado.
//
// Fluxo: verificar token -> confirmar admin -> validar payload ->
// bloquear duplicidade -> criar Authentication -> criar users/{uid} ->
// reverter Authentication se o Firestore falhar (seção 27).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  let requester: { uid: string; email: string | null };
  try {
    requester = await requireAdmin(req);
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    console.error('create-user: erro inesperado ao verificar administrador');
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }

  // Payload mínimo aceito (seção 22) — role/isAdmin/senha/permissão
  // arbitrária enviados pelo cliente são simplesmente ignorados: os
  // campos abaixo são os ÚNICOS lidos do corpo da requisição.
  const body = (req.body ?? {}) as { displayName?: unknown; email?: unknown };
  const displayNameLimpo = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const emailLimpo = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!displayNameLimpo || displayNameLimpo.length > 120) {
    return res.status(400).json({ error: 'Informe um nome válido.' });
  }
  if (!emailLimpo || emailLimpo.length > 254 || !EMAIL_REGEX.test(emailLimpo)) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  const adminAuth = getAdminAuth();

  // Duplicidade (seção 28) — checagem explícita para responder 409 de
  // forma limpa, sem depender só do erro que createUser lançaria.
  try {
    await adminAuth.getUserByEmail(emailLimpo);
    return res.status(409).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') {
      console.error('create-user: erro ao checar duplicidade', requester.uid, e?.code);
      return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
    }
  }

  // Senha temporária de alta entropia gerada no servidor (seções 24/25)
  // — existe só para o provisionamento inicial; nunca é devolvida,
  // logada ou persistida. O usuário define a própria senha pelo e-mail
  // de redefinição enviado depois pelo frontend.
  const senhaTemporaria = randomBytes(32).toString('base64url');

  let novoUsuario;
  try {
    novoUsuario = await adminAuth.createUser({
      email: emailLimpo,
      displayName: displayNameLimpo,
      emailVerified: false,
      disabled: false,
      password: senhaTemporaria,
    });
  } catch (e: any) {
    if (e?.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
    }
    console.error('create-user: erro ao criar Authentication user', requester.uid, e?.code);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }

  // Authentication e Firestore não formam uma transação única (seção
  // 27) — se o Firestore falhar, desfaz o Authentication recém-criado
  // para nunca deixar uma conta órfã sem users/{uid}.
  try {
    await getAdminFirestore().doc(`users/${novoUsuario.uid}`).set({
      uid: novoUsuario.uid,
      email: emailLimpo,
      displayName: displayNameLimpo,
      role: 'user',
      ...DEFAULT_PERMISSIONS,
      createdAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('create-user: Firestore falhou, revertendo Authentication', requester.uid, novoUsuario.uid, e?.code);
    try {
      await adminAuth.deleteUser(novoUsuario.uid);
    } catch (e2: any) {
      console.error('create-user: falha ao reverter Authentication órfão', novoUsuario.uid, e2?.code);
    }
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }

  return res.status(200).json({ uid: novoUsuario.uid, email: emailLimpo, displayName: displayNameLimpo });
}
