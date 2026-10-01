import { calculateFavorableRateFromQuestions, buildIndicatorResult } from './calculateFavorableRate'

// ============================================================
// FÁBRICA COMUM DE INDICADORES POR INSTRUMENTO
// ============================================================
// Cada indicador é definido como {code, name, definition, questionIds,
// target, targetOperator, overrides?}. As regras isApplicable/isFavorable
// de cada questão vêm SEMPRE do schema (fonte única — nunca duplicadas
// aqui), exceto quando `overrides` está presente: necessário só para
// questões que servem a mais de um indicador com favorabilidades
// diferentes (ex.: Egresso Q5 alimenta TIP e TFET com conjuntos de
// códigos opostos — ver graduateIndicators.js).
function resolverQuestoes(schema, def) {
  return def.questionIds.map(id => {
    const questaoSchema = schema.questions.find(q => q.id === id)
    if (!questaoSchema) throw new Error(`Questão ${id} não existe no schema ${schema.surveyType}`)
    const override = def.overrides?.[id]
    const isApplicable = override?.isApplicable || questaoSchema.isApplicable
    const isFavorable = override?.isFavorable || questaoSchema.isFavorable
    if (!isApplicable || !isFavorable) {
      throw new Error(`Questão ${id} (indicador ${def.code}) não tem isApplicable/isFavorable definidos nem no schema nem em overrides`)
    }
    return { id, isApplicable, isFavorable }
  })
}

function obterCodigo(documento, questionId) {
  return documento.answers ? documento.answers[questionId] : undefined
}

export function criarIndicadoresInstrumento(schema, definicoes) {
  return definicoes.map(def => {
    const questoes = resolverQuestoes(schema, def)
    return {
      code: def.code,
      name: def.name,
      definition: def.definition,
      target: def.target,
      targetOperator: def.targetOperator,
      // Exposto para o detalhamento (seção 75) poder mostrar a
      // distribuição das alternativas das mesmas questões, sem precisar
      // de uma segunda fonte de verdade sobre quais Qs compõem o indicador.
      questionIds: def.questionIds,
      calcular(docs) {
        const rate = calculateFavorableRateFromQuestions(docs, questoes, obterCodigo)
        return buildIndicatorResult({ code: def.code, name: def.name, definition: def.definition, target: def.target, targetOperator: def.targetOperator, rate })
      },
    }
  })
}

export function calcularTodosIndicadores(indicadores, docs) {
  return indicadores.reduce((acc, indicador) => {
    acc[indicador.code] = indicador.calcular(docs)
    return acc
  }, {})
}
