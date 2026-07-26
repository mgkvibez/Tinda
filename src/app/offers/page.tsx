"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type Offer = {
  id: string;
  jobTitle: string;
  companyName: string;
  salary: number;
  salaryCurrency: string;
  startDate: string;
  benefits: string[];
  terms: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"candidate" | "employer">("candidate");

  useEffect(() => {
    const role = window.location.search.includes("role=employer") ? "employer" : "candidate";
    setUserRole(role);
    fetchOffers(role);
  }, []);

  const fetchOffers = async (role: "candidate" | "employer") => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const res = await fetch(`/api/offers?role=${role}`, { headers: { Cookie: `__session=${token}` } });
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (offerId: string, status: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      await fetch("/api/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ offerId, status }),
      });
      fetchOffers(userRole);
    } catch (err) {
      console.error(err);
    }
  };

  const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{userRole === "employer" ? "Sent Offers" : "Job Offers"}</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">💼</p>
          <p className="text-textSecondary">{userRole === "employer" ? "No offers sent yet." : "No offers received yet."}</p>
          <p className="text-textSecondary text-sm mt-1">{userRole === "employer" ? "Create an offer from the pipeline!" : "Match with employers to receive offers!"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {offers.map((offer, i) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border p-5 ${offer.status === "pending" ? "border-primary/30 bg-primary/5" : offer.status === "accepted" ? "border-green-500/30 bg-green-500/5" : "border-border bg-card opacity-75"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{offer.jobTitle}</h3>
                    <p className="text-sm text-textSecondary">{offer.companyName}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${offer.status === "pending" ? "bg-primary/10 text-primary" : offer.status === "accepted" ? "bg-green-500/10 text-green-500" : "bg-muted text-textSecondary"}`}>
                    {offer.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="rounded-xl bg-muted p-2.5">
                    <p className="text-xs text-textSecondary">Salary</p>
                    <p className="font-semibold">{formatNaira(offer.salary)}/mo</p>
                  </div>
                  <div className="rounded-xl bg-muted p-2.5">
                    <p className="text-xs text-textSecondary">Start Date</p>
                    <p className="font-semibold">{new Date(offer.startDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {offer.benefits.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-textSecondary mb-1">Benefits</p>
                    <div className="flex flex-wrap gap-1">
                      {offer.benefits.map((b) => <span key={b} className="rounded-full bg-muted px-2 py-0.5 text-xs">{b}</span>)}
                    </div>
                  </div>
                )}

                {offer.terms && (
                  <div className="mb-3 rounded-xl bg-muted p-3">
                    <p className="text-xs text-textSecondary mb-1">Terms</p>
                    <p className="text-xs">{offer.terms}</p>
                  </div>
                )}

                {offer.status === "pending" && (
                  <div className="flex gap-2">
                    {userRole === "candidate" ? (
                      <>
                        <Button size="sm" className="flex-1" onClick={() => handleStatusUpdate(offer.id, "accepted")}>Accept</Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStatusUpdate(offer.id, "declined")}>Decline</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => handleStatusUpdate(offer.id, "withdrawn")}>Withdraw Offer</Button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
