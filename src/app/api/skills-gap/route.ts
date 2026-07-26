import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCandidateProfile, listJobs } from '@/lib/firebase'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { dreamRole, targetSkills } = body as { dreamRole?: string; targetSkills?: string[] }

    const profile = await getCandidateProfile(user.id)
    if (!profile) return NextResponse.json({ message: 'Complete your profile first' }, { status: 400 })

    const currentSkills = (profile.skills || []).map((s) => s.toLowerCase())
    const target = (targetSkills || []).map((s) => s.toLowerCase())

    // If no target skills specified, find them from jobs matching the dream role
    let requiredSkills = target
    let marketJobs: any[] = []

    if (dreamRole || requiredSkills.length === 0) {
      const allJobs = await listJobs()
      const roleLower = (dreamRole || profile.currentRole || '').toLowerCase()
      marketJobs = allJobs.filter((j) =>
        j.title?.toLowerCase().includes(roleLower) || j.description?.toLowerCase().includes(roleLower),
      )

      if (requiredSkills.length === 0) {
        const skillFreq: Record<string, number> = {}
        for (const job of (marketJobs.length > 0 ? marketJobs : allJobs)) {
          for (const skill of (job.skillsRequired || []) as string[]) {
            skillFreq[skill] = (skillFreq[skill] || 0) + 1
          }
        }
        requiredSkills = Object.entries(skillFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([skill]) => skill.toLowerCase())
      }
    }

    // Analyze gaps
    const have = requiredSkills.filter((s) => currentSkills.includes(s))
    const missing = requiredSkills.filter((s) => !currentSkills.includes(s))
    const extra = currentSkills.filter((s) => !requiredSkills.includes(s))

    // Build development plan
    const developmentPlan = missing.map((skill, i) => {
      const marketDemand = marketJobs.filter((j) =>
        (j.skillsRequired || []).map((s: string) => s.toLowerCase()).includes(skill),
      ).length

      let priority: 'high' | 'medium' | 'low' = 'medium'
      if (marketDemand > 5) priority = 'high'
      else if (marketDemand < 2) priority = 'low'

      let effort: 'quick' | 'moderate' | 'long-term' = 'moderate'
      const quickSkills = ['git', 'sql', 'excel', 'agile', 'scrum', 'jira', 'rest api', 'docker']
      const longSkills = ['machine learning', 'ai', 'kubernetes', 'system design', 'architecture', 'leadership']
      if (quickSkills.some((q) => skill.includes(q))) effort = 'quick'
      if (longSkills.some((l) => skill.includes(l))) effort = 'long-term'

      return {
        skill: skill.charAt(0).toUpperCase() + skill.slice(1),
        priority,
        effort,
        marketDemand,
        resources: getLearningResources(skill),
        timeline: effort === 'quick' ? '2-4 weeks' : effort === 'moderate' ? '1-3 months' : '3-6 months',
      }
    }).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    const matchScore = Math.round((have.length / Math.max(requiredSkills.length, 1)) * 100)

    return NextResponse.json({
      dreamRole: dreamRole || profile.currentRole || 'your target role',
      currentSkills: have.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      missingSkills: developmentPlan,
      extraSkills: extra.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      matchScore,
      totalRequired: requiredSkills.length,
      totalHave: have.length,
      totalMissing: missing.length,
      marketJobs: marketJobs.length,
      summary: matchScore >= 75
        ? `You're a strong match for ${dreamRole || 'this role'}! You have ${have.length} of ${requiredSkills.length} required skills. Focus on the remaining gaps to become an ideal candidate.`
        : matchScore >= 50
          ? `You're on track for ${dreamRole || 'this role'}. You have ${have.length} of ${requiredSkills.length} key skills. Close the gaps below to boost your match score significantly.`
          : `You have some work to do for ${dreamRole || 'this role'}. You currently have ${have.length} of ${requiredSkills.length} key skills. Start with the high-priority skills below.`,
    })
  } catch (error) {
    console.error('Skills gap error:', error)
    return NextResponse.json({ message: 'Analysis failed' }, { status: 500 })
  }
}

function getLearningResources(skill: string): string[] {
  const resources: Record<string, string[]> = {
    javascript: ['freeCodeCamp JavaScript course', 'MDN Web Docs', 'JavaScript.info'],
    typescript: ['TypeScript Handbook (official)', 'Matt Pocock\'s TypeScript tutorials', 'Total TypeScript'],
    react: ['React Official Docs', 'React.dev tutorial', 'Kent C. Dodds\' Epic React'],
    python: ['Python.org tutorial', 'Real Python', 'Automate the Boring Stuff'],
    sql: ['SQLBolt interactive', 'Mode SQL tutorial', 'LeetCode SQL problems'],
    aws: ['AWS Certified Solutions Architect course', 'AWS Free Tier hands-on', 'AWS Well-Architected Framework'],
    docker: ['Docker Official Get Started', 'Docker Mastery (Udemy)', 'Play with Docker labs'],
    kubernetes: ['Kubernetes Official Docs', 'Kubernetes the Hard Way', 'KodeKloud Kubernetes'],
    'machine learning': ['Andrew Ng\'s ML course (Coursera)', 'Fast.ai', 'Hands-On ML book'],
    git: ['Pro Git book (free)', 'Atlassian Git tutorial', 'Learn Git Branching (interactive)'],
  }

  for (const [key, value] of Object.entries(resources)) {
    if (skill.includes(key)) return value
  }

  return [
    `Search YouTube for "${skill} crash course"`,
    `Check freeCodeCamp or Coursera for "${skill}"`,
    `Build a small project using ${skill}`,
    `Join a ${skill} community on Discord or Reddit`,
  ]
}
