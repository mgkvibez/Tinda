"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function SalaryCalculatorPage() {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState<"entry" | "mid" | "senior">("mid");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (!role.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/salary-calculator?role=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&experience=${experience}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data.estimate);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salary Calculator</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <Label>Job Role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" className="mt-1" />
        </div>
        <div>
          <Label>Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lagos, Abuja, Remote" className="mt-1" />
        </div>
        <div>
          <Label>Experience Level</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {(["entry", "mid", "senior"] as const).map((exp) => (
              <button
                key={exp}
                onClick={() => setExperience(exp)}
                className={`rounded-xl border p-2.5 text-center capitalize text-sm transition-colors ${experience === exp ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
              >
                {exp === "entry" ? "Entry (0-2y)" : exp === "mid" ? "Mid (3-5y)" : "Senior (5y+)"}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={handleCalculate} disabled={loading || !role.trim()} className="w-full">
          {loading ? "Calculating..." : "Estimate Salary"}
        </Button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
          <h2 className="font-semibold text-center">Estimated Monthly Salary</h2>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">{formatNaira(result.mid)}</p>
            <p className="text-sm text-textSecondary mt-1">per month</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-textSecondary">Low</p>
              <p className="text-sm font-bold">{formatNaira(result.low)}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3">
              <p className="text-xs text-textSecondary">Median</p>
              <p className="text-sm font-bold text-primary">{formatNaira(result.mid)}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-textSecondary">High</p>
              <p className="text-sm font-bold">{formatNaira(result.high)}</p>
            </div>
          </div>
          <div className="text-center text-xs text-textSecondary">
            Annual range: {formatNaira(result.low * 12)} — {formatNaira(result.high * 12)}
          </div>
          <div className="rounded-xl bg-muted p-3 space-y-1">
            {result.factors.map((f: string, i: number) => (
              <p key={i} className="text-xs text-textSecondary">• {f}</p>
            ))}
          </div>
          <p className="text-xs text-textSecondary text-center italic">Estimates based on Nigerian market data. Actual salaries vary by company, negotiation, and skills.</p>
        </motion.div>
      )}
    </div>
  );
}
