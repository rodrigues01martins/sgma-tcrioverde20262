// ============================================================
// HELPERS COMPARTILHADOS PELOS 4 SCHEMAS DE PESQUISA
// ============================================================

// Extrai o código numérico de alternativas como "5 - CONCORDO TOTALMENTE"
// ou "3 - Sempre consigo acessar" (seção 25/26). Retorna `null` quando o
// valor não é uma alternativa codificada (string vazia, texto livre) —
// NUNCA confundir com 0, que é um código real em várias questões (seção
// 27). `undefined` continua reservado para "coluna ausente do documento".
export function extractNumericCode(valorBruto) {
  if (valorBruto === null || valorBruto === undefined) return null
  const texto = String(valorBruto).trim()
  if (texto === '') return null
  const match = texto.match(/^(-?\d+)/)
  if (!match) return null
  return parseInt(match[1], 10)
}

// Um código é "válido" para fins de denominador quando é um número
// finito — distingue explicitamente de null/undefined/NaN (seção 27).
export function isValidCode(codigo) {
  return typeof codigo === 'number' && Number.isFinite(codigo)
}

// ------------------------------------------------------------
// FÁBRICAS DE PREDICADOS — isApplicable/isFavorable por questão.
// Cada questão do schema compõe as suas próprias regras a partir destas
// fábricas; não existe regra global de favorabilidade (seção 28/35).
// ------------------------------------------------------------

// Regra padrão do projeto para escalas Likert 1–5: favorável é 4 ou 5.
export const favoravelLikert = (codigo) => codigo === 4 || codigo === 5

// Escala invertida (ex.: Aprendiz Q18 — Ociosidade): favorável é 1 ou 2.
export const favoravelInvertido = (codigo) => codigo === 1 || codigo === 2

// "Categoria de maior incentivo/importância": só o valor mais alto da
// escala conta como favorável — não a faixa 4-ou-5 (seções 13/31 da
// matriz: IAFA e IAFE). Assumido Likert 1–5 (decisão explícita, ver
// relatório final — sem o instrumento real, o topo assumido é 5).
export const favoravelApenasTopo = (topo = 5) => (codigo) => codigo === topo

// Um conjunto fixo de códigos favoráveis (categorias sem escala Likert,
// ex.: TIP, TFET, TCE, IAAP — todas usam opções numeradas específicas da
// matriz, não uma faixa Likert).
export const favoravelEntre = (...codigos) => {
  const set = new Set(codigos)
  return (codigo) => set.has(codigo)
}

// Sempre aplicável — a maioria das questões não tem exclusão condicional.
export const sempreAplicavel = () => true

// Exclui um código específico do denominador (ex.: 0 = "nunca precisei
// falar com a RENAPSI", 0 = "nunca tive acesso ao conteúdo EAD"). Usado
// pelas regras especiais das seções 30-33.
export const excluirCodigo = (codigoExcluido) => (codigo) => codigo !== codigoExcluido

// Extrai o código numérico normalmente, mas trata como código 0 as
// variantes textuais de "nunca precisei/nunca precisa" que aparecem SEM
// prefixo numérico no CSV real de Mentor (diferente de Aprendiz/
// Responsável, cuja mesma pergunta de atendimento já vem como
// "0 - Nunca precisei..."). Mesmo sentinela de N/A da seção 33 — só
// muda a forma como o texto chega no arquivo real deste instrumento.
export function extrairCodigoComFallbackNuncaPrecisei(valorBruto) {
  const codigo = extractNumericCode(valorBruto)
  if (codigo !== null) return codigo
  const texto = String(valorBruto ?? '').trim().toLowerCase()
  if (texto.startsWith('nunca precis')) return 0
  return null
}
