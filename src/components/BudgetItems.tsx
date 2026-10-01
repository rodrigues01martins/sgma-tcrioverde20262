import React, { useState } from 'react';
import { addDoc, deleteDoc, doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { BudgetItem } from '../types';
import { fmt } from '../lib/utils';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import { ClipboardList, Plus, Trash2, Edit, X, Check } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { KpiCard } from './ui/Card';
import { TextInput } from './ui/FormField';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

interface BudgetItemsProps {
  budgetItems: BudgetItem[];
  showToast: (message: string) => void;
}

const emptyForm = { id: '', stage: '', group: '', category: '', desc: '' };

export const BudgetItems: React.FC<BudgetItemsProps> = ({ budgetItems, showToast }) => {
  const [form, setForm] = useState(emptyForm);
  const [value, setValue] = useState<number | null>(null);
  const valueField = useCurrencyInput({ value, onValueChange: setValue });
  const [editingId, setEditingId] = useState<string | null>(null);

  const totalPrevisto = budgetItems.reduce((acc, i) => acc + (i.value || 0), 0);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    valueField.reset(null);
  };

  const startEdit = (item: BudgetItem) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      stage: item.stage,
      group: item.group,
      category: item.category,
      desc: item.desc,
    });
    valueField.reset(item.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stage || !form.group || !form.category || !form.desc || value === null) {
      showToast('Preencha etapa, grupo, categoria, descrição e valor.');
      return;
    }
    try {
      const data = { stage: form.stage, group: form.group, category: form.category, desc: form.desc, value };
      if (editingId) {
        await updateDoc(doc(db, 'budgetItems', editingId), data);
        showToast('Item atualizado.');
      } else if (form.id) {
        // Código informado manualmente vira o id do documento
        await setDoc(doc(db, 'budgetItems', form.id), data);
        showToast('Item cadastrado.');
      } else {
        await addDoc(collection(db, 'budgetItems'), data);
        showToast('Item cadastrado.');
      }
      resetForm();
    } catch (err) {
      showToast('Erro ao salvar item.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este item do Plano de Trabalho? Lançamentos já vinculados a ele não serão removidos.')) return;
    try {
      await deleteDoc(doc(db, 'budgetItems', id));
      showToast('Item removido.');
    } catch {
      showToast('Erro ao excluir item.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <PageHeader
        icon={<ClipboardList size={28} />}
        title="Itens do Plano de Trabalho"
        description="Cadastre as etapas, grupos e valores previstos que serão auditados"
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard compact label="Itens cadastrados" value={budgetItems.length} />
        <KpiCard compact label="Total previsto" value={fmt.format(totalPrevisto)} tone="primary" />
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">{editingId ? 'Editar item' : 'Novo item'}</h3>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <X size={12} /> Cancelar edição
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!editingId && (
            <div className="md:col-span-2">
              <TextInput
                label="Código do item"
                variant="filled"
                type="text" placeholder="Ex: 1.1.1.1 (opcional — gerado automaticamente se vazio)"
                value={form.id}
                onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
              />
            </div>
          )}
          <TextInput
            label="Etapa"
            variant="filled"
            type="text" placeholder="Ex: 1. Implantação"
            value={form.stage}
            onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
          />
          <TextInput
            label="Grupo de despesa"
            variant="filled"
            type="text" placeholder="Ex: Custeio"
            value={form.group}
            onChange={e => setForm(p => ({ ...p, group: e.target.value }))}
          />
          <TextInput
            label="Categoria"
            variant="filled"
            type="text" placeholder="Ex: Material de Consumo"
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
          />
          <TextInput
            label="Valor previsto (R$)"
            variant="filled"
            className="font-bold text-[var(--native-primary)]"
            type="text" placeholder="0,00"
            {...valueField.fieldProps}
          />
          <div className="md:col-span-2">
            <TextInput
              label="Descrição"
              variant="filled"
              type="text" placeholder="Descrição do item"
              value={form.desc}
              onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
            />
          </div>
        </div>
        <Button type="submit" className="mt-6">
          {editingId ? <Check size={16} /> : <Plus size={16} />}
          {editingId ? 'Salvar alterações' : 'Adicionar item'}
        </Button>
      </form>

      {/* Lista */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Código</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Etapa</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Grupo</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Categoria</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Descrição</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Previsto</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Editar</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Excluir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetItems.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="Nenhum item cadastrado ainda." icon={<ClipboardList size={32} />} />
                  </td>
                </tr>
              ) : budgetItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-xs font-bold text-[#007770]">{item.id}</td>
                  <td className="p-4 text-xs text-slate-600 max-w-[160px] truncate" title={item.stage}>{item.stage}</td>
                  <td className="p-4 text-xs text-slate-600">{item.group}</td>
                  <td className="p-4 text-xs text-slate-600">{item.category}</td>
                  <td className="p-4 text-xs text-slate-600 max-w-[220px] truncate" title={item.desc}>{item.desc}</td>
                  <td className="p-4 text-right text-sm font-bold text-slate-800">{fmt.format(item.value)}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-[#007770] transition-colors" title="Editar">
                      <Edit size={14} />
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
