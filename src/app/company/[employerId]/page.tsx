"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs, addDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [reviews, setReviews] = useState<Array<{
    id: string; reviewerName: string; rating: number; title: string;
    pros: string; cons: string; createdAt: any; isAnonymous: boolean;
  }>>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', pros: '', cons: '', isAnonymous: false });

  const fetchReviews = async () => {
    try {
      const q = query(
        collection(db, 'companyReviews'),
        where('employerId', '==', employerId),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
      setReviews(list);
      setReviewCount(list.length);
      if (list.length > 0) {
        const avg = list.reduce((sum: number, r: any) => sum + r.rating, 0) / list.length;
        setAvgRating(avg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Please sign in to leave a review.');
      return;
    }
    try {
      await addDoc(collection(db, 'companyReviews'), {
        employerId,
        reviewerId: user.uid,
        reviewerName: reviewForm.isAnonymous ? 'Anonymous' : user.displayName || 'User',
        rating: reviewForm.rating,
        title: reviewForm.title,
        pros: reviewForm.pros,
        cons: reviewForm.cons,
        isAnonymous: reviewForm.isAnonymous,
        createdAt: serverTimestamp(),
      });
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', pros: '', cons: '', isAnonymous: false });
      fetchReviews();
    } catch (err) {
      console.error(err);
      alert('Failed to submit review.');
    }
  };

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
          fetchReviews();
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
            <button
              onClick={() => {
                const reason = prompt('Why are you reporting this company? (scam, fake, spam, inappropriate)')
                if (reason) {
                  fetch('/api/report-block', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'report', targetType: 'user', targetId: params.employerId, reason }),
                  }).then(() => alert('Report submitted. Thank you for keeping Tinda safe.'))
                }
              }}
              className="ml-auto text-textSecondary hover:text-red-500 transition-colors text-sm"
              title="Report this company"
            >
              🚩 Report
            </button>
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

      {/* Company Reviews */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reviews ({reviewCount})</h2>
          {avgRating > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-2xl">{"★".repeat(Math.round(avgRating))}</span>
              <span className="text-sm text-textSecondary">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => setShowReviewForm(!showReviewForm)}>
          {showReviewForm ? "Cancel" : "+ Write a Review"}
        </Button>

        {showReviewForm && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} onClick={() => setReviewForm({ ...reviewForm, rating: n })} className="text-2xl">
                    {n <= reviewForm.rating ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Title</Label><Input value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} placeholder="Great place to work!" className="mt-1" /></div>
            <div><Label>Pros</Label><textarea value={reviewForm.pros} onChange={(e) => setReviewForm({ ...reviewForm, pros: e.target.value })} placeholder="What did you enjoy?" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-[60px] resize-y" /></div>
            <div><Label>Cons</Label><textarea value={reviewForm.cons} onChange={(e) => setReviewForm({ ...reviewForm, cons: e.target.value })} placeholder="What could be better?" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-[60px] resize-y" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewForm.isAnonymous} onChange={(e) => setReviewForm({ ...reviewForm, isAnonymous: e.target.checked })} /> Post anonymously</label>
            <Button onClick={handleSubmitReview} className="w-full" disabled={!reviewForm.title.trim() || !reviewForm.pros.trim() || !reviewForm.cons.trim()}>Submit Review</Button>
          </div>
        )}

        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{review.reviewerName}</p>
                <span className="text-sm text-orange-400">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
              </div>
              <span className="text-xs text-textSecondary">{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="font-medium text-sm mb-1">{review.title}</p>
            <div className="text-xs space-y-1">
              <p className="text-green-500">+ {review.pros}</p>
              <p className="text-red-400">- {review.cons}</p>
            </div>
          </div>
        ))}

        {reviews.length === 0 && !showReviewForm && (
          <p className="text-textSecondary text-sm text-center py-4">No reviews yet. Be the first to review!</p>
        )}
      </div>

      <div className="text-center">
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
