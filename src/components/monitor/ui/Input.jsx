import { useState } from 'react'

const baseStyle = {
  height: '40px',
  width: '100%',
  padding: '0 14px',
  fontSize: '14px',
  fontWeight: 400,
  fontFamily: 'var(--font-family)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: `border-color var(--motion-normal), box-shadow var(--motion-normal)`,
}

export function Input({
  label,
  error,
  disabled,
  type = 'text',
  style: extra = {},
  ...props
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
          {label}
        </label>
      )}
      <input
        type={type}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
        style={{
          ...baseStyle,
          borderColor: error
            ? 'var(--status-danger-border)'
            : focused
            ? 'var(--brand-primary)'
            : 'var(--border-default)',
          boxShadow: focused && !error ? '0 0 0 3px rgba(53,104,89,0.12)' : 'none',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          ...extra,
        }}
      />
      {error && (
        <span style={{ fontSize: '12px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
          {error}
        </span>
      )}
    </div>
  )
}

export function MonthInput({ label, value, onChange, style: extra = {} }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
          {label}
        </label>
      )}
      <input
        type="month"
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...baseStyle,
          borderColor: focused ? 'var(--brand-primary)' : 'var(--border-default)',
          boxShadow: focused ? '0 0 0 3px rgba(53,104,89,0.12)' : 'none',
          ...extra,
        }}
      />
    </div>
  )
}

export function Select({ label, error, disabled, children, style: extra = {}, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
          {label}
        </label>
      )}
      <select
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
        style={{
          ...baseStyle,
          borderColor: error
            ? 'var(--status-danger-border)'
            : focused
            ? 'var(--brand-primary)'
            : 'var(--border-default)',
          boxShadow: focused && !error ? '0 0 0 3px rgba(53,104,89,0.12)' : 'none',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%236B7280'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
          ...extra,
        }}
      >
        {children}
      </select>
      {error && (
        <span style={{ fontSize: '12px', color: 'var(--status-danger-text)', fontFamily: 'var(--font-family)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
