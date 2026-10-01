import React, { useEffect, useRef, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { X, UserPlus } from 'lucide-react';
import { TextInput } from './ui/FormField';
import { Button } from './ui/Button';

// ============================================================
// MODAL — Novo usuário (seção 16 da manutenção)
// ============================================================
// Só pede Nome e E-mail — nunca senha (seção 16/25): a criação real da
// conta Authentication acontece no servidor (api/admin/create-user),
// com senha aleatória de alta entropia que nunca chega ao navegador. A
// matriz de permissões NÃO é duplicada aqui (seção 18) — o usuário nasce
// com privilégio zero e quem libera acesso é o modal "Gerenciar" já
// existente, aberto automaticamente depois da criação.
interface CreateUserModalProps {
  onClose: () => void;
  onCreated: (uid: string, emailEnviado: boolean) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MENSAGENS_ERRO: Record<number, string> = {
  400: 'Verifique os dados informados.',
  401: 'Sua sessão expirou. Atualize a página e faça login novamente.',
  403: 'Apenas administradores podem cadastrar usuários.',
  409: 'Já existe um usuário cadastrado com este e-mail.',
};

export function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const previamenteFocado = useRef<Element | null>(null);
  const primeiroCampoRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [erroNome, setErroNome] = useState<string | undefined>();
  const [erroEmail, setErroEmail] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    previamenteFocado.current = document.activeElement;
    primeiroCampoRef.current?.focus();
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !enviando) onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      (previamenteFocado.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validar(): boolean {
    let ok = true;
    const nome = displayName.trim();
    const mail = email.trim();

    if (!nome) { setErroNome('Informe o nome.'); ok = false; } else { setErroNome(undefined); }
    if (!mail) { setErroEmail('Informe o e-mail.'); ok = false; }
    else if (!EMAIL_REGEX.test(mail)) { setErroEmail('E-mail em formato inválido.'); ok = false; }
    else { setErroEmail(undefined); }

    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return; // previne duplo clique/duplo submit
    setErroGeral(undefined);
    if (!validar()) return;

    setEnviando(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setErroGeral('Sua sessão expirou. Atualize a página e faça login novamente.');
        return;
      }

      const resposta = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ displayName: displayName.trim(), email: email.trim() }),
      });

      if (!resposta.ok) {
        let mensagem = MENSAGENS_ERRO[resposta.status] || 'Não foi possível criar o usuário. Tente novamente.';
        try {
          const corpo = await resposta.json();
          if (typeof corpo?.error === 'string' && resposta.status === 400) mensagem = corpo.error;
        } catch {
          // resposta sem corpo JSON — mantém a mensagem genérica do status
        }
        setErroGeral(mensagem);
        return;
      }

      const { uid, email: emailCriado } = await resposta.json();

      // Envio do e-mail de definição de senha (seção 29) — falha aqui NÃO
      // desfaz a conta já criada (seção 30); só muda a mensagem final.
      let emailEnviado = true;
      try {
        await sendPasswordResetEmail(auth, emailCriado);
      } catch {
        emailEnviado = false;
      }

      onCreated(uid, emailEnviado);
    } catch {
      setErroGeral('Não foi possível criar o usuário. Verifique sua conexão e tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Novo usuário">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !enviando && onClose()} />
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--native-primary-light)] p-2.5 rounded-xl text-[var(--native-primary)] shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Novo usuário</h3>
              <p className="text-xs text-slate-400">Nasce sem nenhum acesso liberado</p>
            </div>
          </div>
          <button
            onClick={() => !enviando && onClose()}
            aria-label="Fechar"
            disabled={enviando}
            className="shrink-0 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--native-focus)] rounded-lg p-1 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <TextInput
            id="novo-usuario-nome"
            label="Nome"
            value={displayName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
            error={erroNome}
            disabled={enviando}
            autoComplete="name"
            required
          />
          <TextInput
            id="novo-usuario-email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            error={erroEmail}
            disabled={enviando}
            autoComplete="email"
            required
          />

          {erroGeral && (
            <p role="alert" className="text-sm text-[var(--native-danger)] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {erroGeral}
            </p>
          )}

          <p className="text-xs text-slate-400">
            O usuário receberá um e-mail para definir a própria senha. Nenhuma senha é solicitada ou exibida aqui.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={enviando}>Cancelar</Button>
            <Button type="submit" loading={enviando} disabled={enviando}>Criar usuário</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
