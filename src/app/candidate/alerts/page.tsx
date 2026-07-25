"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type JobAlert = {
  id: string;
  keywords: string[];
  location: string | null;
  salaryMin: number | null;
  jobTypes: string[];
  skills: string[];
  active: boolean;
};

export default function JobAlertsPage() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    keywords: "",
    location: "",
    salaryMin: "",
    jobTypes: "",
    skills: "",
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/job-alerts", {
        headers: { Cookie: `__session=${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/job-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({
          keywords: form.keywords ? form.keywords.split(",").map((s) => s.trim()).filter(Boolean) : [],
          location: form.location || null,
          salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
          jobTypes: form.jobTypes ? form.jobTypes.split(",").map((s) => s.trim()).filter(Boolean) : [],
          skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ keywords: "", location: "", salaryMin: "", jobTypes: "", skills: "" });
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      await fetch(`/api/job-alerts?id=${alertId}`, {
        method: "DELETE",
        headers: { Cookie: `__session=${token}` },
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Alerts</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
        {showForm ? "Cancel" : "+ Create Alert"}
      </Button>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <Label>Keywords (comma separated)</Label>
            <Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="developer, react, remote" className="mt-1" />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lagos, Nigeria" className="mt-1" />
          </div>
          <div>
            <Label>Minimum Salary</Label>
            <Input type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} placeholder="50000" className="mt-1" />
          </div>
          <div>
            <Label>Job Types (comma separated)</Label>
            <Input value={form.jobTypes} onChange={(e) => setForm({ ...form, jobTypes: e.target.value })} placeholder="Full-time, Contract" className="mt-1" />
          </div>
          <div>
            <Label>Skills (comma separated)</Label>
            <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, TypeScript, Python" className="mt-1" />
          </div>
          <Button onClick={handleCreate} className="w-full">Create Alert</Button>
        </motion.div>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {alert.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {alert.keywords.map((kw) => (
                        <span key={kw} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{kw}</span>
                      ))}
                    </div>
                  )}
                  {alert.location && <p className="text-sm text-textSecondary">📍 {alert.location}</p>}
                  {alert.salaryMin && <p className="text-sm text-textSecondary">💰 From ${alert.salaryMin.toLocaleString()}</p>}
                  {alert.jobTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {alert.jobTypes.map((t) => (
                        <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-textSecondary">{t}</span>
                      ))}
                    </div>
                  )}
                  {alert.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {alert.skills.map((s) => (
                        <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-textSecondary">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(alert.id)}>🗑</Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {alerts.length === 0 && !showForm && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🔔</p>
          <p className="text-textSecondary">No alerts set up yet.</p>
          <p className="text-textSecondary text-sm mt-1">Create an alert to get notified when matching jobs are posted!</p>
        </div>
      )}
    </div>
  );
}
