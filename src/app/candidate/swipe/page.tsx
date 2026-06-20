"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type JobCard = {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  salaryRangeMin?: number | null;
  salaryRangeMax?: number | null;
  skillsRequired: string[];
  workArrangement?: string | null;
  employmentType?: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
  recruiterName?: string | null;
};

export default function CandidateSwipePage() {
  const [cards, setCards] = useState<JobCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/swipes")
      .then((r) => r.json())
      .then((data) => setCards(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSwipe = async (isLike: boolean) => {
    if (!cards[current]) return;

    await fetch("/api/swipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "job",
        targetId: cards[current].id,
        targetJobId: cards[current].id,
        isLike,
        isSuperLike: false,
      }),
    });

    setCurrent((prev) => prev + 1);
  };

  if (loading) return <p>Loading swipe feed...</p>;
  if (current >= cards.length) return <p>No more jobs to review.</p>;

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
            {card.companyLogo ? (
              <img src={card.companyLogo} alt={card.companyName || "Company logo"} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-textSecondary">Logo</span>
            )}
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-textSecondary">{card.companyName}</p>
            <h2 className="text-2xl font-semibold">{card.title}</h2>
            <p className="text-textSecondary text-sm">{card.location || "Remote / Hybrid / Onsite"}</p>
          </div>
        </div>

        <p className="text-sm leading-7 text-textSecondary mb-6">{card.description.substring(0, 220)}...</p>

        <div className="grid gap-3 mb-6">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-sm uppercase text-textSecondary">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {card.skillsRequired.map((skill) => (
                <span key={skill} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-textSecondary">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="font-medium">Work</p>
              <p>{card.workArrangement || "Any"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="font-medium">Type</p>
              <p>{card.employmentType || "Any"}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => handleSwipe(false)}>
            Pass
          </Button>
          <Button onClick={() => handleSwipe(true)}>
            Like
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
