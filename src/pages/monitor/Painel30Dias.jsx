import { useState, useEffect, useMemo } from 'react'
import KpiCard from '../../components/monitor/ui/KpiCard'
import Badge from '../../components/monitor/ui/Badge'
import Button from '../../components/monitor/ui/Button'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'
import { Select } from '../../components/monitor/ui/Input'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  QUESTION_DEFINITIONS,
  INDICATOR_DEFINITIONS,
  calculateAllIndicators,
  calculateQuestionStats,
  buscarPeriodosDisponiveis,
  buscarRespostasPeriodo,
} from '../../services/verificacao30DiasService'
import IndicatorDrilldown, { DrilldownComposicao, DrilldownLista } from '../../components/monitor/ui/IndicatorDrilldown'
import IndicatorTooltip from '../../features/indicators-general/IndicatorTooltip'

const tooltipStyle = {
  contentStyle: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)',
  }
}

const SvgIcon = ({ path, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 -960 960 960" fill="var(--brand-primary)">
    <path d={path} />
  </svg>
)

const ICONS = {
  form:  'M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520Z',
  map:   'M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Z',
  org:   'M120-120v-560l320-160 320 160v560H120Zm80-80h560v-440L520-800 200-640v440Z',
}

function formatarPercentual(valor) {
  return valor === null ? '—' : `${valor.toFixed(1)}%`
}

function formatarPeriodo(periodo) {
  if (!periodo) return '—'
  const [ano, mes] = periodo.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[+mes - 1]}/${ano}`
}

export default function Painel30Dias() {
  const [periodos, setPeriodos] = useState([])
  const [periodoSel, setPeriodoSel] = useState('')
  const [respostas, setRespostas] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPeriodo, setLoadingPeriodo] = useState(false)
  const [municipioSel, setMunicipioSel] = useState('')
  const [orgaoSel, setOrgaoSel] = useState('')
  const [drillIndicador, setDrillIndicador] = useState(null) // null | 'IRI'|'IRA'|'IEB'|'IAA'|'IACA'
  const [drillFormularios, setDrillFormularios] = useState(false)

  useEffect(() => {
    buscarPeriodosDisponiveis().then(lista => {
      setPeriodos(lista)
      if (lista.length) setPeriodoSel(lista[0])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!periodoSel) return
    setLoadingPeriodo(true)
    buscarRespostasPeriodo(periodoSel).then(lista => {
      // Rascunhos autosalvos (ainda não enviados) não entram nas
      // estatísticas — só respostas concluídas. Documentos antigos sem
      // o campo `status` são de antes do autosave existir: já eram
      // envios concluídos, então continuam contados normalmente.
      setRespostas(lista.filter(r => r.status !== 'rascunho'))
      setLoadingPeriodo(false)
    })
  }, [periodoSel])

  const municipiosDisponiveis = useMemo(
    () => [...new Set(respostas.map(r => r.identificacao?.municipioNome).filter(Boolean))].sort(),
    [respostas]
  )
  const orgaosDisponiveis = useMemo(
    () => [...new Set(respostas.map(r => r.identificacao?.orgaoBeneficiarioNome).filter(Boolean))].sort(),
    [respostas]
  )

  const respostasFiltradas = useMemo(() => {
    return respostas.filter(r => {
      if (municipioSel && r.identificacao?.municipioNome !== municipioSel) return false
      if (orgaoSel && r.identificacao?.orgaoBeneficiarioNome !== orgaoSel) return false
      return true
    })
  }, [respostas, municipioSel, orgaoSel])

  function limparFiltros() {
    setMunicipioSel('')
    setOrgaoSel('')
  }

  if (loading) return <Loader message="Carregando períodos..." />

  if (!periodos.length) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Painel – Verificação Inicial do Aprendiz – 30 Dias
          </h2>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-brand)', borderRadius: 'var(--radius-md)' }}>
          <EmptyState title="Nenhum formulário registrado" description="Os dados aparecem aqui assim que o Formulário de Verificação Inicial for enviado." />
        </div>
      </div>
    )
  }

  const Ns = respostasFiltradas.length
  const municipiosRepresentados = new Set(respostasFiltradas.map(r => r.identificacao?.municipioNome).filter(Boolean)).size
  const orgaosRepresentados = new Set(respostasFiltradas.map(r => r.identificacao?.orgaoBeneficiarioNome).filter(Boolean)).size

  const indicadores = calculateAllIndicators(respostasFiltradas)

  const comparacaoIndicadores = INDICATOR_DEFINITIONS.map(def => indicadores[def.id])

  const perguntasPontuadas = QUESTION_DEFINITIONS.filter(q => q.scored)
  const statsPerguntas = perguntasPontuadas.map(q => ({
    ...calculateQuestionStats(q.id, respostasFiltradas.map(r => r.respostas?.[q.id])),
    textoResumido: q.textoResumido,
    dimensao: q.dimensao,
  }))
  const statsOrdenadas = [...statsPerguntas].sort((a, b) => (a.percentual ?? -1) - (b.percentual ?? -1))

  // Perguntas de caracterização (sem score — hoje Q12 e Q21). Genérico
  // para não depender de qual/quantas existem: cada uma é tabulada pelas
  // suas próprias opções, nunca por um valor fixo tipo SIM/NÃO.
  const perguntasCaracterizacao = QUESTION_DEFINITIONS.filter(q => !q.scored)
  const statsCaracterizacao = perguntasCaracterizacao.map(q => {
    const valores = respostasFiltradas.map(r => r.respostas?.[q.id])
    return {
      id: q.id,
      textoResumido: q.textoResumido,
      contagens: q.opcoes.map(op => ({ label: op.label, quantidade: valores.filter(v => v === op.valor).length })),
    }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Painel – Verificação Inicial do Aprendiz – 30 Dias
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
            {formatarPeriodo(periodoSel)}
          </p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '24px', padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
        <Select label="Período de aplicação *" value={periodoSel} onChange={e => { setPeriodoSel(e.target.value); limparFiltros() }} style={{ width: '160px' }}>
          {periodos.map(p => <option key={p} value={p}>{formatarPeriodo(p)}</option>)}
        </Select>
        <Select label="Município" value={municipioSel} onChange={e => setMunicipioSel(e.target.value)} style={{ width: '220px' }}>
          <option value="">Todos os municípios</option>
          {municipiosDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select label="Órgão/local" value={orgaoSel} onChange={e => setOrgaoSel(e.target.value)} style={{ width: '220px' }}>
          <option value="">Todos os órgãos</option>
          {orgaosDisponiveis.map(o => <option key={o} value={o}>{o}</option>)}
        </Select>
        {(municipioSel || orgaoSel) && (
          <Button variant="ghost" onClick={limparFiltros}>Limpar filtros</Button>
        )}
      </div>

      {loadingPeriodo ? (
        <Loader message="Carregando formulários do período..." />
      ) : Ns === 0 ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-brand)', borderRadius: 'var(--radius-md)' }}>
          <EmptyState title="Nenhum formulário para os filtros selecionados" description="Ajuste ou limpe os filtros para ver os resultados." />
        </div>
      ) : (
        <>
          {/* ── Bloco 1: Visão geral ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <KpiCard icon={<SvgIcon path={ICONS.form} />} label="Formulários Respondidos" value={Ns} sub={formatarPeriodo(periodoSel)} color="blue" onDetails={() => setDrillFormularios(true)} />
            <KpiCard icon={<SvgIcon path={ICONS.map} />} label="Municípios Representados" value={municipiosRepresentados} color="teal" />
            <KpiCard icon={<SvgIcon path={ICONS.org} />} label="Órgãos Representados" value={orgaosRepresentados} color="purple" />
          </div>

          {/* ── Bloco 2: Indicadores ── */}
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-family)' }}>
            Indicadores
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {INDICATOR_DEFINITIONS.map(def => {
              const ind = indicadores[def.id]
              return (
                <KpiCard
                  key={def.id}
                  label={<><IndicatorTooltip code={def.id} /> — {def.nome}</>}
                  value={formatarPercentual(ind.percentual)}
                  sub={ind.percentual === null ? 'Sem base para cálculo' : `Base válida: ${ind.baseValida} respostas`}
                  color={ind.percentual === null ? 'danger' : 'blue'}
                  onDetails={ind.percentual !== null ? () => setDrillIndicador(def.id) : undefined}
                />
              )
            })}
          </div>

          {/* ── Bloco 3: Comparação dos 5 indicadores ── */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-family)', marginBottom: '16px' }}>
              Comparação dos Cinco Indicadores
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {comparacaoIndicadores.map(ind => (
                <div key={ind.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontWeight: 500 }}><IndicatorTooltip code={ind.id} /></span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-family)' }}>
                      {formatarPercentual(ind.percentual)} {ind.percentual !== null && `(base: ${ind.baseValida})`}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-default)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${ind.percentual ?? 0}%`, background: 'var(--brand-primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bloco 4: Resultado por pergunta (ranking) ── */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                Resultado por Pergunta — % de Conformidade (menor para maior)
              </h3>
            </div>
            <div style={{ padding: '16px' }}>
              <ResponsiveContainer width="100%" height={Math.max(320, statsOrdenadas.length * 28)}>
                <BarChart data={statsOrdenadas.map(s => ({ nome: `${s.questionId.toUpperCase()} — ${s.textoResumido}`, percentual: s.percentual ?? 0 }))} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="var(--chart-axis)" tick={{ fontSize: 11, fontFamily: 'var(--font-family)' }} />
                  <YAxis type="category" dataKey="nome" stroke="var(--chart-axis)" tick={{ fontSize: 10, fontFamily: 'var(--font-family)' }} width={220} />
                  <Tooltip {...tooltipStyle} formatter={v => `${Number(v).toFixed(1)}%`} />
                  <Bar dataKey="percentual" name="% Conformidade" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Perguntas de caracterização (sem conformidade) ── */}
          {statsCaracterizacao.map(stat => (
            <div key={stat.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Badge variant="neutral">CARACTERIZAÇÃO</Badge>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
                  {stat.id.toUpperCase()} — {stat.textoResumido}
                </p>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '10px' }}>
                Questão de caracterização — não compõe nenhum dos cinco indicadores.
              </p>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {stat.contagens.map(c => (
                  <span key={c.label} style={{ fontSize: '14px', fontFamily: 'var(--font-family)' }}>
                    <strong>{c.label}:</strong> {c.quantidade}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* ── Bloco 5: Tabela analítica ── */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                Tabela Analítica das Perguntas
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font-family)' }}>
                <thead>
                  <tr>
                    {['Pergunta', 'Dimensão', 'Positivas', 'Negativas', 'Não aplicáveis', 'Base válida', '% Positivo'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {QUESTION_DEFINITIONS.map(q => {
                    if (!q.scored) {
                      const stat = statsCaracterizacao.find(s => s.id === q.id)
                      const resumo = stat.contagens.map(c => `${c.label}: ${c.quantidade}`).join(' · ')
                      return (
                        <tr key={q.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{q.id.toUpperCase()} — {q.textoResumido}</td>
                          <td style={{ padding: '12px 16px' }}><Badge variant="neutral">Caracterização</Badge></td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }} colSpan={4}>{resumo}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>—</td>
                        </tr>
                      )
                    }
                    const stats = calculateQuestionStats(q.id, respostasFiltradas.map(r => r.respostas?.[q.id]))
                    return (
                      <tr key={q.id} style={{ borderBottom: '1px solid var(--border-default)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{q.id.toUpperCase()} — {q.textoResumido}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{q.dimensao}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--status-success-text)', fontWeight: 600 }}>{stats.positivas}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--status-danger-text)', fontWeight: 600 }}>{stats.negativas}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{stats.naoAplicaveis || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{stats.baseValida}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 700 }}>{formatarPercentual(stats.percentual)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Drill-down: indicador → perguntas que o compõem (mesma calculateQuestionStats da tabela geral) ── */}
      <IndicatorDrilldown
        aberto={drillIndicador !== null}
        onFechar={() => setDrillIndicador(null)}
        contexto={formatarPeriodo(periodoSel)}
        titulo={drillIndicador ? `${drillIndicador} — ${INDICATOR_DEFINITIONS.find(d => d.id === drillIndicador)?.nome}` : ''}
      >
        {drillIndicador && (() => {
          const def = INDICATOR_DEFINITIONS.find(d => d.id === drillIndicador)
          const ind = indicadores[drillIndicador]
          const linhas = def.questoes.map(qId => {
            const q = QUESTION_DEFINITIONS.find(x => x.id === qId)
            const stats = calculateQuestionStats(qId, respostasFiltradas.map(r => r.respostas?.[qId]))
            return [
              `${qId.toUpperCase()} — ${q.textoResumido}`,
              stats.positivas,
              stats.negativas,
              stats.naoAplicaveis || '—',
              stats.baseValida,
              formatarPercentual(stats.percentual),
            ]
          })
          // No IRI, a Modalidade (Q21) aparece como contexto de
          // caracterização — nunca como critério pontuável, nunca somada
          // ao "Perguntas que compõem o indicador" acima.
          const statModalidade = drillIndicador === 'IRI' ? statsCaracterizacao.find(s => s.id === 'q21') : null
          return (
            <>
              {statModalidade && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '6px' }}>
                    Modalidade do curso (caracterização — não pontua)
                  </p>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {statModalidade.contagens.map(c => (
                      <span key={c.label} style={{ fontSize: '13px', fontFamily: 'var(--font-family)' }}>
                        <strong>{c.label}:</strong> {c.quantidade}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <DrilldownComposicao itens={[
                { label: 'Resultado', valor: formatarPercentual(ind.percentual), destaque: true },
                { label: 'Base válida', valor: ind.baseValida },
                { label: 'Perguntas que compõem o indicador', valor: def.questoes.length },
              ]} />
              <DrilldownLista colunas={['Pergunta', 'Positivas', 'Negativas', 'Não aplicáveis', 'Base válida', '% Positivo']} linhas={linhas} />
            </>
          )
        })()}
      </IndicatorDrilldown>

      {/* ── Drill-down: Formulários Respondidos → lista dos formulários do período/filtro ── */}
      <IndicatorDrilldown
        aberto={drillFormularios}
        onFechar={() => setDrillFormularios(false)}
        titulo="Formulários Respondidos"
        contexto={formatarPeriodo(periodoSel)}
        vazio={respostasFiltradas.length === 0}
        vazioDescricao="Não existem formulários associados a este indicador na competência selecionada."
      >
        <DrilldownComposicao itens={[{ label: 'Formulários no período/filtro', valor: respostasFiltradas.length, destaque: true }]} />
        <DrilldownLista
          colunas={['Matrícula', 'Município', 'Órgão/local', 'Data de aplicação']}
          linhas={respostasFiltradas.map(r => [
            r.identificacao?.matricula,
            r.identificacao?.municipioNome,
            r.identificacao?.orgaoBeneficiarioNome,
            r.identificacao?.dataAplicacao,
          ])}
        />
      </IndicatorDrilldown>
    </div>
  )
}
