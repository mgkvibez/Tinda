import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCandidateProfile, listCandidateUsers, listJobs } from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getCandidateProfile(user.id)
    if (!profile) return NextResponse.json({ message: 'Complete your profile first' }, { status: 400 })

    const role = profile.currentRole || 'Professional'
    const skills = profile.skills || []
    const experience = profile.yearsOfExperience || 0
    const location = profile.location || 'Unknown'

    // Get all candidates for benchmarking
    const allCandidates = await listCandidateUsers()
    const profiles: any[] = []
    for (const c of allCandidates) {
      if (c.id === user.id) continue
      const p = await getCandidateProfile(c.id)
      if (p) profiles.push({ ...p, userId: c.id })
    }

    // Filter by similar role
    const similarRole = profiles.filter((p) =>
      (p.currentRole || '').toLowerCase().includes(role.toLowerCase().split(' ')[0]) ||
      role.toLowerCase().includes((p.currentRole || '').toLowerCase().split(' ')[0]),
    )
    const benchmarkPool = similarRole.length > 5 ? similarRole : profiles

    // Benchmark metrics
    const skillCounts = benchmarkPool.map((p) => (p.skills || []).length)
    const expYears = benchmarkPool.map((p) => p.yearsOfExperience || 0)
    const desiredMins = benchmarkPool.filter((p) => p.desiredSalaryMin).map((p) => p.desiredSalaryMin as number)
    const desiredMaxes = benchmarkPool.filter((p) => p.desiredSalaryMax).map((p) => p.desiredSalaryMax as number)

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
    const percentile = (val: number, arr: number[]) => {
      if (arr.length === 0) return 50
      const below = arr.filter((v) => v < val).length
      return Math.round((below / arr.length) * 100)
    }

    // Get market salary data from jobs
    const jobs = await listJobs()
    const relevantJobs = jobs.filter((j) =>
      j.title?.toLowerCase().includes(role.toLowerCase().split(' ')[0]) ||
      (j.skillsRequired || []).some((s: string) => skills.includes(s)),
    )
    const jobSalariesArr = relevantJobs
      .filter((j) => j.salaryRangeMin || j.salaryRangeMax)
      .flatMap((j) => [j.salaryRangeMin, j.salaryRangeMax].filter((s): s is number => typeof s === "number"))

    // Skills popularity among peers
    const allPeerSkills = benchmarkPool.flatMap((p) => p.skills || [])
    const skillFreq: Record<string, number> = {}
    for (const s of allPeerSkills) {
      const key = s.toLowerCase()
      skillFreq[key] = (skillFreq[key] || 0) + 1
    }
    const topPeerSkills = Object.entries(skillFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const userSkillCount = skills.length
    const userExp = experience
    const userSalaryMin = profile.desiredSalaryMin || 0
    const userSalaryMax = profile.desiredSalaryMax || 0

    return NextResponse.json({
      role,
      peerCount: benchmarkPool.length,
      totalCandidates: allCandidates.length - 1,
      skills: {
        yourCount: userSkillCount,
        peerAverage: avg(skillCounts),
        peerMax: Math.max(...skillCounts, 0),
        percentile: percentile(userSkillCount, skillCounts),
        topPeerSkills: topPeerSkills.map(([skill, count]) => ({
          skill: skill.charAt(0).toUpperCase() + skill.slice(1),
          popularity: count,
          youHave: skills.map((s) => s.toLowerCase()).includes(skill),
        })),
      },
      experience: {
        yourYears: userExp,
        peerAverage: avg(expYears),
        peerMax: Math.max(...expYears, 0),
        percentile: percentile(userExp, expYears),
      },
      salary: {
        yourMin: userSalaryMin,
        yourMax: userSalaryMax,
        peerAvgMin: avg(desiredMins),
        peerAvgMax: avg(desiredMaxes),
        percentile: percentile(userSalaryMax || userSalaryMin, [...desiredMins, ...desiredMaxes]),
        marketAvg: avg(jobSalariesArr),
        marketMin: jobSalariesArr.length > 0 ? Math.min(...jobSalariesArr) : 0,
        marketMax: jobSalariesArr.length > 0 ? Math.max(...jobSalariesArr) : 0,
        marketJobs: relevantJobs.length,
      },
      summary: buildSummary(userSkillCount, avg(skillCounts), userExp, avg(expYears),
        userSalaryMax || userSalaryMin, avg([...desiredMins, ...desiredMaxes].map(Number)) || avg(jobSalariesArr),
        benchmarkPool.length),
    })
  } catch (error) {
    console.error('Peer benchmark error:', error)
    return NextResponse.json({ message: 'Benchmarking failed' }, { status: 500 })
  }
}

function buildSummary(
  userSkills: number, peerSkills: number,
  userExp: number, peerExp: number,
  userSalary: number, peerSalary: number,
  peerCount: number,
): string {
  let summary = `You're being compared against ${peerCount} peers in similar roles.\n\n`

  if (userSkills > peerSkills) {
    summary += `You have more skills than the average peer (${userSkills} vs ${peerSkills}) — great job diversifying your toolkit. `
  } else if (userSkills < peerSkills) {
    summary += `You have fewer skills than the average peer (${userSkills} vs ${peerSkills}) — consider adding more to stay competitive. `
  } else {
    summary += `Your skill count is on par with peers (${userSkills} skills each). `
  }

  if (userExp > peerExp) {
    summary += `You have more experience (${userExp} vs ${peerExp} years) — leverage this in negotiations. `
  } else if (userExp < peerExp) {
    summary += `You have less experience (${userExp} vs ${peerExp} years) — focus on skill depth and portfolio. `
  }

  if (userSalary > 0 && peerSalary > 0) {
    if (userSalary > peerSalary) {
      summary += `Your salary expectations are above peer average ($${userSalary.toLocaleString()} vs $${peerSalary.toLocaleString()}) — make sure you can justify the premium.`
    } else {
      summary += `Your salary expectations are below peer average ($${userSalary.toLocaleString()} vs $${peerSalary.toLocaleString()}) — you may be undervaluing yourself.`
    }
  }

  return summary
}
