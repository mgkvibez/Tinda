"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

export default function FlashcardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    if (user) fetchCards();
  }, [user]);

  const fetchCards = async () => {
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      const res = await fetch("/api/flashcards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCards(data.cards || []);
      setProgress(data.progress || []);
    } catch {
      // no cards yet
    } finally {
      setLoading(false);
    }
  };

  const generateCards = async () => {
    setLoading(true);
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      setCards(data.cards || []);
      setProgress([]);
      setCurrentIdx(0);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const reviewCard = async (rating: "easy" | "good" | "hard" | "again") => {
    const card = cards[currentIdx];
    if (!card) return;
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "review", cardId: card.id, rating }),
      });
    } catch {
    }
    setReviewedCount((c) => c + 1);
    setShowAnswer(false);
    if (currentIdx < cards.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setCurrentIdx(0); // loop back
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-2xl text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-foreground mb-4">Interview Prep Flashcards</h1>
            <p className="text-textSecondary mb-8">
              Spaced-repetition flashcards tailored to your role and skills. We'll generate cards for common interview questions, technical concepts, and behavioral scenarios.
            </p>
            <Button onClick={generateCards} size="lg" className="text-lg px-8 py-6">
              Generate My Flashcards
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  const card = cards[currentIdx];
  const cardProgress = progress.find((p) => p.cardId === card?.id);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Interview Flashcards</h1>
            <p className="text-textSecondary mt-1">Card {currentIdx + 1} of {cards.length} • {reviewedCount} reviewed</p>
          </div>
          <Button variant="outline" size="sm" onClick={generateCards}>
            Regenerate
          </Button>
        </motion.div>

        {card && (
          <motion.div key={card.id} initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ duration: 0.4 }}>
            <Card
              className="min-h-[300px] p-8 flex flex-col items-center justify-center cursor-pointer"
              onClick={() => setShowAnswer(!showAnswer)}
            >
              <div className="text-sm text-textSecondary mb-4">
                {card.category} • {card.difficulty}
                {cardProgress && ` • Next review: ${new Date(cardProgress.nextReview).toLocaleDateString()}`}
              </div>
              {!showAnswer ? (
                <>
                  <div className="text-2xl font-bold text-foreground text-center mb-6">
                    {card.question}
                  </div>
                  <div className="text-sm text-textSecondary">Tap to reveal answer</div>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-primary mb-3">{card.question}</div>
                  <div className="text-foreground text-center whitespace-pre-wrap">
                    {card.answer}
                  </div>
                  <div className="text-sm text-textSecondary mt-4">How well did you know this?</div>
                </>
              )}
            </Card>
          </motion.div>
        )}

        {showAnswer && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => reviewCard("again")} className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
              Again
            </Button>
            <Button variant="outline" onClick={() => reviewCard("hard")} className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50">
              Hard
            </Button>
            <Button variant="outline" onClick={() => reviewCard("good")} className="flex-1 border-yellow-300 text-yellow-600 hover:bg-yellow-50">
              Good
            </Button>
            <Button variant="outline" onClick={() => reviewCard("easy")} className="flex-1 border-green-300 text-green-600 hover:bg-green-50">
              Easy
            </Button>
          </motion.div>
        )}

        {!showAnswer && (
          <div className="text-center text-sm text-textSecondary mt-4">
            Review {cards.length} cards • Spaced repetition optimizes your study schedule
          </div>
        )}
      </div>
    </div>
  );
}
