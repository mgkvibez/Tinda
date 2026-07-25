"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { VerifiedBadge } from "@/components/verified-badge";
import Link from "next/link";

type CompanyData = {
  companyName: string | null;
  logo: string | null;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  headquarters: string | null;
  aboutCompany: string | null;
  mission: string | null;
  values: string[];
  perks: string[];
  cultureVideoUrl: string | null;
  teamPhotos: string[];
  isVerified: boolean;
};

type JobItem = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  employmentType: string | null;
  skillsRequired: string[];
};

export default function CompanyPage() {
  const params = useParams<{ employerId: string }>();
  const employerId = params.employerId;
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "employerProfiles", employerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as CompanyData;
          setCompany(data);

          // Fetch this employer's jobs
          const jobsQuery = query(
            collection(db, "jobs"),
            where("employerId", "==", employerId),
            where("isPublished", "==", true),
          );
          const jobsSnap = await getDocs(jobsQuery);
          setJobs(jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as JobItem));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [employerId]);

  if (loading) return <div className="text-center py-16 text-textSecondary">Loading...</div>;
  if (!company) return <div className="text-center py-16 text-textSecondary">Company not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-6"
      >
        <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {company.logo ? (
            <img src={company.logo} alt={company.companyName || ''} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold">{company.companyName?.[0] || '?'}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{company.companyName}</h1>
            {company.isVerified && <VerifiedBadge size="md" />}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-textSecondary">
            {company.industry && <span>{company.industry}</span>}
            {company.companySize && <span>• {company.companySize}</span>}
            {company.headquarters && <span>• {company.headquarters}</span>}
          </div>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm hover:underline mt-1 inline-block"
            >
              {company.website}
            </a>
          )}
        </div>
      </motion.div>

      {/* Culture Video */}
      {company.cultureVideoUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl overflow-hidden">
          <video
            src={company.cultureVideoUrl}
            controls
            className="w-full rounded-3xl"
            preload="metadata"
          />
        </motion.div>
      )}

      {/* About */}
      {company.aboutCompany && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-3">About Us</h2>
          <p className="text-textSecondary leading-relaxed">{company.aboutCompany}</p>
        </div>
      )}

      {/* Mission */}
      {company.mission && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
          <p className="text-textSecondary leading-relaxed italic">{company.mission}</p>
        </div>
      )}

      {/* Values */}
      {company.values && company.values.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-3">Our Values</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {company.values.map((value, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-background px-4 py-3">
                <span className="text-lg">✨</span>
                <span className="text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Perks & Benefits */}
      {company.perks && company.perks.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-3">Perks & Benefits</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {company.perks.map((perk, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-background px-4 py-3">
                <span className="text-lg">🎁</span>
                <span className="text-sm">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Photos */}
      {company.teamPhotos && company.teamPhotos.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Life at {company.companyName}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {company.teamPhotos.map((photo, i) => (
              <div key={i} className="rounded-2xl overflow-hidden aspect-square">
                <img src={photo} alt={`Team photo ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Positions */}
      {jobs.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Open Positions ({jobs.length})</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link key={job.id} href={`/candidate/swipe`}>
                <div className="rounded-2xl border border-border bg-card p-4 hover:border-primary transition-colors">
                  <h3 className="font-semibold">{job.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-textSecondary">
                    {job.location && <span>{job.location}</span>}
                    {job.employmentType && <span>• {job.employmentType}</span>}
                    {job.salaryRangeMin && (
                      <span>• {job.salaryRangeMin.toLocaleString()}
                      {job.salaryRangeMax ? ` - ${job.salaryRangeMax.toLocaleString()}` : '+'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-textSecondary mt-2 line-clamp-2">{job.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
