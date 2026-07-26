"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const QUESTION_BANK = [
  { id: "q1", question: "Tell me about yourself and why you're interested in this role.", category: "Introduction" },
  { id: "q2", question: "Describe a challenging project you worked on. What was your role and how did you overcome obstacles?", category: "Behavioral" },
  { id: "q3", question: "What are your greatest strengths and how do they apply to this position?", category: "Self-assessment" },
  { id: "q4", question: "Tell me about a time you had a conflict with a coworker. How did you resolve it?", category: "Conflict Resolution" },
  { id: "q5", question: "Why do you want to leave your current job?", category: "Motivation" },
  { id: "q6", question: "Describe a time you failed. What did you learn from it?", category: "Growth" },
  { id: "q7", question: "How do you prioritize tasks when everything seems urgent?", category: "Time Management" },
  { id: "q8", question: "Tell me about a time you went above and beyond for a project.", category: "Initiative" },
  { id: "q9", question: "What's a technical concept you recently learned? Explain it simply.", category: "Technical" },
  { id: "q10", question: "Where do you see yourself in 5 years?", category: "Career Goals" },
];

export default function MockInterviewPage() {
  const [pastInterviews, setPastInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [selectedQs, setSelectedQs] = useState<typeof QUESTION_BANK>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [jobTitle, setJobTitle] = useState("");

  useEffect(() => {
    fetchPast();
  }, []);

  const fetchPast = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/mock-interviews", { headers: { Cookie: `__session=${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPastInterviews(data.interviews || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = () => {
    // Pick 5 random questions
    const shuffled = [...QUESTION_BANK].sort(() => Math.random() - 0.5).slice(0, 5);
    setSelectedQs(shuffled);
    setAnswers({});
    setCurrentQ(0);
    setResult(null);
    setActive(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch("/api/mock-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({
          questions: selectedQs.map((q) => ({ ...q, answer: answers[q.id] || "" })),
          jobTitle: jobTitle || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.interview);
        setActive(false);
        fetchPast();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <p className="text-7xl">{result.overallScore >= 70 ? "🎉" : result.overallScore >= 50 ? "💪" : "📚"}</p>
          </motion.div>
          <h1 className="text-3xl font-bold mt-2">Interview Complete!</h1>
          <p className="text-2xl text-textSecondary mt-1">Overall Score: {result.overallScore}/100</p>
        </div>

        {result.questions.map((q: any, i: number) => (
          <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{q.category}</span>
              <span className={`text-sm font-bold ${q.score >= 70 ? "text-green-500" : q.score >= 50 ? "text-orange-500" : "text-red-500"}`}>
                {q.score}/100
              </span>
            </div>
            <p className="text-sm font-medium mb-2">{q.question}</p>
            <p className="text-xs text-textSecondary mb-2 italic">Your answer: "{q.answer}"</p>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-textSecondary mb-1 font-semibold">AI Feedback:</p>
              <p className="text-xs text-foreground">{q.aiFeedback}</p>
            </div>
          </motion.div>
        ))}

        <Button onClick={startInterview} className="w-full">Practice Again</Button>
      </div>
    );
  }

  if (active) {
    const question = selectedQs[currentQ];
    const isLast = currentQ === selectedQs.length - 1;
    const allAnswered = selectedQs.every((q) => (answers[q.id] || "").trim().length > 10);

    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Mock Interview</h1>
          <span className="text-sm text-textSecondary">{currentQ + 1}/{selectedQs.length}</span>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentQ + 1) / selectedQs.length) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={question.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="rounded-2xl border border-border bg-card p-6">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{question.category}</span>
            <h2 className="text-lg font-semibold mt-3 mb-4">{question.question}</h2>
            <textarea
              value={answers[question.id] || ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
              placeholder="Type your answer here... Use the STAR method (Situation, Task, Action, Result)."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-[120px] resize-y"
              autoFocus
            />
            <p className="text-xs text-textSecondary mt-1">{(answers[question.id] || "").trim().split(/\s+/).filter(Boolean).length} words</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCurrentQ((prev) => Math.max(0, prev - 1))} disabled={currentQ === 0}>Previous</Button>
          <div className="flex-1" />
          {isLast ? (
            <Button onClick={handleSubmit} disabled={submitting || !allAnswered}>{submitting ? "Analyzing..." : "Submit & Get Feedback"}</Button>
          ) : (
            <Button onClick={() => setCurrentQ((prev) => Math.min(selectedQs.length - 1, prev + 1))} disabled={(answers[question.id] || "").trim().length < 10}>Next →</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mock Interview Practice</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-4xl mb-3">🎤</p>
        <p className="text-textSecondary text-sm mb-4">Practice answering real interview questions and get instant AI feedback on your responses. 5 questions per session.</p>
        <div className="mb-4 text-left">
          <Label>Optional: Job Title (for tailored feedback)</Label>
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" className="mt-1" />
        </div>
        <Button onClick={startInterview} className="w-full">Start Mock Interview</Button>
      </div>

      {pastInterviews.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase text-textSecondary">Past Sessions</h2>
          {pastInterviews.map((interview) => (
            <div key={interview.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{interview.jobTitle || "General Practice"}</p>
                  <p className="text-xs text-textSecondary">{new Date(interview.createdAt).toLocaleDateString()} · {interview.questions.length} questions</p>
                </div>
                <span className={`text-lg font-bold ${interview.overallScore >= 70 ? "text-green-500" : interview.overallScore >= 50 ? "text-orange-500" : "text-red-500"}`}>
                  {interview.overallScore || "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
