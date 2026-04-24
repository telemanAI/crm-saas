import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Envelope, 
  MapPin, 
  FileText, 
  Trash, 
  ShoppingCart,
  Calendar,
  CheckCircle,
  Clock,
  PencilSimple,
  DeviceMobile,
  Lightning,
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import OperatorLayout from '@/components/layout/OperatorLayout';
import Link from 'next/link';

interface CustomerDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phonePrimary: string;
  phoneSecondary?: string;
  fiscalCode: string;
  vatNumber?: string;
  address?: any;
  notes?: string;
  status: string;
  createdAt: string;
  customFields?: any;
  notesHistory?: any
}

interface Practice {
  id: string;
  type: string;
  offerName: string;
  status: string;
  currentStep: number;
  createdAt: string;
  category?: 'FIXED_LINE' | 'MOBILE' | 'ENERGY';
}

// 🔥 NUOVA FUNZIONE: Formatta indirizzo da JSON a stringa leggibile
const formatAddress = (address: any): string => {
  if (!address) return 'Non specificato';
  
  // Se è stringa, prova a parsarlo
  let addr = address;
  if (typeof address === 'string') {
    try {
      addr = JSON.parse(address);
    } catch (e) {
      return address; // Se non è JSON valido, ritorna la stringa così com'è
    }
  }
  
  // Se dopo il parsing non è un oggetto, ritorna stringa
  if (typeof addr !== 'object' || addr === null) {
    return String(address);
  }
  
  // Costruisci stringa formattata: "Via Roma 123, 00100 Città (RM)"
  const parts = [];
  if (addr.street) parts.push(addr.street);
  if (addr.number) parts.push(addr.number);
  
  const streetPart = parts.join(' ');
  const cityParts = [];
  
  if (addr.zip) cityParts.push(addr.zip);
  if (addr.city) cityParts.push(addr.city);
  if (addr.province) cityParts.push(`(${addr.province})`);
  
  const cityPart = cityParts.join(' ');
  
  if (streetPart && cityPart) {
    return `${streetPart}, ${cityPart}`;
  } else if (streetPart) {
    return streetPart;
  } else if (cityPart) {
    return cityPart;
  }
  
  return 'Non specificato';
};

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token, user } = useAuthStore();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  useEffect(() => {
    if (id && token) {
      fetchCustomer();
      fetchCustomerPractices();
    }
  }, [id, token]);

  const fetchCustomer = async () => {
    try {
      const response = await api.get(`/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomer(response.data);
    } catch (err) {
      console.error('Errore caricamento cliente:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerPractices = async () => {
    try {
      const response = await api.get('/practices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const customerPractices = response.data.filter((p: any) => 
        p.customer?.id === id || p.customerId === id
      );
      setPractices(customerPractices);
    } catch (err) {
      console.error('Errore caricamento pratiche:', err);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    try {
      await api.post(`/customers/${id}/notes`, {
        text: noteText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNoteText('');
      fetchCustomer();
    } catch (err) {
      alert('Errore aggiunta nota');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleDeleteNote = async (index: number) => {
    if (!confirm('Eliminare questa nota?')) return;
    try {
      await api.delete(`/customers/${id}/notes/${index}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCustomer();
    } catch (err) {
      alert('Errore eliminazione nota');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo cliente? Verranno eliminate anche tutte le pratiche associate. L\'azione è irreversibile.')) return;
    
    setDeleteLoading(true);
    try {
      await api.delete(`/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.push('/operator/customers');
    } catch (err: any) {
      console.error('Errore eliminazione:', err);
      alert(err.response?.data?.message || 'Errore durante l\'eliminazione');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-emerald-400 bg-emerald-600/10';
      case 'CANCELLED': return 'text-rose-400 bg-rose-600/10';
      case 'IN_PROGRESS': return 'text-amber-400 bg-amber-600/10';
      default: return 'text-slate-400 bg-slate-600/10';
    }
  };

  if (loading) {
    return (
      <OperatorLayout title="Dettaglio Cliente">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  if (!customer) {
    return (
      <OperatorLayout title="Errore">
        <div className="text-center py-12">
          <p className="text-rose-400 text-xl">Cliente non trovato</p>
          <Link href="/operator/customers" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
            Torna alla lista
          </Link>
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title={`${customer.firstName} ${customer.lastName}`}>
      {/* Header con bottone Modifica aggiunto */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/operator/customers">
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-slate-400">Cliente dal {new Date(customer.createdAt).toLocaleDateString('it-IT')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 🔥 NUOVO: Bottone Modifica */}
          <Link href={`/operator/customers/${id}/edit`}>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-600/30 rounded-xl transition-all">
              <PencilSimple className="w-4 h-4" />
              Modifica Cliente
            </button>
          </Link>
          
          {/* Bottone Elimina esistente */}
          {user?.role === 'ADMIN' && (
            <button 
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-600/30 rounded-xl transition-all disabled:opacity-50"
            >
              <Trash className="w-4 h-4" />
              {deleteLoading ? 'Eliminazione...' : 'Elimina Cliente'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Dati Anagrafici</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-500 block mb-1">Codice Fiscale</label>
                <p className="text-white font-mono bg-slate-800/50 px-3 py-2 rounded-lg inline-block">
                  {customer.fiscalCode}
                </p>
              </div>
              {customer.vatNumber && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Partita IVA</label>
                  <p className="text-white">{customer.vatNumber}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-slate-500 block mb-1">Telefono</label>
                <p className="text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {customer.phonePrimary || 'Non specificato'}
                </p>
              </div>
              {customer.phoneSecondary && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Telefono Secondario</label>
                  <p className="text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {customer.phoneSecondary}
                  </p>
                </div>
              )}
              {customer.email && (
                <div className="col-span-2">
                  <label className="text-sm text-slate-500 block mb-1">Email</label>
                  <p className="text-white flex items-center gap-2">
                    <Envelope className="w-4 h-4 text-slate-400" />
                    {customer.email}
                  </p>
                </div>
              )}
              {/* 🔥 MODIFICATO: Usa formatAddress invece di JSON.stringify */}
              {customer.address && (
                <div className="col-span-2">
                  <label className="text-sm text-slate-500 block mb-1">Indirizzo</label>
                  <p className="text-white flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-1" />
                    <span className="capitalize">{formatAddress(customer.address)}</span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* === PRATICHE RETE FISSA === */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Pratiche Rete Fissa
                  <span className="ml-2 text-sm text-slate-400">
                    ({practices.filter((p) => p.category === 'FIXED_LINE' || !p.category).length})
                  </span>
                </h2>
              </div>
            </div>

            {practices.filter((p) => p.category === 'FIXED_LINE' || !p.category).length === 0 ? (
              <div className="text-center py-6 bg-slate-800/30 rounded-xl">
                <p className="text-slate-400 text-sm">Nessuna pratica rete fissa</p>
              </div>
            ) : (
              <div className="space-y-3">
                {practices.filter((p) => p.category === 'FIXED_LINE' || !p.category).map((practice) => (
                  <Link key={practice.id} href={`/operator/practices/${practice.id}`}>
                    <div className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800 transition-all cursor-pointer border border-slate-700 hover:border-slate-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{practice.offerName || 'Pratica senza nome'}</h4>
                          <p className="text-sm text-slate-400 mt-1">
                            {practice.type === 'TIM_FIBRA' ? 'TIM Fibra' : practice.type || 'Rete Fissa'} • Step {practice.currentStep}/8
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(practice.status)}`}>
                            {practice.status === 'COMPLETED' ? 'Completata' :
                             practice.status === 'CANCELLED' ? 'Annullata' :
                             practice.status === 'IN_PROGRESS' ? 'In corso' : 'Bozza'}
                          </span>
                          <Calendar className="w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* === PRATICHE MOBILE === */}
          {practices.filter((p) => p.category === 'MOBILE').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                    <DeviceMobile className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    Pratiche Mobile
                    <span className="ml-2 text-sm text-slate-400">({practices.filter((p) => p.category === 'MOBILE').length})</span>
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                {practices.filter((p) => p.category === 'MOBILE').map((practice) => (
                  <Link key={practice.id} href={`/operator/practices/mobile/${practice.id}`}>
                    <div className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800 transition-all cursor-pointer border border-slate-700 hover:border-cyan-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{practice.offerName || 'Pratica senza nome'}</h4>
                          <p className="text-sm text-slate-400 mt-1">
                            {practice.type || 'Mobile'} • Step {practice.currentStep}/6
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(practice.status)}`}>
                            {practice.status === 'COMPLETED' ? 'Completata' :
                             practice.status === 'CANCELLED' ? 'Annullata' :
                             practice.status === 'IN_PROGRESS' ? 'In corso' : 'Bozza'}
                          </span>
                          <Calendar className="w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* === PRATICHE LUCE/GAS === */}
          {practices.filter((p) => p.category === 'ENERGY').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                    <Lightning className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    Pratiche Luce/Gas
                    <span className="ml-2 text-sm text-slate-400">({practices.filter((p) => p.category === 'ENERGY').length})</span>
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                {practices.filter((p) => p.category === 'ENERGY').map((practice) => (
                  <Link key={practice.id} href={`/operator/practices/energy/${practice.id}`}>
                    <div className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800 transition-all cursor-pointer border border-slate-700 hover:border-amber-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{practice.offerName || 'Pratica senza nome'}</h4>
                          <p className="text-sm text-slate-400 mt-1">
                            {practice.type || 'Luce/Gas'} • Step {practice.currentStep}/6
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(practice.status)}`}>
                            {practice.status === 'COMPLETED' ? 'Completata' :
                             practice.status === 'CANCELLED' ? 'Annullata' :
                             practice.status === 'IN_PROGRESS' ? 'In corso' : 'Bozza'}
                          </span>
                          <Calendar className="w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Stato</h2>
            </div>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              customer.status === 'active' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-amber-600/20 text-amber-400'
            }`}>
              {customer.status === 'active' ? 'Attivo' : 'Inattivo'}
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Note Cliente</h2>
              </div>
              <span className="text-xs text-slate-500">
                {customer.notesHistory?.length || 0} note
              </span>
            </div>

            {/* Form aggiunta nota */}
            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Scrivi una nota..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 text-sm resize-none"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleAddNote}
                  disabled={noteLoading || !noteText.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white rounded-xl text-sm font-medium"
                >
                  {noteLoading ? 'Salvataggio...' : 'Aggiungi Nota'}
                </button>
              </div>
            </div>

            {/* Timeline note */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {customer.notesHistory && customer.notesHistory.length > 0 ? (
                customer.notesHistory
                  .slice()
                  .reverse()
                  .map((note: any, index:number) => (
                    <div key={index} className="relative pl-6 pb-4 border-l-2 border-slate-700 last:border-0">
                      <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-amber-500" />
                      <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-amber-400">
                            {note.createdBy || 'Operatore'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {new Date(note.createdAt).toLocaleString('it-IT', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            <button
                              onClick={() => handleDeleteNote(customer.notesHistory.length - 1 - index)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                              title="Elimina"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{note.text}</p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">Nessuna nota presente</p>
                </div>
              )}
            </div>
          </motion.div>
          
        </div>
      </div>
    </OperatorLayout>
  );
}