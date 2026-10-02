import municipiosRaw from './municipios-goias.json';

// ============================================================
// FONTE CANÔNICA — os 246 municípios de Goiás
// ============================================================
// Gerado a partir do JSON de municípios brasileiros fornecido, já
// recortado para Goiás (codigo_uf === 52). Substitui COORDS_GOIAS
// (243 registros, incompleta) como única referência territorial do
// app: mapa, filtros, Cobertura Territorial e drill-down usam todos
// este mesmo array — nenhum deles mantém lista própria.

export interface MunicipioGoias {
  readonly codigo_ibge: number;
  readonly nome: string;
  readonly latitude: number;
  readonly longitude: number;
}

export const MUNICIPIOS_GOIAS: readonly MunicipioGoias[] = Object.freeze(
  (municipiosRaw as MunicipioGoias[]).map(m => Object.freeze({ ...m }))
);

// Regra de domínio explícita (não `MUNICIPIOS_GOIAS.length`) — protege
// contra a base encolher silenciosamente se algum município for
// removido por engano no futuro: o teste/assert abaixo falha alto e
// cedo em vez de o indicador de Cobertura Territorial passar a
// calcular sobre um universo errado sem ninguém perceber.
export const TOTAL_MUNICIPIOS_GOIAS = 246;

if (MUNICIPIOS_GOIAS.length !== TOTAL_MUNICIPIOS_GOIAS) {
  throw new Error(
    `Base de municípios de Goiás corrompida: esperado ${TOTAL_MUNICIPIOS_GOIAS}, encontrado ${MUNICIPIOS_GOIAS.length}.`
  );
}

// ------------------------------------------------------------
// Normalização — SOMENTE para comparação/match (CSV pode vir sem
// acento ou em uppercase). O nome exibido na interface continua
// sempre o oficial, vindo de MunicipioGoias.nome.
// ------------------------------------------------------------
export function normalizeMunicipioName(nome: string | null | undefined): string {
  return (nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const INDICE_POR_NOME_NORMALIZADO: ReadonlyMap<string, MunicipioGoias> = new Map(
  MUNICIPIOS_GOIAS.map(m => [normalizeMunicipioName(m.nome), m])
);

// Encontra o município canônico a partir de qualquer grafia (com/sem
// acento, qualquer caixa) — usado pelo mapa e pelo drill-down para
// associar um valor de CSV (`row.cidade`) ao registro oficial.
export function encontrarMunicipioGoias(nomeQualquer: string | null | undefined): MunicipioGoias | undefined {
  return INDICE_POR_NOME_NORMALIZADO.get(normalizeMunicipioName(nomeQualquer));
}
