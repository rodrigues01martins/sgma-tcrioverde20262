import React, { useEffect, useRef, useState } from 'react';
import { auth } from '../firebase';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { TextInput } from './ui/FormField';
import { Button } from './ui/Button';

// ============================================================
// MODAL — Excluir usuário (MANUTENÇÃO A, seções 3/4/8)
// ============================================================
// Exclusão real e permanente (Authentication + users/{uid}) roda no
// servidor (api/admin/delete-user) — o botão só libera depois que o
// e-mail digitado bate com o do usuário-alvo, e nunca comunica sucesso
// antes da resposta do servidor.
interface DeleteUserModalProps {
  user: { uid: string; email: string; displayName?: string };
  onClose: () => void;
  onDeleted: (uid: string) => void;
}

// Mapeia o `code` retornado pelo endpoint (seção 8: distinguir falha de
// autorização, usuário inexistente, conta protegida, erro no
// Authentication e erro no Firestore) para uma mensagem em pt-BR —
// nunca expõe stack trace ou detalhe técnico ao usuário.
const MENSAGENS_POR_CODIGO: Record<string, string> = {
  UNAUTHENTICATED: 'Sua sessão expirou. Atualize a página e faça login novamente.',
  FORBIDDEN: 'Apenas administradores podem excluir usuários.',
  SELF_DELETE: 'Você não pode excluir a própria conta.',
  BOOTSTRAP_PROTECTED: 'Esta conta é o administrador protegido do sistema e não pode ser excluída.',
  LAST_ADMIN: 'Não é possível excluir o último administrador operacional. Torne outro usuário administrador antes de continuar.',
  NOT_FOUND: 'Usuário não encontrado — a lista será atualizada.',
  INVALID_PAYLOAD: 'Não foi possível identificar o usuário a excluir.',
  AUTH_DISABLE_FAILED: 'Não foi possível neutralizar o acesso do usuário. Tente novamente.',
  PARTIAL_FAILURE: 'A exclusão foi interrompida no meio do processo. Tente novamente — a operação pode ser repetida com segurança.',
  FIRESTORE_DELETE_FAILED: 'A exclusão foi interrompida no meio do processo. Tente novamente — a operação pode ser repetida com segurança.',
  AUTH_DELETE_FAILED: 'A exclusão foi interrompida no meio do processo. Tente novamente — a operação pode ser repetida com segurança.',
};

export function DeleteUserModal({ user, onClose, onDeleted }: DeleteUserModalProps) {
  const previamenteFocado = useRef<Element | null>(null);
  const botaoFecharRef = useRef<HTMLButtonElement>(null);

  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | undefined>();

  const confirmacaoValida = confirmacao.trim().toLowerCase() === user.email.trim().toLowerCase();

  useEffect(() => {
    previamenteFocado.current = document.activeElement;
    botaoFecharRef.current?.focus();
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !excluindo) onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      (previamenteFocado.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (excluindo || !confirmacaoValida) return; // previne duplo clique/duplo submit
    setErroGeral(undefined);
    setExcluindo(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setErroGeral('Sua sessão expirou. Atualize a página e faça login novamente.');
        return;
      }

      const resposta = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ targetUid: user.uid }),
      });

      // Só comunica sucesso depois da confirmação explícita do servidor
      // (seção 3) — nunca fecha o modal otimisticamente antes da resposta.
      if (!resposta.ok) {
        let mensagem = 'Não foi possível excluir o usuário. Tente novamente.';
        try {
          const corpo = await resposta.json();
          if (typeof corpo?.code === 'string' && MENSAGENS_POR_CODIGO[corpo.code]) {
            mensagem = MENSAGENS_POR_CODIGO[corpo.code];
          } else if (typeof corpo?.error === 'string') {
            mensagem = corpo.error;
          }
        } catch {
          // resposta sem corpo JSON — mantém a mensagem genérica
        }
        setErroGeral(mensagem);
        return;
      }

      onDeleted(user.uid);
    } catch {
      setErroGeral('Não foi possível excluir o usuário. Verifique sua conexão e tente novamente.');
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Excluir usuário ${user.displayName || user.email}`}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !excluindo && onClose()} />
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2.5 rounded-xl text-[var(--native-danger)] shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Excluir usuário</h3>
              <p className="text-xs text-slate-400">Esta ação é permanente</p>
            </div>
          </div>
          <button
            ref={botaoFecharRef}
            onClick={() => !excluindo && onClose()}
            aria-label="Fechar"
            disabled={excluindo}
            className="shrink-0 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--native-focus)] rounded-lg p-1 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-semibold text-slate-800">{user.displayName || user.email}</p>
            {user.displayName && <p className="text-xs text-slate-400">{user.email}</p>}
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-[var(--native-danger)]">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              A exclusão é permanente e não pode ser desfeita. A conta de acesso e o cadastro deste usuário serão removidos.
              Os registros administrativos e operacionais já produzidos por ele (lançamentos, formulários, visitas, relatórios)
              são preservados e continuam vinculados ao histórico.
            </span>
          </div>

          <TextInput
            id="excluir-usuario-confirmacao"
            label={`Digite "${user.email}" para confirmar`}
            value={confirmacao}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmacao(e.target.value)}
            disabled={excluindo}
            autoComplete="off"
          />

          {erroGeral && (
            <p role="alert" className="text-sm text-[var(--native-danger)] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {erroGeral}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={excluindo}>Cancelar</Button>
            <Button type="submit" variant="danger" loading={excluindo} disabled={excluindo || !confirmacaoValida}>
              Excluir permanentemente
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
