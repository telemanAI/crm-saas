import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircleNotch } from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import { invitesApi } from '@/lib/api';

/**
 * Callback dopo OAuth/social login.
 * FIX: gestisce recovery invite token da storage se il browser cambia su mobile
 * (es. da browser in-app Gmail a Chrome/Safari dopo OAuth).
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

      // FIX: se c'è un invite token (da query params o da storage recovery),
      // tentiamo di applicarlo prima del redirect. Se fallisce, procediamo
      // comunque con i dati originali.
      const inviteToken =
        (invite ? String(invite) : null) ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('pendingInviteToken') ||
            sessionStorage.getItem('pendingInviteToken')
          : null);

      if (inviteToken) {
        (async () => {
          try {
            const res: any = await invitesApi.acceptAuthenticated(inviteToken);
            if (res?.access_token && res?.user) {
              setAuth(res.user, res.access_token, res.shops || []);
              cleanupInviteStorage();
              if (res.user.role === 'SUPER_ADMIN') {
                router.replace('/admin/dashboard');
              } else if ((res.shops || []).length > 1) {
                router.replace('/select-shop');
              } else {
                router.replace('/operator/dashboard');
              }
              return;
            }
          } catch (e: any) {
            console.error('[callback] accept invite failed:', e.message);
            // Non bloccare: procedi con i dati originali
          }
          // Fallback: usa dati originali dal callback
          setAuth(parsedUser, String(token), parsedShops);
          cleanupInviteStorage();
          if (parsedUser.role === 'SUPER_ADMIN') {
            router.replace('/admin/dashboard');
          } else if (parsedShops.length > 1) {
            router.replace('/select-shop');
          } else {
            router.replace('/operator/dashboard');
          }
        })();
        return;
      }

      // Flusso normale senza invite
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

function cleanupInviteStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pendingInviteToken');
  localStorage.removeItem('pendingInviteTimestamp');
  sessionStorage.removeItem('pendingInviteToken');
}