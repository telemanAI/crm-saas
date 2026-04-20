import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Users, Shield, User, Trash, Pencil, UserPlus, EnvelopeSimple,
  CheckCircle, Clock, ArrowCounterClockwise, Warning, X, Crown,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { useAuthStore } from '@/stores/authStore';
import { invitesApi, membershipsApi } from '@/lib/api';

const PERMISSION_LABELS: Record<string, string> = {
  canViewAllCustomers: 'Vede clienti altrui',
  canViewReports: 'Visualizza report',
  canCreatePractices: 'Crea pratiche',
  canDeletePractices: 'Elimina pratiche',
  canDeleteCustomers: 'Elimina clienti',
  canExportData: 'Esporta dati',
  canImportData: 'Importa dati',
  canManageCashRegister: 'Gestisce cassa',
  canChangeUserRoles: 'Cambia ruoli utenti',
};

export default function TeamPage() {
  const { user, shops, activeShopId } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'invites'>('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeDialog, setRemoveDialog] = useState<any>(null);
  const [editPermissions, setEditPermissions] = useState<any>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const myMembership = shops.find((s) => s.shopId === activeShopId);
  const canManage = myMembership?.role === 'FOUNDER' || myMembership?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!canManage) return;
    load();
  }, [canManage, activeShopId]);

  const load = async () => {
    setLoading(true);
    try {
      const [m, i] = await Promise.all([membershipsApi.list(), invitesApi.list()]);
      setMembers(Array.isArray(m) ? m : []);
      setInvites(Array.isArray(i) ? i : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!canManage) {
    return (
      <OperatorLayout title=\"Team\">
        <div className=\"text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl\">
          <Shield className=\"w-14 h-14 text-slate-600 mx-auto mb-3\" />
          <h3 className=\"text-lg font-semibold text-white\">Accesso negato</h3>
          <p className=\"text-slate-400 text-sm mt-1\">Solo Admin e Founder possono gestire il team.</p>
        </div>
      </OperatorLayout>
    );
  }

  const filteredMembers = includeInactive ? members : members.filter((m) => m.isActive);

  return (
    <OperatorLayout title=\"Team\">
      <div className=\"flex items-center justify-between mb-6\">
        <div>
          <h1 className=\"text-2xl font-bold text-white\">Gestione team</h1>
          <p className=\"text-slate-400 text-sm mt-0.5\">Operatori, permessi e inviti di questo negozio</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          data-testid=\"invite-new-btn\"
          className=\"flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25\"
        >
          <UserPlus className=\"w-5 h-5\" /> Invita operatore
        </button>
      </div>

      <div className=\"flex gap-2 mb-5 p-1 bg-slate-900/50 rounded-xl w-fit\">
        <button
          onClick={() => setTab('members')}
          data-testid=\"tab-members\"
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${tab === 'members' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
        >
          Membri ({members.filter((m: any) => m.isActive).length})
        </button>
        <button
          onClick={() => setTab('invites')}
          data-testid=\"tab-invites\"
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${tab === 'invites' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
        >
          Inviti ({invites.filter((i: any) => i.status === 'PENDING').length})
        </button>
      </div>

      {loading ? (
        <div className=\"text-center py-10\"><div className=\"animate-spin w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto\" /></div>
      ) : tab === 'members' ? (
        <>
          <div className=\"flex items-center gap-2 mb-4 text-xs\">
            <input id=\"include-inactive\" type=\"checkbox\" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} data-testid=\"include-inactive-checkbox\" />
            <label htmlFor=\"include-inactive\" className=\"text-slate-400\">Mostra ex-operatori (con storico)</label>
          </div>
          <div className=\"grid gap-3\">
            {filteredMembers.length === 0 ? (
              <div className=\"text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500\">Nessun membro</div>
            ) : (
              filteredMembers.map((m: any) => (
                <MemberCard key={m.userId} m={m} onEdit={() => setEditPermissions(m)} onRemove={() => setRemoveDialog(m)} canManage={canManage} />
              ))
            )}
          </div>
        </>
      ) : (
        <div className=\"grid gap-3\">
          {invites.length === 0 ? (
            <div className=\"text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500\">Nessun invito</div>
          ) : (
            invites.map((inv: any) => (
              <InviteCard key={inv.id} inv={inv} onResend={async () => { await invitesApi.resend(inv.id); load(); }} onRevoke={async () => { if (confirm('Revocare invito?')) { await invitesApi.revoke(inv.id); load(); } }} />
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} onDone={() => { setInviteOpen(false); load(); setTab('invites'); }} />}
        {removeDialog && <RemoveDialog m={removeDialog} onClose={() => setRemoveDialog(null)} onDone={() => { setRemoveDialog(null); load(); }} />}
        {editPermissions && <EditPermissionsDialog m={editPermissions} onClose={() => setEditPermissions(null)} onDone={() => { setEditPermissions(null); load(); }} />}
      </AnimatePresence>
    </OperatorLayout>
  );
}

function MemberCard({ m, onEdit, onRemove, canManage }: any) {
  const roleIcon = m.role === 'FOUNDER' ? <Crown className=\"w-5 h-5\" weight=\"fill\" /> : m.role === 'ADMIN' ? <Shield className=\"w-5 h-5\" /> : <User className=\"w-5 h-5\" />;
  const roleColor = m.role === 'FOUNDER' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : m.role === 'ADMIN' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'bg-slate-700/30 text-slate-300 border-slate-600/30';
  const activePermCount = Object.values(m.permissions || {}).filter((v) => v === true).length;
  const totalPerms = Object.keys(PERMISSION_LABELS).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid={`member-card-${m.userId}`}
      className={`bg-slate-900/70 border border-slate-800 rounded-2xl p-5 ${!m.isActive ? 'opacity-60' : ''}`}
    >
      <div className=\"flex items-center gap-4\">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${roleColor}`}>{roleIcon}</div>
        <div className=\"flex-1 min-w-0\">
          <div className=\"flex items-center gap-2\">
            <h3 className=\"font-semibold text-white truncate\">{m.firstName} {m.lastName}</h3>
            {!m.isActive && <span className=\"text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded uppercase font-bold\">Ex-operatore</span>}
          </div>
          <p className=\"text-xs text-slate-400 truncate\">{m.email}</p>
          <p className=\"text-xs text-slate-500 mt-0.5\">{m.role} · {activePermCount}/{totalPerms} permessi attivi</p>
          {!m.isActive && m.endOfRelationshipNote && (
            <div className=\"mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-200 italic\">
              \"Nota fine rapporto: {m.endOfRelationshipNote}\"
            </div>
          )}
        </div>
        {canManage && m.isActive && m.role !== 'FOUNDER' && (
          <div className=\"flex gap-2\">
            <button onClick={onEdit} className=\"p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg\" title=\"Permessi\" data-testid={`edit-perm-${m.userId}`}>
              <Pencil className=\"w-5 h-5\" />
            </button>
            <button onClick={onRemove} className=\"p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg\" title=\"Rimuovi\" data-testid={`remove-member-${m.userId}`}>
              <Trash className=\"w-5 h-5\" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InviteCard({ inv, onResend, onRevoke }: any) {
  const statusMap: Record<string, { icon: any; color: string; label: string }> = {
    PENDING: { icon: Clock, color: 'text-amber-400', label: 'In attesa' },
    ACCEPTED: { icon: CheckCircle, color: 'text-emerald-400', label: 'Accettato' },
    EXPIRED: { icon: Warning, color: 'text-slate-500', label: 'Scaduto' },
    REVOKED: { icon: X, color: 'text-rose-400', label: 'Revocato' },
  };
  const S = statusMap[inv.status] || statusMap.PENDING;
  const Icon = S.icon;
  return (
    <div className=\"bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-4\" data-testid={`invite-card-${inv.id}`}>
      <EnvelopeSimple className=\"w-6 h-6 text-cyan-400\" />
      <div className=\"flex-1 min-w-0\">
        <p className=\"text-sm text-white truncate\">{inv.email}</p>
        <p className=\"text-xs text-slate-500\">{inv.role} · Scade {new Date(inv.expiresAt).toLocaleDateString('it-IT')}</p>
      </div>
      <span className={`flex items-center gap-1.5 text-xs ${S.color}`}><Icon className=\"w-4 h-4\" /> {S.label}</span>
      {inv.status === 'PENDING' && (
        <div className=\"flex gap-2\">
          <button onClick={onResend} className=\"p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg\" title=\"Reinvia\" data-testid={`resend-${inv.id}`}>
            <ArrowCounterClockwise className=\"w-5 h-5\" />
          </button>
          <button onClick={onRevoke} className=\"p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg\" title=\"Revoca\" data-testid={`revoke-${inv.id}`}>
            <X className=\"w-5 h-5\" />
          </button>
        </div>
      )}
    </div>
  );
}

function InviteDialog({ onClose, onDone }: any) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OPERATOR' | 'ADMIN'>('OPERATOR');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await invitesApi.create({ email, role, adminNote: adminNote || undefined });
      onDone();
    } catch (err: any) {
      setError(err.message || 'Errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className=\"fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4\" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className=\"bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full\">
        <h2 className=\"text-lg font-bold text-white mb-4\">Invita un operatore</h2>
        <form onSubmit={submit} className=\"space-y-3\">
          <div>
            <label className=\"block text-xs text-slate-400 mb-1\">Email</label>
            <input type=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid=\"invite-email-input\" className=\"w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50\" />
          </div>
          <div>
            <label className=\"block text-xs text-slate-400 mb-1\">Ruolo</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} data-testid=\"invite-role-select\" className=\"w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none\">
              <option value=\"OPERATOR\">Operatore</option>
              <option value=\"ADMIN\">Amministratore</option>
            </select>
          </div>
          <div>
            <label className=\"block text-xs text-slate-400 mb-1\">Nota per l'operatore (opzionale)</label>
            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} data-testid=\"invite-note-input\" placeholder=\"Es: Benvenuto nel team!\" className=\"w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none\" />
          </div>
          {error && <p className=\"text-rose-400 text-sm\">{error}</p>}
          <div className=\"flex gap-2 pt-2\">
            <button type=\"button\" onClick={onClose} className=\"flex-1 bg-slate-800 text-white py-2.5 rounded-xl\">Annulla</button>
            <button type=\"submit\" disabled={loading} data-testid=\"invite-send-btn\" className=\"flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50\">
              {loading ? 'Invio...' : 'Invia invito'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function RemoveDialog({ m, onClose, onDone }: any) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await membershipsApi.revoke(m.userId, note || undefined);
      onDone();
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className=\"fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4\" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className=\"bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full\">
        <h2 className=\"text-lg font-bold text-white mb-1\">Rimuovere {m.firstName} {m.lastName}?</h2>
        <p className=\"text-slate-400 text-sm mb-4\">L'operatore perderà accesso a questo negozio. Lo storico resta salvato e può essere riassunto in futuro.</p>
        <label className=\"block text-xs text-slate-400 mb-1\">Nota privata (opzionale — la rivedrai al re-invito)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} data-testid=\"remove-note-textarea\" placeholder=\"Es: Contratto scaduto, ottimo lavoratore, numero privato 333...\" className=\"w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-rose-500/50\" />
        <div className=\"flex gap-2 mt-5\">
          <button onClick={onClose} className=\"flex-1 bg-slate-800 text-white py-2.5 rounded-xl\">Annulla</button>
          <button onClick={submit} disabled={loading} data-testid=\"confirm-remove-btn\" className=\"flex-1 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50\">
            {loading ? 'Rimozione...' : 'Conferma rimozione'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditPermissionsDialog({ m, onClose, onDone }: any) {
  const [perms, setPerms] = useState<Record<string, boolean>>(m.permissions || {});
  const [role, setRole] = useState<string>(m.role);
  const [loading, setLoading] = useState(false);

  const toggle = (k: string) => setPerms((p) => ({ ...p, [k]: !p[k] }));

  const submit = async () => {
    setLoading(true);
    try {
      if (role !== m.role) await membershipsApi.updateRole(m.userId, role);
      await membershipsApi.updatePermissions(m.userId, perms);
      onDone();
    } catch {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className=\"fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4\" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className=\"bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto\">
        <h2 className=\"text-lg font-bold text-white mb-1\">Permessi di {m.firstName} {m.lastName}</h2>
        <p className=\"text-slate-400 text-xs mb-4\">Configura cosa può fare in questo negozio</p>

        <div className=\"mb-4\">
          <label className=\"block text-xs text-slate-400 mb-1\">Ruolo</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} data-testid=\"edit-role-select\" className=\"w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm\">
            <option value=\"OPERATOR\">Operatore</option>
            <option value=\"ADMIN\">Amministratore</option>
          </select>
        </div>

        <div className=\"space-y-2\">
          {Object.entries(PERMISSION_LABELS).map(([k, label]) => (
            <label key={k} className=\"flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/40\">
              <input type=\"checkbox\" checked={!!perms[k]} onChange={() => toggle(k)} data-testid={`perm-${k}`} className=\"w-4 h-4 accent-indigo-500\" />
              <span className=\"text-sm text-slate-200 flex-1\">{label}</span>
            </label>
          ))}
        </div>

        <div className=\"flex gap-2 mt-5\">
          <button onClick={onClose} className=\"flex-1 bg-slate-800 text-white py-2.5 rounded-xl\">Annulla</button>
          <button onClick={submit} disabled={loading} data-testid=\"save-permissions-btn\" className=\"flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50\">
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
