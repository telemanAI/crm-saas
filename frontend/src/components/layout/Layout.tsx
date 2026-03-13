import { Sidebar } from './Sidebar';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          {title && (
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-white mb-8"
            >
              {title}
            </motion.h1>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
