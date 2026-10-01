import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, BOOTSTRAP_ADMIN_EMAIL } from '../firebase';
import { Users, Shield, ShieldOff, RefreshCw, Search, ChevronDown, X, UserPlus, KeyRound, Trash2 } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { KpiCard } from './ui/Card';
import { TextInput } from './ui/FormField';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { CreateUserModal } from './CreateUserModal';
import { DeleteUserModal } from './DeleteUserModal';
import { PermissionKey, AreaKey, PermissionField, PERMISSION_FIELDS, AREA_ORDER, DEFAULT_PERMISSIONS } from '../config/permissions';

type UserRecord = { uid: string; email: string; displayName?: string; role: string; createdAt?: string } & {
  [K in PermissionKey]: boolean;
};

function contarAtivos(user: UserRecord, campos: PermissionField[]) {
  return campos.filter(f => user[f.key]).length;
}

function areasComAcesso(user: UserRecord): AreaKey[] {
  if (user.role === 'admin') return AREA_ORDER;
  return AREA_ORDER.filter(area => PERMISSION_FIELDS.some(f => f.group === area && user[f.key]));
}

// ============================================================
// MODAL — Gerenciar permissões de um usuário
// ============================================================
interface GerenciarPermissoesProps {
  user: UserRecord;
  isCurrentUser: boolean;
  isBootstrap: boolean;
  isLastAdmin: boolean;
  savingKey: string | null;
  onClose: () => void;
  onTogglePermission: (uid: string, field: PermissionKey, current: boolean) => void;
  onToggleRole: (uid: string, current: string) => void;
  onRequestDelete: () => void;
}

function GerenciarPermissoesModal({ user, isCurrentUser, isBootstrap, isLastAdmin, savingKey, onClose, onTogglePermission, onToggleRole, onRequestDelete }: GerenciarPermissoesProps) {
  const previamenteFocado = useRef<Element | null>(null);
  const botaoFecharRef = useRef<HTMLButtonElement>(null);
  const totalAtivos = contarAtivos(user, PERMISSION_FIELDS);
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [resetStatus, setResetStatus] = useState<'ok' | 'erro' | null>(null);

  // Reenvio de definição/redefinição de senha (seção 31) — nunca troca a
  // sessão do administrador nem mostra/define senha nenhuma; usa
  // exatamente o fluxo oficial do Firebase Authentication.
  async function handleEnviarResetSenha() {
    setEnviandoReset(true);
    setResetStatus(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetStatus('ok');
    } catch {
      setResetStatus('erro');
    } finally {
      setEnviandoReset(false);
    }
  }

  useEffect(() => {
    previamenteFocado.current = document.activeElement;
    botaoFecharRef.current?.focus();
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      (previamenteFocado.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderToggle(f: PermissionField) {
    const ativo = !!user[f.key];
    const salvando = savingKey === `${user.uid}:${f.key}`;
    return (
      <div key={f.key} className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm text-slate-700">{f.label}</span>
        <button
          onClick={() => onTogglePermission(user.uid, f.key, ativo)}
          disabled={salvando}
          aria-label={`${ativo ? 'Revogar' : 'Permitir'} acesso a ${f.label} para ${user.displayName || user.email}`}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--native-focus)] focus-visible:ring-offset-2 disabled:opacity-60 ${ativo ? 'bg-[var(--native-primary)]' : 'bg-slate-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Gerenciar permissões de ${user.displayName || user.email}`}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-lg max-h-[88vh] rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900">{user.displayName || user.email}</h3>
              {isCurrentUser && <Badge variant="primary">Você</Badge>}
              {user.role === 'admin' && <Badge variant="success" icon={<Shield size={11} />}>Admin</Badge>}
            </div>
            {user.displayName && <p className="text-sm text-slate-400">{user.email}</p>}
            <p className="text-xs text-slate-400 mt-1">
              {user.role === 'admin' ? 'Acesso automático a todas as funcionalidades' : `${totalAtivos} de ${PERMISSION_FIELDS.length} permissões ativas`}
            </p>
          </div>
          <button ref={botaoFecharRef} onClick={onClose} aria-label="Fechar" className="shrink-0 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--native-focus)] rounded-lg p-1">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {/* Função */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Função</p>
              <p className="text-sm text-slate-700 mt-0.5">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onToggleRole(user.uid, user.role)}
              disabled={isCurrentUser}
              title={isCurrentUser ? 'Não é possível alterar sua própria função' : undefined}
            >
              {user.role === 'admin' ? <ShieldOff size={13} /> : <Shield size={13} />}
              {user.role === 'admin' ? 'Tornar usuário comum' : 'Tornar administrador'}
            </Button>
          </div>

          {/* Redefinição de senha — nunca mostra/define senha, só dispara o e-mail oficial */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Senha</p>
              <p className="text-sm text-slate-700 mt-0.5">
                {resetStatus === 'ok' ? 'E-mail de redefinição enviado.' : resetStatus === 'erro' ? 'Não foi possível enviar o e-mail.' : 'Definida pelo próprio usuário'}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleEnviarResetSenha} loading={enviandoReset}>
              <KeyRound size={13} />
              Enviar e-mail para redefinir senha
            </Button>
          </div>

          {user.role === 'admin' ? (
            <div className="p-4 rounded-xl bg-[var(--native-primary-light)] border border-[var(--native-primary)]/30 text-sm text-slate-700">
              Administradores têm acesso automático a todas as áreas do sistema — os toggles individuais não têm efeito enquanto a função for Administrador.
            </div>
          ) : (
            AREA_ORDER.map(area => {
              const camposArea = PERMISSION_FIELDS.filter(f => f.group === area);
              const ativosArea = contarAtivos(user, camposArea);
              const subgrupos = [...new Set(camposArea.map(f => f.subgroup).filter(Boolean))] as string[];

              return (
                <details key={area} className="group border border-slate-200 rounded-xl overflow-hidden" open={ativosArea > 0}>
                  <summary className="list-none flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-bold text-slate-700">{area}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">{ativosArea} / {camposArea.length}</span>
                      <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="divide-y divide-slate-100">
                    {subgrupos.length > 0 ? (
                      subgrupos.map(sub => (
                        <div key={sub}>
                          <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{sub}</p>
                          <div className="divide-y divide-slate-100">
                            {camposArea.filter(f => f.subgroup === sub).map(renderToggle)}
                          </div>
                        </div>
                      ))
                    ) : (
                      camposArea.map(renderToggle)
                    )}
                  </div>
                </details>
              );
            })
          )}

          {/* Zona de risco — separada das ações rotineiras acima (seção 2) */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Zona de risco</p>
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100">
              <div>
                <p className="text-sm text-slate-700">Excluir usuário</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isCurrentUser
                    ? 'Você não pode excluir a própria conta.'
                    : isBootstrap
                      ? 'Administrador protegido do sistema — não pode ser excluído.'
                      : isLastAdmin
                        ? 'Último administrador operacional — torne outro usuário administrador antes.'
                        : 'Remove permanentemente o acesso deste usuário.'}
                </p>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={onRequestDelete}
                disabled={isCurrentUser || isBootstrap || isLastAdmin}
              >
                <Trash2 size={13} />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PÁGINA — lista de usuários
// ============================================================
interface UserManagementProps {
  currentUserUid: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUserUid }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [gerenciando, setGerenciando] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [criandoUsuario, setCriandoUsuario] = useState(false);
  const [excluindo, setExcluindo] = useState<UserRecord | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const data = snap.docs.map(d => {
        const raw = d.data();
        const permissions = PERMISSION_FIELDS.reduce((acc, f) => {
          acc[f.key] = raw[f.key] === true;
          return acc;
        }, {} as Record<PermissionKey, boolean>);
        return {
          uid: d.id,
          email: raw.email || '',
          displayName: raw.displayName || '',
          role: raw.role || 'user',
          createdAt: raw.createdAt || '',
          ...permissions,
        } as UserRecord;
      });
      setUsers(data);
      setLoading(false);
      setErro(false);
    }, () => { setLoading(false); setErro(true); });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const hasAnyAccess = (u: UserRecord) => PERMISSION_FIELDS.some(f => u[f.key]);

  const togglePermission = async (uid: string, field: PermissionKey, current: boolean) => {
    const chave = `${uid}:${field}`;
    setSavingKey(chave);
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { [field]: !current });
      } else {
        const u = users.find(u => u.uid === uid);
        await setDoc(ref, {
          uid,
          email: u?.email || '',
          displayName: u?.displayName || '',
          role: 'user',
          ...DEFAULT_PERMISSIONS,
          [field]: !current,
          createdAt: new Date().toISOString(),
        });
      }
      const label = PERMISSION_FIELDS.find(f => f.key === field)?.label || field;
      showToast(`Acesso a "${label}" ${!current ? 'liberado' : 'revogado'} com sucesso.`);
    } catch (e: any) {
      console.error('Erro ao atualizar permissão:', e?.code, e?.message);
      showToast('Não foi possível atualizar a permissão. Tente novamente.');
    } finally {
      setSavingKey(prev => (prev === chave ? null : prev));
    }
  };

  const toggleRole = async (uid: string, current: string) => {
    if (uid === currentUserUid) return showToast('Você não pode alterar sua própria função.');
    try {
      const newRole = current === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      showToast(`Função alterada para ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`);
    } catch (e) {
      showToast('Erro ao alterar função.');
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.displayName || '').toLowerCase().includes(search.toLowerCase())
  );

  const usuarioGerenciando = gerenciando ? users.find(u => u.uid === gerenciando) || null : null;
  const totalAdmins = users.filter(u => u.role === 'admin').length;

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          icon={<Users size={28} />}
          title="Gestão de Usuários"
          description="Cadastre usuários e gerencie suas permissões de acesso."
          actions={<Button size="sm" onClick={() => setCriandoUsuario(true)}><UserPlus size={14} /> Novo usuário</Button>}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard compact label="Total de usuários" value={users.length} />
        <KpiCard compact label="Administradores" value={users.filter(u => u.role === 'admin').length} tone="primary" />
        <KpiCard compact label="Acesso Relatório Final" value={users.filter(u => u.canAccessRelatorio).length} tone="success" />
        <KpiCard compact label="Sem nenhum acesso liberado" value={users.filter(u => u.role !== 'admin' && !hasAnyAccess(u)).length} tone="muted" />
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
        <TextInput
          type="text"
          placeholder="Buscar por e-mail ou nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}
          </span>
          {loading && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
        </div>

        {erro ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500 mb-3">Não foi possível carregar os usuários.</p>
            <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando usuários...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={users.length === 0 ? 'Nenhum usuário cadastrado.' : 'Nenhum usuário corresponde à busca'}
            description={
              users.length === 0
                ? 'Use "Novo usuário" para adicionar o primeiro acesso.'
                : undefined
            }
            action={
              users.length === 0
                ? <Button size="sm" onClick={() => setCriandoUsuario(true)}><UserPlus size={14} /> Novo usuário</Button>
                : search ? <Button size="sm" variant="ghost" onClick={() => setSearch('')}>Limpar busca</Button> : undefined
            }
          />
        ) : (
          <>
            {/* Desktop / tablet — lista compacta */}
            <div className="hidden md:block divide-y divide-slate-100">
              {filtered.map(u => (
                <div key={u.uid} className={`flex items-center gap-4 p-4 ${u.uid === currentUserUid ? 'bg-[var(--native-primary-light)]/40' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-[var(--native-primary-light)] flex items-center justify-center text-[var(--native-primary)] font-bold text-xs shrink-0">
                    {u.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                      {u.displayName || u.email}
                      {u.uid === currentUserUid && <Badge variant="primary">Você</Badge>}
                      {u.role === 'admin' && <Badge variant="success" icon={<Shield size={10} />}>Admin</Badge>}
                    </p>
                    {u.displayName && <p className="text-xs text-slate-400">{u.email}</p>}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-slate-500">Todas as áreas</span>
                    ) : areasComAcesso(u).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Nenhuma área</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {areasComAcesso(u).map(a => <Badge key={a} variant="neutral">{a}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="w-28 shrink-0 text-sm text-slate-500">
                    {u.role === 'admin' ? 'Automático' : `${contarAtivos(u, PERMISSION_FIELDS)}/${PERMISSION_FIELDS.length}`}
                  </div>
                  <div className="shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => setGerenciando(u.uid)}>Gerenciar</Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile — cards, sem matriz horizontal */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(u => (
                <div key={u.uid} className={`p-4 ${u.uid === currentUserUid ? 'bg-[var(--native-primary-light)]/40' : ''}`}>
                  <p className="font-semibold text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                    {u.displayName || u.email}
                    {u.uid === currentUserUid && <Badge variant="primary">Você</Badge>}
                    {u.role === 'admin' && <Badge variant="success" icon={<Shield size={10} />}>Admin</Badge>}
                  </p>
                  {u.displayName && <p className="text-xs text-slate-400">{u.email}</p>}
                  <p className="text-xs text-slate-500 mt-2">
                    {u.role === 'admin' ? 'Acesso automático a todas as áreas' : `${contarAtivos(u, PERMISSION_FIELDS)}/${PERMISSION_FIELDS.length} permissões`}
                  </p>
                  <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => setGerenciando(u.uid)}>Gerenciar</Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {usuarioGerenciando && (
        <GerenciarPermissoesModal
          user={usuarioGerenciando}
          isCurrentUser={usuarioGerenciando.uid === currentUserUid}
          isBootstrap={usuarioGerenciando.email === BOOTSTRAP_ADMIN_EMAIL}
          isLastAdmin={usuarioGerenciando.role === 'admin' && totalAdmins <= 1}
          savingKey={savingKey}
          onClose={() => setGerenciando(null)}
          onTogglePermission={togglePermission}
          onToggleRole={toggleRole}
          onRequestDelete={() => {
            setGerenciando(null);
            setExcluindo(usuarioGerenciando);
          }}
        />
      )}

      {excluindo && (
        <DeleteUserModal
          user={excluindo}
          onClose={() => setExcluindo(null)}
          onDeleted={() => {
            setExcluindo(null);
            // A lista e os KPIs já atualizam sozinhos via onSnapshot assim
            // que o documento users/{uid} é removido pelo endpoint.
            showToast('Usuário excluído. Os registros administrativos e operacionais anteriores foram preservados.');
          }}
        />
      )}

      {criandoUsuario && (
        <CreateUserModal
          onClose={() => setCriandoUsuario(false)}
          onCreated={(novoUid, emailEnviado) => {
            setCriandoUsuario(false);
            showToast(
              emailEnviado
                ? 'Usuário criado. Um e-mail foi enviado para definição da senha. O usuário foi criado sem acessos liberados.'
                : 'Usuário criado, mas não foi possível enviar o e-mail de definição de senha. Use "Enviar e-mail para redefinir senha" em Gerenciar para tentar novamente.'
            );
            // A lista já atualiza sozinha via onSnapshot — abrir "Gerenciar"
            // direto evita um segundo clique para liberar o primeiro acesso.
            setGerenciando(novoUid);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium z-50" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
};
