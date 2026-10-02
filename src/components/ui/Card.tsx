import React from 'react';

// Card genérico do lado "nativo" — consolida o container
// "bg-white border-slate-100 rounded-2xl shadow-sm" repetido em pelo
// menos 14 lugares (resumos, tabelas, formulários).
//
// Props próprias e explícitas (sem extends de React.HTMLAttributes):
// o projeto não tem @types/react instalado, então esse tipo não
// carregaria membros reais aqui.

interface CardProps {
  padded?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export function Card({ padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-100 rounded-2xl shadow-sm ${padded ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

type KpiTone = 'neutral' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';

const toneClass: Record<KpiTone, string> = {
  neutral: 'text-slate-800',
  muted: 'text-slate-400',
  primary: 'text-[var(--native-primary)]',
  success: 'text-[var(--native-success)]',
  warning: 'text-[var(--native-warning-text)]',
  danger: 'text-[var(--native-danger)]',
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  tone?: KpiTone;
  compact?: boolean;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  [key: string]: any;
}

// Card numérico padrão — consolida SummaryCards, os cards de resumo de
// UserManagement/BudgetItems e similares, que reimplementavam a mesma
// estrutura label/valor com pequenas variações de padding e tamanho.
//
// Quando recebe onClick, funciona também como atalho de filtro (ex.:
// resumo operacional de Acompanhar Despesa) — com estado "selecionado"
// visível sem depender só de cor (borda + anel de foco).
export function KpiCard({
  label, value, description, tone = 'neutral', compact = false, onClick, selected = false, className = '', ...rest
}: KpiCardProps) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      aria-pressed={interactive ? selected : undefined}
      className={`bg-white border rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${compact ? 'p-4' : 'p-6'} ${
        selected ? 'border-[var(--native-primary)] ring-2 ring-[var(--native-primary)]/20' : 'border-slate-100'
      } ${interactive ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--native-focus)]' : ''} ${className}`}
      {...rest}
    >
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <p className={`font-bold ${compact ? 'text-2xl' : 'text-xl'} ${toneClass[tone]}`}>{value}</p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
    </div>
  );
}
