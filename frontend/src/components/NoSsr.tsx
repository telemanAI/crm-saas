import { useEffect, useState, ReactNode } from 'react';

export default function NoSsr({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ minHeight: '100vh' }} />;
  }

  return <>{children}</>;
}