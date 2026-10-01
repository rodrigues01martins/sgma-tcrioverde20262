import Tooltip from '../../components/monitor/ui/Tooltip'
import { INDICATOR_CATALOG } from './catalog'

// ============================================================
// NOME COMPLETO POR SIGLA — fonte única (seção 3 da manutenção de
// tooltips): a mesma matriz definitiva já usada no Painel Geral de
// Indicadores, nunca uma segunda lista de nomes espalhada pelos
// componentes.
// ============================================================
// Indicadores COMPLEMENTARES (fora dos 44 registros oficiais) cuja
// denominação metodológica já está documentada e visível no próprio
// aplicativo — nunca inventada. Siglas complementares SEM essa
// confirmação (ex.: ICL e ISLA da Visita In Loco, que só aparecem como
// abreviação em rótulos/cabeçalhos de tabela, sem nenhuma expansão
// registrada no código-fonte) ficam de fora deliberadamente.
const NOMES_COMPLEMENTARES = {
  TLA: 'Taxa de Locais Aptos',
}

const NOMES_POR_SIGLA = INDICATOR_CATALOG.reduce(
  (acc, item) => { acc[item.sigla] = item.nome; return acc },
  { ...NOMES_COMPLEMENTARES }
)

// Nome completo de uma sigla, ou undefined se não cadastrada — usado
// tanto pelo IndicatorTooltip quanto por telas que precisam do nome por
// extenso mesmo sem hover (ex.: coluna impressa do Painel Geral).
export function nomeIndicador(code) {
  return NOMES_POR_SIGLA[code]
}

// <IndicatorTooltip code="PVP" /> — mostra a sigla e, ao passar o mouse,
// focar via teclado ou tocar (mobile), o nome oficial completo. Sigla
// sem correspondência no catálogo é exibida normalmente, sem tooltip
// vazia nem nome inventado (seção 8).
export default function IndicatorTooltip({ code, className }) {
  const nome = nomeIndicador(code)
  if (!nome) return <span className={className}>{code}</span>
  return (
    <Tooltip label={nome} className={className}>
      {code}
    </Tooltip>
  )
}
