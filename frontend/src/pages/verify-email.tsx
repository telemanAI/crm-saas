import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, SpinnerGap } from 'phosphor-react';
import api from '@/lib/axios';

export default function VerifyEmail() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const response = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(response.data.message);
        setTimeout(() => router.push('/login'), 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Errore durante la verifica');
        
        // Se il token è scaduto, mostra il pulsante per reinviare
        if (error.response?.data?.message?.includes('scaduto')) {
          setCanResend(true);
        }
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendEmail = async () => {
    // Qui devi implementare la chiamata al tuo endpoint per reinviare l'email
    // Esempio: await api.post('/auth/resend-verification', { email: ... });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center border border-slate-700"
      >
        {status === 'loading' && (
          <>
            <SpinnerGap className="w-16 h-16 text-indigo-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifica in corso...</h1>
            <p className="text-slate-400">Attendere prego</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" weight="fill" />
            <h1 className="text-2xl font-bold text-white mb-2">Email Verificata!</h1>
            <p className="text-slate-400 mb-4">{message}</p>
            <p className="text-slate-500 text-sm">Reindirizzamento al login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" weight="fill" />
            <h1 className="text-2xl font-bold text-white mb-2">Errore</h1>
            <p className="text-slate-400 mb-4">{message}</p>
            
            {canResend && (
              <button
                onClick={handleResendEmail}
                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg transition-colors mb-3 block w-full"
              >
                Invia nuova email di verifica
              </button>
            )}
            
            <button
              onClick={() => router.push('/login')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors block w-full"
            >
              Vai al Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}