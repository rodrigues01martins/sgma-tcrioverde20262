import React from 'react';
import { fmt } from '../lib/utils';
import { KpiCard } from './ui/Card';

interface SummaryCardsProps {
  totalOrcado: number;
  totalExecutado: number;
  totalSaldo: number;
  percentTotal: number;
  criticalItems: number;
  totalRecords: number;
  lastAudit: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalOrcado,
  totalExecutado,
  totalSaldo,
  percentTotal,
  criticalItems,
  totalRecords,
  lastAudit
}) => {
  const cards = [
    { label: 'Total Previsto', value: fmt.format(totalOrcado), tone: 'neutral' as const },
    { label: 'Total Executado', value: fmt.format(totalExecutado), tone: 'primary' as const },
    { label: 'Saldo Disponível', value: fmt.format(totalSaldo), tone: 'success' as const },
    { label: '% Execução', value: `${percentTotal.toFixed(1)}%`, tone: 'warning' as const },
    { label: 'Itens Críticos', value: criticalItems.toString(), tone: 'danger' as const },
    { label: 'Registros', value: totalRecords.toString(), tone: 'neutral' as const },
    { label: 'Última Alteração', value: <span className="text-sm">{lastAudit}</span>, tone: 'neutral' as const },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4 mb-8">
      {cards.map((card, idx) => (
        <KpiCard key={idx} label={card.label} value={card.value} tone={card.tone} />
      ))}
    </div>
  );
};
