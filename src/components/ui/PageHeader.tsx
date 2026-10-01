import React from 'react';

// Cabeçalho de página do lado "nativo" — consolida o padrão
// ícone-em-caixa + título + descrição, encontrado identicamente em
// BudgetItems.tsx e UserManagement.tsx (e reutilizável em outras).

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  [key: string]: any;
}

export function PageHeader({ icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="bg-[var(--native-primary-light)] p-2.5 rounded-xl text-[var(--native-primary)] shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
