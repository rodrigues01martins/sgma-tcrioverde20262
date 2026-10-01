import { useCallback, useEffect, useState } from 'react'
import { buscarRespostas, buscarUltimaImportacao } from '../import/surveyImportService'

// ============================================================
// CARREGAMENTO DOS DADOS PARA OS PAINÉIS (seção 80)
// ============================================================
// Carrega o conjunto necessário à página UMA VEZ (nunca consulta o
// Firestore de novo por Card) — filtros e motor de indicadores operam
// depois, em memória, via useMemo em quem consome este hook (seção 79:
// dados normalizados -> filtros -> motor -> painel).
//
// `surveyTypes`: ex. ['ACTIVE_LEARNER', 'MENTOR', 'GUARDIAN'].
export function useSurveyResponses(surveyTypes) {
  const [loading, setLoading] = useState(true)
  const [respostasPorTipo, setRespostasPorTipo] = useState({})
  const [ultimaImportacaoPorTipo, setUltimaImportacaoPorTipo] = useState({})

  const carregar = useCallback(async () => {
    setLoading(true)
    const resultados = await Promise.all(surveyTypes.map(tipo => Promise.all([
      buscarRespostas(tipo),
      buscarUltimaImportacao(tipo),
    ])))
    const respostas = {}
    const ultimas = {}
    surveyTypes.forEach((tipo, i) => {
      respostas[tipo] = resultados[i][0]
      ultimas[tipo] = resultados[i][1]
    })
    setRespostasPorTipo(respostas)
    setUltimaImportacaoPorTipo(ultimas)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyTypes.join(',')])

  useEffect(() => { carregar() }, [carregar])

  // "Dados atualizados em" (seção 83) = importação válida mais recente
  // entre os instrumentos carregados por este painel.
  const ultimaAtualizacao = Object.values(ultimasValidas(ultimaImportacaoPorTipo))
    .map(u => u.importadoEm?.toMillis?.() ?? 0)
    .reduce((max, atual) => Math.max(max, atual), 0)

  function ultimasValidas(mapa) {
    return Object.fromEntries(Object.entries(mapa).filter(([, v]) => v))
  }

  return {
    loading,
    respostasPorTipo,
    ultimaImportacaoPorTipo,
    ultimaAtualizacaoEm: ultimaAtualizacao > 0 ? new Date(ultimaAtualizacao) : null,
    recarregar: carregar,
  }
}
