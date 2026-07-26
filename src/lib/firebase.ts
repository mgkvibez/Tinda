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

// ─── Application Tracking Pipeline ─────────────────────────

export type MatchStage = 'matched' | 'screening' | 'interviewing' | 'offer' | 'hired' | 'rejected'

export interface ApplicationRecord {
  id: string
  matchId: string
  candidateId: string
  employerId: string
  jobId: string
  stage: MatchStage
  notes: string | null
  updatedAt: string
}

export async function updateMatchStage(
  matchId: string,
  stage: MatchStage,
  notes?: string,
): Promise<void> {
  const match = await adminDb.collection('matches').doc(matchId).get()
  if (!match.exists) return
  const data = match.data() as MatchRecord
  const now = new Date().toISOString()
  await adminDb.collection('matches').doc(matchId).set({ stage, stageUpdatedAt: now, notes: notes || null }, { merge: true })

  // Notify candidate of stage change
  if (stage === 'interviewing') {
    await createNotification({
      userId: data.candidateId,
      type: 'stage_update',
      title: 'Application Update',
      body: `Your application moved to the Interview stage!`,
      data: { matchId, stage },
    })
  } else if (stage === 'offer') {
    await createNotification({
      userId: data.candidateId,
      type: 'stage_update',
      title: 'Offer Received!',
      body: `Congratulations! You've received an offer.`,
      data: { matchId, stage },
    })
  } else if (stage === 'rejected') {
    await createNotification({
      userId: data.candidateId,
      type: 'stage_update',
      title: 'Application Update',
      body: `Your application status has been updated.`,
      data: { matchId, stage },
    })
  }
}

export async function getEmployerPipeline(employerId: string): Promise<any[]> {
  const snap = await adminDb.collection('matches').where('employerId', '==', employerId).get()
  const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  // Enrich with candidate profiles
  const enriched = []
  for (const m of matches) {
    const profile = await getCandidateProfile(m.candidateId)
    const job = await getJobById(m.jobId)
    enriched.push({ ...m, candidateProfile: profile, job })
  }
  return enriched
}

export async function getCandidateApplications(candidateId: string): Promise<any[]> {
  const snap = await adminDb.collection('matches').where('candidateId', '==', candidateId).get()
  const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const enriched = []
  for (const m of matches) {
    const job = await getJobById(m.jobId)
    const employer = await getEmployerProfile(m.employerId)
    enriched.push({ ...m, job, employer })
  }
  return enriched
}

// ─── Interview Scheduling ─────────────────────────────────

export interface InterviewRecord {
  id: string
  matchId: string
  candidateId: string
  employerId: string
  jobId: string
  scheduledAt: string
  duration: number
  type: 'video' | 'phone' | 'in_person'
  location: string | null
  meetingUrl: string | null
  notes: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  createdAt: string
}

export async function scheduleInterview(data: Omit<InterviewRecord, 'id' | 'createdAt'>): Promise<InterviewRecord> {
  const ref = adminDb.collection('interviews').doc()
  const now = new Date().toISOString()
  await ref.set({ ...data, createdAt: now })

  // Notify candidate
  await createNotification({
    userId: data.candidateId,
    type: 'interview_scheduled',
    title: 'Interview Scheduled!',
    body: `Your interview is scheduled for ${new Date(data.scheduledAt).toLocaleDateString()}`,
    data: { interviewId: ref.id, matchId: data.matchId },
  })

  return { id: ref.id, ...data, createdAt: now }
}

export async function listInterviews(userId: string): Promise<InterviewRecord[]> {
  const snap1 = await adminDb.collection('interviews').where('candidateId', '==', userId).get()
  const snap2 = await adminDb.collection('interviews').where('employerId', '==', userId).get()
  const interviews = [...snap1.docs, ...snap2.docs].map((doc) => ({ id: doc.id, ...doc.data() }) as InterviewRecord)
  // Deduplicate
  const seen = new Set<string>()
  return interviews.filter((i) => {
    if (seen.has(i.id)) return false
    seen.add(i.id)
    return true
  })
}

export async function updateInterviewStatus(id: string, status: InterviewRecord['status']): Promise<void> {
  await adminDb.collection('interviews').doc(id).set({ status, updatedAt: new Date().toISOString() }, { merge: true })
}

export async function getInterviewById(id: string): Promise<InterviewRecord | null> {
  const doc = await adminDb.collection('interviews').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as InterviewRecord
}

// ─── Skills Assessments ───────────────────────────────────

export interface AssessmentRecord {
  id: string
  jobId: string
  employerId: string
  title: string
  description: string
  questions: AssessmentQuestion[]
  passingScore: number
  createdAt: string
}

export interface AssessmentQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  skill: string
}

export interface AssessmentResultRecord {
  id: string
  assessmentId: string
  jobId: string
  candidateId: string
  answers: number[]
  score: number
  passed: boolean
  completedAt: string
}

export async function createAssessment(data: Omit<AssessmentRecord, 'id' | 'createdAt'>): Promise<AssessmentRecord> {
  const ref = adminDb.collection('assessments').doc()
  const now = new Date().toISOString()
  await ref.set({ ...data, createdAt: now })
  return { id: ref.id, ...data, createdAt: now }
}

export async function getAssessmentByJob(jobId: string): Promise<AssessmentRecord | null> {
  const snap = await adminDb.collection('assessments').where('jobId', '==', jobId).limit(1).get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as AssessmentRecord
}

export async function getAssessmentById(id: string): Promise<AssessmentRecord | null> {
  const doc = await adminDb.collection('assessments').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as AssessmentRecord
}

export async function saveAssessmentResult(data: Omit<AssessmentResultRecord, 'id' | 'completedAt'>): Promise<AssessmentResultRecord> {
  const ref = adminDb.collection('assessmentResults').doc()
  const now = new Date().toISOString()
  await ref.set({ ...data, completedAt: now })

  // Notify employer if candidate passed
  if (data.passed) {
    await createNotification({
      userId: data.candidateId,
      type: 'assessment_passed',
      title: 'Assessment Passed!',
      body: `You passed the skills assessment with ${data.score}%!`,
      data: { assessmentId: data.assessmentId, jobId: data.jobId },
    })
  }

  return { id: ref.id, ...data, completedAt: now }
}

export async function getAssessmentResult(assessmentId: string, candidateId: string): Promise<AssessmentResultRecord | null> {
  const snap = await adminDb.collection('assessmentResults')
    .where('assessmentId', '==', assessmentId)
    .where('candidateId', '==', candidateId)
    .limit(1).get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as AssessmentResultRecord
}

// ─── Saved / Bookmarked Jobs ───────────────────────────────

export interface SavedJobRecord {
  id: string
  candidateId: string
  jobId: string
  savedAt: string
}

export async function saveJob(candidateId: string, jobId: string): Promise<void> {
  const ref = adminDb.collection('savedJobs').doc(`${candidateId}_${jobId}`)
  await ref.set({ candidateId, jobId, savedAt: new Date().toISOString() })
}

export async function unsaveJob(candidateId: string, jobId: string): Promise<void> {
  await adminDb.collection('savedJobs').doc(`${candidateId}_${jobId}`).delete()
}

export async function listSavedJobs(candidateId: string): Promise<SavedJobRecord[]> {
  const snap = await adminDb.collection('savedJobs').where('candidateId', '==', candidateId).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SavedJobRecord)
}

export async function isJobSaved(candidateId: string, jobId: string): Promise<boolean> {
  const doc = await adminDb.collection('savedJobs').doc(`${candidateId}_${jobId}`).get()
  return doc.exists
}

// ─── Job Alerts ────────────────────────────────────────────

export interface JobAlertRecord {
  id: string
  candidateId: string
  keywords: string[]
  location: string | null
  salaryMin: number | null
  jobTypes: string[]
  skills: string[]
  active: boolean
  createdAt: string
}

export async function createJobAlert(data: Omit<JobAlertRecord, 'id' | 'createdAt' | 'active'>): Promise<JobAlertRecord> {
  const ref = adminDb.collection('jobAlerts').doc()
  const now = new Date().toISOString()
  await ref.set({ ...data, active: true, createdAt: now })
  return { id: ref.id, ...data, active: true, createdAt: now }
}

export async function listJobAlerts(candidateId: string): Promise<JobAlertRecord[]> {
  const snap = await adminDb.collection('jobAlerts').where('candidateId', '==', candidateId).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as JobAlertRecord)
}

export async function updateJobAlert(id: string, data: Partial<JobAlertRecord>): Promise<void> {
  await adminDb.collection('jobAlerts').doc(id).set({ ...data, updatedAt: new Date().toISOString() }, { merge: true })
}

export async function deleteJobAlert(id: string): Promise<void> {
  await adminDb.collection('jobAlerts').doc(id).delete()
}

// ─── Employer Analytics ───────────────────────────────────

export async function getEmployerAnalytics(employerId: string): Promise<any> {
  // Get all jobs for this employer
  const jobs = await listJobs({ employerId })
  const jobIds = jobs.map((j) => j.id)

  // Get all matches
  const matchSnap = await adminDb.collection('matches').where('employerId', '==', employerId).get()
  const matches = matchSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  // Get all swipes on candidates
  const swipeSnap = await adminDb.collection('swipes').where('swiperId', '==', employerId).get()
  const swipes = swipeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  // Get all interviews
  const interviewSnap = await adminDb.collection('interviews').where('employerId', '==', employerId).get()
  const interviews = interviewSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  // Calculate metrics
  const totalJobs = jobs.length
  const activeJobs = jobs.filter((j) => j.isPublished && !j.isArchived).length
  const totalMatches = matches.length
  const totalSwipes = swipes.length
  const likesGiven = swipes.filter((s) => s.isLike).length
  const likeRate = totalSwipes > 0 ? Math.round((likesGiven / totalSwipes) * 100) : 0
  const matchRate = totalSwipes > 0 ? Math.round((totalMatches / totalSwipes) * 100) : 0

  // Stage breakdown
  const stageBreakdown: Record<string, number> = {}
  for (const m of matches) {
    const stage = m.stage || 'matched'
    stageBreakdown[stage] = (stageBreakdown[stage] || 0) + 1
  }

  // Per-job performance
  const jobPerformance = jobs.map((job) => {
    const jobMatches = matches.filter((m) => m.jobId === job.id)
    return {
      jobId: job.id,
      title: job.title,
      matches: jobMatches.length,
      stageBreakdown: jobMatches.reduce((acc: Record<string, number>, m) => {
        const stage = m.stage || 'matched'
        acc[stage] = (acc[stage] || 0) + 1
        return acc
      }, {}),
    }
  })

  // Interview stats
  const upcomingInterviews = interviews.filter((i) => {
    return i.status === 'scheduled' && new Date(i.scheduledAt) > new Date()
  })

  return {
    totalJobs,
    activeJobs,
    totalMatches,
    totalSwipes,
    likesGiven,
    likeRate,
    matchRate,
    stageBreakdown,
    jobPerformance,
    totalInterviews: interviews.length,
    upcomingInterviews: upcomingInterviews.length,
  }
}

// ─── Swipe Insights (Candidate) ────────────────────────────

export async function getCandidateInsights(candidateId: string): Promise<any> {
  const swipes = await listSwipesBySwiper(candidateId)
  const analytics = await getSwipeAnalytics(candidateId)
  const matches = await listMatchesForUser(candidateId)

  const totalSwipes = swipes.length
  const totalLikes = swipes.filter((s) => s.isLike).length
  const totalPasses = swipes.filter((s) => !s.isLike).length
  const likeRate = totalSwipes > 0 ? Math.round((totalLikes / totalSwipes) * 100) : 0
  const matchRate = totalLikes > 0 ? Math.round((matches.length / totalLikes) * 100) : 0

  // Top liked skills
  const topSkills = analytics
    ? Object.entries(analytics.likedSkills || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([skill, count]) => ({ skill, count }))
    : []

  // Top liked locations
  const topLocations = analytics
    ? Object.entries(analytics.likedLocations || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([location, count]) => ({ location, count }))
    : []

  // Top liked job types
  const topJobTypes = analytics
    ? Object.entries(analytics.likedJobTypes || {})
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }))
    : []

  return {
    totalSwipes,
    totalLikes,
    totalPasses,
    totalMatches: matches.length,
    likeRate,
    matchRate,
    topSkills,
    topLocations,
    topJobTypes,
  }
}

// ─── Resume Builder ───────────────────────────────────────

export interface ResumeRecord {
  id: string
  candidateId: string
  template: 'modern' | 'classic' | 'minimal'
  title: string
  summary: string
  experience: ResumeExperience[]
  education: ResumeEducation[]
  skills: string[]
  certifications: string[]
  projects: ResumeProject[]
  contact: {
    email: string | null
    phone: string | null
    location: string | null
    linkedinUrl: string | null
    githubUrl: string | null
    portfolioUrl: string | null
  }
  updatedAt: string
}

export interface ResumeExperience {
  id: string
  company: string
  role: string
  startDate: string
  endDate: string | null
  current: boolean
  description: string
}

export interface ResumeEducation {
  id: string
  institution: string
  degree: string
  field: string
  graduationYear: string
  description: string
}

export interface ResumeProject {
  id: string
  name: string
  description: string
  link: string | null
}

export async function getResume(candidateId: string): Promise<ResumeRecord | null> {
  const snap = await adminDb.collection('resumes').where('candidateId', '==', candidateId).limit(1).get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as ResumeRecord
}

export async function saveResume(candidateId: string, data: Partial<Omit<ResumeRecord, 'id' | 'candidateId' | 'updatedAt'>>): Promise<ResumeRecord> {
  const snap = await adminDb.collection('resumes').where('candidateId', '==', candidateId).limit(1).get()
  const now = new Date().toISOString()

  if (snap.empty) {
    // Auto-populate from candidate profile
    const profile = await getCandidateProfile(candidateId)
    const autoData = {
      ...data,
      candidateId,
      template: data.template || 'modern' as const,
      title: data.title || profile?.currentRole || 'My Resume',
      summary: data.summary || profile?.bio || '',
      skills: data.skills || profile?.skills || [],
      certifications: data.certifications || profile?.certifications || [],
      contact: data.contact || {
        email: null,
        phone: profile?.phone || null,
        location: profile?.location || null,
        linkedinUrl: profile?.linkedinUrl || null,
        githubUrl: profile?.githubUrl || null,
        portfolioUrl: profile?.portfolioUrl || null,
      },
      experience: data.experience || [],
      education: data.education?.length ? data.education : (profile?.education || []).map((e, i) => ({
        id: `edu_${i}`,
        institution: e,
        degree: '',
        field: '',
        graduationYear: '',
        description: '',
      })),
      projects: data.projects || [],
    }
    const ref = adminDb.collection('resumes').doc()
    await ref.set({ ...autoData, updatedAt: now })
    return { id: ref.id, ...autoData, updatedAt: now } as ResumeRecord
  } else {
    const ref = snap.docs[0].ref
    await ref.set({ ...data, candidateId, updatedAt: now }, { merge: true })
    const doc = await ref.get()
    return { id: doc.id, ...doc.data() } as ResumeRecord
  }
}

// ─── Mock Interview Practice ──────────────────────────────

export interface MockInterview {
  id: string
  candidateId: string
  jobId: string | null
  jobTitle: string | null
  questions: { id: string; question: string; category: string; answer: string; aiFeedback: string | null; score: number | null }[]
  overallScore: number | null
  createdAt: string
}

export async function getMockInterviews(candidateId: string): Promise<MockInterview[]> {
  const snap = await adminDb.collection('mockInterviews').where('candidateId', '==', candidateId).orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MockInterview[]
}

export async function saveMockInterview(candidateId: string, data: Omit<MockInterview, 'id' | 'candidateId' | 'createdAt'>): Promise<MockInterview> {
  const now = new Date().toISOString()
  const ref = adminDb.collection('mockInterviews').doc()
  await ref.set({ ...data, candidateId, createdAt: now })
  return { id: ref.id, candidateId, createdAt: now, ...data }
}

// ─── Company Reviews ───────────────────────────────────────

export interface CompanyReview {
  id: string
  employerId: string
  reviewerId: string
  reviewerName: string
  rating: number
  title: string
  pros: string
  cons: string
  isAnonymous: boolean
  createdAt: string
}

export async function getCompanyReviews(employerId: string): Promise<{ reviews: CompanyReview[]; avgRating: number; total: number }> {
  const snap = await adminDb.collection('companyReviews').where('employerId', '==', employerId).orderBy('createdAt', 'desc').get()
  const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CompanyReview[]
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  return { reviews, avgRating, total: reviews.length }
}

export async function createCompanyReview(data: Omit<CompanyReview, 'id' | 'createdAt'>): Promise<CompanyReview> {
  const now = new Date().toISOString()
  const ref = adminDb.collection('companyReviews').doc()
  await ref.set({ ...data, createdAt: now })
  return { id: ref.id, createdAt: now, ...data }
}

// ─── Offers ────────────────────────────────────────────────

export interface Offer {
  id: string
  matchId: string
  candidateId: string
  employerId: string
  jobId: string
  jobTitle: string
  companyName: string
  salary: number
  salaryCurrency: string
  startDate: string
  benefits: string[]
  terms: string
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn'
  createdAt: string
  respondedAt: string | null
}

export async function getOffers(userId: string, role: 'candidate' | 'employer'): Promise<Offer[]> {
  const field = role === 'candidate' ? 'candidateId' : 'employerId'
  const snap = await adminDb.collection('offers').where(field, '==', userId).orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Offer[]
}

export async function createOffer(data: Omit<Offer, 'id' | 'createdAt' | 'status' | 'respondedAt'>): Promise<Offer> {
  const now = new Date().toISOString()
  const ref = adminDb.collection('offers').doc()
  await ref.set({ ...data, status: 'pending', createdAt: now, respondedAt: null })
  return { id: ref.id, status: 'pending', createdAt: now, respondedAt: null, ...data }
}

export async function updateOfferStatus(offerId: string, status: Offer['status'], userId: string): Promise<Offer | null> {
  const ref = adminDb.collection('offers').doc(offerId)
  const doc = await ref.get()
  if (!doc.exists) return null
  const data = doc.data() as Offer
  // Only the right party can change status
  if (status === 'accepted' || status === 'declined') {
    if (data.candidateId !== userId) return null
  }
  if (status === 'withdrawn') {
    if (data.employerId !== userId) return null
  }
  await ref.set({ status, respondedAt: new Date().toISOString() }, { merge: true })
  const updated = await ref.get()
  return { id: updated.id, ...updated.data() } as Offer
}

// ─── Candidate Notes (employer private notes) ──────────────

export interface CandidateNote {
  id: string
  employerId: string
  candidateId: string
  matchId: string | null
  note: string
  color: string
  createdAt: string
}

export async function getCandidateNotes(employerId: string, candidateId: string): Promise<CandidateNote[]> {
  const snap = await adminDb.collection('candidateNotes').where('employerId', '==', employerId).where('candidateId', '==', candidateId).orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CandidateNote[]
}

export async function createCandidateNote(data: Omit<CandidateNote, 'id' | 'createdAt'>): Promise<CandidateNote> {
  const now = new Date().toISOString()
  const ref = adminDb.collection('candidateNotes').doc()
  await ref.set({ ...data, createdAt: now })
  return { id: ref.id, createdAt: now, ...data }
}

export async function deleteCandidateNote(noteId: string, employerId: string): Promise<void> {
  const ref = adminDb.collection('candidateNotes').doc(noteId)
  const doc = await ref.get()
  if (doc.exists && (doc.data() as CandidateNote).employerId === employerId) {
    await ref.delete()
  }
}

// ─── Referrals ─────────────────────────────────────────────

export interface Referral {
  id: string
  referrerId: string
  referrerName: string
  jobId: string
  jobTitle: string
  referredEmail: string
  referredName: string
  status: 'pending' | 'signed_up' | 'hired'
  reward: string
  createdAt: string
}

export async function getReferrals(referrerId: string): Promise<Referral[]> {
  const snap = await adminDb.collection('referrals').where('referrerId', '==', referrerId).orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Referral[]
}

export async function createReferral(data: Omit<Referral, 'id' | 'createdAt' | 'status'>): Promise<Referral> {
  const now = new Date().toISOString()
  const ref = adminDb.collection('referrals').doc()
  await ref.set({ ...data, status: 'pending', createdAt: now })
  return { id: ref.id, status: 'pending', createdAt: now, ...data }
}
