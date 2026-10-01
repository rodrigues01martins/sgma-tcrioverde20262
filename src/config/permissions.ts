// ============================================================
// FONTE ÚNICA DAS PERMISSÕES INDIVIDUAIS (canAccess*)
// ============================================================
// Usada por UserManagement.tsx (matriz de toggles), App.tsx (defaults
// do primeiro login) e pelo endpoint server-side api/admin/create-user
// (defaults do usuário recém-criado) — existir num só lugar evita a
// divergência que já ocorreu antes (as 4 permissões de Pesquisas de
// Satisfação existiam em App.tsx/firestore.rules mas não apareciam
// aqui). As CHAVES continuam sendo a fonte de verdade real: qualquer
// alteração aqui precisa continuar espelhada em firestore.rules (que é
// declarativo e não pode importar TypeScript).
//
// Total real confirmado: 18 permissões individuais.
export type PermissionKey =
  // Apuração Mensal
  | 'canAccessUpload' | 'canAccessGerencial' | 'canAccessRepasse' | 'canAccessHistorico'
  // Monitoramento e Avaliação
  | 'canAccessEixo3' | 'canAccessFormulario30Dias' | 'canAccessRelatorio'
  | 'canAccessPesquisasSatisfacao' | 'canAccessAvaliacaoPosPrograma'
  | 'canAccessFrequencia' | 'canAccessAlcance' | 'canAccessEixo4' | 'canAccessPainel30Dias'
  | 'canAccessPainelSatisfacao' | 'canAccessPainelPosPrograma' | 'canAccessPainelGeralIndicadores'
  // Acompanhamento Financeiro
  | 'canAccessEntry' | 'canAccessReport';

export type AreaKey = 'Apuração Mensal' | 'Monitoramento e Avaliação' | 'Acompanhamento Financeiro';

export interface PermissionField {
  key: PermissionKey;
  label: string;
  group: AreaKey;
  subgroup?: 'Formulários' | 'Painéis';
}

// `group`/`subgroup` são só metadados de apresentação (como a Gestão de
// Usuários organiza visualmente os toggles); `subgroup` em Monitoramento
// e Avaliação espelha a navegação real do módulo (Formulários ×
// Painéis) — não cria perfil nem muda o significado de nenhuma chave.
export const PERMISSION_FIELDS: PermissionField[] = [
  { key: 'canAccessUpload',    label: 'Upload',    group: 'Apuração Mensal' },
  { key: 'canAccessGerencial', label: 'Gerencial', group: 'Apuração Mensal' },
  { key: 'canAccessRepasse',   label: 'Repasse',   group: 'Apuração Mensal' },
  { key: 'canAccessHistorico', label: 'Histórico', group: 'Apuração Mensal' },

  { key: 'canAccessEixo3',                  label: 'Visita In Loco (Teórica e Prática)', group: 'Monitoramento e Avaliação', subgroup: 'Formulários' },
  { key: 'canAccessFormulario30Dias',       label: 'Verificação Inicial — 30 Dias',      group: 'Monitoramento e Avaliação', subgroup: 'Formulários' },
  { key: 'canAccessRelatorio',              label: 'Relatório Final',                    group: 'Monitoramento e Avaliação', subgroup: 'Formulários' },
  { key: 'canAccessPesquisasSatisfacao',    label: 'Indicadores de Satisfação',          group: 'Monitoramento e Avaliação', subgroup: 'Formulários' },
  { key: 'canAccessAvaliacaoPosPrograma',   label: 'Avaliação Pós-Programa',             group: 'Monitoramento e Avaliação', subgroup: 'Formulários' },

  { key: 'canAccessPainelGeralIndicadores', label: 'Painel Geral de Indicadores', group: 'Monitoramento e Avaliação', subgroup: 'Painéis' },
  { key: 'canAccessFrequencia',    label: 'Eixo 1 — Inclusão',                  group: 'Monitoramento e Avaliação', subgroup: 'Painéis' },
  { key: 'canAccessAlcance',       label: 'Eixo 2 — Alcance',                   group: 'Monitoramento e Avaliação', subgroup: 'Painéis' },
  { key: 'canAccessEixo4',         label: 'Visita In Loco (Teórica e Prática)', group: 'Monitoramento e Avaliação', subgroup: 'Painéis' },
  { key: 'canAccessPainel30Dias',  label: 'Verificação Inicial — 30 Dias',      group: 'Monitoramento e Avaliação', subgroup: 'Painéis' },
  { key: 'canAccessPainelSatisfacao',  label: 'Indicadores de Satisfação',      group: 'Monitoramento e Avaliação', subgroup: 'Painéis' },
  { key: 'canAccessPainelPosPrograma', label: 'Avaliação Pós-Programa',         group: 'Monitoramento e Avaliação', subgroup: 'Painéis' },

  { key: 'canAccessEntry',  label: 'Novo Lançamento',                       group: 'Acompanhamento Financeiro' },
  { key: 'canAccessReport', label: 'Acompanhar Despesa e Painel Financeiro', group: 'Acompanhamento Financeiro' },
];

export const AREA_ORDER: AreaKey[] = ['Apuração Mensal', 'Monitoramento e Avaliação', 'Acompanhamento Financeiro'];

export const PERMISSION_KEYS: PermissionKey[] = PERMISSION_FIELDS.map(f => f.key);

// Todo usuário novo nasce com privilégio zero (seção 17) — usado tanto
// pelo primeiro login (App.tsx) quanto pela criação administrativa
// (api/admin/create-user), para as duas rotas nunca divergirem.
export const DEFAULT_PERMISSIONS: Record<PermissionKey, false> = PERMISSION_KEYS.reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {} as Record<PermissionKey, false>);
