import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Check,
  User,
  Phone,
  Envelope,
  IdentificationCard,
  MapPin
} from 'phosphor-react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import OperatorLayout from '@/components/layout/OperatorLayout';

export default function NewCustomer() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fiscalCode: '',
    phonePrimary: '',
    email: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/customers', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      router.push('/operator/customers');
    } catch (err: any) {
      console.error('Errore creazione cliente:', err);
      alert(err.response?.data?.message || 'Errore durante la creazione del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <OperatorLayout title="Nuovo Cliente">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/operator/customers">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Nuovo Cliente</h1>
          <p className="text-slate-400">Inserisci i dati anagrafici del cliente</p>
        </div>
      </div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8"
      >
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nome <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Mario"
              />
            </div>
          </div>

          {/* Cognome */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cognome <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Rossi"
              />
            </div>
          </div>
        </div>

        {/* Codice Fiscale */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Codice Fiscale <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <IdentificationCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              name="fiscalCode"
              required
              maxLength={16}
              value={formData.fiscalCode}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase"
              placeholder="RSSMRA80A01H501Z"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Inserendo un CF esistente, verrà mostrato un avviso</p>
        </div>

        {/* Telefono */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Telefono <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="tel"
              name="phonePrimary"
              required
              value={formData.phonePrimary}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="+39 333 1234567"
            />
          </div>
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email
          </label>
          <div className="relative">
            <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="cliente@email.com"
            />
          </div>
        </div>

        {/* Indirizzo */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Indirizzo
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Via Roma 123, Milano"
            />
          </div>
        </div>

        {/* Bottoni */}
        <div className="flex gap-4">
          <Link href="/operator/customers" className="flex-1">
            <button
              type="button"
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
            >
              Annulla
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                Salva Cliente
              </>
            )}
          </button>
        </div>
      </motion.form>
    </OperatorLayout>
  );
}