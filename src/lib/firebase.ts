import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { UserType } from "@/lib/user-types";

export { UserType } from "@/lib/user-types";

export interface FirestoreUser {
  id: string;
  name?: string | null;
  email: string;
  password?: string | null;
  userType: UserType;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirestoreCandidateProfile {
  id: string;
  userId: string;
  fullName?: string | null;
  profilePicture?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  currentRole?: string | null;
  yearsOfExperience?: number | null;
  skills?: string[] | null;
  education?: string[] | null;
  certifications?: string[] | null;
  languages?: string[] | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  desiredSalaryMin?: number | null;
  desiredSalaryMax?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirestoreEmployerProfile {
  id: string;
  userId: string;
  companyName?: string | null;
  logo?: string | null;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  headquarters?: string | null;
  aboutCompany?: string | null;
  recruiterName?: string | null;
  recruiterPosition?: string | null;
  recruiterEmail?: string | null;
  recruiterPhone?: string | null;
  subscriptionTier?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirestoreJob {
  id: string;
  employerId: string;
  title: string;
  description: string;
  responsibilities?: string[];
  requirements?: string[];
  salaryRangeMin?: number | null;
  salaryRangeMax?: number | null;
  location?: string | null;
  workArrangement?: string | null;
  employmentType?: string | null;
  experienceLevel?: string | null;
  skillsRequired?: string[];
  benefits?: string[];
  expiryDate?: string | null;
  isPublished?: boolean;
  isArchived?: boolean;
  companyName?: string | null;
  companyLogo?: string | null;
  recruiterName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function getApp() {
  const apps = getApps();
  if (!apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || "tinda-dev";
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (privateKey && clientEmail) {
      initializeApp({
        credential: cert({
          projectId,
          privateKey,
          clientEmail,
        }),
        projectId,
      });
    } else {
      initializeApp({ projectId });
    }
  }

  return getApps()[0];
}

export function getDb() {
  return getFirestore(getApp());
}

export async function getUserByEmail(email: string): Promise<FirestoreUser | null> {
  const db = getDb();
  const snapshot = await db.collection("users").where("email", "==", email).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...(doc.data() as Omit<FirestoreUser, "id">) };
}

export async function getUserById(userId: string): Promise<FirestoreUser | null> {
  const db = getDb();
  const doc = await db.collection("users").doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...(doc.data() as Omit<FirestoreUser, "id">) };
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function createUser(input: Omit<FirestoreUser, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = input.id || createId();
  const user: FirestoreUser = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("users").doc(id).set(user);
  return user;
}

export async function getCandidateProfile(userId: string): Promise<FirestoreCandidateProfile | null> {
  const db = getDb();
  const doc = await db.collection("candidateProfiles").doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...(doc.data() as Omit<FirestoreCandidateProfile, "id">) };
}

export async function upsertCandidateProfile(userId: string, data: Partial<FirestoreCandidateProfile>) {
  const db = getDb();
  const now = new Date().toISOString();
  const profile: FirestoreCandidateProfile = {
    id: userId,
    userId,
    ...data,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  await db.collection("candidateProfiles").doc(userId).set(profile, { merge: true });
  return profile;
}

export async function getEmployerProfile(userId: string): Promise<FirestoreEmployerProfile | null> {
  const db = getDb();
  const doc = await db.collection("employerProfiles").doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...(doc.data() as Omit<FirestoreEmployerProfile, "id">) };
}

export async function upsertEmployerProfile(userId: string, data: Partial<FirestoreEmployerProfile>) {
  const db = getDb();
  const now = new Date().toISOString();
  const profile: FirestoreEmployerProfile = {
    id: userId,
    userId,
    ...data,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  await db.collection("employerProfiles").doc(userId).set(profile, { merge: true });
  return profile;
}

export async function listJobs(filter: { employerId?: string } = {}) {
  const db = getDb();
  let ref: any = db.collection("jobs").orderBy("createdAt", "desc");

  if (filter.employerId) {
    ref = ref.where("employerId", "==", filter.employerId);
  }

  const snapshot = await ref.get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as Omit<FirestoreJob, "id">) }));
}

export async function getJobById(jobId: string) {
  const db = getDb();
  const doc = await db.collection("jobs").doc(jobId).get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...(doc.data() as Omit<FirestoreJob, "id">) };
}

export async function createJob(input: Omit<FirestoreJob, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = input.id || createId();
  const job: FirestoreJob = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("jobs").doc(id).set(job);
  return job;
}

export async function updateJob(jobId: string, data: Partial<FirestoreJob>) {
  const db = getDb();
  const now = new Date().toISOString();
  const ref = db.collection("jobs").doc(jobId);
  await ref.set({ ...data, updatedAt: now }, { merge: true });
  const snapshot = await ref.get();
  return { id: snapshot.id, ...(snapshot.data() as Omit<FirestoreJob, "id">) };
}

export async function deleteJob(jobId: string) {
  const db = getDb();
  await db.collection("jobs").doc(jobId).delete();
}

export async function listCandidateUsers() {
  const db = getDb();
  const snapshot = await db.collection("users").where("userType", "==", UserType.Candidate).get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as Omit<FirestoreUser, "id">) }));
}

export async function listSwipesBySwiper(swiperId: string) {
  const db = getDb();
  const snapshot = await db.collection("swipes").where("swiperId", "==", swiperId).get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
}

export async function saveSwipe(input: {
  id?: string;
  swiperId: string;
  targetId: string;
  targetJobId?: string | null;
  isLike: boolean;
  isSuperLike?: boolean;
}) {
  const db = getDb();
  const id = input.id || createId();
  const swipe = {
    id,
    swiperId: input.swiperId,
    targetId: input.targetId,
    targetJobId: input.targetJobId || null,
    isLike: input.isLike,
    isSuperLike: input.isSuperLike || false,
    createdAt: new Date().toISOString(),
  };

  await db.collection("swipes").doc(id).set(swipe);
  return swipe;
}

export async function updateSwipe(swipeId: string, data: Record<string, unknown>) {
  const db = getDb();
  const ref = db.collection("swipes").doc(swipeId);
  await ref.set(data, { merge: true });
  const snapshot = await ref.get();
  return { id: snapshot.id, ...(snapshot.data() as Record<string, unknown>) };
}

export async function createMatch(input: { candidateId: string; employerId: string; jobId?: string | null }) {
  const db = getDb();
  const id = createId();
  const match = {
    id,
    candidateId: input.candidateId,
    employerId: input.employerId,
    jobId: input.jobId || null,
    createdAt: new Date().toISOString(),
  };

  await db.collection("matches").doc(id).set(match);
  return match;
}

export async function createConversation(input: { matchId: string; participant1Id: string; participant2Id: string }) {
  const db = getDb();
  const conversation = {
    id: input.matchId,
    matchId: input.matchId,
    participant1Id: input.participant1Id,
    participant2Id: input.participant2Id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection("conversations").doc(input.matchId).set(conversation);
  return conversation;
}
