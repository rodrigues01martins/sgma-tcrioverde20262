import { db } from '../firebase'
import { collection, addDoc, updateDoc, getDocs, doc, getDoc } from 'firebase/firestore'
import { OPCOES_PONTUACAO, classificarLocal, classificarRedeISLA, calcularSemestre } from './inLocoService'

// ============================================================
// VISITA IN LOCO – PRÁTICA — configuração e cálculo
// ============================================================
// Instrumento independente da Visita In Loco – Teórica (inLocoService.js):
// avalia o estabelecimento onde o aprendiz executa a atividade prática de
// aprendizagem, não o ambiente de formação teórica. IDs, coleção e
// documentos são inteiramente próprios — nenhum dado ou identificador é
// compartilhado com a Teórica. A escala de pontuação (OPCOES_PONTUACAO),
// as faixas de classificação (classificarLocal/classificarRedeISLA) e o
// cálculo de semestre são genéricos e por isso reaproveitados direto da
// Teórica, sem duplicar.
export { OPCOES_PONTUACAO, classificarLocal, classificarRedeISLA, calcularSemestre }

export const BLOCOS_PRATICA = [
  {
    id: 'bloco_pratica_1',
    titulo: 'Localização, Entorno e Mobilidade Urbana',
    objetivo: 'Avaliar se o deslocamento até o posto de trabalho prático é seguro e viável.',
    maxPontos: 6,
    itens: [
      { id: 'item_pratica_1_1', label: 'Proximidade de transporte público', descricao: 'O estabelecimento está situado a uma distância caminhável e segura (idealmente até 500 metros) de pontos de ônibus, estações de transporte público ou conta com acesso seguro a pé/ciclovia?' },
      { id: 'item_pratica_1_2', label: 'Segurança no trajeto imediato', descricao: 'O trajeto a pé até o local de trabalho conta com calçadas regulares, iluminação pública e travessias seguras (faixas de pedestres, semáforos ou passarelas)?' },
      { id: 'item_pratica_1_3', label: 'Identificação visual na fachada', descricao: 'O prédio possui identificação externa clara (placa, fachada, número visível), facilitando a localização pelo aprendiz, responsáveis e serviços de emergência?' },
    ],
  },
  {
    id: 'bloco_pratica_2',
    titulo: 'Acessibilidade e Desenho Universal',
    objetivo: 'Garantir inclusão e mobilidade para aprendizes com deficiência no local da prática.',
    maxPontos: 10,
    itens: [
      { id: 'item_pratica_2_1', label: 'Acesso da via pública ao imóvel', descricao: 'O acesso da calçada até a entrada principal é livre de degraus isolados ou possui rampa com inclinação adequada, corrimão e piso tátil?' },
      { id: 'item_pratica_2_2', label: 'Circulação interna horizontal e vertical', descricao: 'Corredores, portas e passagens até o setor de trabalho possuem largura livre mínima para passagem de cadeirantes?' },
      { id: 'item_pratica_2_3', label: 'Múltiplos pavimentos', descricao: 'Em caso de mais de um pavimento, o prédio dispõe de rampa acessível ou elevador funcional?', autoTerreoPontos: 2 },
      { id: 'item_pratica_2_4', label: 'Sanitários acessíveis', descricao: 'Há ao menos um sanitário adaptado para pessoas com deficiência (PCD) com barras de apoio e espaço de giro adequado?' },
      { id: 'item_pratica_2_5', label: 'Acessibilidade sensorial', descricao: 'O imóvel dispõe de sinalização visual e tátil (placas com relevo/braille) identificando setores, banheiros e saídas de emergência?' },
    ],
  },
  {
    id: 'bloco_pratica_3',
    titulo: 'Estrutura Física, Conforto Ambiental e Segurança',
    objetivo: 'Assegurar salubridade, integridade física e conforto no posto de trabalho.',
    maxPontos: 16,
    itens: [
      { id: 'item_pratica_3_1', label: 'Regularidade contra incêndio e pânico', descricao: 'O local possui extintores sinalizados e dentro da validade, rotas de fuga desobstruídas e iluminação de emergência?' },
      { id: 'item_pratica_3_2', label: 'Controle de acessos e salvaguardas', descricao: 'Há portaria, recepção ou controle de identificação na entrada que restrinja o acesso de pessoas não autorizadas aos ambientes de trabalho?' },
      { id: 'item_pratica_3_3', label: 'Salubridade dos postos de trabalho', descricao: 'Os ambientes onde os aprendizes executam suas atividades contam com ventilação/climatização adequada e níveis adequados de iluminação (sem lâmpadas queimadas ou ofuscamento)?' },
      { id: 'item_pratica_3_4', label: 'Ergonomia do mobiliário', descricao: 'As cadeiras, mesas e bancadas de trabalho são confortáveis, reguláveis e permitem postura correta (apoio para coluna e pés, sem cantos vivos ou improvisos)?' },
      { id: 'item_pratica_3_5', label: 'Segurança elétrica e predial', descricao: "Instalações elétricas totalmente embutidas ou canalizadas, sem fiações desencapadas, extensões improvisadas ('gambiarras') ou tomadas danificadas?" },
      { id: 'item_pratica_3_6', label: 'Condições estruturais do imóvel', descricao: 'O setor de trabalho está livre de rachaduras graves, infiltrações, goteiras, mofo e descascamento de pintura?' },
      { id: 'item_pratica_3_7', label: 'Hidratação', descricao: 'Há bebedouros ou purificadores de água higienizados, em quantidade suficiente, com laudo de troca de filtro em dia e copos/garrafas disponíveis?' },
      { id: 'item_pratica_3_8', label: 'Higiene dos banheiros', descricao: 'Os sanitários de uso dos aprendizes estão higienizados e contam com abastecimento contínuo de papel higiênico, sabonete líquido e toalhas de papel?' },
    ],
  },
  {
    id: 'bloco_pratica_4',
    titulo: 'Salvaguarda do Aprendiz, Supervisão e Condições da Prática',
    objetivo: 'Verificar a conformidade da prática profissional com a legislação de proteção ao adolescente trabalhador.',
    maxPontos: 10,
    itens: [
      { id: 'item_pratica_4_1', label: 'Supervisão e mentoria no local', descricao: 'Há mentor ou supervisor formalmente designado presente no setor, prestando orientação contínua e acompanhamento diário ao jovem?' },
      { id: 'item_pratica_4_2', label: 'Inexistência de periculosidade ou insalubridade', descricao: 'O ambiente de atuação do aprendiz é comprovadamente livre de riscos químicos, biológicos, físicos excessivos ou tarefas perigosas (vedadas a menores de 18 anos)?' },
      { id: 'item_pratica_4_3', label: 'Adequação do posto e equipamentos de trabalho', descricao: 'O jovem possui estação de trabalho e ferramentas necessárias (computador, telefone institucional ou materiais específicos) para exercer suas funções práticas sem ociosidade?' },
      { id: 'item_pratica_4_4', label: 'Espaço para alimentação e descanso', descricao: 'O local disponibiliza copa/refeitório higienizado e equipado para que o jovem possa realizar suas refeições e intervalos de descanso com dignidade?' },
      { id: 'item_pratica_4_5', label: 'Conformidade com o plano de aprendizagem', descricao: 'As tarefas executadas na rotina diária condizem com a matriz pedagógica do curso, sem desvio para atividades pesadas ou estritamente operacionais de limpeza/serviços gerais/portaria/cozinha?' },
    ],
  },
]

export const TODOS_ITENS_PRATICA = BLOCOS_PRATICA.flatMap(b => b.itens.map(i => ({ ...i, blocoId: b.id })))
export const PONTUACAO_MAXIMA_PRATICA = BLOCOS_PRATICA.reduce((s, b) => s + b.maxPontos, 0) // 42

if (TODOS_ITENS_PRATICA.length !== 21) {
  throw new Error(`Configuração da Visita In Loco – Prática corrompida: esperado 21 itens, encontrado ${TODOS_ITENS_PRATICA.length}.`)
}

// Item com marcação de "estritamente térreo" (mesma regra da Teórica,
// generalizada por config em vez de id hardcoded — hoje só existe um
// item com essa flag, mas a busca é sobre TODOS_ITENS_PRATICA para não
// depender de posição/id fixo).
export const ITEM_TERREO_ID = TODOS_ITENS_PRATICA.find(i => i.autoTerreoPontos != null)?.id || null

// ------------------------------------------------------------
// PONTUAÇÃO — mesma fórmula genérica da Teórica (pontos ÷ máximo × 100),
// aplicada aos blocos/itens Práticos. Nenhum peso, meta ou threshold novo.
// ------------------------------------------------------------
export function calcularPontuacaoPratica(respostas) {
  const porBloco = {}
  let pontuacaoTotal = 0

  BLOCOS_PRATICA.forEach(bloco => {
    const pontosBloco = bloco.itens.reduce((s, item) => {
      const r = respostas[item.id]
      const pontos = r && typeof r.pontuacao === 'number' ? r.pontuacao : 0
      return s + pontos
    }, 0)
    porBloco[bloco.id] = pontosBloco
    pontuacaoTotal += pontosBloco
  })

  const icl = PONTUACAO_MAXIMA_PRATICA > 0 ? (pontuacaoTotal / PONTUACAO_MAXIMA_PRATICA) * 100 : 0

  return {
    pontuacaoBloco1: porBloco.bloco_pratica_1 || 0,
    pontuacaoBloco2: porBloco.bloco_pratica_2 || 0,
    pontuacaoBloco3: porBloco.bloco_pratica_3 || 0,
    pontuacaoBloco4: porBloco.bloco_pratica_4 || 0,
    pontuacaoTotal,
    icl,
    classificacao: classificarLocal(icl),
  }
}

// Valida se todos os 21 itens foram respondidos (obrigatório para enviar).
// Mesma regra crítica da Teórica: 0 é resposta válida, só null/undefined
// conta como "não respondido".
export function validarRespostasCompletasPratica(respostas) {
  return TODOS_ITENS_PRATICA.every(item => {
    const r = respostas[item.id]
    return r && typeof r.pontuacao === 'number'
  })
}

// ------------------------------------------------------------
// PERSISTÊNCIA — coleção própria, independente de visitas_inloco.
// ------------------------------------------------------------
const COLECAO = 'visitas_inloco_pratica'

export async function criarRascunhoVisitaPratica(visita, { uid, email }) {
  const calculo = calcularPontuacaoPratica(visita.respostas)
  const agora = new Date().toISOString()
  const doc_ = {
    ...visita,
    ...calculo,
    status: 'rascunho',
    criadoEm: agora,
    atualizadoEm: agora,
    criadoPorUid: uid || null,
    criadoPorEmail: email || null,
  }
  const ref = await addDoc(collection(db, COLECAO), doc_)
  return ref.id
}

export async function atualizarRascunhoVisitaPratica(id, visita) {
  const calculo = calcularPontuacaoPratica(visita.respostas)
  await updateDoc(doc(db, COLECAO, id), {
    ...visita,
    ...calculo,
    atualizadoEm: new Date().toISOString(),
  })
}

export async function enviarVisitaPratica(id, visita, { uid, email }) {
  const calculo = calcularPontuacaoPratica(visita.respostas)
  const agora = new Date().toISOString()
  if (id) {
    await updateDoc(doc(db, COLECAO, id), {
      ...visita,
      ...calculo,
      status: 'enviada',
      atualizadoEm: agora,
    })
    return id
  }
  const ref = await addDoc(collection(db, COLECAO), {
    ...visita,
    ...calculo,
    status: 'enviada',
    criadoEm: agora,
    atualizadoEm: agora,
    criadoPorUid: uid || null,
    criadoPorEmail: email || null,
  })
  return ref.id
}

export async function buscarTodasVisitasPratica() {
  const snap = await getDocs(collection(db, COLECAO))
  const visitas = []
  snap.forEach(d => visitas.push({ id: d.id, ...d.data() }))
  return visitas
}

export async function buscarVisitaPraticaPorId(id) {
  const ref = doc(db, COLECAO, id)
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
