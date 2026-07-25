"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase/client";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setIsAnonymous(userDoc.data()?.isAnonymous || false);
      }
    };
    fetchSettings();
  }, [user]);

  const handleSaveAnonymous = async (value: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { isAnonymous: value }, { merge: true });
      setIsAnonymous(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <h2 className="font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Dark Mode</p>
            <p className="text-xs text-textSecondary">Switch between light and dark themes</p>
          </div>
          <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </Button>
        </div>
      </motion.div>

      {/* Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <h2 className="font-semibold">Privacy</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Anonymous Browsing</p>
            <p className="text-xs text-textSecondary mb-3">
              When enabled, your name and profile picture are hidden from employers until you match. Your skills and experience remain visible.
            </p>
            <RadioGroup
              value={isAnonymous ? 'anonymous' : 'visible'}
              onValueChange={(value) => handleSaveAnonymous(value === 'anonymous')}
            >
              <div className="flex items-center gap-2 mb-2">
                <RadioGroupItem value="visible" id="visible" disabled={saving} />
                <Label htmlFor="visible" className="cursor-pointer text-sm">Visible — Employers can see my full profile</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="anonymous" id="anonymous" disabled={saving} />
                <Label htmlFor="anonymous" className="cursor-pointer text-sm">Anonymous — Hide my identity until we match</Label>
              </div>
            </RadioGroup>
            {saved && <p className="text-xs text-green-500 mt-2">Saved!</p>}
          </div>
        </div>
      </motion.div>

      {/* Account */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <h2 className="font-semibold">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-textSecondary">Email</span>
            <span>{user?.email || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-textSecondary">Name</span>
            <span>{user?.displayName || 'N/A'}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()} className="w-full">
          Log Out
        </Button>
      </motion.div>

      <div className="text-center">
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
