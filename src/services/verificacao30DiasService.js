import { db } from '../firebase'
import { collection, addDoc, updateDoc, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'

// ============================================================
// FORMULÁRIO DE VERIFICAÇÃO INICIAL DO APRENDIZ — 30 DIAS
// ============================================================
// Módulo único: definição das 24 perguntas/5 indicadores, normalização de
// respostas e cálculo dos indicadores (funções puras, independentes da
// camada visual) + persistência no Firestore.
//
// Banco armazena só respostas brutas (strings) — os indicadores são
// sempre recalculados a partir delas, nunca lidos de um agregado
// persistido (evita divergência entre o que foi respondido e o que o
// painel mostra). Isso também é o que preserva o IRI histórico: uma
// pergunta que não existia quando o registro foi respondido (q22/q23/q24
// ausentes de respostas{}) cai em `undefined` em normalizeAnswer() e fica
// fora do denominador automaticamente — sem precisar recalcular nada
// retroativamente nem versionar o schema.

export const INSTRUMENT_TYPE = 'FORMULARIO_APRENDIZ_30_DIAS'
export const INSTRUMENT_VERSION = '1.1'

// ------------------------------------------------------------
// VALORES DE RESPOSTA
// ------------------------------------------------------------
export const OPCOES = {
  SIM_NAO: [
    { valor: 'SIM', label: 'SIM' },
    { valor: 'NAO', label: 'NÃO' },
  ],
  SIM_NAO_NA: [
    { valor: 'SIM', label: 'SIM' },
    { valor: 'NAO', label: 'NÃO' },
    { valor: 'NAO_SE_APLICA', label: 'NÃO SE APLICA' },
  ],
  RECEBEU_NAO: [
    { valor: 'RECEBEU', label: 'RECEBEU' },
    { valor: 'NAO_RECEBEU', label: 'NÃO RECEBEU' },
  ],
  RECEBEU_NAO_NA: [
    { valor: 'RECEBEU', label: 'RECEBEU' },
    { valor: 'NAO_RECEBEU', label: 'NÃO RECEBEU' },
    { valor: 'NAO_SE_APLICA', label: 'NÃO SE APLICA' },
  ],
  RECEBEU_NAO_DEVIDA: [
    { valor: 'RECEBEU', label: 'RECEBEU' },
    { valor: 'NAO_RECEBEU', label: 'NÃO RECEBEU' },
    { valor: 'AINDA_NAO_ERA_DEVIDA', label: 'AINDA NÃO ERA DEVIDA' },
  ],
  EAD_PRESENCIAL: [
    { valor: 'EAD', label: 'EAD' },
    { valor: 'PRESENCIAL', label: 'PRESENCIAL' },
  ],
}

// ------------------------------------------------------------
// PERGUNTAS — id, texto, dimensão, opções válidas, se compõe indicador
// ------------------------------------------------------------
export const QUESTION_DEFINITIONS = [
  { id: 'q1',  texto: 'Seu contrato de aprendizagem foi formalizado?', textoResumido: 'Contrato formalizado', dimensao: 'IRI', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q2',  texto: 'Você conseguiu verificar o registro do vínculo de aprendizagem na sua CTPS Digital?', textoResumido: 'Registro na CTPS Digital', dimensao: 'IRI', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q3',  texto: 'Você recebeu ou teve acesso à conta bancária utilizada para receber sua remuneração?', textoResumido: 'Acesso à conta bancária', dimensao: 'IRI', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q4',  texto: 'Você participou da capacitação teórica inicial antes ou no início das atividades do Programa?', textoResumido: 'Capacitação teórica inicial', dimensao: 'IRI', opcoes: OPCOES.SIM_NAO, scored: true },

  // Bloco IRI (continuação) — modalidade do curso + questões condicionadas
  // a ela. Agrupadas logo após q1-q4 para não ficarem isoladas no fim do
  // formulário (mesmo bloco temático, mesma dimensão IRI).
  { id: 'q21', texto: 'Você realiza o curso em qual modalidade?', textoResumido: 'Modalidade do curso', dimensao: 'CARACTERIZACAO', opcoes: OPCOES.EAD_PRESENCIAL, scored: false },
  { id: 'q22', texto: 'Você recebeu o login e a senha para acessar a Plataforma do Curso Teórico?', textoResumido: 'Login e senha da plataforma', dimensao: 'IRI', opcoes: OPCOES.SIM_NAO_NA, scored: true },
  { id: 'q23', texto: 'Você recebeu o calendário dos cursos?', textoResumido: 'Recebimento do calendário', dimensao: 'IRI', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q24', texto: 'Você recebeu o acesso ao seu formulário de frequência?', textoResumido: 'Acesso ao formulário de frequência', dimensao: 'IRI', opcoes: OPCOES.SIM_NAO, scored: true },

  { id: 'q5',  texto: 'Após o ingresso, você passou a realizar as atividades práticas em um órgão/local indicado pelo Programa?', textoResumido: 'Início das atividades práticas', dimensao: 'IRA', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q6',  texto: 'Você está realizando atividade teórica de aprendizagem pelo menos uma vez por semana?', textoResumido: 'Atividade teórica semanal', dimensao: 'IRA', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q7',  texto: 'Sua jornada no Programa está limitada a 4 horas por dia e 20 horas por semana?', textoResumido: 'Jornada dentro do limite', dimensao: 'IRA', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q8',  texto: 'Os horários do Programa permitem que você frequente normalmente a escola?', textoResumido: 'Compatibilidade de horários com a escola', dimensao: 'IRA', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q9',  texto: 'Você continua matriculado e frequentando regularmente a escola?', textoResumido: 'Matrícula e frequência escolar', dimensao: 'IRA', opcoes: OPCOES.SIM_NAO_NA, scored: true },

  { id: 'q10', texto: 'Você recebeu as 2 camisetas/uniformes previstos para participação no Programa?', textoResumido: 'Recebimento de uniforme', dimensao: 'IEB', opcoes: OPCOES.RECEBEU_NAO, scored: true },
  { id: 'q11', texto: 'Você recebeu seu crachá de identificação?', textoResumido: 'Recebimento de crachá', dimensao: 'IEB', opcoes: OPCOES.RECEBEU_NAO, scored: true },

  { id: 'q12', texto: 'Você necessita utilizar transporte público para participar das atividades do Programa?', textoResumido: 'Necessidade de transporte público', dimensao: 'CARACTERIZACAO', opcoes: OPCOES.SIM_NAO, scored: false },

  { id: 'q13', texto: 'Se necessita de transporte público, recebeu o vale-transporte necessário para o deslocamento?', textoResumido: 'Recebimento de vale-transporte', dimensao: 'IEB', opcoes: OPCOES.RECEBEU_NAO_NA, scored: true },

  { id: 'q14', texto: 'No local onde realiza as atividades práticas, existe uma pessoa indicada para orientar e acompanhar seu trabalho?', textoResumido: 'Pessoa indicada para orientação', dimensao: 'IAA', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q15', texto: 'Você recebeu contato ou acompanhamento da RENAPSI durante seus primeiros 30 dias de participação?', textoResumido: 'Contato/acompanhamento da RENAPSI', dimensao: 'IAA', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q16', texto: 'Você sabe como entrar em contato com a RENAPSI caso tenha alguma dúvida, dificuldade ou precise de atendimento?', textoResumido: 'Conhece o canal de contato da RENAPSI', dimensao: 'IAA', opcoes: OPCOES.SIM_NAO, scored: true },

  { id: 'q17', texto: 'As atividades que você realiza são compatíveis com a aprendizagem em Administração? (limpeza, serviços de copa/cozinha, serviços particulares, outros)', textoResumido: 'Compatibilidade das atividades', dimensao: 'IACA', opcoes: OPCOES.SIM_NAO, scored: true },
  { id: 'q18', texto: 'O local onde você realiza as atividades permite que você trabalhe com segurança e sem exposição a atividade perigosa ou insalubre?', textoResumido: 'Segurança do local de atividade', dimensao: 'IACA', opcoes: OPCOES.SIM_NAO, scored: true },

  { id: 'q19', texto: 'Você já recebeu a primeira remuneração do Programa, caso a data prevista para o primeiro pagamento já tenha ocorrido?', textoResumido: 'Recebimento da primeira remuneração', dimensao: 'IEB', opcoes: OPCOES.RECEBEU_NAO_DEVIDA, scored: true },
  { id: 'q20', texto: 'Você sabe como solicitar atendimento ou acompanhamento da equipe da RENAPSI caso tenha alguma dificuldade pessoal, familiar, escolar ou relacionada ao trabalho?', textoResumido: 'Conhece o canal de apoio da RENAPSI', dimensao: 'IAA', opcoes: OPCOES.SIM_NAO, scored: true },
]

export const TODAS_PERGUNTAS_PONTUADAS = QUESTION_DEFINITIONS.filter(q => q.scored)

// ------------------------------------------------------------
// INDICADORES — dimensão, nome completo, perguntas que a compõem
// ------------------------------------------------------------
export const INDICATOR_DEFINITIONS = [
  { id: 'IRI',  nome: 'Índice de Regularidade do Ingresso',                 questoes: ['q1', 'q2', 'q3', 'q4', 'q22', 'q23', 'q24'] },
  { id: 'IRA',  nome: 'Índice de Regularidade da Aprendizagem',             questoes: ['q5', 'q6', 'q7', 'q8', 'q9'] },
  { id: 'IEB',  nome: 'Índice de Entregas e Benefícios',                    questoes: ['q10', 'q11', 'q13', 'q19'] },
  { id: 'IAA',  nome: 'Índice de Acompanhamento do Aprendiz',               questoes: ['q14', 'q15', 'q16', 'q20'] },
  { id: 'IACA', nome: 'Índice de Adequação das Condições de Aprendizagem',  questoes: ['q17', 'q18'] },
]

// ------------------------------------------------------------
// APLICABILIDADE — regras de negócio condicionais:
// Q12 (necessita transporte?) → Q13 (recebeu VT?)
// Q21 (modalidade do curso)   → Q22 (login/senha da plataforma), só EAD
// ------------------------------------------------------------
export function isApplicable(questionId, respostas) {
  if (questionId === 'q13') return respostas.q12 === 'SIM'
  if (questionId === 'q22') return respostas.q21 === 'EAD'
  return true
}

// ------------------------------------------------------------
// NORMALIZAÇÃO — string bruta -> 1 (positivo) | 0 (negativo) | null (fora do denominador)
// ------------------------------------------------------------
const POSITIVOS = new Set(['SIM', 'RECEBEU'])
const NEGATIVOS = new Set(['NAO', 'NAO_RECEBEU'])
const EXCLUIDOS = new Set(['NAO_SE_APLICA', 'AINDA_NAO_ERA_DEVIDA'])

export function normalizeAnswer(valorBruto) {
  if (POSITIVOS.has(valorBruto)) return 1
  if (NEGATIVOS.has(valorBruto)) return 0
  if (EXCLUIDOS.has(valorBruto)) return null
  return undefined // não respondida
}

// ------------------------------------------------------------
// CÁLCULO POR PERGUNTA
// ------------------------------------------------------------
// respostasBrutas: array de valores brutos (um por formulário) para UMA pergunta.
export function calculateQuestionResult(valorBruto) {
  return normalizeAnswer(valorBruto)
}

export function calculateQuestionStats(questionId, respostasBrutas) {
  let positivas = 0, negativas = 0, naoAplicaveis = 0
  respostasBrutas.forEach(valor => {
    const n = normalizeAnswer(valor)
    if (n === 1) positivas++
    else if (n === 0) negativas++
    else if (n === null) naoAplicaveis++
  })
  const baseValida = positivas + negativas
  return {
    questionId,
    positivas,
    negativas,
    naoAplicaveis,
    baseValida,
    percentual: baseValida > 0 ? (positivas / baseValida) * 100 : null,
  }
}

// ------------------------------------------------------------
// CÁLCULO POR INDICADOR (pool de todas as perguntas da dimensão)
// ------------------------------------------------------------
// respostasFormularios: array de documentos { respostas: { q1: 'SIM', ... } }
export function calculateDimensionIndicator(indicatorId, respostasFormularios) {
  const def = INDICATOR_DEFINITIONS.find(i => i.id === indicatorId)
  if (!def) return { id: indicatorId, percentual: null, baseValida: 0, positivas: 0 }

  let positivas = 0, baseValida = 0
  respostasFormularios.forEach(doc => {
    def.questoes.forEach(qId => {
      const n = normalizeAnswer(doc.respostas?.[qId])
      if (n === 1) { positivas++; baseValida++ }
      else if (n === 0) { baseValida++ }
      // null (não aplicável/ainda não devida) e undefined não entram no denominador
    })
  })

  return {
    id: def.id,
    nome: def.nome,
    positivas,
    baseValida,
    percentual: baseValida > 0 ? (positivas / baseValida) * 100 : null,
  }
}

export function calculateAllIndicators(respostasFormularios) {
  return INDICATOR_DEFINITIONS.reduce((acc, def) => {
    acc[def.id] = calculateDimensionIndicator(def.id, respostasFormularios)
    return acc
  }, {})
}

// ------------------------------------------------------------
// VALIDAÇÃO — todas as perguntas aplicáveis devem ter resposta
// ------------------------------------------------------------
export function validarRespostasCompletas(respostas) {
  return QUESTION_DEFINITIONS.every(q => {
    if (!isApplicable(q.id, respostas)) return true
    return typeof respostas[q.id] === 'string' && respostas[q.id].length > 0
  })
}

// ------------------------------------------------------------
// DATAS
// ------------------------------------------------------------
export function calcularDiasTranscorridos(dataAdmissaoISO, dataAplicacaoISO) {
  if (!dataAdmissaoISO || !dataAplicacaoISO) return null
  const admissao = new Date(dataAdmissaoISO + 'T00:00:00')
  const aplicacao = new Date(dataAplicacaoISO + 'T00:00:00')
  const diffMs = aplicacao - admissao
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// Período de aplicação no formato aaaa-mm — usado para particionar a
// coleção, igual ao padrão já usado em colaboradores_aaaa_mm.
export function calcularPeriodoAplicacao(dataAplicacaoISO) {
  if (!dataAplicacaoISO) return ''
  return dataAplicacaoISO.slice(0, 7) // 'aaaa-mm'
}

// ------------------------------------------------------------
// PERSISTÊNCIA — uma coleção por período de aplicação, como
// colaboradores_aaaa_mm / periodos.
// ------------------------------------------------------------
function nomeColecao(periodo) {
  return 'verificacao30dias_' + periodo.replace('-', '_')
}

function montarDocumento(dadosFormulario, periodo) {
  const diasTranscorridos = calcularDiasTranscorridos(
    dadosFormulario.identificacao.dataAdmissao,
    dadosFormulario.identificacao.dataAplicacao
  )
  return {
    instrumentType: INSTRUMENT_TYPE,
    instrumentVersion: INSTRUMENT_VERSION,
    periodoAplicacao: periodo,
    identificacao: {
      ...dadosFormulario.identificacao,
      diasTranscorridos,
    },
    respostas: dadosFormulario.respostas,
    observacao: dadosFormulario.observacao,
  }
}

async function marcarPeriodoDisponivel(periodo) {
  // Idempotente (não duplica a cada envio, ao contrário do padrão de
  // "periodos" usado no CSV, que faz um addDoc por importação; aqui um
  // doc por período basta, o total é sempre contado ao vivo na coleção
  // real, nunca fica um contador defasado).
  await setDoc(doc(db, 'verificacao30dias_periodos', periodo), { periodo }, { merge: true })
}

// Cria o rascunho a partir da primeira alteração relevante (identificação
// completa) — dali em diante o autosave só atualiza este mesmo
// documento. O período (e portanto a coleção) fica travado no valor de
// dataAplicacao no momento desta primeira gravação; se o usuário mudar
// a data de aplicação depois, o rascunho permanece na coleção original
// (limitação aceita — ver relatório final).
export async function criarRascunhoVerificacao30Dias(dadosFormulario, { uid, email }) {
  const periodo = calcularPeriodoAplicacao(dadosFormulario.identificacao.dataAplicacao)
  const documento = {
    ...montarDocumento(dadosFormulario, periodo),
    status: 'rascunho',
    metadata: {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid || null,
      updatedBy: uid || null,
      createdByEmail: email || null,
    },
  }
  const ref = await addDoc(collection(db, nomeColecao(periodo)), documento)
  await marcarPeriodoDisponivel(periodo)
  return { id: ref.id, periodo }
}

// Autosave de um rascunho já criado — nunca altera status nem os campos
// de autoria (createdBy/createdAt).
export async function atualizarRascunhoVerificacao30Dias(id, periodo, dadosFormulario) {
  await updateDoc(doc(db, nomeColecao(periodo), id), {
    ...montarDocumento(dadosFormulario, periodo),
    'metadata.updatedAt': serverTimestamp(),
  })
}

// Envio definitivo. Com rascunho autosalvo (id/periodo), promove o
// MESMO documento para 'enviada' — não duplica. Sem rascunho prévio,
// cria direto como enviada, igual ao comportamento anterior.
export async function enviarVerificacao30Dias(idExistente, periodoExistente, dadosFormulario, { uid, email }) {
  const periodo = periodoExistente || calcularPeriodoAplicacao(dadosFormulario.identificacao.dataAplicacao)
  if (idExistente) {
    await updateDoc(doc(db, nomeColecao(periodo), idExistente), {
      ...montarDocumento(dadosFormulario, periodo),
      status: 'enviada',
      'metadata.updatedAt': serverTimestamp(),
    })
    await marcarPeriodoDisponivel(periodo)
    return idExistente
  }
  const documento = {
    ...montarDocumento(dadosFormulario, periodo),
    status: 'enviada',
    metadata: {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid || null,
      updatedBy: uid || null,
      createdByEmail: email || null,
    },
  }
  const ref = await addDoc(collection(db, nomeColecao(periodo)), documento)
  await marcarPeriodoDisponivel(periodo)
  return ref.id
}

export async function buscarPeriodosDisponiveis() {
  const snap = await getDocs(collection(db, 'verificacao30dias_periodos'))
  const periodos = []
  snap.forEach(d => periodos.push(d.id))
  return periodos.sort().reverse()
}

export async function buscarRespostasPeriodo(periodo) {
  const snap = await getDocs(collection(db, nomeColecao(periodo)))
  const respostas = []
  snap.forEach(d => respostas.push({ id: d.id, ...d.data() }))
  return respostas
}
