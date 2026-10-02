import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ============================================================
// TOOLTIP ACESSÍVEL E GENÉRICA (Design System "monitor")
// ============================================================
// Abre por hover (desktop), foco (teclado) ou toque (mobile); fecha por
// Escape, blur, mouse-leave ou novo toque. Renderizada via portal em
// document.body, com position:fixed calculada a partir do próprio
// gatilho — nunca cortada por overflow:hidden de cards, tabelas ou
// modais (todo card do Design System "monitor" usa overflow:hidden).
// Nunca intercepta o clique (sem preventDefault/stopPropagation): quem
// envolve o gatilho num elemento clicável (ex.: KpiCard com onDetails)
// continua funcionando normalmente. Some na impressão via a classe
// .no-print já usada em todo o app.
export default function Tooltip({ label, children, className }) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState(null)
  const gatilhoRef = useRef(null)
  const id = useId()

  const calcularPosicao = useCallback(() => {
    const el = gatilhoRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const acima = rect.top > 56 // espaço mínimo estimado para a tooltip + seta
    const left = Math.min(Math.max(rect.left + rect.width / 2, 92), window.innerWidth - 92)
    setPosicao({ left, top: acima ? rect.top - 8 : rect.bottom + 8, acima })
  }, [])

  const abrir = useCallback(() => { calcularPosicao(); setAberto(true) }, [calcularPosicao])
  const fechar = useCallback(() => setAberto(false), [])

  // Reposiciona se a página rolar ou a janela mudar de tamanho enquanto
  // aberta — evita "flutuar" fora do lugar do gatilho.
  useEffect(() => {
    if (!aberto) return
    window.addEventListener('scroll', calcularPosicao, true)
    window.addEventListener('resize', calcularPosicao)
    return () => {
      window.removeEventListener('scroll', calcularPosicao, true)
      window.removeEventListener('resize', calcularPosicao)
    }
  }, [aberto, calcularPosicao])

  function handleKeyDown(e) {
    if (e.key === 'Escape') fechar()
  }

  // Em toque não há "hover" — alterna a exibição no próprio toque, sem
  // nunca bloquear o clique (nenhum preventDefault/stopPropagation).
  function handleClick() {
    setAberto(prev => !prev)
    if (!aberto) calcularPosicao()
  }

  return (
    <span
      ref={gatilhoRef}
      tabIndex={0}
      aria-describedby={aberto ? id : undefined}
      onMouseEnter={abrir}
      onMouseLeave={fechar}
      onFocus={abrir}
      onBlur={fechar}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      style={{ cursor: 'help', borderBottom: '1px dotted currentColor' }}
    >
      {children}
      {aberto && posicao && createPortal(
        <span
          id={id}
          role="tooltip"
          className="no-print"
          style={{
            position: 'fixed',
            left: posicao.left,
            top: posicao.top,
            transform: `translate(-50%, ${posicao.acima ? '-100%' : '0'})`,
            background: '#0f172a',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: 1.4,
            padding: '6px 10px',
            borderRadius: '6px',
            maxWidth: '240px',
            textAlign: 'center',
            zIndex: 9999,
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            fontFamily: 'var(--font-family)',
          }}
        >
          {label}
        </span>,
        document.body
      )}
    </span>
  )
}
