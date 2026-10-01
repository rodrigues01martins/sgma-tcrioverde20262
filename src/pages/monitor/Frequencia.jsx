import { useState, useEffect } from 'react'
import { buscarPeriodos, buscarDadosPeriodo } from '../../services/firestoreService'
import { enriquecerDados, calcularAgregados, formatarPeriodo, selecionarPorFlag } from '../../services/csvService'
import { baseFinanceira, baseGerencial } from '../../services/classificacaoService'
import { calcularPVPeTRV } from '../../services/indicadoresExecucaoService'
import IndicatorTooltip from '../../features/indicators-general/IndicatorTooltip'
import KpiCard from '../../components/monitor/ui/KpiCard'
import ChartCard from '../../components/monitor/ui/ChartCard'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'
import NotaMetodologica from '../../components/monitor/ui/NotaMetodologica'
import { Select } from '../../components/monitor/ui/Input'
import IndicatorDrilldown, { DrilldownComposicao, DrilldownFormula, DrilldownLista } from '../../components/monitor/ui/IndicatorDrilldown'

const LABELS_SITUACAO = {
  ativo: 'Ativo',
  inconsistencia_cadastral: 'Inconsistência cadastral',
  admitido_e_desligado_no_mes: 'Admitido e desligado no mês',
  desligamento_antecipado: 'Desligamento antecipado',
  termino_contrato: 'Término de contrato',
}

function linhaRegistro(r) {
  return [
    r.nome || '—',
    r.cidade || '—',
    r.data_admin || r.data_demiss || '—',
    LABELS_SITUACAO[r._classificacao?.situacao] || r._classificacao?.situacao || '—',
  ]
}

const SvgIcon = ({ path, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 -960 960 960" fill="var(--brand-primary)">
    <path d={path} />
  </svg>
)

const ICONS = {
  vagas:    'M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Z',
  freq:     'M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm80-80h400v-80H280v80Zm0-160h400v-80H280v80Z',
  evasao:   'M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z',
  reposicao:'M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z',
}

function GaugeCard({ label, value, sub, meta, color = 'blue', icon, onDetails }) {
  // value pode ser null quando o indicador é "Não aplicável" (ex.: TRV sem
  // nenhuma vaga disponível na competência) — nunca convertido em 0.
  const naoAplicavel = value === null || value === undefined
  const pct = naoAplicavel ? 0 : Math.min(value, 100)
  const colorMap = {
    blue:   'var(--brand-primary)',
    green:  'var(--status-success-text)',
    danger: 'var(--status-danger-text)',
    warn:   'var(--status-warning-text)',
    teal:   'var(--brand-secondary)',
  }
  const barColor = colorMap[color] || colorMap.blue
  const acionavel = !!onDetails

  return (
    <div
      onClick={onDetails}
      role={acionavel ? 'button' : undefined}
      tabIndex={acionavel ? 0 : undefined}
      onKeyDown={acionavel ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDetails() } } : undefined}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        cursor: acionavel ? 'pointer' : undefined,
      }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '4px', background: barColor,
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', marginTop: '4px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', lineHeight: '16px' }}>
          {label}
        </p>
        {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
      </div>

      <p style={{ fontSize: '28px', fontWeight: 700, lineHeight: '32px', letterSpacing: '-0.02em', color: barColor, fontFamily: 'var(--font-family)', marginBottom: '6px' }}>
        {naoAplicavel ? 'Não aplicável' : `${value.toFixed(1)}%`}
      </p>

      {sub && <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '12px' }}>{sub}</p>}

      {/* Barra de progresso */}
      <div style={{ width: '100%', height: '6px', background: 'var(--border-default)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: barColor,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.6s ease',
        }} />
      </div>

      {meta && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-family)' }}>
          {meta}
        </p>
      )}

      {acionavel && (
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-family)', marginTop: '10px' }}>
          Ver detalhes →
        </p>
      )}
    </div>
  )
}

export default function Frequencia() {
  const [periodos, setPeriodos] = useState([])
  const [periodoSel, setPeriodoSel] = useState('')
  const [agregados, setAgregados] = useState(null)
  const [dadosEnriquecidos, setDadosEnriquecidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [drill, setDrill] = useState(null) // null | 'evasao' | 'iniciados' | 'finalizados' | 'reposicao' | 'vagas'

  useEffect(() => {
    buscarPeriodos().then(ps => { setPeriodos(ps); if (ps.length) setPeriodoSel(ps[0].periodo) })
  }, [])

  useEffect(() => {
    if (!periodoSel) return
    setLoading(true)
    buscarDadosPeriodo(periodoSel).then(dados => {
      const enriquecidos = enriquecerDados(dados)
      setDadosEnriquecidos(enriquecidos)
      // Regra de ouro: base explícita = quem gerou custo/participação na
      // competência (apuravelFinanceiro), nunca a base gerencial.
      setAgregados(calcularAgregados(baseFinanceira(enriquecidos), periodoSel))
      setLoading(false)
    })
  }, [periodoSel])

  if (loading) return <Loader message="Calculando indicadores..." />
  if (!agregados) return <EmptyState title="Nenhum dado encontrado" description="Faça upload de um CSV na aba Upload primeiro." />

  const VAGAS_TOTAL = 5000

  // Posição final da competência (jovemAtivo) — usada nos indicadores que
  // medem ocupação de vaga NO MOMENTO, não participação total no mês.
  // Ex.: se um jovem é desligado, a vaga só volta a contar como preenchida
  // quando outro é admitido no lugar dele — isso mede eficiência de
  // reposição, e por isso não pode usar a base financeira (que conta quem
  // saiu como se a vaga ainda estivesse ocupada).
  const jovensAtivos = baseGerencial(dadosEnriquecidos).length

  // 1. Preenchimento de vagas — quantas das 5.000 vagas estão ocupadas
  // agora (posição final), não quantos passaram pelo programa no mês.
  const ind_vagas = (jovensAtivos / VAGAS_TOTAL) * 100

  // 2. Participação regular (frequência) — soma sobre a base financeira,
  // para incluir os dias trabalhados por quem foi desligado no meio do mês.
  const dadosFinanceiros = baseFinanceira(dadosEnriquecidos)
  const soma_freq_util = dadosFinanceiros.reduce((s, r) => s + r._kpis.freq_util, 0)
  const soma_freq_base = dadosFinanceiros.reduce((s, r) => s + r._kpis.freq_base, 0)
  const ind_freq = soma_freq_base > 0 ? (soma_freq_util / soma_freq_base) * 100 : 0

  // 3. Evasão antecipada — também sobre a posição final (jovensAtivos),
  // consistente com Preenchimento de Vagas.
  const total_evasoes = agregados.total_evasoes || 0
  const ind_evasao = jovensAtivos > 0
    ? (total_evasoes / jovensAtivos) * 100
    : 0

  // Ranking de faltas — sobre a base financeira, mesma base de
  // Participação Regular (quem foi desligado no meio do mês ainda entra).
  const top10Faltas = [...dadosFinanceiros]
    .sort((a, b) => b._kpis.total_faltas - a._kpis.total_faltas)
    .slice(0, 10)
    .map(r => ({
      nome: r.nome ? r.nome.split(' ').slice(0, 2).join(' ') : '—',
      cidade: r.cidade || '—',
      faltas: r._kpis.total_faltas
    }))

  // 4. Reposição de vagas (TRV) — fórmula homologada na matriz oficial
  // (Memória PVP e TRV), não mais contratos_iniciados ÷ contratos_finalizados:
  // TRV = novas admissões efetivas ÷ [(5.000 − ativos na abertura do mês) +
  // desligamentos efetivos no mês]. "Não aplicável" (null) quando não há
  // nenhuma vaga disponível na competência — nunca 0% nem erro. Como o CSV
  // de origem não distingue transferência interna de admissão/desligamento
  // efetivo, toda admissão e todo desligamento dentro do mês são tratados
  // como efetivos — aproximação razoável na ausência desse campo.
  const { ativosAbertura, desligamentosEfetivos, novasAdmissoes, vagasDisponiveis, trv: ind_reposicao } =
    calcularPVPeTRV(dadosEnriquecidos)

  // Cor semântica por meta
  const corEvasao    = ind_evasao <= 15 ? 'green' : 'danger'
  const corReposicao = ind_reposicao === null ? 'blue' : (ind_reposicao > 50 ? 'green' : 'danger')

  // Listas de drill-down — sempre derivadas do MESMO array e MESMO flag
  // usados pelo agregado (calcularAgregados), nunca um filtro paralelo.
  const registrosEvasao      = selecionarPorFlag(dadosFinanceiros, 'evasao')
  const registrosIniciados   = selecionarPorFlag(dadosFinanceiros, 'contrato_iniciado')
  const registrosFinalizados = selecionarPorFlag(dadosFinanceiros, 'contrato_finalizado')

  // Composição do TRV — usa os MESMOS flags de _classificacao (persistidos
  // na ingestão) que calcularPVPeTRV consome, não os flags _kpis acima
  // (que servem às demais métricas desta tela).
  const registrosNovasAdmissoes = dadosEnriquecidos.filter(r => r._classificacao?.admitidoNoMes)
  const registrosDesligamentosEfetivos = dadosEnriquecidos.filter(r => r._classificacao?.desligadoNoMes || r._classificacao?.terminoNoMes)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Eixo 1 — Inclusão
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
            Matriz de Indicadores · {formatarPeriodo(periodoSel)}
          </p>
        </div>
        <Select value={periodoSel} onChange={e => setPeriodoSel(e.target.value)} style={{ width: '220px' }}>
          {periodos.map(p => (
            <option key={p.periodo} value={p.periodo}>{formatarPeriodo(p.periodo)} ({p.total})</option>
          ))}
        </Select>
      </div>

      {/* KPIs de contexto */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard
          icon={<SvgIcon path={ICONS.vagas} />}
          label="Jovens Apurados na Competência"
          value={agregados.total_aprendizes}
          sub={`de ${VAGAS_TOTAL.toLocaleString('pt-BR')} vagas disponíveis`}
          color="blue"
        />
        <KpiCard
          icon={<SvgIcon path={ICONS.reposicao} />}
          label="Contratos Iniciados"
          value={agregados.contratos_iniciados}
          sub="novas entradas no mês"
          color="green"
          onDetails={registrosIniciados.length ? () => setDrill('iniciados') : undefined}
        />
        <KpiCard
          icon={<SvgIcon path={ICONS.evasao} />}
          label="Evasões no Mês"
          value={total_evasoes}
          sub="saídas antes do término"
          color={total_evasoes > 0 ? 'danger' : 'green'}
          onDetails={registrosEvasao.length ? () => setDrill('evasao') : undefined}
        />
        <KpiCard
          icon={<SvgIcon path={ICONS.freq} />}
          label="Contratos Finalizados"
          value={agregados.contratos_finalizados}
          sub="término previsto no mês"
          color="teal"
          onDetails={registrosFinalizados.length ? () => setDrill('finalizados') : undefined}
        />
      </div>

      <NotaMetodologica>
        <strong>Jovens Apurados na Competência</strong> (acima) conta todo mundo com vínculo em qualquer dia
        do mês, mesmo quem foi desligado antes do fim dele. Já <strong>Preenchimento de Vagas</strong> e
        <strong> Taxa de Evasão Antecipada</strong> (abaixo) usam <strong>Jovens Ativos</strong> — a posição
        final da competência — porque medem ocupação de vaga no momento: se alguém é desligado, a vaga só
        volta a contar como preenchida quando outro jovem é admitido no lugar. Mesmo valor de Jovens Ativos
        exibido em Apuração Mensal → Gerencial.
      </NotaMetodologica>

      {/* Indicadores com barra de progresso */}
      <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-family)' }}>
        Indicadores de Meta
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <GaugeCard
          icon={<SvgIcon path={ICONS.vagas} />}
          label="Preenchimento de Vagas"
          value={ind_vagas}
          sub={`${jovensAtivos} vagas ocupadas de ${VAGAS_TOTAL.toLocaleString('pt-BR')}`}
          meta="Meta: 100% das vagas preenchidas"
          color="blue"
          onDetails={() => setDrill('vagas')}
        />
        <GaugeCard
          icon={<SvgIcon path={ICONS.freq} />}
          label="Participação Regular"
          value={ind_freq}
          sub={`${soma_freq_util.toLocaleString('pt-BR')} dias úteis trabalhados`}
          meta="Meta: máxima participação nas atividades"
          color="teal"
        />
        <GaugeCard
          icon={<SvgIcon path={ICONS.evasao} />}
          label="Taxa de Evasão Antecipada"
          value={ind_evasao}
          sub={`${total_evasoes} evasões de ${jovensAtivos} vagas ativas`}
          meta="Meta: ≤ 15% de evasão"
          color={corEvasao}
          onDetails={registrosEvasao.length ? () => setDrill('evasao') : undefined}
        />
        <GaugeCard
          icon={<SvgIcon path={ICONS.reposicao} />}
          label={<>Reposição de Vagas (<IndicatorTooltip code="TRV" />)</>}
          value={ind_reposicao}
          sub={vagasDisponiveis > 0
            ? `${novasAdmissoes} admissões efetivas de ${vagasDisponiveis} vagas disponíveis`
            : 'Nenhuma vaga disponível na competência'}
          meta="Meta: superior a 50% das vagas disponíveis repostas"
          color={corReposicao}
          onDetails={() => setDrill('reposicao')}
        />
      </div>

      <ChartCard title="10 Aprendizes com Mais Faltas no Mês" badge="Alertas" badgeColor="danger">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font-family)' }}>
            <thead>
              <tr>
                {['#', 'Nome', 'Cidade', 'Total de Faltas'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top10Faltas.map((r, i) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid var(--border-default)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{r.nome}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{r.cidade}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 12px', borderRadius: '999px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger-text)', fontSize: '12px', fontWeight: 600 }}>
                      {r.faltas} dias
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ── Drill-down: mesmo array e mesmo flag usados no KPI, nunca recalculado ── */}
      <IndicatorDrilldown
        aberto={drill !== null}
        onFechar={() => setDrill(null)}
        contexto={formatarPeriodo(periodoSel)}
        titulo={{
          evasao: 'Taxa de Evasão Antecipada',
          iniciados: 'Contratos Iniciados',
          finalizados: 'Contratos Finalizados',
          reposicao: 'Reposição de Vagas',
          vagas: 'Preenchimento de Vagas',
        }[drill] || ''}
      >
        {drill === 'evasao' && (
          <>
            <DrilldownComposicao itens={[
              { label: 'Resultado', valor: `${ind_evasao.toFixed(1)}%`, destaque: true },
              { label: 'Evasões consideradas', valor: total_evasoes },
              { label: 'Base considerada (vagas ativas)', valor: jovensAtivos },
            ]} />
            <DrilldownFormula texto={`${total_evasoes} evasões ÷ ${jovensAtivos} vagas ativas = ${ind_evasao.toFixed(1)}%`} />
            <DrilldownLista colunas={['Nome', 'Município', 'Data', 'Situação']} linhas={registrosEvasao.map(linhaRegistro)} />
          </>
        )}

        {drill === 'iniciados' && (
          <>
            <DrilldownComposicao itens={[{ label: 'Contratos iniciados no mês', valor: registrosIniciados.length, destaque: true }]} />
            <DrilldownLista colunas={['Nome', 'Município', 'Data', 'Situação']} linhas={registrosIniciados.map(linhaRegistro)} />
          </>
        )}

        {drill === 'finalizados' && (
          <>
            <DrilldownComposicao itens={[{ label: 'Contratos finalizados no mês', valor: registrosFinalizados.length, destaque: true }]} />
            <DrilldownLista colunas={['Nome', 'Município', 'Data', 'Situação']} linhas={registrosFinalizados.map(linhaRegistro)} />
          </>
        )}

        {drill === 'reposicao' && (
          <>
            <DrilldownComposicao itens={[
              { label: 'Ativos na abertura do mês', valor: ativosAbertura },
              { label: 'Vagas ociosas na abertura (5.000 − ativos)', valor: VAGAS_TOTAL - ativosAbertura },
              { label: 'Desligamentos efetivos no mês', valor: desligamentosEfetivos },
              { label: 'Vagas disponíveis na competência', valor: vagasDisponiveis },
              { label: 'Novas admissões efetivas', valor: novasAdmissoes },
              { label: 'Resultado', valor: ind_reposicao === null ? 'Não aplicável' : `${ind_reposicao.toFixed(1)}%`, destaque: true },
            ]} />
            <DrilldownFormula texto={
              vagasDisponiveis > 0
                ? `${novasAdmissoes} admissões efetivas ÷ [(5.000 − ${ativosAbertura}) + ${desligamentosEfetivos}] × 100 = ${ind_reposicao.toFixed(1)}%`
                : `(5.000 − ${ativosAbertura}) + ${desligamentosEfetivos} = 0 vagas disponíveis → Não aplicável`
            } />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', fontFamily: 'var(--font-family)' }}>
              Aproximação metodológica: o CSV de origem não distingue transferências internas de admissões e
              desligamentos efetivos — toda admissão e todo desligamento ocorridos dentro da competência são
              tratados como efetivos para este cálculo.
            </p>
            <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-family)' }}>
              Novas admissões consideradas
            </p>
            <div style={{ marginBottom: '20px' }}>
              <DrilldownLista colunas={['Nome', 'Município', 'Data', 'Situação']} linhas={registrosNovasAdmissoes.map(linhaRegistro)} />
            </div>
            <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-family)' }}>
              Desligamentos efetivos considerados
            </p>
            <DrilldownLista colunas={['Nome', 'Município', 'Data', 'Situação']} linhas={registrosDesligamentosEfetivos.map(linhaRegistro)} />
          </>
        )}

        {drill === 'vagas' && (
          <>
            <DrilldownComposicao itens={[
              { label: 'Vagas ocupadas', valor: jovensAtivos },
              { label: 'Capacidade', valor: VAGAS_TOTAL.toLocaleString('pt-BR') },
              { label: 'Resultado', valor: `${ind_vagas.toFixed(1)}%`, destaque: true },
            ]} />
            <DrilldownFormula texto={`${jovensAtivos} vagas ocupadas ÷ ${VAGAS_TOTAL.toLocaleString('pt-BR')} vagas × 100 = ${ind_vagas.toFixed(1)}%`} />
          </>
        )}
      </IndicatorDrilldown>
    </div>
  )
}
