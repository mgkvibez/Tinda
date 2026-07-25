"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { StreakBadge } from "@/components/streak-badge";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function Header() {
  const { user, logout } = useAuth();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setStreak(doc.data()?.streak || 0);
      }
    });
    return () => unsub();
  }, [user]);

  return (
    <header className="w-full border-b border-border bg-card/40 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className={cn("flex items-center gap-3")}>
          <Image src="/tinda-logo.svg" alt="Tinda" width={40} height={40} priority />
          <span className="text-lg font-semibold tracking-tight text-foreground hidden sm:inline">Tinda</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              {streak > 0 && (
                <div className="hidden sm:block">
                  <StreakBadge streak={streak} />
                </div>
              )}
              <NotificationBell />
              <DarkModeToggle />
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings">Settings</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Log Out
              </Button>
            </>
          ) : (
            <>
              <DarkModeToggle />
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
