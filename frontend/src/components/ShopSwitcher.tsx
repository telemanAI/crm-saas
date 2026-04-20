import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Storefront, CaretDown, MagnifyingGlass, Buildings, Check, ArrowsLeftRight } from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';

/**
 * Shop Switcher — da inserire nella topbar della dashboard negozio.
 * - Click o Cmd/Ctrl+K per aprire
 * - Ricerca istantanea per nome o codice
 * - Raggruppamento per Company
 * - Switch senza logout (nuovo JWT dal backend)
 */
export default function ShopSwitcher() {
  const router = useRouter();
  const { shops, activeShopId, setActiveShop } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeShop = shops.find((s) => s.shopId === activeShopId) || shops[0];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const grouped = useMemo(() => {
    const filtered = shops.filter(
      (s) =>
        !query ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.subscriptionCode.includes(query),
    );
    const byCompany: Record<string, typeof shops> = {};
    for (const s of filtered) {
      const key = s.companyId || 'no-company';
      byCompany[key] = byCompany[key] || [];
      byCompany[key].push(s);
    }
    return byCompany;
  }, [shops, query]);

  const choose = async (shopId: string) => {
    if (shopId === activeShopId) {
      setOpen(false);
      return;
    }
    setLoading(shopId);
    try {
      const res: any = await authApi.switchShop(shopId);
      setActiveShop(shopId, res.token);
      setOpen(false);
      router.reload();
    } catch {
      setLoading(null);
    }
  };

  if (shops.length === 0) return null;

  return (
    <>
      <button
        data-testid=\"shop-switcher-btn\"
        onClick={() => setOpen(true)}
        className=\"flex items-center gap-2.5 px-3 py-2 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all group\"
      >
        <Storefront weight=\"duotone\" className=\"w-4.5 h-4.5 text-indigo-400\" />
        <div className=\"text-left\">
          <p className=\"text-white text-sm font-semibold leading-tight\">{activeShop?.name || 'Seleziona negozio'}</p>
          {activeShop?.subscriptionCode && (
            <p className=\"text-slate-500 text-[10px] font-mono leading-tight\">Codice {activeShop.subscriptionCode}</p>
          )}
        </div>
        {shops.length > 1 && (
          <>
            <CaretDown className=\"w-3 h-3 text-slate-500 ml-1\" />
            <span className=\"hidden md:flex items-center gap-0.5 ml-2 px-1.5 py-0.5 bg-slate-950 rounded text-[10px] text-slate-500 font-mono border border-slate-800\">
              ⌘K
            </span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className=\"fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[12vh] p-4\"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              onClick={(e) => e.stopPropagation()}
              className=\"w-full max-w-[600px] bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden\"
            >
              <div className=\"flex items-center gap-3 px-5 py-4 border-b border-slate-800\">
                <MagnifyingGlass className=\"w-5 h-5 text-slate-500\" />
                <input
                  ref={inputRef}
                  data-testid=\"shop-switcher-search\"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder=\"Cerca negozio per nome o codice...\"
                  className=\"flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none\"
                />
                <span className=\"text-xs text-slate-600 font-mono\">ESC</span>
              </div>
              <div className=\"max-h-[50vh] overflow-y-auto p-3\">
                {Object.entries(grouped).map(([companyId, group]) => (
                  <div key={companyId} className=\"mb-3\">
                    {group.length > 1 && (
                      <div className=\"flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider\">
                        <Buildings className=\"w-3 h-3\" />
                        <span>Gruppo · {group.length} negozi</span>
                      </div>
                    )}
                    {group.map((shop) => {
                      const isActive = shop.shopId === activeShopId;
                      return (
                        <button
                          key={shop.shopId}
                          data-testid={`shop-switcher-option-${shop.shopId}`}
                          onClick={() => choose(shop.shopId)}
                          disabled={loading !== null}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            isActive ? 'bg-indigo-500/15 border border-indigo-500/30' : 'hover:bg-slate-800/50 border border-transparent'
                          }`}
                        >
                          <Storefront weight=\"duotone\" className={`w-5 h-5 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
                          <div className=\"flex-1 min-w-0\">
                            <p className=\"text-white text-sm font-medium truncate\">{shop.name}</p>
                            <p className=\"text-slate-500 text-xs font-mono\">Codice {shop.subscriptionCode} · {shop.role}</p>
                          </div>
                          {loading === shop.shopId ? (
                            <ArrowsLeftRight className=\"w-4 h-4 text-indigo-400 animate-pulse\" />
                          ) : isActive ? (
                            <Check className=\"w-4 h-4 text-indigo-400\" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {Object.keys(grouped).length === 0 && (
                  <div className=\"text-center py-10 text-slate-500 text-sm\">Nessun negozio corrisponde alla ricerca</div>
                )}
              </div>
              <div className=\"px-5 py-3 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between\">
                <span>{shops.length} negozi disponibili</span>
                <span>Ultimo switch salvato localmente</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
