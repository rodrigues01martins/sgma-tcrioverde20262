import { DrilldownComposicao, DrilldownFormula, DrilldownLista } from '../ui/IndicatorDrilldown'
import { computeAnswerDistribution } from '../../../features/surveys/indicators/calculateFavorableRate'

// ============================================================
// CONTEÚDO DO DETALHAMENTO DE UM INDICADOR (seção 75)
// ============================================================
// Mostra definição operacional, fórmula/questões, meta, numerador,
// denominador, respostas favoráveis, válidas, não aplicáveis e a
// distribuição bruta das alternativas — nunca dados pessoais (seção 75,
// último parágrafo). `indicator` é o MESMO objeto usado pelo Card
// (seção 105 — Card = Detalhe, nunca recalculado aqui).
function formatarMeta(target, targetOperator) {
  const simbolo = targetOperator === '<=' ? '≤' : '≥'
  return `${simbolo} ${target}%`
}

export default function IndicatorDetailContent({ indicator, docs }) {
  const distribuicao = indicator.questionIds
    ? computeAnswerDistribution(docs, indicator.questionIds, (doc, id) => doc.answers?.[id])
    : []

  return (
    <>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)', marginBottom: '16px' }}>
        {indicator.definition}
      </p>

      <DrilldownFormula texto={`Questões ${indicator.questionIds?.map(q => q.toUpperCase()).join(' + ')} — respostas favoráveis ÷ respostas válidas × 100`} />

      <DrilldownComposicao itens={[
        { label: 'Resultado', valor: indicator.value === null ? '—' : `${indicator.value.toFixed(1)}%`, destaque: true },
        { label: 'Meta', valor: formatarMeta(indicator.target, indicator.targetOperator) },
        { label: 'Situação da meta', valor: indicator.value === null ? 'Sem dados' : (indicator.targetMet ? 'Atingida' : 'Não atingida') },
        { label: 'Respostas favoráveis', valor: indicator.numerator },
        { label: 'Respostas válidas', valor: indicator.denominator },
        { label: 'Não aplicáveis', valor: indicator.naCount },
        { label: 'Inválidas/sem resposta', valor: indicator.invalidCount },
      ]} />

      {distribuicao.length > 0 && (
        <>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '8px' }}>
            Distribuição das alternativas
          </p>
          <DrilldownLista
            colunas={['Código da alternativa', 'Quantidade de respostas']}
            linhas={distribuicao.map(d => [d.codigo, d.quantidade])}
          />
        </>
      )}
    </>
  )
}
