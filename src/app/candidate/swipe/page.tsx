"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { ShareButtons } from "@/components/share-buttons";
import Link from "next/link";

type JobCard = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  salaryDisplay: string;
  skillsRequired: string[];
  workArrangement: string | null;
  employmentType: string | null;
  companyName: string | null;
  companyLogo: string | null;
  recruiterName: string | null;
  jobId: string;
  matchScore: number;
  matchReasons: string[];
};

export default function CandidateSwipePage() {
  const [cards, setCards] = useState<JobCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [streak, setStreak] = useState(0);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (cards[current]) {
      checkSaved();
      checkAssessment();
    }
  }, [current, cards]);

  const fetchJobs = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Please log in to view jobs.");
        setLoading(false);
        return;
      }
      const token = await getIdToken(user);
      const res = await fetch("/api/swipes", {
        headers: { Cookie: `__session=${token}` },
      });
      if (!res.ok) throw new Error("Failed to load jobs");
      const data = await res.json();
      setCards(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkSaved = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !cards[current]) return;
      const token = await getIdToken(user);
      const res = await fetch(`/api/saved-jobs?jobId=${cards[current].jobId}`, {
        headers: { Cookie: `__session=${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.saved || false);
      }
    } catch {
      setIsSaved(false);
    }
  };

  const checkAssessment = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !cards[current]) return;
      const token = await getIdToken(user);
      const res = await fetch(`/api/assessments?jobId=${cards[current].jobId}`, {
        headers: { Cookie: `__session=${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHasAssessment(!!data.assessment);
      }
    } catch {
      setHasAssessment(false);
    }
  };

  const handleSwipe = async (isLike: boolean) => {
    if (!cards[current]) return;
    setSwipeDirection(isLike ? "right" : "left");

    const user = auth.currentUser;
    if (!user) return;
    const token = await getIdToken(user);

    try {
      const res = await fetch("/api/swipes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({
          targetType: "job",
          targetId: cards[current].jobId,
          targetJobId: cards[current].jobId,
          isLike,
          isSuperLike: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.streak !== undefined) setStreak(data.streak);
        if (data.match) {
          alert("🎉 It's a match! Check your messages!");
        }
      }
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      setCoverLetter(null);
      setCurrent((prev) => prev + 1);
    }, 300);
  };

  const handleSave = async () => {
    if (!cards[current]) return;
    const user = auth.currentUser;
    if (!user) return;
    const token = await getIdToken(user);
    try {
      await fetch("/api/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ jobId: cards[current].jobId, action: isSaved ? "unsave" : "save" }),
      });
      setIsSaved(!isSaved);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!cards[current]) return;
    setGeneratingCover(true);
    setCoverLetter(null);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ jobId: cards[current].jobId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCoverLetter(data.coverLetter);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCover(false);
    }
  };

  if (loading) return <p className="text-center py-8">Loading jobs...</p>;
  if (error) return <p className="text-center py-8 text-destructive">{error}</p>;
  if (current >= cards.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-5xl">🎉</p>
        <p className="text-textSecondary">You've seen all available jobs!</p>
        <p className="text-textSecondary text-sm">Check back later for new openings</p>
        {streak > 0 && (
          <div className="inline-block rounded-full bg-orange-500/10 px-4 py-1.5 text-sm text-orange-600 dark:text-orange-400">
            🔥 {streak} day streak — keep it going!
          </div>
        )}
      </div>
    );
  }

  const card = cards[current];
  const matchScoreColor = card.matchScore >= 80 ? "text-green-500" : card.matchScore >= 60 ? "text-orange-500" : "text-textSecondary";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      {streak > 0 && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-600 dark:text-orange-400">
          🔥 {streak} day streak
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={
            swipeDirection === "right"
              ? { opacity: 0, x: 300, rotate: 20 }
              : swipeDirection === "left"
                ? { opacity: 0, x: -300, rotate: -20 }
                : { opacity: 1, y: 0, scale: 1 }
          }
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-xl"
        >
          <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
            {/* Top Row: Match Score + Save + Share */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {card.matchScore >= 60 && (
                  <div className={`inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium ${matchScoreColor}`}>
                    ⭐ {card.matchScore}%
                  </div>
                )}
                {hasAssessment && (
                  <Link href={`/assessment/${card.jobId}`}>
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground hover:underline">
                      📝 Take Assessment
                    </span>
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSave} className="rounded-full p-2 hover:bg-muted transition-colors" title={isSaved ? "Saved" : "Save for later"}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                </button>
                <ShareButtons jobTitle={card.title} companyName={card.companyName || ""} jobId={card.jobId} />
              </div>
            </div>

            {card.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {card.matchReasons.map((reason, i) => (
                  <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs text-textSecondary">
                    {reason}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
                {card.companyLogo ? (
                  <img src={card.companyLogo} alt={card.companyName || ""} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold">{card.companyName?.[0] || "?"}</span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{card.title}</h2>
                <p className="text-textSecondary text-sm">{card.companyName}</p>
              </div>
            </div>

            {/* Salary Display */}
            {card.salaryDisplay && (
              <div className="rounded-2xl bg-muted px-4 py-2 mb-4 inline-block">
                <span className="font-semibold text-sm">💰 {card.salaryDisplay}</span>
              </div>
            )}

            <p className="text-sm text-textSecondary leading-relaxed mb-4 line-clamp-2">{card.description}</p>

            {card.skillsRequired.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase text-textSecondary mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {card.skillsRequired.map((skill) => (
                    <span key={skill} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-sm text-textSecondary mb-4">
              {card.location && <span>📍 {card.location}</span>}
              {card.workArrangement && <span>🖥 {card.workArrangement}</span>}
              {card.employmentType && <span>⏱ {card.employmentType}</span>}
            </div>

            {/* Cover Letter Generator */}
            {coverLetter ? (
              <div className="rounded-2xl border border-border bg-background p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase text-textSecondary">AI Cover Letter</p>
                  <button onClick={() => setCoverLetter(null)} className="text-xs text-textSecondary hover:underline">Close</button>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-sans text-foreground max-h-40 overflow-y-auto">{coverLetter}</pre>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleGenerateCoverLetter} disabled={generatingCover} className="mb-4 w-full">
                {generatingCover ? "Generating..." : "✨ Generate AI Cover Letter"}
              </Button>
            )}

            <div className="flex gap-4 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => handleSwipe(false)}>
                Pass
              </Button>
              <Button className="flex-1" onClick={() => handleSwipe(true)}>
                Apply
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
