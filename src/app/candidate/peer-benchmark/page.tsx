"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

export default function PeerBenchmarkPage() {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const benchmark = async () => {
    setLoading(true);
    try {
      const token = await getIdToken(firebaseAuth.currentUser!);
      const res = await fetch("/api/peer-benchmark", {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Benchmarking failed" });
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-2xl text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold text-foreground mb-4">Peer Benchmarking</h1>
            <p className="text-textSecondary mb-8">
              See how you stack up against other candidates in similar roles — anonymously. Compare skills, experience, and salary expectations.
            </p>
            <Button onClick={benchmark} size="lg" className="text-lg px-8 py-6">
              Benchmark Me
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
          <p className="text-textSecondary">Comparing you with peers...</p>
        </div>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{result.error}</p>
          <Button onClick={benchmark}>Try Again</Button>
        </div>
      </div>
    );
  }

  const PercentileBar = ({ percentile, label }: { percentile: number; label: string }) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-textSecondary">{label}</span>
        <span className="font-bold">{percentile}th percentile</span>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentile}%` }}
          className="h-3 rounded-full bg-primary"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Your Peer Benchmark</h1>
          <p className="text-textSecondary mt-1">Compared against {result?.peerCount} peers in similar roles.</p>
        </motion.div>

        {/* Summary */}
        <Card className="p-6 mb-6">
          <p className="text-sm text-foreground whitespace-pre-wrap">{result?.summary}</p>
        </Card>

        {/* Skills Benchmark */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Skills</h3>
          <PercentileBar percentile={result?.skills?.percentile ?? 0} label="Your skill count vs peers" />
          <div className="grid grid-cols-3 gap-4 text-sm text-center mt-4">
            <div>
              <div className="font-bold text-lg text-foreground">{result?.skills?.yourCount}</div>
              <div className="text-textSecondary">You</div>
            </div>
            <div>
              <div className="font-bold text-lg text-foreground">{result?.skills?.peerAverage}</div>
              <div className="text-textSecondary">Peer avg</div>
            </div>
            <div>
              <div className="font-bold text-lg text-foreground">{result?.skills?.peerMax}</div>
              <div className="text-textSecondary">Peer max</div>
            </div>
          </div>
          {result?.skills?.topPeerSkills?.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Most popular skills among peers:</div>
              <div className="flex flex-wrap gap-2">
                {result.skills.topPeerSkills.map((s: any, i: number) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                    s.youHave ? "bg-green-100 text-green-700" : "bg-muted text-textSecondary"
                  }`}>
                    {s.skill} ({s.popularity}) {s.youHave && "✓"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Experience Benchmark */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">Experience</h3>
          <PercentileBar percentile={result?.experience?.percentile ?? 0} label="Your experience vs peers" />
          <div className="grid grid-cols-3 gap-4 text-sm text-center mt-4">
            <div>
              <div className="font-bold text-lg text-foreground">{result?.experience?.yourYears}y</div>
              <div className="text-textSecondary">You</div>
            </div>
            <div>
              <div className="font-bold text-lg text-foreground">{result?.experience?.peerAverage}y</div>
              <div className="text-textSecondary">Peer avg</div>
            </div>
            <div>
              <div className="font-bold text-lg text-foreground">{result?.experience?.peerMax}y</div>
              <div className="text-textSecondary">Peer max</div>
            </div>
          </div>
        </Card>

        {/* Salary Benchmark */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Salary Expectations</h3>
          <PercentileBar percentile={result?.salary?.percentile ?? 0} label="Your salary expectation vs peers" />
          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-textSecondary">Your range</div>
              <div className="font-bold">
                ${result?.salary?.yourMin?.toLocaleString() || "?"} - ${result?.salary?.yourMax?.toLocaleString() || "?"}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-textSecondary">Peer average</div>
              <div className="font-bold">
                ${result?.salary?.peerAvgMin?.toLocaleString() || "?"} - ${result?.salary?.peerAvgMax?.toLocaleString() || "?"}
              </div>
            </div>
          </div>
          {result?.salary?.marketJobs > 0 && (
            <div className="bg-primary/5 rounded-lg p-3 mt-3">
              <div className="text-sm text-textSecondary">Market salary range (from {result.salary.marketJobs} active jobs)</div>
              <div className="font-bold text-primary">
                ${result.salary.marketMin?.toLocaleString()} - ${result.salary.marketMax?.toLocaleString()}
              </div>
              <div className="text-sm text-textSecondary mt-1">Average: ${result.salary.marketAvg?.toLocaleString()}/yr</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
