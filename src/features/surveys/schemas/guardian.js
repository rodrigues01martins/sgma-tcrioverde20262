import { favoravelLikert, sempreAplicavel, excluirCodigo } from './common'

// ============================================================
// SCHEMA — RESPONSÁVEL LEGAL (Pesquisa de Satisfação)
// ============================================================
// Aliases atualizados com os cabeçalhos REAIS do CSV exportado do
// Microsoft Forms (arquivo real recebido e inspecionado). ATENÇÃO à
// numeração (seção 58/104): IARR = Q11, ISR = Q12 — NUNCA a numeração
// histórica anterior à exclusão da antiga pergunta sobre quantidade de
// contatos.
export const GUARDIAN_SCHEMA = {
  surveyType: 'GUARDIAN',
  schemaVersion: 1,
  label: 'Responsável Legal',
  expectedQuestionCount: 12,
  municipioQuestionId: 'q3',
  dataPreenchimentoQuestionId: 'q1',
  questions: [
    { id: 'q1',  key: 'data',            position: 1,  aliases: ['Data de Preenchimento', 'Data'], type: 'date', scored: false },
    // Alias só o texto real — 'Nome' sozinho colidiria com a coluna
    // automática de metadado do Forms (mesmo campo, mesmo texto).
    { id: 'q2',  key: 'nomeResponsavel', position: 2,  aliases: ['Qual é o seu nome?'], type: 'text', scored: false, discard: true, sensitive: true },
    { id: 'q3',  key: 'municipio',       position: 3,  aliases: ['Atualmente você reside em que Município?', 'Município'], type: 'municipio', scored: false },
    { id: 'q4',  key: 'parentescoVinculo', position: 4, aliases: ['Qual o seu grau de parentesco ou vínculo legal com o Aprendiz?', 'Parentesco/vínculo'], type: 'categorical', scored: false },
    { id: 'q5',  key: 'situacaoOcupacional', position: 5, aliases: ['Atualmente você está:', 'Situação ocupacional'], type: 'categorical', scored: false },

    // IDF = Q6+Q7+Q8 (seção 58). As três compartilham o mesmo preâmbulo
    // truncado pelo exportador do Forms, distinguidas pelo sufixo
    // numérico que o próprio export adiciona a colunas duplicadas.
    { id: 'q6',  key: 'postura',      position: 6,  aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Após a entrada de meu filho/neto/irmão/sobrinho no Programa de Apre1',
        'Postura',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q7',  key: 'comunicacao', position: 7,  aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Após a entrada de meu filho/neto/irmão/sobrinho no Programa de Apre',
        'Comunicação',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q8',  key: 'pontualidade', position: 8,  aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Após a entrada de meu filho/neto/irmão/sobrinho no Programa de Apre2',
        'Pontualidade',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    { id: 'q9',  key: 'expectativaEmpregabilidade', position: 9, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Eu acredito que após terminar o contrato de aprendizagem as chances',
        'Expectativa de empregabilidade',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q10', key: 'condicaoFinanceira', position: 10, aliases: [
        'Após a entrada de seu filho/neto/irmão/sobrinho no Programa, a condição financeira da família:',
        'Condição financeira',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // IARR = Q11 (seção 58/104), com N/A explícito (seção 33): 0 = nunca
    // precisei falar com a RENAPSI (confirmado no CSV real, com prefixo
    // numérico — diferente de Mentor).
    { id: 'q11', key: 'qualidadeAtendimentoRenapsi', position: 11, aliases: [
        'QUANDO você ou seu responsável precisou entrar em contato com a RENAPSI para sanar dúvidas, pedir esclarecimentos ou informações o atendimento foi?',
        'Qualidade do atendimento RENAPSI',
      ], type: 'coded', scored: true,
      isApplicable: excluirCodigo(0), isFavorable: favoravelLikert },

    // ISR = Q12 (seção 58/104).
    { id: 'q12', key: 'satisfacaoGeral', position: 12, aliases: [
        'De um modo geral como você avalia a experiência da aprendizagem até aqui?',
        'Satisfação geral',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
  ],
}
