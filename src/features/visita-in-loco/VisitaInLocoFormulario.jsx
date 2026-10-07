import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Button from '../../components/monitor/ui/Button'
import Badge from '../../components/monitor/ui/Badge'
import { Input } from '../../components/monitor/ui/Input'
import AutosaveStatus from '../../components/monitor/ui/AutosaveStatus'
import { useAutosave } from '../../hooks/useAutosave'
import {
  SECOES,
  STATUS_ITEM,
  STATUS_POR_VALOR,
  STATUS_VISITA,
  ROTULOS_IDENTIFICACAO,
  FAIXAS_CLASSIFICACAO,
  PARECERES,
} from './config.js'
import { apurarVisita, validarFinalizacao, horarioInvertido } from './apuracao.js'
import { salvarRascunho, finalizarVisita } from './visitaInLocoService.js'

const FONT = 'var(--font-family)'

const cartao = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  marginBottom: '20px',
}

const cabecalhoCartao = {
  padding: '14px 20px',
  background: 'var(--bg-subtle)',
  borderBottom: '1px solid var(--border-default)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '8px',
}

const tituloCartao = { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: FONT }
const rotulo = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: FONT }
const textoErro = { fontSize: '12px', color: 'var(--status-danger-text)', fontFamily: FONT, marginTop: '4px' }

function estiloTextarea(erro, disabled) {
  return {
    width: '100%',
    minHeight: '72px',
    padding: '10px 14px',
    fontSize: '14px',
    fontFamily: FONT,
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${erro ? 'var(--status-danger-border)' : 'var(--border-default)'}`,
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    outline: 'none',
    resize: 'vertical',
    opacity: disabled ? 0.75 : 1,
  }
}

export function formatarPercentual(valor) {
  if (valor === null || valor === undefined) return 'Não aplicável'
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

export function formatarDataBR(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

const CORES_STATUS = {
  success: { bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success-text)' },
  warning: { bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', text: 'var(--status-warning-text)' },
  danger: { bg: 'var(--status-danger-bg)', border: 'var(--status-danger-border)', text: 'var(--status-danger-text)' },
  neutral: { bg: 'var(--bg-subtle)', border: 'var(--border-strong)', text: 'var(--text-secondary)' },
}

function BotaoStatus({ opcao, selecionado, disabled, onClick }) {
  const c = CORES_STATUS[opcao.variant]
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: '1 1 150px',
        minHeight: '44px',
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${selecionado ? c.border : 'var(--border-default)'}`,
        background: selecionado ? c.bg : 'var(--bg-surface)',
        color: selecionado ? c.text : 'var(--text-secondary)',
        fontFamily: FONT,
        fontSize: '13px',
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && !selecionado ? 0.5 : 1,
      }}
    >
      {selecionado ? '✓ ' : ''}{opcao.label}
    </button>
  )
}

function ItemAvaliacao({ item, resposta, somenteLeitura, mostrarErros, onStatus, onObservacao }) {
  const naoSeAplica = resposta?.status === 'nao_se_aplica'
  const semStatus = mostrarErros && !STATUS_POR_VALOR[resposta?.status]
  const semObservacao = mostrarErros && !(resposta?.observacao || '').trim()
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: FONT }}>
          {item.criterio}
        </p>
        {item.critico && <Badge variant="danger">⚠ Item crítico</Badge>}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: FONT, marginBottom: '10px' }}>
        {item.descricao}
      </p>
      <div role="group" aria-label={`Status — ${item.criterio}`} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        {STATUS_ITEM.map(op => (
          <BotaoStatus
            key={op.valor}
            opcao={op}
            selecionado={resposta?.status === op.valor}
            disabled={somenteLeitura}
            onClick={() => onStatus(op.valor)}
          />
        ))}
      </div>
      {semStatus && <p style={textoErro}>Selecione o status deste item.</p>}
      <textarea
        aria-label={`Observação — ${item.criterio}`}
        placeholder={naoSeAplica ? 'Justifique a não aplicabilidade (obrigatório)' : 'Observação (obrigatória)'}
        value={resposta?.observacao || ''}
        readOnly={somenteLeitura}
        onChange={e => onObservacao(e.target.value)}
        style={{ ...estiloTextarea(semObservacao, somenteLeitura), marginTop: '6px' }}
      />
      {semObservacao && (
        <p style={textoErro}>
          {naoSeAplica ? 'Justifique a não aplicabilidade deste item.' : 'A observação é obrigatória.'}
        </p>
      )}
    </div>
  )
}

function PainelApuracao({ apuracao, itens, parcial }) {
  const classificacao = FAIXAS_CLASSIFICACAO.find(f => f.chave === apuracao.classificacao)
  const parecer = PARECERES[apuracao.parecer]
  const criticosAfetados = SECOES.flatMap(s => s.itens)
    .filter(i => i.critico && ['nao_conforme', 'conforme_parcialmente'].includes(itens?.[i.id]?.status))
  return (
    <div style={cartao}>
      <div style={cabecalhoCartao}>
        <h3 style={tituloCartao}>Apuração</h3>
        {parcial && (
          <Badge variant="warning">Resultado parcial — {apuracao.itensAvaliados} de {apuracao.totalItens} itens avaliados</Badge>
        )}
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div>
            <p style={rotulo}>Percentual global</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: FONT }}>
              {formatarPercentual(apuracao.percentualGlobal)}
            </p>
          </div>
          <div>
            <p style={rotulo}>Classificação</p>
            {classificacao ? <Badge variant={classificacao.variant}>{classificacao.label}</Badge> : <Badge>Não aplicável</Badge>}
          </div>
          <div>
            <p style={rotulo}>Parecer geral</p>
            <Badge variant={parecer.variant}>{parecer.label}</Badge>
          </div>
        </div>

        <p style={{ ...rotulo, marginBottom: '6px' }}>Distribuição dos status</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <Badge variant="success">Conforme: {apuracao.quantidadeConforme}</Badge>
          <Badge variant="warning">Conforme Parcialmente: {apuracao.quantidadeConformeParcialmente}</Badge>
          <Badge variant="danger">Não Conforme: {apuracao.quantidadeNaoConforme}</Badge>
          <Badge>Não se Aplica: {apuracao.quantidadeNaoSeAplica}</Badge>
          <Badge variant="brand">Aplicáveis: {apuracao.itensAplicaveis} de {apuracao.totalItens}</Badge>
        </div>

        <p style={{ ...rotulo, marginBottom: '6px' }}>Resultado por seção</p>
        <div style={{ marginBottom: '20px' }}>
          {SECOES.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px dashed var(--border-default)', fontSize: '13px', fontFamily: FONT }}>
              <span style={{ color: 'var(--text-primary)' }}>{s.numero}. {s.titulo}</span>
              <strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{formatarPercentual(apuracao.percentuaisSecoes?.[s.id])}</strong>
            </div>
          ))}
        </div>

        <p style={{ ...rotulo, marginBottom: '6px' }}>Itens críticos</p>
        {apuracao.criticosNaoConformes === 0 && apuracao.criticosParciais === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: FONT }}>
            Nenhum item crítico Não Conforme ou Conforme Parcialmente{parcial ? ' até o momento' : ''}.
          </p>
        ) : (
          <div role="alert" style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', fontSize: '13px', fontFamily: FONT, color: 'var(--status-danger-text)' }}>
            <strong>⚠ {apuracao.criticosNaoConformes} item(ns) crítico(s) Não Conforme e {apuracao.criticosParciais} Conforme Parcialmente:</strong>
            <ul style={{ margin: '6px 0 0 18px', listStyle: 'disc' }}>
              {criticosAfetados.map(i => <li key={i.id}>{i.criterio} — {STATUS_POR_VALOR[itens[i.id].status].label}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function dadosIniciais(visita) {
  return {
    visita: {
      horaInicio: visita.visita?.horaInicio || '',
      horaTermino: visita.visita?.horaTermino || '',
      representanteOsc: visita.visita?.representanteOsc || '',
    },
    itens: visita.itens || {},
    conclusao: {
      resumoAchados: visita.conclusao?.resumoAchados || '',
      recomendacoes: visita.conclusao?.recomendacoes || '',
      prazoSaneamentoDias: visita.conclusao?.prazoSaneamentoDias ?? null,
    },
  }
}

export default function VisitaInLocoFormulario({ visita: visitaInicial, podeEditar, avisoLeitura, onVoltar, onFinalizada, showToast }) {
  const [registro, setRegistro] = useState(visitaInicial)
  const [dados, setDados] = useState(() => dadosIniciais(visitaInicial))
  const [tentouFinalizar, setTentouFinalizar] = useState(false)
  const [finalizando, setFinalizando] = useState(false)

  const finalizada = registro.status === STATUS_VISITA.finalizada.valor
  const somenteLeitura = !podeEditar || finalizada
  const dataVisita = registro.id

  const salvar = useCallback(d => salvarRascunho(dataVisita, d), [dataVisita])
  const autosave = useAutosave(salvar, { delay: 2000, enabled: !somenteLeitura })

  // Só notifica alterações feitas pelo usuário — não a carga inicial.
  const carregouRef = useRef(false)
  useEffect(() => {
    if (!carregouRef.current) { carregouRef.current = true; return }
    if (!somenteLeitura) autosave.notifyChange(dados)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados])

  const apuracao = useMemo(
    () => (finalizada && registro.apuracao ? registro.apuracao : apurarVisita(dados.itens)),
    [finalizada, registro.apuracao, dados.itens],
  )

  const erros = tentouFinalizar && !somenteLeitura
    ? validarFinalizacao({ visita: { ...dados.visita, data: dataVisita }, vistoriador: registro.vistoriador, itens: dados.itens, conclusao: dados.conclusao })
    : []
  const erroCampo = campo => erros.find(e => e.campo === campo)?.mensagem

  const setVisita = (campo, valor) => setDados(d => ({ ...d, visita: { ...d.visita, [campo]: valor } }))
  const setConclusao = (campo, valor) => setDados(d => ({ ...d, conclusao: { ...d.conclusao, [campo]: valor } }))
  const setItem = (id, campo, valor) => setDados(d => ({ ...d, itens: { ...d.itens, [id]: { ...d.itens[id], [campo]: valor } } }))

  function setPrazo(texto) {
    if (texto === '') return setConclusao('prazoSaneamentoDias', null)
    const n = Number(texto)
    setConclusao('prazoSaneamentoDias', Number.isFinite(n) ? n : null)
  }

  async function handleFinalizar() {
    setTentouFinalizar(true)
    const pendencias = validarFinalizacao({ visita: { ...dados.visita, data: dataVisita }, vistoriador: registro.vistoriador, itens: dados.itens, conclusao: dados.conclusao })
    if (pendencias.length > 0) {
      showToast?.(`Não é possível finalizar: ${pendencias.length} pendência(s). Verifique os campos destacados.`)
      return
    }
    if (!window.confirm('Após finalizar, a visita não poderá mais ser editada. Deseja finalizar?')) return
    setFinalizando(true)
    // Cancela o autosave agendado — a finalização grava todos os dados.
    autosave.reset()
    try {
      const atualizacao = await finalizarVisita(dataVisita, { ...dados, vistoriador: registro.vistoriador })
      const atualizada = { ...registro, ...atualizacao }
      setRegistro(atualizada)
      onFinalizada?.(atualizada)
      showToast?.('Visita In Loco finalizada com sucesso.')
    } catch (e) {
      // Os dados continuam no formulário; reativa o autosave.
      autosave.notifyChange(dados)
      showToast?.('Não foi possível finalizar a visita: ' + (e?.message || 'erro desconhecido'))
    } finally {
      setFinalizando(false)
    }
  }

  const statusVisita = STATUS_VISITA[registro.status] || STATUS_VISITA.rascunho
  const identificacao = registro.identificacao || {}
  const vistoriadorTexto = [registro.vistoriador?.nome, registro.vistoriador?.email].filter(Boolean).join(' — ')

  return (
    <div style={{ paddingBottom: '96px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: FONT, letterSpacing: '-0.01em' }}>
            Visita In Loco
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: FONT }}>
            Visita de {formatarDataBR(dataVisita)}
          </p>
        </div>
        <Badge variant={statusVisita.variant}>{statusVisita.label}</Badge>
      </div>

      {avisoLeitura && (
        <div role="status" style={{ ...cartao, padding: '12px 16px', background: 'var(--status-info-bg)', borderColor: 'var(--status-info-border)', color: 'var(--status-info-text)', fontSize: '13px', fontFamily: FONT }}>
          {avisoLeitura}
        </div>
      )}

      {/* ── Identificação do instrumento (snapshot, somente leitura) ── */}
      <div style={cartao}>
        <div style={cabecalhoCartao}><h3 style={tituloCartao}>Identificação do instrumento</h3></div>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {ROTULOS_IDENTIFICACAO.map(([chave, label]) => (
            <div key={chave} style={chave === 'objeto' ? { gridColumn: '1 / -1' } : undefined}>
              <p style={rotulo}>{label}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: FONT }}>{identificacao[chave] || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Identificação da visita ── */}
      <div style={cartao}>
        <div style={cabecalhoCartao}><h3 style={tituloCartao}>Identificação da visita</h3></div>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Input label="Data da visita" type="date" value={dataVisita} disabled readOnly />
          <Input label="Hora de início *" type="time" value={dados.visita.horaInicio} disabled={somenteLeitura}
            onChange={e => setVisita('horaInicio', e.target.value)} error={erroCampo('horaInicio')} />
          <Input label="Hora de término *" type="time" value={dados.visita.horaTermino} disabled={somenteLeitura}
            onChange={e => setVisita('horaTermino', e.target.value)}
            error={erroCampo('horaTermino') || (horarioInvertido(dados.visita.horaInicio, dados.visita.horaTermino) ? 'A hora de término não pode ser anterior à hora de início.' : undefined)} />
          <Input label="Vistoriador" value={vistoriadorTexto} disabled readOnly error={erroCampo('vistoriador')} />
          <Input label="Representante da OSC *" value={dados.visita.representanteOsc} disabled={somenteLeitura}
            onChange={e => setVisita('representanteOsc', e.target.value)} placeholder="Nome de quem acompanhou a visita"
            error={erroCampo('representanteOsc')} />
        </div>
      </div>

      {/* ── 7 seções / 22 itens ── */}
      {SECOES.map(secao => (
        <div key={secao.id} style={{ ...cartao, overflow: 'hidden' }}>
          <div style={cabecalhoCartao}>
            <h3 style={tituloCartao}>{secao.numero}. {secao.titulo}</h3>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: FONT }}>
              {formatarPercentual(apuracao.percentuaisSecoes?.[secao.id])}
            </span>
          </div>
          {secao.itens.map(item => (
            <ItemAvaliacao
              key={item.id}
              item={item}
              resposta={dados.itens[item.id]}
              somenteLeitura={somenteLeitura}
              mostrarErros={tentouFinalizar && !somenteLeitura}
              onStatus={v => setItem(item.id, 'status', v)}
              onObservacao={t => setItem(item.id, 'observacao', t)}
            />
          ))}
        </div>
      ))}

      {/* ── Conclusão e encaminhamentos ── */}
      <div style={cartao}>
        <div style={cabecalhoCartao}><h3 style={tituloCartao}>Conclusão e encaminhamentos</h3></div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="vil-resumo" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: FONT }}>Resumo dos achados *</label>
            <textarea id="vil-resumo" value={dados.conclusao.resumoAchados} readOnly={somenteLeitura}
              onChange={e => setConclusao('resumoAchados', e.target.value)}
              style={{ ...estiloTextarea(!!erroCampo('resumoAchados'), somenteLeitura), marginTop: '6px', minHeight: '96px' }} />
            {erroCampo('resumoAchados') && <p style={textoErro}>{erroCampo('resumoAchados')}</p>}
          </div>
          <div>
            <label htmlFor="vil-recomendacoes" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: FONT }}>Recomendações / notificações / saneamento *</label>
            <textarea id="vil-recomendacoes" value={dados.conclusao.recomendacoes} readOnly={somenteLeitura}
              onChange={e => setConclusao('recomendacoes', e.target.value)}
              style={{ ...estiloTextarea(!!erroCampo('recomendacoes'), somenteLeitura), marginTop: '6px', minHeight: '96px' }} />
            {erroCampo('recomendacoes') && <p style={textoErro}>{erroCampo('recomendacoes')}</p>}
          </div>
          <div style={{ maxWidth: '260px' }}>
            <Input label="Prazo de saneamento (dias) *" type="number" min="1" step="1" inputMode="numeric"
              value={dados.conclusao.prazoSaneamentoDias ?? ''} disabled={somenteLeitura}
              onChange={e => setPrazo(e.target.value)} error={erroCampo('prazoSaneamentoDias')} />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: FONT, marginBottom: '6px' }}>Parecer geral</p>
            <Badge variant={PARECERES[apuracao.parecer].variant}>{PARECERES[apuracao.parecer].label}</Badge>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: FONT, marginTop: '6px' }}>
              Calculado automaticamente a partir dos itens{finalizada ? '' : ' — não pode ser alterado manualmente'}.
            </p>
          </div>
        </div>
      </div>

      <PainelApuracao apuracao={apuracao} itens={dados.itens} parcial={!finalizada} />

      {tentouFinalizar && erros.length > 0 && (
        <div role="alert" style={{ ...cartao, padding: '12px 16px', background: 'var(--status-danger-bg)', borderColor: 'var(--status-danger-border)', color: 'var(--status-danger-text)', fontSize: '13px', fontFamily: FONT }}>
          <strong>Ainda há {erros.length} pendência(s) para finalizar:</strong>
          <ul style={{ margin: '6px 0 0 18px', listStyle: 'disc' }}>
            {erros.slice(0, 8).map(e => <li key={e.campo}>{e.mensagem}</li>)}
            {erros.length > 8 && <li>… e mais {erros.length - 8}.</li>}
          </ul>
        </div>
      )}

      {/* ── Rodapé fixo ── */}
      <div className="no-print" style={{
        position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '16px', flexWrap: 'wrap', padding: '16px 20px', background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }}>
        <div>
          <p style={rotulo}>Percentual global{finalizada ? '' : ' (parcial)'}</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: FONT }}>{formatarPercentual(apuracao.percentualGlobal)}</p>
          {!somenteLeitura && (
            <div style={{ marginTop: '4px' }}>
              <AutosaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} onRetry={() => autosave.saveNow()} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={onVoltar} disabled={finalizando}>← Voltar à lista</Button>
          {!somenteLeitura && (
            <Button variant="primary" onClick={handleFinalizar} loading={finalizando}
              disabled={finalizando || autosave.status === 'saving'}>
              Finalizar Visita
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
