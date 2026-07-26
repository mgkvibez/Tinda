import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getUserById, getEmployerProfile, getCandidateProfile, listJobs, UserType } from '@/lib/firebase'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { targetUserId } = body as { targetUserId?: string }

    // If no target specified, compute for self
    const userId = targetUserId || user.id
    const isSelf = userId === user.id

    const userRecord = await getUserById(userId)
    if (!userRecord) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    // Gather signals
    const [reportsSnap, jobsSnap, swipesSnap, matchesSnap, employerProfile, candidateProfile] = await Promise.all([
      adminDb.collection('reports').where('targetId', '==', userId).get(),
      adminDb.collection('jobs').where('employerId', '==', userId).get(),
      adminDb.collection('swipes').where('swiperId', '==', userId).get(),
      adminDb.collection('matches').where('participant1Id', '==', userId).get(),
      getEmployerProfile(userId),
      getCandidateProfile(userId),
    ])

    const reportCount = reportsSnap.size
    const jobCount = jobsSnap.size
    const swipeCount = swipesSnap.size
    const matchCount = matchesSnap.size

    // Check verification level
    const verificationLevel = userRecord.verificationLevel || 0 // 0=none, 1=email, 2=phone, 3=identity

    // Check how long account has existed
    const accountAgeDays = userRecord.createdAt
      ? Math.floor((Date.now() - new Date(userRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Check if flagged
    const isFlagged = userRecord.flagged || false

    // Check profile completeness
    let profileComplete = false
    if (userRecord.userType === UserType.Employer && employerProfile) {
      profileComplete = !!(employerProfile.companyName && employerProfile.aboutCompany && employerProfile.industry)
    } else if (candidateProfile) {
      profileComplete = !!(candidateProfile.currentRole && candidateProfile.skills?.length > 0 && candidateProfile.bio)
    }

    // Check for suspicious patterns
    const suspiciousFlags: string[] = []

    // New account with lots of swipes (bot-like behavior)
    if (accountAgeDays < 7 && swipeCount > 200) {
      suspiciousFlags.push('New account with unusually high activity')
    }

    // No profile but posting jobs
    if (userRecord.userType === UserType.Employer && !profileComplete && jobCount > 0) {
      suspiciousFlags.push('Posting jobs without complete profile')
    }

    // Many reports
    if (reportCount >= 3) {
      suspiciousFlags.push(`${reportCount} reports filed against this account`)
    }

    // Account too new to have matches (possible scammer)
    if (accountAgeDays < 3 && matchCount > 10) {
      suspiciousFlags.push('Very new account with many matches — possible spam')
    }

    // Calculate trust score (0-100)
    let score = 50 // baseline

    // Verification boosts
    if (verificationLevel >= 1) score += 10 // email verified
    if (verificationLevel >= 2) score += 15 // phone verified
    if (verificationLevel >= 3) score += 20 // identity verified

    // Account age
    if (accountAgeDays > 30) score += 5
    if (accountAgeDays > 90) score += 5
    if (accountAgeDays > 365) score += 5

    // Profile completeness
    if (profileComplete) score += 10

    // Activity (positive engagement)
    if (jobCount > 0 || swipeCount > 10) score += 5
    if (matchCount > 0) score += 5

    // Deductions
    if (reportCount > 0) score -= reportCount * 8
    if (isFlagged) score -= 25
    if (suspiciousFlags.length > 0) score -= suspiciousFlags.length * 10

    // Clamp
    score = Math.max(0, Math.min(100, score))

    // Determine trust level
    let trustLevel: 'unverified' | 'low' | 'medium' | 'high' | 'elite'
    if (score < 30) trustLevel = 'unverified'
    else if (score < 50) trustLevel = 'low'
    else if (score < 70) trustLevel = 'medium'
    else if (score < 85) trustLevel = 'high'
    else trustLevel = 'elite'

    // Don't expose suspicious flags to non-self viewers for privacy
    return NextResponse.json({
      userId,
      score,
      trustLevel,
      verificationLevel,
      profileComplete,
      isFlagged,
      metrics: {
        accountAgeDays,
        jobCount,
        swipeCount,
        matchCount,
        reportCount: isSelf ? reportCount : reportCount > 0 ? reportCount : 0, // Show count to everyone, details only to self
      },
      suspiciousFlags: isSelf ? suspiciousFlags : undefined,
      recommendations: isSelf ? buildRecommendations(score, verificationLevel, profileComplete, suspiciousFlags) : undefined,
    })
  } catch (error) {
    console.error('Trust score error:', error)
    return NextResponse.json({ message: 'Failed to compute trust score' }, { status: 500 })
  }
}

function buildRecommendations(
  score: number, verificationLevel: number,
  profileComplete: boolean, suspiciousFlags: string[],
): string[] {
  const recs: string[] = []

  if (verificationLevel < 1) recs.push('Verify your email to increase your trust score (+10 points)')
  if (verificationLevel < 2) recs.push('Add phone verification to unlock higher trust (+15 points)')
  if (verificationLevel < 3) recs.push('Complete identity verification for maximum trust (+20 points)')
  if (!profileComplete) recs.push('Complete your profile — it adds 10 trust points')
  if (suspiciousFlags.length > 0) recs.push('Activity flagged as unusual — maintain normal usage patterns to improve your score')
  if (score < 50) recs.push('Your trust score is low. Focus on verification and profile completion to access more features.')

  return recs
}
