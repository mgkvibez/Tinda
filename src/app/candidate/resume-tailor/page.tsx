"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

export default function ResumeTailorPage() {
  const { user } = useAuth();
  const [jobId, setJobId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const tailor = async () => {
    if (!jobId.trim()) return;
    setLoading(true);
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      const res = await fetch("/api/resume-tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Failed to tailor resume" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">AI Resume Tailor</h1>
          <p className="text-textSecondary mt-1">Automatically optimize your resume for a specific job application.</p>
        </motion.div>

        <Card className="p-6 mb-6">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Job ID (from your swiped/matched jobs)
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Paste the job ID..."
            />
            <Button onClick={tailor} disabled={loading || !jobId.trim()}>
              {loading ? "Tailoring..." : "Tailor My Resume"}
            </Button>
          </div>
        </Card>

        {result && !result.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Match Rate */}
            <Card className="p-6 text-center">
              <h2 className="text-xl font-bold mb-2">Keyword Match: {result.jobTitle} at {result.companyName}</h2>
              <div className={`text-5xl font-bold ${result.matchRate >= 75 ? "text-green-600" : result.matchRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {result.matchRate}%
              </div>
              <p className="text-textSecondary text-sm mt-2">{result.recommendations?.[0]}</p>
            </Card>

            {/* Tailored Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-3">Tailored Professional Summary</h3>
              <div className="bg-muted rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">
                {result.tailoredSummary}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(result.tailoredSummary)}
              >
                Copy Summary
              </Button>
            </Card>

            {/* Skills Section */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-3">Optimized Skills Section</h3>
              <div className="bg-muted rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">
                {result.skillsSection}
              </div>
            </Card>

            {/* Experience Highlights */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-3">Experience Highlights (for this job)</h3>
              <div className="space-y-2">
                {result.experienceHighlights?.map((hl: string, i: number) => (
                  <p key={i} className="text-sm text-foreground">{hl}</p>
                ))}
              </div>
            </Card>

            {/* Keyword Analysis */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-3">Keyword Analysis (ATS Optimization)</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Keywords present: {result.keywordAnalysis?.coveragePercent}% coverage</div>
                  <div className="flex flex-wrap gap-1">
                    {result.keywordAnalysis?.keywordsPresent?.map((k: string, i: number) => (
                      <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ {k}</span>
                    ))}
                  </div>
                </div>
                {result.keywordAnalysis?.synonymMatches?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">Matched via synonyms:</div>
                    <div className="flex flex-wrap gap-1">
                      {result.keywordAnalysis.synonymMatches.map((s: string, i: number) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">~ {s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.keywordAnalysis?.keywordsMissing?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">Missing keywords (add if you have experience):</div>
                    <div className="flex flex-wrap gap-1">
                      {result.keywordAnalysis.keywordsMissing.map((k: string, i: number) => (
                        <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">✗ {k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Recommendations */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-3">Tailoring Recommendations</h3>
              <ul className="space-y-2">
                {result.recommendations?.slice(1).map((rec: string, i: number) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-primary">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
