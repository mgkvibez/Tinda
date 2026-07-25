"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { VerifiedBadge } from "@/components/verified-badge";

type CandidateCard = {
  candidateId: string;
  fullName: string;
  currentRole: string | null;
  yearsOfExperience: number | null;
  skills: string[];
  score: number;
  reasons: string[];
  profilePicture?: string | null;
  videoIntroUrl?: string | null;
  profile?: any;
};

export default function EmployerSwipePage() {
  const [cards, setCards] = useState<CandidateCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Please log in to view candidates.");
        setLoading(false);
        return;
      }
      const token = await getIdToken(user);
      const res = await fetch("/api/swipes", {
        headers: { Cookie: `__session=${token}` },
      });
      if (!res.ok) throw new Error("Failed to load candidates");
      const data = await res.json();
      setCards(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load candidates.");
    } finally {
      setLoading(false);
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
          targetType: "candidate",
          targetId: cards[current].candidateId,
          isLike,
          isSuperLike: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.match) {
          alert("🎉 It's a match! Check your messages to start chatting.");
        }
      }
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      setShowVideo(false);
      setCurrent((prev) => prev + 1);
    }, 300);
  };

  if (loading) return <p className="text-center py-8">Loading candidates...</p>;
  if (error) return <p className="text-center py-8 text-destructive">{error}</p>;
  if (current >= cards.length) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4">🎉</p>
        <p className="text-textSecondary">No more candidates to review right now.</p>
        <p className="text-textSecondary text-sm">Check back later for new talent</p>
      </div>
    );
  }

  const card = cards[current];
  const matchScoreColor = card.score >= 80 ? "text-green-500" : card.score >= 60 ? "text-orange-500" : "text-textSecondary";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={card.candidateId}
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
            {/* Match Score Badge */}
            {card.score >= 60 && (
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium ${matchScoreColor}`}>
                  ⭐ {card.score}% match
                </div>
                {card.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {card.reasons.map((reason, i) => (
                      <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs text-textSecondary">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
                {card.profilePicture ? (
                  <img src={card.profilePicture} alt={card.fullName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold">{card.fullName?.[0] || "?"}</span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{card.fullName}</h2>
                <p className="text-textSecondary text-sm">{card.currentRole || "Open to opportunities"}</p>
                {card.yearsOfExperience != null && (
                  <p className="text-textSecondary text-sm">{card.yearsOfExperience} years of experience</p>
                )}
              </div>
            </div>

            {/* Video Intro */}
            {card.videoIntroUrl && (
              <div className="mb-4">
                {showVideo ? (
                  <video
                    src={card.videoIntroUrl}
                    controls
                    className="w-full rounded-2xl"
                    preload="metadata"
                  />
                ) : (
                  <button
                    onClick={() => setShowVideo(true)}
                    className="w-full rounded-2xl border border-border bg-background p-4 flex items-center gap-3 hover:border-primary transition-colors"
                  >
                    <span className="text-3xl">🎬</span>
                    <div className="text-left">
                      <p className="text-sm font-medium">Watch video intro</p>
                      <p className="text-xs text-textSecondary">{card.fullName} recorded a 30-sec pitch</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {card.skills && card.skills.length > 0 && (
              <div className="rounded-2xl border border-border bg-background p-4 mb-4">
                <p className="text-sm uppercase text-textSecondary mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {card.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {card.profile?.education && card.profile.education.length > 0 && (
              <div className="rounded-2xl border border-border bg-background p-4 mb-4">
                <p className="text-sm uppercase text-textSecondary mb-2">Education</p>
                <ul className="text-sm space-y-1">
                  {card.profile.education.map((edu: string, i: number) => (
                    <li key={i}>{edu}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => handleSwipe(false)}>
                Pass
              </Button>
              <Button className="flex-1" onClick={() => handleSwipe(true)}>
                Like
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
