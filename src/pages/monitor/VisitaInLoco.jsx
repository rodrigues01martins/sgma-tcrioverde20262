import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import Button from '../../components/monitor/ui/Button'
import Badge from '../../components/monitor/ui/Badge'
import Loader from '../../components/monitor/ui/Loader'
import EmptyState from '../../components/monitor/ui/EmptyState'
import { Input } from '../../components/monitor/ui/Input'
import { IDENTIFICACAO_INSTRUMENTO, STATUS_VISITA, PARECERES } from '../../features/visita-in-loco/config.js'
import {
  abrirOuCriarVisita,
  buscarVisita,
  listarVisitas,
  VisitaJaFinalizadaError,
} from '../../features/visita-in-loco/visitaInLocoService.js'
import VisitaInLocoFormulario, { formatarDataBR, formatarPercentual } from '../../features/visita-in-loco/VisitaInLocoFormulario.jsx'

const FONT = 'var(--font-family)'

function hojeISO() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// O vistoriador é sempre o usuário autenticado — nunca digitado.
async function vistoriadorAtual() {
  const u = auth.currentUser
  if (!u) throw new Error('Sessão expirada. Entre novamente.')
  let nome = ''
  try {
    const snap = await getDoc(doc(db, 'users', u.uid))
    nome = snap.exists() ? (snap.data().displayName || '') : ''
  } catch { /* usa os dados da autenticação */ }
  return { uid: u.uid, nome: nome || u.displayName || u.email || '', email: u.email || null }
}

// podeEditar = vistoriador (Formulários → Visita In Loco). Sem isso a
// tela é só consulta (Painéis → Visita In Loco).
export default function VisitaInLoco({ podeEditar = false, showToast }) {
  const [visitas, setVisitas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [dataNova, setDataNova] = useState(hojeISO)
  const [abrindo, setAbrindo] = useState(false)
  const [aberta, setAberta] = useState(null) // { visita, podeEditar, aviso }

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      setVisitas(await listarVisitas())
    } catch (e) {
      setErro(e)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function abrirExistente(visita) {
    const uid = auth.currentUser?.uid
    const ehRascunho = visita.status !== STATUS_VISITA.finalizada.valor
    const ehAutor = visita.vistoriador?.uid === uid
    const editavel = podeEditar && ehRascunho && ehAutor
    let aviso = null
    if (podeEditar && ehRascunho && !ehAutor) {
      aviso = `Este rascunho foi iniciado por ${visita.vistoriador?.nome || 'outro vistoriador'}. Apenas ele pode continuar o preenchimento.`
    }
    setAberta({ visita, podeEditar: editavel, aviso })
  }

  async function handleAbrirData() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNova)) {
      showToast?.('Informe uma data válida.')
      return
    }
    setAbrindo(true)
    try {
      const { visita, criada } = await abrirOuCriarVisita(dataNova, await vistoriadorAtual())
      if (!criada) showToast?.(`Já existe rascunho em ${formatarDataBR(dataNova)} — o registro existente foi aberto.`)
      abrirExistente(visita)
    } catch (e) {
      if (e instanceof VisitaJaFinalizadaError) {
        showToast?.(`Já existe Visita In Loco finalizada em ${formatarDataBR(dataNova)}. Não é possível registrar outra visita nessa data.`)
        abrirExistente(e.visita)
      } else {
        showToast?.('Não foi possível abrir a visita: ' + (e?.message || 'erro desconhecido'))
      }
    } finally {
      setAbrindo(false)
    }
  }

  async function handleVoltar() {
    setAberta(null)
    await carregar()
  }

  if (aberta) {
    return (
      <VisitaInLocoFormulario
        key={aberta.visita.id}
        visita={aberta.visita}
        podeEditar={aberta.podeEditar}
        avisoLeitura={aberta.aviso}
        onVoltar={handleVoltar}
        onFinalizada={async v => {
          // Relê do Firestore para exibir exatamente o que foi persistido.
          const salva = await buscarVisita(v.id).catch(() => null)
          setAberta({ visita: salva || v, podeEditar: false, aviso: null })
        }}
        showToast={showToast}
      />
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, lineHeight: '32px', color: 'var(--text-primary)', fontFamily: FONT, letterSpacing: '-0.01em' }}>
          Visita In Loco
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: FONT }}>
          {IDENTIFICACAO_INSTRUMENTO.instrumento} · {IDENTIFICACAO_INSTRUMENTO.unidade}
        </p>
      </div>

      {podeEditar && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: FONT, marginBottom: '4px' }}>
            Registrar ou continuar visita
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: FONT, marginBottom: '12px' }}>
            Existe uma única Visita In Loco por data. Se já houver rascunho na data escolhida, ele será aberto para continuar.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: '220px' }}>
              <Input label="Data da visita" type="date" value={dataNova} onChange={e => setDataNova(e.target.value)} />
            </div>
            <Button variant="primary" onClick={handleAbrirData} loading={abrindo} disabled={abrindo}>
              Abrir visita
            </Button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: FONT }}>Visitas registradas</h3>
        </div>
        {carregando ? (
          <Loader message="Carregando visitas…" />
        ) : erro ? (
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: FONT, marginBottom: '12px' }}>
              Não foi possível carregar as visitas.
            </p>
            <Button variant="secondary" onClick={carregar}>Tentar novamente</Button>
          </div>
        ) : visitas.length === 0 ? (
          <EmptyState title="Nenhuma visita registrada" description={podeEditar ? 'Escolha uma data acima para iniciar a primeira Visita In Loco.' : 'Ainda não há Visita In Loco registrada.'} />
        ) : (
          visitas.map(v => {
            const st = STATUS_VISITA[v.status] || STATUS_VISITA.rascunho
            const parecer = v.status === STATUS_VISITA.finalizada.valor ? PARECERES[v.apuracao?.parecer] : null
            return (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: FONT }}>{formatarDataBR(v.id)}</strong>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {parecer && <Badge variant={parecer.variant}>{parecer.label}</Badge>}
                    {parecer && <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: FONT }}>{formatarPercentual(v.apuracao?.percentualGlobal)}</span>}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: FONT }}>
                    Vistoriador: {v.vistoriador?.nome || '—'}
                  </span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => abrirExistente(v)}>
                  {podeEditar && v.status !== STATUS_VISITA.finalizada.valor && v.vistoriador?.uid === auth.currentUser?.uid ? 'Continuar' : 'Abrir'}
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
