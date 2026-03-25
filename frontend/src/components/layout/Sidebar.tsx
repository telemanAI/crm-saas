import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  House, 
  Users, 
  FileText, 
  Plus, 
  Gear, 
  SignOut,
  List,
  ChartBar
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios'; // Assicurati che il path sia corretto
import Link from 'next/link';
import { useRouter } from 'next/router';

const menuItems = [
  { icon: House, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Clienti', href: '/customers' },
  { icon: FileText, label: 'Pratiche', href: '/practices' },
  { icon: Plus, label: 'Nuova Pratica', href: '/practices/new', highlight: true },
  { icon: ChartBar, label: 'Report', href: '/reports' },
  { icon: Gear, label: 'Impostazioni', href: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showWashReport, setShowWashReport] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  // Controlla config tenant
  useEffect(() => {
    if (user?.tenantId) {
      api.get(`/tenants/${user.tenantId}/config`).then(res => {
        setShowWashReport(res.data.enableWashStep);
		 console.log('[DEBUG] Config ricevuta:', res.data); // <-- AGGIUNGI QUESTO
        // Prova entrambi i formati (camelCase o snake_case)
        const isEnabled = res.data.enableWashStep || res.data.enable_wash_step;
        setShowWashReport(!!isEnabled);
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
              <span className="font-bold text-xl text-white">CRM</span>
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
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${isActive ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 
                    item.highlight ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' :
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
          );
        })}

        {/* Report WASH condizionale */}
        {showWashReport && (
          <Link href="/operator/reports/wash">
            <motion.div
              whileHover={{ x: 4 }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <ChartBar className="w-6 h-6 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-medium whitespace-nowrap"
                  >
                    Report WASH
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </Link>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-800">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
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
                <p className="text-sm font-medium text-slate-200 truncate">{user?.email}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-rose-600/20 hover:text-rose-400 rounded-lg transition-colors"
            title="Logout"
          >
            <SignOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}