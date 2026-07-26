"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

export default function NegotiationPage() {
  const { user } = useAuth();
  const [currentSalary, setCurrentSalary] = useState("");
  const [targetSalary, setTargetSalary] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      const res = await fetch("/api/negotiation-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentSalary: currentSalary ? Number(currentSalary) : undefined,
          targetSalary: targetSalary ? Number(targetSalary) : undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Analysis failed" });
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Salary Negotiation Coach</h1>
          <p className="text-textSecondary mt-1">Get AI-powered negotiation scripts tailored to your profile and the market.</p>
        </motion.div>

        <Card className="p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Current Salary (optional)</label>
              <Input
                type="number"
                value={currentSalary}
                onChange={(e) => setCurrentSalary(e.target.value)}
                placeholder="e.g. 75000"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Target Salary (optional)</label>
              <Input
                type="number"
                value={targetSalary}
                onChange={(e) => setTargetSalary(e.target.value)}
                placeholder="e.g. 95000"
              />
            </div>
          </div>
          <Button onClick={analyze} disabled={loading} className="w-full">
            {loading ? "Preparing your coaching..." : "Get My Negotiation Plan"}
          </Button>
        </Card>

        {result && !result.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Worth estimate */}
            <Card className="p-6 text-center">
              <h2 className="text-xl font-bold mb-4">Your Market Worth</h2>
              <div className="text-4xl font-bold text-primary mb-2">
                ${result.estimatedWorth?.toLocaleString()}/yr
              </div>
              <div className="text-sm text-textSecondary">
                Market range: ${result.marketRange?.min?.toLocaleString()} - ${result.marketRange?.max?.toLocaleString()}
              </div>
              {result.potentialIncrease && (
                <div className="mt-4 inline-block px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                  Potential: +${result.potentialIncrease.amount?.toLocaleString()} ({result.potentialIncrease.percent}%) — {result.feasibility}
                </div>
              )}
            </Card>

            {/* Tips */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-3">Negotiation Tips</h3>
              <ul className="space-y-2">
                {result.tips?.map((tip: string, i: number) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Scripts */}
            {result.scripts?.map((script: any, i: number) => (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">{script.scenario}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(script.script, i)}
                  >
                    {copied === i ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap text-sm text-foreground">
                  {script.script}
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
