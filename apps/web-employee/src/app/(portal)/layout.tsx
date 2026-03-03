'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Sidebar } from '@/components/layout/sidebar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!mounted || !isAuthenticated()) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'linear-gradient(160deg, #EEF2F7 0%, #E8EDF5 50%, #EEF2F7 100%)' }}>
        {children}
      </main>
    </div>
  );
}
