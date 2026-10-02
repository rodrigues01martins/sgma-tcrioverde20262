// Fase 0 — Backup dos dados do monitora-japrendiz (projeto Firebase "japrendiz-2026")
// antes da migração para o projeto "ptrenapsi".
//
// Uso:
//   1. No Firebase Console do projeto japrendiz-2026:
//      Configurações do projeto → Contas de serviço → Gerar nova chave privada
//      Salve o JSON baixado como, por exemplo, ./japrendiz-serviceAccountKey.json
//      (esse padrão de nome já está no .gitignore — nunca commitar essa chave).
//   2. npm install --no-save firebase-admin
//   3. GOOGLE_APPLICATION_CREDENTIALS=./japrendiz-serviceAccountKey.json node scripts/export-japrendiz-data.mjs
//
// Resultado: ./backups/japrendiz-<timestamp>/periodos.json
//            ./backups/japrendiz-<timestamp>/colaboradores_AAAA_MM.json (um arquivo por período)

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ID = 'japrendiz-2026';

function initApp() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
    return initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
  }
  return initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

async function main() {
  const app = initApp();
  const db = getFirestore(app);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(process.cwd(), 'backups', `japrendiz-${stamp}`);
  mkdirSync(outDir, { recursive: true });

  console.log(`Projeto: ${PROJECT_ID}`);
  console.log(`Saída:   ${outDir}\n`);

  // 1. Coleção "periodos" (metadados de cada importação mensal)
  const periodosSnap = await db.collection('periodos').get();
  const periodos = periodosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  writeFileSync(join(outDir, 'periodos.json'), JSON.stringify(periodos, null, 2));
  console.log(`periodos: ${periodos.length} documento(s) → periodos.json`);

  if (!periodos.length) {
    console.log('\nNenhum período encontrado — nada mais para exportar.');
    return;
  }

  // 2. Uma coleção "colaboradores_AAAA_MM" por período, mesma convenção de nome
  //    usada em src/services/firestoreService.js do monitora-japrendiz.
  let totalColaboradores = 0;
  for (const p of periodos) {
    const periodo = p.periodo;
    if (!periodo) continue;
    const colName = 'colaboradores_' + periodo.replace('-', '_');
    const snap = await db.collection(colName).get();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    writeFileSync(join(outDir, `${colName}.json`), JSON.stringify(docs, null, 2));
    totalColaboradores += docs.length;
    console.log(`${colName}: ${docs.length} documento(s) → ${colName}.json`);
  }

  console.log(`\nBackup concluído: ${periodos.length} período(s), ${totalColaboradores} registro(s) de colaboradores.`);
  console.log(`Guarde a pasta "${outDir}" fora do repositório antes de prosseguir para a Fase 1.`);
}

main().catch(err => {
  console.error('Falha ao exportar:', err);
  process.exit(1);
});
