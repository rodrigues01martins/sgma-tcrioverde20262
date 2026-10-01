import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LedgerEntry } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function normalizeDateInput(value: string): string {
  const str = String(value || '').trim();
  if (!str) return new Date().toLocaleDateString('pt-BR');
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? new Date().toLocaleDateString('pt-BR') : parsed.toLocaleDateString('pt-BR');
}

export function formatDateForInput(dateStr: string): string {
  const normalized = normalizeDateInput(dateStr);
  const [d, m, y] = normalized.split('/');
  return y && m && d ? `${y}-${m}-${d}` : '';
}

export function formatDateForSort(dateStr: string): number {
  const [d, m, y] = String(dateStr).split('/');
  if (!d || !m || !y) return 0;
  return new Date(`${y}-${m}-${d}T00:00:00`).getTime();
}

export function getMonthKey(dateStr: string): string {
  const [d, m, y] = String(dateStr || '').split('/');
  return y && m ? `${y}-${m}` : '';
}

export function getMonthLabel(monthKey: string): string {
  if (!monthKey) return 'Todos';
  const [y, m] = monthKey.split('-');
  const dt = new Date(`${y}-${m}-01T00:00:00`);
  return dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function getSafePercent(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return (part / total) * 100;
}

// Quanto já foi gasto num item do Plano de Trabalho, opcionalmente
// excluindo um lançamento específico (usado ao editar/analisar uma
// despesa já existente, para não contar o próprio valor duas vezes).
// Extraído de App.tsx (era só o callback passado ao EditModal) para
// ser reutilizado também em Ledger.tsx/DespesaDetail — mesma fórmula,
// um único lugar.
export function getSpentForItem(entries: LedgerEntry[], itemCode: string, excludeId?: string): number {
  return entries
    .filter(e => e.itemCode === itemCode && e.id !== excludeId)
    .reduce((acc, e) => acc + e.amount, 0);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo PDF.'));
    reader.readAsDataURL(file);
  });
}
