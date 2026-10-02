import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download, AlertTriangle, Check, Clock, XCircle } from 'lucide-react';
import { BudgetItem, LedgerEntry } from '../types';
import { fmt } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Select, Textarea } from './ui/FormField';

// Modal de análise da despesa — reúne num único lugar o que o Auditor
// precisa para decidir: dados do lançamento, contexto do item do Plano
// de Trabalho, contexto financeiro (reaproveita getSpentForItem, não
// recalcula nada novo) e o documento comprobatório, com a situação e a
// manifestação do Auditor numa seção própria ao final.
//
// Não introduz nenhum status novo: 'approvalStatus' continua com
// exatamente os 4 valores já usados em todo o app.

type Status = LedgerEntry['approvalStatus'];

export const STATUS_META: Record<Status, { label: string; variant: 'neutral' | 'warning' | 'success' | 'danger'; icon: React.ReactNode }> = {
  'Em analise': { label: 'Em análise', variant: 'neutral', icon: <Clock size={12} /> },
  'Pendente': { label: 'Pendente', variant: 'warning', icon: <AlertTriangle size={12} /> },
  'Aprovado': { label: 'Aprovado', variant: 'success', icon: <Check size={12} /> },
  'Desaprovado': { label: 'Desaprovado', variant: 'danger', icon: <XCircle size={12} /> },
};

interface DespesaDetailProps {
  entry: LedgerEntry;
  budgetItem?: BudgetItem;
  spentBefore: number;
  isAdmin: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: Status) => void;
  onUpdateComment?: (id: string, comment: string) => void;
}

function isPdfDataUrl(data: string) {
  return data.startsWith('data:application/pdf');
}

export function DespesaDetail({ entry, budgetItem, spentBefore, isAdmin, onClose, onStatusChange, onUpdateComment }: DespesaDetailProps) {
  const [statusDraft, setStatusDraft] = useState<Status>(entry.approvalStatus || 'Em analise');
  const [commentDraft, setCommentDraft] = useState(entry.auditComment || '');
  const previouslyFocused = useRef<Element | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    closeBtnRef.current?.focus();
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      (previouslyFocused.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previsto = budgetItem?.value || 0;
  const executadoTotal = spentBefore + entry.amount;
  const saldoProjetado = previsto - executadoTotal;
  const excedeSaldo = previsto > 0 && saldoProjetado < 0;
  const statusMeta = STATUS_META[entry.approvalStatus] || STATUS_META['Em analise'];

  const analiseAlterada = statusDraft !== entry.approvalStatus || commentDraft !== (entry.auditComment || '');

  const handleSalvarAnalise = () => {
    if (statusDraft !== entry.approvalStatus) onStatusChange(entry.id, statusDraft);
    if (commentDraft !== (entry.auditComment || '')) onUpdateComment?.(entry.id, commentDraft);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Análise da despesa ${entry.nf || entry.id}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 16 }}
          className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col"
        >
          {/* Cabeçalho */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Despesa {entry.nf ? `— NF ${entry.nf}` : ''}
              </h3>
              <p className="text-xs text-slate-400">{entry.supplier || 'Fornecedor não informado'}</p>
            </div>
            <button ref={closeBtnRef} className="text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--native-focus)] rounded-lg p-1" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>

          {/* Corpo — rolável */}
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Coluna esquerda: dados + contexto ── */}
              <div className="space-y-6">

                {/* Dados da despesa */}
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dados da despesa</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Fornecedor</p>
                      <p className="text-slate-800 font-medium">{entry.supplier || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Documento (NF)</p>
                      <p className="text-slate-800 font-medium">{entry.nf || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Data</p>
                      <p className="text-slate-800 font-medium">{entry.date}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Valor</p>
                      <p className="text-[var(--native-primary)] font-bold text-lg">{fmt.format(entry.amount)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Descrição</p>
                      <p className="text-slate-600">{entry.description || '—'}</p>
                    </div>
                  </div>
                </section>

                {/* Contexto do Plano de Trabalho */}
                <section>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Item do Plano de Trabalho</h4>
                  {budgetItem ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-2">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Código</span>
                        <strong className="text-[var(--native-primary)]">{budgetItem.id}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Descrição</span>
                        <strong className="text-right">{budgetItem.desc}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Etapa</span>
                        <strong>{budgetItem.stage || '—'}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Grupo / Categoria</span>
                        <strong>{budgetItem.group || entry.category || '—'}</strong>
                      </div>
                      <div className="border-t border-slate-200 my-1" />
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Valor previsto</span>
                        <strong>{fmt.format(previsto)}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Executado anteriormente</span>
                        <strong>{fmt.format(spentBefore)}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Despesa em análise</span>
                        <strong>{fmt.format(entry.amount)}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Saldo projetado</span>
                        <strong className={saldoProjetado < 0 ? 'text-[var(--native-danger)]' : 'text-[var(--native-success)]'}>
                          {fmt.format(saldoProjetado)}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Item do Plano de Trabalho não encontrado (código {entry.itemCode}).</p>
                  )}

                  {excedeSaldo && (
                    <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-[var(--native-warning-bg)]/20 border border-[var(--native-warning-bg)]/60 text-xs text-[var(--native-warning-text)]">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span>O valor desta despesa supera o saldo atualmente disponível para o item — isto é apenas um apoio à análise, a decisão continua sendo do Auditor.</span>
                    </div>
                  )}
                </section>
              </div>

              {/* ── Coluna direita: documento ── */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Documento comprobatório</h4>
                {!entry.documentData ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                    <AlertTriangle size={20} />
                    Nenhum documento comprobatório anexado.
                  </div>
                ) : isPdfDataUrl(entry.documentData) ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <embed src={entry.documentData} type="application/pdf" className="w-full h-[420px]" title={`Documento — ${entry.documentName || entry.nf || entry.id}`} />
                    <div className="p-2 border-t border-slate-200 bg-white flex justify-end">
                      <a href={entry.documentData} download={entry.documentName || `documento-${entry.nf || entry.id}.pdf`}
                         className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--native-primary)] hover:underline px-2 py-1">
                        <Download size={14} /> Baixar documento
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500 flex flex-col items-center gap-3">
                    <FileText size={24} className="text-slate-400" />
                    Documento disponível, sem visualização embutida para este formato.
                    <a href={entry.documentData} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="secondary">
                        <Download size={14} /> Abrir documento
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ── Análise do Auditor ── */}
            <section className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Análise do Auditor</h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500">Situação atual:</span>
                  <Badge variant={statusMeta.variant} icon={statusMeta.icon}>{statusMeta.label}</Badge>
                </div>

                {isAdmin ? (
                  <>
                    <Select
                      label="Alterar situação"
                      variant="filled"
                      value={statusDraft}
                      onChange={e => setStatusDraft(e.target.value as Status)}
                    >
                      <option value="Em analise">Em análise</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Desaprovado">Desaprovado</option>
                    </Select>

                    <Textarea
                      label="Manifestação do Auditor"
                      variant="filled"
                      value={commentDraft}
                      onChange={e => setCommentDraft(e.target.value)}
                      placeholder="Observações sobre a análise desta despesa..."
                      className="min-h-[120px]"
                    />

                    <div className="flex justify-end">
                      <Button onClick={handleSalvarAnalise} disabled={!analiseAlterada}>
                        Salvar Análise
                      </Button>
                    </div>
                  </>
                ) : entry.auditComment ? (
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Manifestação do Auditor</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{entry.auditComment}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sem manifestação registrada.</p>
                )}
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default DespesaDetail;
