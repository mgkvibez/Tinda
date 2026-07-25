"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Question = {
  id: string;
  question: string;
  options: string[];
  skill: string;
};

type Assessment = {
  id: string;
  jobId: string;
  title: string;
  description: string;
  questions: Question[];
  passingScore: number;
};

export default function AssessmentPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const jobId = params.jobId;
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await getIdToken(user);
        const res = await fetch(`/api/assessments?jobId=${jobId}`, {
          headers: { Cookie: `__session=${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.assessment) {
            setAssessment(data.assessment);
            setAnswers(new Array(data.assessment.questions.length).fill(-1));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, [jobId]);

  const handleAnswer = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optionIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({
          assessmentId: assessment.id,
          jobId,
          answers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ score: data.result.score, passed: data.result.passed });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading assessment...</p>;
  if (!assessment) return (
    <div className="text-center py-16">
      <p className="text-5xl mb-4">📝</p>
      <p className="text-textSecondary">No assessment for this job.</p>
      <Link href="/candidate/swipe" className="text-sm text-primary hover:underline mt-2 inline-block">← Back to swiping</Link>
    </div>
  );

  if (result) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <p className="text-7xl">{result.passed ? "🎉" : "💪"}</p>
        </motion.div>
        <h1 className="text-3xl font-bold">{result.passed ? "Passed!" : "Keep practicing!"}</h1>
        <p className="text-2xl text-textSecondary">You scored {result.score}%</p>
        <p className="text-sm text-textSecondary">
          {result.passed
            ? `You exceeded the passing score of ${assessment.passingScore}%. This boosts your match score for this job!`
            : `The passing score was ${assessment.passingScore}%. You can try again later.`}
        </p>
        <Button onClick={() => router.push("/candidate/swipe")}>
          Back to Swiping
        </Button>
      </div>
    );
  }

  const question = assessment.questions[currentQ];
  const isLast = currentQ === assessment.questions.length - 1;
  const answeredCount = answers.filter((a) => a !== -1).length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{assessment.title}</h1>
        <span className="text-sm text-textSecondary">{answeredCount}/{assessment.questions.length} answered</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentQ + 1) / assessment.questions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{question.skill}</span>
            <span className="text-xs text-textSecondary">Question {currentQ + 1}</span>
          </div>
          <h2 className="text-lg font-semibold mb-4">{question.question}</h2>
          <div className="space-y-2">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left rounded-xl border p-3 text-sm transition-colors ${
                  answers[currentQ] === i
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentQ((prev) => Math.max(0, prev - 1))}
          disabled={currentQ === 0}
        >
          Previous
        </Button>
        <div className="flex-1" />
        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={answers.includes(-1) || submitting}
          >
            {submitting ? "Submitting..." : "Submit Assessment"}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQ((prev) => Math.min(assessment.questions.length - 1, prev + 1))}
            disabled={answers[currentQ] === -1}
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
