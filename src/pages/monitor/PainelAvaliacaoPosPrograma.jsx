import { useMemo, useState } from 'react'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'
import { Select } from '../../components/monitor/ui/Input'
import IndicatorDrilldown from '../../components/monitor/ui/IndicatorDrilldown'
import IndicatorCard from '../../components/monitor/surveys/IndicatorCard'
import IndicatorDetailContent from '../../components/monitor/surveys/IndicatorDetailContent'
import TransversalComparison from '../../components/monitor/surveys/TransversalComparison'
import { useSurveyResponses } from '../../features/surveys/panels/useSurveyResponses'
import { GRADUATE_INDICATORS } from '../../features/surveys/indicators/graduateIndicators'
import { ACTIVE_LEARNER_INDICATORS } from '../../features/surveys/indicators/activeLearnerIndicators'
import { MENTOR_INDICATORS } from '../../features/surveys/indicators/mentorIndicators'
import { GUARDIAN_INDICATORS } from '../../features/surveys/indicators/guardianIndicators'
import { calcularTodosIndicadores } from '../../features/surveys/indicators/buildInstrumentIndicators'
import { montarAnalisesTransversais } from '../../features/surveys/indicators/transversalAnalyses'

// ============================================================
// PAINEL — AVALIAÇÃO PÓS-PROGRAMA (seção 71)
// ============================================================
// Fonte principal: Egresso (8 indicadores). Também exibe as 3 análises
// transversais que "têm sentido de resultado" (Desenvolvimento
// SocioComportamental, Impacto Financeiro, Expectativa × Resultado de
// Empregabilidade) — a de Atendimento fica no Painel de Satisfação.
function filtrarPorMunicipio(docs, municipio) {
  if (!municipio) return docs
  return docs.filter(d => d.municipalityName === municipio)
}

export default function PainelAvaliacaoPosPrograma() {
  const [municipioSel, setMunicipioSel] = useState('')
  const [drill, setDrill] = useState(null)

  const { loading, respostasPorTipo, ultimaAtualizacaoEm } = useSurveyResponses(['GRADUATE', 'ACTIVE_LEARNER', 'GUARDIAN', 'MENTOR'])

  const egressosFiltrados = useMemo(
    () => filtrarPorMunicipio(respostasPorTipo.GRADUATE || [], municipioSel),
    [respostasPorTipo, municipioSel]
  )
  const municipiosDisponiveis = useMemo(
    () => [...new Set((respostasPorTipo.GRADUATE || []).map(r => r.municipalityName).filter(Boolean))].sort(),
    [respostasPorTipo]
  )

  const indicadoresEgresso = useMemo(() => calcularTodosIndicadores(GRADUATE_INDICATORS, egressosFiltrados), [egressosFiltrados])

  // As análises transversais comparam o panorama geral de cada público —
  // não são recortadas pelo filtro de município do egresso (seção 79: o
  // filtro se aplica aos dados que alimentam O PRÓPRIO indicador exibido,
  // nunca a um indicador alheio de outro público).
  const transversaisRelevantes = useMemo(() => {
    const indicadoresAprendiz = calcularTodosIndicadores(ACTIVE_LEARNER_INDICATORS, respostasPorTipo.ACTIVE_LEARNER || [])
    const indicadoresResponsavel = calcularTodosIndicadores(GUARDIAN_INDICATORS, respostasPorTipo.GUARDIAN || [])
    const indicadoresMentor = calcularTodosIndicadores(MENTOR_INDICATORS, respostasPorTipo.MENTOR || [])
    const indicadoresEgressoCompleto = calcularTodosIndicadores(GRADUATE_INDICATORS, respostasPorTipo.GRADUATE || [])
    const todas = montarAnalisesTransversais({
      activeLearner: indicadoresAprendiz, mentor: indicadoresMentor, guardian: indicadoresResponsavel, graduate: indicadoresEgressoCompleto,
    })
    return todas.filter(a => a.code !== 'TRANSV_QUALIDADE_ATENDIMENTO')
  }, [respostasPorTipo])

  if (loading) return <Loader message="Carregando avaliação pós-programa..." />

  if ((respostasPorTipo.GRADUATE || []).length === 0) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Painel — Avaliação Pós-Programa
          </h2>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-brand)', borderRadius: 'var(--radius-md)' }}>
          <EmptyState
            title="Ainda não há respostas importadas para esta avaliação"
            description="Acesse Formulários → Avaliação Pós-Programa para importar o primeiro arquivo CSV, caso você tenha permissão."
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
          Painel — Avaliação Pós-Programa
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
          {ultimaAtualizacaoEm ? `Dados atualizados em ${ultimaAtualizacaoEm.toLocaleString('pt-BR')}` : 'Data da última importação indisponível'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '24px', padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
        <Select label="Município (residência do egresso)" value={municipioSel} onChange={e => setMunicipioSel(e.target.value)} style={{ width: '260px' }}>
          <option value="">Todos os municípios</option>
          {municipiosDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
      </div>

      <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-family)' }}>
        Indicadores — Egresso
      </p>
      {egressosFiltrados.length === 0 ? (
        <EmptyState title="Nenhuma resposta para o município selecionado" description="Ajuste ou limpe o filtro para ver os resultados." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {GRADUATE_INDICATORS.map(ind => {
            const resultado = indicadoresEgresso[ind.code]
            return <IndicatorCard key={ind.code} indicator={resultado} onDetails={() => setDrill(resultado)} />
          })}
        </div>
      )}

      <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-family)' }}>
        Análises Transversais
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {transversaisRelevantes.map(analise => (
          <TransversalComparison key={analise.code} analysis={analise} />
        ))}
      </div>

      <IndicatorDrilldown
        aberto={!!drill}
        onFechar={() => setDrill(null)}
        titulo={drill ? `${drill.code} — ${drill.name}` : ''}
        contexto="Egresso"
      >
        {drill && <IndicatorDetailContent indicator={drill} docs={egressosFiltrados} />}
      </IndicatorDrilldown>
    </div>
  )
}
