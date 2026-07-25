"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import Link from "next/link";

type Analytics = {
  totalJobs: number;
  activeJobs: number;
  totalMatches: number;
  totalSwipes: number;
  likesGiven: number;
  likeRate: number;
  matchRate: number;
  stageBreakdown: Record<string, number>;
  jobPerformance: { jobId: string; title: string; matches: number; stageBreakdown: Record<string, number> }[];
  totalInterviews: number;
  upcomingInterviews: number;
};

export default function EmployerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await getIdToken(user);
        const res = await fetch("/api/employer-analytics", {
          headers: { Cookie: `__session=${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data.analytics);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;
  if (!analytics) return <p className="text-center py-8 text-textSecondary">No data yet</p>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Jobs", value: analytics.activeJobs, icon: "📋" },
          { label: "Total Matches", value: analytics.totalMatches, icon: "🤝" },
          { label: "Like Rate", value: `${analytics.likeRate}%`, icon: "👍" },
          { label: "Match Rate", value: `${analytics.matchRate}%`, icon: "📊" },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="text-2xl mb-1">{metric.icon}</div>
            <p className="text-3xl font-bold">{metric.value}</p>
            <p className="text-textSecondary text-sm">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Pipeline Breakdown */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-4">Pipeline Breakdown</h2>
        <div className="space-y-2">
          {Object.entries(analytics.stageBreakdown).map(([stage, count]) => {
            const max = Math.max(...Object.values(analytics.stageBreakdown), 1)
            const width = (count / max) * 100
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-sm w-24 capitalize">{stage}</span>
                <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full flex items-center justify-end px-2" style={{ width: `${width}%` }}>
                    <span className="text-xs text-primary-foreground font-medium">{count}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Job Performance */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-4">Job Performance</h2>
        <div className="space-y-3">
          {analytics.jobPerformance.map((job) => (
            <div key={job.jobId} className="rounded-xl bg-muted p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{job.title}</span>
                <span className="text-sm text-textSecondary">{job.matches} matches</span>
              </div>
              <div className="flex gap-1">
                {Object.entries(job.stageBreakdown).map(([stage, count]) => (
                  <span key={stage} className="rounded-full bg-background px-2 py-0.5 text-xs text-textSecondary">
                    {stage}: {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {analytics.jobPerformance.length === 0 && (
            <p className="text-textSecondary text-sm text-center py-4">No job performance data yet</p>
          )}
        </div>
      </motion.div>

      {/* Interview Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-3xl font-bold">{analytics.totalInterviews}</p>
          <p className="text-textSecondary text-sm">Total Interviews</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-3xl font-bold">{analytics.upcomingInterviews}</p>
          <p className="text-textSecondary text-sm">Upcoming</p>
        </div>
      </div>
    </div>
  );
}
