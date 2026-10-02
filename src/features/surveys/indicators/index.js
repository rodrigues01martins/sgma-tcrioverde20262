import { ACTIVE_LEARNER_INDICATORS } from './activeLearnerIndicators'
import { MENTOR_INDICATORS } from './mentorIndicators'
import { GUARDIAN_INDICATORS } from './guardianIndicators'
import { GRADUATE_INDICATORS } from './graduateIndicators'
import { TRANSVERSAL_ANALYSIS_DEFINITIONS, montarAnalisesTransversais } from './transversalAnalyses'
import { calcularTodosIndicadores } from './buildInstrumentIndicators'

export {
  ACTIVE_LEARNER_INDICATORS, MENTOR_INDICATORS, GUARDIAN_INDICATORS, GRADUATE_INDICATORS,
  TRANSVERSAL_ANALYSIS_DEFINITIONS, montarAnalisesTransversais, calcularTodosIndicadores,
}
export { calculateFavorableRate, calculateFavorableRateFromQuestions, buildIndicatorResult } from './calculateFavorableRate'

// Regra de domínio explícita (seção 107) — mesma lógica de proteção já
// usada para TOTAL_MUNICIPIOS_GOIAS: falha alto e cedo se algum
// indicador for removido/adicionado por engano, em vez de o painel
// silenciosamente mostrar uma composição diferente da matriz aprovada.
export const TOTAL_INDICADORES_E_ANALISES = 33
const contagemAtual =
  ACTIVE_LEARNER_INDICATORS.length +
  MENTOR_INDICATORS.length +
  GUARDIAN_INDICATORS.length +
  GRADUATE_INDICATORS.length +
  TRANSVERSAL_ANALYSIS_DEFINITIONS.length

if (contagemAtual !== TOTAL_INDICADORES_E_ANALISES) {
  throw new Error(
    `Configuração de indicadores das pesquisas corrompida: esperado ${TOTAL_INDICADORES_E_ANALISES} (10 Aprendiz + 6 Mentor + 5 Responsável + 8 Egresso + 4 transversais), encontrado ${contagemAtual}.`
  )
}

// Calcula os indicadores dos 4 instrumentos + as 4 análises transversais
// a partir das respostas normalizadas já persistidas (nunca de um valor
// pré-calculado — seção 81). `respostasPorInstrumento` é
// { activeLearner: [...docs], mentor: [...], guardian: [...], graduate: [...] }.
export function calcularPainelCompleto(respostasPorInstrumento) {
  const activeLearner = calcularTodosIndicadores(ACTIVE_LEARNER_INDICATORS, respostasPorInstrumento.activeLearner || [])
  const mentor = calcularTodosIndicadores(MENTOR_INDICATORS, respostasPorInstrumento.mentor || [])
  const guardian = calcularTodosIndicadores(GUARDIAN_INDICATORS, respostasPorInstrumento.guardian || [])
  const graduate = calcularTodosIndicadores(GRADUATE_INDICATORS, respostasPorInstrumento.graduate || [])
  const transversais = montarAnalisesTransversais({ activeLearner, mentor, guardian, graduate })
  return { activeLearner, mentor, guardian, graduate, transversais }
}
