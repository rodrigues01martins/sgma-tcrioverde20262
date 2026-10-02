import { ACTIVE_LEARNER_SCHEMA } from '../schemas/activeLearner'
import { criarIndicadoresInstrumento } from './buildInstrumentIndicators'

// ============================================================
// 10 INDICADORES — APRENDIZ ATIVO (seção 52)
// ============================================================
// Fórmulas/metas transcritas literalmente da Matriz Final de Indicadores
// (fonte de verdade — seção 51). IAPE é a exceção: meta ≥90%, não os
// ≥80% padrão dos demais — não confundir os dois.
const DEFINICOES = [
  {
    code: 'ISA', name: 'Satisfação Geral do Aprendiz', questionIds: ['q21'], target: 80, targetOperator: '>=',
    definition: 'Percentual de aprendizes ativos que avaliam a experiência geral da aprendizagem como Satisfeito ou Muito Satisfeito.',
  },
  {
    // CRÍTICO (seção 53/101): apenas Q8+Q9 — a antiga dimensão
    // "tratamento dos professores" não integra mais este indicador.
    code: 'IQPF', name: 'Qualidade Pedagógica da Formação', questionIds: ['q8', 'q9'], target: 80, targetOperator: '>=',
    definition: 'Mede a percepção favorável sobre a didática dos professores e a qualidade dos conteúdos ministrados.',
  },
  {
    code: 'IQRA', name: 'Qualidade dos Recursos de Aprendizagem', questionIds: ['q10', 'q11', 'q12'], target: 80, targetOperator: '>=',
    definition: 'Mede a avaliação favorável dos recursos de aprendizagem: material didático, conteúdo EAD/online/virtual e conforto do polo presencial. Em Q11 e Q12, respostas 0 funcionam como crivo de não aplicabilidade e ficam fora do denominador; em Q10, a resposta 0 permanece válida e não favorável.',
  },
  {
    // Meta ≥90% — exceção documentada (não é o padrão ≥80%).
    code: 'IAPE', name: 'Acesso à Plataforma EAD', questionIds: ['q13'], target: 90, targetOperator: '>=',
    definition: 'Percentual de aprendizes que declaram sempre conseguir acessar o conteúdo na plataforma EAD. Como todos recebem login e senha, considera-se todas as respostas válidas de Q13.',
  },
  {
    code: 'IAR', name: 'Qualidade do Atendimento RENAPSI — Aprendiz', questionIds: ['q15'], target: 80, targetOperator: '>=',
    definition: 'Percentual de aprendizes que utilizaram o atendimento da RENAPSI e o avaliaram positivamente.',
  },
  {
    code: 'IAF', name: 'Acolhimento na Formação', questionIds: ['q16'], target: 80, targetOperator: '>=',
    definition: 'Percentual de aprendizes que concordam ou concordam totalmente que foram tratados com educação, respeito e acolhimento por colegas e professores.',
  },
  {
    code: 'IAP', name: 'Acolhimento na Atividade Prática', questionIds: ['q17'], target: 80, targetOperator: '>=',
    definition: 'Percentual de aprendizes que concordam ou concordam totalmente que foram tratados com educação, respeito e acolhimento no órgão/unidade/setor de trabalho.',
  },
  {
    code: 'INO', name: 'Não Ociosidade na Atividade Prática', questionIds: ['q18'], target: 80, targetOperator: '>=',
    definition: 'Percentual de aprendizes que discordam ou discordam totalmente da afirmação de que ficam ociosos por muito tempo no local de trabalho.',
  },
  {
    code: 'IEA', name: 'Expectativa de Empregabilidade do Aprendiz', questionIds: ['q19'], target: 80, targetOperator: '>=',
    definition: 'Percentual de aprendizes que concordam ou concordam totalmente que terão boas chances de conseguir emprego após o contrato de aprendizagem.',
  },
  {
    code: 'IAFA', name: 'Apoio Familiar à Aprendizagem', questionIds: ['q20'], target: 80, targetOperator: '>=',
    definition: 'Percentual de aprendizes que informam que a família incentiva muito sua participação no Programa.',
  },
]

export const ACTIVE_LEARNER_INDICATORS = criarIndicadoresInstrumento(ACTIVE_LEARNER_SCHEMA, DEFINICOES)
