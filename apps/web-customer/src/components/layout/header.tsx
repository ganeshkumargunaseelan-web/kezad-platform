'use client';

import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data as { count: number }),
    refetchInterval: 30_000,
  });

  return (
    <header className="kezad-page-header">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <a href="/notifications" className="relative p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
          <Bell className="h-5 w-5 text-gray-400" />
          {!!data?.count && data.count > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
              {data.count > 9 ? '9+' : data.count}
            </span>
          )}
        </a>
      </div>
    </header>
  );
}
