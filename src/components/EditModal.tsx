import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload } from 'lucide-react';
import { BudgetItem, LedgerEntry } from '../types';
import { fmt, formatDateForInput, fileToDataUrl } from '../lib/utils';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { Button } from './ui/Button';
import { TextInput, Select, Textarea } from './ui/FormField';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LedgerEntry | null;
  budgetItems: BudgetItem[];
  onSave: (updated: LedgerEntry) => void;
  getSpentForItem: (itemCode: string, excludeId: any) => number;
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, entry, budgetItems, onSave, getSpentForItem }) => {
  const [itemCode, setItemCode] = useState('');
  const [nf, setNf] = useState('');
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const amountField = useCurrencyInput({ value: amount, onValueChange: setAmount });
  const [date, setDate] = useState('');
  const [auditComment, setAuditComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [documentRemoved, setDocumentRemoved] = useState(false);

  useEffect(() => {
    if (entry) {
      setItemCode(entry.itemCode);
      setNf(entry.nf);
      setSupplier(entry.supplier);
      setDescription(entry.description);
      setAmount(entry.amount);
      amountField.reset(entry.amount);
      setDate(formatDateForInput(entry.date));
      setAuditComment(entry.auditComment || '');
      setDocumentRemoved(false);
      setFile(null);
    }
  }, [entry]);

  if (!entry) return null;

  // Sempre derivar o item selecionado do itemCode atual (state)
  const selectedItem = budgetItems.find(i => i.id === itemCode);
  const spent = getSpentForItem(itemCode, entry.id);
  const balance = selectedItem ? selectedItem.value - spent : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === null) return; // defesa extra — o "required" do campo já bloqueia o submit nativo

    let documentName = documentRemoved ? '' : (entry.documentName || '');
    let documentData = documentRemoved ? '' : (entry.documentData || '');

    if (file) {
      if (file.type !== 'application/pdf') {
        alert('O arquivo anexado precisa estar em formato PDF.');
        return;
      }
      documentName = file.name;
      documentData = await fileToDataUrl(file);
    }

    // Recalcular category, group e stage com base no novo itemCode
    const budgetItem = budgetItems.find(i => i.id === itemCode);

    onSave({
      ...entry,
      itemCode,
      nf,
      supplier,
      description,
      auditComment,
      amount,
      date: date.split('-').reverse().join('/'),
      category: budgetItem?.category || entry.category,
      group: budgetItem?.group || entry.group,
      stage: budgetItem?.stage || entry.stage,
      documentName,
      documentData,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden relative z-10"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Editar lançamento</h3>
              <button className="text-slate-400 hover:text-slate-700" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-4 overflow-y-auto max-h-[80vh]" onSubmit={handleSubmit}>

              {/* Código do Item */}
              <Select
                label="Código do Item"
                variant="filled"
                value={itemCode}
                onChange={e => setItemCode(e.target.value)}
                required
              >
                {budgetItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.desc}
                  </option>
                ))}
              </Select>

              {/* Painel informativo — atualiza em tempo real com o itemCode selecionado */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Categoria automática</span>
                  <strong className={selectedItem ? 'text-[#007770]' : 'text-slate-400'}>
                    {selectedItem?.category || '—'}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Grupo</span>
                  <strong>{selectedItem?.group || '—'}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Previsto no item</span>
                  <strong>{fmt.format(selectedItem?.value || 0)}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Executado sem este lançamento</span>
                  <strong>{fmt.format(spent)}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Saldo disponível para edição</span>
                  <strong className={balance < 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {fmt.format(balance)}
                  </strong>
                </div>
              </div>

              {/* NF / Fornecedor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="NF / Documento"
                  value={nf}
                  onChange={e => setNf(e.target.value)}
                  type="text"
                />
                <TextInput
                  label="Fornecedor"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  type="text"
                />
              </div>

              {/* Descrição */}
              <TextInput
                label="Descrição"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                type="text"
              />

              {/* Valor / Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput
                  label="Valor (R$)"
                  className="font-bold"
                  type="text"
                  placeholder="0,00"
                  required
                  {...amountField.fieldProps}
                />
                <TextInput
                  label="Data"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  type="date"
                />
              </div>

              {/* Documento */}
              <div className="space-y-2">
                <div className="text-xs text-slate-500 flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200">
                  <span>
                    Documento atual:{' '}
                    <span className="font-semibold text-slate-700">
                      {documentRemoved ? 'Removido' : entry.documentName || 'Nenhum'}
                    </span>
                  </span>
                  {!documentRemoved && entry.documentData && (
                    <button
                      type="button"
                      onClick={() => { setDocumentRemoved(true); setFile(null); }}
                      className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-tighter transition-colors"
                    >
                      Excluir Arquivo
                    </button>
                  )}
                </div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <Upload size={12} className="inline mr-1" />
                  {entry.documentData ? 'Substituir Documentação (PDF)' : 'Anexar Documentação (PDF)'}
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => {
                    setFile(e.target.files?.[0] || null);
                    if (e.target.files?.[0]) setDocumentRemoved(false);
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#007770]/10 file:text-[#007770] cursor-pointer bg-slate-50 rounded-xl"
                />
              </div>

              {/* Observações de auditoria */}
              <Textarea
                label="Observações de Auditoria"
                variant="filled"
                value={auditComment}
                onChange={e => setAuditComment(e.target.value)}
                placeholder="Instruções para o usuário..."
              />

              {/* Ações */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
