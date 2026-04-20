import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircleNotch } from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Riceve il redirect dopo Google/Facebook callback con ?token & ?user & ?shops,
 * popola lo store e indirizza all'area corretta.
 */
export default function AuthCallback() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!router.isReady) return;
    const { token, user, shops, error } = router.query;
    if (error) {
      router.replace(`/login?error=${encodeURIComponent(String(error))}`);
      return;
    }
    if (!token || !user) {
      router.replace('/login');
      return;
    }
    try {
      const parsedUser = JSON.parse(decodeURIComponent(String(user)));
      const parsedShops = shops ? JSON.parse(decodeURIComponent(String(shops))) : [];
      setAuth(parsedUser, String(token), parsedShops);
      if (parsedUser.role === 'SUPER_ADMIN') return router.replace('/admin/dashboard');
      if (parsedShops.length > 1) return router.replace('/select-shop');
      if (parsedShops.length === 1) return router.replace('/operator/dashboard');
      return router.replace('/operator/dashboard');
    } catch {
      router.replace('/login?error=callback_parse_error');
    }
  }, [router, router.isReady, setAuth]);

  return (
    <div className=\"min-h-screen flex items-center justify-center bg-slate-950\" data-testid=\"auth-callback-loading\">
      <div className=\"text-center\">
        <CircleNotch className=\"w-10 h-10 text-indigo-400 mx-auto animate-spin\" />
        <p className=\"text-slate-400 mt-4 text-sm\">Completamento accesso...</p>
      </div>
    </div>
  );
}
