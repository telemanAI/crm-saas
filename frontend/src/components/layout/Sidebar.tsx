import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  House, 
  Users, 
  FileText, 
  Gear, 
  SignOut,
  List,
  ChartBar,
  TelevisionSimple,
  Upload,
  Download,
  UserList
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import { useRouter } from 'next/router';

const menuItems = [
  { icon: House, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Clienti', href: '/customers' },
  { icon: FileText, label: 'Pratiche', href: '/practices' },
  { icon: ChartBar, label: 'Report', href: '/reports' },
  // Report WASH viene inserito dinamicamente dopo Report
  { icon: Upload, label: 'Importazioni', href: '/operator/imports' },
  { icon: Download, label: 'Esportazioni', href: '/operator/exports' },
  { icon: UserList, label: 'Operatori', href: '/operator/users' },
  { icon: Gear, label: 'Impostazioni', href: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showWashReport, setShowWashReport] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  // Carica config WASH
  useEffect(() => {
    if (user?.tenantId) {
      api.get(`/api/tenants/${user.tenantId}/config`)
        .then(res => {
          setShowWashReport(res.data.enableWashStep === true);
        })
        .catch(err => {
          console.error('Errore caricamento config:', err);
        });
    }
  }, [user?.tenantId]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-white">CRM</span>
                <span className="text-xs text-slate-500">
                  {user?.role === 'SUPER_ADMIN' ? 'Admin' : user?.role || 'Admin'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <List className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <div key={item.href}>
              {/* Item normale */}
              <Link href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer
                    ${isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 
                      'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <Icon weight={isActive ? 'fill' : 'regular'} className="w-6 h-6 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>

              {/* 🔴 REPORT WASH - Link indipendente subito sotto Report */}
              {item.label === 'Report' && showWashReport && (
                <Link href="/operator/reports/wash">
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 mt-1 cursor-pointer
                      ${router.pathname === '/operator/reports/wash' 
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-amber-400'}`}
                  >
                    <TelevisionSimple className="w-6 h-6 flex-shrink-0" weight={router.pathname === '/operator/reports/wash' ? 'fill' : 'regular'} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="font-medium whitespace-nowrap flex items-center gap-2"
                        >
                          Report WASH
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {/* User Info */}
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-slate-200 truncate">
                  {user?.firstName || user?.email}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Torna al SuperAdmin - Solo se user è SUPER_ADMIN */}
        {user?.role === 'SUPER_ADMIN' && (
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Link href="/admin/dashboard">
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition-colors cursor-pointer text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Torna al SuperAdmin</span>
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
          title="Logout"
        >
          <SignOut className="w-5 h-5" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-medium"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}