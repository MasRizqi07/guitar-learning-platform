'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  LifeBuoy,
  ShieldAlert,
  Award,
  BookOpen,
  Info,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NotificationType } from '@prisma/client';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadNotifications() {
      try {
        const url = filterUnread ? '/api/notifications?unreadOnly=true' : '/api/notifications';
        const res = await fetch(url);
        const data = await res.json();
        if (!ignore && data.data) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [filterUnread]);

  const handleMarkOne = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAll = async () => {
    try {
      setMarkingAll(true);
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all read', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'SUPPORT':
        return <LifeBuoy className="w-4 h-4 text-amber-400" />;
      case 'SECURITY':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'ACHIEVEMENT':
        return <Award className="w-4 h-4 text-yellow-400" />;
      case 'LEARNING':
        return <BookOpen className="w-4 h-4 text-blue-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Notifications &amp; Activity
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-slate-950">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Real-time updates on your support tickets, practice streaks, and platform security alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAll}
            isLoading={markingAll}
            className="border-[#2A303A] text-slate-300 hover:text-white gap-1.5 self-start sm:self-auto text-xs"
          >
            <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A303A] pb-3 text-xs font-mono">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <button
          onClick={() => {
            setLoading(true);
            setFilterUnread(false);
          }}
          className={`px-3 py-1 rounded-lg transition-colors ${
            !filterUnread
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Activity
        </button>
        <button
          onClick={() => {
            setLoading(true);
            setFilterUnread(true);
          }}
          className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
            filterUnread
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Unread Only</span>
          {unreadCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 font-mono text-sm">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center bg-[#171A20] border-[#2A303A] space-y-3">
          <Bell className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No notifications</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterUnread
              ? 'You have caught up with all updates. No unread items.'
              : 'Updates from support tickets, achievements, and security alerts will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => {
            const isUnread = !notif.readAt;
            return (
              <Card
                key={notif.id}
                className={`p-4 transition-all duration-150 border ${
                  isUnread
                    ? 'bg-[#1C2029] border-amber-500/40 shadow-sm'
                    : 'bg-[#171A20] border-[#2A303A] hover:bg-[#1A1E26]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0E1014] border border-[#2A303A] flex items-center justify-center shrink-0 mt-0.5">
                      {getTypeIcon(notif.type)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-100">{notif.title}</span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {notif.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(notif.createdAt).toLocaleString()}
                        </span>

                        {notif.actionUrl && (
                          <Link
                            href={notif.actionUrl}
                            onClick={() => isUnread && handleMarkOne(notif.id)}
                            className="text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => handleMarkOne(notif.id)}
                      className="text-[11px] font-mono text-slate-500 hover:text-amber-400 shrink-0 self-start"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
