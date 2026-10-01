import React from 'react';

// Botão reutilizável do lado "nativo" (Financeiro/Administração/shell) —
// consolida os ~19 botões "primary" que cada tela reimplementava com a
// mesma cor hardcoded. Mesma filosofia de variantes do Button já usado
// no lado "monitor" (components/monitor/ui/Button.jsx), adaptada para
// className/Tailwind em vez de estilo inline.
//
// Não estende React.ButtonHTMLAttributes: o projeto não tem
// @types/react instalado, então esse tipo não carrega membros reais
// aqui — como o restante do app, declaramos as props usadas
// explicitamente.

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold whitespace-nowrap transition-all ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--native-focus)] focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--native-primary)] text-white shadow-lg hover:bg-[var(--native-primary-hover)]',
  secondary: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
  danger: 'bg-[var(--native-danger)] text-white hover:bg-red-700',
  ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
