// ============================================================
// AVALIAÇÃO DE META — comum aos 44 registros do Painel Geral
// ============================================================
// Nunca substitui ausência de dado por zero (seção 23/25): um resultado
// null vira "Não apurado", nunca "Meta não atingida". Indicadores sem
// meta binária (operador 'comparativo' ou 'nenhum', como QAA e as 4
// análises transversais) viram "Não aplicável" — a comparação segue
// disponível na ficha técnica, só não produz um veredito de meta.
export function avaliarSituacao(valor, meta, operador) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Não apurado';
  if (operador === 'comparativo' || operador === 'nenhum') return 'Não aplicável';

  const metaNum = parseFloat(String(meta).replace(/[^\d,.-]/g, '').replace(',', '.'));
  if (Number.isNaN(metaNum)) return 'Não aplicável';

  switch (operador) {
    case '>=': return valor >= metaNum ? 'Meta atingida' : 'Meta não atingida';
    case '<=': return valor <= metaNum ? 'Meta atingida' : 'Meta não atingida';
    case '>': return valor > metaNum ? 'Meta atingida' : 'Meta não atingida';
    case '<': return valor < metaNum ? 'Meta atingida' : 'Meta não atingida';
    default: return 'Não aplicável';
  }
}

// Formata um valor numérico segundo a convenção brasileira (seção 22) —
// vírgula decimal, sem separador de milhar para percentuais (0-100).
export function formatarValor(valor, unidade) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Não apurado';
  if (unidade === 'Quantidade') return valor.toLocaleString('pt-BR');
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
