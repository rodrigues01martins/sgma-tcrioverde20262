import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, BOOTSTRAP_ADMIN_EMAIL } from './firebase';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { Charts } from './components/Charts';
import { ExpenseForm } from './components/ExpenseForm';
import { Ledger } from './components/Ledger';
import { BudgetStatus } from './components/BudgetStatus';
import { BudgetItems } from './components/BudgetItems';
import { EditModal } from './components/EditModal';
import { Toast } from './components/Toast';
import { Login } from './components/Login';
import { DimensionSelect, Dimension } from './components/DimensionSelect';
import { ApuracaoMensal } from './components/ApuracaoMensal';
import { MonitoramentoAvaliacao } from './components/MonitoramentoAvaliacao';
import { BudgetItem, LedgerEntry } from './types';
import { UserManagement } from './components/UserManagement';
import { DEFAULT_PERMISSIONS } from './config/permissions';
import { getSpentForItem as calcSpentForItem } from './lib/utils';

type FinanceiroTab = 'entry' | 'despesas' | 'report' | 'itens';

function getStoredDimension(): Dimension | null {
  try {
    const v = sessionStorage.getItem('ptDimension');
    return v === 'financeiro' || v === 'metas' || v === 'apuracao' || v === 'gestao' ? v : null;
  } catch {
    return null;
  }
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [dimension, setDimension] = useState<Dimension | null>(getStoredDimension);
  const [activeTab, setActiveTab] = useState<FinanceiroTab>('entry');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [toast, setToast] = useState({ message: '', isVisible: false });
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAccessRelatorio, setCanAccessRelatorio] = useState(false);
  const [canAccessEntry, setCanAccessEntry] = useState(false);
  const [canAccessReport, setCanAccessReport] = useState(false);
  // Dimensão "Apuração Mensal" (Monitor de Aprendizes — Módulo 1)
  const [canAccessUpload, setCanAccessUpload] = useState(false);
  const [canAccessGerencial, setCanAccessGerencial] = useState(false);
  const [canAccessRepasse, setCanAccessRepasse] = useState(false);
  const [canAccessHistorico, setCanAccessHistorico] = useState(false);
  // Dimensão "Monitoramento e Avaliação" (Monitor de Aprendizes — Módulo 2)
  const [canAccessFrequencia, setCanAccessFrequencia] = useState(false);
  const [canAccessAlcance, setCanAccessAlcance] = useState(false);
  const [canAccessEixo3, setCanAccessEixo3] = useState(false);
  const [canAccessEixo4, setCanAccessEixo4] = useState(false);
  const [canAccessFormulario30Dias, setCanAccessFormulario30Dias] = useState(false);
  const [canAccessPainel30Dias, setCanAccessPainel30Dias] = useState(false);
  const [canAccessPesquisasSatisfacao, setCanAccessPesquisasSatisfacao] = useState(false);
  const [canAccessPainelSatisfacao, setCanAccessPainelSatisfacao] = useState(false);
  const [canAccessAvaliacaoPosPrograma, setCanAccessAvaliacaoPosPrograma] = useState(false);
  const [canAccessPainelPosPrograma, setCanAccessPainelPosPrograma] = useState(false);
  const [canAccessPainelGeralIndicadores, setCanAccessPainelGeralIndicadores] = useState(false);

  // Lê papel/permissões do Firestore para o usuário logado
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setCanAccessRelatorio(false);
      setCanAccessEntry(false);
      setCanAccessReport(false);
      setCanAccessUpload(false);
      setCanAccessGerencial(false);
      setCanAccessRepasse(false);
      setCanAccessHistorico(false);
      setCanAccessFrequencia(false);
      setCanAccessAlcance(false);
      setCanAccessEixo3(false);
      setCanAccessEixo4(false);
      setCanAccessFormulario30Dias(false);
      setCanAccessPainel30Dias(false);
      setCanAccessPesquisasSatisfacao(false);
      setCanAccessPainelSatisfacao(false);
      setCanAccessAvaliacaoPosPrograma(false);
      setCanAccessPainelPosPrograma(false);
      setCanAccessPainelGeralIndicadores(false);
      return;
    }
    const bootstrapAdmin = user.email === BOOTSTRAP_ADMIN_EMAIL;
    const userDocRef = doc(db, 'users', user.uid);
    getDoc(userDocRef).then(snap => {
      const data = snap.data();
      const admin = bootstrapAdmin || data?.role === 'admin';
      setIsAdmin(admin);
      setCanAccessRelatorio(admin || data?.canAccessRelatorio === true);
      setCanAccessEntry(admin || data?.canAccessEntry === true);
      setCanAccessReport(admin || data?.canAccessReport === true);
      setCanAccessUpload(admin || data?.canAccessUpload === true);
      setCanAccessGerencial(admin || data?.canAccessGerencial === true);
      setCanAccessRepasse(admin || data?.canAccessRepasse === true);
      setCanAccessHistorico(admin || data?.canAccessHistorico === true);
      setCanAccessFrequencia(admin || data?.canAccessFrequencia === true);
      setCanAccessAlcance(admin || data?.canAccessAlcance === true);
      setCanAccessEixo3(admin || data?.canAccessEixo3 === true);
      setCanAccessEixo4(admin || data?.canAccessEixo4 === true);
      setCanAccessFormulario30Dias(admin || data?.canAccessFormulario30Dias === true);
      setCanAccessPainel30Dias(admin || data?.canAccessPainel30Dias === true);
      setCanAccessPesquisasSatisfacao(admin || data?.canAccessPesquisasSatisfacao === true);
      setCanAccessPainelSatisfacao(admin || data?.canAccessPainelSatisfacao === true);
      setCanAccessAvaliacaoPosPrograma(admin || data?.canAccessAvaliacaoPosPrograma === true);
      setCanAccessPainelPosPrograma(admin || data?.canAccessPainelPosPrograma === true);
      setCanAccessPainelGeralIndicadores(admin || data?.canAccessPainelGeralIndicadores === true);
    }).catch(() => {
      setIsAdmin(bootstrapAdmin);
      setCanAccessRelatorio(bootstrapAdmin);
      setCanAccessEntry(bootstrapAdmin);
      setCanAccessReport(bootstrapAdmin);
      setCanAccessUpload(bootstrapAdmin);
      setCanAccessGerencial(bootstrapAdmin);
      setCanAccessRepasse(bootstrapAdmin);
      setCanAccessHistorico(bootstrapAdmin);
      setCanAccessFrequencia(bootstrapAdmin);
      setCanAccessAlcance(bootstrapAdmin);
      setCanAccessEixo3(bootstrapAdmin);
      setCanAccessEixo4(bootstrapAdmin);
      setCanAccessFormulario30Dias(bootstrapAdmin);
      setCanAccessPainel30Dias(bootstrapAdmin);
      setCanAccessPesquisasSatisfacao(bootstrapAdmin);
      setCanAccessPainelSatisfacao(bootstrapAdmin);
      setCanAccessAvaliacaoPosPrograma(bootstrapAdmin);
      setCanAccessPainelPosPrograma(bootstrapAdmin);
      setCanAccessPainelGeralIndicadores(bootstrapAdmin);
    });
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      // Auto-cria documento em /users/{uid} se não existir
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            role: 'user',
            ...DEFAULT_PERMISSIONS,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user && !isDemoMode) return;
    const q = query(collection(db, 'ledger'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LedgerEntry));
      setLedgerEntries(data);
    }, (error) => console.error("Erro Firestore:", error));
    return () => unsubscribe();
  }, [user, isDemoMode]);

  useEffect(() => {
    if (!user && !isDemoMode) return;
    const unsubscribe = onSnapshot(collection(db, 'budgetItems'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BudgetItem));
      setBudgetItems(data);
    }, (error) => console.error("Erro Firestore:", error));
    return () => unsubscribe();
  }, [user, isDemoMode]);

  const chooseDimension = (d: Dimension) => {
    setDimension(d);
    try { sessionStorage.setItem('ptDimension', d); } catch {}
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setDimension(null);
    try { sessionStorage.removeItem('ptDimension'); } catch {}
  };

  // Volta para a seleção de dimensão sem deslogar do Firebase Auth.
  const handleGoHome = () => {
    setDimension(null);
    try { sessionStorage.removeItem('ptDimension'); } catch {}
  };

  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const handleExportCSV = () => {
    if (ledgerEntries.length === 0) return showToast("Não há dados para exportar.");
    const headers = [
      "Data Lançamento", "Data Despesa", "Código Item",
      "Fornecedor", "NF", "Valor", "Categoria",
      "Grupo", "Etapa", "Status", "Descrição"
    ].join(";");
    const rows = ledgerEntries.map(e => {
      const lancamento = e.createdAt ? new Date(e.createdAt).toLocaleDateString('pt-BR') : '---';
      const valorExcel = (Number(e.amount) || 0).toFixed(2).replace('.', ',');
      const esc = (v: string | undefined | null) => {
        const s = String(v ?? '');
        return s.includes(';') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return [
        lancamento, esc(e.date), esc(e.itemCode),
        esc(e.supplier), esc(e.nf), valorExcel,
        esc(e.category), esc(e.group), esc(e.stage),
        esc(e.approvalStatus), esc(e.description)
      ].join(";");
    });
    const csvContent = "﻿" + headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Registros_PT_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("CSV exportado com sucesso!");
  };

  const handleAddEntry = async (data: any) => {
    try {
      const item = budgetItems.find(i => i.id === data.itemCode);
      await addDoc(collection(db, 'ledger'), {
        ...data,
        category: item?.category || 'Outros',
        group: item?.group || '',
        stage: item?.stage || '',
        approvalStatus: 'Em analise',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorUid: user?.uid || 'demo-user'
      });
      showToast("Registro salvo!");
    } catch (e) { showToast("Erro ao gravar."); }
  };

  const handleUpdateEntry = async (updated: LedgerEntry) => {
    try {
      const { id, ...dataToSave } = updated;
      await updateDoc(doc(db, 'ledger', id), {
        ...dataToSave,
        updatedAt: new Date().toISOString()
      });
      setEditingEntry(null);
      showToast("Atualizado com sucesso!");
    } catch (e) { showToast("Erro ao atualizar."); }
  };

  const handleStatusChange = async (id: string, status: LedgerEntry['approvalStatus']) => {
    if (!isAdmin) return showToast("Acesso negado.");
    try {
      await updateDoc(doc(db, 'ledger', id), {
        approvalStatus: status,
        updatedAt: new Date().toISOString()
      });
      showToast(`Status: ${status}`);
    } catch (e) { showToast("Erro ao atualizar status."); }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!isAdmin) return showToast("Acesso negado.");
    if (window.confirm("Deseja realmente excluir?")) {
      try {
        await deleteDoc(doc(db, 'ledger', id));
        showToast("Removido.");
      } catch (e) { showToast("Erro ao excluir."); }
    }
  };

  const handleUpdateAuditComment = async (id: string, comment: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'ledger', id), {
        auditComment: comment,
        updatedAt: new Date().toISOString()
      });
      showToast("Observação salva.");
    } catch (e) { showToast("Erro ao salvar observação."); }
  };

  const totals = useMemo(() => {
    const totalOrcado = budgetItems.reduce((acc, i) => acc + (i.value || 0), 0);
    const totalExecutado = ledgerEntries.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    const criticalItems = budgetItems.filter(item => {
      const gasto = ledgerEntries
        .filter(e => String(e.itemCode).trim() === String(item.id).trim())
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const saldo = item.value - gasto;
      return item.value > 0 && (saldo <= 0 || saldo / item.value <= 0.1);
    }).length;
    const lastTs = ledgerEntries.reduce<string>((latest, entry) => {
      const ts = entry.updatedAt || entry.createdAt || '';
      if (!ts) return latest;
      if (!latest) return ts;
      return ts > latest ? ts : latest;
    }, '');
    const lastAudit = lastTs
      ? new Date(lastTs).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '-';
    return {
      totalOrcado, totalExecutado,
      totalSaldo: totalOrcado - totalExecutado,
      percentTotal: totalOrcado > 0 ? (totalExecutado / totalOrcado) * 100 : 0,
      criticalItems, lastAudit,
    };
  }, [ledgerEntries, budgetItems]);

  const chartData = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    ledgerEntries.forEach(e => {
      const parts = e.date.split('/');
      if (parts.length === 3) {
        const label = `${parts[1]}/${parts[2]}`;
        monthlyMap.set(label, (monthlyMap.get(label) || 0) + e.amount);
      }
    });
    const categories = [...new Set(budgetItems.map(i => i.category))];
    const groups    = [...new Set(budgetItems.map(i => i.group))];
    const stages    = [...new Set(budgetItems.map(i => i.stage))];
    return {
      category: {
        labels: categories,
        previsto: categories.map(c => budgetItems.filter(i => i.category === c).reduce((acc, i) => acc + (i.value || 0), 0)),
        executado: categories.map(c => ledgerEntries.filter(e => e.category === c).reduce((acc, e) => acc + e.amount, 0))
      },
      month: {
        labels: Array.from(monthlyMap.keys()).sort(),
        executado: Array.from(monthlyMap.values())
      },
      group: {
        labels: groups,
        previsto: groups.map(g => budgetItems.filter(i => i.group === g).reduce((acc, i) => acc + (i.value || 0), 0)),
        executado: groups.map(g => ledgerEntries.reduce((acc, e) => budgetItems.find(i => i.id === e.itemCode)?.group === g ? acc + e.amount : acc, 0))
      },
      stage: {
        labels: stages,
        previsto: stages.map(s => budgetItems.filter(i => i.stage === s).reduce((acc, i) => acc + (i.value || 0), 0)),
        executado: stages.map(s => ledgerEntries.reduce((acc, e) => budgetItems.find(i => i.id === e.itemCode)?.stage === s ? acc + e.amount : acc, 0))
      }
    };
  }, [ledgerEntries, budgetItems]);

  // Redireciona para a primeira aba disponível após carregar permissões
  useEffect(() => {
    if (!isAuthReady) return;
    if (activeTab === 'entry' && !isAdmin && !canAccessEntry && canAccessReport) {
      setActiveTab('report');
    }
    if (activeTab === 'report' && !isAdmin && !canAccessReport && canAccessEntry) {
      setActiveTab('entry');
    }
  }, [isAuthReady, canAccessEntry, canAccessReport, isAdmin]);

  if (!isAuthReady) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-[#007770]">
      Iniciando...
    </div>
  );
  if (!user && !isDemoMode) {
    return <Login onDemoMode={() => setIsDemoMode(true)} showToast={showToast} />;
  }

  // Usuário autenticado, mas ainda não escolheu a dimensão nesta sessão
  if (!dimension) {
    return <DimensionSelect isAdmin={isAdmin} onSelect={chooseDimension} onSignOut={handleSignOut} />;
  }

  // ── Dimensão: Gestão do Aplicativo (global, fora dos 3 módulos) ────
  if (dimension === 'gestao') {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Header showExportButton={false} onGoHome={handleGoHome} onExportCSV={() => {}} onSignOut={handleSignOut} />
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {isAdmin ? (
              <UserManagement currentUserUid={user?.uid || ''} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-3xl">🔒</span>
                </div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">Acesso restrito</h2>
                <p className="text-slate-400 text-sm">Esta área é exclusiva de administradores.</p>
              </div>
            )}
          </div>
        </div>
        <Toast message={toast.message} isVisible={toast.isVisible} />
      </div>
    );
  }

  // ── Dimensão: Apuração Mensal ──────────────────────────────────
  if (dimension === 'apuracao') {
    return (
      <>
        <ApuracaoMensal
          isAdmin={isAdmin}
          canAccessUpload={canAccessUpload}
          canAccessGerencial={canAccessGerencial}
          canAccessRepasse={canAccessRepasse}
          canAccessHistorico={canAccessHistorico}
          onGoHome={handleGoHome}
          onSignOut={handleSignOut}
          showToast={showToast}
        />
        <Toast message={toast.message} isVisible={toast.isVisible} />
      </>
    );
  }

  // ── Dimensão: Monitoramento e Avaliação ──────────────────────────
  if (dimension === 'metas') {
    return (
      <>
        <MonitoramentoAvaliacao
          isAdmin={isAdmin}
          canAccessRelatorio={canAccessRelatorio}
          canAccessFrequencia={canAccessFrequencia}
          canAccessAlcance={canAccessAlcance}
          canAccessEixo3={canAccessEixo3}
          canAccessEixo4={canAccessEixo4}
          canAccessFormulario30Dias={canAccessFormulario30Dias}
          canAccessPainel30Dias={canAccessPainel30Dias}
          canAccessPesquisasSatisfacao={canAccessPesquisasSatisfacao}
          canAccessPainelSatisfacao={canAccessPainelSatisfacao}
          canAccessAvaliacaoPosPrograma={canAccessAvaliacaoPosPrograma}
          canAccessPainelPosPrograma={canAccessPainelPosPrograma}
          canAccessPainelGeralIndicadores={canAccessPainelGeralIndicadores}
          onGoHome={handleGoHome}
          onSignOut={handleSignOut}
          showToast={showToast}
        />
        <Toast message={toast.message} isVisible={toast.isVisible} />
      </>
    );
  }

  // ── Dimensão: Acompanhamento Financeiro ──────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header
        showExportButton={true}
        onGoHome={handleGoHome}
        onExportCSV={handleExportCSV}
        onSignOut={handleSignOut}
      />

      <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Tabs — Cadastrar Itens é só mais uma aba do módulo, para não
            deixar o usuário sem caminho de volta às abas operacionais ── */}
        <div className="mb-8 flex gap-3 flex-wrap">
          {(isAdmin || canAccessEntry) && (
            <button
              onClick={() => setActiveTab('entry')}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'entry' ? 'bg-[#007770] text-white shadow-lg' : 'bg-white text-[#007770] border'}`}
            >
              Novo Lançamento
            </button>
          )}
          {(isAdmin || canAccessReport) && (
            <button
              onClick={() => setActiveTab('despesas')}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'despesas' ? 'bg-[#007770] text-white shadow-lg' : 'bg-white text-[#007770] border'}`}
            >
              Acompanhar Despesa
            </button>
          )}
          {(isAdmin || canAccessReport) && (
            <button
              onClick={() => setActiveTab('report')}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'report' ? 'bg-[#007770] text-white shadow-lg' : 'bg-white text-[#007770] border'}`}
            >
              Painel
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('itens')}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'itens' ? 'bg-[#007770] text-white shadow-lg' : 'bg-white text-[#007770] border'}`}
            >
              Cadastrar Itens
            </button>
          )}
        </div>

        {/* ── Aba: Novo Lançamento ── */}
        {activeTab === 'entry' && (isAdmin || canAccessEntry) && (
          <ExpenseForm budgetItems={budgetItems} onAdd={handleAddEntry} showToast={showToast} />
        )}

        {/* ── Aba: Acompanhar Despesa ── */}
        {activeTab === 'despesas' && (isAdmin || canAccessReport) && (
          <Ledger
            entries={ledgerEntries}
            budgetItems={budgetItems}
            onEdit={(entry) => setEditingEntry(entry)}
            onDelete={handleDeleteEntry}
            onStatusChange={handleStatusChange}
            onUpdateComment={handleUpdateAuditComment}
            canDelete={isAdmin}
            isAdmin={isAdmin}
          />
        )}

        {/* ── Aba: Painel ── */}
        {activeTab === 'report' && (isAdmin || canAccessReport) && (
          <div className="space-y-10">
            <SummaryCards
              totalOrcado={totals.totalOrcado}
              totalExecutado={totals.totalExecutado}
              totalSaldo={totals.totalSaldo}
              percentTotal={totals.percentTotal}
              totalRecords={ledgerEntries.length}
              lastAudit={totals.lastAudit}
              criticalItems={totals.criticalItems}
            />
            <div className="w-full">
              <Charts
                categoryData={chartData.category}
                monthData={chartData.month}
                groupData={chartData.group}
                stageData={chartData.stage}
              />
            </div>
            <div className="w-full">
              <BudgetStatus entries={ledgerEntries} budgetItems={budgetItems} />
            </div>
          </div>
        )}

        {/* ── Aba: Itens do Plano — acesso restrito a admins ── */}
        {activeTab === 'itens' && isAdmin && (
          <BudgetItems budgetItems={budgetItems} showToast={showToast} />
        )}

      </div>
      </div>

      {editingEntry && (
        <EditModal
          isOpen={true}
          onClose={() => setEditingEntry(null)}
          entry={editingEntry}
          budgetItems={budgetItems}
          onSave={handleUpdateEntry}
          getSpentForItem={(code, id) => calcSpentForItem(ledgerEntries, code, id)}
        />
      )}
      <Toast message={toast.message} isVisible={toast.isVisible} />
    </div>
  );
}

export default App;
