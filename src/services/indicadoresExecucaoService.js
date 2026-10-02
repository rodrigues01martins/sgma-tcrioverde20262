import { baseGerencial, baseFinanceira, parseDataBR } from './classificacaoService'
import { enriquecerDados, calcularAgregados } from './csvService'
import { MUNICIPIOS_GOIAS, TOTAL_MUNICIPIOS_GOIAS, normalizeMunicipioName } from '../data/municipiosGoias'

// ============================================================
// INDICADORES DE EXECUÇÃO DO PROGRAMA — QAA, PVP, IFM, TEP, TRV, IAG
// ============================================================
// Reutiliza os MESMOS motores já usados por Frequencia.jsx/Alcance.jsx
// (classificacaoService + csvService + a base canônica dos 246
// municípios) — não duplica a classificação de vínculo nem a agregação
// financeira, só consome os mesmos flags já calculados.
//
// PVP e TRV seguem a definição homologada na "Memória PVP e TRV" da
// matriz oficial (capacidade permanente de 5.000 vagas). PVP já coincide
// com o card "Preenchimento de vagas" hoje existente em Frequencia.jsx
// (mesma fórmula: ativos no fechamento ÷ 5.000). TRV, porém, é uma
// fórmula NOVA em relação ao card "Reposição de vagas" hoje existente
// nessa mesma tela — aquele card usa contratos_iniciados ÷
// contratos_finalizados, uma fórmula diferente e anterior à
// homologação; ver ressalva no relatório desta manutenção.
export const CAPACIDADE_PROGRAMA = 5000

function inicioDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth(), 1)
}

// Ativo na ABERTURA do mês: já admitido antes do primeiro dia da
// competência e ainda não encerrado antes desse mesmo primeiro dia.
function ativoNaAberturaDoMes(row) {
  const data_base = parseDataBR(row.data_base)
  if (!data_base) return false
  const inicioMes = inicioDoMes(data_base)
  const data_admin = parseDataBR(row.data_admin)
  if (!data_admin || data_admin >= inicioMes) return false
  const data_demiss = parseDataBR(row.data_demiss)
  const data_termino = parseDataBR(row.data_termino)
  const encerradoAntesDaAbertura =
    (!!data_demiss && data_demiss < inicioMes) ||
    (!!data_termino && data_termino < inicioMes)
  return !encerradoAntesDaAbertura
}

// PVP e TRV — recebe a base já classificada (_classificacao presente em
// cada registro, gravado na ingestão) de UMA competência mensal.
export function calcularPVPeTRV(dadosClassificados) {
  if (!dadosClassificados || dadosClassificados.length === 0) {
    return { ativosFechamento: 0, ativosAbertura: 0, desligamentosEfetivos: 0, novasAdmissoes: 0, vagasDisponiveis: 0, pvp: null, trv: null }
  }

  const ativosFechamento = dadosClassificados.filter(r => r._classificacao?.jovemAtivo).length
  const desligamentosEfetivos = dadosClassificados.filter(r =>
    r._classificacao?.desligadoNoMes || r._classificacao?.terminoNoMes
  ).length
  const novasAdmissoes = dadosClassificados.filter(r => r._classificacao?.admitidoNoMes).length
  const ativosAbertura = dadosClassificados.filter(ativoNaAberturaDoMes).length

  const pvp = (ativosFechamento / CAPACIDADE_PROGRAMA) * 100

  const vagasDisponiveis = (CAPACIDADE_PROGRAMA - ativosAbertura) + desligamentosEfetivos
  const trv = vagasDisponiveis === 0 ? null : (novasAdmissoes / vagasDisponiveis) * 100

  return { ativosFechamento, ativosAbertura, desligamentosEfetivos, novasAdmissoes, vagasDisponiveis, pvp, trv }
}

// QAA — Quantidade de Aprendizes Ativos (headcount gerencial no fechamento).
export function calcularQAA(dadosClassificados) {
  return baseGerencial(dadosClassificados || []).length
}

// IFM — Índice de Frequência Mensal. Mesma fórmula usada em Frequencia.jsx:
// soma de freq_util sobre soma de freq_base, na base financeira.
export function calcularIFM(dadosComKPIsFinanceira) {
  const somaUtil = dadosComKPIsFinanceira.reduce((s, r) => s + (r._kpis?.freq_util || 0), 0)
  const somaBase = dadosComKPIsFinanceira.reduce((s, r) => s + (r._kpis?.freq_base || 0), 0)
  return somaBase > 0 ? (somaUtil / somaBase) * 100 : null
}

// TEP — Taxa de Evasão do Programa. Mesma fórmula usada em Frequencia.jsx:
// evasões ÷ jovens ativos no fechamento (agregados já vem de calcularAgregados).
export function calcularTEP(agregados, ativosFechamento) {
  return ativosFechamento > 0 ? (agregados.total_evasoes / ativosFechamento) * 100 : null
}

// IAG — Índice de Abrangência Geográfica. Mesma fórmula usada em Alcance.jsx:
// municípios com pelo menos 1 aprendiz ativo ÷ 246.
export function calcularIAG(dadosClassificados) {
  const ativos = baseGerencial(dadosClassificados || [])
  const cidadesNormalizadas = new Set(ativos.map(r => normalizeMunicipioName(r.cidade)).filter(Boolean))
  const municipiosAtendidos = MUNICIPIOS_GOIAS.filter(m => cidadesNormalizadas.has(normalizeMunicipioName(m.nome)))
  return (municipiosAtendidos.length / TOTAL_MUNICIPIOS_GOIAS) * 100
}

// Consolida os 6 indicadores de Execução do Programa para uma única
// competência mensal já carregada (dados brutos do Firestore, com
// _classificacao persistido na ingestão — classificarBase NÃO é chamado
// de novo aqui, só enriquecerDados, para obter os _kpis de frequência).
export function calcularIndicadoresExecucao(dadosBrutos, periodoISO) {
  if (!dadosBrutos || dadosBrutos.length === 0) return null

  const dadosComKPIs = enriquecerDados(dadosBrutos)
  const dadosFinanceiros = baseFinanceira(dadosComKPIs)
  const agregados = calcularAgregados(dadosFinanceiros, periodoISO)

  const { ativosFechamento, pvp, trv } = calcularPVPeTRV(dadosComKPIs)
  const qaa = calcularQAA(dadosComKPIs)
  const ifm = calcularIFM(dadosFinanceiros)
  const tep = calcularTEP(agregados, ativosFechamento)
  const iag = calcularIAG(dadosComKPIs)

  return { periodoISO, qaa, pvp, ifm, tep, trv, iag, ativosFechamento }
}
