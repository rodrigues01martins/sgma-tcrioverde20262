import {
  SECOES,
  ITENS,
  FATOR_POR_STATUS,
  FAIXAS_CLASSIFICACAO,
  PARECERES,
  LIMITE_IRREGULAR,
  LIMITE_SEM_RESSALVAS,
} from './config.js'

// ============================================================
// VISITA IN LOCO — apuração e validação (funções puras)
// ============================================================
// Único lugar onde a fórmula existe. A tela usa para o resultado parcial
// do rascunho; o serviço usa na finalização, sempre recalculando a partir
// das respostas brutas — nunca a partir de um resultado salvo antes.

// (soma × 100) / n evita ruído de ponto flutuante nos limites (ex.: 18/20).
// Sem item aplicável → null ("Não aplicável"), nunca 0%.
function percentual(soma, aplicaveis) {
  return aplicaveis > 0 ? (soma * 100) / aplicaveis : null
}

function statusValido(status) {
  return Object.prototype.hasOwnProperty.call(FATOR_POR_STATUS, status)
}

export function classificarPercentual(percentualGlobal) {
  if (percentualGlobal === null || percentualGlobal === undefined) return null
  return FAIXAS_CLASSIFICACAO.find(f => percentualGlobal >= f.minimo).chave
}

// Parecer automático — regras em ordem de precedência.
export function calcularParecer({ percentualGlobal, quantidadeNaoConforme, criticosNaoConformes, criticosParciais }) {
  // Regra 1 — item crítico Não Conforme, independentemente do percentual.
  if (criticosNaoConformes > 0) return PARECERES.irregular.chave
  // Regra 2 — percentual global abaixo de 75%.
  if (percentualGlobal !== null && percentualGlobal < LIMITE_IRREGULAR) return PARECERES.irregular.chave
  // Regra 3 — ≥ 90%, nenhum Não Conforme e nenhum crítico parcial.
  if (
    percentualGlobal !== null &&
    percentualGlobal >= LIMITE_SEM_RESSALVAS &&
    quantidadeNaoConforme === 0 &&
    criticosParciais === 0
  ) return PARECERES.regular_sem_ressalvas.chave
  // Regra 4 — demais situações.
  return PARECERES.regular_com_ressalvas.chave
}

// `itens` = { item_1_1: { status, observacao }, ... }. Itens sem status
// ainda não avaliados não entram em nenhuma contagem (rascunho parcial).
export function apurarVisita(itens = {}) {
  const contagem = { conforme: 0, conforme_parcialmente: 0, nao_conforme: 0, nao_se_aplica: 0 }
  let criticosNaoConformes = 0
  let criticosParciais = 0
  let itensAvaliados = 0
  let somaGlobal = 0
  let aplicaveisGlobal = 0
  const percentuaisSecoes = {}

  for (const secao of SECOES) {
    let somaSecao = 0
    let aplicaveisSecao = 0
    for (const item of secao.itens) {
      const status = itens[item.id]?.status
      if (!statusValido(status)) continue
      itensAvaliados++
      contagem[status]++
      if (item.critico && status === 'nao_conforme') criticosNaoConformes++
      if (item.critico && status === 'conforme_parcialmente') criticosParciais++
      const fator = FATOR_POR_STATUS[status]
      if (fator === null) continue // Não se Aplica: fora do denominador
      somaSecao += fator
      aplicaveisSecao++
    }
    percentuaisSecoes[secao.id] = percentual(somaSecao, aplicaveisSecao)
    somaGlobal += somaSecao
    aplicaveisGlobal += aplicaveisSecao
  }

  // Global calculado direto sobre os itens aplicáveis — nunca pela média
  // das seções.
  const percentualGlobal = percentual(somaGlobal, aplicaveisGlobal)

  return {
    percentualGlobal,
    percentuaisSecoes,
    totalItens: ITENS.length,
    itensAvaliados,
    itensAplicaveis: aplicaveisGlobal,
    quantidadeNaoSeAplica: contagem.nao_se_aplica,
    quantidadeConforme: contagem.conforme,
    quantidadeConformeParcialmente: contagem.conforme_parcialmente,
    quantidadeNaoConforme: contagem.nao_conforme,
    criticosNaoConformes,
    criticosParciais,
    classificacao: classificarPercentual(percentualGlobal),
    parecer: calcularParecer({
      percentualGlobal,
      quantidadeNaoConforme: contagem.nao_conforme,
      criticosNaoConformes,
      criticosParciais,
    }),
  }
}

// ------------------------------------------------------------
// Validação — só impeditiva na finalização; o rascunho aceita tudo.
// ------------------------------------------------------------
function dataValida(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

function horaValida(hhmm) {
  return typeof hhmm === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)
}

const preenchido = v => typeof v === 'string' && v.trim().length > 0

export function prazoValido(prazo) {
  return Number.isInteger(prazo) && prazo > 0
}

// Hora de término anterior à de início (só quando as duas são válidas).
export function horarioInvertido(horaInicio, horaTermino) {
  return horaValida(horaInicio) && horaValida(horaTermino) && horaTermino < horaInicio
}

// Retorna a lista de pendências: [{ campo, mensagem }]. Vazia = pode finalizar.
export function validarFinalizacao({ visita = {}, vistoriador, itens = {}, conclusao = {} }) {
  const erros = []
  if (!dataValida(visita.data)) erros.push({ campo: 'data', mensagem: 'Informe uma data válida.' })
  if (!horaValida(visita.horaInicio)) erros.push({ campo: 'horaInicio', mensagem: 'Informe a hora de início.' })
  if (!horaValida(visita.horaTermino)) erros.push({ campo: 'horaTermino', mensagem: 'Informe a hora de término.' })
  if (horarioInvertido(visita.horaInicio, visita.horaTermino)) {
    erros.push({ campo: 'horaTermino', mensagem: 'A hora de término não pode ser anterior à hora de início.' })
  }
  if (!vistoriador?.uid || !preenchido(vistoriador?.nome)) {
    erros.push({ campo: 'vistoriador', mensagem: 'Identificação do vistoriador ausente.' })
  }
  if (!preenchido(visita.representanteOsc)) {
    erros.push({ campo: 'representanteOsc', mensagem: 'Informe o nome do representante da OSC.' })
  }
  for (const item of ITENS) {
    const r = itens[item.id]
    if (!statusValido(r?.status)) {
      erros.push({ campo: `${item.id}.status`, mensagem: `Item ${item.criterio}: selecione o status.` })
    }
    if (!preenchido(r?.observacao)) {
      erros.push({
        campo: `${item.id}.observacao`,
        mensagem: r?.status === 'nao_se_aplica'
          ? `Item ${item.criterio}: justifique a não aplicabilidade na observação.`
          : `Item ${item.criterio}: preencha a observação.`,
      })
    }
  }
  if (!preenchido(conclusao.resumoAchados)) erros.push({ campo: 'resumoAchados', mensagem: 'Preencha o resumo dos achados.' })
  if (!preenchido(conclusao.recomendacoes)) erros.push({ campo: 'recomendacoes', mensagem: 'Preencha as recomendações / notificações / saneamento.' })
  if (!prazoValido(conclusao.prazoSaneamentoDias)) {
    erros.push({ campo: 'prazoSaneamentoDias', mensagem: 'Informe o prazo de saneamento em dias (número inteiro positivo).' })
  }
  return erros
}
