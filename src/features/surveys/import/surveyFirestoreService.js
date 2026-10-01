import { db } from '../../../firebase'
import {
  collection, doc, getDocs, getCountFromServer, query, where,
  writeBatch, serverTimestamp,
} from 'firebase/firestore'

// ============================================================
// PERSISTÊNCIA FIRESTORE — Pesquisas de Satisfação / Avaliação Pós-Programa
// ============================================================
// Uma coleção por instrumento (nunca particionada por período — a
// resposta de pesquisa não tem competência mensal como a Apuração,
// seção 41) + uma coleção comum de histórico de importação (seção 43,
// que NÃO é a auditoria global já descartada anteriormente no projeto).
//
// Documento = sourceResponseId (id do Forms) diretamente, dentro da
// coleção do próprio instrumento — a identidade lógica "surveyType +
// sourceResponseId" (seção 11) já fica garantida pela coleção escolhida
// não precisar repetir surveyType como parte da chave.
const COLECAO_POR_SURVEY_TYPE = {
  ACTIVE_LEARNER: 'pesquisas_aprendiz_respostas',
  MENTOR: 'pesquisas_mentor_respostas',
  GUARDIAN: 'pesquisas_responsavel_respostas',
  GRADUATE: 'pesquisas_egresso_respostas',
}
const COLECAO_IMPORTACOES = 'pesquisas_importacoes'

export function nomeColecaoRespostas(surveyType) {
  const nome = COLECAO_POR_SURVEY_TYPE[surveyType]
  if (!nome) throw new Error(`Tipo de pesquisa desconhecido: ${surveyType}`)
  return nome
}

export async function buscarRespostas(surveyType) {
  const snap = await getDocs(collection(db, nomeColecaoRespostas(surveyType)))
  const respostas = []
  snap.forEach(d => respostas.push({ _idDocumento: d.id, ...d.data() }))
  return respostas
}

// Contagem via agregação do servidor — nunca baixa os documentos
// inteiros só para exibir "N respostas disponíveis" no card (seção 35 da
// manutenção de UX do dropzone: metadado de exibição não pode custar uma
// leitura completa da coleção).
export async function contarRespostas(surveyType) {
  const snap = await getCountFromServer(collection(db, nomeColecaoRespostas(surveyType)))
  return snap.data().count
}

export async function buscarUltimaImportacao(surveyType) {
  // Ordena no cliente (em vez de where+orderBy) para não depender de um
  // índice composto que ainda não existe no projeto (seção 112: criar
  // índice só quando realmente necessário).
  const snap = await getDocs(query(collection(db, COLECAO_IMPORTACOES), where('surveyType', '==', surveyType)))
  let ultima = null
  snap.forEach(d => {
    const dados = { _idDocumento: d.id, ...d.data() }
    const dataAtual = dados.importadoEm?.toMillis?.() ?? 0
    const dataUltima = ultima?.importadoEm?.toMillis?.() ?? -1
    if (dataAtual > dataUltima) ultima = dados
  })
  return ultima
}

export async function buscarHistoricoImportacoes(surveyType) {
  const snap = await getDocs(query(collection(db, COLECAO_IMPORTACOES), where('surveyType', '==', surveyType)))
  const historico = []
  snap.forEach(d => historico.push({ _idDocumento: d.id, ...d.data() }))
  return historico.sort((a, b) => (b.importadoEm?.toMillis?.() ?? 0) - (a.importadoEm?.toMillis?.() ?? 0))
}

// Grava em lotes de até 450 operações (limite real do Firestore é 500 por
// batch) — necessário porque uma planilha do Forms pode facilmente
// superar isso em uma pesquisa com muitas respostas acumuladas.
const TAMANHO_LOTE = 450

async function gravarEmLotes(operacoes) {
  for (let inicio = 0; inicio < operacoes.length; inicio += TAMANHO_LOTE) {
    const lote = writeBatch(db)
    operacoes.slice(inicio, inicio + TAMANHO_LOTE).forEach(({ ref, dados }) => lote.set(ref, dados))
    await lote.commit()
  }
}

// Confirma a importação: grava Novos + Atualizados (Inalterados nunca são
// tocados — não há razão para reescrever um documento idêntico) e
// registra o histórico da importação. NUNCA exclui documentos ausentes
// do arquivo atual (seção 13).
export async function confirmarImportacaoPesquisa({ surveyType, schemaVersion, arquivoNome, classificacao, resumoValidacao, uid, email }) {
  const nomeColecao = nomeColecaoRespostas(surveyType)
  const importRef = doc(collection(db, COLECAO_IMPORTACOES))

  const operacoes = [...classificacao.novos, ...classificacao.atualizados].map(linha => {
    const { _idDocumentoExistente, ...dadosLinha } = linha
    return {
      ref: doc(db, nomeColecao, linha.sourceResponseId),
      dados: {
        ...dadosLinha,
        source: 'microsoft_forms_csv',
        importedAt: serverTimestamp(),
        importId: importRef.id,
      },
    }
  })

  await gravarEmLotes(operacoes)

  await gravarEmLotes([{
    ref: importRef,
    dados: {
      surveyType,
      schemaVersion,
      arquivo: arquivoNome,
      importadoEm: serverTimestamp(),
      importadoPorUid: uid || null,
      importadoPorEmail: email || null,
      totalLinhas: resumoValidacao.totalLinhas,
      novos: classificacao.novos.length,
      atualizados: classificacao.atualizados.length,
      inalterados: classificacao.inalterados.length,
      invalidos: resumoValidacao.invalidos,
      avisos: resumoValidacao.avisos,
    },
  }])

  return { importId: importRef.id }
}
