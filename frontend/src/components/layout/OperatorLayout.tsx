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
  
  // Stato per mostrare/nascondere Report WASH
  const [showWashReport, setShowWashReport] = useState(false);

  // Ruolo effettivo dell'utente nel negozio attivo (può differire dal ruolo globale)
  const activeMembership = shops.find((s) => s.shopId === activeShopId);
  const effectiveRole = activeMembership?.role || user?.role;
  const canManageTeam = effectiveRole === 'FOUNDER' || effectiveRole === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Carica config WASH dal tenant
  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (user?.tenantId) {
          const res = await api.get(`/tenants/${user.tenantId}/config`);
          setShowWashReport(res.data.enableWashStep === true);
        }
      } catch (err) {
        console.error('Errore caricamento config:', err);
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

  const navItems = [
    { href: '/operator/dashboard', icon: ChartLine, label: 'Dashboard' },
    { href: '/operator/customers', icon: Users, label: 'Clienti' },
    { href: '/operator/practices', icon: ShoppingCart, label: 'Pratiche' },
    { href: '/operator/reports', icon: ChartLine, label: 'Report' },
    ...(canManageTeam ? [{ href: '/operator/team', icon: UsersThree, label: 'Team' }] : []),
    { href: '/operator/imports', icon: UploadSimple, label: 'Import' },
    { href: '/operator/exports', icon: DownloadSimple, label: 'Export' },
    { href: '/operator/settings', icon: Buildings, label: 'Impostazioni' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
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

      <aside className={`fixed left-0 top-0 h-full w-64 border-r z-40 transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          <Link href="/operator/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Buildings weight="fill" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>CRM</h1>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{user?.role === 'ADMIN' ? 'Admin' : 'Operatore'}</p>
            </div>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
            
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? (isDark ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-200')
                      : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')
                  }`}
                >
                  <Icon className="w-5 h-5" weight={isActive ? 'fill' : 'regular'} />
                  {item.label}
                </Link>

                {/* 🔥 REPORT WASH - Appare SOLO se toggle è attivo */}
                {item.label === 'Report' && showWashReport && (
                  <Link
                    href="/operator/reports/wash"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ml-4 mt-1 ${
                      router.pathname === '/operator/reports/wash'
                        ? (isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200')
                        : (isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50')
                    }`}
                  >
                    <TelevisionSimple className="w-5 h-5" weight={router.pathname === '/operator/reports/wash' ? 'fill' : 'regular'} />
                    Report WASH
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-auto" />
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-indigo-100'}`}>
              <Users className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-indigo-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={originalUser?.role === 'SUPER_ADMIN' && isImpersonating === true ? handleExitImpersonate : handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-600 hover:text-rose-600 hover:bg-rose-50'}`}
          >
            <SignOut className="w-4 h-4" />
            {isImpersonating === true ? 'Torna al SuperAdmin' : 'Disconnetti'}
          </button>
        </div>
      </aside>

      <main className="ml-64">
        <header className={`h-16 backdrop-blur-sm border-b flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-300 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/80 border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            {shops.length > 0 ? <ShopSwitcher /> : null}
            <button className={`relative p-2 transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
          </div>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}