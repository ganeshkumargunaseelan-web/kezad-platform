'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAuthHydrated } from '@/lib/auth-store';
import { Sidebar } from '@/components/layout/sidebar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (hydrated && !isAuthenticated()) router.replace('/login');
  }, [hydrated, isAuthenticated, router]);

  // Wait for Zustand to rehydrate from localStorage before rendering anything
  if (!hydrated) return null;
  if (!isAuthenticated()) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'linear-gradient(160deg, #EEF2F7 0%, #E8EDF5 50%, #EEF2F7 100%)' }}>
        {children}
      </main>
    </div>
  );
}
