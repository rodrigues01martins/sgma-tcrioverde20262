import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useGeneralIndicators } from '../../features/indicators-general/useGeneralIndicators';
import { INDICATOR_CATALOG } from '../../features/indicators-general/catalog';
import { formatarValor } from '../../features/indicators-general/situacao';
import IndicatorTooltip, { nomeIndicador } from '../../features/indicators-general/IndicatorTooltip';
import Loader from '../../components/monitor/ui/Loader';

// ============================================================
// PAINEL GERAL DE INDICADORES — relatório técnico consolidado
// ============================================================
// Caráter de relatório institucional (seção 9), não de dashboard: tabelas
// e fichas técnicas, não cards/gráficos. Reaproveita integralmente os
// motores já existentes via useGeneralIndicators — esta página só
// organiza a apresentação dos 44 resultados, nunca recalcula fórmula.

const ORDEM_DIMENSOES = [
  { dimensao: 'Pesquisas de Satisfação', publico: 'Aprendiz Ativo', titulo: 'Aprendiz Ativo' },
  { dimensao: 'Pesquisas de Satisfação', publico: 'Mentor da Prática', titulo: 'Mentor da Prática' },
  { dimensao: 'Pesquisas de Satisfação', publico: 'Responsável Legal', titulo: 'Responsável Legal' },
  { dimensao: 'Avaliação Pós-Programa', publico: 'Egresso', titulo: 'Egresso' },
  { dimensao: 'Análises Transversais', publico: 'Comparação entre públicos', titulo: 'Análises Transversais' },
  { dimensao: 'Execução do Programa', publico: 'Operação e cobertura', titulo: 'Execução do Programa' },
  { dimensao: 'Verificação Inicial — 30 Dias', publico: 'Aprendiz', titulo: 'Verificação Inicial — 30 Dias' },
];

const COR_SITUACAO = {
  'Meta atingida': '#059669',
  'Meta não atingida': '#DC2626',
  'Não apurado': '#94A3B8',
  'Não aplicável': '#64748B',
};

function Badge({ situacao }) {
  const cor = COR_SITUACAO[situacao] || '#64748B';
  return (
    <span style={{ color: cor, fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' }}>
      {situacao}
    </span>
  );
}

function formatarPeriodoMensal(periodo) {
  if (!periodo) return 'Não apurado (nenhuma competência importada)';
  const [ano, mes] = periodo.split('-');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[+mes - 1]}/${ano}`;
}

export default function PainelGeralIndicadores() {
  const { loading, resultadosPorSigla, periodos, ultimaAtualizacaoPesquisas } = useGeneralIndicators();

  const agrupado = useMemo(() => {
    return ORDEM_DIMENSOES.map(grupo => ({
      ...grupo,
      itens: INDICATOR_CATALOG.filter(i => i.dimensao === grupo.dimensao && i.publicoOuFonte === grupo.publico),
    }));
  }, []);

  const dataGeracao = useMemo(() => new Date(), []);

  if (loading) return <Loader message="Carregando o Painel Geral de Indicadores..." />;

  return (
    <div className="relatorio-geral" style={{ fontFamily: 'var(--font-family, inherit)', color: '#1e293b', maxWidth: '960px', margin: '0 auto' }}>

      {/* ── Ação de impressão — some na impressão (seção 28) ── */}
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--brand-primary, #007770)', color: '#fff',
            padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
            border: 'none', cursor: 'pointer',
          }}
        >
          <Printer size={16} /> Imprimir / Salvar em PDF
        </button>
      </div>

      {/* ── CAPA E IDENTIFICAÇÃO (seção 21) ── */}
      <section style={{ borderBottom: '3px solid var(--brand-primary, #007770)', paddingBottom: '24px', marginBottom: '32px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
          Programa Aprendiz do Futuro — SEDS/GO
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>RELATÓRIO GERAL DE INDICADORES</h1>
        <table style={{ marginTop: '12px', fontSize: '13px', color: '#334155' }}>
          <tbody>
            <tr><td style={{ fontWeight: 700, paddingRight: '12px' }}>Recorte territorial</td><td>Estado de Goiás — consolidado</td></tr>
            <tr><td style={{ fontWeight: 700, paddingRight: '12px' }}>Competência de Execução do Programa</td><td>{formatarPeriodoMensal(periodos.execucao)}</td></tr>
            <tr><td style={{ fontWeight: 700, paddingRight: '12px' }}>Período de Verificação Inicial — 30 Dias</td><td>{formatarPeriodoMensal(periodos.verificacao30)}</td></tr>
            <tr><td style={{ fontWeight: 700, paddingRight: '12px' }}>Pesquisas de satisfação/Egresso atualizadas em</td><td>{ultimaAtualizacaoPesquisas ? ultimaAtualizacaoPesquisas.toLocaleString('pt-BR') : 'Não apurado'}</td></tr>
            <tr><td style={{ fontWeight: 700, paddingRight: '12px' }}>Data e hora de geração</td><td>{dataGeracao.toLocaleString('pt-BR')}</td></tr>
          </tbody>
        </table>
      </section>

      {/* ── 1. APRESENTAÇÃO ── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>1. Apresentação</h2>
        <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
          Este relatório consolida os 44 indicadores da matriz metodológica definitiva do Programa Aprendiz do Futuro,
          organizados nas dimensões Pesquisas de Satisfação (Aprendiz Ativo, Mentor da Prática e Responsável Legal),
          Avaliação Pós-Programa (Egresso), Análises Transversais, Execução do Programa e Verificação Inicial — 30 Dias.
          Os resultados são calculados a partir dos mesmos dados e motores de cálculo já utilizados pelos painéis
          individuais de Monitoramento e Avaliação — nenhuma fórmula foi recalculada de forma independente para este
          documento. Os painéis de Visita In Loco (Teórica e Prática) permanecem disponíveis separadamente e são
          apresentados aqui apenas como informação complementar de fiscalização (seção 5), pois não integram os 44
          registros da matriz oficial.
        </p>
      </section>

      {/* ── 2. QUADRO CONSOLIDADO ── */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>2. Quadro Consolidado</h2>
        {agrupado.map(grupo => (
          <div key={grupo.titulo} style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--brand-primary, #007770)', marginBottom: '6px' }}>
              {grupo.titulo}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Código</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Indicador</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Resultado</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Meta</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {grupo.itens.map(item => {
                  const r = resultadosPorSigla[item.sigla];
                  return (
                    <tr key={item.sigla} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}><IndicatorTooltip code={item.sigla} /></td>
                      <td style={{ padding: '8px' }}>{item.nome}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {r?.comparativo ? 'Ver seção detalhada' : formatarValor(r?.valor ?? null, item.unidade)}
                      </td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{item.meta}</td>
                      <td style={{ padding: '8px' }}><Badge situacao={r?.situacao || 'Não apurado'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      {/* ── 3. RESULTADOS DETALHADOS ── */}
      <section className="quebra-pagina" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>3. Resultados Detalhados</h2>

        {agrupado.map(grupo => (
          <div key={grupo.titulo} style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '4px', marginBottom: '12px' }}>
              {grupo.titulo}
            </h3>

            {grupo.titulo === 'Análises Transversais' ? (
              grupo.itens.map(item => {
                const r = resultadosPorSigla[item.sigla];
                return (
                  <div key={item.sigla} className="ficha-indicador" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                    <p style={{ fontWeight: 700, fontSize: '14px' }}><IndicatorTooltip code={item.sigla} /> — {item.nome}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 8px' }}>{item.definicaoOperacional}</p>
                    {r?.comparativo && r.comparativo.length > 0 ? (
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                            <th style={{ padding: '6px' }}>Público</th>
                            <th style={{ padding: '6px' }}>Indicador de origem</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>Resultado</th>
                            <th style={{ padding: '6px' }}>Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.comparativo.map((p, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px' }}>{p.publico}</td>
                              <td style={{ padding: '6px' }}><IndicatorTooltip code={p.indicatorCode} /> — {p.resultado?.name || nomeIndicador(p.indicatorCode) || '—'}</td>
                              <td style={{ padding: '6px', textAlign: 'right' }}>{formatarValor(p.resultado?.value ?? null, 'Percentual')}</td>
                              <td style={{ padding: '6px' }}><Badge situacao={p.resultado?.targetMet === true ? 'Meta atingida' : p.resultado?.targetMet === false ? 'Meta não atingida' : 'Não apurado'} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Não apurado — nenhuma fonte comparável disponível ainda.</p>
                    )}
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Meta: {item.meta} · Periodicidade: {item.periodicidade}</p>
                  </div>
                );
              })
            ) : (
              grupo.itens.map(item => {
                const r = resultadosPorSigla[item.sigla];
                return (
                  <div key={item.sigla} className="ficha-indicador" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                      <p style={{ fontWeight: 700, fontSize: '14px' }}><IndicatorTooltip code={item.sigla} /> — {item.nome}</p>
                      <Badge situacao={r?.situacao || 'Não apurado'} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0' }}><strong>Resultado esperado:</strong> {item.resultadoEsperado}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0' }}><strong>Definição operacional:</strong> {item.definicaoOperacional}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0' }}><strong>Fórmula:</strong> {item.formula}</p>
                    <table style={{ marginTop: '8px', fontSize: '12px' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 700, paddingRight: '10px' }}>Resultado apurado</td>
                          <td>{formatarValor(r?.valor ?? null, item.unidade)}</td>
                        </tr>
                        {(r?.numerador !== undefined || r?.denominador !== undefined) && (
                          <tr>
                            <td style={{ fontWeight: 700, paddingRight: '10px' }}>Numerador / Denominador</td>
                            <td>{r?.numerador ?? '—'} / {r?.denominador ?? '—'}{r?.naCount ? ` (excluídas ${r.naCount} respostas não aplicáveis)` : ''}</td>
                          </tr>
                        )}
                        {r?.baseValida !== undefined && (
                          <tr>
                            <td style={{ fontWeight: 700, paddingRight: '10px' }}>Base válida</td>
                            <td>{r.positivas} positivas / {r.baseValida} respostas válidas</td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ fontWeight: 700, paddingRight: '10px' }}>Meta</td>
                          <td>{item.meta}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, paddingRight: '10px' }}>Fonte de dados</td>
                          <td>{item.publicoOuFonte}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 700, paddingRight: '10px' }}>Período utilizado</td>
                          <td>
                            {item.dimensao === 'Execução do Programa' ? formatarPeriodoMensal(periodos.execucao)
                              : item.dimensao === 'Verificação Inicial — 30 Dias' ? formatarPeriodoMensal(periodos.verificacao30)
                              : `${item.periodicidade} (base acumulada até a última importação)`}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })
            )}
          </div>
        ))}
      </section>

      {/* ── 4. NOTAS METODOLÓGICAS ── */}
      <section className="quebra-pagina" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>4. Notas Metodológicas</h2>
        <ul style={{ fontSize: '13px', lineHeight: 1.8, color: '#334155', paddingLeft: '18px' }}>
          <li>Escopo da matriz: 44 registros — 29 indicadores de pesquisas (10 Aprendiz Ativo + 6 Mentor da Prática + 5 Responsável Legal + 8 Egresso), 4 análises transversais, 6 indicadores de Execução do Programa e 5 de Verificação Inicial — 30 Dias. Os índices ISAA, ISRL, ISMP e ISEG, eliminados por duplicidade na revisão da matriz, não constam deste relatório.</li>
          <li>Favorabilidade: nas escalas de 1 a 5, as respostas 4 e 5 são consideradas favoráveis, exceto quando a definição operacional do próprio indicador especifica outra regra (ex.: INO trata 1 e 2 como favoráveis, por se tratar de item de ociosidade com leitura invertida).</li>
          <li>Respostas não aplicáveis: quando a definição do indicador prevê exclusão de respostas "não se aplica"/"nunca precisei" (ex.: IQRA, IAR, IARR, IAM), essas respostas são excluídas tanto do numerador quanto do denominador.</li>
          <li>PVP e TRV: capacidade permanente de 5.000 vagas. PVP mede a ocupação no fechamento da competência (não a soma de todos os participantes do mês). TRV considera as vagas ociosas na abertura do mês somadas aos desligamentos efetivos ocorridos na competência; quando não há nenhuma oportunidade de preenchimento (denominador zero), o resultado é apresentado como Não aplicável, nunca como zero.</li>
          <li>Referência temporal: Pesquisas de Satisfação e Análises Transversais são semestrais; Avaliação Pós-Programa (Egresso) é anual; Execução do Programa e Verificação Inicial — 30 Dias são mensais. As Análises Transversais que comparam resultados de Egresso (ATDS, ATIF, ATER) combinam uma fonte anual com fontes semestrais — este relatório identifica essa diferença de janela em vez de tratá-las como contemporâneas.</li>
          <li>Verificação Inicial — 30 Dias: a apuração considera somente formulários efetivamente concluídos; rascunhos não são contabilizados.</li>
          <li>Visita In Loco (Teórica e Prática): não constam como registros autônomos na matriz de 44 indicadores recebida — os painéis específicos continuam disponíveis separadamente em Monitoramento e Avaliação → Painéis.</li>
        </ul>
      </section>

    </div>
  );
}
