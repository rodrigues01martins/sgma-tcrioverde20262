import { useMemo, useState } from 'react'
import KpiCard from '../../components/monitor/ui/KpiCard'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'
import { Select } from '../../components/monitor/ui/Input'
import IndicatorDrilldown from '../../components/monitor/ui/IndicatorDrilldown'
import IndicatorCard from '../../components/monitor/surveys/IndicatorCard'
import IndicatorDetailContent from '../../components/monitor/surveys/IndicatorDetailContent'
import TransversalComparison from '../../components/monitor/surveys/TransversalComparison'
import { useSurveyResponses } from '../../features/surveys/panels/useSurveyResponses'
import { ACTIVE_LEARNER_INDICATORS } from '../../features/surveys/indicators/activeLearnerIndicators'
import { MENTOR_INDICATORS } from '../../features/surveys/indicators/mentorIndicators'
import { GUARDIAN_INDICATORS } from '../../features/surveys/indicators/guardianIndicators'
import { calcularTodosIndicadores } from '../../features/surveys/indicators/buildInstrumentIndicators'
import { montarAnalisesTransversais } from '../../features/surveys/indicators/transversalAnalyses'

// ============================================================
// PAINEL — INDICADORES DE SATISFAÇÃO (seção 69-70)
// ============================================================
// Ordem de operação estrita (seção 79): dados normalizados -> filtros ->
// motor de indicadores -> painel. Nunca filtra um percentual já calculado.
const TABS = [
  { key: 'geral', label: 'Visão Geral' },
  { key: 'aprendiz', label: 'Aprendiz' },
  { key: 'mentor', label: 'Mentor' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'transversal', label: 'Análise Transversal' },
]

const INSTRUMENTOS = {
  aprendiz: { tipo: 'ACTIVE_LEARNER', label: 'Aprendiz Ativo', indicadores: ACTIVE_LEARNER_INDICATORS },
  mentor: { tipo: 'MENTOR', label: 'Mentor da Prática', indicadores: MENTOR_INDICATORS },
  responsavel: { tipo: 'GUARDIAN', label: 'Responsável Legal', indicadores: GUARDIAN_INDICATORS },
}

function filtrarPorMunicipio(docs, municipio) {
  if (!municipio) return docs
  return docs.filter(d => d.municipalityName === municipio)
}

export default function PainelIndicadoresSatisfacao() {
  const [tab, setTab] = useState('geral')
  const [municipioSel, setMunicipioSel] = useState('')
  const [drill, setDrill] = useState(null) // { instrumentoKey, indicator } | null

  const { loading, respostasPorTipo, ultimaAtualizacaoEm } = useSurveyResponses(['ACTIVE_LEARNER', 'MENTOR', 'GUARDIAN'])

  const municipiosDisponiveis = useMemo(() => {
    const todos = Object.values(respostasPorTipo).flat().map(r => r.municipalityName).filter(Boolean)
    return [...new Set(todos)].sort()
  }, [respostasPorTipo])

  const respostasFiltradasPorInstrumento = useMemo(() => ({
    aprendiz: filtrarPorMunicipio(respostasPorTipo.ACTIVE_LEARNER || [], municipioSel),
    mentor: filtrarPorMunicipio(respostasPorTipo.MENTOR || [], municipioSel),
    responsavel: filtrarPorMunicipio(respostasPorTipo.GUARDIAN || [], municipioSel),
  }), [respostasPorTipo, municipioSel])

  const indicadoresPorInstrumento = useMemo(() => ({
    aprendiz: calcularTodosIndicadores(ACTIVE_LEARNER_INDICATORS, respostasFiltradasPorInstrumento.aprendiz),
    mentor: calcularTodosIndicadores(MENTOR_INDICATORS, respostasFiltradasPorInstrumento.mentor),
    responsavel: calcularTodosIndicadores(GUARDIAN_INDICATORS, respostasFiltradasPorInstrumento.responsavel),
  }), [respostasFiltradasPorInstrumento])

  // Só a análise "Qualidade do Atendimento" pertence a este painel — as
  // outras 3 análises transversais envolvem Egresso e vivem no Painel de
  // Avaliação Pós-Programa (seção 71).
  const transversalAtendimento = useMemo(() => {
    const todas = montarAnalisesTransversais({
      activeLearner: indicadoresPorInstrumento.aprendiz,
      mentor: indicadoresPorInstrumento.mentor,
      guardian: indicadoresPorInstrumento.responsavel,
      graduate: {},
    })
    return todas.find(a => a.code === 'TRANSV_QUALIDADE_ATENDIMENTO')
  }, [indicadoresPorInstrumento])

  if (loading) return <Loader message="Carregando pesquisas de satisfação..." />

  const totalGeral = Object.values(respostasPorTipo).reduce((s, arr) => s + arr.length, 0)
  if (totalGeral === 0) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Painel — Indicadores de Satisfação
          </h2>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-brand)', borderRadius: 'var(--radius-md)' }}>
          <EmptyState
            title="Ainda não há respostas importadas para esta pesquisa"
            description="Acesse Formulários → Indicadores de Satisfação para importar o primeiro arquivo CSV, caso você tenha permissão."
          />
        </div>
      </div>
    )
  }

  const instrumentoAtivo = INSTRUMENTOS[tab]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Painel — Indicadores de Satisfação
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
            {ultimaAtualizacaoEm ? `Dados atualizados em ${ultimaAtualizacaoEm.toLocaleString('pt-BR')}` : 'Data da última importação indisponível'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? 'page' : undefined}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '13px', fontWeight: 600,
              fontFamily: 'var(--font-family)', cursor: 'pointer',
              border: `1px solid ${tab === t.key ? 'var(--brand-primary)' : 'var(--border-default)'}`,
              background: tab === t.key ? 'var(--brand-primary)' : 'var(--bg-surface)',
              color: tab === t.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtro geral — município (seção 77) */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '24px', padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
        <Select label="Município" value={municipioSel} onChange={e => setMunicipioSel(e.target.value)} style={{ width: '240px' }}>
          <option value="">Todos os municípios</option>
          {municipiosDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
      </div>

      {tab === 'geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {Object.entries(INSTRUMENTOS).map(([key, inst]) => (
            <KpiCard
              key={key}
              label={inst.label}
              value={respostasFiltradasPorInstrumento[key].length}
              sub="respostas válidas"
              color="teal"
            />
          ))}
        </div>
      )}

      {instrumentoAtivo && (
        respostasFiltradasPorInstrumento[tab].length === 0 ? (
          <EmptyState title="Nenhuma resposta para os filtros selecionados" description="Ajuste ou limpe os filtros para ver os resultados." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {instrumentoAtivo.indicadores.map(ind => {
              const resultado = indicadoresPorInstrumento[tab][ind.code]
              return (
                <IndicatorCard key={ind.code} indicator={resultado} onDetails={() => setDrill({ instrumentoKey: tab, indicator: resultado })} />
              )
            })}
          </div>
        )
      )}

      {tab === 'transversal' && transversalAtendimento && (
        <TransversalComparison analysis={transversalAtendimento} />
      )}

      <IndicatorDrilldown
        aberto={!!drill}
        onFechar={() => setDrill(null)}
        titulo={drill ? `${drill.indicator.code} — ${drill.indicator.name}` : ''}
        contexto={drill ? INSTRUMENTOS[drill.instrumentoKey]?.label : ''}
      >
        {drill && (
          <IndicatorDetailContent indicator={drill.indicator} docs={respostasFiltradasPorInstrumento[drill.instrumentoKey]} />
        )}
      </IndicatorDrilldown>
    </div>
  )
}
