import { favoravelLikert, favoravelApenasTopo, sempreAplicavel } from './common'

// ============================================================
// SCHEMA — EGRESSO (Avaliação de Resultados Pós-Programa)
// ============================================================
// Aliases atualizados com os cabeçalhos REAIS do CSV exportado do
// Microsoft Forms (arquivo real recebido e inspecionado). NÃO é
// pesquisa de satisfação (seção 1) — metodologicamente é avaliação de
// resultados.
//
// Q5, Q6 e Q7 são categóricas com códigos específicos por indicador
// (TIP/TFET usam Q5 com conjuntos de opções diferentes; IAAP usa Q6;
// TCE usa Q7) — por isso não recebem um único `isFavorable` aqui: cada
// indicador em indicators/graduateIndicators.js define o predicado
// exato conforme a matriz (seções 61-66).
export const GRADUATE_SCHEMA = {
  surveyType: 'GRADUATE',
  schemaVersion: 1,
  label: 'Egresso',
  expectedQuestionCount: 13,
  municipioQuestionId: 'q2',
  dataPreenchimentoQuestionId: 'q1',
  questions: [
    { id: 'q1', key: 'data', position: 1, aliases: ['Data de Preenchimento', 'Data'], type: 'date', scored: false },
    { id: 'q2', key: 'municipioResidencia', position: 2, aliases: [
        'Atualmente você reside em que Município?',
        'Município de residência',
      ], type: 'municipio', scored: false },
    { id: 'q3', key: 'municipioLocalTrabalho', position: 3, aliases: [
        'O local em que você trabalhou durante o programa estava localizado em qual Município?',
        'Município do local onde trabalhou',
      ], type: 'municipio', scored: false },
    { id: 'q4', key: 'tempoDesdeSaida', position: 4, aliases: [
        'Há quanto tempo você você já saiu do Programa?',
        'Tempo desde a saída do Programa',
      ], type: 'categorical', scored: false },

    // TIP (opções 1,2,3) e TFET (opções 6,7) — ver graduateIndicators.js.
    { id: 'q5', key: 'situacaoAtual', position: 5, aliases: [
        'Atualmente você está:',
        'Situação atual',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel },

    // IAAP — opções 3,4 favoráveis (seção 64).
    { id: 'q6', key: 'relacaoSituacaoComAprendizagem', position: 6, aliases: [
        'Em relação ao que está fazendo hoje (trabalhando, estudando....)? Você diria que:',
        'Relação da situação atual com a aprendizagem',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel },

    // TCE — opções 1,3,4 favoráveis (seção 62).
    { id: 'q7', key: 'situacaoEducacional', position: 7, aliases: [
        'Em relação aos estudos, você está?',
        'Situação educacional',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel },

    // IDSE = Q8+Q9+Q10 (seção 65). As três compartilham o mesmo
    // preâmbulo truncado pelo exportador do Forms.
    { id: 'q8',  key: 'postura',      position: 8,  aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Após a minha experiência como APRENDIZ eu melhorei a minha postura ',
        'Postura',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q9',  key: 'comunicacao',  position: 9,  aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Após a experiência como APRENDIZ eu consigo me comunicar melhor com',
        'Comunicação',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q10', key: 'pontualidade', position: 10, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Após a experiência como APRENDIZ eu passei a ser mais pontual em me',
        'Pontualidade',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // IIFE (seção 66).
    { id: 'q11', key: 'condicaoFinanceira', position: 11, aliases: [
        'Em relação a sua condição financeira e de sua família, você acha que:',
        'Condição financeira',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // IAFE (seção 31 da matriz): "categoria de maior incentivo" — só o
    // topo da escala é favorável. Escala real confirmada pelo CSV: 1–4
    // ("4 - Incentivou muito" é o topo, não 5 como assumido antes de ter
    // o arquivo real — mesmo padrão do Aprendiz Q20).
    { id: 'q12', key: 'apoioFamiliar', position: 12, aliases: [
        'Pensando no período em que você esteve no programa de Aprendizado, o quanto sua família incentivou a sua participação?',
        'Apoio familiar',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelApenasTopo(4) },

    // IIPT (seção 66).
    { id: 'q13', key: 'importanciaPrograma', position: 13, aliases: [
        'Como você avalia de um MODO GERAL a importância do programa para sua trajetória?',
        'Importância do Programa',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
  ],
}
