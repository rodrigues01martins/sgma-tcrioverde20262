import IndicatorTooltip from '../../../features/indicators-general/IndicatorTooltip'

// ============================================================
// COMPARAÇÃO TRANSVERSAL — lado a lado, NUNCA média entre públicos
// ============================================================
// Cada análise transversal (seção 67) apresenta os indicadores de cada
// público lado a lado. Esta peça só formata visualmente; nenhuma conta é
// feita aqui — cada `perspectiva.resultado` já vem pronto do motor.
function formatarMeta(target, targetOperator) {
  const simbolo = targetOperator === '<=' ? '≤' : '≥'
  return `Meta ${simbolo} ${target}%`
}

export default function TransversalComparison({ analysis }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', marginBottom: '4px' }}>
        {analysis.name}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '16px' }}>
        {analysis.definition}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {analysis.perspectivas.map(p => {
          const r = p.resultado
          const semDados = !r || r.value === null
          return (
            <div key={p.publico}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontWeight: 600 }}>
                  {p.publico} — {r ? <><IndicatorTooltip code={r.code} /> ({r.name})</> : <IndicatorTooltip code={p.indicatorCode} />}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: semDados ? 'var(--text-muted)' : 'var(--brand-primary)', fontFamily: 'var(--font-family)' }}>
                  {semDados ? 'Sem dados' : `${r.value.toFixed(1)}% · ${formatarMeta(r.target, r.targetOperator)} · ${r.targetMet ? 'Atingida' : 'Não atingida'}`}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-default)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${semDados ? 0 : r.value}%`, background: 'var(--brand-primary)', borderRadius: 'var(--radius-full)' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
