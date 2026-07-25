"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type PipelineItem = {
  id: string;
  candidateId: string;
  employerId: string;
  jobId: string;
  stage: string;
  notes: string | null;
  candidateProfile: any;
  job: any;
};

const STAGES = [
  { key: "matched", label: "Matched", color: "bg-blue-500/10 border-blue-500/30" },
  { key: "screening", label: "Screening", color: "bg-yellow-500/10 border-yellow-500/30" },
  { key: "interviewing", label: "Interviewing", color: "bg-purple-500/10 border-purple-500/30" },
  { key: "offer", label: "Offer", color: "bg-green-500/10 border-green-500/30" },
  { key: "hired", label: "Hired", color: "bg-emerald-500/10 border-emerald-500/30" },
  { key: "rejected", label: "Rejected", color: "bg-red-500/10 border-red-500/30" },
];

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/pipeline", {
        headers: { Cookie: `__session=${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPipeline(data.pipeline || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (matchId: string, stage: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      await fetch("/api/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ matchId, stage }),
      });
      // Update locally
      setPipeline((prev) =>
        prev.map((item) => (item.id === matchId ? { ...item, stage } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrop = (stage: string) => {
    if (draggedId) {
      handleStageChange(draggedId, stage);
      setDraggedId(null);
    }
  };

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Application Pipeline</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      {pipeline.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-textSecondary">No candidates in your pipeline yet.</p>
          <p className="text-textSecondary text-sm mt-1">Swipe right on candidates to add them here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {STAGES.map((stage) => {
            const items = pipeline.filter((item) => (item.stage || "matched") === stage.key);
            return (
              <div
                key={stage.key}
                className={`rounded-2xl border p-3 min-h-[300px] ${stage.color}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{stage.label}</h3>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs text-textSecondary">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      draggable
                      onDragStart={() => setDraggedId(item.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className="rounded-xl bg-card border border-border p-3 cursor-move hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {item.candidateProfile?.profilePicture ? (
                            <img src={item.candidateProfile.profilePicture} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium">
                              {item.candidateProfile?.fullName?.[0] || "?"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {item.candidateProfile?.fullName || "Unknown"}
                          </p>
                          <p className="text-xs text-textSecondary truncate">{item.job?.title}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(item.candidateProfile?.skills || []).slice(0, 3).map((skill: string) => (
                          <span key={skill} className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-textSecondary">
                            {skill}
                          </span>
                        ))}
                      </div>
                      <Link href={`/chat/${item.id}`} className="text-xs text-primary hover:underline">
                        View →
                      </Link>
                    </motion.div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-textSecondary text-center py-4">Drop here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
