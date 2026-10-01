import { useState, useCallback, useEffect, useRef } from 'react'
import { auth } from '../../firebase'
import Button from '../../components/monitor/ui/Button'
import Badge from '../../components/monitor/ui/Badge'
import { Input, Select } from '../../components/monitor/ui/Input'
import AutosaveStatus from '../../components/monitor/ui/AutosaveStatus'
import { useAutosave } from '../../hooks/useAutosave'
import { MUNICIPIOS_GOIAS } from '../../data/municipiosGoias'
import {
  QUESTION_DEFINITIONS,
  isApplicable,
  validarRespostasCompletas,
  calcularDiasTranscorridos,
  criarRascunhoVerificacao30Dias,
  atualizarRascunhoVerificacao30Dias,
  enviarVerificacao30Dias,
} from '../../services/verificacao30DiasService'

const MUNICIPIOS = MUNICIPIOS_GOIAS.map(m => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'))

const DIMENSAO_BADGE = {
  IRI: 'brand',
  IRA: 'info',
  IEB: 'warning',
  IAA: 'success',
  IACA: 'neutral',
  CARACTERIZACAO: 'neutral',
}

function hojeISO() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const identificacaoInicial = () => ({
  matricula: '',
  municipioNome: '',
  orgaoBeneficiarioNome: '',
  dataAdmissao: '',
  dataAplicacao: hojeISO(),
})

const textareaStyle = {
  width: '100%',
  minHeight: '64px',
  padding: '10px 14px',
  fontSize: '14px',
  fontFamily: 'var(--font-family)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  outline: 'none',
  resize: 'vertical',
}

function variantResposta(valor) {
  if (valor === 'SIM' || valor === 'RECEBEU') return 'success'
  if (valor === 'NAO' || valor === 'NAO_RECEBEU') return 'danger'
  return 'neutral' // NAO_SE_APLICA / AINDA_NAO_ERA_DEVIDA
}

function BotaoResposta({ opcao, selecionado, disabled, onClick }) {
  const cores = {
    success: { bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success-text)' },
    danger:  { bg: 'var(--status-danger-bg)',  border: 'var(--status-danger-border)',  text: 'var(--status-danger-text)' },
    neutral: { bg: 'var(--bg-subtle)',         border: 'var(--border-strong)',         text: 'var(--text-secondary)' },
  }
  const c = cores[variantResposta(opcao.valor)]
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selecionado}
      style={{
        flex: '1 1 140px',
        minHeight: '52px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${selecionado ? c.border : 'var(--border-default)'}`,
        background: selecionado ? c.bg : 'var(--bg-surface)',
        color: selecionado ? c.text : 'var(--text-secondary)',
        fontFamily: 'var(--font-family)',
        fontSize: '13px',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !selecionado ? 0.5 : 1,
        transition: 'all var(--motion-normal)',
      }}
    >
      {opcao.label}
    </button>
  )
}

function LinhaPergunta({ index, questao, valor, disabled, mensagemDesabilitado, onResponder }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
        <Badge variant={DIMENSAO_BADGE[questao.dimensao]} style={{ flexShrink: 0 }}>
          {questao.dimensao === 'CARACTERIZACAO' ? 'CARACTERIZAÇÃO' : questao.dimensao}
        </Badge>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Q{index}.</span> {questao.texto}
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {questao.opcoes.map(op => (
          <BotaoResposta
            key={op.valor}
            opcao={op}
            selecionado={valor === op.valor}
            disabled={disabled}
            onClick={() => onResponder(op.valor)}
          />
        ))}
      </div>
      {disabled && mensagemDesabilitado && (
        <p style={{ fontSize: '11px', color: 'var(--brand-primary)', fontFamily: 'var(--font-family)', marginTop: '8px' }}>
          {mensagemDesabilitado}
        </p>
      )}
    </div>
  )
}

export default function Formulario30DiasForm({ showToast }) {
  const [identificacao, setIdentificacao] = useState(identificacaoInicial)
  const [respostas, setRespostas] = useState({})
  const [possuiObservacao, setPossuiObservacao] = useState(null) // 'SIM' | 'NAO' | null
  const [textoObservacao, setTextoObservacao] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [tentouEnviar, setTentouEnviar] = useState(false)

  const draftRef = useRef({ id: null, periodo: null })

  const diasTranscorridos = calcularDiasTranscorridos(identificacao.dataAdmissao, identificacao.dataAplicacao)
  const completo = validarRespostasCompletas(respostas)
  const identificacaoCompleta = !!(
    identificacao.matricula && identificacao.municipioNome &&
    identificacao.orgaoBeneficiarioNome && identificacao.dataAdmissao && identificacao.dataAplicacao
  )

  const saveDraft = useCallback(async (dados) => {
    if (!dados) return
    if (draftRef.current.id) {
      await atualizarRascunhoVerificacao30Dias(draftRef.current.id, draftRef.current.periodo, dados)
    } else {
      const { id, periodo } = await criarRascunhoVerificacao30Dias(dados, { uid: auth.currentUser?.uid, email: auth.currentUser?.email })
      draftRef.current = { id, periodo }
    }
  }, [])

  const autosave = useAutosave(saveDraft, { delay: 2000, enabled: identificacaoCompleta })

  useEffect(() => {
    autosave.notifyChange({
      identificacao,
      respostas,
      observacao: { possuiObservacao: possuiObservacao === 'SIM', texto: possuiObservacao === 'SIM' ? textoObservacao.trim() : '' },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identificacao, respostas, possuiObservacao, textoObservacao])

  function atualizarIdentificacao(campo, valor) {
    setIdentificacao(i => ({ ...i, [campo]: valor }))
  }

  function responder(questaoId, valor) {
    setRespostas(r => ({ ...r, [questaoId]: valor }))
  }

  function handleQ12(valor) {
    setRespostas(r => ({
      ...r,
      q12: valor,
      q13: valor === 'NAO' ? 'NAO_SE_APLICA' : (r.q13 === 'NAO_SE_APLICA' ? undefined : r.q13),
    }))
  }

  // Mesma lógica da Q12 → Q13: ao trocar a modalidade, a resposta de
  // login/senha nunca fica "escondida" ainda participando do IRI — ou é
  // marcada NAO_SE_APLICA (Presencial) ou é limpa para responder de novo
  // (voltou a ser EAD e o valor guardado era só o placeholder automático).
  function handleQ21(valor) {
    setRespostas(r => ({
      ...r,
      q21: valor,
      q22: valor === 'PRESENCIAL' ? 'NAO_SE_APLICA' : (r.q22 === 'NAO_SE_APLICA' ? undefined : r.q22),
    }))
  }

  function resetarFormulario() {
    setIdentificacao(identificacaoInicial())
    setRespostas({})
    setPossuiObservacao(null)
    setTextoObservacao('')
    setConfirmando(false)
    setTentouEnviar(false)
    draftRef.current = { id: null, periodo: null }
    autosave.reset()
  }

  function handlePedirConfirmacao() {
    if (!identificacaoCompleta) {
      setTentouEnviar(true)
      showToast?.('Preencha todos os campos de identificação antes de enviar.')
      return
    }
    if (!completo) {
      setTentouEnviar(true)
      showToast?.('Responda todas as perguntas obrigatórias antes de enviar.')
      return
    }
    if (possuiObservacao === 'SIM' && !textoObservacao.trim()) {
      showToast?.('Descreva a situação informada ou marque "NÃO" no campo complementar.')
      return
    }
    setConfirmando(true)
  }

  async function handleEnviar() {
    setSalvando(true)
    try {
      // Promove o próprio rascunho autosalvo para 'enviada' (não
      // duplica documento); sem rascunho prévio, cria direto como
      // enviada — mesmo resultado de antes.
      await enviarVerificacao30Dias(
        draftRef.current.id,
        draftRef.current.periodo,
        {
          identificacao,
          respostas,
          observacao: { possuiObservacao: possuiObservacao === 'SIM', texto: possuiObservacao === 'SIM' ? textoObservacao.trim() : '' },
        },
        { uid: auth.currentUser?.uid, email: auth.currentUser?.email }
      )
      showToast?.('Formulário enviado com sucesso!')
      resetarFormulario()
    } catch (e) {
      showToast?.('Erro ao salvar: ' + e.message)
      setConfirmando(false)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ paddingBottom: '96px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
          Formulário de Verificação Inicial do Aprendiz – 30 Dias
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)', maxWidth: '720px' }}>
          Instrumento de coleta de dados para monitoramento das condições iniciais de ingresso e execução do Programa Aprendiz do Futuro.
        </p>
        <div style={{ marginTop: '8px' }}>
          <AutosaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} onRetry={() => autosave.saveNow()} />
        </div>
      </div>

      {/* ── Identificação ── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <Input label="Matrícula do aprendiz *" value={identificacao.matricula} onChange={e => atualizarIdentificacao('matricula', e.target.value)} placeholder="Número de matrícula" />
          <Select label="Município *" value={identificacao.municipioNome} onChange={e => atualizarIdentificacao('municipioNome', e.target.value)}>
            <option value="">Selecione…</option>
            {MUNICIPIOS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="Órgão/local da atividade prática *" value={identificacao.orgaoBeneficiarioNome} onChange={e => atualizarIdentificacao('orgaoBeneficiarioNome', e.target.value)} placeholder="Nome do órgão ou local" />
          <Input label="Data de admissão *" type="date" value={identificacao.dataAdmissao} onChange={e => atualizarIdentificacao('dataAdmissao', e.target.value)} />
          <Input label="Data de aplicação do formulário *" type="date" value={identificacao.dataAplicacao} onChange={e => atualizarIdentificacao('dataAplicacao', e.target.value)} />
        </div>

        {identificacao.dataAdmissao && identificacao.dataAplicacao && (
          <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: diasTranscorridos < 30 ? 'var(--status-warning-bg)' : 'var(--status-success-bg)', border: `1px solid ${diasTranscorridos < 30 ? 'var(--status-warning-border)' : 'var(--status-success-border)'}` }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: diasTranscorridos < 30 ? 'var(--status-warning-text)' : 'var(--status-success-text)', fontFamily: 'var(--font-family)' }}>
              {diasTranscorridos} dia{diasTranscorridos === 1 ? '' : 's'} transcorridos desde a admissão.
              {diasTranscorridos < 30 && ' O instrumento foi concebido para aplicação após 30 dias — o registro não será bloqueado, mas confira se a aplicação antecipada é intencional.'}
            </p>
          </div>
        )}

        {tentouEnviar && !identificacaoCompleta && (
          <p style={{ fontSize: '12px', color: 'var(--status-danger-text)', marginTop: '10px', fontFamily: 'var(--font-family)' }}>
            Preencha todos os campos marcados com * antes de continuar.
          </p>
        )}
      </div>

      {/* ── Questionário ── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '20px' }}>
        {QUESTION_DEFINITIONS.map((q, i) => (
          <LinhaPergunta
            key={q.id}
            index={i + 1}
            questao={q}
            valor={respostas[q.id]}
            disabled={(q.id === 'q13' || q.id === 'q22') && !isApplicable(q.id, respostas)}
            mensagemDesabilitado={
              // Texto descritivo, não numérico — a ordem de exibição das
              // perguntas pode mudar (elas já foram reagrupadas por bloco
              // temático uma vez), então referenciar "Q12"/"Q21" por
              // posição seria frágil.
              q.id === 'q13'
                ? 'Marcada automaticamente como NÃO SE APLICA — a pergunta "Necessita utilizar transporte público?" indica que o aprendiz não necessita.'
                : q.id === 'q22'
                ? 'Marcada automaticamente como NÃO SE APLICA — a pergunta "Modalidade do curso" indica que o curso é realizado na modalidade presencial.'
                : undefined
            }
            onResponder={valor => {
              if (q.id === 'q12') return handleQ12(valor)
              if (q.id === 'q21') return handleQ21(valor)
              return responder(q.id, valor)
            }}
          />
        ))}

        {/* Campo complementar */}
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', marginBottom: '10px' }}>
            Existe alguma situação relacionada ao Programa que você considera importante informar?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {[{ valor: 'NAO', label: 'NÃO' }, { valor: 'SIM', label: 'SIM' }].map(op => (
              <BotaoResposta
                key={op.valor}
                opcao={op}
                selecionado={possuiObservacao === op.valor}
                onClick={() => setPossuiObservacao(op.valor)}
              />
            ))}
          </div>
          {possuiObservacao === 'SIM' && (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '6px' }}>
                Descreva resumidamente a situação.
              </p>
              <textarea value={textoObservacao} onChange={e => setTextoObservacao(e.target.value)} style={textareaStyle} />
            </>
          )}
        </div>
      </div>

      {tentouEnviar && !completo && (
        <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)', marginBottom: '16px' }}>
          Ainda faltam perguntas sem resposta — não é possível enviar o formulário.
        </p>
      )}

      {/* ── Barra de ações fixa ── */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '16px 20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }}>
        {confirmando ? (
          <>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
              Confirmar envio do formulário?
            </span>
            <Button variant="secondary" onClick={() => setConfirmando(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleEnviar} loading={salvando}>
              Sim, enviar
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={handlePedirConfirmacao}>
            Enviar Formulário
          </Button>
        )}
      </div>
    </div>
  )
}
