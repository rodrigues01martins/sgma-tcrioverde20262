// ============================================================
// EXPORTAÇÃO EXCEL — utilitário único, usado por qualquer modal de
// detalhamento (IndicatorListModal). Recebe a MESMA lista de registros e
// a MESMA definição de colunas já usadas para renderizar a tabela em
// tela — nunca recalcula nada, só formata para célula.
// ============================================================

// Monta a estrutura {cabecalhos, linhas} a partir dos registros e das
// colunas — separado do ExcelJS em si para ser testável sem gerar o
// binário (ver seção 61 da manutenção).
export function prepararLinhasExcel(registros, colunas) {
  return {
    cabecalhos: colunas.map(c => c.header),
    linhas: registros.map(r => colunas.map(c => c.excel(r))),
  }
}

// Nome de aba do Excel tem limite de 31 caracteres e não aceita
// : \ / ? * [ ].
function nomeAbaSeguro(nome) {
  return (nome || 'Dados').replace(/[:\\/?*[\]]/g, '').slice(0, 31)
}

export async function exportarParaExcel({ registros, colunas, nomeArquivo, nomeAba }) {
  const { cabecalhos, linhas } = prepararLinhasExcel(registros, colunas)

  // exceljs só é carregado quando alguém realmente exporta — evita
  // engordar o bundle principal para quem nunca usa a exportação.
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const planilha = workbook.addWorksheet(nomeAbaSeguro(nomeAba))

  planilha.addRow(cabecalhos)
  planilha.getRow(1).font = { bold: true }
  linhas.forEach(linha => planilha.addRow(linha))
  planilha.columns.forEach(col => { col.width = 22 })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
