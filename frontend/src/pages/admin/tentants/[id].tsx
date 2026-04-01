import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SuperAdminLayout from '../../../components/layout/SuperAdminLayout';
import axios from '../../../lib/axios';
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  Key,
  Power,
  UserCircle,
  Envelope,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  Users,
  FileText,
  ChartBar,
  Eye,
  EyeSlash,
  Copy,
  CheckCircle,
} from 'phosphor-react';

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [tenant, setTenant] = useState<any>(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [copiedPassword, setCopiedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTenantDetail();
    }
  }, [id]);

  const loadTenantDetail = async () => {
    try {
      const response = await axios.get(`/api/super-admin/tenants/${id}`);
      setTenant(response.data.tenant);
      setUsers(response.data.tenant.users || []);
    } catch (error) {
      console.error('Errore caricamento dettagli:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!confirm(`Vuoi resettare la password di ${userName}?`)) return;

    try {
      const response = await axios.post(
        `/api/super-admin/tenants/${id}/users/${userId}/reset-password`,
      );
      alert(
        `Password resettata!\n\nPassword temporanea: ${response.data.temporaryPassword}\n\nComunicala all'utente. Dovrà cambiarla al primo login.`,
      );
      // Mostra password temporanea
      const tempPasswordField = document.getElementById(`temp-pass-${userId}`);
      if (tempPasswordField) {
        tempPasswordField.textContent = response.data.temporaryPassword;
        setShowPassword({ ...showPassword, [userId]: true });
      }
    } catch (error) {
      alert('Errore reset password: ' + error.response?.data?.message);
    }
  };

  const handleToggleActive = async (userId: string, userName: string, isActive: boolean) => {
    if (!confirm(`Vuoi ${isActive ? 'disattivare' : 'attivare'} ${userName}?`)) return;

    try {
      await axios.put(`/api/super-admin/tenants/${id}/users/${userId}/toggle-active`);
      loadTenantDetail();
    } catch (error) {
      alert('Errore: ' + error.response?.data?.message);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `ATTENZIONE: Vuoi eliminare definitivamente ${userName}?\n\nQuesta azione è IRREVERSIBILE.`,
      )
    )
      return;

    try {
      await axios.delete(`/api/super-admin/tenants/${id}/users/${userId}`);
      alert('Utente eliminato con successo');
      loadTenantDetail();
    } catch (error) {
      alert('Errore eliminazione: ' + error.response?.data?.message);
    }
  };

  const handleUpdateUser = async (userId: string, updateData: any) => {
    try {
      await axios.put(`/api/super-admin/tenants/${id}/users/${userId}`, updateData);
      alert('Utente aggiornato con successo');
      setEditingUser(null);
      loadTenantDetail();
    } catch (error) {
      alert('Errore aggiornamento: ' + error.response?.data?.message);
    }
  };

  const copyPassword = (password: string, userId: string) => {
    navigator.clipboard.writeText(password);
    setCopiedPassword(userId);
    setTimeout(() => setCopiedPassword(null), 2000);
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      SUPER_ADMIN: 'bg-red-100 text-red-800 border-red-300',
      ADMIN: 'bg-purple-100 text-purple-800 border-purple-300',
      FOUNDER: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      OPERATOR: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return badges[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Admin',
      FOUNDER: 'Fondatore',
      OPERATOR: 'Operatore',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento...</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (!tenant) {
    return (
      <SuperAdminLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Negozio non trovato</p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Torna ai Negozi</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-gray-600">
                Codice: {tenant.businessCode || 'N/D'} •{' '}
                <span
                  className={`font-semibold ${tenant.isActive ? 'text-green-600' : 'text-red-600'}`}
                >
                  {tenant.isActive ? 'Attivo' : 'Disabilitato'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Users className="w-10 h-10 text-indigo-600" weight="fill" />
              <div>
                <p className="text-sm text-gray-600">Clienti</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenant.stats?.customers || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-10 h-10 text-blue-600" weight="fill" />
              <div>
                <p className="text-sm text-gray-600">Pratiche</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenant.stats?.practices || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <UserCircle className="w-10 h-10 text-green-600" weight="fill" />
              <div>
                <p className="text-sm text-gray-600">Utenti</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenant.stats?.users || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-10 h-10 text-purple-600" weight="fill" />
              <div>
                <p className="text-sm text-gray-600">Creato</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(tenant.createdAt).toLocaleDateString('it-IT')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Negozio */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" weight="fill" />
            Informazioni Negozio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Envelope className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{tenant.email || 'N/D'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Telefono</p>
                <p className="font-medium text-gray-900">{tenant.phone || 'N/D'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Indirizzo</p>
                <p className="font-medium text-gray-900">
                  {tenant.address ? JSON.stringify(tenant.address) : 'N/D'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCircle className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-600">Fondatore</p>
                <p className="font-medium text-gray-900">
                  {tenant.createdBy?.name || tenant.createdBy?.email || 'N/D'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista Utenti */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" weight="fill" />
            Utenti del Negozio ({users.length})
          </h2>

          <div className="space-y-4">
            {users.map((user: any) => (
              <div
                key={user.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      {editingUser?.id === user.id ? (
                        // EDIT MODE
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editingUser.name}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Nome"
                          />
                          <input
                            type="email"
                            value={editingUser.email}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, email: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Email"
                          />
                          <select
                            value={editingUser.role}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, role: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="OPERATOR">Operatore</option>
                            <option value="ADMIN">Admin</option>
                            <option value="FOUNDER">Fondatore</option>
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleUpdateUser(user.id, {
                                  name: editingUser.name,
                                  email: editingUser.email,
                                  role: editingUser.role,
                                })
                              }
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                            >
                              Salva
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg text-sm font-medium"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      ) : (
                        // VIEW MODE
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900">{user.name}</h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(user.role)}`}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                user.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {user.isActive ? 'Attivo' : 'Disattivato'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <Envelope className="w-4 h-4 inline mr-1" />
                            {user.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Creato: {new Date(user.createdAt).toLocaleDateString('it-IT')}
                            {user.lastLogin &&
                              ` • Ultimo accesso: ${new Date(user.lastLogin).toLocaleDateString('it-IT')}`}
                          </p>

                          {/* Password temporanea (se resettata) */}
                          {showPassword[user.id] && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                              <p className="text-xs font-semibold text-yellow-800 mb-1">
                                Password Temporanea:
                              </p>
                              <div className="flex items-center gap-2">
                                <code
                                  id={`temp-pass-${user.id}`}
                                  className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded text-sm font-mono"
                                >
                                  ••••••••••••
                                </code>
                                <button
                                  onClick={() =>
                                    copyPassword(
                                      document.getElementById(`temp-pass-${user.id}`)
                                        ?.textContent || '',
                                      user.id,
                                    )
                                  }
                                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium flex items-center gap-1"
                                >
                                  {copiedPassword === user.id ? (
                                    <>
                                      <CheckCircle className="w-4 h-4" weight="fill" />
                                      <span>Copiato!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4" />
                                      <span>Copia</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!editingUser && (
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                      >
                        <PencilSimple className="w-4 h-4" weight="fill" />
                        <span>Modifica</span>
                      </button>

                      <button
                        onClick={() => handleResetPassword(user.id, user.name)}
                        className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                      >
                        <Key className="w-4 h-4" weight="fill" />
                        <span>Reset Pass</span>
                      </button>

                      <button
                        onClick={() =>
                          handleToggleActive(user.id, user.name, user.isActive)
                        }
                        className={`px-3 py-2 ${
                          user.isActive
                            ? 'bg-orange-600 hover:bg-orange-700'
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white rounded-lg text-sm font-medium flex items-center gap-1`}
                      >
                        <Power className="w-4 h-4" weight="fill" />
                        <span>{user.isActive ? 'Disattiva' : 'Attiva'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                      >
                        <Trash className="w-4 h-4" weight="fill" />
                        <span>Elimina</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}