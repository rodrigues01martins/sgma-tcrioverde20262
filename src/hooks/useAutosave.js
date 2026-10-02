import { useCallback, useEffect, useRef, useState } from 'react'

// Hook genérico de autosave — reutilizável por qualquer formulário da
// família Formulários (Visita In Loco, Verificação Inicial — 30 Dias,
// Relatório Final, e os que vierem depois). Não conhece Firestore nem
// regra de negócio nenhuma: só controla QUANDO salvar (debounce, uma
// gravação por vez, sem perder alteração feita durante um save em
// andamento) e o ESTADO do salvamento. O QUE salvar e COMO salvar é
// responsabilidade exclusiva da função `saveFn` que cada formulário
// fornece.
//
// Estados: 'idle' | 'dirty' | 'saving' | 'saved' | 'error'.
//
// Uso típico:
//   const autosave = useAutosave(saveDraft, { delay: 2000 })
//   useEffect(() => { if (prontoParaAutosave) autosave.notifyChange(dadosAtuais) }, [dadosAtuais])
//   <Button onClick={() => autosave.saveNow(dadosAtuais)}>Salvar Rascunho</Button>

export function useAutosave(saveFn, { delay = 2000, enabled = true } = {}) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [lastSavedAt, setLastSavedAt] = useState(null)

  const saveFnRef = useRef(saveFn)
  saveFnRef.current = saveFn

  const dataRef = useRef(undefined)
  const timerRef = useRef(null)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const runSave = useCallback(async () => {
    if (savingRef.current) {
      // Já existe um save em andamento — a versão mais recente será
      // salva automaticamente quando ele terminar (ver abaixo).
      pendingRef.current = true
      return
    }
    savingRef.current = true
    pendingRef.current = false
    if (mountedRef.current) setStatus('saving')
    try {
      await saveFnRef.current(dataRef.current)
      savingRef.current = false
      if (pendingRef.current) {
        // Alteração chegou enquanto salvava — persiste a versão mais
        // recente antes de considerar "salvo" (evita perder dados).
        await runSave()
        return
      }
      if (mountedRef.current) {
        setStatus('saved')
        setLastSavedAt(new Date())
        setError(null)
      }
    } catch (e) {
      savingRef.current = false
      if (mountedRef.current) {
        setStatus('error')
        setError(e)
      }
      // dirty permanece implícito: status 'error' já é tratado como
      // "não persistido" por isDirty, abaixo.
    }
  }, [])

  const notifyChange = useCallback((data) => {
    dataRef.current = data
    if (!enabled) return
    setStatus('dirty')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      runSave()
    }, delay)
  }, [enabled, delay, runSave])

  // Salvamento imediato — usado por "Salvar Rascunho" manual e antes de
  // ações definitivas (avançar etapa, enviar/finalizar).
  const saveNow = useCallback(async (data) => {
    if (data !== undefined) dataRef.current = data
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await runSave()
  }, [runSave])

  // Usado quando o formulário volta ao estado inicial depois de uma
  // finalização (ex.: envio bem-sucedido) — evita que o indicador ou um
  // autosave atrasado do registro anterior vaze para o próximo.
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    dataRef.current = undefined
    savingRef.current = false
    pendingRef.current = false
    setStatus('idle')
    setError(null)
    setLastSavedAt(null)
  }, [])

  const isDirty = status === 'dirty' || status === 'saving' || status === 'error'

  // Proteção contra saída — ativa SOMENTE enquanto houver alteração não
  // persistida. Navegadores modernos ignoram mensagens customizadas do
  // beforeunload, então não tentamos personalizar o texto.
  useEffect(() => {
    if (!isDirty) return
    function handleBeforeUnload(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  return { status, error, lastSavedAt, isDirty, notifyChange, saveNow, reset }
}
