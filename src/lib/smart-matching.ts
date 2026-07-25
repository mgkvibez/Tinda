import 'server-only'
import { JobRecord, SwipeAnalyticsRecord, CandidateProfile, SwipeRecord } from './firebase'

/**
 * Smart Matching Algorithm
 * Scores jobs/candidates based on swipe analytics, profile data, and preferences.
 * Returns a ranked list with match scores and "why" explanations.
 */

interface ScoredJob {
  job: JobRecord
  score: number
  reasons: string[]
}

interface ScoredCandidate {
  candidateId: string
  fullName: string
  currentRole: string | null
  skills: string[]
  yearsOfExperience: number | null
  score: number
  reasons: string[]
}

export function scoreJobsForCandidate(
  jobs: JobRecord[],
  analytics: SwipeAnalyticsRecord | null,
  profile: CandidateProfile | null,
  swipedJobIds: Set<string>,
): ScoredJob[] {
  const scored = jobs
    .filter((job) => !swipedJobIds.has(job.id) && job.isPublished && !job.isArchived)
    .map((job) => {
      let score = 50 // Base score
      const reasons: string[] = []

      // 1. Skills match (weight: 25)
      if (profile?.skills && profile.skills.length > 0) {
        const matchingSkills = job.skillsRequired.filter((s) =>
          profile.skills.some((ps) => ps.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ps.toLowerCase())),
        )
        if (matchingSkills.length > 0) {
          score += matchingSkills.length * 5
          reasons.push(`${matchingSkills.length} matching skill${matchingSkills.length > 1 ? 's' : ''}`)
        }
      }

      // 2. Analytics-based preferences (weight: 20)
      if (analytics) {
        // Liked skills boost
        for (const skill of job.skillsRequired) {
          if (analytics.likedSkills[skill] > 0) {
            score += analytics.likedSkills[skill] * 2
            reasons.push(`You've liked similar skills before`)
            break
          }
        }

        // Location match
        if (job.location && analytics.likedLocations[job.location] > 0) {
          score += 5
          reasons.push(`You've liked jobs in ${job.location}`)
        }

        // Job type match
        if (job.employmentType && analytics.likedJobTypes[job.employmentType] > 0) {
          score += 5
        }

        // Like ratio boost
        const total = analytics.totalLiked + analytics.totalPassed
        if (total > 10) {
          const likeRatio = analytics.totalLiked / total
          // Adjust base score based on pickiness
          score = Math.round(score * (0.8 + likeRatio * 0.4))
        }
      }

      // 3. Salary match (weight: 15)
      if (profile?.desiredSalaryMin && profile?.desiredSalaryMax) {
        if (job.salaryRangeMax && job.salaryRangeMax >= profile.desiredSalaryMin) {
          score += 10
          reasons.push(`Salary fits your range`)
        }
        if (job.salaryRangeMin && job.salaryRangeMin >= profile.desiredSalaryMin) {
          score += 5
        }
      }

      // 4. Location proximity (weight: 10)
      if (profile?.location && job.location) {
        if (profile.location.toLowerCase().includes(job.location.toLowerCase()) ||
          job.location.toLowerCase().includes(profile.location.toLowerCase())) {
          score += 10
          reasons.push(`Near your location`)
        }
      }

      // 5. Freshness boost (weight: 5)
      // Newer jobs get a slight boost
      score += Math.floor(Math.random() * 5)

      // 6. Expiry penalty
      if (job.expiryDate && new Date(job.expiryDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)) {
        score -= 10
      }

      // Cap score
      score = Math.max(0, Math.min(100, score))

      return { job, score, reasons: reasons.slice(0, 3) }
    })

  return scored.sort((a, b) => b.score - a.score)
}

export function scoreCandidatesForEmployer(
  candidates: Array<{ id: string; name: string }>,
  profiles: Map<string, CandidateProfile | null>,
  jobSkills: string[],
): ScoredCandidate[] {
  const scored = candidates.map((candidate) => {
    const profile = profiles.get(candidate.id)
    let score = 50
    const reasons: string[] = []

    // Skills match
    if (profile?.skills && jobSkills.length > 0) {
      const matchingSkills = profile.skills.filter((s) =>
        jobSkills.some((js) => js.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(js.toLowerCase())),
      )
      if (matchingSkills.length > 0) {
        score += matchingSkills.length * 10
        reasons.push(`${matchingSkills.length} matching skill${matchingSkills.length > 1 ? 's' : ''}: ${matchingSkills.slice(0, 2).join(', ')}`)
      }
    }

    // Experience boost
    if (profile?.yearsOfExperience && profile.yearsOfExperience > 0) {
      score += Math.min(profile.yearsOfExperience * 2, 15)
    }

    // Profile completeness boost
    if (profile) {
      const fields = [profile.bio, profile.portfolioUrl, profile.linkedinUrl, profile.githubUrl, profile.resumeUrl, profile.videoIntroUrl]
      const filled = fields.filter(Boolean).length
      score += filled * 2
    }

    score = Math.max(0, Math.min(100, score))

    return {
      candidateId: candidate.id,
      fullName: profile?.fullName ?? candidate.name,
      currentRole: profile?.currentRole ?? null,
      skills: profile?.skills ?? [],
      yearsOfExperience: profile?.yearsOfExperience ?? null,
      score,
      reasons: reasons.slice(0, 3),
    }
  })

  return scored.sort((a, b) => b.score - a.score)
}
