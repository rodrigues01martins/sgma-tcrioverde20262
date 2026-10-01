import Papa from 'papaparse'

// ============================================================
// PARÂMETROS FIXOS DO SISTEMA
// ============================================================
// VRM (Valor Estimado de Repasse Mensal) varia por competência — cada mês
// com valor próprio confirmado entra aqui explicitamente. Meses de 2026
// sem valor específico lançado ainda usam VRM_PADRAO_2026 (Jul-Dez/2026).
export const VRM_POR_COMPETENCIA = {
  '2026-04': 12413819.37,
  '2026-05': 11848229.76,
  '2026-06': 10213922.53,
}
export const VRM_PADRAO_2026 = 9953150.00  // Jul-Dez/2026
export const VL_UNIT_ORC     =    1956.54
export const VAL_APU_CF      = 5000 * 395.040636  // 1.975.203,18

export function getVRM(periodoISO) {
  if (!periodoISO) return VRM_PADRAO_2026
  return VRM_POR_COMPETENCIA[periodoISO] ?? VRM_PADRAO_2026
}

// ============================================================
// PARSE DO CSV
// ============================================================
// Retorna também `errors` (linhas malformadas que o PapaParse já detecta
// — antes eram descartadas silenciosamente) para a camada de validação
// poder exibi-las, sem reprocessar o arquivo.
export function parseCSVCompleto(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: '',
      encoding: 'UTF-8',
      complete: (results) => resolve({ data: results.data, errors: results.errors || [], meta: results.meta }),
      error: (error) => reject(error)
    })
  })
}

// Mantido para compatibilidade — mesmo parse, só devolve as linhas.
export async function parseCSV(file) {
  const { data } = await parseCSVCompleto(file)
  return data
}

// ============================================================
// HELPERS DE TIPO
// ============================================================
export function parseMoeda(valor) {
  if (!valor) return 0
  const s = String(valor).replace(/[R$\s.]/g, '').replace(',', '.')
  return parseFloat(s) || 0
}

export function parseNum(valor) {
  if (!valor) return 0
  return parseFloat(String(valor).replace(',', '.')) || 0
}

export function parseData(str) {
  if (!str || !String(str).trim()) return null
  const s = String(str).trim()
  const parts = s.split(/[\/\-\.]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) return new Date(+parts[0], +parts[1] - 1, +parts[2])
    return new Date(+parts[2], +parts[1] - 1, +parts[0])
  }
  const d = new Date(s)
  return isNaN(d) ? null : d
}

export function formatMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2
  }).format(valor)
}

export function formatarPeriodo(str) {
  if (!str) return '—'
  const [ano, mes] = str.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[+mes - 1]}/${ano}`
}

// ============================================================
// IDADE EXATA EM ANOS
// ============================================================
function calcularIdadeAnos(dataNasc, dataRef) {
  if (!dataNasc || !dataRef) return 0
  let anos = dataRef.getFullYear() - dataNasc.getFullYear()
  const mesRef  = dataRef.getMonth()
  const mesNasc = dataNasc.getMonth()
  const diaRef  = dataRef.getDate()
  const diaNasc = dataNasc.getDate()
  if (mesRef < mesNasc || (mesRef === mesNasc && diaRef < diaNasc)) anos--
  return anos
}

// ============================================================
// CÁLCULOS DOS KPIs — linha a linha
// ============================================================
export function calcularKPIs(row) {

  // Datas
  const data_base    = parseData(row.data_base)
  const data_nasc    = parseData(row.data_nasc)
  const data_admin   = parseData(row.data_admin)
  const data_termino = parseData(row.data_termino)
  const data_demiss  = parseData(row.data_demiss)

  // 1. Idade completa em anos — referência: data_demiss se houver, senão data_base
  const data_ref_idade = data_demiss || data_base
  const idade_anos = calcularIdadeAnos(data_nasc, data_ref_idade)

  // 2. Jovem acima de 18 anos com PCD ou Estabilidade
  const oc_estab = parseNum(row.oc_estab)
  const oc_pcds  = parseNum(row.oc_pcds)
  const acima_18_protegido = (idade_anos >= 18 && (oc_estab === 1 || oc_pcds === 1)) ? 1 : 0

  // 3. Jovem que atingiu exatamente 18 anos no mês de referência
  const aniversario_no_mes = (data_nasc && data_base &&
    calcularIdadeAnos(data_nasc, data_base) === 18 &&
    data_nasc.getMonth() === data_base.getMonth()) ? 1 : 0

  // 3b. Recebeu Vale Transporte no mês — mesma semântica já usada no mapa
  // de VT do Gerencial (oc_vt é valor monetário, não booleano): recebeu
  // se o valor lançado for maior que zero.
  const recebeu_vt = (parseMoeda(row.oc_vt) > 0) ? 1 : 0

  // 4. Tempo de contrato em meses
  const meses_contrato = (data_admin && data_termino)
    ? Math.floor((data_termino - data_admin) / (1000 * 60 * 60 * 24 * 30))
    : 0

  // 5. Frequência
  const freq_base    = parseNum(row.freq_base)
  const freq_util    = parseNum(row.freq_util)
  const falta_trab   = parseNum(row.falta_trab)
  const falta_desc   = parseNum(row.falta_desc)
  const falta_curs   = parseNum(row.falta_curs)
  const total_faltas = falta_trab + falta_desc + falta_curs

  // 6. Valor salário pelos dias trabalhados
  const sal_ref     = parseMoeda(row.sal_ref)
  const vl_sal_trab = (sal_ref / 30) * freq_util

  // 7. Valor líquido do salário
  const vl_liq_sal =
    vl_sal_trab +
    parseMoeda(row.fgts) +
    parseMoeda(row.ferias) +
    parseMoeda(row.terc_ferias) +
    parseMoeda(row.dec_terc) +
    parseMoeda(row.fgts_sprov)

  // 8. Valor Apurado Custeio Variável — todos os aprendizes, sem multiplicador
  const val_apu_cv =
    vl_liq_sal +
    parseMoeda(row.serv_platead) +
    parseMoeda(row.serv_trilhas) +
    parseMoeda(row.serv_platinsc) +
    parseMoeda(row.serv_metod) +
    parseMoeda(row.serv_ti) +
    parseMoeda(row.serv_comunic) +
    parseMoeda(row.servi_locti) +
    parseMoeda(row.apoio_soc) +
    parseMoeda(row.serv_monit) +
    parseMoeda(row.serv_espec) +
    parseMoeda(row.serv_agviagens) +
    parseMoeda(row.serv_adm_ind) +
    parseMoeda(row.mat_cons) +
    parseMoeda(row.serv_manut_pred) +
    parseMoeda(row.serv_terc_pj)

  // 9. Valor Apurado Itens Não Continuados
  const val_apu_inc =
    parseMoeda(row.oc_pcmso) +
    parseMoeda(row.oc_cracha) +
    parseMoeda(row.oc_uniforme) +
    parseMoeda(row.oc_vt) +
    parseMoeda(row.oc_seguro_vida)

  // 10. Contratos iniciados/finalizados no mês
  const contrato_iniciado = (data_admin && data_base &&
    data_admin.getMonth() === data_base.getMonth() &&
    data_admin.getFullYear() === data_base.getFullYear()) ? 1 : 0

  const contrato_finalizado = (data_demiss && data_base &&
    data_demiss.getMonth() === data_base.getMonth() &&
    data_demiss.getFullYear() === data_base.getFullYear()) ? 1 : 0

  // 11. Evasão — demitido antes da data_termino (saída antecipada)
  const evasao = (
    contrato_finalizado === 1 &&
    data_demiss && data_termino &&
    data_demiss < data_termino
  ) ? 1 : 0

  return {
    idade_anos,
    acima_18_protegido,
    aniversario_no_mes,
    recebeu_vt,
    oc_estab,
    oc_pcds,
    meses_contrato,
    freq_base,
    freq_util,
    falta_trab,
    falta_desc,
    falta_curs,
    total_faltas,
    sal_ref,
    vl_sal_trab,
    vl_liq_sal,
    val_apu_cv,
    val_apu_inc,
    contrato_iniciado,
    contrato_finalizado,
    evasao
  }
}

// ============================================================
// CÁLCULOS AGREGADOS — sobre toda a base
// ============================================================
export function calcularAgregados(dadosComKPIs, periodoISO) {
  const vrm = getVRM(periodoISO)

  const total_aprendizes      = dadosComKPIs.length
  const contratos_iniciados   = dadosComKPIs.filter(r => r._kpis.contrato_iniciado === 1).length
  const contratos_finalizados = dadosComKPIs.filter(r => r._kpis.contrato_finalizado === 1).length
  const municipios            = new Set(dadosComKPIs.map(r => r.cidade)).size
  const lotacoes              = new Set(dadosComKPIs.map(r => r.lotacao)).size
  const total_acima_18_prot   = dadosComKPIs.filter(r => r._kpis.acima_18_protegido === 1).length
  const total_aniversario_mes = dadosComKPIs.filter(r => r._kpis.aniversario_no_mes === 1).length
  const total_evasoes         = dadosComKPIs.filter(r => r._kpis.evasao === 1).length

  const val_apu_cv   = dadosComKPIs.reduce((s, r) => s + r._kpis.val_apu_cv, 0)
  const val_apu_cf   = VAL_APU_CF
  const val_apu_inc  = dadosComKPIs.reduce((s, r) => s + r._kpis.val_apu_inc, 0)
  const val_apu_mens = val_apu_cv + val_apu_cf + val_apu_inc
  const val_apu_dif  = vrm - val_apu_mens

  return {
    total_aprendizes,
    contratos_iniciados,
    contratos_finalizados,
    municipios,
    lotacoes,
    total_acima_18_prot,
    total_aniversario_mes,
    total_evasoes,
    val_apu_cv,
    val_apu_cf,
    val_apu_inc,
    val_apu_mens,
    val_apu_dif,
    vrm
  }
}

// ============================================================
// ENRIQUECER DADOS
// ============================================================
export function enriquecerDados(dados) {
  return dados.map(row => ({
    ...row,
    _kpis: calcularKPIs(row)
  }))
}

// ============================================================
// SELEÇÃO POR FLAG — usada tanto pelos agregados (calcularAgregados)
// quanto pelo drill-down dos indicadores, para garantir que a lista
// mostrada seja EXATAMENTE o que compõe a contagem do KPI (mesmo array
// de entrada, mesmo flag, nunca um filtro paralelo).
// ============================================================
export function selecionarPorFlag(dadosComKPIs, flag) {
  return dadosComKPIs.filter(r => r._kpis[flag] === 1)
}
