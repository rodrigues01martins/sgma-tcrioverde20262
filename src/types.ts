export interface BudgetItem {
  id: string;
  stage: string;
  group: string;
  category: string;
  desc: string;
  value: number;
}

export interface LedgerEntry {
  id: string;
  itemCode: string;
  nf: string;
  supplier: string;
  category: string;
  documentName: string;
  documentData: string;
  approvalStatus: 'Em analise' | 'Pendente' | 'Aprovado' | 'Desaprovado';
  stage: string;
  group: string;
  description: string;
  amount: number;
  date: string;
  referenceMonth: string;
  createdAt: string;
  updatedAt: string;
  authorUid: string;
  auditComment?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  itemCode: string;
  nf: string;
  amount: number;
  detail: string;
  authorUid: string;
}

export interface PartnershipSettings {
  instrumento: string;
  processoSei: string;
  administracao: string;
  osc: string;
  objeto: string;
  valorGlobal: string;
  periodoIni: string;
  periodoFim: string;
  despesasPrevisto: {
    material: string;
    servicos: string;
    diarias: string;
    vencimentos: string;
    encargos: string;
  };
}
