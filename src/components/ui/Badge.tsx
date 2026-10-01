import React from 'react';

// Badge/pill do lado "nativo" — consolida os pills de status (função do
// usuário, "você", "Crítico" etc.) que cada tela colorida manualmente.
//
// Props próprias e explícitas (sem extends de React.HTMLAttributes):
// o projeto não tem @types/react instalado, então esse tipo não
// carregaria membros reais aqui.

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-100 text-slate-500',
  primary: 'bg-[var(--native-primary-light)] text-[var(--native-primary)]',
  success: 'bg-emerald-50 text-[var(--native-success)]',
  warning: 'bg-[var(--native-warning-bg)]/30 text-[var(--native-warning-text)]',
  danger: 'bg-red-50 text-[var(--native-danger)]',
};

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export function Badge({ variant = 'neutral', icon, className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
