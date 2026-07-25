"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type SavedJob = {
  id: string;
  jobId: string;
  job: any;
  savedAt: string;
};

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/saved-jobs", {
        headers: { Cookie: `__session=${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedJobs(data.savedJobs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      await fetch("/api/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ jobId, action: "unsave" }),
      });
      setSavedJobs((prev) => prev.filter((s) => s.jobId !== jobId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      {savedJobs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📌</p>
          <p className="text-textSecondary">No saved jobs yet.</p>
          <p className="text-textSecondary text-sm mt-1">Tap the bookmark icon on a job card to save it for later!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {savedJobs.map((saved, i) => (
              <motion.div
                key={saved.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{saved.job?.title}</h3>
                    <p className="text-sm text-textSecondary">{saved.job?.companyName}</p>
                    {saved.job?.location && (
                      <p className="text-sm text-textSecondary mt-1">📍 {saved.job.location}</p>
                    )}
                    {saved.job?.salaryRangeMin && (
                      <p className="text-sm text-primary mt-1">
                        💰 {saved.job.salaryRangeMin.toLocaleString()}
                        {saved.job.salaryRangeMax ? ` - ${saved.job.salaryRangeMax.toLocaleString()}` : "+"}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(saved.job?.skillsRequired || []).slice(0, 5).map((skill: string) => (
                        <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs text-textSecondary">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleUnsave(saved.jobId)}>
                    🗑
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
