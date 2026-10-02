// ============================================================
// VALIDAÇÃO DA IMPORTAÇÃO CSV — Apuração Mensal / Upload
// ============================================================
// Camada só de leitura/diagnóstico, sem persistência: roda ANTES da
// gravação (salvarPeriodo) e usa exatamente os mesmos dados que serão
// gravados — nunca reparseia nem reclassifica com outra regra.
//
// Cada resultado é ERRO BLOQUEANTE (impede confirmar) ou AVISO (visível,
// não impede). A lista abaixo reflete o que o restante do código
// realmente usa, não uma suposição de schema:
//   - data_base é a ÚNICA coluna que quebra a classificação se ausente/
//     inválida (ver classificarRegistro, que lança exceção nesse caso).
//   - as demais são lidas via parseNum/parseMoeda, que retornam 0 em
//     silêncio se a coluna não existir — por isso viram aviso, não erro.

export const COLUNA_OBRIGATORIA = 'data_base'

// Colunas efetivamente lidas por calcularKPIs/calcularAgregados
// (csvService.js) — usadas para avisar quando ausentes, não para
// bloquear (o sistema já tolera a ausência, só que zera o cálculo).
export const COLUNAS_USADAS_EM_CALCULO = [
  'data_nasc', 'data_admin', 'data_termino', 'data_demiss',
  'oc_estab', 'oc_pcds',
  'freq_base', 'freq_util', 'falta_trab', 'falta_desc', 'falta_curs',
  'sal_ref', 'fgts', 'ferias', 'terc_ferias', 'dec_terc', 'fgts_sprov',
  'serv_platead', 'serv_trilhas', 'serv_platinsc', 'serv_metod', 'serv_ti',
  'serv_comunic', 'servi_locti', 'apoio_soc', 'serv_monit', 'serv_espec',
  'serv_agviagens', 'serv_adm_ind', 'mat_cons', 'serv_manut_pred', 'serv_terc_pj',
  'oc_pcmso', 'oc_cracha', 'oc_uniforme', 'oc_vt', 'oc_seguro_vida',
  'cidade', 'lotacao',
]

// ------------------------------------------------------------
// Arquivo — antes mesmo de tentar parsear.
// ------------------------------------------------------------
export function validarArquivo(file) {
  const erros = []
  if (!file) {
    erros.push({ chave: 'arquivo_ausente', mensagem: 'Nenhum arquivo selecionado.' })
    return { ok: false, erros }
  }
  const nome = file.name || ''
  const extensaoValida = /\.csv$/i.test(nome)
  if (!extensaoValida) {
    erros.push({
      chave: 'extensao_invalida',
      mensagem: `Formato inválido — esperado .csv, arquivo selecionado: ${nome || 'sem nome'}`,
    })
  }
  if (file.size === 0) {
    erros.push({ chave: 'arquivo_vazio', mensagem: 'O arquivo selecionado está vazio (0 bytes).' })
  }
  return { ok: erros.length === 0, erros }
}

// ------------------------------------------------------------
// Estrutura — depois de parsear, antes de gravar. Usa o MESMO array
// que será gravado (nunca reparseia com outra lógica).
// ------------------------------------------------------------
export function validarEstrutura(dados, errosParse = []) {
  const erros = []
  const avisos = []

  if (!dados || dados.length === 0) {
    erros.push({ chave: 'sem_registros', mensagem: 'O arquivo não contém nenhum registro (só cabeçalho ou conteúdo vazio).' })
    return { ok: false, erros, avisos, colunasAusentes: [] }
  }

  const colunas = Object.keys(dados[0])

  if (!colunas.includes(COLUNA_OBRIGATORIA)) {
    erros.push({
      chave: 'coluna_obrigatoria_ausente',
      mensagem: `Coluna obrigatória ausente: ${COLUNA_OBRIGATORIA.toUpperCase()} — essa coluna define a competência de cada registro e não pode faltar.`,
    })
  }

  const colunasAusentes = COLUNAS_USADAS_EM_CALCULO.filter(c => !colunas.includes(c))
  if (colunasAusentes.length > 0) {
    avisos.push({
      chave: 'colunas_calculo_ausentes',
      mensagem: `${colunasAusentes.length} coluna(s) usada(s) nos cálculos não foram encontradas e serão tratadas como zero: ${colunasAusentes.join(', ')}.`,
    })
  }

  if (errosParse.length > 0) {
    avisos.push({
      chave: 'linhas_malformadas',
      mensagem: `${errosParse.length} linha(s) com estrutura inconsistente foram identificadas pelo leitor de CSV (ex.: número de colunas diferente do cabeçalho).`,
    })
  }

  // Heurística leve: caractere de substituição Unicode indica problema
  // de codificação (arquivo não estava em UTF-8). Amostra pequena — não
  // varre a base inteira.
  const amostra = dados.slice(0, 50)
  const temReplacementChar = amostra.some(row => Object.values(row).some(v => typeof v === 'string' && v.includes('�')))
  if (temReplacementChar) {
    avisos.push({
      chave: 'possivel_encoding',
      mensagem: 'Foram encontrados caracteres inválidos em algumas células — o arquivo pode não estar salvo em UTF-8.',
    })
  }

  return { ok: erros.length === 0, erros, avisos, colunasAusentes }
}

// ------------------------------------------------------------
// Competência — usa a mesma classificação que already roda antes de
// salvar (dadosClassificados[i]._classificacao.competencia), nunca
// reparseia data_base com outra regra.
// ------------------------------------------------------------
export function verificarCompetenciaDivergente(dadosClassificados, periodoSelecionado) {
  const contagem = {}
  for (const row of dadosClassificados) {
    const c = row._classificacao?.competencia
    if (!c) continue
    contagem[c] = (contagem[c] || 0) + 1
  }
  const competencias = Object.keys(contagem)
  if (competencias.length === 0) return null

  const majoritaria = competencias.reduce((a, b) => (contagem[a] >= contagem[b] ? a : b))
  if (majoritaria === periodoSelecionado) return null

  return {
    chave: 'competencia_divergente',
    periodoSelecionado,
    competenciaEncontrada: majoritaria,
    registrosNaCompetenciaEncontrada: contagem[majoritaria],
    totalRegistros: dadosClassificados.length,
    mensagem: `Competência selecionada (${periodoSelecionado}) é diferente da competência predominante nos dados (${majoritaria}, em ${contagem[majoritaria]} de ${dadosClassificados.length} registros).`,
  }
}
