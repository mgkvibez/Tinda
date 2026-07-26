"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

export default function AdminModerationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"stats" | "reports" | "flaggedUsers" | "flaggedJobs" | "suspicious">("stats");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user, tab]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      const res = await fetch(`/api/admin-moderation?tab=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.status === 403) {
        setError("Admin access required");
      } else if (res.ok) {
        setData(json);
      } else {
        setError(json.message || "Failed to load");
      }
    } catch {
      setError("Failed to load moderation data");
    } finally {
      setLoading(false);
    }
  };

  const adminAction = async (action: string, payload: any) => {
    const token = await getIdToken(firebaseAuth.currentUser!);
    await fetch("/api/admin-moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }),
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <p className="text-sm text-textSecondary">Only admin users can access this page.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "stats", label: "Overview" },
    { id: "reports", label: "Reports" },
    { id: "flaggedUsers", label: "Flagged Users" },
    { id: "flaggedJobs", label: "Flagged Jobs" },
    { id: "suspicious", label: "Suspicious Activity" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Admin Moderation Panel</h1>
          <p className="text-textSecondary mt-1">Trust & Safety dashboard for platform moderation.</p>
        </motion.div>

        {/* Tab selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {t.label}
              {t.id === "reports" && data?.reports?.length > 0 && (
                <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5">{data.reports.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === "stats" && data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 text-center">
              <div className="text-3xl font-bold text-red-600">{data.pendingReports}</div>
              <div className="text-sm text-textSecondary">Pending Reports</div>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600">{data.flaggedUsers}</div>
              <div className="text-sm text-textSecondary">Flagged Users</div>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600">{data.flaggedJobs}</div>
              <div className="text-sm text-textSecondary">Flagged Jobs</div>
            </Card>
            <Card className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{data.suspiciousActivities}</div>
              <div className="text-sm text-textSecondary">Suspicious Activities</div>
            </Card>
          </div>
        )}

        {/* Reports */}
        {tab === "reports" && data?.reports?.length === 0 && (
          <Card className="p-8 text-center text-textSecondary">No reports pending.</Card>
        )}
        {tab === "reports" && data?.reports?.map((report: any) => (
          <Card key={report.id} className="p-4 mb-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{report.reason}</div>
                <div className="text-sm text-textSecondary">
                  {report.targetType}: {report.targetInfo?.email || report.targetInfo?.title || report.targetId}
                </div>
                {report.details && <div className="text-sm mt-1">{report.details}</div>}
                <div className="text-xs text-textSecondary mt-1">
                  By: {report.reporterInfo?.email || "Unknown"} • {new Date(report.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => adminAction("resolve-report", { reportId: report.id, resolution: "dismissed" })}>
                  Dismiss
                </Button>
                <Button size="sm" variant="destructive" onClick={() => adminAction("resolve-report", { reportId: report.id, resolution: "action_taken" })}>
                  Take Action
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Flagged Users */}
        {tab === "flaggedUsers" && data?.users?.length === 0 && (
          <Card className="p-8 text-center text-textSecondary">No flagged users.</Card>
        )}
        {tab === "flaggedUsers" && data?.users?.map((u: any) => (
          <Card key={u.id} className="p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{u.email || u.displayName || "Unknown"}</div>
                <div className="text-sm text-textSecondary">{u.flagReason || "Flagged"}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => adminAction("unban-user", { userId: u.id })}>
                  Unflag
                </Button>
                <Button size="sm" variant="destructive" onClick={() => adminAction("ban-user", { userId: u.id })}>
                  Ban
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Flagged Jobs */}
        {tab === "flaggedJobs" && data?.jobs?.length === 0 && (
          <Card className="p-8 text-center text-textSecondary">No flagged jobs.</Card>
        )}
        {tab === "flaggedJobs" && data?.jobs?.map((j: any) => (
          <Card key={j.id} className="p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{j.title}</div>
                <div className="text-sm text-textSecondary">{j.companyName} • {j.flagReason || "Flagged"}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => adminAction("restore-job", { jobId: j.id })}>
                  Restore
                </Button>
                <Button size="sm" variant="destructive" onClick={() => adminAction("remove-job", { jobId: j.id })}>
                  Remove
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Suspicious Activity */}
        {tab === "suspicious" && data?.activities?.length === 0 && (
          <Card className="p-8 text-center text-textSecondary">No suspicious activities detected.</Card>
        )}
        {tab === "suspicious" && data?.activities?.map((a: any) => (
          <Card key={a.id} className="p-4 mb-3 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{a.flag}</div>
                <div className="text-xs text-textSecondary">
                  User: {a.userId} • {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                a.severity === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
              }`}>
                {a.severity}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
