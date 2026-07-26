import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listJobs,
  listCandidateUsers,
  getCandidateProfile,
  getEmployerProfile,
  listSwipesBySwiper,
  getSwipeAnalytics,
  getUserById,
  UserType,
} from '@/lib/firebase'
import { scoreJobsForCandidate, scoreCandidatesForEmployer } from '@/lib/smart-matching'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const user = session.user

  if (user.userType === UserType.Candidate) {
    // Smart job feed for candidates
    const jobs = await listJobs()
    const analytics = await getSwipeAnalytics(user.id)
    const profile = await getCandidateProfile(user.id)
    const swipes = await listSwipesBySwiper(user.id)
    const swipedJobIds = new Set<string>(swipes.filter((s) => s.targetJobId).map((s) => s.targetJobId as string))

    const scored = scoreJobsForCandidate(jobs, analytics, profile, swipedJobIds)

    return NextResponse.json({
      jobs: scored.map((s) => ({
        ...s.job,
        matchScore: s.score,
        matchReasons: s.reasons,
        salaryDisplay: s.job.salaryRangeMin && s.job.salaryRangeMax
          ? `$${s.job.salaryRangeMin.toLocaleString()} - $${s.job.salaryRangeMax.toLocaleString()}`
          : s.job.salaryRangeMin
            ? `From $${s.job.salaryRangeMin.toLocaleString()}`
            : 'Salary not disclosed',
      })),
    })
  }

  if (user.userType === UserType.Employer) {
    // Smart candidate feed for employers
    const swipes = await listSwipesBySwiper(user.id)
    const swipedIds = new Set(swipes.map((s) => s.targetId))
    const candidates = await listCandidateUsers()
    const employerProfile = await getEmployerProfile(user.id)

    // Get job skills for matching
    const jobs = await listJobs({ employerId: employerProfile?.id || user.id })
    const jobSkills = jobs.flatMap((j) => j.skillsRequired)

    const profiles = new Map<string, any>()
    for (const candidate of candidates) {
      profiles.set(candidate.id, await getCandidateProfile(candidate.id))
    }

    const scored = scoreCandidatesForEmployer(
      candidates.filter((c) => !swipedIds.has(c.id)),
      profiles,
      jobSkills,
    )

    return NextResponse.json({
      candidates: scored,
    })
  }

  return NextResponse.json({ message: 'Unsupported user type' }, { status: 400 })
}
