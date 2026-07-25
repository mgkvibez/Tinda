"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { StreakBadge } from "@/components/streak-badge";
import { ProfileCompletionMeter } from "@/components/profile-completion-meter";
import { calculateCandidateCompletion, calculateEmployerCompletion } from "@/lib/profile-completion";

type Conversation = {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  matchId: string;
};

type Badge = {
  badgeType: string;
  label: string;
  icon: string;
  description: string;
  earnedAt: string;
};

type LeaderboardEntry = {
  rank: number;
  name: string;
  streak: number;
  totalSwipes: number;
  isYou: boolean;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [userTypeLoading, setUserTypeLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalSwipes, setTotalSwipes] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [profileData, setProfileData] = useState<any>(null);

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
            setShowOnboarding(true);
          }
          setStreak(data.streak || 0);
          setTotalSwipes(data.totalSwipes || 0);
          setTotalMatches(data.totalMatches || 0);
        }
      } catch (error) {
        console.error("Error fetching user doc:", error);
      } finally {
        setUserTypeLoading(false);
      }
    };

    fetchUserDoc();

    // Real-time conversations
    const q1 = query(collection(db, "conversations"), where("participant1Id", "==", user.uid), orderBy("lastMessageAt", "desc"));
    const q2 = query(collection(db, "conversations"), where("participant2Id", "==", user.uid), orderBy("lastMessageAt", "desc"));

    const unsub1 = onSnapshot(q1, (snap) => {
      setConversations((prev) => {
        const existing = new Map(prev.map((c) => [c.id, c]));
        snap.docs.forEach((d) => existing.set(d.id, { id: d.id, ...d.data() } as Conversation));
        return Array.from(existing.values()).sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt as any).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt as any).getTime() : 0;
          return bTime - aTime;
        });
      });
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      setConversations((prev) => {
        const existing = new Map(prev.map((c) => [c.id, c]));
        snap.docs.forEach((d) => existing.set(d.id, { id: d.id, ...d.data() } as Conversation));
        return Array.from(existing.values()).sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt as any).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt as any).getTime() : 0;
          return bTime - aTime;
        });
      });
    });

    // Fetch gamification stats
    const fetchGamification = async () => {
      try {
        const token = await getIdToken(user);
        const res = await fetch("/api/gamification", {
          headers: { Cookie: `__session=${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBadges(data.badges || []);
        }

        const lbRes = await fetch("/api/gamification?action=leaderboard", {
          headers: { Cookie: `__session=${token}` },
        });
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboard(lbData.leaderboard || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchGamification();

    // Fetch profile for completion meter
    const fetchProfile = async () => {
      try {
        if (userType === "Candidate") {
          const profileDoc = await getDoc(doc(db, "candidateProfiles", user.uid));
          if (profileDoc.exists()) {
            setProfileData({ id: profileDoc.id, ...profileDoc.data() });
          }
        } else if (userType === "Employer") {
          const profilesSnap = await getDocs(query(collection(db, "employerProfiles"), where("userId", "==", user.uid)));
          if (!profilesSnap.empty) {
            const d = profilesSnap.docs[0];
            setProfileData({ id: d.id, ...d.data() });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (userType) fetchProfile();

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, userType]);

  const handleOnboarding = async (type: "Candidate" | "Employer") => {
    if (!user) return;
    try {
      const { setDoc, serverTimestamp } = await import("firebase/firestore");
      await setDoc(
        doc(db, "users", user.uid),
        { userType: type, updatedAt: serverTimestamp() },
        { merge: true },
      );

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
    }
  };

  if (loading || userTypeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-textSecondary">Loading...</p>
      </div>
    );
  }

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
          <RadioGroup onValueChange={(value) => handleOnboarding(value as "Candidate" | "Employer")}>
            <div className="flex flex-col gap-4">
              <label htmlFor="onboard-candidate" className="cursor-pointer rounded-2xl border border-border p-6 hover:border-primary transition-colors block">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="Candidate" id="onboard-candidate" />
                  <div>
                    <p className="font-semibold text-lg">I'm a Candidate</p>
                    <p className="text-textSecondary text-sm">Swipe through jobs and find your next role</p>
                  </div>
                </div>
              </label>
              <label htmlFor="onboard-employer" className="cursor-pointer rounded-2xl border border-border p-6 hover:border-primary transition-colors block">
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

  const completion = userType === "Candidate"
    ? calculateCandidateCompletion(profileData)
    : calculateEmployerCompletion(profileData);

  // Candidate Dashboard
  if (userType === "Candidate") {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-textSecondary mt-1">Ready to find your next opportunity?</p>
          </div>
          <div className="flex items-center gap-3">
            <StreakBadge streak={streak} />
            <div className="rounded-full bg-muted px-3 py-1 text-sm text-textSecondary">
              {totalMatches} matches
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-3xl font-bold">{totalSwipes}</p>
            <p className="text-textSecondary text-sm">Total Swipes</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-3xl font-bold">{totalMatches}</p>
            <p className="text-textSecondary text-sm">Matches</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-3xl font-bold">{conversations.length}</p>
            <p className="text-textSecondary text-sm">Conversations</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-3xl font-bold">{badges.length}</p>
            <p className="text-textSecondary text-sm">Badges</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Actions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/candidate/swipe" className="group">
                <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
                  <div className="text-4xl mb-3">👆</div>
                  <h2 className="text-xl font-semibold">Start Swiping</h2>
                  <p className="text-textSecondary text-sm mt-1">Browse AI-matched jobs and swipe right</p>
                </div>
              </Link>
              <Link href="/candidate/profile/edit" className="group">
                <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
                  <div className="text-4xl mb-3">📝</div>
                  <h2 className="text-xl font-semibold">Edit Profile</h2>
                  <p className="text-textSecondary text-sm mt-1">Update skills, experience, and video intro</p>
                </div>
              </Link>
            </div>

            {/* Quick Links */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Link href="/candidate/insights" className="group">
                <div className="rounded-2xl border border-border p-4 bg-card hover:border-primary transition-colors h-full text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <p className="text-sm font-medium">Insights</p>
                </div>
              </Link>
              <Link href="/candidate/saved" className="group">
                <div className="rounded-2xl border border-border p-4 bg-card hover:border-primary transition-colors h-full text-center">
                  <div className="text-2xl mb-1">📌</div>
                  <p className="text-sm font-medium">Saved Jobs</p>
                </div>
              </Link>
              <Link href="/candidate/alerts" className="group">
                <div className="rounded-2xl border border-border p-4 bg-card hover:border-primary transition-colors h-full text-center">
                  <div className="text-2xl mb-1">🔔</div>
                  <p className="text-sm font-medium">Job Alerts</p>
                </div>
              </Link>
              <Link href="/interviews" className="group">
                <div className="rounded-2xl border border-border p-4 bg-card hover:border-primary transition-colors h-full text-center">
                  <div className="text-2xl mb-1">📅</div>
                  <p className="text-sm font-medium">Interviews</p>
                </div>
              </Link>
              <Link href="/candidate/resume-builder" className="group">
                <div className="rounded-2xl border border-border p-4 bg-card hover:border-primary transition-colors h-full text-center">
                  <div className="text-2xl mb-1">📄</div>
                  <p className="text-sm font-medium">Resume Builder</p>
                </div>
              </Link>
            </div>

            {/* Conversations */}
            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="font-semibold mb-3">Recent Conversations</h2>
              {conversations.length === 0 ? (
                <p className="text-textSecondary text-sm py-4 text-center">No conversations yet. Match with an employer to start chatting!</p>
              ) : (
                <div className="space-y-2">
                  {conversations.slice(0, 5).map((conv) => (
                    <Link key={conv.id} href={`/chat/${conv.id}`}>
                      <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted transition-colors">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-sm">💬</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.lastMessage || "Say hello!"}</p>
                          {conv.lastMessageAt && (
                            <p className="text-xs text-textSecondary">{new Date(conv.lastMessageAt as any).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <ProfileCompletionMeter completion={completion} />

            {/* Badges */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Your Badges</h3>
              {badges.length === 0 ? (
                <p className="text-textSecondary text-xs">Start swiping to earn badges!</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {badges.map((badge) => (
                    <div key={badge.badgeType} className="text-center p-2 rounded-xl bg-muted">
                      <div className="text-2xl">{badge.icon}</div>
                      <p className="text-xs mt-1">{badge.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3">Weekly Leaders</h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((entry) => (
                    <div key={entry.rank} className={`flex items-center gap-2 text-sm ${entry.isYou ? 'font-semibold' : ''}`}>
                      <span className="text-textSecondary w-4">{entry.rank}</span>
                      <span className="flex-1 truncate">{entry.name}{entry.isYou ? ' (you)' : ''}</span>
                      <span className="text-textSecondary">{entry.totalSwipes}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* Profile Completion */}
        <ProfileCompletionMeter completion={completion} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-textSecondary text-sm mt-1">Post a new role to start matching</p>
            </div>
          </Link>
          <Link href="/employer/profile/edit" className="group">
            <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
              <div className="text-4xl mb-3">🏢</div>
              <h2 className="text-xl font-semibold">Company Profile</h2>
              <p className="text-textSecondary text-sm mt-1">Add culture, values, and verification</p>
            </div>
          </Link>
          <Link href="/employer/swipe" className="group">
            <div className="rounded-3xl border border-border p-6 bg-card hover:border-primary transition-colors h-full">
              <div className="text-4xl mb-3">🔍</div>
              <h2 className="text-xl font-semibold">Talent Discovery</h2>
              <p className="text-textSecondary text-sm mt-1">Swipe through AI-ranked candidates</p>
            </div>
          </Link>
        </div>

        {/* Conversations */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-3">Recent Conversations</h2>
          {conversations.length === 0 ? (
            <p className="text-textSecondary text-sm py-4 text-center">No conversations yet. Swipe right on candidates to start chatting!</p>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 5).map((conv) => (
                <Link key={conv.id} href={`/chat/${conv.id}`}>
                  <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted transition-colors">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">💬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.lastMessage || "Say hello!"}</p>
                      {conv.lastMessageAt && (
                        <p className="text-xs text-textSecondary">{new Date(conv.lastMessageAt as any).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-textSecondary">Something went wrong. Please try logging out and back in.</p>
    </div>
  );
}
