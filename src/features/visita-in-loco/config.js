// ============================================================
// VISITA IN LOCO — fonte central de configuração do instrumento
// ============================================================
// Tudo o que define o instrumento vive aqui e em nenhum outro lugar:
// metadados institucionais, seções, itens, criticidade, opções de status
// com seus fatores, faixas de classificação e pareceres. O cálculo
// (apuracao.js), a persistência (visitaInLocoService.js) e a tela
// importam daqui — nenhuma regra é repetida em componente.
//
// Arquivo JS puro (sem React/Firebase) para poder ser importado também
// pelos testes da fórmula (node --test).

// Metadados institucionais — carregados automaticamente e gravados no
// registro de cada visita como snapshot histórico (campo `identificacao`).
export const IDENTIFICACAO_INSTRUMENTO = {
  instrumento: 'Termo de Colaboração nº 02/2026 - SEDS/GO',
  processoSei: '202610319000985',
  unidade: 'CASER Rio Verde',
  orgaoConcedente: 'Secretaria de Estado de Desenvolvimento Social (SEDS)',
  oscParceira: 'Fundação de Apoio ao Menor Inhumense (FAMI)',
  objeto: 'Execução, em caráter emergencial, das atividades indispensáveis à implantação e operação do Centro de Atendimento Socioeducativo Regional - CASER Rio Verde.',
}

export const ROTULOS_IDENTIFICACAO = [
  ['instrumento', 'Instrumento'],
  ['processoSei', 'Processo SEI'],
  ['unidade', 'Unidade'],
  ['orgaoConcedente', 'Órgão Concedente'],
  ['oscParceira', 'OSC Parceira'],
  ['objeto', 'Objeto'],
]

// Status de conformidade de cada item. `fator: null` = excluído do
// denominador (nunca tratado como zero).
export const STATUS_ITEM = [
  { valor: 'conforme', label: 'Conforme', fator: 1, variant: 'success' },
  { valor: 'nao_conforme', label: 'Não Conforme', fator: 0, variant: 'danger' },
  { valor: 'conforme_parcialmente', label: 'Conforme Parcialmente', fator: 0.5, variant: 'warning' },
  { valor: 'nao_se_aplica', label: 'Não se Aplica', fator: null, variant: 'neutral' },
]

export const FATOR_POR_STATUS = Object.fromEntries(STATUS_ITEM.map(s => [s.valor, s.fator]))
export const STATUS_POR_VALOR = Object.fromEntries(STATUS_ITEM.map(s => [s.valor, s]))

export const STATUS_VISITA = {
  rascunho: { valor: 'rascunho', label: 'Rascunho', variant: 'warning' },
  finalizada: { valor: 'finalizada', label: 'Finalizada', variant: 'success' },
}

export const SECOES = [
  {
    id: 'secao_1',
    numero: 1,
    titulo: 'Recursos Humanos e Equipe Técnica Mínima',
    itens: [
      { id: 'item_1_1', critico: true, criterio: 'Composição do quadro de pessoal', descricao: 'Aferir a presença efetiva dos profissionais exigidos para a operação (segurança socioeducativa, equipe técnica psicossocial, equipe de saúde e área administrativa) compatíveis com a rubrica de pessoal (Itens 2.2.4.21 e 2.2.5.22).' },
      { id: 'item_1_2', critico: false, criterio: 'Controle de frequência e escalas', descricao: 'Checar os registros de ponto (físico ou eletrônico), escalas de plantão e cumprimento da carga horária contratada.' },
    ],
  },
  {
    id: 'secao_2',
    numero: 2,
    titulo: 'Rotinas e Atendimento Socioeducativo aos Adolescentes',
    itens: [
      { id: 'item_2_1', critico: false, criterio: 'Execução das rotinas diárias', descricao: 'Constatar a realização e o registro das atividades socioeducativas mínimas obrigatórias: atendimento técnico, escolarização, oficinas e rotinas pedagógicas (Cláusula Primeira, Subcláusula única).' },
      { id: 'item_2_2', critico: false, criterio: 'Atividades de lazer e esporte', descricao: 'Inspecionar a utilização e estado de conservação dos materiais esportivos adquiridos com recursos da parceria (Item 1.1.1.5).' },
      { id: 'item_2_3', critico: false, criterio: 'Prontuários e sigilo (LGPD)', descricao: 'Verificar a organização dos prontuários técnicos e relatórios de evolução socioeducativa individual dos adolescentes, avaliando as medidas de salvaguarda e confidencialidade documental (Cláusula Décima).' },
    ],
  },
  {
    id: 'secao_3',
    numero: 3,
    titulo: 'Alimentação, Higiene e Condições de Habitação',
    itens: [
      { id: 'item_3_1', critico: true, criterio: 'Fornecimento de refeições', descricao: 'Inspecionar a pontualidade, qualidade, balanceamento nutricional e conformidade da entrega de refeições prontas pela contratada terceirizada (Item 2.1.2.9), incluindo mapa diário de refeições servidas.' },
      { id: 'item_3_2', critico: false, criterio: 'Gêneros e insumos alimentícios locais', descricao: 'Checar condições de armazenamento, validade e controle de estoque de gêneros alimentícios complementares (Item 1.1.1.4).' },
      { id: 'item_3_3', critico: true, criterio: 'Higiene pessoal dos socioeducandos', descricao: 'Verificar o fornecimento regular e suficiência dos kits de higiene pessoal (sabonete, pasta dental, xampu, desodorante etc.) (Item 1.1.1.3).' },
      { id: 'item_3_4', critico: false, criterio: 'Enxoval e vestuário', descricao: 'Aferir a disponibilidade, estado de conservação e distribuição individual de roupas, calçados/uniformes e roupas de cama/banho (Item 1.1.1.6).' },
      { id: 'item_3_5', critico: false, criterio: 'Limpeza e sanitização predial', descricao: 'Avaliar as condições sanitárias das alas, alojamentos, banheiros e áreas comuns, bem como o estoque e emprego de materiais de limpeza (Item 1.1.1.2).' },
    ],
  },
  {
    id: 'secao_4',
    numero: 4,
    titulo: 'Saúde Básica e Assistência Farmacêutica',
    itens: [
      { id: 'item_4_1', critico: true, criterio: 'Disponibilidade e guarda de medicamentos', descricao: 'Conferir o armário/farmácia da unidade quanto ao acondicionamento adequado, controle de validade e registros de dispensação de medicamentos e insumos de enfermagem (Item 2.1.2.19).' },
      { id: 'item_4_2', critico: true, criterio: 'Atendimento em saúde', descricao: 'Checar livros de registro de atendimentos de enfermagem/médicos e a rotina de encaminhamentos externos (Item 2.1.2.12).' },
    ],
  },
  {
    id: 'secao_5',
    numero: 5,
    titulo: 'Segurança Institucional, Vigilância e Instalações Prediais',
    itens: [
      { id: 'item_5_1', critico: true, criterio: 'Serviço de vigilância armada', descricao: 'Conferir a presença efetiva do posto de vigilância privada armada nos moldes contratados e livro de ocorrências da guarnição (Item 2.1.2.15).' },
      { id: 'item_5_2', critico: true, criterio: 'Circuito Fechado de TV (CFTV)', descricao: 'Inspecionar o funcionamento das câmeras de videomonitoramento, central de gravação/monitores, integridade dos cabos e cobertura dos pontos críticos de segurança (Item 2.1.2.13).' },
      { id: 'item_5_3', critico: true, criterio: 'Segurança contra incêndio e pânico', descricao: 'Checar a validade das cargas dos extintores de incêndio, sinalização de emergência, desobstrução das saídas de emergência e condições dos equipamentos de proteção coletiva (Item 2.1.2.11).' },
      { id: 'item_5_4', critico: true, criterio: 'Manutenção predial', descricao: 'Vistoriar instalações elétricas, hidráulicas, travas, trancas e gradis, verificando a execução de manutenções corretivas/preventivas registradas (Itens 1.1.1.7 e 2.1.2.8).' },
    ],
  },
  {
    id: 'secao_6',
    numero: 6,
    titulo: 'Logística, Frotas e Infraestrutura Administrativa',
    itens: [
      { id: 'item_6_1', critico: false, criterio: 'Locação de veículos', descricao: 'Conferir os veículos disponibilizados no local (Item 2.1.2.10), conferindo estado de uso, documentação e diário de bordo (quilometragem, itinerários e motorista).' },
      { id: 'item_6_2', critico: false, criterio: 'Combustíveis e lubrificantes', descricao: 'Aferir o controle de requisição de abastecimento e o nexo com os deslocamentos dos veículos vinculados à unidade (Item 2.1.1.17).' },
      { id: 'item_6_3', critico: false, criterio: 'Telecomunicações e conectividade', descricao: 'Verificar o funcionamento dos links de internet e telefonia para a operação das equipes e comunicação oficial (Item 2.1.2.20).' },
      { id: 'item_6_4', critico: false, criterio: 'Materiais de expediente e TI', descricao: 'Conferir o suporte de tecnologia da informação e a disponibilidade de suprimentos administrativos indispensáveis para a continuidade do serviço (Itens 1.1.1.1 e 2.1.2.14).' },
    ],
  },
  {
    id: 'secao_7',
    numero: 7,
    titulo: 'Gestão Patrimonial e Guarda de Bens',
    itens: [
      { id: 'item_7_1', critico: false, criterio: 'Tombamento e identificação', descricao: 'Verificar se os bens permanentes adquiridos ou cedidos pelo Estado estão devidamente identificados/etiquetados com plaquetas de patrimônio público (Cláusula Oitava, XVII; Cláusula Décima Quinta).' },
      { id: 'item_7_2', critico: false, criterio: 'Inventário físico e estado de conservação', descricao: 'Realizar a checagem por amostragem entre o inventário patrimonial da unidade e a localização/conservação física dos bens (Cláusula Oitava, XI).' },
    ],
  },
]

// Lista achatada: id, seção, critério, descrição e criticidade de cada item.
export const ITENS = SECOES.flatMap(s => s.itens.map(i => ({ ...i, secaoId: s.id })))

// Classificação quantitativa (informativa). Avaliada de cima para baixo.
export const FAIXAS_CLASSIFICACAO = [
  { chave: 'conforme', minimo: 90, label: 'Conforme', variant: 'success' },
  { chave: 'satisfatoria_com_ressalvas', minimo: 75, label: 'Conformidade satisfatória com ressalvas', variant: 'info' },
  { chave: 'parcial', minimo: 60, label: 'Conformidade parcial — requer saneamento', variant: 'warning' },
  { chave: 'nao_conforme', minimo: -Infinity, label: 'Não conforme — requer providências prioritárias', variant: 'danger' },
]

export const PARECERES = {
  regular_sem_ressalvas: { chave: 'regular_sem_ressalvas', label: 'Regular sem Ressalvas', variant: 'success' },
  regular_com_ressalvas: { chave: 'regular_com_ressalvas', label: 'Regular com Ressalvas/Recomendações', variant: 'warning' },
  irregular: { chave: 'irregular', label: 'Irregular com Necessidade de Providências Imediatas', variant: 'danger' },
}

// Limites do parecer automático (ver calcularParecer em apuracao.js).
export const LIMITE_IRREGULAR = 75
export const LIMITE_SEM_RESSALVAS = 90
