import React from 'react';
import { BudgetItem, LedgerEntry } from '../types';
import { fmt, cn } from '../lib/utils';
import { EmptyState } from './ui/EmptyState';
import { Badge } from './ui/Badge';
import { ClipboardList } from 'lucide-react';

interface BudgetStatusProps {
  entries: LedgerEntry[];
  budgetItems: BudgetItem[];
}

export const BudgetStatus: React.FC<BudgetStatusProps> = ({ entries, budgetItems }) => {
  const getSpentForItem = (itemCode: string) => {
    return entries
      .filter(e => e.itemCode === itemCode)
      .reduce((acc, e) => acc + e.amount, 0);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">Análise do Plano de Trabalho (Saldos)</h3>
        <p className="text-xs text-slate-500">Acompanhe o saldo disponível de cada item cadastrado.</p>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs md:text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="p-4 font-bold text-slate-500">Código / Item do Plano de Trabalho</th>
              <th className="p-4 font-bold text-slate-500 text-right">Previsto</th>
              <th className="p-4 font-bold text-slate-500 text-right">Executado</th>
              <th className="p-4 font-bold text-slate-500 text-right">Saldo</th>
              <th className="p-4 font-bold text-slate-500 text-center w-28 md:w-44">Progresso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {budgetItems.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState title="Nenhum item do Plano de Trabalho cadastrado." icon={<ClipboardList size={32} />} />
                </td>
              </tr>
            ) : budgetItems.map(item => {
              const totalGasto = getSpentForItem(item.id);
              const saldo = item.value - totalGasto;
              const percentReal = item.value > 0 ? (totalGasto / item.value) * 100 : 0;
              const percentBar = Math.min(percentReal, 100);
              const isCritical = item.value > 0 && (saldo <= 0 || (saldo / item.value) <= 0.1);
              const progressColor = percentReal > 100 ? 'bg-red-500' : isCritical ? 'bg-[#FCD951]' : 'bg-[#007770]';

              return (
                <tr key={item.id} className={cn("transition", isCritical ? "bg-[#FCD951]/10 hover:bg-[#FCD951]/15" : "hover:bg-slate-50")}>
                  <td className="p-4">
                    <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      <span>{item.id}</span>
                      {isCritical && <Badge variant="warning">Crítico</Badge>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[280px]">{item.desc}</div>
                  </td>
                  <td className="p-4 text-right text-slate-500 font-medium">{fmt.format(item.value)}</td>
                  <td className="p-4 text-right font-bold text-[#007770]">{fmt.format(totalGasto)}</td>
                  <td className={cn("p-4 text-right font-bold", saldo < 0 ? "text-red-600 bg-red-50" : isCritical ? "text-[#7a5c00]" : "text-emerald-600")}>
                    {fmt.format(saldo)}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn("h-full transition-all duration-1000", progressColor)}
                          style={{ width: `${percentBar}%` }}
                        />
                      </div>
                      <span className={cn("text-[10px] font-bold", isCritical ? "text-[#7a5c00]" : "text-slate-400")}>
                        {percentReal.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
