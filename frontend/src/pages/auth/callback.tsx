import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircleNotch } from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Callback dopo OAuth/social login.
 * Il backend ora UNIFICA Google e Facebook:
 *  - Utente già esistente   → redirect qui con ?token&user&shops (+applica invito se presente).
 *  - Utente nuovo             → redirect a /auth/complete-registration (non qui) con ?pending&email...
 *
 * Quindi questa pagina gestisce SOLO il caso logged_in. Se per qualche ragione
 * legacy arriva un pending, facciamo fallback a complete-registration.
 */
export default function AuthCallback() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!router.isReady) return;
    const { token, user, shops, error, pending, email, firstName, lastName, invite } =
      router.query;

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(String(error))}`);
      return;
    }

    // Caso legacy: pending finisce qui invece che su complete-registration.
    if (pending && !user) {
      const qs = new URLSearchParams({
        pending: String(pending),
        email: String(email || ''),
        firstName: String(firstName || ''),
        lastName: String(lastName || ''),
        ...(invite ? { invite: String(invite) } : {}),
      }).toString();
      router.replace(`/auth/complete-registration?${qs}`);
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
      if (parsedUser.role === 'SUPER_ADMIN') {
        router.replace('/admin/dashboard');
        return;
      }
      if (parsedShops.length > 1) {
        router.replace('/select-shop');
        return;
      }
      router.replace('/operator/dashboard');
    } catch {
      router.replace('/login?error=callback_parse_error');
    }
  }, [router, router.isReady, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950" data-testid="auth-callback-loading">
      <div className="text-center">
        <CircleNotch className="w-10 h-10 text-indigo-400 mx-auto animate-spin" />
        <p className="text-slate-400 mt-4 text-sm">Completamento accesso...</p>
      </div>
    </div>
  );
}
