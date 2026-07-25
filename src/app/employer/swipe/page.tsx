"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";

type CandidateCard = {
  id: string;
  fullName: string;
  profilePicture?: string | null;
  currentRole?: string | null;
  yearsOfExperience?: number | null;
  skills?: string[];
  education?: string[];
  availability: string;
};

export default function EmployerSwipePage() {
  const [cards, setCards] = useState<CandidateCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `__session=${token}`,
          },
        });
        if (!res.ok) {
          throw new Error("Failed to load candidates");
        }
        const data = await res.json();
        setCards(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load candidates. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  const handleSwipe = async (isLike: boolean) => {
    if (!cards[current]) return;

    const user = auth.currentUser;
    if (!user) return;
    const token = await getIdToken(user);

    await fetch("/api/swipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `__session=${token}`,
      },
      body: JSON.stringify({
        targetType: "candidate",
        targetId: cards[current].id,
        isLike,
        isSuperLike: false,
      }),
    });

    setCurrent((prev) => prev + 1);
  };

  if (loading) return <p className="text-center py-8">Loading candidates...</p>;
  if (error) return <p className="text-center py-8 text-destructive">{error}</p>;
  if (current >= cards.length) return <p className="text-center py-8">No more candidates to review.</p>;

  const card = cards[current];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-8">
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
            {card.profilePicture ? (
              <img src={card.profilePicture} alt={card.fullName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl">{card.fullName?.[0] || "?"}</span>
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

        {card.education && card.education.length > 0 && (
          <div className="rounded-2xl border border-border bg-background p-4 mb-4">
            <p className="text-sm uppercase text-textSecondary mb-2">Education</p>
            <ul className="text-sm space-y-1">
              {card.education.map((edu, i) => (
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
      </motion.div>
    </div>
  );
}
