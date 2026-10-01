import { matchMetadataField, matchQuestionHeader, buildQuestionAliasIndex } from '../normalizers/headerNormalizer'

// ============================================================
// VALIDAÇÃO ESTRUTURAL DO CSV — Pesquisas de Satisfação / Pós-Programa
// ============================================================
// Segue a estratégia da seção 19: TIPO DA PESQUISA (já escolhido pelo
// usuário antes de anexar o arquivo) + HEADER NORMALIZADO/ALIAS +
// POSIÇÃO ESPERADA (validação secundária, nunca única) + QUANTIDADE DE
// QUESTÕES. Nunca faz fuzzy matching (seção 18).
//
// Dois níveis de erro (seção 38):
// - ESTRUTURAL (arquivo inteiro): instrumento incorreto, quantidade
//   incompatível, coluna obrigatória não reconhecida, IDs duplicados no
//   arquivo, arquivo ilegível/vazio — bloqueia a importação inteira.
// - POR LINHA: ID ausente numa linha específica, código inválido numa
//   pergunta usada em indicador — exclui APENAS aquela linha (reportada
//   como "Erros" no resumo da seção 40), sem impedir a confirmação das
//   demais linhas válidas.
export function validarEstruturaCsv(schema, dados) {
  const erros = []
  const avisos = []

  if (!dados || dados.length === 0) {
    erros.push({ chave: 'sem_registros', mensagem: 'O arquivo não contém nenhum registro (só cabeçalho ou conteúdo vazio).' })
    return { ok: false, erros, avisos, colunaPorHeader: new Map() }
  }

  const headers = Object.keys(dados[0])
  const aliasIndex = buildQuestionAliasIndex(schema)
  const colunaPorHeader = new Map() // header bruto -> { tipo: 'metadado'|'questao', campo }
  const questoesReconhecidas = new Map() // questionId -> { header, position }

  headers.forEach((header, indice) => {
    // Questão do schema tem prioridade sobre metadado automático: "Id" e
    // "Hora de conclusão" nunca coincidem com uma questão real, mas
    // "Email"/"Nome" são palavras únicas que podem colidir com um rótulo
    // curto de questão (ex.: Mentor/Responsável Q2 = "Nome") — nesse
    // caso a questão explicitamente definida no schema vence.
    const questao = matchQuestionHeader(header, aliasIndex)
    if (questao) {
      colunaPorHeader.set(header, { tipo: 'questao', campo: questao })
      if (questoesReconhecidas.has(questao.id)) {
        erros.push({
          chave: 'questao_ambigua',
          mensagem: `A coluna "${header}" e outra coluna do arquivo foram ambas reconhecidas como a mesma questão (${questao.id.toUpperCase()}) — cabeçalho ambíguo.`,
        })
      }
      questoesReconhecidas.set(questao.id, { header, position: indice })
      return
    }
    const metadado = matchMetadataField(header)
    if (metadado) {
      colunaPorHeader.set(header, { tipo: 'metadado', campo: metadado })
      return
    }
    // Coluna não reconhecida — tolerada como aviso, nunca bloqueia
    // sozinha (pode ser um metadado extra do Forms sem uso no sistema).
    avisos.push({ chave: 'coluna_nao_reconhecida', mensagem: `Coluna não reconhecida e ignorada: "${header}".` })
  })

  // Metadados obrigatórios (seção 10): sourceResponseId (Id) e Hora de
  // conclusão precisam existir; os demais são tolerados quando ausentes
  // (seção 9) e não podem quebrar o reconhecimento.
  const metadadosReconhecidos = new Set(
    [...colunaPorHeader.values()].filter(c => c.tipo === 'metadado').map(c => c.campo.key)
  )
  ;['sourceResponseId', 'completedAt'].forEach(chaveObrigatoria => {
    if (!metadadosReconhecidos.has(chaveObrigatoria)) {
      erros.push({
        chave: 'metadado_obrigatorio_ausente',
        mensagem: chaveObrigatoria === 'sourceResponseId'
          ? 'Coluna obrigatória "Id" (identificador único da resposta do Forms) não foi reconhecida no arquivo.'
          : 'Coluna obrigatória "Hora de conclusão" não foi reconhecida no arquivo.',
      })
    }
  })

  // Todas as questões do schema precisam ter sido reconhecidas — se
  // faltar alguma, BLOQUEAR (seção 18: "Se uma coluna obrigatória não
  // for reconhecida: BLOQUEAR a importação").
  const questoesFaltantes = schema.questions.filter(q => !questoesReconhecidas.has(q.id))
  if (questoesFaltantes.length > 0) {
    erros.push({
      chave: 'questoes_nao_reconhecidas',
      mensagem: `${questoesFaltantes.length} questão(ões) do instrumento "${schema.label}" não foram reconhecidas no arquivo: ${questoesFaltantes.map(q => q.aliases[0]).join(', ')}. Verifique se o CSV corresponde ao instrumento selecionado.`,
    })
  }

  // Quantidade canônica (seção 20) — validada depois de remover
  // metadados automáticos, nunca pelo total bruto de colunas.
  if (questoesReconhecidas.size !== schema.expectedQuestionCount) {
    erros.push({
      chave: 'quantidade_questoes_incompativel',
      mensagem: `Quantidade de questões reconhecidas (${questoesReconhecidas.size}) é diferente da esperada para "${schema.label}" (${schema.expectedQuestionCount}). O arquivo pode não corresponder a este instrumento.`,
    })
  }

  // Posição — validação SECUNDÁRIA (seção 19): compara a ORDEM RELATIVA
  // das questões reconhecidas entre si, nunca o índice absoluto da
  // coluna — os metadados do Forms (Id, Hora de início/conclusão,
  // Email, Nome) sempre precedem as questões, então o índice bruto de
  // Q1 nunca é 0 na prática; comparar contra `position - 1` gerava
  // aviso falso em toda questão, mesmo com o arquivo perfeitamente
  // ordenado. Diverge vira aviso único, nunca bloqueia sozinho.
  const ordemEsperada = schema.questions.map(q => q.id)
  const ordemEncontrada = [...questoesReconhecidas.entries()]
    .sort((a, b) => a[1].position - b[1].position)
    .map(([id]) => id)
  const mesmaOrdem = ordemEncontrada.length === ordemEsperada.length &&
    ordemEncontrada.every((id, i) => id === ordemEsperada[i])
  if (!mesmaOrdem) {
    avisos.push({
      chave: 'ordem_divergente',
      mensagem: 'A ordem das questões reconhecidas no arquivo é diferente da ordem esperada pelo schema — apenas aviso, não impede a importação (a identificação de cada questão continua sendo feita pelo texto do cabeçalho, não pela posição).',
    })
  }

  // IDs duplicados no arquivo — erro estrutural (seção 38).
  const idHeader = [...colunaPorHeader.entries()].find(([, c]) => c.tipo === 'metadado' && c.campo.key === 'sourceResponseId')?.[0]
  if (idHeader) {
    const contagem = new Map()
    dados.forEach(linha => {
      const id = (linha[idHeader] ?? '').toString().trim()
      if (!id) return
      contagem.set(id, (contagem.get(id) || 0) + 1)
    })
    const duplicados = [...contagem.entries()].filter(([, n]) => n > 1)
    if (duplicados.length > 0) {
      erros.push({
        chave: 'ids_duplicados',
        mensagem: `${duplicados.length} identificador(es) de resposta duplicado(s) dentro do próprio arquivo (ex.: ${duplicados.slice(0, 3).map(([id]) => id).join(', ')}).`,
      })
    }
  }

  return { ok: erros.length === 0, erros, avisos, colunaPorHeader }
}
