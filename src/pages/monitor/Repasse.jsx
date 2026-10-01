import { useState, useEffect } from 'react'
import { buscarPeriodos, buscarDadosPeriodo } from '../../services/firestoreService'
import { enriquecerDados, calcularAgregados, formatMoeda, formatarPeriodo, VL_UNIT_ORC } from '../../services/csvService'
import { baseFinanceira } from '../../services/classificacaoService'
import KpiCard from '../../components/monitor/ui/KpiCard'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'
import { Select } from '../../components/monitor/ui/Input'
import Button from '../../components/monitor/ui/Button'

const SvgIcon = ({ path, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 -960 960 960" fill="var(--brand-primary)">
    <path d={path} />
  </svg>
)

const ICONS = {
  money:  'M441-120v-86q-53-12-91.5-46T293-348l74-30q15 48 44.5 73t77.5 25q41 0 69.5-18.5T587-356q0-35-22-55.5T463-458q-86-27-118-64.5T313-614q0-65 42-101t86-41v-84h80v84q50 8 82.5 36.5T651-650l-74 32q-12-32-34-48t-60-16q-44 0-67 19.5T393-614q0 33 30 52t104 40q69 20 104.5 63.5T667-358q0 71-42 108t-104 46v84h-80Z',
  calc:   'M320-240h60v-80h80v-60h-80v-80h-60v80h-80v60h80v80Zm200-30h200v-60H520v60Zm0-100h200v-60H520v60Zm44-152 56-56 56 56 42-42-56-56 56-56-42-42-56 56-56-56-42 42 56 56-56 56 42 42ZM160-120q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v560q0 33-23.5 56.5T800-120H160Z',
  fixed:  'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z',
  var:    'M22 12h-4l-3 9L9 3l-3 9H2',
  shield: 'M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Z',
  diff:   'M480-120 200-272v-240L40-600l440-240 440 240v320h-80v-276l-80 44v240L480-120Z',
  nocont: 'M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Z',
}

export default function Repasse() {
  const [periodos, setPeriodos] = useState([])
  const [periodoSel, setPeriodoSel] = useState('')
  const [agregados, setAgregados] = useState(null)
  const [dadosEnriquecidos, setDadosEnriquecidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    buscarPeriodos().then(ps => { setPeriodos(ps); if (ps.length) setPeriodoSel(ps[0].periodo) })
  }, [])

  useEffect(() => {
    if (!periodoSel) return
    setLoading(true)
    buscarDadosPeriodo(periodoSel).then(dados => {
      const enriquecidos = enriquecerDados(dados)
      setDadosEnriquecidos(enriquecidos)
      // Regra de ouro: agregador financeiro nunca filtra por jovemAtivo.
      // Base explícita = quem gerou custo na competência (apuravelFinanceiro).
      setAgregados(calcularAgregados(baseFinanceira(enriquecidos), periodoSel))
      setLoading(false)
    })
  }, [periodoSel])

  if (loading) return <Loader message="Calculando indicadores financeiros..." />
  if (!agregados) return <EmptyState title="Nenhum dado encontrado" description="Faça upload de um CSV na aba Upload primeiro." />

  const vl_medio_jovem = agregados.total_aprendizes > 0
    ? agregados.val_apu_mens / agregados.total_aprendizes
    : 0

  const positivo = agregados.val_apu_dif >= 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
            Repasse Mensal
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
            Apuração do repasse — {formatarPeriodo(periodoSel)}
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Select value={periodoSel} onChange={e => setPeriodoSel(e.target.value)} style={{ width: '220px' }}>
            {periodos.map(p => (
              <option key={p.periodo} value={p.periodo}>{formatarPeriodo(p.periodo)} ({p.total})</option>
            ))}
          </Select>
          <Button variant="primary" onClick={() => window.print()}>Imprimir / Salvar PDF</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <KpiCard icon={<SvgIcon path={ICONS.money} />} label="Valor Estimado de Repasse (VRM)" value={formatMoeda(agregados.vrm)} sub="Repasse Mensal Programado" color="blue" />
        <KpiCard icon={<SvgIcon path={ICONS.fixed} />} label="VRM por Jovem" value={formatMoeda(VL_UNIT_ORC)} sub="valor fixo unitário" color="blue" />
        <KpiCard icon={<SvgIcon path={ICONS.calc} />} label="Valor Médio por Jovem" value={formatMoeda(vl_medio_jovem)} sub="VAR ÷ jovens apurados na competência" color="teal" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <KpiCard icon={<SvgIcon path={ICONS.var} />} label="Custeio Variável (VACV)" value={formatMoeda(agregados.val_apu_cv)} sub="itens × jovens apurados na competência" color="teal" />
        <KpiCard icon={<SvgIcon path={ICONS.fixed} />} label="Custeio Fixo (VACF)" value={formatMoeda(agregados.val_apu_cf)} sub="5 mil × R$ 395,04" color="blue" />
        <KpiCard icon={<SvgIcon path={ICONS.nocont} />} label="Itens Não Continuados (VAINC)" value={formatMoeda(agregados.val_apu_inc)} sub="ocorrências do período" color="warn" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard icon={<SvgIcon path={ICONS.shield} />} label="Valor Apurado Repasse (VAR)" value={formatMoeda(agregados.val_apu_mens)} sub="VACV + VACF + VAINC" color="green" />
        <KpiCard
          icon={<SvgIcon path={ICONS.diff} />}
          label="Valor Apurado Diferença (VAD)"
          value={formatMoeda(Math.abs(agregados.val_apu_dif))}
          sub={positivo ? '✓ VRM > VAR — saldo positivo' : '⚠ VAR > VRM — saldo negativo'}
          color={positivo ? 'green' : 'danger'}
        />
      </div>
    </div>
  )
}
