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
  isAnonymous?: boolean
  isVerified?: boolean
  streak?: number
  lastSwipeDate?: string | null
  totalSwipes?: number
  totalMatches?: number
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
  tags?: string[]
  lat?: number | null
  lng?: number | null
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
  lastMessage?: string | null
  lastMessageAt?: string | null
}

export interface MessageRecord {
  id: string
  conversationId: string
  senderId: string
  text: string
  read: boolean
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
  videoIntroUrl?: string | null
  lat?: number | null
  lng?: number | null
  availability?: string | null
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
  isVerified?: boolean
  cultureVideoUrl?: string | null
  teamPhotos?: string[]
  values?: string[]
  perks?: string[]
  mission?: string | null
}

export interface NotificationRecord {
  id: string
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, any>
  read: boolean
  createdAt: string
}

export interface BadgeRecord {
  id: string
  userId: string
  badgeType: string
  earnedAt: string
}

export interface SwipeAnalyticsRecord {
  id: string
  userId: string
  likedSkills: Record<string, number>
  likedLocations: Record<string, number>
  likedSalaryRanges: { min: number; max: number }
  likedJobTypes: Record<string, number>
  totalLiked: number
  totalPassed: number
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
    isAnonymous: false,
    isVerified: false,
    streak: 0,
    lastSwipeDate: null,
    totalSwipes: 0,
    totalMatches: 0,
    createdAt: now,
    updatedAt: now,
  }

  await adminDb.collection('users').doc(userRecord.uid).set(userData)
  return { id: userRecord.uid, ...userData } as UserRecord
}

export async function updateUserFields(uid: string, fields: Record<string, any>): Promise<void> {
  await adminDb.collection('users').doc(uid).set({ ...fields, updatedAt: new Date().toISOString() }, { merge: true })
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

export async function getEmployerProfileById(id: string): Promise<EmployerProfile | null> {
  const doc = await adminDb.collection('employerProfiles').doc(id).get()
  if (!doc.exists) return null
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

export async function listMatchesForUser(userId: string): Promise<MatchRecord[]> {
  const snap1 = await adminDb.collection('matches').where('candidateId', '==', userId).get()
  const snap2 = await adminDb.collection('matches').where('employerId', '==', userId).get()
  const all = [...snap1.docs, ...snap2.docs]
  const seen = new Set<string>()
  return all
    .filter((doc) => { if (seen.has(doc.id)) return false; seen.add(doc.id); return true })
    .map((doc) => ({ id: doc.id, ...doc.data() }) as MatchRecord)
}

// ─── Conversations & Messages ─────────────────────────────

export async function createConversation(data: Omit<ConversationRecord, 'id'>): Promise<ConversationRecord> {
  const ref = adminDb.collection('conversations').doc()
  await ref.set({ ...data, lastMessage: null, lastMessageAt: null, createdAt: new Date().toISOString() })
  return { id: ref.id, ...data }
}

export async function listConversationsForUser(userId: string): Promise<ConversationRecord[]> {
  const snap1 = await adminDb.collection('conversations').where('participant1Id', '==', userId).get()
  const snap2 = await adminDb.collection('conversations').where('participant2Id', '==', userId).get()
  const all = [...snap1.docs, ...snap2.docs]
  const seen = new Set<string>()
  return all
    .filter((doc) => { if (seen.has(doc.id)) return false; seen.add(doc.id); return true })
    .map((doc) => ({ id: doc.id, ...doc.data() }) as ConversationRecord)
}

export async function getConversation(id: string): Promise<ConversationRecord | null> {
  const doc = await adminDb.collection('conversations').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as ConversationRecord
}

export async function listMessages(conversationId: string): Promise<MessageRecord[]> {
  const snap = await adminDb.collection('messages')
    .where('conversationId', '==', conversationId)
    .orderBy('createdAt', 'asc')
    .limit(100)
    .get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MessageRecord)
}

export async function saveMessage(data: Omit<MessageRecord, 'id'>): Promise<MessageRecord> {
  const ref = adminDb.collection('messages').doc()
  const now = new Date().toISOString()
  await ref.set({ ...data, createdAt: now })

  // Update conversation's last message
  await adminDb.collection('conversations').doc(data.conversationId).set({
    lastMessage: data.text,
    lastMessageAt: now,
  }, { merge: true })

  return { id: ref.id, ...data }
}

export async function markMessagesRead(conversationId: string, userId: string): Promise<void> {
  const snap = await adminDb.collection('messages')
    .where('conversationId', '==', conversationId)
    .where('senderId', '!=', userId)
    .where('read', '==', false)
    .get()
  const batch = adminDb.batch()
  snap.docs.forEach((doc) => batch.set(doc.ref, { read: true }, { merge: true }))
  await batch.commit()
}

// ─── Notifications ─────────────────────────────────────────

export async function createNotification(data: Omit<NotificationRecord, 'id' | 'read' | 'createdAt'>): Promise<NotificationRecord> {
  const ref = adminDb.collection('notifications').doc()
  const now = new Date().toISOString()
  const notif = { ...data, read: false, createdAt: now }
  await ref.set(notif)
  return { id: ref.id, ...notif } as NotificationRecord
}

export async function listNotifications(userId: string): Promise<NotificationRecord[]> {
  const snap = await adminDb.collection('notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as NotificationRecord)
}

export async function markNotificationRead(id: string): Promise<void> {
  await adminDb.collection('notifications').doc(id).set({ read: true }, { merge: true })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const snap = await adminDb.collection('notifications')
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get()
  const batch = adminDb.batch()
  snap.docs.forEach((doc) => batch.set(doc.ref, { read: true }, { merge: true }))
  await batch.commit()
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const snap = await adminDb.collection('notifications')
    .where('userId', '==', userId)
    .where('read', '==', false)
    .count()
    .get()
  return snap.data().count
}

// ─── Gamification: Streaks & Badges ───────────────────────

export async function updateStreak(userId: string): Promise<{ streak: number; isNewDay: boolean }> {
  const userDoc = await adminDb.collection('users').doc(userId).get()
  if (!userDoc.exists) return { streak: 0, isNewDay: false }

  const userData = userDoc.data()
  const today = new Date().toISOString().split('T')[0]
  const lastSwipe = userData.lastSwipeDate?.split('T')[0]

  let newStreak = 1
  let isNewDay = true

  if (lastSwipe === today) {
    // Already swiped today — no streak change
    isNewDay = false
    newStreak = userData.streak || 0
  } else if (lastSwipe) {
    const lastDate = new Date(lastSwipe)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      newStreak = (userData.streak || 0) + 1
    } else if (diffDays === 0) {
      newStreak = userData.streak || 1
      isNewDay = false
    } else {
      newStreak = 1
    }
  }

  const totalSwipes = (userData.totalSwipes || 0) + (isNewDay ? 1 : 0)

  await adminDb.collection('users').doc(userId).set({
    streak: newStreak,
    lastSwipeDate: new Date().toISOString(),
    totalSwipes,
    updatedAt: new Date().toISOString(),
  }, { merge: true })

  // Check for badge achievements
  await checkAndAwardBadges(userId, newStreak, totalSwipes)

  return { streak: newStreak, isNewDay }
}

export async function checkAndAwardBadges(userId: string, streak: number, totalSwipes: number): Promise<void> {
  const badges = [
    { type: 'first_swipe', threshold: 1, field: 'totalSwipes' },
    { type: 'streak_3', threshold: 3, field: 'streak' },
    { type: 'streak_7', threshold: 7, field: 'streak' },
    { type: 'streak_30', threshold: 30, field: 'streak' },
    { type: 'swipes_50', threshold: 50, field: 'totalSwipes' },
    { type: 'swipes_100', threshold: 100, field: 'totalSwipes' },
    { type: 'swipes_500', threshold: 500, field: 'totalSwipes' },
  ]

  for (const badge of badges) {
    const value = badge.field === 'streak' ? streak : totalSwipes
    if (value >= badge.threshold) {
      // Check if already awarded
      const existing = await adminDb.collection('badges')
        .where('userId', '==', userId)
        .where('badgeType', '==', badge.type)
        .limit(1)
        .get()
      if (existing.empty) {
        const ref = adminDb.collection('badges').doc()
        await ref.set({
          userId,
          badgeType: badge.type,
          earnedAt: new Date().toISOString(),
        })
      }
    }
  }
}

export async function listBadges(userId: string): Promise<BadgeRecord[]> {
  const snap = await adminDb.collection('badges').where('userId', '==', userId).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BadgeRecord)
}

export async function getLeaderboard(limit: number = 10): Promise<UserRecord[]> {
  const snap = await adminDb.collection('users')
    .orderBy('totalSwipes', 'desc')
    .limit(limit)
    .get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserRecord)
}

// ─── Swipe Analytics (for smart matching) ─────────────────

export async function getSwipeAnalytics(userId: string): Promise<SwipeAnalyticsRecord | null> {
  const doc = await adminDb.collection('swipeAnalytics').doc(userId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as SwipeAnalyticsRecord
}

export async function updateSwipeAnalytics(
  userId: string,
  job: JobRecord,
  isLike: boolean,
): Promise<void> {
  const ref = adminDb.collection('swipeAnalytics').doc(userId)
  const doc = await ref.get()

  const analytics: any = doc.exists ? doc.data() : {
    userId,
    likedSkills: {},
    likedLocations: {},
    likedSalaryRanges: { min: 0, max: 0 },
    likedJobTypes: {},
    totalLiked: 0,
    totalPassed: 0,
  }

  if (isLike) {
    // Track skills
    for (const skill of job.skillsRequired || []) {
      analytics.likedSkills[skill] = (analytics.likedSkills[skill] || 0) + 1
    }
    // Track location
    if (job.location) {
      analytics.likedLocations[job.location] = (analytics.likedLocations[job.location] || 0) + 1
    }
    // Track salary
    if (job.salaryRangeMin) {
      analytics.likedSalaryRanges.min = analytics.likedSalaryRanges.min || 0 + job.salaryRangeMin
    }
    if (job.salaryRangeMax) {
      analytics.likedSalaryRanges.max = analytics.likedSalaryRanges.max || 0 + job.salaryRangeMax
    }
    // Track job type
    if (job.employmentType) {
      analytics.likedJobTypes[job.employmentType] = (analytics.likedJobTypes[job.employmentType] || 0) + 1
    }
    analytics.totalLiked++
  } else {
    analytics.totalPassed++
  }

  await ref.set(analytics, { merge: true })
}
