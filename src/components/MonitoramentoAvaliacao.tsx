import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { MonitoringNavigation, NavEntry } from './MonitoringNavigation';
import RelatorioFinal from './RelatorioFinal';
import Frequencia from '../pages/monitor/Frequencia';
import Alcance from '../pages/monitor/Alcance';
import VisitaInLocoForm from '../pages/monitor/VisitaInLocoForm';
import VisitaInLocoDashboard from '../pages/monitor/VisitaInLocoDashboard';
import VisitaInLocoPraticaForm from '../pages/monitor/VisitaInLocoPraticaForm';
import VisitaInLocoPraticaDashboard from '../pages/monitor/VisitaInLocoPraticaDashboard';
import Formulario30DiasForm from '../pages/monitor/Formulario30DiasForm';
import Painel30Dias from '../pages/monitor/Painel30Dias';
import PesquisasSatisfacaoImport from '../pages/monitor/PesquisasSatisfacaoImport';
import AvaliacaoPosProgramaImport from '../pages/monitor/AvaliacaoPosProgramaImport';
import PainelIndicadoresSatisfacao from '../pages/monitor/PainelIndicadoresSatisfacao';
import PainelAvaliacaoPosPrograma from '../pages/monitor/PainelAvaliacaoPosPrograma';
import PainelGeralIndicadores from '../pages/monitor/PainelGeralIndicadores';

type MetasTab = 'relatorio' | 'frequencia' | 'alcance' | 'eixo3' | 'eixo3pratica' | 'eixo4' | 'eixo4pratica' | 'formulario30dias' | 'painel30dias' | 'pesquisasSatisfacao' | 'avaliacaoPosPrograma' | 'painelSatisfacao' | 'painelPosPrograma' | 'painelGeral';

interface MonitoramentoAvaliacaoProps {
  isAdmin: boolean;
  canAccessRelatorio: boolean;
  canAccessFrequencia: boolean;
  canAccessAlcance: boolean;
  canAccessEixo3: boolean;
  canAccessEixo4: boolean;
  canAccessFormulario30Dias: boolean;
  canAccessPainel30Dias: boolean;
  canAccessPesquisasSatisfacao: boolean;
  canAccessPainelSatisfacao: boolean;
  canAccessAvaliacaoPosPrograma: boolean;
  canAccessPainelPosPrograma: boolean;
  canAccessPainelGeralIndicadores: boolean;
  onGoHome: () => void;
  onSignOut: () => void;
  showToast: (message: string) => void;
}

type MonitoringLeaf = { key: MetasTab; label: string; can: (p: MonitoramentoAvaliacaoProps) => boolean };
type MonitoringNavConfigEntry =
  | { type: 'group'; label: string; items: MonitoringLeaf[] }
  | ({ type: 'direct' } & MonitoringLeaf);

// Fonte única de configuração da navegação: rótulo, permissão e
// agrupamento vivem juntos aqui — nada disso é repetido em outro lugar.
// As chaves (frequencia, alcance, eixo3...) continuam as mesmas de
// sempre; só a apresentação passou a ser hierárquica, agora organizada
// por tipo de interação (o que eu preencho × o que eu consulto), e não
// mais por assunto.
const MONITORING_NAV: MonitoringNavConfigEntry[] = [
  {
    type: 'group', label: 'Formulários', items: [
      { key: 'eixo3',             label: 'Visita In Loco – Teórica',        can: p => p.isAdmin || p.canAccessEixo3 },
      { key: 'eixo3pratica',      label: 'Visita In Loco – Prática',        can: p => p.isAdmin || p.canAccessEixo3 },
      { key: 'formulario30dias',  label: 'Verificação Inicial — 30 Dias',   can: p => p.isAdmin || p.canAccessFormulario30Dias },
      { key: 'relatorio',         label: 'Relatório Final',                 can: p => p.isAdmin || p.canAccessRelatorio },
      { key: 'pesquisasSatisfacao',   label: 'Indicadores de Satisfação',   can: p => p.isAdmin || p.canAccessPesquisasSatisfacao },
      { key: 'avaliacaoPosPrograma',  label: 'Avaliação Pós-Programa',      can: p => p.isAdmin || p.canAccessAvaliacaoPosPrograma },
    ],
  },
  {
    type: 'group', label: 'Painéis', items: [
      { key: 'painelGeral',  label: 'Painel Geral de Indicadores',      can: p => p.isAdmin || p.canAccessPainelGeralIndicadores },
      { key: 'frequencia',   label: 'Eixo 1 — Inclusão',                can: p => p.isAdmin || p.canAccessFrequencia },
      { key: 'alcance',      label: 'Eixo 2 — Alcance',                 can: p => p.isAdmin || p.canAccessAlcance },
      { key: 'eixo4',        label: 'Visita In Loco – Teórica',         can: p => p.isAdmin || p.canAccessEixo4 },
      { key: 'eixo4pratica', label: 'Visita In Loco – Prática',         can: p => p.isAdmin || p.canAccessEixo4 },
      { key: 'painel30dias', label: 'Verificação Inicial — 30 Dias',    can: p => p.isAdmin || p.canAccessPainel30Dias },
      { key: 'painelSatisfacao',    label: 'Indicadores de Satisfação', can: p => p.isAdmin || p.canAccessPainelSatisfacao },
      { key: 'painelPosPrograma',   label: 'Avaliação Pós-Programa',    can: p => p.isAdmin || p.canAccessPainelPosPrograma },
    ],
  },
];

// Lista achatada de todas as abas — usada só para decidir a primeira aba
// liberada quando as permissões chegam do Firestore.
const TODAS_ABAS: MonitoringLeaf[] = MONITORING_NAV.flatMap(entry => (entry.type === 'group' ? entry.items : [entry]));

export const MonitoramentoAvaliacao: React.FC<MonitoramentoAvaliacaoProps> = (props) => {
  const { isAdmin, onGoHome, onSignOut, showToast } = props;
  const [activeTab, setActiveTab] = useState<MetasTab | null>(null);

  // Monta as entradas visíveis a partir da fonte única, na ordem definida
  // acima. Um grupo que fica com só 1 item liberado por permissão vira
  // acesso direto, na mesma posição — evita dropdown de item único.
  const entries: NavEntry[] = MONITORING_NAV.reduce<NavEntry[]>((acc, entry) => {
    if (entry.type === 'direct') {
      if (entry.can(props)) acc.push({ type: 'direct', key: entry.key, label: entry.label });
      return acc;
    }
    const visibleItems = entry.items.filter(i => i.can(props)).map(i => ({ key: i.key, label: i.label }));
    if (visibleItems.length === 0) return acc;
    if (visibleItems.length === 1) acc.push({ type: 'direct', key: visibleItems[0].key, label: visibleItems[0].label });
    else acc.push({ type: 'group', label: entry.label, items: visibleItems });
    return acc;
  }, []);

  // Seleciona a primeira aba liberada assim que as permissões chegam do
  // Firestore (chegam de forma assíncrona, depois do primeiro render).
  // Só decide uma vez — não atropela a navegação manual do usuário.
  useEffect(() => {
    if (activeTab !== null) return;
    const first = TODAS_ABAS.find(t => t.can(props));
    if (first) setActiveTab(first.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isAdmin, props.canAccessRelatorio, props.canAccessFrequencia, props.canAccessAlcance, props.canAccessEixo3, props.canAccessEixo4, props.canAccessFormulario30Dias, props.canAccessPainel30Dias, props.canAccessPesquisasSatisfacao, props.canAccessPainelSatisfacao, props.canAccessAvaliacaoPosPrograma, props.canAccessPainelPosPrograma, props.canAccessPainelGeralIndicadores]);

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
          <div className="mb-8">
            <MonitoringNavigation
              entries={entries}
              activeKey={activeTab}
              onSelect={key => setActiveTab(key as MetasTab)}
            />
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

          {activeTab === 'frequencia' && <Frequencia />}
          {activeTab === 'alcance' && <Alcance />}
          {activeTab === 'eixo3' && <VisitaInLocoForm showToast={showToast} />}
          {activeTab === 'eixo3pratica' && <VisitaInLocoPraticaForm showToast={showToast} />}
          {activeTab === 'eixo4' && <VisitaInLocoDashboard />}
          {activeTab === 'eixo4pratica' && <VisitaInLocoPraticaDashboard />}
          {activeTab === 'formulario30dias' && <Formulario30DiasForm showToast={showToast} />}
          {activeTab === 'painel30dias' && <Painel30Dias />}
          {activeTab === 'relatorio' && <RelatorioFinal isAdmin={isAdmin} showToast={showToast} />}
          {activeTab === 'pesquisasSatisfacao' && <PesquisasSatisfacaoImport />}
          {activeTab === 'avaliacaoPosPrograma' && <AvaliacaoPosProgramaImport />}
          {activeTab === 'painelSatisfacao' && <PainelIndicadoresSatisfacao />}
          {activeTab === 'painelPosPrograma' && <PainelAvaliacaoPosPrograma />}
          {activeTab === 'painelGeral' && <PainelGeralIndicadores />}
        </div>
      </div>
    </div>
  );
};
