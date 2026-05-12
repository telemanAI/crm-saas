import { AuthProvider } from '@/hooks/useAuth';
import NoSsr from '@/components/NoSsr';
import '@/styles/globals.css';
import { useThemeStore } from '@/stores/themeStore';
import { useEffect } from 'react';
import Head from 'next/head';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useThemeStore();
  
  useEffect(() => {
    // ✅ AGGIUNGI/RIMUOVI la classe dark dall'elemento HTML
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    
    // Aggiorna anche il body per coerenza
    document.body.style.backgroundColor = isDark ? '#020617' : '#f9fafb';
  }, [isDark]);

  return <>{children}</>;
}

function MyApp({ Component, pageProps }: any) {
  return (
    <NoSsr>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </Head>
      <AuthProvider>
        <ThemeProvider>
          <Component {...pageProps} />
        </ThemeProvider>
      </AuthProvider>
    </NoSsr>
  );
}

export default MyApp;