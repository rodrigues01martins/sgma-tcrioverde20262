// ============================================================
// NORMALIZAÇÃO DE CABEÇALHOS — CSV exportado do Microsoft Forms
// ============================================================
// Regras da manutenção (seção 18): trim, NBSP, CR/LF, `_x000D_` (o Forms
// às vezes exporta quebras de linha dentro do próprio cabeçalho como essa
// sequência literal), sem fuzzy matching agressivo — comparação é sempre
// por igualdade exata após normalização, nunca por similaridade.
export function normalizeHeaderText(raw) {
  if (raw == null) return ''
  return String(raw)
    .replace(/_x000D_/gi, ' ')
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/ /g, ' ') // NBSP
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// ------------------------------------------------------------
// METADADOS AUTOMÁTICOS DO MICROSOFT FORMS (seção 9-10)
// ------------------------------------------------------------
// `obrigatorio: false` para "Hora da última modificação" e "Hora de
// início" — a ausência delas não pode quebrar o reconhecimento do
// instrumento (seção 9).
export const METADATA_FIELDS = [
  { key: 'sourceResponseId', obrigatorio: true, aliases: ['id'] },
  { key: 'startedAt', obrigatorio: false, aliases: ['hora de início', 'hora de inicio'] },
  { key: 'completedAt', obrigatorio: true, aliases: ['hora de conclusão', 'hora de conclusao'] },
  { key: 'lastModifiedAt', obrigatorio: false, aliases: ['hora da última modificação', 'hora da ultima modificacao'] },
  // Reconhecidos para serem DESCARTADOS (seção 10/36) — nunca usados em
  // cálculo, nunca persistidos no dataset analítico.
  { key: 'formsEmail', obrigatorio: false, descartar: true, aliases: ['email'] },
  { key: 'formsNome', obrigatorio: false, descartar: true, aliases: ['nome'] },
]

const METADATA_INDEX = new Map()
METADATA_FIELDS.forEach(campo => {
  campo.aliases.forEach(alias => METADATA_INDEX.set(normalizeHeaderText(alias), campo))
})

export function matchMetadataField(rawHeader) {
  return METADATA_INDEX.get(normalizeHeaderText(rawHeader)) || null
}

// ------------------------------------------------------------
// Índice de aliases das questões de um schema — construído uma vez por
// schema, usado para mapear cada coluna do CSV ao id técnico da questão.
// Comparação exata (normalizada), nunca aproximada (seção 18/91).
// ------------------------------------------------------------
export function buildQuestionAliasIndex(schema) {
  const indice = new Map()
  schema.questions.forEach(questao => {
    questao.aliases.forEach(alias => {
      indice.set(normalizeHeaderText(alias), questao)
    })
  })
  return indice
}

export function matchQuestionHeader(rawHeader, aliasIndex) {
  return aliasIndex.get(normalizeHeaderText(rawHeader)) || null
}
