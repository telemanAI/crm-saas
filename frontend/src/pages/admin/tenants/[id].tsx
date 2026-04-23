import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import { Layout } from '../../../components/layout/Layout';
import {
  Buildings,
  UsersThree,
  FileText,
  ArrowLeft,
  UserCircle,
  ShieldCheck,
  Pencil,
  CheckCircle,
  XCircle,
  Crown,
  UserMinus,
  UserPlus,
  Warning,
} from 'phosphor-react';

/**
 * Dettaglio shop per SUPER_ADMIN.
 *
 * FIX: usa il nuovo endpoint /api/admin/tenants/:id/memberships che ritorna
 * TUTTI i membri del negozio (attivi + ex operatori), indipendentemente dal
 * valore di User.tenantId. Prima la pagina usava /users che ritorna solo gli
 * utenti con User.tenantId = shopId (di solito solo il FOUNDER).
 *
 * SUPER_ADMIN può:
 *  - Cambiare ruolo (OPERATOR/ADMIN/FOUNDER) di qualsiasi membro
 *  - Modificare permessi granulari dei membri (il FOUNDER resta sempre a 11/11)
 *  - Revocare/Riattivare accesso
 *  - Vedere lo storico inattivi (ex-operatori)
 */

interface TenantMembership {
  id: string;
  userId: string;
  shopId: string;
  role: 'FOUNDER' | 'ADMIN' | 'OPERATOR';
  permissions: Record<string, boolean>;
  isActive: boolean;
  joinedAt: string;
  leftAt: string | null;
  endOfRelationshipNote: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLogin?: string | null;
  } | null;
}

const PERMISSION_LABELS: Record<string, string> = {
  canViewAllCustomers: 'Visualizzare tutti i clienti',
  canViewReports: 'Visualizzare report',
  canCreatePractices: 'Creare pratiche',
  canEditPractices: 'Modificare pratiche',
  canDeletePractices: 'Eliminare pratiche',
  canEditCustomers: 'Modificare clienti',
  canDeleteCustomers: 'Eliminare clienti',
  canExportData: 'Esportare dati',
  canImportData: 'Importare dati',
  canManageCashRegister: 'Gestire cassa',
  canChangeUserRoles: 'Cambiare ruoli/permessi',
};

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuthStore();

  const [tenant, setTenant] = useState<any>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingMembership, setEditingMembership] = useState<TenantMembership | null>(null);
  const [editForm, setEditForm] = useState<{
    role: 'FOUNDER' | 'ADMIN' | 'OPERATOR';
    permissions: Record<string, boolean>;
  }>({ role: 'OPERATOR', permissions: {} });
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }
    if (id) loadTenantDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, id]);

  const loadTenantDetails = async () => {
    setLoading(true);
    try {
      const [tenantRes, membershipsRes] = await Promise.all([
        api.get(`/api/admin/tenants/${id}`),
        api.get(`/api/admin/tenants/${id}/memberships`),
      ]);
      setTenant(tenantRes.data.tenant || tenantRes.data);
      setStats(tenantRes.data.stats || {});
      setMemberships(membershipsRes.data || []);
    } catch (error: any) {
      alert('Errore durante il caricamento: ' + (error?.response?.data?.message || error.message));
      router.push('/admin/tenants');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (m: TenantMembership) => {
    setEditingMembership(m);
    // Pre-compila form
    const perms: Record<string, boolean> = {};
    Object.keys(PERMISSION_LABELS).forEach((k) => {
      perms[k] = !!m.permissions?.[k];
    });
    setEditForm({ role: m.role, permissions: perms });
  };

  const saveChanges = async () => {
    if (!editingMembership) return;
    try {
      // 1. Aggiorna ruolo se cambiato
      if (editForm.role !== editingMembership.role) {
        await api.patch(
          `/api/admin/tenants/${id}/memberships/${editingMembership.userId}/role`,
          { role: editForm.role },
        );
      }
      // 2. Aggiorna permessi (se non FOUNDER; il backend li forzerà comunque)
      if (editForm.role !== 'FOUNDER') {
        await api.patch(
          `/api/admin/tenants/${id}/memberships/${editingMembership.userId}/permissions`,
          editForm.permissions,
        );
      }
      alert('Aggiornato con successo');
      setEditingMembership(null);
      await loadTenantDetails();
    } catch (err: any) {
      alert('Errore: ' + (err?.response?.data?.message || err.message));
    }
  };

  const revokeAccess = async (m: TenantMembership) => {
    if (m.role === 'FOUNDER') {
      alert('Non puoi revocare il FOUNDER. Trasferisci prima la proprietà.');
      return;
    }
    const note = prompt(
      `Motivo revoca accesso per ${m.user?.firstName} ${m.user?.lastName}? (opzionale)`,
    );
    if (note === null) return;
    try {
      await api.delete(`/api/admin/tenants/${id}/memberships/${m.userId}`, {
        data: { endOfRelationshipNote: note || undefined },
      });
      alert('Accesso revocato');
      loadTenantDetails();
    } catch (err: any) {
      alert('Errore: ' + (err?.response?.data?.message || err.message));
    }
  };

  const reactivate = async (m: TenantMembership) => {
    if (!confirm(`Riattivare ${m.user?.firstName} ${m.user?.lastName}?`)) return;
    try {
      await api.post(`/api/admin/tenants/${id}/memberships/${m.userId}/reactivate`);
      alert('Membership riattivata');
      loadTenantDetails();
    } catch (err: any) {
      alert('Errore: ' + (err?.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-600 mt-4">Caricamento dettagli negozio...</p>
        </div>
      </Layout>
    );
  }

  if (!tenant) return null;

  const visibleMembers = showInactive
    ? memberships
    : memberships.filter((m) => m.isActive);
  const activeCount = memberships.filter((m) => m.isActive).length;
  const inactiveCount = memberships.filter((m) => !m.isActive).length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" /> Torna alla lista
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Buildings className="w-8 h-8 text-indigo-600" weight="duotone" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-gray-500 font-mono text-sm">Codice #{tenant.subscriptionCode}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <UsersThree className="w-4 h-4" /> {activeCount} membri attivi
                </span>
                {inactiveCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <UserMinus className="w-4 h-4" /> {inactiveCount} ex membri
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <FileText className="w-4 h-4" /> {stats?.practices || 0} pratiche
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UsersThree className="w-5 h-5 text-indigo-600" />
              Membri del negozio
            </h2>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                data-testid="toggle-inactive"
              />
              Mostra ex-membri ({inactiveCount})
            </label>
          </div>

          {visibleMembers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nessun membro</p>
          ) : (
            <div className="space-y-2">
              {visibleMembers.map((m) => (
                <div
                  key={m.id}
                  className={`border rounded-lg p-4 flex items-center justify-between gap-4 ${
                    m.isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'
                  }`}
                  data-testid={`membership-row-${m.userId}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        m.role === 'FOUNDER' ? 'bg-amber-100 text-amber-700' :
                        m.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {m.role === 'FOUNDER' ? <Crown className="w-5 h-5" weight="fill" /> : <UserCircle className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {m.user?.firstName} {m.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{m.user?.email}</p>
                      {!m.isActive && m.leftAt && (
                        <p className="text-xs text-rose-600 mt-1">
                          Uscito il {new Date(m.leftAt).toLocaleDateString('it-IT')}
                          {m.endOfRelationshipNote ? ` · ${m.endOfRelationshipNote}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                        m.role === 'FOUNDER' ? 'bg-amber-100 text-amber-800' :
                        m.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {m.role}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Object.values(m.permissions || {}).filter(Boolean).length}/
                      {Object.keys(PERMISSION_LABELS).length} permessi
                    </span>
                    {m.isActive ? (
                      <>
                        <button
                          onClick={() => openEdit(m)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs"
                          data-testid={`edit-membership-${m.userId}`}
                        >
                          <Pencil className="w-3 h-3" /> Modifica
                        </button>
                        {m.role !== 'FOUNDER' && (
                          <button
                            onClick={() => revokeAccess(m)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-xs"
                          >
                            <UserMinus className="w-3 h-3" /> Revoca
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => reactivate(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-xs"
                      >
                        <UserPlus className="w-3 h-3" /> Riattiva
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============ DIALOG EDIT ============ */}
        {editingMembership && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Modifica {editingMembership.user?.firstName} {editingMembership.user?.lastName}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{editingMembership.user?.email}</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ruolo</label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, role: e.target.value as any }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  data-testid="edit-role-select"
                >
                  <option value="OPERATOR">Operatore</option>
                  <option value="ADMIN">Admin</option>
                  <option value="FOUNDER">Founder</option>
                </select>
                {editForm.role === 'FOUNDER' && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
                    <Warning className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Il FOUNDER avrà SEMPRE tutti i permessi (non modificabili). Il FOUNDER precedente (se diverso) manterrà i suoi permessi.
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permessi granulari
                  {editForm.role === 'FOUNDER' && (
                    <span className="ml-2 text-xs text-gray-500">(disabilitati per FOUNDER)</span>
                  )}
                </label>
                <div className="grid grid-cols-1 gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2 text-sm ${editForm.role === 'FOUNDER' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.role === 'FOUNDER' ? true : !!editForm.permissions[key]}
                        disabled={editForm.role === 'FOUNDER'}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            permissions: { ...p.permissions, [key]: e.target.checked },
                          }))
                        }
                        data-testid={`perm-${key}`}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingMembership(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Annulla
                </button>
                <button
                  onClick={saveChanges}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                  data-testid="save-membership-btn"
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
