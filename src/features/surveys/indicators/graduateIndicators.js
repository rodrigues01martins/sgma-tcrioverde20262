import { GRADUATE_SCHEMA } from '../schemas/graduate'
import { favoravelEntre, sempreAplicavel } from '../schemas/common'
import { criarIndicadoresInstrumento } from './buildInstrumentIndicators'

// ============================================================
// 8 INDICADORES — EGRESSO / AVALIAÇÃO PÓS-PROGRAMA (seção 60)
// ============================================================
// Q5, Q6 e Q7 servem a mais de um indicador com favorabilidades
// diferentes — por isso usam `overrides` em vez do isFavorable único do
// schema (ver nota em schemas/graduate.js).
const DEFINICOES = [
  {
    // TIP consolida inserção produtiva (seção 60/61) — não recriar Taxa
    // de Efetivação/Emprego Formal/Trabalho Autônomo como KPIs à parte.
    code: 'TIP', name: 'Taxa de Inserção Produtiva Pós-Programa', questionIds: ['q5'], target: 60, targetOperator: '>=',
    definition: 'Percentual de egressos que estão efetivados no mesmo local, empregados formalmente em outra organização ou trabalhando por conta própria.',
    overrides: { q5: { isApplicable: sempreAplicavel, isFavorable: favoravelEntre(1, 2, 3) } },
  },
  {
    code: 'TCE', name: 'Taxa de Continuidade Educacional', questionIds: ['q7'], target: 60, targetOperator: '>=',
    definition: 'Percentual de egressos que estão cursando Ensino Médio, Ensino Técnico/Profissionalizante ou Ensino Superior.',
    overrides: { q7: { isApplicable: sempreAplicavel, isFavorable: favoravelEntre(1, 3, 4) } },
  },
  {
    // CRÍTICO (seção 50/63): meta <= 30%, não >=. targetOperator precisa
    // ser "<=" — nunca assumir "maior = melhor".
    code: 'TFET', name: 'Taxa Fora de Estudo e Trabalho', questionIds: ['q5'], target: 30, targetOperator: '<=',
    definition: 'Percentual de egressos que não estão estudando nem trabalhando, independentemente de estarem ou não procurando emprego.',
    overrides: { q5: { isApplicable: sempreAplicavel, isFavorable: favoravelEntre(6, 7) } },
  },
  {
    code: 'IAAP', name: 'Aderência da Situação Atual à Aprendizagem', questionIds: ['q6'], target: 80, targetOperator: '>=',
    definition: 'Percentual de egressos que declaram que sua situação atual tem certa ou muita relação com a experiência de aprendizagem.',
    overrides: { q6: { isApplicable: sempreAplicavel, isFavorable: favoravelEntre(3, 4) } },
  },
  {
    code: 'IDSE', name: 'Desenvolvimento SocioComportamental do Egresso', questionIds: ['q8', 'q9', 'q10'], target: 80, targetOperator: '>=',
    definition: 'Mede a percepção favorável do egresso sobre melhoria de postura, comunicação e pontualidade após a experiência como aprendiz.',
  },
  {
    code: 'IIFE', name: 'Impacto Financeiro Percebido pelo Egresso', questionIds: ['q11'], target: 80, targetOperator: '>=',
    definition: 'Percentual de egressos que informam melhora ou muita melhora na condição financeira própria e de sua família.',
  },
  {
    code: 'IAFE', name: 'Apoio Familiar durante o Programa', questionIds: ['q12'], target: 80, targetOperator: '>=',
    definition: 'Percentual de egressos que informam que a família incentivou muito sua participação no Programa.',
  },
  {
    code: 'IIPT', name: 'Importância do Programa para a Trajetória', questionIds: ['q13'], target: 80, targetOperator: '>=',
    definition: 'Percentual de egressos que atribuem muita ou muitíssima importância ao Programa para sua trajetória.',
  },
]

export const GRADUATE_INDICATORS = criarIndicadoresInstrumento(GRADUATE_SCHEMA, DEFINICOES)
