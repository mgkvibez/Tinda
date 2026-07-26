"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

export default function SkillsGapPage() {
  const { user } = useAuth();
  const [dreamRole, setDreamRole] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      const res = await fetch("/api/skills-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dreamRole }),
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
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Skills Gap Analyzer</h1>
          <p className="text-textSecondary mt-1">See exactly what skills you need to land your dream role.</p>
        </motion.div>

        <Card className="p-6 mb-6">
          <label className="text-sm font-medium text-foreground mb-2 block">
            What's your dream role?
          </label>
          <div className="flex gap-2">
            <Input
              value={dreamRole}
              onChange={(e) => setDreamRole(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer, Product Manager..."
              onKeyDown={(e) => e.key === "Enter" && analyze()}
            />
            <Button onClick={analyze} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
          <p className="text-xs text-textSecondary mt-2">Leave blank to use your current role from your profile.</p>
        </Card>

        {analysis && !analysis.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Match Score */}
            <Card className="p-6 text-center">
              <h2 className="text-xl font-bold mb-2">Match Score for {analysis.dreamRole}</h2>
              <div className={`text-5xl font-bold ${analysis.matchScore >= 75 ? "text-green-600" : analysis.matchScore >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {analysis.matchScore}%
              </div>
              <p className="text-textSecondary text-sm mt-2">{analysis.summary}</p>
              <div className="flex justify-center gap-4 mt-4 text-sm">
                <span className="text-green-600">Have: {analysis.totalHave}</span>
                <span className="text-red-600">Missing: {analysis.totalMissing}</span>
                <span className="text-textSecondary">Total: {analysis.totalRequired}</span>
              </div>
            </Card>

            {/* Development Plan */}
            {analysis.missingSkills?.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-4">Your Development Plan</h3>
                <div className="space-y-3">
                  {analysis.missingSkills.map((skill: any, i: number) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-foreground">{skill.skill}</div>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            skill.priority === "high" ? "bg-red-100 text-red-700"
                              : skill.priority === "medium" ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {skill.priority} priority
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {skill.timeline}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-textSecondary mb-2">
                        Market demand: {skill.marketDemand} active jobs
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Recommended resources:</span>
                        <ul className="list-disc list-inside text-textSecondary mt-1">
                          {skill.resources.map((r: string, j: number) => (
                            <li key={j}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Extra Skills */}
            {analysis.extraSkills?.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-bold mb-3">Your Bonus Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.extraSkills.map((s: string, i: number) => (
                    <span key={i} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-textSecondary mt-3">These aren't required for this role but make you stand out.</p>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
