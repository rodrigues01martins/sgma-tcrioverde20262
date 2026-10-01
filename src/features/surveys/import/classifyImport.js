// ============================================================
// CLASSIFICAÇÃO DA IMPORTAÇÃO — Novo / Atualizado / Inalterado
// ============================================================
// Identidade lógica: surveyType + sourceResponseId (seção 11). Reimportar
// o arquivo inteiro nunca duplica (seção 12) e nunca exclui por ausência
// (seção 13) — esta função só classifica as linhas do arquivo atual;
// quem já está no Firestore e não veio no novo arquivo simplesmente não
// é tocado (o caller nunca deleta o que está fora do conjunto atual).

function normalizarParaComparacao(valor) {
  if (Array.isArray(valor)) return valor.map(normalizarParaComparacao)
  if (valor && typeof valor === 'object') {
    return Object.keys(valor).sort().reduce((acc, chave) => {
      acc[chave] = normalizarParaComparacao(valor[chave])
      return acc
    }, {})
  }
  return valor === undefined ? null : valor
}

function conteudoEquivalente(a, b) {
  return JSON.stringify(normalizarParaComparacao(a)) === JSON.stringify(normalizarParaComparacao(b))
}

// Campos que definem o "conteúdo" de uma resposta para fins de detecção
// de alteração — nunca inclui metadados de importação (importedAt/
// importId), que mudam a cada reimportação mesmo sem alteração real.
const CAMPOS_CONTEUDO = ['completedAt', 'lastModifiedAt', 'municipalityCode', 'municipalityName', 'municipalityRaw', 'answers']

function extrairConteudo(registro) {
  return CAMPOS_CONTEUDO.reduce((acc, campo) => {
    acc[campo] = registro[campo] ?? null
    return acc
  }, {})
}

// `existentesPorId`: Map<sourceResponseId, documentoPersistidoAtual>
export function classificarImportacao(linhasNormalizadas, existentesPorId) {
  const resultado = { novos: [], atualizados: [], inalterados: [] }

  linhasNormalizadas.forEach(linha => {
    const existente = existentesPorId.get(linha.sourceResponseId)
    if (!existente) {
      resultado.novos.push(linha)
      return
    }
    const igual = conteudoEquivalente(extrairConteudo(linha), extrairConteudo(existente))
    if (igual) {
      resultado.inalterados.push(linha)
    } else {
      resultado.atualizados.push({ ...linha, _idDocumentoExistente: existente._idDocumento })
    }
  })

  return resultado
}
