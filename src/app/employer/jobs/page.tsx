"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Job = {
  id: string;
  title: string;
  location?: string | null;
  salaryRangeMin?: number | null;
  salaryRangeMax?: number | null;
  workArrangement?: string | null;
  employmentType?: string | null;
  createdAt: string;
};

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => setJobs(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading jobs...</p>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your job postings</h1>
          <p className="text-textSecondary">Manage open roles, edit listings, and keep your hiring funnel moving.</p>
        </div>
        <Button asChild>
          <Link href="/employer/jobs/new">Create job</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {jobs.length === 0 ? (
          <div className="rounded-3xl border border-border p-8 text-center">
            <p className="text-lg">No jobs found yet.</p>
            <p className="text-textSecondary">Create a listing to start attracting candidates.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="rounded-3xl border border-border p-6 bg-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{job.title}</h2>
                  <p className="text-textSecondary">{job.location || "Remote/Hybrid/Onsite"}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-textSecondary">
                  <span>{job.employmentType || "Any employment type"}</span>
                  <span>{job.workArrangement || "Any arrangement"}</span>
                  <span>
                    {job.salaryRangeMin ? `$${job.salaryRangeMin}` : "Salary TBD"}
                    {job.salaryRangeMax ? ` - $${job.salaryRangeMax}` : ""}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/employer/jobs/${job.id}`}>Edit</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/employer/jobs/${job.id}?action=delete`}>Delete</Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
