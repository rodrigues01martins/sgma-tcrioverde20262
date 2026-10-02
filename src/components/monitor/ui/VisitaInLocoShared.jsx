import Badge from './Badge'
import Button from './Button'

// ============================================================
// Peças compartilhadas entre Visita In Loco — Teórica e Prática.
// Nenhuma delas conhece qual modalidade está sendo usada: tudo vem por
// props (blocos, escala de pontuação, título) — quem decide a modalidade
// é o formulário/painel que os importa.
// ============================================================

export function BotaoPontuacao({ opcao, selecionado, disabled, onClick }) {
  const cores = {
    danger:  { bg: 'var(--status-danger-bg)',  border: 'var(--status-danger-border)',  text: 'var(--status-danger-text)'  },
    warning: { bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', text: 'var(--status-warning-text)' },
    success: { bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success-text)' },
  }
  const c = cores[opcao.variant]
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: '1 1 140px',
        minHeight: '56px',
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${selecionado ? c.border : 'var(--border-default)'}`,
        background: selecionado ? c.bg : 'var(--bg-surface)',
        color: selecionado ? c.text : 'var(--text-secondary)',
        fontFamily: 'var(--font-family)',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !selecionado ? 0.5 : 1,
        transition: `all var(--motion-normal)`,
      }}
    >
      {opcao.valor} — {opcao.label}
    </button>
  )
}

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

export function ItemQuestao({ item, opcoesPontuacao, resposta, disabled, onPontuacao, onObservacoes }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', marginBottom: '2px' }}>
        {item.label}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '10px' }}>
        {item.descricao}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        {opcoesPontuacao.map(op => (
          <BotaoPontuacao
            key={op.valor}
            opcao={op}
            selecionado={resposta?.pontuacao === op.valor}
            disabled={disabled}
            onClick={() => onPontuacao(op.valor)}
          />
        ))}
      </div>
      {disabled && (
        <p style={{ fontSize: '11px', color: 'var(--brand-primary)', fontFamily: 'var(--font-family)', marginBottom: '8px' }}>
          Pontuação automática — local marcado como estritamente térreo.
        </p>
      )}
      <textarea
        placeholder="Observações / evidências (opcional)"
        value={resposta?.observacoes || ''}
        onChange={e => onObservacoes(e.target.value)}
        style={textareaStyle}
      />
    </div>
  )
}

export function formatarDataBR(iso) {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

// ============================================================
// ESPELHO — mesma estrutura de leitura + impressão usada pelos dois
// painéis (Teórico e Prático). Título e escala vêm por prop; os campos
// gerais de cabeçalho (município, nome do local, etc.) são os mesmos
// nas duas modalidades, reaproveitados como já eram na Teórica.
// ============================================================
export function EspelhoVisita({ visita, onVoltar, blocos, pontuacaoMaxima, opcoesPontuacao, titulo, camposGerais }) {
  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <Button variant="secondary" onClick={onVoltar}>← Voltar à listagem</Button>
        <Button variant="primary" onClick={() => window.print()}>Imprimir / Salvar PDF</Button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', marginBottom: '4px' }}>
          {titulo}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-family)', marginBottom: '20px' }}>
          Semestre {visita.semestre_referencia} · Status: {visita.status === 'enviada' ? 'Enviada' : 'Rascunho'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px', fontSize: '13px', fontFamily: 'var(--font-family)' }}>
          {camposGerais.map(([label, valor]) => (
            <div key={label}>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>{label}</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{valor || '—'}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', padding: '14px 18px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Pontuação total</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brand-primary)' }}>{visita.pontuacaoTotal} / {pontuacaoMaxima}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>ICL</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brand-primary)' }}>{visita.icl?.toFixed(1)}%</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Classificação</p>
            <Badge variant={visita.classificacao?.variant}>{visita.classificacao?.label}</Badge>
          </div>
        </div>

        {blocos.map(bloco => (
          <div key={bloco.id} style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-family)', borderBottom: '1.5px solid var(--border-strong)', paddingBottom: '6px', marginBottom: '10px' }}>
              {bloco.titulo}
            </h3>
            {bloco.itens.map(item => {
              const r = visita.respostas?.[item.id]
              const opcao = opcoesPontuacao.find(o => o.valor === r?.pontuacao)
              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px dashed var(--border-default)', fontSize: '13px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</p>
                    {r?.observacoes && <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{r.observacoes}</p>}
                  </div>
                  <Badge variant={opcao?.variant || 'neutral'} style={{ flexShrink: 0, height: 'auto', padding: '4px 10px' }}>
                    {r?.pontuacao ?? '—'} {opcao ? `— ${opcao.label}` : ''}
                  </Badge>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
