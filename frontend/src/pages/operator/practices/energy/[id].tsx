import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  Lightning,
  User,
  Gauge,
  CreditCard,
  FileText,
  PencilSimple,
  Trash,
  CheckCircle,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';

export default function EnergyPracticeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [practice, setPractice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    (async () => {
      try {
        const res = await api.get(`/practices/${id}`);
        setPractice(res.data);
      } catch {
        router.replace('/operator/practices/energy');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const updateOpStatus = async (status: string) => {
    try {
      const res = await api.put(`/practices/${id}/operational-status`, { status });
      setPractice(res.data);
    } catch (err: any) {
      alert('Errore aggiornamento stato: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Eliminare questa pratica?')) return;
    setDeleting(true);
    try {
      await api.delete(`/practices/${id}`);
      router.push('/operator/practices/energy');
    } catch (err: any) {
      alert('Errore: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <OperatorLayout title="Dettaglio pratica luce/gas">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }
  if (!practice) return null;
  const e = practice.energyData || {};
  const customer = practice.customerSnapshot || practice.customer || {};

  const showValue = (label: string, value: any) =>
    value && (
      <div>
        <dt className="text-xs text-slate-500 uppercase tracking-wider">{label}</dt>
        <dd className="text-slate-200 mt-1">{String(value)}</dd>
      </div>
    );

  return (
    <OperatorLayout title="Dettaglio pratica luce/gas">
      <div className="max-w-4xl mx-auto">
        <Link href="/operator/practices/energy" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Torna alla lista
        </Link>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/30">
                <Lightning className="w-6 h-6 text-amber-400" weight="duotone" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {e.tipoAttivazione === 'ALTRO' ? e.tipoAttivazioneAltro : e.tipoAttivazione || 'Pratica luce/gas'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Creata il {new Date(practice.createdAt).toLocaleString('it-IT')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/operator/practices/energy/new?edit=${practice.id}`}>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-medium">
                  <PencilSimple className="w-4 h-4" /> Modifica
                </button>
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Trash className="w-4 h-4" /> Elimina
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <select
              value={practice.operationalStatus || 'PENDING'}
              onChange={(ev) => updateOpStatus(ev.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="PENDING">In Attesa</option>
              <option value="IN_PROGRESS">In Lavorazione</option>
              <option value="ACTIVATED">Attivata</option>
              <option value="REJECTED">KO</option>
            </select>
            {practice.status === 'completed' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded-full">
                <CheckCircle className="w-3 h-3" /> Completata
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <Section icon={User} title="Cliente">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('Nome', customer.firstName)}
              {showValue('Cognome', customer.lastName)}
              {showValue('Codice fiscale', customer.fiscalCode)}
              {showValue('CF vecchio contratto', e.codiceFiscaleVecchioContratto)}
              {showValue('Telefono', customer.phonePrimary || customer.phone)}
              {showValue('Email', customer.email)}
            </dl>
          </Section>

          <Section icon={Gauge} title="Attivazione & Contatore">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('Tipo attivazione', e.tipoAttivazione === 'ALTRO' ? e.tipoAttivazioneAltro : e.tipoAttivazione)}
              {showValue('Numero contatore', e.numeroContatore)}
              {showValue('Potenza', e.potenzaContatore === 'ALTRO' ? e.potenzaContatoreAltro : e.potenzaContatore?.replace('_', ' '))}
              {showValue('Gestore provenienza', e.gestoreProvenienza === 'ALTRO' ? e.gestoreProvenienzaAltro : e.gestoreProvenienza)}
              {showValue('Gestore nuovo contratto', e.gestoreNuovoContratto === 'ALTRO' ? e.gestoreNuovoContrattoAltro : e.gestoreNuovoContratto)}
              {showValue('Tipo offerta', e.tipoOfferta === 'ALTRO' ? e.tipoOffertaAltro : e.tipoOfferta)}
            </dl>
          </Section>

          <Section icon={CreditCard} title="Pagamento">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('IBAN/CDC', e.ibanCdc)}
              {showValue('Note metodo pagamento', e.noteMetodoPagamento)}
            </dl>
          </Section>

          <Section icon={FileText} title="Note & Accordi">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('Note generiche', e.noteGeneriche)}
              {showValue('Accordi con cliente', e.accordiCliente)}
              {showValue('Lavorazioni post-attivazione', practice.lavorazioniPostAttivazione)}
            </dl>
          </Section>

          <Section icon={User} title="Venditori">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('Venduto da', practice.soldBy)}
              {showValue('Inserito da', practice.enteredBy)}
            </dl>
          </Section>
        </div>
      </div>
    </OperatorLayout>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-amber-400" weight="duotone" />
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
