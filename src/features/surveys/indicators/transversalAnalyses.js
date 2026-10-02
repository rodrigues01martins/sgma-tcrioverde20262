// ============================================================
// 4 ANÁLISES TRANSVERSAIS (seção 67)
// ============================================================
// NUNCA somam nem tiram média entre públicos (seção 67/68/103) — cada
// análise apenas reúne, lado a lado, indicadores já calculados
// independentemente por instrumento. `perspectives` preserva o resultado
// completo de cada indicador (numerador/denominador/meta/operador
// próprios), nunca um valor consolidado único.
const DEFINICOES = [
  {
    code: 'TRANSV_DESENVOLVIMENTO_SOCIOCOMPORTAMENTAL',
    name: 'Análise Transversal — Desenvolvimento SocioComportamental',
    definition: 'Compara, sem produzir média única, as taxas favoráveis de postura, comunicação e pontualidade percebidas por egresso, responsável e mentor.',
    perspectivas: [
      { publico: 'Egresso', instrumento: 'GRADUATE', indicatorCode: 'IDSE' },
      { publico: 'Responsável', instrumento: 'GUARDIAN', indicatorCode: 'IDF' },
      { publico: 'Mentor', instrumento: 'MENTOR', indicatorCode: 'ICDP' },
    ],
  },
  {
    code: 'TRANSV_IMPACTO_FINANCEIRO',
    name: 'Análise Transversal — Impacto Financeiro Percebido',
    definition: 'Compara separadamente a percepção de impacto financeiro entre egresso, responsável e mentor.',
    perspectivas: [
      { publico: 'Egresso', instrumento: 'GRADUATE', indicatorCode: 'IIFE' },
      { publico: 'Responsável', instrumento: 'GUARDIAN', indicatorCode: 'IIFR' },
      { publico: 'Mentor', instrumento: 'MENTOR', indicatorCode: 'IIFM' },
    ],
  },
  {
    code: 'TRANSV_EXPECTATIVA_RESULTADO_EMPREGABILIDADE',
    name: 'Análise Transversal — Expectativa e Resultado de Empregabilidade',
    definition: 'Compara as expectativas de empregabilidade do aprendiz e do responsável com os resultados observados entre egressos.',
    perspectivas: [
      { publico: 'Aprendiz (expectativa)', instrumento: 'ACTIVE_LEARNER', indicatorCode: 'IEA' },
      { publico: 'Responsável (expectativa)', instrumento: 'GUARDIAN', indicatorCode: 'IEFR' },
      { publico: 'Egresso (resultado observado)', instrumento: 'GRADUATE', indicatorCode: 'TIP' },
    ],
  },
  {
    code: 'TRANSV_QUALIDADE_ATENDIMENTO',
    name: 'Análise Transversal — Qualidade do Atendimento do Programa',
    definition: 'Compara a taxa de avaliação favorável do atendimento entre aprendiz, responsável e mentor, sempre excluindo respostas de não aplicabilidade.',
    perspectivas: [
      { publico: 'Aprendiz', instrumento: 'ACTIVE_LEARNER', indicatorCode: 'IAR' },
      { publico: 'Responsável', instrumento: 'GUARDIAN', indicatorCode: 'IARR' },
      { publico: 'Mentor', instrumento: 'MENTOR', indicatorCode: 'IAM' },
    ],
  },
]

const RESULTADOS_POR_INSTRUMENTO_KEY = {
  ACTIVE_LEARNER: 'activeLearner',
  MENTOR: 'mentor',
  GUARDIAN: 'guardian',
  GRADUATE: 'graduate',
}

// `resultadosPorInstrumento`: { activeLearner, mentor, guardian, graduate }
// — cada um é o mapa {code: indicatorResult} já calculado por
// calcularTodosIndicadores para aquele instrumento. Esta função NUNCA
// recalcula nada, só reorganiza para exibição lado a lado.
export function montarAnalisesTransversais(resultadosPorInstrumento) {
  return DEFINICOES.map(def => ({
    code: def.code,
    name: def.name,
    definition: def.definition,
    perspectivas: def.perspectivas.map(p => {
      const chave = RESULTADOS_POR_INSTRUMENTO_KEY[p.instrumento]
      const resultado = resultadosPorInstrumento[chave]?.[p.indicatorCode] ?? null
      return { publico: p.publico, instrumento: p.instrumento, indicatorCode: p.indicatorCode, resultado }
    }),
  }))
}

export const TRANSVERSAL_ANALYSIS_DEFINITIONS = DEFINICOES
