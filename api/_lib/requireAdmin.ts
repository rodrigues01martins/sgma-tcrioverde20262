import type { VercelRequest } from '@vercel/node';
import { getAdminAuth, getAdminFirestore } from './firebaseAdmin.js';

// Erro com status HTTP explícito — o handler só precisa repassar
// `status`/`message` para a resposta, sem duplicar a lógica de mapeamento.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Verifica o Firebase ID Token do chamador e confirma que ele é
// administrador — espelhando EXATAMENTE a mesma regra já usada em
// isAdmin() (firestore.rules) e em App.tsx (seção 13/14): bootstrap por
// e-mail OU users/{uid}.role == 'admin'. Nunca confia num boolean vindo
// do corpo da requisição.
export async function requireAdmin(req: VercelRequest): Promise<{ uid: string; email: string | null }> {
  const authHeader = req.headers.authorization;
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  if (!token) throw new HttpError(401, 'Não autenticado.');

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    throw new HttpError(401, 'Sessão inválida ou expirada.');
  }

  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const isBootstrapAdmin = !!bootstrapAdminEmail && decoded.email === bootstrapAdminEmail;

  let isAdmin = isBootstrapAdmin;
  if (!isAdmin) {
    const snap = await getAdminFirestore().doc(`users/${decoded.uid}`).get();
    isAdmin = snap.exists && snap.data()?.role === 'admin';
  }

  if (!isAdmin) throw new HttpError(403, 'Apenas administradores podem realizar esta operação.');

  return { uid: decoded.uid, email: decoded.email ?? null };
}
