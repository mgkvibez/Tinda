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
  employerId?: string;
  candidateId?: string;
  jobId?: string;
  salary: number;
  salaryCurrency: string;
  startDate: string;
  benefits: string[];
  terms: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
};

type Protection = {
  id: string;
  depositAmount: number;
  depositStatus: string;
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [protections, setProtections] = useState<Record<string, Protection | null>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"candidate" | "employer">("candidate");
  const [disputeOfferId, setDisputeOfferId] = useState<string | null>(null);
  const [disputeDesc, setDisputeDesc] = useState("");

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
        // Fetch protection status for each offer
        const protResults: Record<string, Protection | null> = {};
        await Promise.all(
          (data.offers || []).map(async (o: Offer) => {
            try {
              const protRes = await fetch(`/api/offer-protection?offerId=${o.id}`, { headers: { Cookie: `__session=${token}` } });
              if (protRes.ok) {
                const protData = await protRes.json();
                protResults[o.id] = protData.protection || null;
              } else {
                protResults[o.id] = null;
              }
            } catch {
              protResults[o.id] = null;
            }
          })
        );
        setProtections(protResults);
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

  const fundProtection = async (offerId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const offer = offers.find(o => o.id === offerId);
      if (!offer) return;
      // Create protection if it doesn't exist
      const prot = protections[offerId];
      if (!prot) {
        const createRes = await fetch("/api/offer-protection", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
          body: JSON.stringify({
            offerId,
            candidateId: offer.candidateId || "",
            employerId: offer.employerId || user.uid,
            jobId: offer.jobId || "",
            agreedSalary: offer.salary,
          }),
        });
        if (!createRes.ok) {
          console.error("Failed to create protection");
          return;
        }
      }
      // Fund it
      const protectionId = prot?.id || (await fetch(`/api/offer-protection?offerId=${offerId}`, { headers: { Cookie: `__session=${token}` } }).then(r => r.json())).protection?.id;
      if (protectionId) {
        await fetch("/api/offer-protection", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
          body: JSON.stringify({ protectionId, action: "fund" }),
        });
      }
      fetchOffers(userRole);
    } catch (err) {
      console.error(err);
    }
  };

  const releaseProtection = async (offerId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      const prot = protections[offerId];
      if (!prot) return;
      await fetch("/api/offer-protection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ protectionId: prot.id, action: "release" }),
      });
      fetchOffers(userRole);
    } catch (err) {
      console.error(err);
    }
  };

  const fileDispute = async (offer: Offer) => {
    if (disputeDesc.length < 10) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await getIdToken(user);
      await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({
          againstUserId: userRole === "candidate" ? offer.employerId : offer.candidateId,
          againstUserName: userRole === "candidate" ? offer.companyName : "Candidate",
          jobId: offer.jobId || null,
          matchId: null,
          type: "payment",
          description: disputeDesc,
        }),
      });
      setDisputeOfferId(null);
      setDisputeDesc("");
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
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">&#8592; Dashboard</Link>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">&#128188;</p>
          <p className="text-textSecondary">{userRole === "employer" ? "No offers sent yet." : "No offers received yet."}</p>
          <p className="text-textSecondary text-sm mt-1">{userRole === "employer" ? "Create an offer from the pipeline!" : "Match with employers to receive offers!"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {offers.map((offer, i) => {
              const prot = protections[offer.id];
              return (
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

                  {/* Offer Protection Status */}
                  {prot && (
                    <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-700">Offer Protection Deposit</p>
                          <p className="text-xs text-textSecondary">{formatNaira(prot.depositAmount)} (10% of salary)</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          prot.depositStatus === "released" ? "bg-green-100 text-green-700" :
                          prot.depositStatus === "funded" ? "bg-blue-100 text-blue-700" :
                          prot.depositStatus === "disputed" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {prot.depositStatus}
                        </span>
                      </div>
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
                        <>
                          {!prot && (
                            <Button size="sm" className="flex-1" onClick={() => fundProtection(offer.id)}>
                              Add Offer Protection
                            </Button>
                          )}
                          {prot && prot.depositStatus === "funded" && (
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => releaseProtection(offer.id)}>
                              Release Deposit
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleStatusUpdate(offer.id, "withdrawn")}>Withdraw</Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Dispute filing for accepted/declined offers */}
                  {offer.status !== "pending" && offer.status !== "withdrawn" && (
                    <div className="mt-2">
                      {disputeOfferId === offer.id ? (
                        <div className="space-y-2 p-3 bg-muted rounded-xl">
                          <textarea
                            placeholder="Describe the issue (min 10 characters)..."
                            value={disputeDesc}
                            onChange={(e) => setDisputeDesc(e.target.value)}
                            className="w-full p-2 rounded-lg bg-background border border-border text-sm min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => fileDispute(offer)}>Submit Dispute</Button>
                            <Button size="sm" variant="outline" onClick={() => { setDisputeOfferId(null); setDisputeDesc(""); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDisputeOfferId(offer.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          File a dispute about this offer
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
