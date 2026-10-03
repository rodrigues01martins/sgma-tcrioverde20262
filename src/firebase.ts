import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyC9WVWHn1N8I4QIL8BB-HBapcQWA_lqbyw',
  authDomain: 'sgma-tcrioverde20262.firebaseapp.com',
  projectId: 'sgma-tcrioverde20262',
  storageBucket: 'sgma-tcrioverde20262.firebasestorage.app',
  messagingSenderId: '709593801447',
  appId: '1:709593801447:web:044477dd318433c5c1b842',
  measurementId: 'G-DXDCF3FGN3',
};

const app = initializeApp(config);

export const auth = getAuth(app);
export const db = getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// E-mail com acesso de administrador mesmo antes de existir um documento
// /users/{uid} com role "admin" (bootstrap do primeiro administrador).
// Precisa corresponder ao valor equivalente em firestore.rules.
export const BOOTSTRAP_ADMIN_EMAIL = 'juliano.mrodrigues@goias.gov.br';
