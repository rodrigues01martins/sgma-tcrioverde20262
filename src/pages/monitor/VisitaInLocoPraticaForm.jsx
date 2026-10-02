import { useState, useCallback, useEffect, useRef } from 'react'
import { auth } from '../../firebase'
import Button from '../../components/monitor/ui/Button'
import { Input, Select } from '../../components/monitor/ui/Input'
import AutosaveStatus from '../../components/monitor/ui/AutosaveStatus'
import { ItemQuestao } from '../../components/monitor/ui/VisitaInLocoShared'
import { useAutosave } from '../../hooks/useAutosave'
import { MUNICIPIOS_GOIAS } from '../../data/municipiosGoias'
import {
  BLOCOS_PRATICA,
  PONTUACAO_MAXIMA_PRATICA,
  OPCOES_PONTUACAO,
  ITEM_TERREO_ID,
  calcularSemestre,
  calcularPontuacaoPratica,
  validarRespostasCompletasPratica,
  criarRascunhoVisitaPratica,
  atualizarRascunhoVisitaPratica,
  enviarVisitaPratica,
} from '../../services/inLocoPraticaService'

const MUNICIPIOS = MUNICIPIOS_GOIAS.map(m => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'))

function agora() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return {
    data: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  }
}

function opcoesSemestre(valorAtual) {
  const anoBase = new Date().getFullYear()
  const anos = [anoBase - 1, anoBase, anoBase + 1]
  const opcoes = anos.flatMap(a => [`${a}/1`, `${a}/2`])
  if (valorAtual && !opcoes.includes(valorAtual)) opcoes.push(valorAtual)
  return opcoes.sort()
}

const cabecalhoInicial = () => {
  const { data, hora } = agora()
  return {
    municipio: '',
    nome_local: '',
    data_visita: data,
    hora_visita: hora,
    responsavel_visita: '',
    representante_local: '',
    semestre_referencia: calcularSemestre(data),
    local_terreo: false,
  }
}

export default function VisitaInLocoPraticaForm({ showToast }) {
  const [cabecalho, setCabecalho] = useState(cabecalhoInicial)
  const [respostas, setRespostas] = useState({})
  const [salvando, setSalvando] = useState(null) // 'rascunho' | 'enviada' | null
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const draftIdRef = useRef(null)

  const calculo = calcularPontuacaoPratica(respostas)
  const completo = validarRespostasCompletasPratica(respostas)

  const cabecalhoMinimoCompleto = !!(
    cabecalho.municipio && cabecalho.nome_local && cabecalho.responsavel_visita && cabecalho.representante_local
  )

  const saveDraft = useCallback(async (dados) => {
    if (!dados) return
    if (draftIdRef.current) {
      await atualizarRascunhoVisitaPratica(draftIdRef.current, dados)
    } else {
      const id = await criarRascunhoVisitaPratica(dados, { uid: auth.currentUser?.uid, email: auth.currentUser?.email })
      draftIdRef.current = id
    }
  }, [])

  const autosave = useAutosave(saveDraft, { delay: 2000, enabled: cabecalhoMinimoCompleto })

  useEffect(() => {
    autosave.notifyChange({ ...cabecalho, respostas })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabecalho, respostas])

  function atualizarCabecalho(campo, valor) {
    setCabecalho(c => {
      const novo = { ...c, [campo]: valor }
      if (campo === 'data_visita') novo.semestre_referencia = calcularSemestre(valor)
      return novo
    })
  }

  function alternarTerreo(checked) {
    setCabecalho(c => ({ ...c, local_terreo: checked }))
    if (!ITEM_TERREO_ID) return
    setRespostas(r => ({
      ...r,
      [ITEM_TERREO_ID]: checked
        ? { pontuacao: 2, observacoes: r[ITEM_TERREO_ID]?.observacoes || '' }
        : { pontuacao: undefined, observacoes: r[ITEM_TERREO_ID]?.observacoes || '' },
    }))
  }

  function setPontuacao(itemId, valor) {
    setRespostas(r => ({ ...r, [itemId]: { ...r[itemId], pontuacao: valor } }))
  }

  function setObservacoes(itemId, texto) {
    setRespostas(r => ({ ...r, [itemId]: { ...r[itemId], observacoes: texto } }))
  }

  function resetarFormulario() {
    setCabecalho(cabecalhoInicial())
    setRespostas({})
    setTentouEnviar(false)
    draftIdRef.current = null
    autosave.reset()
  }

  async function handleSalvarRascunho() {
    if (!cabecalhoMinimoCompleto) {
      setTentouEnviar(true)
      showToast?.('Preencha os campos obrigatórios do cabeçalho antes de salvar.')
      return
    }
    setSalvando('rascunho')
    try {
      await autosave.saveNow({ ...cabecalho, respostas })
      showToast?.('Rascunho salvo com sucesso!')
    } catch (e) {
      showToast?.('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(null)
    }
  }

  async function handleEnviar() {
    if (!cabecalhoMinimoCompleto) {
      setTentouEnviar(true)
      showToast?.('Preencha os campos obrigatórios do cabeçalho antes de salvar.')
      return
    }
    if (!completo) {
      setTentouEnviar(true)
      showToast?.('Responda todos os 21 itens antes de enviar a visita.')
      return
    }

    setSalvando('enviada')
    try {
      await enviarVisitaPratica(
        draftIdRef.current,
        { ...cabecalho, respostas },
        { uid: auth.currentUser?.uid, email: auth.currentUser?.email }
      )
      showToast?.('Visita enviada com sucesso!')
      resetarFormulario()
    } catch (e) {
      showToast?.('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(null)
    }
  }

  return (
    <div style={{ paddingBottom: '96px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', letterSpacing: '-0.01em' }}>
          Formulário de Visita In Loco – Prática
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
          Avaliação do estabelecimento onde o aprendiz executa a atividade prática de aprendizagem
        </p>
      </div>

      {/* ── Cabeçalho de identificação ── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <Select label="Município *" value={cabecalho.municipio} onChange={e => atualizarCabecalho('municipio', e.target.value)}>
            <option value="">Selecione…</option>
            {MUNICIPIOS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="Nome do estabelecimento *" value={cabecalho.nome_local} onChange={e => atualizarCabecalho('nome_local', e.target.value)} placeholder="Empresa / local da prática" />
          <Input label="Data da visita *" type="date" value={cabecalho.data_visita} onChange={e => atualizarCabecalho('data_visita', e.target.value)} />
          <Input label="Hora da visita *" type="time" value={cabecalho.hora_visita} onChange={e => atualizarCabecalho('hora_visita', e.target.value)} />
          <Input label="Responsável pela visita *" value={cabecalho.responsavel_visita} onChange={e => atualizarCabecalho('responsavel_visita', e.target.value)} placeholder="Nome do(a) fiscal" />
          <Input label="Representante do local *" value={cabecalho.representante_local} onChange={e => atualizarCabecalho('representante_local', e.target.value)} placeholder="Nome de quem acompanhou" />
          <Select label="Semestre de referência" value={cabecalho.semestre_referencia} onChange={e => atualizarCabecalho('semestre_referencia', e.target.value)}>
            {opcoesSemestre(cabecalho.semestre_referencia).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' }}>
          <input type="checkbox" checked={cabecalho.local_terreo} onChange={e => alternarTerreo(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
            Local é estritamente térreo (marca automaticamente o item 2.3)
          </span>
        </label>

        {tentouEnviar && (!cabecalho.municipio || !cabecalho.nome_local || !cabecalho.responsavel_visita || !cabecalho.representante_local) && (
          <p style={{ fontSize: '12px', color: 'var(--status-danger-text)', marginTop: '10px', fontFamily: 'var(--font-family)' }}>
            Preencha todos os campos marcados com * antes de continuar.
          </p>
        )}
      </div>

      {/* ── Blocos de avaliação ── */}
      {BLOCOS_PRATICA.map(bloco => {
        const pontosBloco = bloco.itens.reduce((s, item) => s + (respostas[item.id]?.pontuacao ?? 0), 0)
        return (
          <div key={bloco.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                  {bloco.titulo}
                </h3>
                {bloco.objetivo && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: '2px' }}>
                    {bloco.objetivo}
                  </p>
                )}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-family)' }}>
                {pontosBloco} / {bloco.maxPontos} pts
              </span>
            </div>
            {bloco.itens.map(item => (
              <ItemQuestao
                key={item.id}
                item={item}
                opcoesPontuacao={OPCOES_PONTUACAO}
                resposta={respostas[item.id]}
                disabled={item.id === ITEM_TERREO_ID && cabecalho.local_terreo}
                onPontuacao={valor => setPontuacao(item.id, valor)}
                onObservacoes={texto => setObservacoes(item.id, texto)}
              />
            ))}
          </div>
        )
      })}

      {tentouEnviar && !completo && (
        <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)', marginBottom: '16px' }}>
          Ainda faltam itens sem resposta — não é possível enviar a visita.
        </p>
      )}

      {/* ── Barra de totalizador + ações, fixa no rodapé ── */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        padding: '16px 20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>
            Pontuação total
          </p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--font-family)' }}>
            {calculo.pontuacaoTotal} / {PONTUACAO_MAXIMA_PRATICA} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>({calculo.icl.toFixed(1)}%)</span>
          </p>
          <div style={{ marginTop: '4px' }}>
            <AutosaveStatus status={autosave.status} lastSavedAt={autosave.lastSavedAt} onRetry={() => autosave.saveNow()} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={handleSalvarRascunho} loading={salvando === 'rascunho'} disabled={salvando !== null}>
            Salvar Rascunho
          </Button>
          <Button variant="primary" onClick={handleEnviar} loading={salvando === 'enviada'} disabled={salvando !== null}>
            Enviar Visita
          </Button>
        </div>
      </div>
    </div>
  )
}
