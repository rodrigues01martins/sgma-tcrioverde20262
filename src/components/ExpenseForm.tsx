import React, { useState } from 'react';
import { Calendar, Tag, Truck, FileText, FileUp, DollarSign, AlignLeft } from 'lucide-react';
import { BudgetItem } from '../types';
import { useCurrencyInput } from '../hooks/useCurrencyInput';

interface ExpenseFormProps {
  budgetItems: BudgetItem[];
  onAdd: (data: any) => void;
  showToast: (message: string) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ budgetItems, onAdd, showToast }) => {
  const [formData, setFormData] = useState({
    itemCode: '',
    supplier: '',
    nf: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    documentData: ''
  });
  const [amount, setAmount] = useState<number | null>(null);
  const amountField = useCurrencyInput({ value: amount, onValueChange: setAmount });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Arquivo muito grande! Máximo 2MB.");
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, documentData: reader.result as string }));
        showToast("PDF anexado!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemCode || amount === null || !formData.date) {
      showToast("Preencha Item, Valor e Data.");
      return;
    }
    const [year, month, day] = formData.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    onAdd({
      ...formData,
      date: formattedDate,
      amount,
    });
    setFormData({
      itemCode: '', supplier: '', nf: '',
      date: new Date().toISOString().split('T')[0],
      description: '', documentData: ''
    });
    amountField.reset(null);
  };

  return (
    /* ── Sem max-w próprio: acompanha o container do App (max-w-7xl) ── */
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">

      {budgetItems.length === 0 && (
        <div className="mb-6 p-4 rounded-xl bg-[#FCD951]/20 border border-[#FCD951]/40 text-sm text-[#7a5c00]">
          Nenhum item do Plano de Trabalho cadastrado ainda. Peça a um administrador para cadastrá-los na aba "Itens do Plano".
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Código do Item */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[14px] uppercase tracking-wider font-bold text-[#007770]">
            <Tag size={18} className="text-[#007770]" fill="#007770" />
            Código do Item
          </label>
          <select
            value={formData.itemCode}
            onChange={e => setFormData(prev => ({ ...prev, itemCode: e.target.value }))}
            className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-[#007770] outline-none"
          >
            <option value="">Selecione um item do plano...</option>
            {budgetItems.map(item => (
              <option key={item.id} value={item.id}>{item.id} - {item.desc}</option>
            ))}
          </select>
        </div>

        {/* NF / Documento */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[14px] uppercase tracking-wider font-bold text-[#007770]">
            <FileText size={18} className="text-[#007770]" fill="#007770" />
            NF / Documento
          </label>
          <input
            type="text" placeholder="Ex: NF 456"
            value={formData.nf}
            onChange={e => setFormData(prev => ({ ...prev, nf: e.target.value }))}
            className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-sm"
          />
        </div>

        {/* Fornecedor */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[14px] uppercase tracking-wider font-bold text-[#007770]">
            <Truck size={18} className="text-[#007770]" fill="#007770" />
            Fornecedor
          </label>
          <input
            type="text" placeholder="Ex: Papelaria Central"
            value={formData.supplier}
            onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
            className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-sm"
          />
        </div>

        {/* Valor */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[14px] uppercase tracking-wider font-bold text-[#007770]">
            <DollarSign size={18} className="text-[#007770]" fill="#007770" />
            Valor (R$)
          </label>
          <input
            type="text" placeholder="0,00"
            {...amountField.fieldProps}
            className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-sm font-bold text-[#007770]"
          />
        </div>

        {/* Data */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[14px] uppercase tracking-wider font-bold text-[#007770]">
            <Calendar size={18} className="text-[#007770]" fill="#007770" />
            Data da Despesa
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-sm"
          />
        </div>

        {/* Documentação */}
        <div className="md:col-span-2 space-y-2">
          <label className="flex items-center gap-2 text-[14px] uppercase tracking-wider font-bold text-[#007770]">
            <FileUp size={18} className="text-[#007770]" fill="#007770" />
            Documentação (PDF)
          </label>
          <input
            type="file" accept="application/pdf"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#007770]/10 file:text-[#007770] cursor-pointer bg-slate-50 rounded-xl"
          />
        </div>

        {/* Descrição */}
        <div className="md:col-span-2 space-y-2">
          <label className="flex items-center gap-2 text-[14px] uppercase tracking-wider font-bold text-[#007770]">
            <AlignLeft size={18} className="text-[#007770]" fill="#007770" />
            <strong>Descrição</strong>
            <span className="font-normal normal-case text-slate-400 text-xs">(Conforme especificado na Nota Fiscal/Comprovante)</span>
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-sm"
          />
        </div>

      </div>

      <button
        type="submit"
        className="w-full mt-8 bg-[#007770] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#005f59] transition-all"
      >
        Salvar Lançamento
      </button>
    </form>
  );
};
