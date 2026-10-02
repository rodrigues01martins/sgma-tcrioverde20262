import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import Upload from '../pages/monitor/Upload';
import Gerencial from '../pages/monitor/Gerencial';
import Repasse from '../pages/monitor/Repasse';
import Historico from '../pages/monitor/Historico';

type ApuracaoTab = 'upload' | 'gerencial' | 'repasse' | 'historico';

interface ApuracaoMensalProps {
  isAdmin: boolean;
  canAccessUpload: boolean;
  canAccessGerencial: boolean;
  canAccessRepasse: boolean;
  canAccessHistorico: boolean;
  onGoHome: () => void;
  onSignOut: () => void;
  showToast: (message: string) => void;
}

const TABS: { key: ApuracaoTab; label: string; can: (p: ApuracaoMensalProps) => boolean }[] = [
  { key: 'upload',    label: 'Upload',    can: p => p.isAdmin || p.canAccessUpload },
  { key: 'gerencial', label: 'Gerencial', can: p => p.isAdmin || p.canAccessGerencial },
  { key: 'repasse',   label: 'Repasse',   can: p => p.isAdmin || p.canAccessRepasse },
  { key: 'historico', label: 'Histórico', can: p => p.isAdmin || p.canAccessHistorico },
];

export const ApuracaoMensal: React.FC<ApuracaoMensalProps> = (props) => {
  const { onGoHome, onSignOut, showToast } = props;
  const [activeTab, setActiveTab] = useState<ApuracaoTab | null>(null);
  const visibleTabs = TABS.filter(t => t.can(props));

  // Seleciona a primeira aba liberada assim que as permissões chegam do
  // Firestore (chegam de forma assíncrona, depois do primeiro render).
  // Só decide uma vez — não atropela a navegação manual do usuário.
  useEffect(() => {
    if (activeTab !== null) return;
    const first = TABS.find(t => t.can(props));
    if (first) setActiveTab(first.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isAdmin, props.canAccessUpload, props.canAccessGerencial, props.canAccessRepasse, props.canAccessHistorico]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header
        showExportButton={false}
        onGoHome={onGoHome}
        onExportCSV={() => {}}
        onSignOut={onSignOut}
      />

      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="no-print mb-8 flex gap-3 flex-wrap">
            {visibleTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === t.key ? 'bg-[#007770] text-white shadow-lg' : 'bg-white text-[#007770] border'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!activeTab && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">Acesso restrito</h2>
              <p className="text-slate-400 text-sm">Nenhuma seção desta dimensão foi liberada para o seu usuário ainda.</p>
            </div>
          )}

          {activeTab === 'upload' && (
            <Upload
              onNavigate={(tab: ApuracaoTab) => setActiveTab(tab)}
              canNavigateGerencial={visibleTabs.some(t => t.key === 'gerencial')}
              canNavigateHistorico={visibleTabs.some(t => t.key === 'historico')}
            />
          )}
          {activeTab === 'gerencial' && <Gerencial />}
          {activeTab === 'repasse' && <Repasse />}
          {activeTab === 'historico' && <Historico showToast={showToast} />}
        </div>
      </div>
    </div>
  );
};
