import { useEffect, useRef, useState } from 'react'
import { auth } from '../../../firebase'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import SurveyReviewModal from './SurveyReviewModal'
import { validarESimularImportacao, confirmarImportacao, buscarUltimaImportacao, contarRespostas } from '../../../features/surveys/import/surveyImportService'

// ============================================================
// COMPONENTE-BASE — DROPZONE CONTEXTUAL DE CSV POR PESQUISA
// ============================================================
// Substitui o padrão anterior (botão "Importar CSV" + card que se
// expandia inline durante o carregamento) por uma área de upload SEMPRE
// visível, com estados compactos. A revisão detalhada (resumo/avisos/
// prévia/confirmação) vive num modal próprio (SurveyReviewModal) — o
// card nunca cresce verticalmente além do necessário para mostrar seu
// próprio estado atual.
//
// Um único componente serve os 4 instrumentos: cada instância recebe seu
// `schema` (fonte primária de qual pesquisa é esperada) — não existe
// "upload genérico" que tente adivinhar depois qual instrumento é; a
// validação estrutural do schema é só uma segunda confirmação de
// segurança (seção 12/19 da manutenção original).
function IconUpload() {
  return (
    <svg width="28" height="28" viewBox="0 -960 960 960" fill="var(--border-strong)">
      <path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
    </svg>
  )
}

function formatarTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatarDataHora(timestamp) {
  if (!timestamp?.toDate) return null
  return timestamp.toDate().toLocaleString('pt-BR')
}

// Mensagem específica quando o CSV claramente pertence a outro
// instrumento (seção 11 da manutenção de UX) — nunca genérica.
function mensagemErroEstrutura(schema, resultado) {
  const chaves = new Set((resultado.errosEstrutura || []).map(e => e.chave))
  if (chaves.has('questoes_nao_reconhecidas') || chaves.has('quantidade_questoes_incompativel')) {
    return `O arquivo selecionado não corresponde à Pesquisa de ${schema.label}. Verifique se você selecionou o CSV correto.`
  }
  return resultado.errosEstrutura?.[0]?.mensagem || resultado.errosArquivo?.[0]?.mensagem || 'Não foi possível reconhecer a estrutura da pesquisa.'
}

export default function SurveyCsvDropzone({ schema, onImportComplete }) {
  const inputRef = useRef(null)

  const [metaLoading, setMetaLoading] = useState(true)
  const [ultimaImportacao, setUltimaImportacao] = useState(null)
  const [totalRespostas, setTotalRespostas] = useState(0)

  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle|validating|valid|invalid|importing|success|error
  const [resultado, setResultado] = useState(null)
  const [erroFormato, setErroFormato] = useState(false)
  const [resumoFinal, setResumoFinal] = useState(null)
  const [erroImportacao, setErroImportacao] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)

  async function carregarMetadados() {
    setMetaLoading(true)
    // Só metadados leves (contagem via agregação + histórico de
    // importação) — nunca busca as respostas completas (seção 35).
    const [ultima, total] = await Promise.all([
      buscarUltimaImportacao(schema.surveyType),
      contarRespostas(schema.surveyType),
    ])
    setUltimaImportacao(ultima)
    setTotalRespostas(total)
    setMetaLoading(false)
  }

  useEffect(() => { carregarMetadados() }, [schema.surveyType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function validar(novoFile) {
    const r = await validarESimularImportacao(schema, novoFile)
    setResultado(r)
    setStatus(r.ok ? 'valid' : 'invalid')
  }

  function handleFile(novoFile) {
    const extensaoValida = /\.csv$/i.test(novoFile.name || '')
    setFile(novoFile)
    setResultado(null)
    setResumoFinal(null)
    setErroImportacao('')
    if (!extensaoValida) {
      setErroFormato(true)
      setStatus('invalid')
      return
    }
    setErroFormato(false)
    setStatus('validating')
    validar(novoFile)
  }

  function handleInputChange(e) {
    const f = e.target.files[0]
    e.target.value = '' // permite selecionar o mesmo arquivo de novo depois de removê-lo
    if (f) handleFile(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleRemover() {
    setFile(null)
    setResultado(null)
    setErroFormato(false)
    setStatus('idle')
  }

  async function handleConfirmar() {
    setStatus('importing')
    try {
      await confirmarImportacao(schema, resultado, file, { uid: auth.currentUser?.uid, email: auth.currentUser?.email })
      setResumoFinal({
        novos: resultado.classificacao.novos.length,
        atualizados: resultado.classificacao.atualizados.length,
        inalterados: resultado.classificacao.inalterados.length,
      })
      setReviewOpen(false)
      setStatus('success')
      carregarMetadados()
      onImportComplete?.()
    } catch (e) {
      setErroImportacao(e.message || '')
      setReviewOpen(false)
      setStatus('error')
    }
  }

  function handleNovaImportacao() {
    setFile(null)
    setResultado(null)
    setResumoFinal(null)
    setErroImportacao('')
    setStatus('idle')
  }

  const statusBadge =
    status === 'validating' ? { texto: 'Validando', variant: 'info' } :
    status === 'importing' ? { texto: 'Importando', variant: 'info' } :
    status === 'error' ? { texto: 'Erro na última importação', variant: 'danger' } :
    ultimaImportacao ? { texto: 'Atualizado', variant: 'success' } :
    { texto: 'Sem dados', variant: 'neutral' }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{schema.label}</h3>
        <Badge variant={statusBadge.variant}>{statusBadge.texto}</Badge>
      </div>

      {/* ── IDLE: dropzone permanente ── */}
      {status === 'idle' && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label={`Importar CSV de ${schema.label} — arraste o arquivo aqui ou pressione Enter para selecionar`}
            onClick={() => inputRef.current.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current.click() } }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '28px 16px', borderRadius: 'var(--radius-md)',
              border: `2px dashed ${dragOver ? 'var(--brand-primary)' : 'var(--border-brand)'}`,
              background: dragOver ? 'var(--brand-subtle)' : 'var(--bg-subtle)',
              cursor: 'pointer', textAlign: 'center', outline: 'none',
              transition: 'border-color var(--motion-normal), background var(--motion-normal)',
            }}
          >
            <IconUpload />
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
              {dragOver ? 'Solte o arquivo CSV aqui' : 'Arraste o arquivo CSV aqui'}
            </p>
            {!dragOver && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>ou clique para selecionar</p>
            )}
            <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleInputChange} />
          </div>

          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>
            {metaLoading ? (
              <span>Carregando…</span>
            ) : (
              <>
                <div>{ultimaImportacao ? `Última importação: ${formatarDataHora(ultimaImportacao.importadoEm) || 'agora há pouco'}` : 'Ainda não há dados importados'}</div>
                {totalRespostas > 0 && <div>{totalRespostas.toLocaleString('pt-BR')} resposta(s) disponível(is)</div>}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Arquivo selecionado (qualquer etapa a partir daqui) ── */}
      {status !== 'idle' && status !== 'success' && file && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{file.name}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>{formatarTamanho(file.size)}</p>
          </div>
          {(status === 'valid' || status === 'invalid' || status === 'error') && (
            <Button variant="ghost" size="sm" onClick={handleRemover}>Remover arquivo</Button>
          )}
        </div>
      )}

      {/* ── VALIDATING ── */}
      {status === 'validating' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-family)' }}>
          <span style={{ width: 16, height: 16, border: '2px solid var(--border-brand)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          Validando arquivo…
        </div>
      )}

      {/* ── INVALID: formato errado (checagem imediata) ── */}
      {status === 'invalid' && erroFormato && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 14px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-sm)' }}>
            <Badge variant="danger">✕</Badge>
            <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
              Formato não suportado. Exporte a pesquisa do Microsoft Forms no formato CSV.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleRemover} style={{ alignSelf: 'flex-start' }}>Selecionar outro arquivo</Button>
        </div>
      )}

      {/* ── INVALID: falha de validação estrutural ── */}
      {status === 'invalid' && !erroFormato && resultado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 14px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-sm)' }}>
            <Badge variant="danger">✕</Badge>
            <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
              {mensagemErroEstrutura(schema, resultado)}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleRemover} style={{ alignSelf: 'flex-start' }}>Selecionar outro arquivo</Button>
        </div>
      )}

      {/* ── VALID: resumo compacto + revisar ── */}
      {status === 'valid' && resultado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '10px 14px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-success-text)', fontFamily: 'var(--font-family)', marginBottom: '4px' }}>✓ Arquivo reconhecido</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
              Novos: {resultado.classificacao.novos.length} · Atualizados: {resultado.classificacao.atualizados.length} · Inalterados: {resultado.classificacao.inalterados.length} · Avisos: {resultado.resumoValidacao.avisos}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm" onClick={() => setReviewOpen(true)}>Revisar importação</Button>
          </div>
        </div>
      )}

      {/* ── IMPORTING ── */}
      {status === 'importing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-family)' }}>
          <span style={{ width: 16, height: 16, border: '2px solid var(--border-brand)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          Importando respostas…
        </div>
      )}

      {/* ── SUCCESS ── */}
      {status === 'success' && resumoFinal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '10px 14px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-success-text)', fontFamily: 'var(--font-family)', marginBottom: '4px' }}>Importação concluída</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
              Novos: {resumoFinal.novos} · Atualizados: {resumoFinal.atualizados} · Inalterados: {resumoFinal.inalterados}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleNovaImportacao} style={{ alignSelf: 'flex-start' }}>Nova importação</Button>
        </div>
      )}

      {/* ── ERROR (falha ao gravar) ── */}
      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '10px 14px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)', marginBottom: '4px' }}>Não foi possível concluir a importação</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
              Como a gravação é feita em lotes, é possível que parte já tenha sido salva — reimportar o mesmo arquivo é seguro e não duplica registros.
            </p>
            {erroImportacao && <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: '4px' }}>Detalhe técnico: {erroImportacao}</p>}
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setStatus('valid') }} style={{ alignSelf: 'flex-start' }}>Tentar novamente</Button>
        </div>
      )}

      <SurveyReviewModal
        aberto={reviewOpen}
        onFechar={() => setReviewOpen(false)}
        schema={schema}
        arquivo={file}
        resultado={resultado}
        confirmando={status === 'importing'}
        onConfirmar={handleConfirmar}
      />
    </div>
  )
}
