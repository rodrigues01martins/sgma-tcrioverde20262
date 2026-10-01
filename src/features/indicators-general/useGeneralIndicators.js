import { useEffect, useMemo, useState } from 'react';
import { buscarPeriodos, buscarDadosPeriodo } from '../../services/firestoreService';
import { calcularIndicadoresExecucao } from '../../services/indicadoresExecucaoService';
import {
  buscarPeriodosDisponiveis,
  buscarRespostasPeriodo,
  calculateAllIndicators,
} from '../../services/verificacao30DiasService';
import { useSurveyResponses } from '../../features/surveys/panels/useSurveyResponses';
import { calcularPainelCompleto } from '../../features/surveys/indicators/index';
import { INDICATOR_CATALOG } from './catalog';
import { avaliarSituacao } from './situacao';

// ============================================================
// PAINEL GERAL DE INDICADORES — carregamento e consolidação
// ============================================================
// Reaproveita INTEGRALMENTE os motores e serviços já usados pelos
// painéis individuais (seção 12): nenhuma fórmula é recalculada aqui,
// este hook só ORQUESTRA as mesmas chamadas e organiza os 44 resultados
// pela sigla oficial da matriz. Cada fonte é carregada uma única vez;
// os filtros de período de cada dimensão são os já existentes em cada
// módulo (competência mensal para Execução, período de aplicação para
// Verificação Inicial), nunca um recorte novo inventado para o relatório.

function situacaoDe(sigla, valor) {
  const item = INDICATOR_CATALOG.find(i => i.sigla === sigla);
  if (!item) return 'Não apurado';
  return avaliarSituacao(valor, item.meta, item.operador);
}

function montarResultado(sigla, valor, extra) {
  return { sigla, valor: valor === undefined ? null : valor, situacao: situacaoDe(sigla, valor), ...extra };
}

// Para os indicadores de pesquisa/egresso, o próprio motor (buildIndicatorResult)
// já calcula targetMet — reaproveitado aqui em vez de reavaliar a meta de
// novo, para garantir paridade exata com os painéis individuais (seção 12).
function situacaoDeTargetMet(targetMet) {
  if (targetMet === true) return 'Meta atingida';
  if (targetMet === false) return 'Meta não atingida';
  return 'Não apurado';
}

// Os códigos internos do motor de análises transversais (TRANSV_...) não
// são a sigla oficial da matriz — só o mapeamento de apresentação.
const SIGLA_TRANSVERSAL = {
  TRANSV_DESENVOLVIMENTO_SOCIOCOMPORTAMENTAL: 'ATDS',
  TRANSV_IMPACTO_FINANCEIRO: 'ATIF',
  TRANSV_EXPECTATIVA_RESULTADO_EMPREGABILIDADE: 'ATER',
  TRANSV_QUALIDADE_ATENDIMENTO: 'ATQA',
};

export function useGeneralIndicators() {
  // ── Execução do Programa (QAA, PVP, IFM, TEP, TRV, IAG) ──
  const [execucao, setExecucao] = useState({ loading: true, periodo: null, resultado: null, erro: null });
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const periodos = await buscarPeriodos();
        const periodo = periodos[0]?.periodo || null;
        if (!periodo) {
          if (!cancelado) setExecucao({ loading: false, periodo: null, resultado: null, erro: null });
          return;
        }
        const dados = await buscarDadosPeriodo(periodo);
        const resultado = calcularIndicadoresExecucao(dados, periodo);
        if (!cancelado) setExecucao({ loading: false, periodo, resultado, erro: null });
      } catch (e) {
        if (!cancelado) setExecucao({ loading: false, periodo: null, resultado: null, erro: e?.message || 'Erro ao carregar Execução do Programa' });
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // ── Verificação Inicial — 30 Dias (IRI, IRA, IEB, IAA, IACA) ──
  const [verificacao30, setVerificacao30] = useState({ loading: true, periodo: null, indicadores: null, erro: null });
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const periodos = await buscarPeriodosDisponiveis();
        const periodo = periodos[0] || null;
        if (!periodo) {
          if (!cancelado) setVerificacao30({ loading: false, periodo: null, indicadores: null, erro: null });
          return;
        }
        const respostas = await buscarRespostasPeriodo(periodo);
        // Só formulários efetivamente concluídos entram na apuração (seção 19) —
        // mesmo critério já usado em Painel30Dias.jsx.
        const concluidos = respostas.filter(r => r.status !== 'rascunho');
        const indicadores = calculateAllIndicators(concluidos);
        if (!cancelado) setVerificacao30({ loading: false, periodo, indicadores, erro: null });
      } catch (e) {
        if (!cancelado) setVerificacao30({ loading: false, periodo: null, indicadores: null, erro: e?.message || 'Erro ao carregar Verificação Inicial — 30 Dias' });
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // ── Pesquisas de Satisfação + Avaliação Pós-Programa + Transversais ──
  const { loading: loadingPesquisas, respostasPorTipo, ultimaAtualizacaoEm } =
    useSurveyResponses(['ACTIVE_LEARNER', 'MENTOR', 'GUARDIAN', 'GRADUATE']);

  const painelPesquisas = useMemo(() => {
    if (loadingPesquisas) return null;
    return calcularPainelCompleto({
      activeLearner: respostasPorTipo.ACTIVE_LEARNER || [],
      mentor: respostasPorTipo.MENTOR || [],
      guardian: respostasPorTipo.GUARDIAN || [],
      graduate: respostasPorTipo.GRADUATE || [],
    });
  }, [loadingPesquisas, respostasPorTipo]);

  const loading = execucao.loading || verificacao30.loading || loadingPesquisas;

  // ── Consolidação por sigla — os 44 registros, sempre presentes ──
  const resultadosPorSigla = useMemo(() => {
    const mapa = {};

    // Pesquisas de satisfação + Egresso + Transversais (33 registros) —
    // cada resultado já vem com value/targetMet do próprio motor.
    if (painelPesquisas) {
      const grupos = [painelPesquisas.activeLearner, painelPesquisas.mentor, painelPesquisas.guardian, painelPesquisas.graduate];
      for (const grupo of grupos) {
        for (const [codigo, resultado] of Object.entries(grupo || {})) {
          mapa[codigo] = {
            sigla: codigo,
            valor: resultado.value ?? null,
            situacao: situacaoDeTargetMet(resultado.targetMet),
            numerador: resultado.numerator, denominador: resultado.denominator,
            naCount: resultado.naCount, invalidCount: resultado.invalidCount,
          };
        }
      }
      for (const analise of painelPesquisas.transversais || []) {
        const sigla = SIGLA_TRANSVERSAL[analise.code] || analise.code;
        mapa[sigla] = { sigla, valor: null, situacao: 'Não aplicável', comparativo: analise.perspectivas };
      }
    }

    // Execução do Programa (6 registros)
    if (execucao.resultado) {
      mapa.QAA = montarResultado('QAA', execucao.resultado.qaa);
      mapa.PVP = montarResultado('PVP', execucao.resultado.pvp);
      mapa.IFM = montarResultado('IFM', execucao.resultado.ifm);
      mapa.TEP = montarResultado('TEP', execucao.resultado.tep);
      mapa.TRV = montarResultado('TRV', execucao.resultado.trv);
      mapa.IAG = montarResultado('IAG', execucao.resultado.iag);
    }

    // Verificação Inicial — 30 Dias (5 registros) — calculateAllIndicators
    // retorna um objeto { [id]: resultado }, não um array.
    if (verificacao30.indicadores) {
      for (const ind of Object.values(verificacao30.indicadores)) {
        mapa[ind.id] = montarResultado(ind.id, ind.percentual, { positivas: ind.positivas, baseValida: ind.baseValida });
      }
    }

    // Garante que os 44 registros do catálogo SEMPRE apareçam, mesmo sem
    // fonte carregada ainda (seção 25: nunca ocultar por ausência de dado).
    for (const item of INDICATOR_CATALOG) {
      if (!mapa[item.sigla]) mapa[item.sigla] = montarResultado(item.sigla, null);
    }

    return mapa;
  }, [painelPesquisas, execucao.resultado, verificacao30.indicadores]);

  return {
    loading,
    resultadosPorSigla,
    periodos: { execucao: execucao.periodo, verificacao30: verificacao30.periodo },
    ultimaAtualizacaoPesquisas: ultimaAtualizacaoEm,
    erros: { execucao: execucao.erro, verificacao30: verificacao30.erro },
  };
}
