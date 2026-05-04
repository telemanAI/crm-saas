import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import { Layout as SuperAdminLayout } from '../../components/layout/Layout';
import { MagnifyingGlass, ChartBar, Warning } from 'phosphor-react';

/**
 * Phase G.3 — Pagina diagnostica gare riservata al SUPER_ADMIN.
 *
 * Permette di:
 *  - inserire un id gara (UUID) e ottenere il dump completo della diagnose
 *  - vedere riepilogo human-readable + JSON espandibile per debug profondo
 *
 * Il bottone "Diagnosi" è stato rimosso dalla UI operator (era brutto da
 * vedere in un CRM enterprise, vedi feedback utente). Qui ha senso perché
 * è uno strumento di supporto tecnico, non operativo.
 */
export default function CompetitionsDiagnosePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [competitionId, setCompetitionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'SUPER_ADMIN') {
      router.push('/operator/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleDiagnose = async () => {
    if (!competitionId.trim()) {
      setError('Inserisci un ID gara valido');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.get(`/competitions/${competitionId.trim()}/diagnose`);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore diagnosi');
    } finally {
      setLoading(false);
    }
  };

  const excluded = (data?.practicesAnalysis || []).filter((p: any) => p.excluded);
  const eligible = (data?.practicesAnalysis || []).filter((p: any) => !p.excluded);

  return (
    <SuperAdminLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <MagnifyingGlass className="w-6 h-6 text-cyan-400" weight="duotone" />
            Diagnosi gara
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Strumento di supporto per capire perché una gara non avanza. Riservato a SUPER_ADMIN.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
          <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block">
            ID gara (UUID)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              placeholder="es. 8c2e73a2-..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              data-testid="diagnose-competition-id-input"
            />
            <button
              onClick={handleDiagnose}
              disabled={loading}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium text-sm disabled:opacity-50"
              data-testid="diagnose-run-btn"
            >
              {loading ? 'Analisi...' : 'Analizza'}
            </button>
          </div>
          {error && (
            <div className="mt-3 text-sm text-rose-400 flex items-center gap-2">
              <Warning className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        {data && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-5">
              <div className="text-xs uppercase tracking-widest text-cyan-400 mb-1">
                Dettagli gara
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{data.competition.title}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Periodo" value={`${String(data.competition.startDate).slice(0, 10)} → ${String(data.competition.endDate).slice(0, 10)}`} />
                <Stat label="Scope" value={`${data.competition.scopeType} (${data.scopeShopIds.length} shop)`} />
                <Stat label="Pratiche periodo" value={data.totalPracticesInPeriod} />
                <Stat label="Entries esistenti" value={data.totalEntriesExisting} />
                <Stat label="Idonee (ACTIVATED+venditore)" value={data.eligiblePractices} highlight="emerald" />
                <Stat label="Escluse" value={data.excludedPractices} highlight={data.excludedPractices > 0 ? 'amber' : ''} />
              </div>
            </div>

            <div>
              <h3 className="text-sm uppercase tracking-widest text-slate-500 mb-2">Per target</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.perTarget.map((t: any) => (
                  <div key={t.targetId || t.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                    <div className="font-bold text-slate-200 mb-1">{t.label}</div>
                    <div className="text-xs text-slate-500 mb-2">
                      {t.targetType} {t.category ? `· ${t.category}` : ''} {t.provider ? `· ${t.provider}` : ''}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Pratiche candidate</span>
                      <span className="font-bold text-emerald-400">{t.candidatePractices}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Entries esistenti</span>
                      <span className="font-bold text-amber-400">{t.existingEntries}</span>
                    </div>
                    {t.candidateExamples?.length > 0 && (
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer hover:text-slate-300">
                          Esempi (top {t.candidateExamples.length})
                        </summary>
                        <ul className="mt-1 space-y-1">
                          {t.candidateExamples.map((ex: any, idx: number) => (
                            <li key={idx}>• {ex.offer || ex.id.slice(0, 8)}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {excluded.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                  <Warning className="w-4 h-4 text-amber-400" />
                  Pratiche escluse ({excluded.length})
                </h3>
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-950 text-slate-500 uppercase">
                      <tr>
                        <th className="text-left px-3 py-2">Offerta</th>
                        <th className="text-left px-3 py-2">Categoria</th>
                        <th className="text-left px-3 py-2">Stato</th>
                        <th className="text-left px-3 py-2">Motivo esclusione</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {excluded.slice(0, 50).map((p: any) => (
                        <tr key={p.practiceId} className="border-t border-slate-800">
                          <td className="px-3 py-2 truncate max-w-[200px]">{p.offerName || p.practiceId.slice(0, 8)}</td>
                          <td className="px-3 py-2">{p.category}</td>
                          <td className="px-3 py-2">{p.operationalStatus}</td>
                          <td className="px-3 py-2 text-amber-300">{p.reasons.join('; ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {excluded.length > 50 && (
                    <div className="px-3 py-2 text-xs text-slate-500 bg-slate-950">
                      … e altre {excluded.length - 50}. Apri il JSON per vederle tutte.
                    </div>
                  )}
                </div>
              </div>
            )}

            <details className="bg-slate-950 border border-slate-800 rounded-lg">
              <summary
                className="cursor-pointer px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                onClick={() => setShowJson(!showJson)}
              >
                <ChartBar className="w-4 h-4 inline mr-2" /> Dump JSON completo
              </summary>
              <pre className="text-xs text-slate-300 p-4 overflow-x-auto max-h-96">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: any;
  highlight?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
  };
  return (
    <div className="bg-slate-950 rounded p-3">
      <div className="text-[11px] uppercase text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${highlight ? colorMap[highlight] || 'text-slate-100' : 'text-slate-100'}`}>
        {value}
      </div>
    </div>
  );
}
