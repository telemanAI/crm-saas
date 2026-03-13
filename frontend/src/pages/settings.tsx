import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  FloppyDisk
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout/Layout';

const tabs = [
  { id: 'profile', label: 'Profilo', icon: User },
  { id: 'notifications', label: 'Notifiche', icon: Bell },
  { id: 'security', label: 'Sicurezza', icon: Shield },
  { id: 'appearance', label: 'Aspetto', icon: Palette },
];

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [FloppyDiskd, setFloppyDiskd] = useState(false);

  const handleFloppyDisk = () => {
    setFloppyDiskd(true);
    setTimeout(() => setFloppyDiskd(false), 2000);
  };

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Impostazioni</h1>
          <p className="text-slate-400">Gestisci le preferenze del tuo account</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Tabs */}
          <div className="w-64 flex-shrink-0">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
            >
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Profilo</h2>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user?.email}</p>
                      <p className="text-slate-400 text-sm capitalize">{user?.role?.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                      <input
                        type="text"
                        placeholder="Il tuo nome"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Notifiche</h2>
                  <div className="space-y-4">
                    {[
                      'Notifiche email per nuove pratiche',
                      'Notifiche per pratiche in scadenza',
                      'Report settimanale',
                      'Notifiche push',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                        <span className="text-slate-300">{item}</span>
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Sicurezza</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Password Attuale</label>
                      <input
                        type="password"
                        placeholder="ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nuova Password</label>
                      <input
                        type="password"
                        placeholder="ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Conferma Password</label>
                      <input
                        type="password"
                        placeholder="ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-white">Aspetto</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Tema</label>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => document.documentElement.classList.add('dark')}
                          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                            !document.documentElement.classList.contains('light')
                              ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400'
                              : 'border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <div className="font-bold">Scuro</div>
                          <div className="text-sm opacity-70">Attivo</div>
                        </button>
                        <button 
                          onClick={() => document.documentElement.classList.remove('dark')}
                          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                            document.documentElement.classList.contains('light')
                              ? 'border-amber-500 bg-amber-600/10 text-amber-400'
                              : 'border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <div className="font-bold">Chiaro</div>
                          <div className="text-sm opacity-70">Disponibile</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FloppyDisk Button */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={handleFloppyDisk}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    FloppyDiskd
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <FloppyDisk className="w-5 h-5" />
                  {FloppyDiskd ? 'Salvato!' : 'Salva Modifiche'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}