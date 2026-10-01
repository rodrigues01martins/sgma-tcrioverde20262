import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// ============================================================
// FIREBASE ADMIN — singleton server-side (Vercel Serverless Function)
// ============================================================
// Nunca importar isto de código client-side (src/**) — Client SDK
// (src/firebase.ts) e Admin SDK são responsabilidades diferentes e não
// devem se misturar (seção 61 da manutenção). As credenciais só existem
// em variáveis de ambiente do runtime server-side da Vercel, nunca em
// VITE_* (que o bundler expõe ao navegador).
//
// `getApps()` evita `initializeApp()` repetido em invocações "quentes"
// da mesma função serverless (seção 11) — sem isso, a segunda invocação
// que reaproveita o processo lançaria "the default Firebase app already
// exists".
function getAdminApp(): App {
  const existentes = getApps();
  if (existentes.length > 0) return existentes[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyBruta = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyBruta) {
    throw new Error(
      'Credenciais do Firebase Admin ausentes — configure FIREBASE_ADMIN_PROJECT_ID, ' +
      'FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY nas variáveis de ambiente do servidor.'
    );
  }

  // A private key costuma chegar com \n literal (escapado) quando
  // colada como variável de ambiente de uma linha só — converte para
  // quebra de linha real, que é o formato que a lib de credenciais espera.
  const privateKey = privateKeyBruta.includes('\\n')
    ? privateKeyBruta.replace(/\\n/g, '\n')
    : privateKeyBruta;

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
