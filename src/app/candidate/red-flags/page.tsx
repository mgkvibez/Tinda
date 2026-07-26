"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { textareaStyles } from "@/lib/styles";

export default function RedFlagsPage() {
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/red-flag-detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch {
      setAnalysis({ error: "Analysis failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Job Red Flag Detector</h1>
          <p className="text-textSecondary mt-1">Paste a job description and get an instant analysis of potential red flags.</p>
        </motion.div>

        <Card className="p-6 mb-6">
          <textarea
            className={textareaStyles}
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Paste the full job description here..."
          />
          <Button onClick={analyze} disabled={loading || !description.trim()} className="mt-4 w-full">
            {loading ? "Analyzing..." : "Analyze Job Description"}
          </Button>
        </Card>

        {analysis && !analysis.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Score */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Overall Assessment</h2>
                <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  analysis.recommendation === "safe" ? "bg-green-100 text-green-700"
                    : analysis.recommendation === "caution" ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  Score: {analysis.score}/100
                </div>
              </div>
              <p className="text-textSecondary text-sm">{analysis.summary}</p>
            </Card>

            {/* Red Flags */}
            {analysis.redFlags?.length > 0 && (
              <Card className="p-6 border-l-4 border-l-red-500">
                <h3 className="text-lg font-bold text-red-600 mb-3">Red Flags ({analysis.redFlags.length})</h3>
                <div className="space-y-3">
                  {analysis.redFlags.map((flag: any, i: number) => (
                    <div key={i} className="bg-red-50 rounded-lg p-3">
                      <div className="font-semibold text-sm text-red-700">⚠️ {flag.type}</div>
                      <p className="text-sm text-red-600 mt-1">{flag.message}</p>
                      {flag.snippet && <p className="text-xs text-red-400 mt-1 italic">"{flag.snippet}"</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Yellow Flags */}
            {analysis.yellowFlags?.length > 0 && (
              <Card className="p-6 border-l-4 border-l-yellow-500">
                <h3 className="text-lg font-bold text-yellow-600 mb-3">Warnings ({analysis.yellowFlags.length})</h3>
                <div className="space-y-3">
                  {analysis.yellowFlags.map((flag: any, i: number) => (
                    <div key={i} className="bg-yellow-50 rounded-lg p-3">
                      <div className="font-semibold text-sm text-yellow-700">⚡ {flag.type}</div>
                      <p className="text-sm text-yellow-600 mt-1">{flag.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Green Flags */}
            {analysis.greenFlags?.length > 0 && (
              <Card className="p-6 border-l-4 border-l-green-500">
                <h3 className="text-lg font-bold text-green-600 mb-3">Positive Signs ({analysis.greenFlags.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.greenFlags.map((flag: string, i: number) => (
                    <span key={i} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                      ✓ {flag}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
