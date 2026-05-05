import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import api from '../lib/axios';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const SSE_RETRY_MS = 5000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch lista notifiche
  const fetchList = useCallback(async () => {
    try {
      const res = await api.get<NotifItem[]>('/notifications?limit=20');
      setItems(res.data);
    } catch {
      // ignore
    }
  }, []);

  // Fetch conteggio
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/notifications/count');
      setCount(res.data.count);
    } catch {
      // ignore
    }
  }, []);

  // Mark as read
  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setCount(0);
    } catch {
      // ignore
    }
  };

  // SSE connection
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const token = localStorage.getItem('token') || '';
      const es = new EventSource(
        `${api.defaults.baseURL}/notifications/stream?token=${encodeURIComponent(token)}`,
      );

      es.onopen = () => {
        setConnected(true);
      };

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'ping') return;

          // Nuova notifica arrivata
          setItems((prev) => [data, ...prev].slice(0, 50));
          setCount((c) => c + 1);

          // Toast popup (opzionale, disattivabile)
          if (typeof window !== 'undefined' && (window as any).__notificationsEnabled !== false) {
            showToast(data.title || 'Nuova notifica', data.message);
          }
        } catch {
          // ignore parse error
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        retryTimer = setTimeout(connect, SSE_RETRY_MS);
      };

      eventSourceRef.current = es;
    };

    connect();
    fetchCount();

    return () => {
      clearTimeout(retryTimer);
      eventSourceRef.current?.close();
    };
  }, [fetchCount]);

  // Chiudi dropdown al click fuori
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      fetchList().finally(() => setLoading(false));
    }
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ora';
    if (mins < 60) return `${mins}m fa`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h fa`;
    return `${Math.floor(hrs / 24)}g fa`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-full hover:bg-slate-100 transition"
        aria-label="Notifiche"
      >
        <svg
          className="w-5 h-5 text-slate-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
        {connected && count === 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-400 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-700">
              Notifiche
              {count > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({count} non lette)
                </span>
              )}
            </h3>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 transition"
              >
                Segna tutte come lette
              </button>
            )}
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {loading && (
              <div className="text-center py-4 text-xs text-slate-400">
                Caricamento…
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="text-center py-6 text-sm text-slate-400">
                Nessuna notifica
              </div>
            )}
            {!loading &&
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead(n.id);
                    setOpen(false);
                  }}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition hover:bg-slate-50 ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {n.linkUrl ? (
                    <Link href={n.linkUrl} className="block">
                      <NotifRow n={n} timeAgo={timeAgo} />
                    </Link>
                  ) : (
                    <NotifRow n={n} timeAgo={timeAgo} />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifRow({
  n,
  timeAgo,
}: {
  n: NotifItem;
  timeAgo: (d: string) => string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
          !n.isRead ? 'bg-blue-500' : 'bg-slate-200'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {n.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
          {n.message}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          {timeAgo(n.createdAt)}
        </p>
      </div>
    </div>
  );
}

// Toast semplice
function showToast(title: string, message: string) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className =
    'bg-white border border-slate-200 rounded-lg shadow-lg p-3 mb-2 max-w-xs animate-slide-in';
  toast.innerHTML = `<p class="text-sm font-semibold text-slate-700">${escapeHtml(title)}</p><p class="text-xs text-slate-500 mt-0.5">${escapeHtml(message)}</p>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

function escapeHtml(s: string) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
