import { extractNumericCode } from '../schemas/common'
import { resolveMunicipio } from '../normalizers/municipioNormalizer'

// ============================================================
// NORMALIZAÇÃO DAS LINHAS — CSV validado → respostas normalizadas
// ============================================================
// Usa a MESMA `colunaPorHeader` já resolvida pela validação estrutural
// (nunca reinterpreta cabeçalhos). Cada linha vira um objeto pronto para
// persistência (seção 42), já sem os campos descartados por privacidade
// (seção 36): CPF, nome/email automático do Forms nunca chegam aqui.
//
// Retorna também `erros` POR LINHA (seção 38: ID ausente, código
// inválido em pergunta usada em indicador) — linhas com erro não entram
// em `validas`, mas não impedem a importação das demais.
export function normalizarLinhas(schema, dados, colunaPorHeader) {
  const validas = []
  const erros = []
  const avisos = []

  // Índice reverso: por campo (metadado ou questionId) -> header bruto.
  const headerPorMetadado = new Map()
  const headerPorQuestao = new Map()
  colunaPorHeader.forEach((info, header) => {
    if (info.tipo === 'metadado') headerPorMetadado.set(info.campo.key, header)
    else headerPorQuestao.set(info.campo.id, header)
  })

  dados.forEach((linha, indiceLinha) => {
    const numeroLinha = indiceLinha + 1 // 1-based, para mensagens ao usuário
    const sourceResponseId = (linha[headerPorMetadado.get('sourceResponseId')] ?? '').toString().trim()

    if (!sourceResponseId) {
      erros.push({ linha: numeroLinha, chave: 'id_ausente', mensagem: `Linha ${numeroLinha}: identificador da resposta (Id) está vazio — linha ignorada.` })
      return
    }

    const completedAt = (linha[headerPorMetadado.get('completedAt')] ?? '').toString().trim() || null
    const startedAt = headerPorMetadado.has('startedAt') ? (linha[headerPorMetadado.get('startedAt')] ?? '').toString().trim() || null : null
    const lastModifiedAt = headerPorMetadado.has('lastModifiedAt') ? (linha[headerPorMetadado.get('lastModifiedAt')] ?? '').toString().trim() || null : null

    const answers = {}
    let municipality = null
    let linhaTemErro = false

    schema.questions.forEach(questao => {
      if (questao.discard) return // CPF, nome — nunca persistidos (seção 36)

      const header = headerPorQuestao.get(questao.id)
      const valorBruto = linha[header]

      if (questao.type === 'municipio') {
        const resolvido = resolveMunicipio(valorBruto)
        answers[questao.id] = resolvido
        if (!resolvido.vazio && !resolvido.reconhecido) {
          avisos.push({
            linha: numeroLinha, chave: 'municipio_nao_reconhecido',
            mensagem: `Linha ${numeroLinha} (${sourceResponseId}): município "${resolvido.raw}" não reconhecido na base oficial de Goiás.`,
          })
        }
        if (questao.id === schema.municipioQuestionId) {
          municipality = resolvido
        }
        return
      }

      if (questao.type === 'date') {
        answers[questao.id] = (valorBruto ?? '').toString().trim() || null
        return
      }

      if (questao.type === 'categorical') {
        answers[questao.id] = (valorBruto ?? '').toString().trim() || null
        return
      }

      // type === 'coded' — usa o parser específico da questão quando
      // definido (ex.: Mentor Q11, cuja opção de N/A vem sem prefixo
      // numérico no CSV real), senão o extrator genérico.
      const codigo = questao.parse ? questao.parse(valorBruto) : extractNumericCode(valorBruto)
      const bruto = (valorBruto ?? '').toString().trim()
      // Código inválido só é erro bloqueante DA LINHA quando a questão é
      // usada em algum indicador (scored) e o valor não estava vazio
      // (célula vazia é resposta ausente legítima, não código inválido).
      if (questao.scored && bruto !== '' && codigo === null) {
        erros.push({
          linha: numeroLinha, chave: 'codigo_invalido',
          mensagem: `Linha ${numeroLinha} (${sourceResponseId}): valor "${bruto}" em ${questao.id.toUpperCase()} não pôde ser interpretado como código de resposta válido.`,
        })
        linhaTemErro = true
      }
      answers[questao.id] = codigo
    })

    if (linhaTemErro) return

    validas.push({
      surveyType: schema.surveyType,
      schemaVersion: schema.schemaVersion,
      sourceResponseId,
      completedAt,
      startedAt,
      lastModifiedAt,
      municipalityCode: municipality?.codigoIbge ?? null,
      municipalityName: municipality?.nome ?? null,
      municipalityRaw: municipality?.reconhecido === false ? municipality.raw : null,
      answers,
    })
  })

  return { validas, erros, avisos }
}
