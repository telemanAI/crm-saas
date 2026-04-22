import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Storefront, MagnifyingGlass, Buildings, ArrowRight, SignOut } from 'phosphor-react';
import { useAuthStore, ShopMembership } from '@/stores/authStore';
import { authApi } from '@/lib/api';

export default function SelectShop() {
  const router = useRouter();
  const { user, shops, setActiveShop, clearAuth } = useAuthStore();
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace('/login');
    if (shops.length === 0) router.replace('/operator/dashboard');
    if (shops.length === 1) router.replace('/operator/dashboard');
  }, [user, shops, router]);

  const grouped = useMemo(() => {
    const filtered = shops.filter(
      (s) =>
        !query ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.subscriptionCode.includes(query),
    );
    const byCompany: Record<string, ShopMembership[]> = {};
    for (const s of filtered) {
      const key = s.companyId || 'no-company';
      byCompany[key] = byCompany[key] || [];
      byCompany[key].push(s);
    }
    return byCompany;
  }, [shops, query]);

  const choose = async (shopId: string) => {
    setLoading(shopId);
    try {
      // Il backend ora ritorna token + user + shops aggiornati.
      // Passiamo TUTTI i campi a setActiveShop così lo store rimane allineato
      // a JWT.tenantId (nessun account swap).
      const res: any = await authApi.switchShop(shopId);
      const freshToken = res.access_token || res.token;
      const freshUser = res.user; // contiene role allineato alla membership
      setActiveShop(shopId, freshToken, freshUser);
      const membership = shops.find((s) => s.shopId === shopId);
      if (membership?.role === 'OPERATOR') router.push('/operator/dashboard');
      else router.push('/operator/dashboard');
    } catch (e) {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-[920px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Seleziona negozio</h1>
            <p className="text-slate-400 text-sm mt-0.5">Ciao {user?.firstName}, scegli dove vuoi entrare</p>
          </div>
          <button onClick={() => { clearAuth(); router.push('/login'); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm" data-testid="select-shop-logout-btn">
            <SignOut className="w-4 h-4" /> Esci
          </button>
        </div>

        <div className="relative mb-6">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            data-testid="shop-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome o codice negozio..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>

        <div className="space-y-6">
          {Object.entries(grouped).map(([companyId, group]) => (
            <div key={companyId}>
              {group.length > 1 ? (
                <div className="flex items-center gap-2 mb-2.5 text-slate-500 text-xs uppercase tracking-wider">
                  <Buildings className="w-3.5 h-3.5" />
                  <span>Gruppo aziendale · {group.length} negozi</span>
                </div>
              ) : null}
              <div className="grid md:grid-cols-2 gap-3">
                {group.map((shop) => (
                  <motion.button
                    key={shop.shopId}
                    data-testid={`shop-card-${shop.shopId}`}
                    onClick={() => choose(shop.shopId)}
                    disabled={loading !== null}
                    whileHover={{ y: -2 }}
                    className="group text-left p-5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all disabled:opacity-50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
                        <Storefront weight="duotone" className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate">{shop.name}</h3>
                        <p className="text-slate-500 text-xs font-mono mt-0.5">Codice {shop.subscriptionCode}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            shop.role === 'FOUNDER' ? 'bg-amber-500/20 text-amber-400' :
                            shop.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-400' :
                            'bg-slate-700/50 text-slate-300'
                          }`}>
                            {shop.role}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors self-center" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-slate-500">Nessun negozio trovato</div>
        ) : null}
      </div>
    </div>
  );
}
