
import { useEffect } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  User, 
  Bell, 
  Shield,
  Palette
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import OperatorLayout from '@/components/layout/OperatorLayout';

export default function Settings() {
  const { user } = useAuthStore();
  const { isDark, setTheme } = useThemeStore();
  const [notifications, setNotifications] = useState(true);

  return (
    <OperatorLayout title="Impostazioni">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Impostazioni</h1>
          <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>Gestisci le preferenze del tuo account</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border rounded-2xl p-6 transition-colors duration-300 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-600/20 text-violet-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tema</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Scegli il tema dell'interfaccia</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => setTheme(true)}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                isDark 
                  ? 'border-violet-500 bg-violet-600/10 text-violet-400' 
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Moon className="w-5 h-5" weight={isDark ? "fill" : "regular"} />
              Scuro
            </button>
            <button
              onClick={() => setTheme(false)}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                !isDark 
                  ? 'border-amber-500 bg-amber-50 text-amber-600' 
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Sun className="w-5 h-5" weight={!isDark ? "fill" : "regular"} />
              Chiaro
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`border rounded-2xl p-6 transition-colors duration-300 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifiche</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Ricevi notifiche su nuove pratiche</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-14 h-8 rounded-full transition-colors relative ${notifications ? (isDark ? 'bg-violet-600' : 'bg-indigo-600') : (isDark ? 'bg-slate-700' : 'bg-gray-300')}`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${notifications ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`border rounded-2xl p-6 transition-colors duration-300 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-600/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Profilo</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Le tue informazioni</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className={`flex justify-between py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Nome</span>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{user?.firstName} {user?.lastName}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Email</span>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{user?.email}</span>
            </div>
            <div className={`flex justify-between py-2 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Ruolo</span>
              <span className={isDark ? 'text-white' : 'text-gray-900'}>{user?.role === 'ADMIN' ? 'Amministratore' : 'Operatore'}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`border rounded-2xl p-6 transition-colors duration-300 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-rose-600/20 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sicurezza</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Cambia password</p>
            </div>
          </div>
        </motion.div>
      </div>
    </OperatorLayout>
  );
}
