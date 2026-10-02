import React, { useState } from 'react';
import { ClipboardList, Edit, Trash2, FileWarning } from 'lucide-react';
import { BudgetItem, LedgerEntry } from '../types';
import { fmt, formatDateForSort, getSpentForItem } from '../lib/utils';
import { PageHeader } from './ui/PageHeader';
import { KpiCard } from './ui/Card';
import { Badge } from './ui/Badge';
import { TextInput, Select } from './ui/FormField';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { DespesaDetail, STATUS_META } from './DespesaDetail';

// "Acompanhar Despesa" — fila de despesas para análise do Auditor.
// A lista serve só para localizar o registro (Documento/Fornecedor/
// Item/Data/Valor/Situação); dados completos, contexto do Plano de
// Trabalho, documento e a análise (situação + manifestação) ficam no
// modal DespesaDetail, aberto por linha/ação "Analisar".

type Status = LedgerEntry['approvalStatus'];
const ALL_STATUSES: Status[] = ['Em analise', 'Pendente', 'Aprovado', 'Desaprovado'];

interface LedgerProps {
  entries: LedgerEntry[];
  budgetItems: BudgetItem[];
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onUpdateComment?: (id: string, comment: string) => void;
  canDelete: boolean;
  isAdmin: boolean;
}

export function Ledger({
  entries,
  budgetItems,
  onEdit,
  onDelete,
  onStatusChange,
  onUpdateComment,
  canDelete,
  isAdmin,
}: LedgerProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterItemCode, setFilterItemCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortMode, setSortMode] = useState('desc');
  const [filterStatus, setFilterStatus] = useState<Status | 'Todos'>('Todos');
  const [analysingEntryId, setAnalysingEntryId] = useState<string | null>(null);
  // Deriva da lista viva (não guarda a entrada em si): assim o modal
  // sempre reflete o status/comentário mais recentes vindos do Firestore,
  // inclusive logo após salvar a própria análise.
  const analysingEntry = analysingEntryId ? entries.find(e => e.id === analysingEntryId) || null : null;

  const categories = [...new Set(budgetItems.map(i => i.category))];

  const hasFilters = !!(search || filterCategory || filterItemCode || dateFrom || dateTo || filterStatus !== 'Todos');

  // Filtros aplicados exceto situação — usados para os contadores do
  // resumo operacional, que também funcionam como atalho de filtro.
  const baseFiltered = entries.filter(e => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      (e.supplier || '').toLowerCase().includes(q) ||
      (e.nf || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q);
    const matchCategory = !filterCategory || e.category === filterCategory;
    const matchItem = !filterItemCode || e.itemCode === filterItemCode;
    const ts = formatDateForSort(e.date);
    const matchFrom = !dateFrom || ts >= new Date(dateFrom).getTime();
    const matchTo = !dateTo || ts <= new Date(dateTo).getTime() + 86400000 - 1;
    return matchSearch && matchCategory && matchItem && matchFrom && matchTo;
  });

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = baseFiltered.filter(e => e.approvalStatus === s).length;
    return acc;
  }, {} as Record<Status, number>);

  const filtered = baseFiltered
    .filter(e => filterStatus === 'Todos' || e.approvalStatus === filterStatus)
    .sort((a, b) => {
      if (sortMode === 'asc') return formatDateForSort(a.date) - formatDateForSort(b.date);
      if (sortMode === 'amount_desc') return b.amount - a.amount;
      if (sortMode === 'amount_asc') return a.amount - b.amount;
      return formatDateForSort(b.date) - formatDateForSort(a.date);
    });

  const analysingBudgetItem = analysingEntry ? budgetItems.find(i => i.id === analysingEntry.itemCode) : undefined;
  const analysingSpentBefore = analysingEntry ? getSpentForItem(entries, analysingEntry.itemCode, analysingEntry.id) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList size={28} />}
        title="Acompanhar Despesa"
        description="Consulte e analise as despesas registradas no projeto."
      />

      {/* ── Resumo operacional — dobra como atalho de filtro por situação ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          compact
          label="Total de despesas"
          value={baseFiltered.length}
          selected={filterStatus === 'Todos'}
          onClick={() => setFilterStatus('Todos')}
        />
        {ALL_STATUSES.map(s => (
          <KpiCard
            key={s}
            compact
            label={STATUS_META[s].label}
            value={counts[s]}
            tone={s === 'Aprovado' ? 'success' : s === 'Desaprovado' ? 'danger' : s === 'Pendente' ? 'warning' : 'neutral'}
            selected={filterStatus === s}
            onClick={() => setFilterStatus(s)}
          />
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <TextInput
              label="Buscar"
              placeholder="Fornecedor, NF ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="min-w-[170px]">
            <Select
              label="Categoria"
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setFilterItemCode(''); }}
            >
              <option value="">Todas</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          <div className="min-w-[200px] flex-1 max-w-xs">
            <Select
              label="Item do Plano"
              value={filterItemCode}
              onChange={e => setFilterItemCode(e.target.value)}
            >
              <option value="">Todos</option>
              {budgetItems
                .filter(item => !filterCategory || item.category === filterCategory)
                .map(item => (
                  <option key={item.id} value={item.id}>
                    {item.id} — {item.desc.length > 40 ? item.desc.slice(0, 40) + '…' : item.desc}
                  </option>
                ))}
            </Select>
          </div>

          <div className="min-w-[140px]">
            <TextInput label="De" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="min-w-[140px]">
            <TextInput label="Até" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          <div className="min-w-[160px]">
            <Select label="Ordenar por" value={sortMode} onChange={e => setSortMode(e.target.value)}>
              <option value="desc">Mais recentes</option>
              <option value="asc">Mais antigos</option>
              <option value="amount_desc">Maior valor</option>
              <option value="amount_asc">Menor valor</option>
            </Select>
          </div>

          <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap pb-3 ml-auto">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Lista / fila de despesas ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileWarning size={32} />}
            title={
              entries.length === 0
                ? 'Nenhuma despesa encontrada.'
                : filterStatus !== 'Todos'
                ? `Nenhuma despesa com situação "${STATUS_META[filterStatus].label}" no momento.`
                : 'Nenhuma despesa corresponde aos filtros aplicados.'
            }
            description={
              entries.length === 0
                ? 'As despesas aparecerão aqui após o registro em "Novo Lançamento".'
                : hasFilters
                ? 'Tente ajustar ou limpar os filtros para ver outros registros.'
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 sticky top-0 z-10">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Documento</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Fornecedor</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Item PT</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Data</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right whitespace-nowrap">Valor</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center whitespace-nowrap">Situação</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(entry => {
                  const meta = STATUS_META[entry.approvalStatus] || STATUS_META['Em analise'];
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setAnalysingEntryId(entry.id)}
                    >
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{entry.nf || '—'}</p>
                        {entry.description && (
                          <p className="text-xs text-slate-400 truncate max-w-[180px]" title={entry.description}>{entry.description}</p>
                        )}
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-700 whitespace-nowrap">{entry.supplier || '—'}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-[var(--native-primary-light)] text-[var(--native-primary)] text-[11px] font-bold">
                          {entry.itemCode}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 whitespace-nowrap">{entry.date}</td>
                      <td className="p-4 text-right font-bold text-slate-900 whitespace-nowrap">{fmt.format(entry.amount)}</td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <Badge variant={meta.variant} icon={meta.icon}>{meta.label}</Badge>
                      </td>
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="secondary" onClick={() => setAnalysingEntryId(entry.id)}>
                            Analisar
                          </Button>
                          <button className="p-2 text-slate-400 hover:text-[var(--native-primary)] transition-colors" onClick={() => onEdit(entry)} title="Editar lançamento">
                            <Edit size={14} />
                          </button>
                          {canDelete && (
                            <button className="p-2 text-slate-400 hover:text-[var(--native-danger)] transition-colors" onClick={() => onDelete(entry.id)} title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {analysingEntry && (
        <DespesaDetail
          entry={analysingEntry}
          budgetItem={analysingBudgetItem}
          spentBefore={analysingSpentBefore}
          isAdmin={isAdmin}
          onClose={() => setAnalysingEntryId(null)}
          onStatusChange={onStatusChange}
          onUpdateComment={onUpdateComment}
        />
      )}
    </div>
  );
}

export default Ledger;
