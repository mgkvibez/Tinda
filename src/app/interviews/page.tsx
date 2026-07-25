"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type Interview = {
  id: string;
  matchId: string;
  candidateId: string;
  employerId: string;
  jobId: string;
  scheduledAt: string;
  duration: number;
  type: string;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  status: string;
  job: any;
  candidate: any;
};

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    matchId: "",
    candidateId: "",
    employerId: "",
    jobId: "",
    scheduledAt: "",
    duration: 30,
    type: "video",
    location: "",
    meetingUrl: "",
    notes: "",
  });

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/interviews", {
        headers: { Cookie: `__session=${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInterviews(data.interviews || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({
          ...scheduleForm,
          scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
          location: scheduleForm.location || null,
          meetingUrl: scheduleForm.meetingUrl || null,
          notes: scheduleForm.notes || null,
        }),
      });
      if (res.ok) {
        setShowSchedule(false);
        fetchInterviews();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async (interviewId: string, status: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      await fetch("/api/interviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ interviewId, status }),
      });
      fetchInterviews();
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === "video") return "🎥";
    if (type === "phone") return "📞"
    return "🏢"
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
  }

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Interviews</h1>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
        </div>
      </div>

      {/* Upcoming Interviews */}
      {interviews.filter((i) => i.status === "scheduled" && new Date(i.scheduledAt) > new Date()).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase text-textSecondary">Upcoming</h2>
          {interviews
            .filter((i) => i.status === "scheduled" && new Date(i.scheduledAt) > new Date())
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map((interview) => (
              <motion.div
                key={interview.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getTypeIcon(interview.type)}</span>
                      <div>
                        <p className="font-semibold">{interview.candidate?.fullName || "Candidate"}</p>
                        <p className="text-sm text-textSecondary">{interview.job?.title}</p>
                      </div>
                    </div>
                    <p className="text-sm text-textSecondary mb-1">
                      📅 {formatDateTime(interview.scheduledAt)} ({interview.duration} min)
                    </p>
                    {interview.meetingUrl && (
                      <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        Join meeting →
                      </a>
                    )}
                    {interview.location && (
                      <p className="text-sm text-textSecondary">📍 {interview.location}</p>
                    )}
                    {interview.notes && (
                      <p className="text-sm text-textSecondary mt-2 italic">"{interview.notes}"</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(interview.id, "completed")}>
                      Complete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleStatusUpdate(interview.id, "cancelled")}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      )}

      {/* Past Interviews */}
      {interviews.filter((i) => i.status !== "scheduled" || new Date(i.scheduledAt) <= new Date()).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase text-textSecondary">History</h2>
          {interviews
            .filter((i) => i.status !== "scheduled" || new Date(i.scheduledAt) <= new Date())
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            .map((interview) => (
              <div key={interview.id} className="rounded-2xl border border-border bg-card p-4 opacity-75">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getTypeIcon(interview.type)}</span>
                  <div>
                    <p className="font-medium text-sm">{interview.candidate?.fullName || "Candidate"}</p>
                    <p className="text-xs text-textSecondary">{interview.job?.title}</p>
                  </div>
                  <span className="ml-auto text-xs rounded-full bg-muted px-2 py-0.5 capitalize">{interview.status}</span>
                </div>
                <p className="text-xs text-textSecondary">{formatDateTime(interview.scheduledAt)}</p>
              </div>
            ))}
        </div>
      )}

      {interviews.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-textSecondary">No interviews scheduled yet.</p>
          <p className="text-textSecondary text-sm mt-1">Match with candidates first, then schedule interviews!</p>
        </div>
      )}
    </div>
  );
}
