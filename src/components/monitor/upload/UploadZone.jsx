import { useRef, useState } from 'react'

const IconUpload = () => (
  <svg width="40" height="40" viewBox="0 -960 960 960" fill="var(--border-strong)">
    <path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
  </svg>
)

export default function UploadZone({ onFile }) {
  const inputRef = useRef()
  const [dragover, setDragover] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setDragover(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragover(true) }}
      onDragLeave={() => setDragover(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Área de upload — clique ou arraste um arquivo CSV"
      onKeyDown={e => e.key === 'Enter' && inputRef.current.click()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '48px 32px',
        borderRadius: 'var(--radius-lg)',
        border: `2px dashed ${dragover ? 'var(--brand-primary)' : 'var(--border-brand)'}`,
        background: dragover ? 'var(--brand-subtle)' : 'var(--bg-surface)',
        cursor: 'pointer',
        transition: `border-color var(--motion-normal), background var(--motion-normal)`,
        textAlign: 'center',
        outline: 'none',
      }}
    >
      <IconUpload />

      <div>
        <p style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-family)',
          marginBottom: '4px',
        }}>
          Arraste o CSV aqui ou clique para selecionar
        </p>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-family)',
        }}>
          Formatos aceitos: .csv — separador vírgula ou ponto e vírgula
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  )
}
