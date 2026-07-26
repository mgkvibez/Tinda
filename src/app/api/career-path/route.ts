import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCandidateProfile, listJobs } from '@/lib/firebase'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await getCandidateProfile(user.id)
    if (!profile) return NextResponse.json({ message: 'Complete your profile first' }, { status: 400 })

    const role = profile.currentRole || 'Professional'
    const skills = profile.skills || []
    const experience = profile.yearsOfExperience || 0

    // Build career path tree
    const careerPaths = buildCareerPaths(role, skills, experience)

    // Get market data for each path
    const allJobs = await listJobs()
    const marketData = careerPaths.map((path) => {
      const relevantJobs = allJobs.filter((j) =>
        path.roles.some((r) => j.title?.toLowerCase().includes(r.title.toLowerCase())),
      )
      const salaries = relevantJobs
        .filter((j) => j.salaryRangeMin || j.salaryRangeMax)
        .flatMap((j) => [j.salaryRangeMin, j.salaryRangeMax].filter((s): s is number => typeof s === 'number'))

      return {
        ...path,
        marketJobs: relevantJobs.length,
        avgSalary: salaries.length > 0 ? Math.round(salaries.reduce((a: number, b: number) => a + b, 0) / salaries.length) : null,
        salaryRange: salaries.length > 0
          ? { min: Math.min(...salaries), max: Math.max(...salaries) }
          : null,
      }
    })

    // Where they are now
    const currentLevel = experience < 2 ? 'Junior' : experience < 5 ? 'Mid-level' : experience < 8 ? 'Senior' : 'Lead/Principal'
    const nextStep = experience < 2 ? 'Junior' : experience < 5 ? 'Senior' : experience < 8 ? 'Lead' : 'Manager/Director'

    return NextResponse.json({
      currentRole: role,
      currentLevel,
      nextStep,
      experience,
      skills,
      paths: marketData,
      timeline: buildTimeline(role, experience),
      recommendations: buildRecommendations(role, skills, experience, marketData),
    })
  } catch (error) {
    console.error('Career path error:', error)
    return NextResponse.json({ message: 'Failed to build career path' }, { status: 500 })
  }
}

function buildCareerPaths(role: string, skills: string[], experience: number) {
  const roleLower = role.toLowerCase()
  const paths: Array<{
    id: string
    title: string
    description: string
    roles: Array<{ title: string; level: string; salaryEstimate: string; skills: string[] }>
    timeline: string
    difficulty: 'natural' | 'moderate' | 'challenging'
  }> = []

  // Vertical progression
  paths.push({
    id: 'vertical',
    title: 'Vertical Growth',
    description: `Progress up the ${role} ladder to senior leadership`,
    roles: [
      { title: `Junior ${role}`, level: 'Entry', salaryEstimate: '$45k - $65k', skills: skills.slice(0, 3) },
      { title: role, level: 'Mid', salaryEstimate: '$65k - $90k', skills: skills.slice(0, 5) },
      { title: `Senior ${role}`, level: 'Senior', salaryEstimate: '$90k - $130k', skills: [...skills, 'System Design', 'Mentoring'] },
      { title: `Lead ${role}`, level: 'Lead', salaryEstimate: '$120k - $160k', skills: [...skills, 'Architecture', 'Leadership', 'Mentoring'] },
      { title: `${role} Manager`, level: 'Manager', salaryEstimate: '$140k - $200k', skills: ['Leadership', 'Strategy', 'Budgeting', 'Hiring', 'Project Management'] },
    ],
    timeline: '3-8 years',
    difficulty: 'natural',
  })

  // Specialization paths based on skills
  if (skills.some((s) => ['javascript', 'typescript', 'react', 'python', 'java', 'node'].includes(s.toLowerCase()))) {
    paths.push({
      id: 'specialist',
      title: 'Technical Specialist',
      description: 'Become a deep expert in a specific technology domain',
      roles: [
        { title: 'Generalist', level: 'Current', salaryEstimate: '$65k - $90k', skills: skills.slice(0, 5) },
        { title: 'Specialist', level: 'Mid-Senior', salaryEstimate: '$90k - $120k', skills: [skills[0] || 'Core Skill', 'Advanced Concepts', 'Best Practices'] },
        { title: 'Domain Expert', level: 'Senior', salaryEstimate: '$120k - $170k', skills: [skills[0] || 'Core Skill', 'Architecture', 'Performance', 'Security'] },
        { title: 'Principal Engineer', level: 'Principal', salaryEstimate: '$160k - $250k', skills: ['Deep Expertise', 'Architecture', 'Cross-team Impact', 'Technical Vision'] },
      ],
      timeline: '4-6 years',
      difficulty: 'moderate',
    })
  }

  // Management path
  paths.push({
    id: 'management',
    title: 'Leadership & Management',
    description: 'Transition from individual contributor to people leader',
    roles: [
      { title: role, level: 'IC', salaryEstimate: '$65k - $90k', skills: skills.slice(0, 5) },
      { title: 'Team Lead', level: 'Lead', salaryEstimate: '$90k - $120k', skills: [...skills.slice(0, 3), 'Mentoring', 'Code Review'] },
      { title: 'Engineering Manager', level: 'Manager', salaryEstimate: '$120k - $170k', skills: ['People Management', '1:1s', 'Performance Reviews', 'Hiring', 'Roadmaps'] },
      { title: 'Director', level: 'Director', salaryEstimate: '$170k - $250k', skills: ['Org Design', 'Strategy', 'Budgeting', 'Stakeholder Management'] },
      { title: 'VP / CTO', level: 'Executive', salaryEstimate: '$250k - $400k+', skills: ['Vision', 'Fundraising', 'Board Management', 'Industry Leadership'] },
    ],
    timeline: '5-10 years',
    difficulty: 'challenging',
  })

  // Entrepreneurial path
  paths.push({
    id: 'founder',
    title: 'Entrepreneur / Consultant',
    description: 'Leverage your expertise to start your own venture or freelance',
    roles: [
      { title: role, level: 'IC', salaryEstimate: '$65k - $90k', skills: skills.slice(0, 5) },
      { title: 'Freelancer', level: 'Independent', salaryEstimate: '$80k - $150k', skills: [...skills.slice(0, 4), 'Client Acquisition', 'Invoicing'] },
      { title: 'Consultant', level: 'Senior', salaryEstimate: '$120k - $250k', skills: [...skills.slice(0, 3), 'Business Development', 'Contracting', 'Strategy'] },
      { title: 'Founder / CTO', level: 'Executive', salaryEstimate: 'Variable ($0 - $1M+)', skills: ['Product', 'Fundraising', 'Hiring', 'Sales', 'Strategy'] },
    ],
    timeline: 'Variable',
    difficulty: 'challenging',
  })

  return paths
}

function buildTimeline(role: string, experience: number) {
  const milestones = [
    { year: 0, title: `Current: ${role}`, status: 'now' },
    { year: 1, title: 'Skill deepening & portfolio building', status: experience < 3 ? 'next' : 'done' },
    { year: 2, title: 'Senior role / specialization', status: experience < 5 ? 'future' : 'done' },
    { year: 4, title: 'Lead / Domain Expert', status: experience < 8 ? 'future' : 'done' },
    { year: 6, title: 'Manager / Principal', status: 'future' },
    { year: 8, title: 'Director / Independent', status: 'future' },
  ]
  return milestones.map((m) => ({
    ...m,
    year: experience + m.year,
  }))
}

function buildRecommendations(role: string, skills: string[], experience: number, paths: any[]) {
  const recs: string[] = []

  const bestPath = paths.reduce((best, p) =>
    (p.marketJobs || 0) > (best?.marketJobs || 0) ? p : best, paths[0])

  recs.push(`Based on market demand, the "${bestPath.title}" path has the most opportunities (${bestPath.marketJobs} matching jobs).`)
  recs.push(`You're currently at ${experience} years of experience — focus on the next 1-2 years building toward a Senior role.`)
  if (skills.length < 5) recs.push(`You have ${skills.length} skills listed. Adding 3-5 more in-demand skills will dramatically increase your match rate.`)
  recs.push('Don\'t limit yourself to one path — keep both vertical and horizontal options open for the first 5 years.')
  if (experience > 5) recs.push('With your experience, start building leadership skills (mentoring, code review, project ownership) to keep management options open.')

  return recs
}
