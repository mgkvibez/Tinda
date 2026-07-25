"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await getIdToken(user);
        const res = await fetch("/api/notifications", {
          headers: { Cookie: `__session=${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_match": return "🎉";
      case "new_message": return "💬";
      case "profile_view": return "👀";
      case "badge_earned": return "🏆";
      default: return "🔔";
    }
  };

  const getNotificationLink = (notif: Notification) => {
    if (notif.type === "new_match" && notif.data?.conversationId) {
      return `/chat/${notif.data.conversationId}`;
    }
    if (notif.type === "new_message" && notif.data?.conversationId) {
      return `/chat/${notif.data.conversationId}`;
    }
    return null;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center py-8 text-textSecondary">Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🔕</p>
          <p className="text-textSecondary">No notifications yet. They'll appear here when you get matches, messages, or badges.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const link = getNotificationLink(notif);
            const content = (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex gap-3 rounded-2xl border p-4 transition-colors ${
                  notif.read ? "border-border bg-transparent" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="text-2xl flex-shrink-0">{getNotificationIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-sm">{notif.title}</h3>
                    <span className="text-xs text-textSecondary flex-shrink-0">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-textSecondary mt-0.5">{notif.body}</p>
                </div>
                {!notif.read && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </motion.div>
            );

            return link ? (
              <Link key={notif.id} href={link}>{content}</Link>
            ) : (
              <div key={notif.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
