import { db } from '../firebase'
import { collection, addDoc, updateDoc, getDocs, doc, getDoc } from 'firebase/firestore'

// ============================================================
// FORMULÁRIO DE FISCALIZAÇÃO IN LOCO — configuração e cálculo
// ============================================================
// Módulo único: o questionário (blocos/itens), o cálculo de pontuação/ICL
// e a persistência ficam aqui. A pontuação é calculada UMA vez, no momento
// de salvar a visita (ver calcularPontuacao) — o dashboard só lê os
// campos já calculados no documento, nunca recalcula a partir das
// respostas brutas.

export const BLOCOS = [
  {
    id: 'bloco_1',
    titulo: 'Localização, Entorno e Mobilidade Urbana',
    maxPontos: 6,
    itens: [
      { id: 'item_1_1', label: 'Proximidade de transporte público', descricao: 'Até 500m: pontos de ônibus, estações ou trajeto a pé viável.' },
      { id: 'item_1_2', label: 'Segurança no trajeto imediato', descricao: 'Ausência de travessias de risco sem faixa, semáforo ou passarela.' },
      { id: 'item_1_3', label: 'Identificação visual na fachada', descricao: 'Identificação clara e visível na fachada do local.' },
    ],
  },
  {
    id: 'bloco_2',
    titulo: 'Acessibilidade e Desenho Universal — NBR 9050 / LBI',
    maxPontos: 12,
    itens: [
      { id: 'item_2_1', label: 'Acesso da via pública ao imóvel', descricao: 'Sem degraus isolados ou rampa regular, corrimão duplo, piso tátil.' },
      { id: 'item_2_2', label: 'Circulação interna horizontal e vertical', descricao: 'Largura livre mínima para cadeirantes.' },
      { id: 'item_2_3', label: 'Múltiplos pavimentos', descricao: 'Elevador acessível ou rampa. Marcado automaticamente se o local for estritamente térreo.', autoTerreoPontos: 2 },
      { id: 'item_2_4', label: 'Sanitários acessíveis', descricao: 'Ao menos um sanitário adaptado para PCD.' },
      { id: 'item_2_5', label: 'Mobiliário adaptado', descricao: 'Ao menos uma carteira/mesa com ajuste e aproximação frontal para cadeirante.' },
      { id: 'item_2_6', label: 'Acessibilidade sensorial', descricao: 'Sinalização visual e tátil nas portas, sanitários e rotas de fuga.' },
    ],
  },
  {
    id: 'bloco_3',
    titulo: 'Estrutura Física, Conforto Ambiental e Segurança',
    maxPontos: 16,
    itens: [
      { id: 'item_3_1', label: 'Regularidade contra incêndio e pânico', descricao: 'Extintores válidos/sinalizados, rotas de fuga com luz de emergência.' },
      { id: 'item_3_2', label: 'Controle de acessos e salvaguarda', descricao: 'Portaria com controle formal que impeça ingresso de terceiros.' },
      { id: 'item_3_3', label: 'Salubridade das salas de aula', descricao: 'Ventilação e iluminação adequadas, sem zonas de sombra.' },
      { id: 'item_3_4', label: 'Ergonomia do mobiliário', descricao: 'Mesas e cadeiras adequadas para jovens de 14 a 18 anos, sem avarias.' },
      { id: 'item_3_5', label: 'Segurança elétrica e predial', descricao: 'Fiação embutida/canalizada, sem fios expostos ou tomadas avariadas.' },
      { id: 'item_3_6', label: 'Condições estruturais do imóvel', descricao: 'Ausência de rachaduras, infiltrações, mofo, vazamentos ou falta de pintura.' },
      { id: 'item_3_7', label: 'Hidratação', descricao: 'Bebedouros higienizados, compatíveis com a demanda, filtros/laudos em dia.' },
      { id: 'item_3_8', label: 'Higiene dos banheiros', descricao: 'Suprimento contínuo de papel, sabonete líquido e toalhas.' },
    ],
  },
  {
    id: 'bloco_4',
    titulo: 'Condições e Acesso aos Meios de Aprendizagem',
    maxPontos: 8,
    itens: [
      { id: 'item_4_1', label: 'Cadeiras suficientes', descricao: 'Sala de aula com carteiras suficientes para todos os alunos' },
      { id: 'item_4_2', label: 'Conectividade à internet', descricao: 'Há banda larga estável adequada para o acesso de todos os alunos' },
      { id: 'item_4_3', label: 'Quantidade de alunos na sala', descricao: 'O número de alunos era adequado para o tamanho da sala de aula' },
      { id: 'item_4_4', label: 'Recursos em sala de aula', descricao: 'Quadro branco ou multimídia (Data Show) para apresentação de conteúdo' },
    ],
  },
]

export const TODOS_ITENS = BLOCOS.flatMap(b => b.itens.map(i => ({ ...i, blocoId: b.id })))
export const PONTUACAO_MAXIMA = BLOCOS.reduce((s, b) => s + b.maxPontos, 0) // 42

export const OPCOES_PONTUACAO = [
  { valor: 0, label: 'NÃO ATENDE', variant: 'danger' },
  { valor: 1, label: 'ATENDE PARCIALMENTE', variant: 'warning' },
  { valor: 2, label: 'ATENDE INTEGRALMENTE', variant: 'success' },
]

// ------------------------------------------------------------
// SEMESTRE — derivado da data da visita (aaaa-mm-dd do <input type=date>)
// ------------------------------------------------------------
export function calcularSemestre(dataISO) {
  if (!dataISO) return ''
  const [ano, mes] = dataISO.split('-').map(Number)
  if (!ano || !mes) return ''
  return `${ano}/${mes <= 6 ? 1 : 2}`
}

// ------------------------------------------------------------
// PONTUAÇÃO — função pura, roda uma vez ao salvar a visita
// ------------------------------------------------------------
export function calcularPontuacao(respostas) {
  const porBloco = {}
  let pontuacaoTotal = 0

  BLOCOS.forEach(bloco => {
    const pontosBloco = bloco.itens.reduce((s, item) => {
      const r = respostas[item.id]
      const pontos = r && typeof r.pontuacao === 'number' ? r.pontuacao : 0
      return s + pontos
    }, 0)
    porBloco[bloco.id] = pontosBloco
    pontuacaoTotal += pontosBloco
  })

  const icl = PONTUACAO_MAXIMA > 0 ? (pontuacaoTotal / PONTUACAO_MAXIMA) * 100 : 0

  return {
    pontuacaoBloco1: porBloco.bloco_1 || 0,
    pontuacaoBloco2: porBloco.bloco_2 || 0,
    pontuacaoBloco3: porBloco.bloco_3 || 0,
    pontuacaoBloco4: porBloco.bloco_4 || 0,
    pontuacaoTotal,
    icl,
    classificacao: classificarLocal(icl),
  }
}

// Classificação do LOCAL individual (linha da tabela / detalhe da visita).
export function classificarLocal(icl) {
  if (icl >= 85) return { chave: 'excelente', label: 'Excelente / Totalmente Satisfatório', variant: 'success' }
  if (icl >= 70) return { chave: 'bom', label: 'Bom / Satisfatório', variant: 'info' }
  if (icl >= 50) return { chave: 'regular', label: 'Regular / Parcialmente Satisfatório', variant: 'warning' }
  return { chave: 'insatisfatorio', label: 'Insatisfatório / Crítico', variant: 'danger' }
}

// Classificação da REDE (ISLA semestral) — mesmas faixas, rótulos diferentes.
export function classificarRedeISLA(isla) {
  if (isla >= 85) return { chave: 'otima', label: 'Rede Ótima', variant: 'success' }
  if (isla >= 70) return { chave: 'adequada', label: 'Rede Adequada', variant: 'info' }
  if (isla >= 50) return { chave: 'alerta', label: 'Rede em Alerta', variant: 'warning' }
  return { chave: 'critica', label: 'Rede Crítica', variant: 'danger' }
}

// Valida se todos os 21 itens foram respondidos (obrigatório para enviar).
export function validarRespostasCompletas(respostas) {
  return TODOS_ITENS.every(item => {
    const r = respostas[item.id]
    return r && typeof r.pontuacao === 'number'
  })
}

// ------------------------------------------------------------
// PERSISTÊNCIA — coleção única visitas_inloco
// ------------------------------------------------------------
const COLECAO = 'visitas_inloco'

// Cria o rascunho a partir da primeira alteração relevante (cabeçalho
// mínimo preenchido) — dali em diante o autosave só atualiza este
// mesmo documento (ver atualizarRascunhoVisita), nunca cria outro.
export async function criarRascunhoVisita(visita, { uid, email }) {
  const calculo = calcularPontuacao(visita.respostas)
  const agora = new Date().toISOString()
  const doc_ = {
    ...visita,
    ...calculo,
    status: 'rascunho',
    criadoEm: agora,
    atualizadoEm: agora,
    criadoPorUid: uid || null,
    criadoPorEmail: email || null,
  }
  const ref = await addDoc(collection(db, COLECAO), doc_)
  return ref.id
}

// Autosave de um rascunho já criado — nunca altera status nem os
// campos de autoria.
export async function atualizarRascunhoVisita(id, visita) {
  const calculo = calcularPontuacao(visita.respostas)
  await updateDoc(doc(db, COLECAO, id), {
    ...visita,
    ...calculo,
    atualizadoEm: new Date().toISOString(),
  })
}

// Envio definitivo. Se já existir um rascunho autosalvo (id), promove o
// MESMO documento para 'enviada' — não duplica. Sem rascunho prévio
// (autosave nunca chegou a disparar), cria direto como enviada, igual
// ao comportamento anterior.
export async function enviarVisita(id, visita, { uid, email }) {
  const calculo = calcularPontuacao(visita.respostas)
  const agora = new Date().toISOString()
  if (id) {
    await updateDoc(doc(db, COLECAO, id), {
      ...visita,
      ...calculo,
      status: 'enviada',
      atualizadoEm: agora,
    })
    return id
  }
  const ref = await addDoc(collection(db, COLECAO), {
    ...visita,
    ...calculo,
    status: 'enviada',
    criadoEm: agora,
    atualizadoEm: agora,
    criadoPorUid: uid || null,
    criadoPorEmail: email || null,
  })
  return ref.id
}

export async function buscarTodasVisitas() {
  const snap = await getDocs(collection(db, COLECAO))
  const visitas = []
  snap.forEach(d => visitas.push({ id: d.id, ...d.data() }))
  return visitas
}

export async function buscarVisitaPorId(id) {
  const ref = doc(db, COLECAO, id)
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
