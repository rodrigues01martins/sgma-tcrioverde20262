import { db } from '../../firebase'
import { collection, doc, getDoc, getDocs, updateDoc, runTransaction } from 'firebase/firestore'
import { IDENTIFICACAO_INSTRUMENTO, STATUS_VISITA } from './config.js'
import { apurarVisita, validarFinalizacao } from './apuracao.js'

// ============================================================
// VISITA IN LOCO — persistência
// ============================================================
// Coleção própria do instrumento único (não se mistura com as antigas
// visitas_inloco / visitas_inloco_pratica). O ID do documento é a
// própria data da visita (AAAA-MM-DD): o Firestore garante um único
// documento por ID, então "uma visita por data" vale na persistência,
// não só na tela. As regras (firestore.rules) completam a garantia:
// rascunho só pode ser alterado pelo próprio vistoriador e uma visita
// finalizada não aceita mais alteração.
export const COLECAO_VISITA_IN_LOCO = 'visitas_inloco_caser'

const ref = data => doc(db, COLECAO_VISITA_IN_LOCO, data)

export class VisitaJaFinalizadaError extends Error {
  constructor(visita) {
    super('Já existe Visita In Loco finalizada nesta data.')
    this.visita = visita
  }
}

// Abre o rascunho existente da data ou cria um novo — dentro de uma
// transação, para duas pessoas não criarem a mesma data ao mesmo tempo.
// Finalizada → VisitaJaFinalizadaError (não permite novo registro).
export async function abrirOuCriarVisita(data, vistoriador) {
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref(data))
    if (snap.exists()) {
      const existente = { id: snap.id, ...snap.data() }
      if (existente.status === STATUS_VISITA.finalizada.valor) throw new VisitaJaFinalizadaError(existente)
      return { visita: existente, criada: false }
    }
    const agora = new Date().toISOString()
    const nova = {
      identificacao: { ...IDENTIFICACAO_INSTRUMENTO },
      visita: { data, horaInicio: '', horaTermino: '', representanteOsc: '' },
      vistoriador,
      status: STATUS_VISITA.rascunho.valor,
      itens: {},
      conclusao: { resumoAchados: '', recomendacoes: '', prazoSaneamentoDias: null },
      criadoEm: agora,
      atualizadoEm: agora,
    }
    tx.set(ref(data), nova)
    return { visita: { id: data, ...nova }, criada: true }
  })
}

// Autosave do rascunho — só os campos editáveis; nunca altera status,
// vistoriador nem data (as regras também recusam).
export async function salvarRascunho(data, { visita, itens, conclusao }) {
  await updateDoc(ref(data), {
    visita: { ...visita, data },
    itens,
    conclusao,
    atualizadoEm: new Date().toISOString(),
  })
}

// Finalização: valida de novo e recalcula tudo a partir das respostas
// brutas (nunca reaproveita resultado calculado antes pela tela).
export async function finalizarVisita(data, { visita, vistoriador, itens, conclusao }) {
  const registro = { visita: { ...visita, data }, vistoriador, itens, conclusao }
  const erros = validarFinalizacao(registro)
  if (erros.length > 0) {
    const e = new Error('Há campos obrigatórios pendentes.')
    e.erros = erros
    throw e
  }
  const apuracao = apurarVisita(itens)
  const agora = new Date().toISOString()
  const atualizacao = {
    visita: registro.visita,
    itens,
    conclusao,
    apuracao,
    status: STATUS_VISITA.finalizada.valor,
    finalizadoEm: agora,
    atualizadoEm: agora,
  }
  await updateDoc(ref(data), atualizacao)
  return atualizacao
}

export async function listarVisitas() {
  const snap = await getDocs(collection(db, COLECAO_VISITA_IN_LOCO))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.id.localeCompare(a.id))
}

export async function buscarVisita(data) {
  const snap = await getDoc(ref(data))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
