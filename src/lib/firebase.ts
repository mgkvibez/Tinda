import 'server-only'
import { adminDb, adminAuth } from './firebase/admin'

// ─── Types ────────────────────────────────────────────────

export enum UserType {
  Candidate = 'Candidate',
  Employer = 'Employer',
}

export interface UserRecord {
  id: string
  email: string
  name: string
  userType: UserType
  ownerId: string
}

export interface JobRecord {
  id: string
  employerId: string
  title: string
  description: string
  responsibilities: string[]
  requirements: string[]
  salaryRangeMin: number | null
  salaryRangeMax: number | null
  location: string | null
  workArrangement: string | null
  employmentType: string | null
  experienceLevel: string | null
  skillsRequired: string[]
  benefits: string[]
  expiryDate: string | null
  companyName: string | null
  companyLogo: string | null
  recruiterName: string | null
  isPublished: boolean
  isArchived: boolean
}

export interface SwipeRecord {
  id: string
  swiperId: string
  targetId: string
  targetJobId: string | null
  isLike: boolean
  isSuperLike: boolean
}

export interface MatchRecord {
  id: string
  candidateId: string
  employerId: string
  jobId: string
}

export interface ConversationRecord {
  id: string
  matchId: string
  participant1Id: string
  participant2Id: string
}

export interface CandidateProfile {
  id: string
  userId: string
  fullName: string | null
  profilePicture: string | null
  phone: string | null
  location: string | null
  bio: string | null
  currentRole: string | null
  yearsOfExperience: number | null
  skills: string[]
  education: string[]
  certifications: string[]
  languages: string[]
  resumeUrl: string | null
  portfolioUrl: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  desiredSalaryMin: number | null
  desiredSalaryMax: number | null
}

export interface EmployerProfile {
  id: string
  userId: string
  companyName: string | null
  logo: string | null
  industry: string | null
  companySize: string | null
  website: string | null
  headquarters: string | null
  aboutCompany: string | null
  recruiterName: string | null
  recruiterPosition: string | null
  recruiterEmail: string | null
  recruiterPhone: string | null
  subscriptionTier: string | null
}

// ─── Users ─────────────────────────────────────────────────

export async function getUserById(uid: string): Promise<UserRecord | null> {
  const doc = await adminDb.collection('users').doc(uid).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as UserRecord
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const snap = await adminDb.collection('users').where('email', '==', email).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as UserRecord
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  userType: UserType
}): Promise<UserRecord> {
  const userRecord = await adminAuth.createUser({
    email: data.email,
    password: data.password,
    displayName: data.name,
  })

  const now = new Date().toISOString()
  const userData = {
    uid: userRecord.uid,
    email: data.email,
    name: data.name,
    userType: data.userType,
    ownerId: userRecord.uid,
    createdAt: now,
    updatedAt: now,
  }

  await adminDb.collection('users').doc(userRecord.uid).set(userData)
  return { id: userRecord.uid, ...userData } as UserRecord
}

// ─── Candidate Profiles ───────────────────────────────────

export async function getCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  const doc = await adminDb.collection('candidateProfiles').doc(userId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as CandidateProfile
}

export async function upsertCandidateProfile(
  userId: string,
  data: Partial<Omit<CandidateProfile, 'id' | 'userId'>>,
): Promise<CandidateProfile> {
  const ref = adminDb.collection('candidateProfiles').doc(userId)
  await ref.set({ ...data, userId, updatedAt: new Date().toISOString() }, { merge: true })
  const doc = await ref.get()
  return { id: doc.id, ...doc.data() } as CandidateProfile
}

export async function listCandidateUsers(): Promise<UserRecord[]> {
  const snap = await adminDb.collection('users').where('userType', '==', UserType.Candidate).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserRecord)
}

// ─── Employer Profiles ────────────────────────────────────

export async function getEmployerProfile(userId: string): Promise<EmployerProfile | null> {
  const snap = await adminDb.collection('employerProfiles').where('userId', '==', userId).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as EmployerProfile
}

export async function upsertEmployerProfile(
  userId: string,
  data: Partial<Omit<EmployerProfile, 'id' | 'userId'>>,
): Promise<EmployerProfile> {
  const snap = await adminDb.collection('employerProfiles').where('userId', '==', userId).limit(1).get()
  const now = new Date().toISOString()

  if (snap.empty) {
    const ref = adminDb.collection('employerProfiles').doc()
    await ref.set({ ...data, userId, createdAt: now, updatedAt: now })
    const doc = await ref.get()
    return { id: doc.id, ...doc.data() } as EmployerProfile
  } else {
    const ref = snap.docs[0].ref
    await ref.set({ ...data, userId, updatedAt: now }, { merge: true })
    const doc = await ref.get()
    return { id: doc.id, ...doc.data() } as EmployerProfile
  }
}

// ─── Jobs ─────────────────────────────────────────────────

export async function createJob(data: Omit<JobRecord, 'id'>): Promise<JobRecord> {
  const ref = adminDb.collection('jobs').doc()
  const now = new Date().toISOString()
  await ref.set({ ...data, createdAt: now, updatedAt: now })
  return { id: ref.id, ...data }
}

export async function getJobById(id: string): Promise<JobRecord | null> {
  const doc = await adminDb.collection('jobs').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as JobRecord
}

export async function listJobs(filter?: { employerId?: string }): Promise<JobRecord[]> {
  let query: FirebaseFirestore.Query = adminDb.collection('jobs')
  if (filter?.employerId) {
    query = query.where('employerId', '==', filter.employerId)
  }
  const snap = await query.get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as JobRecord)
}

export async function updateJob(id: string, data: Partial<Omit<JobRecord, 'id'>>): Promise<JobRecord | null> {
  const ref = adminDb.collection('jobs').doc(id)
  await ref.set({ ...data, updatedAt: new Date().toISOString() }, { merge: true })
  const doc = await ref.get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as JobRecord
}

export async function deleteJob(id: string): Promise<void> {
  await adminDb.collection('jobs').doc(id).delete()
}

// ─── Swipes ───────────────────────────────────────────────

export async function listSwipesBySwiper(swiperId: string): Promise<SwipeRecord[]> {
  const snap = await adminDb.collection('swipes').where('swiperId', '==', swiperId).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SwipeRecord)
}

export async function saveSwipe(data: Omit<SwipeRecord, 'id'>): Promise<SwipeRecord> {
  const ref = adminDb.collection('swipes').doc()
  await ref.set({ ...data, createdAt: new Date().toISOString() })
  return { id: ref.id, ...data }
}

export async function updateSwipe(id: string, data: Partial<Omit<SwipeRecord, 'id'>>): Promise<void> {
  await adminDb.collection('swipes').doc(id).set({ ...data, updatedAt: new Date().toISOString() }, { merge: true })
}

// ─── Matches ──────────────────────────────────────────────

export async function createMatch(data: Omit<MatchRecord, 'id'>): Promise<MatchRecord> {
  const ref = adminDb.collection('matches').doc()
  await ref.set({ ...data, createdAt: new Date().toISOString() })
  return { id: ref.id, ...data }
}

// ─── Conversations ────────────────────────────────────────

export async function createConversation(data: Omit<ConversationRecord, 'id'>): Promise<ConversationRecord> {
  const ref = adminDb.collection('conversations').doc()
  await ref.set({ ...data, createdAt: new Date().toISOString() })
  return { id: ref.id, ...data }
}

export async function listConversationsForUser(userId: string): Promise<ConversationRecord[]> {
  const snap1 = await adminDb.collection('conversations').where('participant1Id', '==', userId).get()
  const snap2 = await adminDb.collection('conversations').where('participant2Id', '==', userId).get()
  const all = [...snap1.docs, ...snap2.docs]
  const seen = new Set<string>()
  return all
    .filter((doc) => {
      if (seen.has(doc.id)) return false
      seen.add(doc.id)
      return true
    })
    .map((doc) => ({ id: doc.id, ...doc.data() }) as ConversationRecord)
}
