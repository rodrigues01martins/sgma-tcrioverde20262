import { encontrarMunicipioGoias, normalizeMunicipioName } from '../../../data/municipiosGoias'

// ============================================================
// NORMALIZAÇÃO DE MUNICÍPIO — reaproveita a base canônica dos 246
// municípios de Goiás (seção 37). Nunca faz fuzzy matching silencioso:
// se não reconhecer, devolve `reconhecido: false` para virar WARNING na
// validação, preservando o valor original para diagnóstico.
// ============================================================
export function resolveMunicipio(valorBruto) {
  const raw = (valorBruto ?? '').toString().trim()
  if (!raw) {
    return { raw: '', codigoIbge: null, nome: null, reconhecido: false, vazio: true }
  }
  const encontrado = encontrarMunicipioGoias(raw)
  if (!encontrado) {
    return { raw, codigoIbge: null, nome: normalizeMunicipioName(raw), reconhecido: false, vazio: false }
  }
  return { raw, codigoIbge: encontrado.codigo_ibge, nome: encontrado.nome, reconhecido: true, vazio: false }
}
