import {
  favoravelLikert, favoravelInvertido, favoravelApenasTopo,
  sempreAplicavel, excluirCodigo,
} from './common'

// ============================================================
// SCHEMA — APRENDIZ ATIVO (Pesquisa de Satisfação)
// ============================================================
// Aliases atualizados com os cabeçalhos REAIS do CSV exportado do
// Microsoft Forms (arquivo real recebido e inspecionado) — o rótulo
// curto original do mapa da manutenção permanece como alias adicional,
// por segurança, mas o texto real é quem casa na prática.
export const ACTIVE_LEARNER_SCHEMA = {
  surveyType: 'ACTIVE_LEARNER',
  schemaVersion: 1,
  label: 'Aprendiz Ativo',
  expectedQuestionCount: 21,
  municipioQuestionId: 'q4',
  dataPreenchimentoQuestionId: 'q1',
  questions: [
    { id: 'q1',  key: 'dataPreenchimento',        position: 1,  aliases: ['Data do Preenchimento', 'Data de Preenchimento'], type: 'date', scored: false },
    { id: 'q2',  key: 'nomeJovem',                position: 2,  aliases: ['Nome do Jovem'], type: 'text', scored: false, discard: true, sensitive: true },
    { id: 'q3',  key: 'cpf',                      position: 3,  aliases: ['CPF'], type: 'text', scored: false, discard: true, sensitive: true },
    { id: 'q4',  key: 'municipio',                position: 4,  aliases: ['Qual o seu município?', 'Município'], type: 'municipio', scored: false },
    { id: 'q5',  key: 'modalidade',               position: 5,  aliases: ['Qual a modalidade em que você realiza as aulas teóricas de aprendizagem?', 'Modalidade'], type: 'categorical', scored: false },
    { id: 'q6',  key: 'etapaAprendizagem',        position: 6,  aliases: ['Em que etapa da aprendizagem você está?', 'Etapa da aprendizagem'], type: 'categorical', scored: false },
    { id: 'q7',  key: 'atividadesNaoRelacionadas',position: 7,  aliases: [
        'Você já realizou atividades que não estão relacionadas com o trabalho administrativo? (Portaria, Monitoria de creche/escola, cozinha, cuidador de idosos etc)',
        'Atividades não relacionadas ao trabalho administrativo',
      ], type: 'coded', scored: false },

    { id: 'q8',  key: 'didaticaProfessores',  position: 8,  aliases: [
        'Como você avalia a didática dos Professores? (clareza nas explicações, respostas às dúvidas etc)',
        'Didática dos professores',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q9',  key: 'conteudosMinistrados', position: 9,  aliases: [
        'Como você avalia os conteúdos que são ministrados nos cursos?',
        'Conteúdos ministrados',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // Regra especial seção 29: 0 é resposta negativa real, permanece no
    // denominador (nunca é N/A automático).
    { id: 'q10', key: 'materialDidatico', position: 10, aliases: [
        'Como você avalia a qualidade do material didático fornecido a você durante o curso?',
        'Material didático',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // Regra especial seção 30: 0 = nunca teve acesso ao conteúdo EAD →
    // fora do denominador.
    { id: 'q11', key: 'conteudoEad', position: 11, aliases: [
        'Como você avalia a qualidade do conteúdo EAD/ONline/Virtual?',
        'Conteúdo EAD/Online/Virtual',
      ], type: 'coded', scored: true,
      isApplicable: excluirCodigo(0), isFavorable: favoravelLikert },

    // Regra especial seção 31: 0 = não teve aulas em Polo Presencial →
    // fora do denominador.
    { id: 'q12', key: 'poloPresencial', position: 12, aliases: [
        'Caso você tenha tido aulas em um Polo Presencial como você avalia o conforto do local (segurança, banheiros, bebedouros, ar condicionado/ventilador etc)?',
        'Polo Presencial',
      ], type: 'coded', scored: true,
      isApplicable: excluirCodigo(0), isFavorable: favoravelLikert },

    // Regra especial seção 32/55: escala 1-3, todas válidas, favorável
    // é somente 3 ("Sempre consigo acessar").
    { id: 'q13', key: 'acessoPlataformaEad', position: 13, aliases: [
        'Em relação ao acesso do Conteúdo na plataforma EAD:',
        'Acesso à plataforma/conteúdo EAD',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelApenasTopo(3) },

    { id: 'q14', key: 'qtdContatosRenapsi', position: 14, aliases: [
        'QUANTAS vezes você ou seu responsável já precisou entrar em contato com a RENAPSI para sanar dúvidas, pedir esclarecimentos ou informações?',
        'Quantidade de contatos com RENAPSI',
      ], type: 'coded', scored: false },

    // Regra especial seção 33: 0 = nunca precisei falar com a RENAPSI →
    // não aplicável (fora do numerador e do denominador).
    { id: 'q15', key: 'qualidadeAtendimentoRenapsi', position: 15, aliases: [
        'QUANDO você ou seu responsável precisou entrar em contato com a RENAPSI para sanar dúvidas, pedir esclarecimentos ou informações o atendimento foi?',
        'Qualidade do atendimento RENAPSI',
      ], type: 'coded', scored: true,
      isApplicable: excluirCodigo(0), isFavorable: favoravelLikert },

    { id: 'q16', key: 'acolhimentoFormacao', position: 16, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Sempre fui tratado (a) com muita educação, respeito e me senti acol',
        'Acolhimento na formação',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
    { id: 'q17', key: 'acolhimentoPratica', position: 17, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Sempre fui tratado (a) com muita educação, respeito e me senti acol1',
        'Acolhimento na prática',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // Regra especial seção 34: item invertido — favorável é 1 ou 2.
    { id: 'q18', key: 'ociosidade', position: 18, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Na maioria das vezes eu me sinto ocioso no órgão/unidade/setor em q',
        'Ociosidade',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelInvertido },

    { id: 'q19', key: 'expectativaEmpregabilidade', position: 19, aliases: [
        'Agora eu preciso que você me diga se DISCORDA TOTALMENTE / DISCORDA / NEUTRO / CONCORDA  OU CONCORDA TOTALMENTE com a frase abaixo:\n"Eu acredito que após terminar o meu contrato de aprendizagem minhas',
        'Expectativa de empregabilidade',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },

    // IAFA (matriz linha 13): "categoria de maior incentivo" — só o topo
    // da escala é favorável. Escala real confirmada pelo CSV: 1–4
    // ("4 - Incentiva muito" é o topo, não 5 como assumido antes de ter
    // o arquivo real).
    { id: 'q20', key: 'incentivoFamiliar', position: 20, aliases: [
        'Em relação ao Programa de Aprendizagem, o quanto sua família incentiva a sua participação?',
        'Incentivo familiar',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelApenasTopo(4) },

    { id: 'q21', key: 'satisfacaoGeral', position: 21, aliases: [
        'De um modo geral como você avalia a experiência da aprendizagem até aqui?',
        'Satisfação geral',
      ], type: 'coded', scored: true,
      isApplicable: sempreAplicavel, isFavorable: favoravelLikert },
  ],
}
