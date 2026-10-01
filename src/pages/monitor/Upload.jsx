import { useState } from 'react'
import UploadZone from '../../components/monitor/upload/UploadZone'
import PreviewTable from '../../components/monitor/upload/PreviewTable'
import Button from '../../components/monitor/ui/Button'
import Badge from '../../components/monitor/ui/Badge'
import Loader from '../../components/monitor/ui/Loader'
import { MonthInput } from '../../components/monitor/ui/Input'
import { parseCSVCompleto, formatarPeriodo } from '../../services/csvService'
import { salvarPeriodo, buscarPeriodos } from '../../services/firestoreService'
import { classificarBase, reconciliar } from '../../services/classificacaoService'
import {
  validarArquivo,
  validarEstrutura,
  verificarCompetenciaDivergente,
} from '../../services/uploadValidationService'

const LABELS_CHECK = {
  headcount:       'Jovens ativos + encerrados no mês = total da base',
  apuracao_minima: 'Jovens apurados ≥ jovens ativos',
  frequencia:      'Frequência da base financeira bate com a base inteira',
}

// Classifica e reconcilia a base ANTES de salvar, para bloquear o
// fechamento na tela — a checagem definitiva ainda roda de novo dentro de
// salvarPeriodo (defesa em profundidade), mas o usuário precisa ver o
// motivo aqui, sem precisar tentar salvar primeiro.
function tentarReconciliar(dados) {
  try {
    const classificados = classificarBase(dados)
    return { classificados, reconciliacao: reconciliar(classificados) }
  } catch (e) {
    return {
      classificados: null,
      reconciliacao: {
        ok: false,
        checks: [{ chave: 'parse', descricao: 'Datas do CSV válidas (dd/mm/aaaa)', ok: false, detalhe: e.message }],
        resumo: null,
      },
    }
  }
}

function formatarTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Estado inicial limpo — usado sempre que o arquivo troca ou a
// competência muda depois de validado (invalida a validação anterior).
function estadoLimpo() {
  return {
    errosArquivo: [],
    errosEstrutura: [],
    avisos: [],
    classificados: null,
    reconciliacao: null,
    competenciaDivergente: null,
    competenciaExistente: null,
    confirmarMesmoAssim: false,
  }
}

export default function Upload({ onNavigate, canNavigateGerencial, canNavigateHistorico }) {
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0, 7))
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle|selected|validating|valid|invalid|importing|success|error
  const [validacao, setValidacao] = useState(estadoLimpo)
  const [resultado, setResultado] = useState(null)
  const [erroImportacao, setErroImportacao] = useState('')

  function handleFile(novoFile) {
    setFile(novoFile)
    setStatus('selected')
    setValidacao(estadoLimpo())
    setResultado(null)
    setErroImportacao('')
  }

  function handleTrocarArquivo() {
    setFile(null)
    setStatus('idle')
    setValidacao(estadoLimpo())
  }

  function handlePeriodoChange(novoPeriodo) {
    setPeriodo(novoPeriodo)
    // Competência faz parte da regra validada — muda o período depois de
    // validar exige validar de novo (a validação anterior não vale mais).
    if (status === 'valid' || status === 'invalid') {
      setStatus('selected')
      setValidacao(estadoLimpo())
    }
  }

  async function handleValidar() {
    setStatus('validating')

    const arquivoCheck = validarArquivo(file)
    if (!arquivoCheck.ok) {
      setValidacao({ ...estadoLimpo(), errosArquivo: arquivoCheck.erros })
      setStatus('invalid')
      return
    }

    let data, errors
    try {
      ({ data, errors } = await parseCSVCompleto(file))
    } catch (e) {
      setValidacao({ ...estadoLimpo(), errosArquivo: [{ chave: 'leitura', mensagem: 'Não foi possível ler o arquivo CSV. Verifique se ele não está corrompido.' }] })
      setStatus('invalid')
      return
    }

    const estrutura = validarEstrutura(data, errors)
    if (!estrutura.ok) {
      setValidacao({ ...estadoLimpo(), errosEstrutura: estrutura.erros, avisos: estrutura.avisos })
      setStatus('invalid')
      return
    }

    // Mesmo array que será gravado — reconciliação, prévia e persistência
    // usam sempre este resultado, nunca reparseiam o arquivo.
    const { classificados, reconciliacao } = tentarReconciliar(data)
    const avisos = [...estrutura.avisos]

    const divergencia = classificados ? verificarCompetenciaDivergente(classificados, periodo) : null
    if (divergencia) avisos.push(divergencia)

    let competenciaExistente = null
    try {
      const periodos = await buscarPeriodos()
      const existente = periodos.find(p => p.periodo === periodo)
      if (existente) {
        competenciaExistente = existente
        avisos.push({
          chave: 'competencia_existente',
          mensagem: `Já existem ${existente.total} registro(s) para ${formatarPeriodo(periodo)} (importados em ${new Date(existente.importadoEm).toLocaleDateString('pt-BR')}). Confirmar aqui ADICIONA a esses registros — não substitui. Para substituir, exclua o período em Histórico antes.`,
        })
      }
    } catch {
      // Checagem informativa — se falhar, segue sem bloquear a validação.
    }

    setValidacao({
      errosArquivo: [],
      errosEstrutura: [],
      avisos,
      classificados,
      reconciliacao,
      competenciaDivergente: divergencia,
      competenciaExistente,
      confirmarMesmoAssim: false,
    })
    setStatus('valid')
  }

  async function handleConfirmarImportacao() {
    if (!validacao.classificados || !validacao.reconciliacao?.ok) return
    if (validacao.competenciaExistente && !validacao.confirmarMesmoAssim) return

    setStatus('importing')
    try {
      await salvarPeriodo(periodo, validacao.classificados)
      setResultado({
        competencia: periodo,
        registros: validacao.classificados.length,
        arquivo: file.name,
      })
      setStatus('success')
    } catch (e) {
      setErroImportacao(e.message || '')
      setStatus('error')
    }
  }

  function handleNovaImportacao() {
    setFile(null)
    setStatus('idle')
    setValidacao(estadoLimpo())
    setResultado(null)
    setErroImportacao('')
  }

  const podeConfirmar =
    status === 'valid' &&
    !!validacao.reconciliacao?.ok &&
    (!validacao.competenciaExistente || validacao.confirmarMesmoAssim)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Page title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '26px', fontWeight: 700, lineHeight: '32px',
          color: 'var(--text-primary)', fontFamily: 'var(--font-family)',
          letterSpacing: '-0.01em',
        }}>
          Apuração Mensal — Upload
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-family)' }}>
          Valide e importe o arquivo de dados da competência.
        </p>
      </div>

      {/* Competência — sempre visível, antes do arquivo */}
      {status !== 'success' && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '16px',
          padding: '16px 20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}>
          <MonthInput
            label="Período de referência"
            value={periodo}
            onChange={e => handlePeriodoChange(e.target.value)}
            style={{ width: '200px' }}
          />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', paddingBottom: '10px', fontFamily: 'var(--font-family)' }}>
            Selecione o mês/ano antes de importar
          </p>
        </div>
      )}

      {/* ── IDLE: área de seleção ── */}
      {status === 'idle' && <UploadZone onFile={handleFile} />}

      {/* ── SELECTED / VALIDATING / INVALID: cartão do arquivo ── */}
      {(status === 'selected' || status === 'validating' || status === 'invalid') && file && (
        <div style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${status === 'invalid' ? 'var(--status-danger-border)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '6px' }}>
            {status === 'invalid' ? 'Arquivo inválido' : 'Arquivo selecionado'}
          </p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
            {file.name}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginTop: '2px' }}>
            {formatarTamanho(file.size)}
          </p>

          {status === 'invalid' && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...validacao.errosArquivo, ...validacao.errosEstrutura].map((erro, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Badge variant="danger">✕</Badge>
                  <p style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
                    {erro.mensagem}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={handleTrocarArquivo} disabled={status === 'validating'}>
              {status === 'invalid' ? 'Escolher outro arquivo' : 'Trocar arquivo'}
            </Button>
            {status !== 'invalid' && (
              <Button variant="primary" onClick={handleValidar} loading={status === 'validating'} disabled={status === 'validating'}>
                Validar arquivo
              </Button>
            )}
          </div>
        </div>
      )}

      {status === 'validating' && (
        <div style={{ marginBottom: '20px' }}>
          <Loader message="Validando arquivo…" />
        </div>
      )}

      {/* ── VALID / IMPORTING: resumo + avisos + prévia + reconciliação + confirmação ── */}
      {(status === 'valid' || status === 'importing') && validacao.classificados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Resumo da validação */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '12px 20px', background: 'var(--status-success-bg)', borderBottom: '1px solid var(--border-default)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                Validação do arquivo
              </h3>
              <Badge variant="success">Estrutura reconhecida</Badge>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '16px 20px' }}>
              {[
                ['Arquivo', file?.name],
                ['Competência', formatarPeriodo(periodo)],
                ['Registros encontrados', validacao.classificados.length],
                ['Avisos', validacao.avisos.length],
                ['Erros bloqueantes', 0],
              ].map(([label, valor]) => (
                <div key={label}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{valor}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Avisos não bloqueantes */}
          {validacao.avisos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {validacao.avisos.map((aviso, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 16px', background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: 'var(--radius-sm)' }}>
                  <Badge variant="warning">⚠</Badge>
                  <p style={{ fontSize: '13px', color: 'var(--status-warning-text)', fontFamily: 'var(--font-family)' }}>
                    {aviso.mensagem}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Confirmação extra quando já existem dados na competência */}
          {validacao.competenciaExistente && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-brand)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={validacao.confirmarMesmoAssim}
                onChange={e => setValidacao(v => ({ ...v, confirmarMesmoAssim: e.target.checked }))}
                style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
                Entendo que {formatarPeriodo(periodo)} já tem {validacao.competenciaExistente.total} registro(s) importado(s) e que confirmar aqui vai ADICIONAR estes {validacao.classificados.length} por cima, sem substituir.
              </span>
            </label>
          )}

          <PreviewTable dados={validacao.classificados} />

          {/* Reconciliação — lógica inalterada */}
          {validacao.reconciliacao && (
            <div style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${validacao.reconciliacao.ok ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`,
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                padding: '12px 20px',
                background: validacao.reconciliacao.ok ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                borderBottom: '1px solid var(--border-default)',
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                  Reconciliação da Competência
                </h3>
                <Badge variant={validacao.reconciliacao.ok ? 'success' : 'danger'}>
                  {validacao.reconciliacao.ok ? 'Liberado para fechamento' : 'Fechamento bloqueado'}
                </Badge>
              </div>

              {validacao.reconciliacao.resumo && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
                  {[
                    ['Total da base', validacao.reconciliacao.resumo.totalBase],
                    ['Jovens ativos', validacao.reconciliacao.resumo.jovensAtivos],
                    ['Jovens apurados', validacao.reconciliacao.resumo.jovensApurados],
                    ['Encerrados no mês', validacao.reconciliacao.resumo.desligadosNoMes],
                  ].map(([label, valor]) => (
                    <div key={label}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{valor}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {validacao.reconciliacao.checks.map(c => (
                  <div key={c.chave} style={{ display: 'flex', gap: '12px', padding: '12px 20px', borderBottom: '1px solid var(--border-default)' }}>
                    <Badge variant={c.ok ? 'success' : 'danger'}>{c.ok ? '✓' : '✗'}</Badge>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                        {LABELS_CHECK[c.chave] || c.descricao}
                      </p>
                      {!c.ok && (
                        <p style={{ fontSize: '12px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)', marginTop: '2px' }}>
                          {c.detalhe}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {!validacao.reconciliacao?.ok && (
              <span style={{ fontSize: '13px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
                Corrija o CSV e importe novamente
              </span>
            )}
            <Button variant="secondary" onClick={handleTrocarArquivo} disabled={status === 'importing'}>
              Trocar arquivo
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmarImportacao}
              loading={status === 'importing'}
              disabled={!podeConfirmar || status === 'importing'}
            >
              Confirmar Importação
            </Button>
          </div>

          {status === 'importing' && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', textAlign: 'center' }}>
              Importando dados… Isso pode levar alguns instantes.
            </p>
          )}
        </div>
      )}

      {/* ── SUCCESS ── */}
      {status === 'success' && resultado && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', background: 'var(--status-success-bg)', borderBottom: '1px solid var(--border-default)' }}>
            <Badge variant="success">✓</Badge>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
              Importação concluída
            </h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '20px' }}>
            {[
              ['Competência', formatarPeriodo(resultado.competencia)],
              ['Registros processados', resultado.registros],
              ['Registros importados', resultado.registros],
              ['Arquivo', resultado.arquivo],
            ].map(([label, valor]) => (
              <div key={label}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>{valor}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '0 20px 20px' }}>
            {onNavigate && canNavigateGerencial && (
              <Button variant="secondary" onClick={() => onNavigate('gerencial')}>Ver Gerencial</Button>
            )}
            {onNavigate && canNavigateHistorico && (
              <Button variant="secondary" onClick={() => onNavigate('historico')}>Ver Histórico</Button>
            )}
            <Button variant="primary" onClick={handleNovaImportacao}>Nova Importação</Button>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {status === 'error' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', background: 'var(--status-danger-bg)', borderBottom: '1px solid var(--border-default)' }}>
            <Badge variant="danger">⚠</Badge>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
              Não foi possível concluir a importação
            </h3>
          </div>
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-family)', marginBottom: '8px' }}>
              A importação não foi concluída integralmente. Verifique o estado da competência em Histórico antes de tentar novamente — como a gravação é feita em lotes, é possível que parte dos registros já tenha sido salva.
            </p>
            {erroImportacao && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)' }}>
                Detalhe técnico: {erroImportacao}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '0 20px 20px' }}>
            {onNavigate && canNavigateHistorico && (
              <Button variant="secondary" onClick={() => onNavigate('historico')}>Ver Histórico</Button>
            )}
            <Button variant="primary" onClick={handleNovaImportacao}>Tentar novamente</Button>
          </div>
        </div>
      )}
    </div>
  )
}
