import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title = 'CRM' }: LayoutProps) {
  const router = useRouter();

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/customers', label: 'Clienti', icon: '👥' },
    { href: '/admin/fields', label: 'Configura Campi', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">CRM SaaS</h1>
          <p className="text-sm text-gray-500">Gestione Clienti</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={'flex items-center p-3 rounded-lg transition-colors ' + (router.pathname === item.href ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50')}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t text-sm text-gray-500">
          Tenant: <span className="font-medium">Demo</span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-gray-600">admin@demo.com</span>
            <button className="text-sm text-red-600 hover:text-red-800">Logout</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Container per toast notifiche */}
      <div
        id="toast-container"
        className="fixed top-4 right-4 z-[100] flex flex-col items-end pointer-events-none"
      />
    </div>
  );
}