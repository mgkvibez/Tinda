"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [userTypeLoading, setUserTypeLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUserDoc = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.userType) {
            setUserType(data.userType);
          } else {
            // Google sign-in user without a userType — show onboarding
            setShowOnboarding(true);
          }
        }
      } catch (error) {
        console.error("Error fetching user doc:", error);
      } finally {
        setUserTypeLoading(false);
      }
    };

    fetchUserDoc();
  }, [user]);

  const handleOnboarding = async (type: "Candidate" | "Employer") => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { userType: type, updatedAt: serverTimestamp() },
        { merge: true },
      );

      // Create the corresponding profile doc
      if (type === "Candidate") {
        await setDoc(
          doc(db, "candidateProfiles", user.uid),
          {
            userId: user.uid,
            fullName: user.displayName || user.email || "New User",
            profilePicture: user.photoURL || null,
            skills: [],
            education: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        await setDoc(
          doc(db, "employerProfiles", user.uid),
          {
            userId: user.uid,
            recruiterName: user.displayName || user.email || "New User",
            recruiterEmail: user.email || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      setUserType(type);
      setShowOnboarding(false);
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Failed to save your selection. Please try again.");
    }
  };

  if (loading || userTypeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-textSecondary">Loading...</p>
      </div>
    );
  }

  // Onboarding for Google users who don't have a userType yet
  if (showOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Welcome to Tinda!</h1>
            <p className="text-textSecondary">Tell us what you're here for.</p>
          </div>
          <RadioGroup
            onValueChange={(value) => handleOnboarding(value as "Candidate" | "Employer")}
          >
            <div className="flex flex-col gap-4">
              <label
                htmlFor="onboard-candidate"
                className="cursor-pointer rounded-2xl border border-border p-6 hover:border-primary transition-colors block"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="Candidate" id="onboard-candidate" />
                  <div>
                    <p className="font-semibold text-lg">I'm a Candidate</p>
                    <p className="text-textSecondary text-sm">Swipe through jobs and find your next role</p>
                  </div>
                </div>
              </label>
              <label
                htmlFor="onboard-employer"
                className="cursor-pointer rounded-2xl border border-border p-6 hover:border-primary transition-colors block"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="Employer" id="onboard-employer" />
                  <div>
                    <p className="font-semibold text-lg">I'm an Employer</p>
                    <p className="text-textSecondary text-sm">Post jobs and discover top talent</p>
                  </div>
                </div>
              </label>
            </div>
          </RadioGroup>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-textSecondary">Please log in to view your dashboard.</p>
      </div>
    );
  }

  // Candidate Dashboard
  if (userType === "Candidate") {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-textSecondary mt-1">Ready to find your next opportunity?</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/candidate/swipe" className="group">
            <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
              <div className="text-4xl mb-3">👆</div>
              <h2 className="text-xl font-semibold">Start Swiping</h2>
              <p className="text-textSecondary text-sm mt-1">Browse and swipe through available job openings</p>
            </div>
          </Link>
          <Link href="/candidate/profile/edit" className="group">
            <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
              <div className="text-4xl mb-3">📝</div>
              <h2 className="text-xl font-semibold">Edit Profile</h2>
              <p className="text-textSecondary text-sm mt-1">Update your skills, experience, and resume</p>
            </div>
          </Link>
          <div className="rounded-3xl border border-border p-6 bg-card h-full">
            <div className="text-4xl mb-3">💬</div>
            <h2 className="text-xl font-semibold">Messages</h2>
            <p className="text-textSecondary text-sm mt-1">Chat with employers you matched with (coming soon)</p>
          </div>
        </div>
      </div>
    );
  }

  // Employer Dashboard
  if (userType === "Employer") {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold">Hiring Dashboard</h1>
          <p className="text-textSecondary mt-1">Manage your job postings and discover talent.</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/employer/jobs" className="group">
            <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
              <div className="text-4xl mb-3">📋</div>
              <h2 className="text-xl font-semibold">Your Job Posts</h2>
              <p className="text-textSecondary text-sm mt-1">View, edit, and manage your listings</p>
            </div>
          </Link>
          <Link href="/employer/jobs/new" className="group">
            <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
              <div className="text-4xl mb-3">➕</div>
              <h2 className="text-xl font-semibold">Create Job</h2>
              <p className="text-textSecondary text-sm mt-1">Post a new role to start matching with candidates</p>
            </div>
          </Link>
          <Link href="/employer/profile/edit" className="group">
            <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
              <div className="text-4xl mb-3">🏢</div>
              <h2 className="text-xl font-semibold">Company Profile</h2>
              <p className="text-textSecondary text-sm mt-1">Update your company info and logo</p>
            </div>
          </Link>
        </div>

        <div className="rounded-3xl border border-border p-6 bg-card">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-xl font-semibold">Talent Discovery</h2>
          <p className="text-textSecondary text-sm mt-1">
            Swipe through candidate profiles to find your next hire.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/employer/swipe">Start Swiping</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fallback — shouldn't reach here
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-textSecondary">Something went wrong. Please try logging out and back in.</p>
    </div>
  );
}
