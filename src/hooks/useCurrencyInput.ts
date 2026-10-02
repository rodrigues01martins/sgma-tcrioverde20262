import { useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  sanitizeCurrencyInput,
  partsFromNumber,
  formatCurrencyParts,
  partsToNumber,
  finalizeCurrencyParts,
  countSignificantChars,
  positionAfterSignificant,
  type CurrencyParts,
} from '../lib/currency';

interface UseCurrencyInputOptions {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
}

// Hook reutilizado por Novo Lançamento, Cadastrar Itens e Editar
// Lançamento (seção 7 da manutenção) — mantém a lógica da máscara num
// único lugar, deixando cada tela livre para manter sua própria marcação
// visual (algumas usam o TextInput do Design System, outra usa um
// <input> próprio). O valor numérico exposto ao chamador (via
// onValueChange) é sempre o valor "de verdade", nunca a string
// formatada — quem persiste/calcula continua trabalhando só com number.
export function useCurrencyInput({ value, onValueChange }: UseCurrencyInputOptions) {
  const [parts, setParts] = useState<CurrencyParts>(() => partsFromNumber(value));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCursorRef = useRef<number | null>(null);

  const displayValue = formatCurrencyParts(parts);

  // Reposiciona o cursor depois que o React aplica o novo valor formatado
  // — sem isso, o cursor salta para o fim do campo a cada dígito (seção 5).
  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = pendingCursorRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      pendingCursorRef.current = null;
    }
  }, [displayValue]);

  function commit(next: CurrencyParts) {
    setParts(next);
    onValueChange(partsToNumber(next));
  }

  function applyRaw(raw: string, significantBefore: number) {
    const next = sanitizeCurrencyInput(raw);
    const newDisplay = formatCurrencyParts(next);
    pendingCursorRef.current = positionAfterSignificant(newDisplay, significantBefore);
    commit(next);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    inputRef.current = e.target;
    const cursorPos = e.target.selectionStart ?? e.target.value.length;
    const significantBefore = countSignificantChars(e.target.value.slice(0, cursorPos));
    applyRaw(e.target.value, significantBefore);
  }

  // Backspace/Delete sobre o ponto de milhar são, por si só, um "não-efeito"
  // visual (o ponto some e volta a aparecer ao reformatar) — para o
  // backspace funcionar como o usuário espera, apagamos também o dígito
  // vizinho ao ponto (seção 5).
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    inputRef.current = input;
    const { selectionStart, selectionEnd, value: raw } = input;
    if (selectionStart === null || selectionEnd === null || selectionStart !== selectionEnd) return;

    if (e.key === 'Backspace' && selectionStart >= 2 && raw[selectionStart - 1] === '.') {
      e.preventDefault();
      const significantBefore = countSignificantChars(raw.slice(0, selectionStart - 2));
      applyRaw(raw.slice(0, selectionStart - 2) + raw.slice(selectionStart), significantBefore);
      return;
    }
    if (e.key === 'Delete' && selectionStart < raw.length - 1 && raw[selectionStart] === '.') {
      e.preventDefault();
      const significantBefore = countSignificantChars(raw.slice(0, selectionStart));
      applyRaw(raw.slice(0, selectionStart) + raw.slice(selectionStart + 2), significantBefore);
      return;
    }
  }

  // Ao concluir a edição, completa os centavos com zero à direita
  // (seção 4: "1250,5" -> "1250,50").
  function onBlur() {
    const finalized = finalizeCurrencyParts(parts);
    if (finalized.decPart !== parts.decPart) commit(finalized);
  }

  // Resincroniza o campo com um valor externo — usado nos pontos
  // explícitos em que o formulário troca de contexto (reset após salvar,
  // abrir um registro diferente para edição), evitando o problema
  // clássico de inputs controlados com máscara: reagir a toda mudança de
  // `value` apagaria o que o usuário está digitando no meio da edição.
  function reset(resetValue: number | null = null) {
    pendingCursorRef.current = null;
    const next = partsFromNumber(resetValue);
    setParts(next);
    onValueChange(partsToNumber(next));
  }

  return {
    fieldProps: {
      value: displayValue,
      onChange,
      onKeyDown,
      onBlur,
      inputMode: 'decimal' as const,
    },
    reset,
  };
}
