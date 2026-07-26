"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type Referral = {
  id: string;
  jobTitle: string;
  referredEmail: string;
  referredName: string;
  status: string;
  reward: string;
  createdAt: string;
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ jobId: "", jobTitle: "", referredEmail: "", referredName: "" });

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/referrals", { headers: { Cookie: `__session=${token}` } });
      if (res.ok) {
        const data = await res.json();
        setReferrals(data.referrals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.referredEmail.trim() || !form.referredName.trim()) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ jobId: "", jobTitle: "", referredEmail: "", referredName: "" });
        fetchReferrals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;

  const totalReferrals = referrals.length;
  const hiredCount = referrals.filter((r) => r.status === "hired").length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Referrals</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalReferrals}</p>
          <p className="text-xs text-textSecondary">Total Referrals</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{hiredCount}</p>
          <p className="text-xs text-textSecondary">Hired</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">🏅</p>
          <p className="text-xs text-textSecondary">Badge Earned</p>
        </div>
      </div>

      <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"} className="w-full">
        {showForm ? "Cancel" : "+ Refer a Friend"}
      </Button>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div>
            <Label>Friend's Name</Label>
            <Input value={form.referredName} onChange={(e) => setForm({ ...form, referredName: e.target.value })} placeholder="Jane Doe" className="mt-1" />
          </div>
          <div>
            <Label>Friend's Email</Label>
            <Input type="email" value={form.referredEmail} onChange={(e) => setForm({ ...form, referredEmail: e.target.value })} placeholder="jane@example.com" className="mt-1" />
          </div>
          <div>
            <Label>Job Title (optional)</Label>
            <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Software Engineer" className="mt-1" />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={!form.referredEmail.trim() || !form.referredName.trim()}>Send Referral</Button>
        </motion.div>
      )}

      {referrals.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🤝</p>
          <p className="text-textSecondary">No referrals yet.</p>
          <p className="text-textSecondary text-sm mt-1">Refer friends to jobs and earn rewards when they get hired!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {referrals.map((ref, i) => (
              <motion.div key={ref.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{ref.referredName}</p>
                  <p className="text-xs text-textSecondary">{ref.referredEmail}</p>
                  {ref.jobTitle && <p className="text-xs text-textSecondary mt-0.5">For: {ref.jobTitle}</p>}
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${ref.status === "hired" ? "bg-green-500/10 text-green-500" : ref.status === "signed_up" ? "bg-primary/10 text-primary" : "bg-muted text-textSecondary"}`}>
                    {ref.status.replace("_", " ")}
                  </span>
                  <p className="text-xs text-textSecondary mt-1">{ref.reward}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
