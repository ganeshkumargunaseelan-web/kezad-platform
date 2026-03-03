'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, BarChart3, Receipt, CreditCard,
  Settings, HelpCircle, Zap, LogOut, Bell, Building2,
} from 'lucide-react';
import { cn } from '@kezad/ui';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard',         label: 'Dashboard',          icon: LayoutDashboard },
  { href: '/contracts',         label: 'Contracts',          icon: FileText },
  { href: '/consumption',       label: 'Consumption',        icon: BarChart3 },
  { href: '/billing',           label: 'Billing & Invoices', icon: Receipt },
  { href: '/payments',          label: 'Payments',           icon: CreditCard },
  { href: '/service-requests',  label: 'Service Requests',   icon: HelpCircle },
  { href: '/notifications',     label: 'Notifications',      icon: Bell },
  { href: '/profile',           label: 'Company Profile',    icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearAuth();
    router.push('/login');
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-white border-r border-gray-100"
      style={{ boxShadow: '2px 0 16px rgba(0,0,0,0.04)' }}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #33BFBF, #006B6B)' }}>
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">KEZAD Portal</p>
            <p className="text-xs text-gray-400">Customer</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
              )}
              style={isActive ? { background: 'linear-gradient(135deg, #006B6B, #004D4D)' } : {}}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-gray-50">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #33BFBF, #006B6B)' }}>
            <span className="text-xs font-bold text-white">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
