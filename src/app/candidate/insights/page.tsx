"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import Link from "next/link";

type Insights = {
  totalSwipes: number;
  totalLikes: number;
  totalPasses: number;
  totalMatches: number;
  likeRate: number;
  matchRate: number;
  topSkills: { skill: string; count: number }[];
  topLocations: { location: string; count: number }[];
  topJobTypes: { type: string; count: number }[];
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await getIdToken(user);
        const res = await fetch("/api/insights", {
          headers: { Cookie: `__session=${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;
  if (!insights) return <p className="text-center py-8 text-textSecondary">No data yet</p>;

  const maxSkillCount = Math.max(...insights.topSkills.map((s) => s.count), 1);
  const maxLocationCount = Math.max(...insights.topLocations.map((l) => l.count), 1);
  const maxTypeCount = Math.max(...insights.topJobTypes.map((t) => t.count), 1);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Insights</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Swipes", value: insights.totalSwipes, icon: "👆" },
          { label: "Likes", value: insights.totalLikes, icon: "👍" },
          { label: "Matches", value: insights.totalMatches, icon: "🤝" },
          { label: "Match Rate", value: `${insights.matchRate}%`, icon: "📊" },
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

      {/* Like vs Pass */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-3">Swipe Behavior</h2>
        <div className="flex h-8 rounded-full overflow-hidden">
          <div
            className="bg-green-500 flex items-center justify-center"
            style={{ width: `${insights.totalSwipes > 0 ? (insights.totalLikes / insights.totalSwipes) * 100 : 50}%` }}
          >
            <span className="text-xs text-white font-medium">{insights.likeRate}% Like</span>
          </div>
          <div
            className="bg-muted flex items-center justify-center"
            style={{ width: `${insights.totalSwipes > 0 ? (insights.totalPasses / insights.totalSwipes) * 100 : 50}%` }}
          >
            <span className="text-xs text-textSecondary font-medium">{100 - insights.likeRate}% Pass</span>
          </div>
        </div>
      </motion.div>

      {/* Top Skills */}
      {insights.topSkills.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">Top Skills You Like</h2>
          <div className="space-y-2">
            {insights.topSkills.map((s) => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate">{s.skill}</span>
                <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(s.count / maxSkillCount) * 100}%` }} />
                </div>
                <span className="text-xs text-textSecondary w-8 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Locations */}
      {insights.topLocations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">Top Locations</h2>
          <div className="space-y-2">
            {insights.topLocations.map((l) => (
              <div key={l.location} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate">{l.location}</span>
                <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${(l.count / maxLocationCount) * 100}%` }} />
                </div>
                <span className="text-xs text-textSecondary w-8 text-right">{l.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Job Types */}
      {insights.topJobTypes.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-4">Preferred Job Types</h2>
          <div className="space-y-2">
            {insights.topJobTypes.map((t) => (
              <div key={t.type} className="flex items-center gap-3">
                <span className="text-sm w-32 capitalize">{t.type}</span>
                <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(t.count / maxTypeCount) * 100}%` }} />
                </div>
                <span className="text-xs text-textSecondary w-8 text-right">{t.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {insights.topSkills.length === 0 && insights.topLocations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-textSecondary text-sm">Start swiping to see your insights here!</p>
        </div>
      )}
    </div>
  );
}
