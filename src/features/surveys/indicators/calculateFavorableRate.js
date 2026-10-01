// ============================================================
// HELPER BASE DE FAVORABILIDADE (seção 48) + RESULTADO PADRÃO (seção 49)
// ============================================================
// Camada independente de UI (seção 47) — nenhum componente React calcula
// fórmula diretamente, todos consomem o resultado já pronto daqui.

function isValidCode(codigo) {
  return typeof codigo === 'number' && Number.isFinite(codigo)
}

// Forma "crua": uma lista de códigos + os três predicados (seção 48).
export function calculateFavorableRate({ responses, isApplicable, isValid = isValidCode, isFavorable }) {
  let numerator = 0, denominator = 0, naCount = 0, invalidCount = 0
  responses.forEach(codigo => {
    if (!isValid(codigo)) { invalidCount++; return }
    if (!isApplicable(codigo)) { naCount++; return }
    denominator++
    if (isFavorable(codigo)) numerator++
  })
  return {
    numerator, denominator,
    value: denominator > 0 ? (numerator / denominator) * 100 : null,
    naCount, invalidCount,
  }
}

// Forma "multi-questão": pool de várias questões num único indicador
// (ex.: IQPF = Q8+Q9), cada uma com o SEU PRÓPRIO isApplicable/
// isFavorable — nunca assume que todas as perguntas de um indicador
// composto compartilham a mesma regra (seção 28: cada questão define sua
// própria semântica).
export function calculateFavorableRateFromQuestions(docs, questoes, obterCodigo) {
  let numerator = 0, denominator = 0, naCount = 0, invalidCount = 0
  docs.forEach(documento => {
    questoes.forEach(questao => {
      const codigo = obterCodigo(documento, questao.id)
      if (!isValidCode(codigo)) { invalidCount++; return }
      if (!questao.isApplicable(codigo)) { naCount++; return }
      denominator++
      if (questao.isFavorable(codigo)) numerator++
    })
  })
  return { numerator, denominator, value: denominator > 0 ? (numerator / denominator) * 100 : null, naCount, invalidCount }
}

// Distribuição bruta das alternativas das questões que compõem um
// indicador (seção 75 — "distribuição das alternativas" no
// detalhamento). Não filtra por aplicabilidade/validade: mostra
// exatamente o que foi respondido, código a código.
export function computeAnswerDistribution(docs, questionIds, obterCodigo) {
  const distribuicao = new Map()
  docs.forEach(documento => {
    questionIds.forEach(id => {
      const codigo = obterCodigo(documento, id)
      if (!isValidCode(codigo)) return
      distribuicao.set(codigo, (distribuicao.get(codigo) || 0) + 1)
    })
  })
  return [...distribuicao.entries()].sort((a, b) => a[0] - b[0]).map(([codigo, quantidade]) => ({ codigo, quantidade }))
}

const COMPARADORES_META = {
  '>=': (valor, meta) => valor >= meta,
  '<=': (valor, meta) => valor <= meta,
}

// Estrutura padrão do indicador (seção 49) — nunca assume que
// "maior = melhor" (seção 50): o operador vem sempre explícito da matriz.
export function buildIndicatorResult({ code, name, definition, target, targetOperator, rate }) {
  const comparador = COMPARADORES_META[targetOperator]
  if (!comparador) throw new Error(`targetOperator desconhecido: ${targetOperator}`)
  return {
    code,
    name,
    definition,
    value: rate.value,
    numerator: rate.numerator,
    denominator: rate.denominator,
    naCount: rate.naCount,
    invalidCount: rate.invalidCount,
    target,
    targetOperator,
    targetMet: rate.value === null ? null : comparador(rate.value, target),
  }
}
