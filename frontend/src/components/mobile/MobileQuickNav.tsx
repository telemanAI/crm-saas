import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartLine,
  Trophy,
  ChartBar,
  ShoppingCart,
  ListChecks,
} from 'phosphor-react';

/**
 * MobileQuickNav — Joystick fluttuante per navigazione rapida da mobile.
 *
 * Comportamento:
 *  - FAB circolare 56px in basso a destra (posizione personalizzabile, salvata in localStorage)
 *  - Tap → apre il radial menu (4 direzioni)
 *  - Drag dal centro → la direzione del drag evidenzia l'azione; al rilascio
 *    naviga verso quella sezione. Effetto "joystick arcade".
 *  - Tap su una voce → naviga.
 *  - Long-press (700ms) → menu testuale con tutte le scorciatoie.
 *  - Tap esterno o tap centrale → chiude.
 *
 * Renderizzato SOLO se la viewport è mobile (gestito da chi lo include).
 */

type Direction = 'up' | 'right' | 'down' | 'left';

interface NavItem {
  dir: Direction;
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; weight?: any; style?: React.CSSProperties }>;
  color: string;
}

const ITEMS: NavItem[] = [
  { dir: 'up',    href: '/operator/competitions',   label: 'Gare',     Icon: Trophy,       color: '#f59e0b' },
  { dir: 'right', href: '/operator/dashboard',      label: 'Home',     Icon: ChartLine,    color: '#6366f1' },
  { dir: 'down',  href: '/operator/reports/pieces', label: 'Report',   Icon: ChartBar,     color: '#10b981' },
  { dir: 'left',  href: '/operator/practices',      label: 'Pratiche', Icon: ShoppingCart, color: '#ec4899' },
];

const POS_KEY = 'mobile-quicknav-pos';
const DEAD_ZONE = 14; // px dal centro: sotto questa soglia non è considerato drag direzionale

interface Pos { x: number; y: number; }

export default function MobileQuickNav() {
  const router = useRouter();
  const fabRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [longMenuOpen, setLongMenuOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null); // FAB posizione (px da bottom-right)
  const [drag, setDrag] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [activeDir, setActiveDir] = useState<Direction | null>(null);
  const dragging = useRef(false);
  const draggingFab = useRef(false);
  const fabStart = useRef<{ x: number; y: number; posX: number; posY: number }>({
    x: 0, y: 0, posX: 0, posY: 0,
  });
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapStart = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });

  // Carica posizione salvata + osserva la presenza di un footer mobile (es. wizard)
  // per auto-sollevarsi e non sovrapporsi.
  const [hasMobileFooter, setHasMobileFooter] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) setPos(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const check = () => {
      setHasMobileFooter(!!document.querySelector('[data-mobile-footer="true"]'));
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  const savePos = (p: Pos) => {
    setPos(p);
    try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  };

  // Calcola direzione dal delta drag
  const directionFromDelta = (dx: number, dy: number): Direction | null => {
    const dist = Math.hypot(dx, dy);
    if (dist < DEAD_ZONE) return null;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180..180
    if (angle >= -45 && angle < 45) return 'right';
    if (angle >= 45 && angle < 135) return 'down';
    if (angle >= -135 && angle < -45) return 'up';
    return 'left';
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    tapStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    dragging.current = false;
    draggingFab.current = false;
    setDrag({ dx: 0, dy: 0 });
    setActiveDir(null);

    longTimer.current = setTimeout(() => {
      if (!dragging.current) {
        setLongMenuOpen(true);
      }
    }, 700);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - tapStart.current.x;
    const dy = e.clientY - tapStart.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return;

    if (longTimer.current) {
      clearTimeout(longTimer.current);
      longTimer.current = null;
    }

    // Decide: riposizionamento del FAB (drag CHIUSO) vs joystick (drag in modalità open)
    if (!dragging.current) {
      dragging.current = true;
      if (open) {
        // joystick mode — già aperto, drag = direzione
      } else {
        // FAB reposition mode
        draggingFab.current = true;
        fabStart.current = {
          x: e.clientX,
          y: e.clientY,
          posX: pos?.x ?? 20,
          posY: pos?.y ?? 20,
        };
      }
    }

    if (draggingFab.current) {
      const nx = Math.max(8, Math.min(window.innerWidth - 64, fabStart.current.posX - dx));
      const ny = Math.max(8, Math.min(window.innerHeight - 64, fabStart.current.posY - dy));
      setPos({ x: nx, y: ny });
    } else if (open) {
      // joystick mode
      const limit = 38;
      const clampedDx = Math.max(-limit, Math.min(limit, dx));
      const clampedDy = Math.max(-limit, Math.min(limit, dy));
      setDrag({ dx: clampedDx, dy: clampedDy });
      setActiveDir(directionFromDelta(clampedDx, clampedDy));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (longTimer.current) {
      clearTimeout(longTimer.current);
      longTimer.current = null;
    }
    const elapsed = Date.now() - tapStart.current.t;
    const moved = dragging.current;

    if (draggingFab.current) {
      // Persisti la nuova posizione
      if (pos) savePos(pos);
      draggingFab.current = false;
      dragging.current = false;
      return;
    }

    if (open) {
      if (activeDir) {
        // joystick release → naviga
        const item = ITEMS.find((i) => i.dir === activeDir);
        if (item) router.push(item.href);
        setOpen(false);
        setDrag({ dx: 0, dy: 0 });
        setActiveDir(null);
        return;
      }
      // tap sul FAB centrale a menu aperto → chiudi
      if (!moved && elapsed < 400) setOpen(false);
      setDrag({ dx: 0, dy: 0 });
      setActiveDir(null);
      return;
    }

    // FAB chiuso, click semplice → apri
    if (!moved && elapsed < 400) setOpen(true);
    dragging.current = false;
  };

  // ESC chiude
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setLongMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Posizione effettiva (fallback bottom-right + offset footer se presente)
  const defaultBottom = hasMobileFooter ? 92 : 20;
  const style: React.CSSProperties = {
    right: pos ? `${pos.x}px` : '20px',
    bottom: pos
      ? `${Math.max(pos.y, hasMobileFooter ? 84 : 8)}px`
      : `calc(${defaultBottom}px + env(safe-area-inset-bottom, 0px))`,
  };

  return (
    <div
      ref={fabRef}
      className="fixed z-[60] select-none touch-none"
      style={style}
      data-testid="mobile-quicknav"
    >
      {/* Backdrop quando radial aperto */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm"
            onClick={() => { setOpen(false); setDrag({ dx: 0, dy: 0 }); setActiveDir(null); }}
          />
        )}
      </AnimatePresence>

      {/* Petali radiali */}
      <AnimatePresence>
        {open && ITEMS.map((it) => {
          const offset = 78;
          const dx = it.dir === 'left' ? -offset : it.dir === 'right' ? offset : 0;
          const dy = it.dir === 'up' ? -offset : it.dir === 'down' ? offset : 0;
          const active = activeDir === it.dir;
          const Icon = it.Icon;
          return (
            <motion.button
              key={it.dir}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{ opacity: 1, x: dx, y: dy, scale: active ? 1.25 : 1 }}
              exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 340, damping: 24 }}
              className="absolute bottom-1 right-1 w-14 h-14 rounded-full flex flex-col items-center justify-center text-white shadow-2xl border-2"
              style={{
                backgroundColor: active ? it.color : 'rgba(15,23,42,0.92)',
                borderColor: it.color,
                boxShadow: active ? `0 0 24px ${it.color}` : '0 8px 24px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => { e.stopPropagation(); router.push(it.href); setOpen(false); }}
              data-testid={`quicknav-item-${it.dir}`}
            >
              <Icon className="w-5 h-5" weight={active ? 'fill' : 'duotone'} />
              <span className="text-[9px] font-bold mt-0.5">{it.label}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* FAB centrale (è anche la "leva" del joystick) */}
      <motion.div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        animate={{
          x: open ? drag.dx : 0,
          y: open ? drag.dy : 0,
          scale: open ? 0.92 : 1,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl cursor-pointer"
        style={{
          background: open
            ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
            : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          boxShadow: '0 12px 32px rgba(99,102,241,0.55)',
        }}
        data-testid="quicknav-fab"
      >
        <ListChecks className="w-6 h-6" weight="bold" />
        {/* Indicatore direzione attiva (anello pulsante) */}
        {open && activeDir && (
          <motion.span
            layoutId="quicknav-ring"
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: ITEMS.find((i) => i.dir === activeDir)?.color || '#fff' }}
          />
        )}
      </motion.div>

      {/* Long-press: menu testuale completo */}
      <AnimatePresence>
        {longMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[59] bg-black/60"
              onClick={() => setLongMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 right-0 z-[61] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 min-w-[200px]"
            >
              {ITEMS.map((it) => {
                const Icon = it.Icon;
                return (
                  <button
                    key={it.href}
                    onClick={() => { router.push(it.href); setLongMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800 transition"
                  >
                    <Icon className="w-5 h-5" weight="duotone" style={{ color: it.color }} />
                    {it.label}
                  </button>
                );
              })}
              <div className="border-t border-slate-700 mt-1 pt-1">
                <button
                  onClick={() => { router.push('/operator/customers'); setLongMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  Clienti
                </button>
                <button
                  onClick={() => { router.push('/operator/settings'); setLongMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  Impostazioni
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
