import { MENTOR_SCHEMA } from '../schemas/mentor'
import { criarIndicadoresInstrumento } from './buildInstrumentIndicators'

// ============================================================
// 6 INDICADORES — MENTOR DA PRÁTICA (seção 59)
// ============================================================
const DEFINICOES = [
  {
    code: 'IDAP', name: 'Desempenho do Aprendiz na Prática', questionIds: ['q7', 'q8', 'q9', 'q10'], target: 80, targetOperator: '>=',
    definition: 'Mede a avaliação favorável dos mentores sobre assiduidade/pontualidade, postura, interesse/iniciativa e capacidade de assimilar e aplicar orientações.',
  },
  {
    code: 'ICDP', name: 'Contribuição da Prática para o Desenvolvimento', questionIds: ['q11', 'q12', 'q13'], target: 80, targetOperator: '>=',
    definition: 'Mede a percepção dos mentores sobre a contribuição da atividade prática para melhoria de postura, comunicação e pontualidade.',
  },
  {
    code: 'IIFM', name: 'Impacto Financeiro Percebido pelo Mentor', questionIds: ['q14'], target: 80, targetOperator: '>=',
    definition: 'Percentual de mentores que concordam ou concordam totalmente que a atividade prática contribui para melhorar as condições financeiras do jovem e de sua família.',
  },
  {
    code: 'IAM', name: 'Qualidade do Atendimento do Programa — Mentor', questionIds: ['q15'], target: 80, targetOperator: '>=',
    definition: 'Percentual de mentores que utilizaram os canais de atendimento e os avaliaram favoravelmente, excluindo respostas de não aplicabilidade.',
  },
  {
    code: 'IAGD', name: 'Avaliação Geral do Desempenho', questionIds: ['q16'], target: 80, targetOperator: '>=',
    definition: 'Percentual de mentores que avaliam favoravelmente, de modo geral, o desempenho dos aprendizes sob sua supervisão.',
  },
  {
    code: 'IRNA', name: 'Disposição para Receber Novos Aprendizes', questionIds: ['q17'], target: 80, targetOperator: '>=',
    definition: 'Percentual de mentores que provavelmente receberiam ou com certeza continuariam a receber novos aprendizes.',
  },
]

export const MENTOR_INDICATORS = criarIndicadoresInstrumento(MENTOR_SCHEMA, DEFINICOES)
