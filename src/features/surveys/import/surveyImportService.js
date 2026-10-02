import { parseCSVCompleto } from '../../../services/csvService'
import { validarArquivo } from '../../../services/uploadValidationService'
import { validarEstruturaCsv } from './validateCsv'
import { normalizarLinhas } from './normalizeRows'
import { classificarImportacao } from './classifyImport'
import { buscarRespostas, confirmarImportacaoPesquisa, buscarUltimaImportacao, contarRespostas } from './surveyFirestoreService'

// ============================================================
// ORQUESTRAÇÃO DA IMPORTAÇÃO — usado pela UI (SurveyCsvDropzone)
// ============================================================
// Reaproveita conceitualmente o fluxo SELECIONAR → VALIDAR → REVISAR →
// CONFIRMAR → IMPORTAR (seção 8), com o mesmo parser CSV já usado na
// Apuração Mensal (seção 109 — reutilizar parser/validação quando
// apropriado, sem misturar os dados dos dois domínios).
export { buscarRespostas, buscarUltimaImportacao, contarRespostas }

export async function validarESimularImportacao(schema, file) {
  const arquivoCheck = validarArquivo(file)
  if (!arquivoCheck.ok) {
    return { ok: false, errosArquivo: arquivoCheck.erros, errosEstrutura: [], avisos: [] }
  }

  let data, errors
  try {
    ({ data, errors } = await parseCSVCompleto(file))
  } catch {
    return {
      ok: false,
      errosArquivo: [{ chave: 'leitura', mensagem: 'Não foi possível ler o arquivo CSV. Verifique se ele não está corrompido.' }],
      errosEstrutura: [], avisos: [],
    }
  }

  const estrutura = validarEstruturaCsv(schema, data)
  if (!estrutura.ok) {
    return { ok: false, errosArquivo: [], errosEstrutura: estrutura.erros, avisos: estrutura.avisos }
  }

  const { validas, erros: errosLinha, avisos: avisosLinha } = normalizarLinhas(schema, data, estrutura.colunaPorHeader)
  const avisos = [...estrutura.avisos, ...avisosLinha]
  if (errors?.length) {
    avisos.push({ chave: 'linhas_malformadas', mensagem: `${errors.length} linha(s) com estrutura inconsistente foram identificadas pelo leitor de CSV.` })
  }

  const respostasExistentes = await buscarRespostas(schema.surveyType)
  const existentesPorId = new Map(respostasExistentes.map(r => [r.sourceResponseId, r]))
  const classificacao = classificarImportacao(validas, existentesPorId)

  return {
    ok: true,
    errosArquivo: [],
    errosEstrutura: [],
    avisos,
    errosLinha,
    classificacao,
    resumoValidacao: {
      totalLinhas: data.length,
      validos: validas.length,
      invalidos: errosLinha.length,
      avisos: avisos.length,
    },
  }
}

export async function confirmarImportacao(schema, resultadoValidacao, arquivo, usuario) {
  return confirmarImportacaoPesquisa({
    surveyType: schema.surveyType,
    schemaVersion: schema.schemaVersion,
    arquivoNome: arquivo.name,
    classificacao: resultadoValidacao.classificacao,
    resumoValidacao: resultadoValidacao.resumoValidacao,
    uid: usuario?.uid,
    email: usuario?.email,
  })
}
