import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Buildings,
  Users,
  ShoppingCart,
  SignOut,
  Bell,
  ChartLine,
  Crown,
  ArrowLeft,
  TelevisionSimple,
  UploadSimple,
  DownloadSimple,
  UsersThree,
  CaretDown,
  CaretRight,
  Globe,
  DeviceMobile,
  Lightning,
  ShieldWarning,
  ClipboardText,
  Storefront,
  Tag,
  Receipt,
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import api from '@/lib/axios';
import ShopSwitcher from '@/components/ShopSwitcher';

interface OperatorLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function OperatorLayout({ children, title = 'Dashboard' }: OperatorLayoutProps) {
  const router = useRouter();
  const { user, shops, activeShopId, isImpersonating, clearAuth, exitImpersonate, originalUser } = useAuthStore();
  const { isDark } = useThemeStore();

  const [showWashReport, setShowWashReport] = useState(false);

  // Menu collassabile "Pratiche" (auto-apre sulle rotte pratiche)
  const isOnPracticesRoute = router.pathname.startsWith('/operator/practices');
  const [practicesMenuOpen, setPracticesMenuOpen] = useState(isOnPracticesRoute);

  useEffect(() => {
    if (isOnPracticesRoute) setPracticesMenuOpen(true);
  }, [isOnPracticesRoute]);

  // Menu collassabile "Vendite" (auto-apre sulle rotte vendite/catalogo)
  const isOnSalesRoute =
    router.pathname.startsWith('/operator/products') ||
    router.pathname.startsWith('/operator/sales');
  const [salesMenuOpen, setSalesMenuOpen] = useState(isOnSalesRoute);

  useEffect(() => {
    if (isOnSalesRoute) setSalesMenuOpen(true);
  }, [isOnSalesRoute]);

  const activeMembership = shops.find((s) => s.shopId === activeShopId);
  const effectiveRole = activeMembership?.role || user?.role;
  // FIX P1: canManageTeam ora deriva dai PERMESSI granulari della membership,
  // non hard-coded sul ruolo. Così un FOUNDER può togliere "gestione team" a
  // un singolo ADMIN se vuole (es. nuovo ADMIN ancora in prova).
  // SUPER_ADMIN e FOUNDER hanno sempre bypass.
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isFounder = effectiveRole === 'FOUNDER';
  const canManageTeam =
    isSuperAdmin ||
    isFounder ||
    activeMembership?.permissions?.canManageTeam === true;

  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (user?.tenantId) {
          const res = await api.get(`/tenants/${user.tenantId}/config`);
          setShowWashReport(res.data.enableWashStep === true);
        }
      } catch {
        setShowWashReport(false);
      }
    };
    loadConfig();
  }, [user?.tenantId]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const handleExitImpersonate = () => {
    exitImpersonate();
    router.push('/admin/dashboard');
  };

  const practicesSubmenu = [
    { href: '/operator/practices', icon: Globe, label: 'Rete fissa' },
    { href: '/operator/practices/mobile', icon: DeviceMobile, label: 'Rete mobile' },
    { href: '/operator/practices/energy', icon: Lightning, label: 'Luce e Gas' },
  ];

  // ===== Tappa 2: Vendite (Catalogo + Storico) =====
  const perms = activeMembership?.permissions || ({} as any);
  const canViewProducts =
    isSuperAdmin || isFounder || perms.canViewProducts === true;
  const canSellDevices =
    isSuperAdmin || isFounder || perms.canSellDevices === true;

  const salesSubmenu = [
    ...(canViewProducts
      ? [{ href: '/operator/products', icon: Tag, label: 'Catalogo' }]
      : []),
    ...(canSellDevices
      ? [{ href: '/operator/sales', icon: Receipt, label: 'Storico vendite' }]
      : []),
  ];

  const navItems = [
    { href: '/operator/dashboard', icon: ChartLine, label: 'Dashboard' },
    { href: '/operator/customers', icon: Users, label: 'Clienti' },
  ];

  const afterPracticesItems = [
    { href: '/operator/reports', icon: ChartLine, label: 'Report' },
    ...(canManageTeam ? [{ href: '/operator/team', icon: UsersThree, label: 'Team' }] : []),
    { href: '/operator/imports', icon: UploadSimple, label: 'Import' },
    { href: '/operator/exports', icon: DownloadSimple, label: 'Export' },
    { href: '/operator/settings', icon: Buildings, label: 'Impostazioni' },
  ];

  const isActive = (href: string, exact = false) =>
    exact
      ? router.pathname === href
      : router.pathname === href || router.pathname.startsWith(href + '/');

  // FIX routing audit logs: per il FOUNDER/ADMIN restiamo nella sidebar operatore.
  // Solo il SUPER_ADMIN va nel pannello admin dedicato.
  const auditLogsHref = isSuperAdmin ? '/admin/audit' : '/operator/audit';

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-slate-950' : 'bg-gray-50'
      }`}
    >
      {isImpersonating === true && originalUser?.role === 'SUPER_ADMIN' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-amber-400" weight="fill" />
            <span className="text-sm text-amber-200">
              <strong>Modalità SuperAdmin:</strong> Stai visualizzando il CRM come admin del negozio
            </span>
          </div>
          <button
            onClick={handleExitImpersonate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" weight="bold" />
            Torna al SuperAdmin
          </button>
        </div>
      )}

      {/*
        SIDEBAR: layout flex-column per evitare lo scrollbar "anti-estetico".
        - Header: altezza fissa, non scrolla
        - <nav flex-1 overflow-y-auto>: area scrollabile con scrollbar sottile custom
        - Footer utente: altezza fissa in fondo, sempre visibile
        Niente più `absolute bottom-0` + `pb-28` (era la causa del footer che
        spariva sotto il contenuto lungo + scrollbar largo).
      */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 border-r z-40 flex flex-col transition-colors duration-300 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
        }`}
      >
        {/* ===== Header logo ===== */}
        <div
          className={`p-6 border-b flex-shrink-0 ${
            isDark ? 'border-slate-800' : 'border-gray-200'
          }`}
        >
          <Link href="/operator/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Buildings weight="fill" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>CRM</h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                {user?.role === 'SUPER_ADMIN'
                  ? 'Super Admin'
                  : effectiveRole === 'FOUNDER'
                  ? 'Founder'
                  : effectiveRole === 'ADMIN'
                  ? 'Admin'
                  : 'Operatore'}
              </p>
            </div>
          </Link>
        </div>

        {/* ===== Navigazione (unica area scrollabile) ===== */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 sidebar-scroll">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? isDark
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" weight={active ? 'fill' : 'regular'} />
                {item.label}
              </Link>
            );
          })}

          {/* ===== Menu collassabile Pratiche ===== */}
          <div>
            <button
              onClick={() => setPracticesMenuOpen((v) => !v)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isOnPracticesRoute
                  ? isDark
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              data-testid="sidebar-practices-toggle"
            >
              <span className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5" weight={isOnPracticesRoute ? 'fill' : 'regular'} />
                Pratiche
              </span>
              {practicesMenuOpen ? <CaretDown className="w-4 h-4" /> : <CaretRight className="w-4 h-4" />}
            </button>

            {practicesMenuOpen && (
              <div className="mt-1 space-y-1">
                {practicesSubmenu.map((sub) => {
                  const Icon = sub.icon;
                  const active =
                    sub.href === '/operator/practices'
                      ? router.pathname === '/operator/practices' ||
                        (router.pathname.startsWith('/operator/practices/') &&
                          !router.pathname.startsWith('/operator/practices/mobile') &&
                          !router.pathname.startsWith('/operator/practices/energy'))
                      : router.pathname === sub.href || router.pathname.startsWith(sub.href + '/');
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`ml-4 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        active
                          ? isDark
                            ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                          : isDark
                          ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                      data-testid={`sidebar-practices-${sub.label.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <Icon className="w-4 h-4" weight={active ? 'fill' : 'regular'} />
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== Tappa 2: Menu collassabile Vendite ===== */}
          {salesSubmenu.length > 0 && (
            <div>
              <button
                onClick={() => setSalesMenuOpen((v) => !v)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isOnSalesRoute
                    ? isDark
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                data-testid="sidebar-sales-toggle"
              >
                <span className="flex items-center gap-3">
                  <Storefront className="w-5 h-5" weight={isOnSalesRoute ? 'fill' : 'regular'} />
                  Vendite
                </span>
                {salesMenuOpen ? <CaretDown className="w-4 h-4" /> : <CaretRight className="w-4 h-4" />}
              </button>

              {salesMenuOpen && (
                <div className="mt-1 space-y-1">
                  {salesSubmenu.map((sub) => {
                    const Icon = sub.icon;
                    const active = router.pathname === sub.href || router.pathname.startsWith(sub.href + '/');
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`ml-4 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                          active
                            ? isDark
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : isDark
                            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                        data-testid={`sidebar-sales-${sub.label.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        <Icon className="w-4 h-4" weight={active ? 'fill' : 'regular'} />
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {afterPracticesItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? isDark
                        ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" weight={active ? 'fill' : 'regular'} />
                  {item.label}
                </Link>

                {item.label === 'Report' && showWashReport && (
                  <Link
                    href="/operator/reports/wash"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ml-4 mt-1 ${
                      router.pathname === '/operator/reports/wash'
                        ? isDark
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                        : isDark
                        ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                        : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    <TelevisionSimple
                      className="w-5 h-5"
                      weight={router.pathname === '/operator/reports/wash' ? 'fill' : 'regular'}
                    />
                    Report WASH
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-auto" />
                  </Link>
                )}
              </div>
            );
          })}

          {/* ===== Sezione amministrativa ===== */}
          {(isSuperAdmin || isFounder) && (
            <div
              className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`}
            >
              <p
                className={`px-3 text-[11px] uppercase tracking-wider mb-2 ${
                  isDark ? 'text-slate-600' : 'text-gray-400'
                }`}
              >
                Amministrazione
              </p>

              {/*
                Il link audit per il FOUNDER punta a /operator/audit (sidebar operatore).
                Solo il SUPER_ADMIN va su /admin/audit (sidebar admin).
                Fix del bug: "da FOUNDER clicco Audit logs e mi porta nella sidebar del super admin".
              */}
              <Link
                href={auditLogsHref}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(auditLogsHref)
                    ? isDark
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ClipboardText
                  className="w-5 h-5"
                  weight={isActive(auditLogsHref) ? 'fill' : 'regular'}
                />
                Audit logs
              </Link>

              {isSuperAdmin && (
                <Link
                  href="/admin/shop-health"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive('/admin/shop-health')
                      ? isDark
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <ShieldWarning
                    className="w-5 h-5"
                    weight={isActive('/admin/shop-health') ? 'fill' : 'regular'}
                  />
                  Salute Negozi
                </Link>
              )}
            </div>
          )}
        </nav>

        {/*
          ===== Footer utente =====
          Niente più position:absolute. Ora è un flex child con altezza auto e
          sempre visibile. Lo scrollbar appare solo sulla nav.
        */}
        <div
          className={`flex-shrink-0 p-4 border-t ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDark ? 'bg-violet-500/20' : 'bg-indigo-100'
              }`}
            >
              <Users className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-indigo-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  isDark ? 'text-slate-200' : 'text-gray-900'
                }`}
              >
                {user?.firstName} {user?.lastName}
              </p>
              <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={
              originalUser?.role === 'SUPER_ADMIN' && isImpersonating === true
                ? handleExitImpersonate
                : handleLogout
            }
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
              isDark
                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                : 'text-gray-600 hover:text-rose-600 hover:bg-rose-50'
            }`}
          >
            <SignOut className="w-4 h-4" />
            {isImpersonating === true ? 'Torna al SuperAdmin' : 'Disconnetti'}
          </button>
        </div>
      </aside>

      <main className="ml-64">
        <header
          className={`h-16 backdrop-blur-sm border-b flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-300 ${
            isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/80 border-gray-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {shops.length > 0 ? <ShopSwitcher /> : null}
            <button
              className={`relative p-2 transition-colors ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
