import React from 'react';
import { Inbox } from 'lucide-react';

// Estado vazio do lado "nativo" — consolida as mensagens soltas em
// <td> ("Nenhum item cadastrado.", "Nenhum usuário encontrado.") num
// padrão único com ícone, título, descrição opcional e CTA opcional.

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  [key: string]: any;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
      <div className="text-slate-300 mb-1">{icon || <Inbox size={32} />}</div>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      {description && <p className="text-xs text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
