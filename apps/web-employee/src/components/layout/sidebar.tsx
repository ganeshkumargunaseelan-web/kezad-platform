'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, BarChart3, Receipt, GitBranch,
  Settings, Shield, Database, TrendingUp, Zap, LogOut, Activity,
  Bell, ClipboardList, Gauge,
} from 'lucide-react';
import { cn } from '@kezad/ui';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface NavSection {
  title: string;
  items: { href: string; label: string; icon: React.ElementType; roles?: string[] }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { href: '/dashboard',         label: 'KPI Dashboard',    icon: LayoutDashboard },
      { href: '/customers',         label: 'Customers',        icon: Users },
      { href: '/contracts',         label: 'Contracts',        icon: FileText },
      { href: '/consumption',       label: 'Consumption',      icon: Activity },
      { href: '/meters',            label: 'Meters',           icon: Gauge },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/billing',           label: 'Billing Runs',     icon: Receipt },
      { href: '/tariffs',           label: 'Tariffs',          icon: TrendingUp },
    ],
  },
  {
    title: 'Workflow',
    items: [
      { href: '/workflows',         label: 'Workflow Inbox',   icon: GitBranch },
      { href: '/service-requests',  label: 'Service Requests', icon: ClipboardList },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { href: '/reports',           label: 'Reports',          icon: BarChart3 },
      { href: '/notifications',     label: 'Notifications',    icon: Bell },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/users',             label: 'User Management',  icon: Shield,    roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/audit-log',         label: 'Audit Log',        icon: Database,  roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/settings',          label: 'Settings',         icon: Settings,  roles: ['SUPER_ADMIN'] },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth, hasRole } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearAuth();
    router.push('/login');
  }

  return (
    <aside className="kezad-sidebar w-64 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-teal-900/50"
            style={{ background: 'linear-gradient(135deg, #00AFAF, #006B6B)' }}>
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white tracking-wide">KEZAD Ops</p>
            <p className="text-xs" style={{ color: '#33CFCF' }}>Employee Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-5 overflow-y-auto scrollbar-none">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || hasRole(item.roles),
          );
          if (!visibleItems.length) return null;

          return (
            <div key={section.title}>
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(100,140,180,0.7)' }}>
                {section.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'kezad-nav-active'
                          : 'text-slate-400 hover:bg-white/6 hover:text-slate-200',
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
            style={{ background: 'linear-gradient(135deg, #00AFAF, #006B6B)' }}>
            <span className="text-xs font-bold text-white">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(100,140,180,0.7)' }}>{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
