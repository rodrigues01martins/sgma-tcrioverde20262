import { parseNum } from './csvService'

// ============================================================
// CLASSIFICAÇÃO DE VÍNCULO POR COMPETÊNCIA — módulo único
// ============================================================
// Deriva, por registro, os dois indicadores de headcount que respondem
// a perguntas diferentes:
//
//   jovemAtivo         — uso GERENCIAL (posição final da competência)
//   apuravelFinanceiro — uso FINANCEIRO (gerou custo em algum dia do mês)
//
// REGRA DE OURO: apuravelFinanceiro NUNCA é derivado de jovemAtivo. Um
// jovem admitido em 03/08 e desligado em 19/08 não é ativo, mas os dias
// trabalhados e os custos fixos do período (uniforme, crachá, PCMSO,
// seguro de vida, VT) permanecem integralmente na apuração financeira.
//
// A classificação roda UMA vez, na ingestão (ver classificarBase). Os
// componentes de UI devem apenas ler os flags já calculados — nenhum
// componente deve recalcular status a partir das datas brutas.
// ============================================================

// ------------------------------------------------------------
// PARSE DE DATA — dd/mm/aaaa explícito, nunca new Date(string)
// ------------------------------------------------------------
// new Date(string) é ambíguo (depende de locale/engine para strings como
// "03/08/2026") e foi a causa-raiz de datas trocadas em outras partes do
// sistema. Aqui o formato é sempre dd/mm/aaaa e a data é validada de fato
// (ex.: "31/02/2026" não vira "03/03/2026" silenciosamente).
export function parseDataBR(str) {
  if (!str || !String(str).trim()) return null
  const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null

  const dia = Number(m[1])
  const mes = Number(m[2])
  const ano = Number(m[3])
  const data = new Date(ano, mes - 1, dia)

  const valida = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia
  return valida ? data : null
}

// ------------------------------------------------------------
// JANELA DO MÊS — sempre derivada da data_base do próprio registro
// ------------------------------------------------------------
function inicioDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth(), 1)
}

function fimDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0)
}

function dentroDaJanela(data, inicioMes, fimMes) {
  return !!data && data >= inicioMes && data <= fimMes
}

function competenciaISO(data) {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${data.getFullYear()}-${mes}`
}

// ------------------------------------------------------------
// CLASSIFICAÇÃO DE UM REGISTRO — função pura
// ------------------------------------------------------------
export function classificarRegistro(row) {
  const data_base    = parseDataBR(row.data_base)
  const data_admin   = parseDataBR(row.data_admin)
  const data_termino = parseDataBR(row.data_termino)
  const data_demiss  = parseDataBR(row.data_demiss)

  if (!data_base) {
    throw new Error(
      `Registro sem data_base válida em dd/mm/aaaa (seq ${row.seq ?? '?'}). ` +
      `data_base define a competência e não pode faltar.`
    )
  }

  const inicioMes = inicioDoMes(data_base)
  const fimMes    = fimDoMes(data_base)
  const competencia = competenciaISO(data_base)

  const admitidoNoMes  = dentroDaJanela(data_admin, inicioMes, fimMes)
  const desligadoNoMes = dentroDaJanela(data_demiss, inicioMes, fimMes)
  const terminoNoMes   = dentroDaJanela(data_termino, inicioMes, fimMes)

  // Término de contrato registrado no mês, mas sem baixa de desligamento
  // lançada — falha de cadastro que precisa ser corrigida manualmente.
  const inconsistenciaCadastral = terminoNoMes && !data_demiss

  const encerradoNoMes = desligadoNoMes || terminoNoMes

  // GERENCIAL: quem terminou a competência vinculado ao programa.
  const jovemAtivo = !!data_admin && data_admin <= fimMes && !encerradoNoMes

  // FINANCEIRO: quem teve vínculo em QUALQUER dia da janela do mês, ainda
  // que desligado no meio. Nunca filtrar por jovemAtivo aqui.
  const apuravelFinanceiro =
    !!data_admin && data_admin <= fimMes &&
    (!data_demiss || data_demiss >= inicioMes)

  // Retrato do motivo de encerramento (mutuamente exclusivo, só relevante
  // quando encerradoNoMes é true).
  let situacao = 'ativo'
  if (inconsistenciaCadastral) {
    situacao = 'inconsistencia_cadastral'
  } else if (admitidoNoMes && desligadoNoMes) {
    situacao = 'admitido_e_desligado_no_mes'
  } else if (desligadoNoMes && data_termino && data_demiss < data_termino) {
    situacao = 'desligamento_antecipado'
  } else if (desligadoNoMes) {
    situacao = 'termino_contrato'
  }

  // Recorte de dias efetivamente vinculados dentro da janela do mês —
  // útil para auditoria; os valores financeiros em si vêm de freq_util,
  // já apurada na folha, não são recalculados a partir dessas datas.
  const inicioEfetivo = data_admin && data_admin > inicioMes ? data_admin : inicioMes
  const fimEfetivo     = data_demiss && data_demiss < fimMes ? data_demiss : fimMes

  return {
    competencia,
    jovemAtivo,
    apuravelFinanceiro,
    admitidoNoMes,
    desligadoNoMes,
    terminoNoMes,
    situacao,
    inicioEfetivo,
    fimEfetivo,
    inconsistenciaCadastral,
  }
}

// ------------------------------------------------------------
// INGESTÃO — roda a classificação UMA vez sobre a base inteira
// ------------------------------------------------------------
// Cada registro recebe seus flags em `_classificacao`. Deve ser chamada
// uma única vez, no momento em que os dados chegam (upload ou leitura do
// Firestore), nunca dentro de um componente de UI a cada render.
export function classificarBase(dados) {
  return dados.map(row => ({
    ...row,
    _classificacao: classificarRegistro(row),
  }))
}

// ------------------------------------------------------------
// HELPERS DE AGREGAÇÃO — a escolha da base nunca é implícita
// ------------------------------------------------------------
// Base GERENCIAL: só quem está jovemAtivo na competência (posição final).
// Uso: headcount gerencial, "jovens ativos em <data_base>".
// `?.` protege competências salvas antes da Etapa 3 (sem `_classificacao`
// persistido) — elas não contam aqui nem em baseFinanceira, em vez de
// quebrar a página; precisam ser reimportadas para exibir os novos KPIs.
export function baseGerencial(dadosClassificados) {
  return dadosClassificados.filter(r => r._classificacao?.jovemAtivo)
}

// Base FINANCEIRA: todo mundo que gerou custo na competência, mesmo quem
// foi desligado no meio do mês. NUNCA derivar isso de baseGerencial().
export function baseFinanceira(dadosClassificados) {
  return dadosClassificados.filter(r => r._classificacao?.apuravelFinanceiro)
}

// ------------------------------------------------------------
// RECONCILIAÇÃO — checagens obrigatórias a cada importação
// ------------------------------------------------------------
// Rodam sobre a base já classificada, antes de persistir. Qualquer falha
// deve bloquear o fechamento da competência e mostrar o motivo — nunca
// salvar dados que não batem silenciosamente.
export function reconciliar(dadosClassificados) {
  const totalBase      = dadosClassificados.length
  const jovensAtivos   = baseGerencial(dadosClassificados).length
  const jovensApurados = baseFinanceira(dadosClassificados).length

  // Independente de `situacao` — soma direto os dois flags brutos de
  // encerramento, para que a checagem não dependa da mesma lógica que
  // está sendo verificada.
  const desligadosNoMes = dadosClassificados.filter(r =>
    r._classificacao?.desligadoNoMes || r._classificacao?.terminoNoMes
  ).length

  const somaFreqUtilTodos = dadosClassificados.reduce((s, r) => s + parseNum(r.freq_util), 0)
  const somaFreqUtilFinanceira = baseFinanceira(dadosClassificados)
    .reduce((s, r) => s + parseNum(r.freq_util), 0)

  const checks = [
    {
      chave: 'headcount',
      descricao: 'jovensAtivos + desligadosNoMes deve fechar com o total da base',
      ok: jovensAtivos + desligadosNoMes === totalBase,
      detalhe:
        `${jovensAtivos} ativos + ${desligadosNoMes} encerrados no mês = ` +
        `${jovensAtivos + desligadosNoMes} (esperado ${totalBase}). Se não bater, há registro ` +
        `com data_admin inválida ou posterior à data_base — nem ativo, nem encerrado.`,
    },
    {
      chave: 'apuracao_minima',
      descricao: 'jovensApurados não pode ser menor que jovensAtivos',
      ok: jovensApurados >= jovensAtivos,
      detalhe:
        `${jovensApurados} apurados, ${jovensAtivos} ativos. Todo jovem ativo tem que ` +
        `aparecer também na base financeira — revise data_demiss anterior ao início da competência.`,
    },
    {
      chave: 'frequencia',
      descricao: 'soma de freq_util da base financeira deve ser igual à da base inteira',
      ok: somaFreqUtilFinanceira === somaFreqUtilTodos,
      detalhe:
        `${somaFreqUtilFinanceira} (base financeira) vs ${somaFreqUtilTodos} (base inteira). ` +
        `Se não bater, há freq_util lançada para alguém fora da base apurável.`,
    },
  ]

  return {
    ok: checks.every(c => c.ok),
    checks,
    resumo: { totalBase, jovensAtivos, jovensApurados, desligadosNoMes },
  }
}
