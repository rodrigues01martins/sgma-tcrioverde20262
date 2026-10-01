import { GUARDIAN_SCHEMA } from '../schemas/guardian'
import { criarIndicadoresInstrumento } from './buildInstrumentIndicators'

// ============================================================
// 5 INDICADORES — RESPONSÁVEL LEGAL (seção 58)
// ============================================================
// ATENÇÃO (seção 58/104): IARR = Q11, ISR = Q12 — nunca a numeração
// histórica anterior à exclusão da antiga pergunta sobre quantidade de
// contatos.
const DEFINICOES = [
  {
    code: 'IDF', name: 'Desenvolvimento SocioComportamental Percebido pela Família', questionIds: ['q6', 'q7', 'q8'], target: 80, targetOperator: '>=',
    definition: 'Mede a percepção favorável dos responsáveis sobre melhora de postura, comunicação e pontualidade após a entrada do jovem no Programa.',
  },
  {
    code: 'IEFR', name: 'Expectativa Familiar de Empregabilidade', questionIds: ['q9'], target: 80, targetOperator: '>=',
    definition: 'Percentual de responsáveis que concordam ou concordam totalmente que o aprendiz terá boas chances de conseguir emprego após o contrato.',
  },
  {
    code: 'IIFR', name: 'Impacto Financeiro Percebido pela Família', questionIds: ['q10'], target: 80, targetOperator: '>=',
    definition: 'Percentual de responsáveis que informam que a condição financeira familiar melhorou ou melhorou muito após a entrada do jovem no Programa.',
  },
  {
    code: 'IARR', name: 'Qualidade do Atendimento RENAPSI — Responsável', questionIds: ['q11'], target: 80, targetOperator: '>=',
    definition: 'Percentual de responsáveis que utilizaram o atendimento da RENAPSI e o avaliaram positivamente.',
  },
  {
    code: 'ISR', name: 'Satisfação Geral do Responsável', questionIds: ['q12'], target: 80, targetOperator: '>=',
    definition: 'Percentual de responsáveis que avaliam a experiência da aprendizagem como Satisfeito ou Muito Satisfeito.',
  },
]

export const GUARDIAN_INDICATORS = criarIndicadoresInstrumento(GUARDIAN_SCHEMA, DEFINICOES)
