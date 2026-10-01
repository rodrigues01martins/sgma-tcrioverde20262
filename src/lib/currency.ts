// Máscara monetária brasileira (separador de milhares "." e decimal ",")
// usada pelos campos de valor de Acompanhamento Financeiro (Novo
// Lançamento, Cadastrar Itens e edição de lançamento).
//
// Funções puras, sem dependência de React — testáveis isoladamente e
// reutilizadas pelo hook `useCurrencyInput` (src/hooks/useCurrencyInput.ts).
//
// Modelo: em vez de tratar a entrada como "centavos que empurram os
// dígitos" (o que produziria 5000000 -> 50.000,00), guardamos a parte
// inteira e a parte decimal como dígitos separados, com a vírgula
// decimal só passando a existir de fato quando o usuário a digita (ou
// quando um valor numérico já persistido é carregado no campo).

export interface CurrencyParts {
  /** Dígitos da parte inteira, sem zeros à esquerda (pode ser ''). */
  intPart: string;
  /** Dígitos da parte decimal já digitados (0 a 2 caracteres). */
  decPart: string;
  /** Se a vírgula decimal já foi digitada/carregada. */
  commaTyped: boolean;
}

const EMPTY_PARTS: CurrencyParts = { intPart: '', decPart: '', commaTyped: false };

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+/, '');
}

function groupThousands(digits: string): string {
  const safe = digits || '0';
  return safe.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Extrai dígitos e, no máximo, uma vírgula decimal de uma string
 * qualquer — usada tanto para cada tecla digitada quanto para colagem de
 * valores (seção 6): "5.000.000,00", "R$ 5.000.000,00", "5000000" etc.
 * Pontos de milhar, "R$", espaços e qualquer outro caractere são
 * ignorados; apenas a primeira vírgula conta como separador decimal e,
 * depois dela, no máximo dois dígitos são aproveitados.
 */
export function sanitizeCurrencyInput(raw: string): CurrencyParts {
  let intPart = '';
  let decPart = '';
  let commaTyped = false;
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      if (!commaTyped) intPart += ch;
      else if (decPart.length < 2) decPart += ch;
    } else if (ch === ',' && !commaTyped) {
      commaTyped = true;
    }
  }
  return { intPart: stripLeadingZeros(intPart), decPart, commaTyped };
}

/** Converte um valor numérico já persistido (ex.: vindo do Firestore) nas partes de exibição. */
export function partsFromNumber(value: number | null | undefined): CurrencyParts {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_PARTS;
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  return { intPart: stripLeadingZeros(intPart) || '0', decPart, commaTyped: true };
}

/** Formata as partes para exibição no campo (o que o usuário vê). */
export function formatCurrencyParts({ intPart, decPart, commaTyped }: CurrencyParts): string {
  if (!intPart && !commaTyped) return '';
  const formattedInt = groupThousands(intPart);
  if (!commaTyped) return `${formattedInt},00`;
  return `${formattedInt},${decPart}`;
}

/** Converte as partes no número usado nos cálculos/persistência (nunca a string formatada). */
export function partsToNumber({ intPart, decPart, commaTyped }: CurrencyParts): number | null {
  if (!intPart && (!commaTyped || !decPart)) return null;
  const safeInt = intPart || '0';
  const safeDec = (commaTyped ? decPart : '00').padEnd(2, '0').slice(0, 2);
  return parseFloat(`${safeInt}.${safeDec}`);
}

/** Completa os centavos com zero à direita ao concluir a edição (seção 4: "1250,5" -> "1250,50"). */
export function finalizeCurrencyParts(parts: CurrencyParts): CurrencyParts {
  if (!parts.commaTyped) return parts;
  return { ...parts, decPart: parts.decPart.padEnd(2, '0').slice(0, 2) };
}

/** Conta dígitos/vírgula (caracteres "significativos") antes de uma posição — o ponto de milhar nunca conta. */
export function countSignificantChars(str: string): number {
  let count = 0;
  for (const ch of str) {
    if ((ch >= '0' && ch <= '9') || ch === ',') count++;
  }
  return count;
}

/** Caminho inverso: posição, no texto formatado, logo após o N-ésimo caractere significativo. */
export function positionAfterSignificant(formatted: string, n: number): number {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i];
    if ((ch >= '0' && ch <= '9') || ch === ',') {
      count++;
      if (count === n) return i + 1;
    }
  }
  return formatted.length;
}
