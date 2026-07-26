"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

export default function CareerPathPage() {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activePath, setActivePath] = useState(0);

  const generate = async () => {
    setLoading(true);
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      const res = await fetch("/api/career-path", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Failed to generate career path" });
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-2xl text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-foreground mb-4">Career Path Visualizer</h1>
            <p className="text-textSecondary mb-8">Discover all the career paths available from your current role. See salary ranges, required skills, and timelines for each step.</p>
            <Button onClick={generate} size="lg" className="text-lg px-8 py-6">
              Visualize My Career Paths
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-textSecondary">Mapping your career roadmap...</p>
        </div>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{result.error}</p>
          <Button onClick={generate}>Try Again</Button>
        </div>
      </div>
    );
  }

  const path = result?.paths?.[activePath];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Your Career Pathways</h1>
          <p className="text-textSecondary mt-1">
            Currently: {result?.currentRole} • Level: {result?.currentLevel} → Next: {result?.nextStep}
          </p>
        </motion.div>

        {/* Path selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {result?.paths?.map((p: any, i: number) => (
            <button
              key={p.id}
              onClick={() => setActivePath(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activePath === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {p.title}
              <span className="ml-1 text-xs opacity-70">
                ({p.marketJobs} jobs)
              </span>
            </button>
          ))}
        </div>

        {path && (
          <motion.div key={path.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">{path.title}</h2>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    path.difficulty === "natural" ? "bg-green-100 text-green-700"
                      : path.difficulty === "moderate" ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {path.difficulty}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{path.timeline}</span>
                </div>
              </div>
              <p className="text-textSecondary text-sm">{path.description}</p>
            </Card>

            {/* Career ladder visualization */}
            <div className="space-y-3">
              {path.roles.map((role: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`p-5 ${i === 0 ? "opacity-50" : ""}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          i === 0 ? "bg-gray-200 text-gray-500"
                            : i === 1 ? "bg-green-100 text-green-600"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {i + 1}
                        </div>
                        {i < path.roles.length - 1 && <div className="w-0.5 h-8 bg-border mt-2" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-foreground">{role.title}</h3>
                            <span className="text-xs text-textSecondary">{role.level}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary text-sm">{role.salaryEstimate}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {role.skills.map((s: string, j: number) => (
                            <span key={j} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Recommendations */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-3">Coach Recommendations</h3>
              <ul className="space-y-2">
                {result?.recommendations?.map((rec: string, i: number) => (
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
