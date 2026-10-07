// Exclusão dos registros históricos da Visita In Loco – Teórica e – Prática
// (instrumentos substituídos pela Visita In Loco única, coleção
// visitas_inloco_caser).
//
// Critério determinístico: cada instrumento antigo tinha coleção própria e
// exclusiva — `visitas_inloco` (Teórica) e `visitas_inloco_pratica`
// (Prática). O script apaga SOMENTE essas duas coleções, inteiras, por
// nome exato. Nenhuma outra coleção é lida para exclusão.
//
// Uso:
//   1. Firebase Console do projeto sgma-tcrioverde20262 → Configurações do
//      projeto → Contas de serviço → Gerar nova chave privada. Salve como
//      ./sgma-serviceAccountKey.json (o padrão *-serviceAccountKey.json está
//      no .gitignore — nunca commitar).
//   2. Contagem (não apaga nada):
//        GOOGLE_APPLICATION_CREDENTIALS=./sgma-serviceAccountKey.json \
//          node scripts/limpar-visitas-in-loco-antigas.mjs
//   3. Exclusão (gera backup JSON em ./backups/ antes de apagar):
//        GOOGLE_APPLICATION_CREDENTIALS=./sgma-serviceAccountKey.json \
//          node scripts/limpar-visitas-in-loco-antigas.mjs --executar

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJETO_ESPERADO = 'sgma-tcrioverde20262';
const COLECOES_ANTIGAS = ['visitas_inloco', 'visitas_inloco_pratica'];
const COLECAO_NOVA = 'visitas_inloco_caser';
const executar = process.argv.includes('--executar');

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error('Defina GOOGLE_APPLICATION_CREDENTIALS com o caminho da chave da conta de serviço.');
  process.exit(1);
}
const conta = JSON.parse(readFileSync(keyPath, 'utf8'));
if (conta.project_id !== PROJETO_ESPERADO) {
  console.error(`A chave pertence ao projeto "${conta.project_id}", mas o esperado é "${PROJETO_ESPERADO}". Nada foi feito.`);
  process.exit(1);
}

const db = getFirestore(initializeApp({ credential: cert(conta), projectId: PROJETO_ESPERADO }));

async function contar(nome) {
  return (await db.collection(nome).count().get()).data().count;
}

console.log(`Projeto: ${PROJETO_ESPERADO}`);
console.log(`Modo:    ${executar ? 'EXCLUSÃO' : 'somente contagem (use --executar para apagar)'}\n`);

const antes = {};
for (const nome of COLECOES_ANTIGAS) {
  antes[nome] = await contar(nome);
  console.log(`${nome}: ${antes[nome]} documento(s)`);
}
console.log(`${COLECAO_NOVA} (não será tocada): ${await contar(COLECAO_NOVA)} documento(s)\n`);

if (!executar) process.exit(0);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const pasta = join(process.cwd(), 'backups', `visitas-in-loco-antigas-${stamp}`);
mkdirSync(pasta, { recursive: true });

for (const nome of COLECOES_ANTIGAS) {
  const snap = await db.collection(nome).get();
  writeFileSync(join(pasta, `${nome}.json`), JSON.stringify(snap.docs.map(d => ({ id: d.id, ...d.data() })), null, 2));
  console.log(`Backup de ${snap.size} documento(s) de ${nome} → ${pasta}`);
  await db.recursiveDelete(db.collection(nome));
  console.log(`${nome}: excluída. Restam ${await contar(nome)} documento(s).`);
}
console.log(`\n${COLECAO_NOVA}: ${await contar(COLECAO_NOVA)} documento(s) (inalterada).`);
