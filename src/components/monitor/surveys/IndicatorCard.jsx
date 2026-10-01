import KpiCard from '../ui/KpiCard'
import IndicatorTooltip from '../../../features/indicators-general/IndicatorTooltip'

// ============================================================
// CARD DE INDICADOR DAS PESQUISAS (seção 72)
// ============================================================
// Sempre mostra código, nome, percentual, meta, situação da meta (em
// TEXTO, nunca só pela cor — seção 72/86) e numerador/denominador. Nunca
// recalcula nada: `indicator` é exatamente o objeto devolvido pelo motor
// (buildIndicatorResult), o MESMO que alimenta o detalhamento (seção 105
// — Card = Detalhe).
function formatarMeta(target, targetOperator) {
  const simbolo = targetOperator === '<=' ? '≤' : '≥'
  return `Meta ${simbolo} ${target}%`
}

function situacaoMeta(indicator) {
  if (indicator.value === null) return 'Sem dados suficientes'
  return indicator.targetMet ? 'Meta atingida' : 'Meta não atingida'
}

export default function IndicatorCard({ indicator, onDetails }) {
  const cor = indicator.value === null ? 'blue' : indicator.targetMet ? 'green' : 'danger'
  const valorFormatado = indicator.value === null ? '—' : `${indicator.value.toFixed(1)}%`
  const sub = indicator.value === null
    ? 'Nenhuma resposta válida para este indicador ainda.'
    : `${formatarMeta(indicator.target, indicator.targetOperator)} · ${situacaoMeta(indicator)} · ${indicator.numerator} de ${indicator.denominator} respostas favoráveis`

  return (
    <KpiCard
      label={<><IndicatorTooltip code={indicator.code} /> — {indicator.name}</>}
      value={valorFormatado}
      sub={sub}
      color={cor}
      onDetails={onDetails}
    />
  )
}
