import { db } from '../firebase'
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore'
import { classificarBase, reconciliar } from './classificacaoService'

// Datas derivadas (inicioEfetivo/fimEfetivo) viram string ISO (aaaa-mm-dd)
// antes de gravar — mantém os documentos consistentes com o resto dos
// campos do CSV, que já são strings.
function serializarClassificacao(classificacao) {
  const paraISO = (d) => (d ? d.toISOString().slice(0, 10) : null)
  return {
    ...classificacao,
    inicioEfetivo: paraISO(classificacao.inicioEfetivo),
    fimEfetivo: paraISO(classificacao.fimEfetivo),
  }
}

export async function salvarPeriodo(periodo, dados) {
  const colName = 'colaboradores_' + periodo.replace('-', '_')
  const col = collection(db, colName)

  // Classificação roda UMA vez aqui, na ingestão. Os componentes de UI só
  // leem os flags já persistidos — nunca recalculam status na leitura.
  const dadosClassificados = classificarBase(dados)

  // Fechamento bloqueado se a reconciliação não bater — mesmo que o
  // chamador não tenha checado antes (defesa em profundidade: nenhum
  // caminho de código pode persistir dados que não reconciliam).
  const reconciliacao = reconciliar(dadosClassificados)
  if (!reconciliacao.ok) {
    const motivos = reconciliacao.checks.filter(c => !c.ok).map(c => c.detalhe).join(' | ')
    throw new Error(`Fechamento bloqueado — reconciliação falhou: ${motivos}`)
  }

  const loteSize = 50
  for (let i = 0; i < dadosClassificados.length; i += loteSize) {
    const lote = dadosClassificados.slice(i, i + loteSize)
    await Promise.all(lote.map(row => addDoc(col, {
      ...row,
      periodo,
      _classificacao: serializarClassificacao(row._classificacao),
    })))
  }

  const metaCol = collection(db, 'periodos')
  await addDoc(metaCol, {
    periodo,
    total: dados.length,
    importadoEm: new Date().toISOString()
  })
}

export async function buscarPeriodos() {
  const snap = await getDocs(
    query(collection(db, 'periodos'), orderBy('periodo', 'desc'))
  )
  const periodos = []
  snap.forEach(doc => {
    const d = doc.data()
    if (!periodos.find(p => p.periodo === d.periodo)) {
      periodos.push(d)
    }
  })
  return periodos
}

export async function buscarDadosPeriodo(periodo) {
  const colName = 'colaboradores_' + periodo.replace('-', '_')
  const snap = await getDocs(collection(db, colName))
  const dados = []
  snap.forEach(doc => dados.push(doc.data()))
  return dados
}

export async function excluirPeriodo(periodo) {
  const colName = 'colaboradores_' + periodo.replace('-', '_')

  // Exclui registros em lotes de 400
  const snap = await getDocs(collection(db, colName))
  const docs = []
  snap.forEach(d => docs.push(d.id))

  const loteSize = 400
  for (let i = 0; i < docs.length; i += loteSize) {
    const batch = writeBatch(db)
    const lote = docs.slice(i, i + loteSize)
    lote.forEach(id => batch.delete(doc(db, colName, id)))
    await batch.commit()
  }

  // Exclui metadado do período
  const metaSnap = await getDocs(collection(db, 'periodos'))
  const metaBatch = writeBatch(db)
  metaSnap.forEach(d => {
    if (d.data().periodo === periodo) metaBatch.delete(doc(db, 'periodos', d.id))
  })
  await metaBatch.commit()
}
