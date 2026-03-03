'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { Card, CardContent, Button, Badge, formatDate } from '@kezad/ui';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  channel: string;
  subject: string | null;
  body: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  notificationType?: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  INFO:    { icon: <Info className="h-5 w-5" />,         color: 'text-blue-500 bg-blue-50' },
  SUCCESS: { icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-green-500 bg-green-50' },
  WARNING: { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-amber-500 bg-amber-50' },
  ERROR:   { icon: <XCircle className="h-5 w-5" />,      color: 'text-red-500 bg-red-50' },
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  EMAIL:  <Mail className="h-3.5 w-3.5" />,
  IN_APP: <Bell className="h-3.5 w-3.5" />,
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            loading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
          </Button>
        )}
      </div>

      <div className="p-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !notifications.length ? (
          <div className="text-center py-20">
            <BellOff className="h-14 w-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">You're all caught up! New notifications will appear here.</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {notifications.map((n) => {
                  const type = n.notificationType ?? 'INFO';
                  const meta = TYPE_META[type] ?? TYPE_META.INFO;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-4 px-6 py-5 transition-colors ${!n.isRead ? 'bg-blue-50/40' : 'bg-white hover:bg-gray-50'}`}
                    >
                      {/* Type Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                        {meta.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {n.subject && (
                              <p className={`text-sm font-semibold ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                {n.subject}
                              </p>
                            )}
                            <p className={`text-sm ${!n.isRead ? 'text-gray-700' : 'text-gray-500'} mt-0.5`}>{n.body}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400">{formatDate(n.createdAt)}</span>
                            {!n.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            {CHANNEL_ICON[n.channel] ?? <Bell className="h-3.5 w-3.5" />}
                            <span>{n.channel}</span>
                          </div>
                          {!n.isRead && (
                            <button
                              onClick={() => markReadMutation.mutate(n.id)}
                              className="text-xs text-primary hover:text-primary/80 font-medium"
                            >
                              Mark as read
                            </button>
                          )}
                          {n.isRead && n.readAt && (
                            <span className="text-xs text-gray-400">Read {formatDate(n.readAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
