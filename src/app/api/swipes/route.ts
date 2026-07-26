import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  createConversation,
  createMatch,
  getCandidateProfile,
  getEmployerProfile,
  getEmployerProfileById,
  getJobById,
  getUserById,
  listCandidateUsers,
  listJobs,
  listSwipesBySwiper,
  saveSwipe,
  updateSwipe,
  updateStreak,
  updateSwipeAnalytics,
  createNotification,
  updateUserFields,
  UserType,
} from '@/lib/firebase'
import * as z from 'zod'

const swipeSchema = z.object({
  targetType: z.enum(['job', 'candidate']),
  targetId: z.string(),
  targetJobId: z.string().nullable().optional(),
  isLike: z.boolean(),
  isSuperLike: z.boolean().optional().default(false),
})

export async function GET(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // Delegate to the smart matching endpoint
  const { scoreJobsForCandidate, scoreCandidatesForEmployer } = await import('@/lib/smart-matching')
  const { getSwipeAnalytics } = await import('@/lib/firebase')

  if (user.userType === UserType.Candidate) {
    const swipes = await listSwipesBySwiper(user.id)
    const swipedJobIds = new Set<string>(swipes.filter((s) => s.targetJobId).map((s) => s.targetJobId as string))
    const jobs = await listJobs()
    const analytics = await getSwipeAnalytics(user.id)
    const profile = await getCandidateProfile(user.id)

    const scored = scoreJobsForCandidate(jobs, analytics, profile, swipedJobIds)

    const visibleJobs = scored.slice(0, 20).map((s) => ({
      id: s.job.id,
      title: s.job.title,
      description: s.job.description,
      location: s.job.location,
      salaryRangeMin: s.job.salaryRangeMin,
      salaryRangeMax: s.job.salaryRangeMax,
      salaryDisplay: s.job.salaryRangeMin && s.job.salaryRangeMax
        ? `${s.job.salaryRangeMin.toLocaleString()} - ${s.job.salaryRangeMax.toLocaleString()}`
        : s.job.salaryRangeMin
          ? `From ${s.job.salaryRangeMin.toLocaleString()}`
          : 'Salary not disclosed',
      skillsRequired: s.job.skillsRequired,
      workArrangement: s.job.workArrangement,
      employmentType: s.job.employmentType,
      companyName: s.job.companyName,
      companyLogo: s.job.companyLogo,
      recruiterName: s.job.recruiterName,
      jobId: s.job.id,
      matchScore: s.score,
      matchReasons: s.reasons,
    }))

    return NextResponse.json(visibleJobs)
  }

  if (user.userType === UserType.Employer) {
    const swipes = await listSwipesBySwiper(user.id)
    const swipedIds = new Set(swipes.map((s) => s.targetId))
    const candidates = await listCandidateUsers()
    const employerProfile = await getEmployerProfile(user.id)

    const jobs = await listJobs({ employerId: employerProfile?.id || user.id })
    const jobSkills = jobs.flatMap((j) => j.skillsRequired)

    const profiles = new Map<string, any>()
    for (const candidate of candidates) {
      profiles.set(candidate.id, await getCandidateProfile(candidate.id))
    }

    const { scoreCandidatesForEmployer } = await import('@/lib/smart-matching')
    const scored = scoreCandidatesForEmployer(
      candidates.filter((c) => !swipedIds.has(c.id)),
      profiles,
      jobSkills,
    )

    return NextResponse.json(scored.slice(0, 20).map((s) => ({
      ...s,
      profilePicture: profiles.get(s.candidateId)?.profilePicture || null,
      videoIntroUrl: profiles.get(s.candidateId)?.videoIntroUrl || null,
      profile: profiles.get(s.candidateId) || null,
    })))
  }

  return NextResponse.json({ message: 'Unsupported user type' }, { status: 400 })
}

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = swipeSchema.parse(body)

    const swipes = await listSwipesBySwiper(user.id)
    const existingSwipe = swipes.find(
      (s) => s.targetId === data.targetId && (s.targetJobId ?? null) === (data.targetJobId ?? null),
    )

    const swipeData = {
      swiperId: user.id,
      targetId: data.targetId,
      targetJobId: data.targetJobId ?? null,
      isLike: data.isLike,
      isSuperLike: data.isSuperLike,
    }

    if (existingSwipe) {
      await updateSwipe(existingSwipe.id, swipeData)
    } else {
      await saveSwipe(swipeData)
    }

    // Update streak and analytics (candidates swiping jobs)
    if (data.targetType === 'job') {
      const streakResult = await updateStreak(user.id)
      const job = await getJobById(data.targetId)
      if (job) {
        await updateSwipeAnalytics(user.id, job, data.isLike)
      }
    }

    let createdMatch = null

    // Candidate likes a job → check if the employer already liked this candidate
    if (data.targetType === 'job' && user.userType === UserType.Candidate && data.isLike) {
      const job = await getJobById(data.targetId)
      if (job) {
        const employerProfile = await getEmployerProfileById(job.employerId)
        if (employerProfile) {
          const employerSwipes = await listSwipesBySwiper(employerProfile.userId)
          const employerSwipe = employerSwipes.find((s) => s.targetId === user.id && s.isLike)

          if (employerSwipe) {
            const match = await createMatch({
              candidateId: user.id,
              employerId: employerProfile.userId,
              jobId: job.id,
            })
            createdMatch = match
            const conv = await createConversation({
              matchId: match.id,
              participant1Id: user.id,
              participant2Id: employerProfile.userId,
            })

            // Update match counts (fix: operator precedence bug)
            const currentUser = await getUserById(user.id)
            await updateUserFields(user.id, { totalMatches: (currentUser?.totalMatches || 0) + 1 })

            // Notify both parties
            await createNotification({
              userId: user.id,
              type: 'new_match',
              title: 'New Match!',
              body: `You matched with ${employerProfile.companyName || 'an employer'} for ${job.title}!`,
              data: { matchId: match.id, conversationId: conv.id, jobId: job.id },
            })
            await createNotification({
              userId: employerProfile.userId,
              type: 'new_match',
              title: 'New Match!',
              body: `A candidate matched with your ${job.title} position!`,
              data: { matchId: match.id, conversationId: conv.id, jobId: job.id },
            })
          }
        }
      }
    }

    // Employer likes a candidate → check if the candidate already liked any of this employer's jobs
    if (data.targetType === 'candidate' && user.userType === UserType.Employer && data.isLike) {
      const employerProfile = await getEmployerProfile(user.id)
      if (employerProfile) {
        const candidateId = data.targetId
        const candidateSwipes = await listSwipesBySwiper(candidateId)

        for (const likedJob of candidateSwipes.filter((s) => s.isLike && s.targetJobId)) {
          const job = await getJobById(likedJob.targetJobId!)
          if (job && job.employerId === employerProfile.id) {
            const match = await createMatch({
              candidateId,
              employerId: user.id,
              jobId: job.id,
            })
            createdMatch = match
            const conv = await createConversation({
              matchId: match.id,
              participant1Id: candidateId,
              participant2Id: user.id,
            })

            // Notify both parties
            await createNotification({
              userId: candidateId,
              type: 'new_match',
              title: 'New Match!',
              body: `You matched with ${employerProfile.companyName || 'an employer'} for ${job.title}!`,
              data: { matchId: match.id, conversationId: conv.id, jobId: job.id },
            })
            await createNotification({
              userId: user.id,
              type: 'new_match',
              title: 'New Match!',
              body: `A candidate matched with your ${job.title} position!`,
              data: { matchId: match.id, conversationId: conv.id, jobId: job.id },
            })
            break // Only create one match
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Swipe recorded',
      match: createdMatch,
      streak: data.targetType === 'job' ? (await getUserById(user.id))?.streak || 0 : undefined,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    console.error('Swipe error:', error)
    return NextResponse.json({ message: 'Failed to record swipe.' }, { status: 500 })
  }
}
