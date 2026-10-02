import React from 'react';

// Campos de formulário do lado "nativo" — consolida os 21 inputs que
// repetiam a mesma classe de foco/borda caractere-por-caractere.
//
// O código já usa, de forma intencional, duas aparências de campo:
// "outlined" (borda cinza, fundo branco — ex.: EditModal, busca de
// usuários) e "filled" (fundo cinza-claro, sem borda — ex.: Login,
// Itens do Plano de Trabalho). Preservamos as duas como variantes em
// vez de forçar uma só, para não alterar a aparência atual das telas.
//
// Não estende React.InputHTMLAttributes/etc.: o projeto não tem
// @types/react instalado, então esses tipos não carregam membros reais
// aqui — por isso o restante do app também sempre declara props
// próprias explícitas em vez de estender tipos DOM do React.

type FieldVariant = 'outlined' | 'filled';

const labelClass = 'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1';
const errorClass = 'mt-1 text-xs text-[var(--native-danger)]';

function controlClass(variant: FieldVariant, hasError: boolean, extra = '') {
  const focus = hasError
    ? 'focus:ring-2 focus:ring-[var(--native-danger)]'
    : 'focus:ring-2 focus:ring-[var(--native-focus)]';
  const shape =
    variant === 'filled'
      ? 'bg-slate-50 border-none'
      : `bg-white border ${hasError ? 'border-[var(--native-danger)]' : 'border-slate-200'}`;
  return `w-full rounded-xl p-3 text-sm outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${shape} ${focus} ${extra}`;
}

interface FieldWrapperProps {
  label?: string;
  helperText?: string;
  error?: string;
  id?: string;
  children: (describedBy: string | undefined) => React.ReactNode;
}

function FieldWrapper({ label, helperText, error, id, children }: FieldWrapperProps) {
  const describedBy = error ? `${id}-error` : helperText ? `${id}-helper` : undefined;
  return (
    <div>
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      )}
      {children(describedBy)}
      {error ? (
        <p id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="mt-1 text-xs text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

interface TextInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  variant?: FieldVariant;
  id?: string;
  className?: string;
  [key: string]: any;
}

export function TextInput({
  label, helperText, error, variant = 'outlined', id, className = '', ...props
}: TextInputProps) {
  return (
    <FieldWrapper label={label} helperText={helperText} error={error} id={id}>
      {describedBy => (
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${controlClass(variant, !!error)} ${className}`}
          {...props}
        />
      )}
    </FieldWrapper>
  );
}

interface SelectProps {
  label?: string;
  helperText?: string;
  error?: string;
  variant?: FieldVariant;
  id?: string;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export function Select({
  label, helperText, error, variant = 'outlined', id, className = '', children, ...props
}: SelectProps) {
  return (
    <FieldWrapper label={label} helperText={helperText} error={error} id={id}>
      {describedBy => (
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${controlClass(variant, !!error, 'appearance-none')} ${className}`}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  );
}

interface TextareaProps {
  label?: string;
  helperText?: string;
  error?: string;
  variant?: FieldVariant;
  id?: string;
  className?: string;
  [key: string]: any;
}

export function Textarea({
  label, helperText, error, variant = 'outlined', id, className = '', ...props
}: TextareaProps) {
  return (
    <FieldWrapper label={label} helperText={helperText} error={error} id={id}>
      {describedBy => (
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${controlClass(variant, !!error, 'min-h-[80px]')} ${className}`}
          {...props}
        />
      )}
    </FieldWrapper>
  );
}
