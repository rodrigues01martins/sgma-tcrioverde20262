import { favoravelLikert, sempreAplicavel, excluirCodigo, extrairCodigoComFallbackNuncaPrecisei } from './common'

// ============================================================
// SCHEMA — MENTOR DA PRÁTICA (Pesquisa de Satisfação)
// ============================================================
// Aliases atualizados com os cabeçalhos REAIS do CSV exportado do
// Microsoft Forms (arquivo real recebido e inspecionado).
export const MENTOR_SCHEMA = {
  surveyType: 'MENTOR',
  schemaVersion: 1,
  label: 'Mentor da Prática',
  expectedQuestionCount: 17,
  municipioQuestionId: 'q3',
  dataPreenchimentoQuestionId: 'q1',
  questions: [
    { id: 'q1',  key: 'data',                    position: 1,  aliases: ['Data do Preenchimento', 'Data'], type: 'date', scored: false },
    // Alias só o texto real — 'Nome' sozinho colidiria com a coluna
    // automática de metadado do Forms (mesmo campo, mesmo texto).
    { id: 'q2',  key: 'nomeMentor',               position: 2,  aliases: ['Qual é o seu nome?'], type: 'text', scored: false, discard: true, sensitive: true },
    { id: 'q3',  key: 'municipioAtuacao',         position: 3,  aliases: ['Qual o seu Município de atuação?1', 'Município de atuação'], type: 'municipio', scored: false },
    { id: 'q4',  key: 'orgaoUnidadeSetor',        position: 4,  aliases: ['Qual o órgão / unidade / setor de lotação?', 'Órgão/unidade/setor'], type: 'categorical', scored: false },
    { id: 'q5',  key: 'tempoComoMentor',          position: 5,  aliases: ['Há quanto tempo você atua como mentor ou supervisor de Jovens Aprendizes?', 'Tempo como mentor/supervisor'], type: 'categorical', scored: false },
    { id: 'q6',  key: 'qtdAprendizesSupervisionados', position: 6, aliases: ['Atualmente você atua como mentor de quantos Jovens Aprendizes?', 'Quantidade de aprendizes supervisionados'], type: 'coded', scored: false },

    // IDAP = Q7+Q8+Q9+Q10 (seção 59).
    { id: 'q7',  key: 'assiduidadePontualidadeJornada', position: 7,  aliases: [
        'De um modo geral, como você avalia a assiduidade, pontualidade e cumprimento da jornada de trabalho dos aprendizes que  já estiveram ou estão sobre sua supervisão?',
        'Assiduidade/pontualidade/jornada',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q8',  key: 'posturaRespeitoNormas',    position: 8,  aliases: [
        'De um modo geral, como você avalia a postura, o respeito à equipe e o cumprimento de normas internas dos aprendizes que  já estiveram ou estão sobre sua supervisão?',
        'Postura/respeito/normas',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q9',  key: 'iniciativaInteresseDisposicao', position: 9, aliases: [
        'De um modo geral, como você avalia A INICIATIVA, O INTERESSE E A DISPOSIÇÃO EM APRENDER dos aprendizes que  já estiveram ou estão sobre sua supervisão?',
        'Iniciativa/interesse/disposição',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q10', key: 'assimilacaoAplicacaoOrientacoes', position: 10, aliases: [
        'De um modo geral, como você avalia a CAPACIDADE DOS JOVENS EM ASSIMILAR E APLICAR A ORIENTAÇÕES QUE LHES SÃO REPASSADAS?',
        'Assimilação e aplicação das orientações',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // ICDP = Q11+Q12+Q13 (seção 59). As três compartilham o mesmo
    // preâmbulo truncado pelo exportador do Forms, distinguidas só pelo
    // sufixo numérico que o próprio export adiciona a colunas
    // duplicadas — por isso os aliases abaixo são o texto exato,
    // sufixo incluído.
    { id: 'q11', key: 'contribuicaoPostura',      position: 11, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:',
        'Contribuição para postura',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q12', key: 'contribuicaoComunicacao',  position: 12, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:1',
        'Contribuição para comunicação',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q13', key: 'contribuicaoPontualidade', position: 13, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:2',
        'Contribuição para pontualidade',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    { id: 'q14', key: 'contribuicaoCondicoesFinanceiras', position: 14, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:3',
        'Contribuição para condições financeiras',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // Regra especial seção 33: Mentor Q15 é uma das 3 questões de
    // atendimento com N/A explícito. CRÍTICO — diferente de Aprendiz/
    // Responsável, o CSV real deste instrumento exporta a opção de N/A
    // como texto puro ("Nunca precisa de acessar os canais de
    // atendimento"), sem prefixo numérico — por isso usa um parser
    // (`parse`) próprio em vez do extrator genérico.
    { id: 'q15', key: 'atendimentoPrograma',      position: 15, aliases: [
        'Como você avalia os canais de atendimento do Programa Aprendiz do Futuro quando necessitou sanar alguma dúvida ou obter alguma informação?',
        'Atendimento do Programa',
      ], type: 'coded', scored: true,
      parse: extrairCodigoComFallbackNuncaPrecisei,
      isApplicable: excluirCodigo(0), isFavorable: favoravelLikert },

    { id: 'q16', key: 'desempenhoGeral',          position: 16, aliases: [
        'Como você avalia de um modo geral o desempenho dos aprendizes que  já estiveram ou estão sobre sua supervisão?',
        'Desempenho geral',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q17', key: 'disposicaoReceberNovosAprendizes', position: 17, aliases: [
        'Qual a sua disposição em receber novos aprendizes em seu orgão/unidade/setor?',
        'Disposição para receber novos aprendizes',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
  ],
}
