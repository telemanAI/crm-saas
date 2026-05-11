import { useEffect, useState } from 'react';

/**
 * Restituisce true se la viewport è < `breakpoint` px.
 * Default: 768px (Tailwind `md`).
 *
 * SSR-safe: durante il primo render lato server ritorna `false`; subito dopo
 * l'hydration aggiorna il valore reale, evitando flicker.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}
