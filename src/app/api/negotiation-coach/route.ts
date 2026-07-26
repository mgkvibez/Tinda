import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCandidateProfile, getJobById, listJobs } from '@/lib/firebase'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { jobId, currentSalary, targetSalary } = body as {
      jobId?: string
      currentSalary?: number
      targetSalary?: number
    }

    const profile = await getCandidateProfile(user.id)
    if (!profile) return NextResponse.json({ message: 'Complete your profile first' }, { status: 400 })

    let job: any = null
    if (jobId) {
      job = await getJobById(jobId)
    }

    // Gather market data
    const allJobs = await listJobs()
    const relevantJobs = allJobs.filter((j) => {
      const role = profile.currentRole || ''
      return j.title?.toLowerCase().includes(role.toLowerCase()) ||
             j.skillsRequired?.some((s: string) => (profile.skills || []).includes(s))
    })

    // Calculate salary ranges
    const salaries = relevantJobs
      .filter((j) => j.salaryRangeMin || j.salaryRangeMax)
      .flatMap((j) => [j.salaryRangeMin, j.salaryRangeMax].filter((s): s is number => typeof s === 'number'))
    const avgMarket = salaries.length > 0
      ? Math.round(salaries.reduce((a: number, b: number) => a + b, 0) / salaries.length)
      : 0
    const minMarket = salaries.length > 0 ? Math.min(...salaries) : 0
    const maxMarket = salaries.length > 0 ? Math.max(...salaries) : 0

    const experience = profile.yearsOfExperience || 0
    const skillsCount = (profile.skills || []).length

    // Base salary estimate
    let estimatedWorth = avgMarket || profile.desiredSalaryMin || 50000
    if (experience > 5) estimatedWorth = Math.round(estimatedWorth * 1.15)
    if (experience > 10) estimatedWorth = Math.round(estimatedWorth * 1.1)
    if (skillsCount > 8) estimatedWorth = Math.round(estimatedWorth * 1.05)
    if (skillsCount > 15) estimatedWorth = Math.round(estimatedWorth * 1.05)

    const userTarget = targetSalary || estimatedWorth * 1.15
    const userCurrent = currentSalary || estimatedWorth * 0.85

    const increaseAmount = userTarget - userCurrent
    const increasePercent = Math.round((increaseAmount / userCurrent) * 100)

    // Build negotiation scripts
    const scripts = buildNegotiationScripts(
      userCurrent, userTarget, estimatedWorth, minMarket, maxMarket,
      experience, skillsCount, profile.currentRole || 'the role',
      job?.title || 'the position',
    )

    // Tips
    const tips = [
      'Never name a number first — ask for their range, then position above their ceiling',
      'If they insist, give a range with your target as the floor',
      'Use market data: mention you\'ve researched similar roles paying $' + minMarket.toLocaleString() + ' - $' + maxMarket.toLocaleString(),
      'Total compensation matters — negotiate base, bonus, equity, and benefits together',
      'If base is fixed, negotiate signing bonus, extra PTO, remote work, or professional development budget',
      'Always get the offer in writing before responding — never negotiate on the spot',
      'Express enthusiasm for the role first, then negotiate — a warm tone gets better results',
      `With ${experience} years of experience and ${skillsCount} skills, you have leverage — use it confidently`,
    ]

    return NextResponse.json({
      estimatedWorth,
      marketRange: { min: minMarket, avg: avgMarket, max: maxMarket },
      yourTarget: userTarget,
      currentSalary: userCurrent,
      potentialIncrease: { amount: increaseAmount, percent: increasePercent },
      feasibility: increasePercent <= 15 ? 'realistic' : increasePercent <= 25 ? 'ambitious' : 'stretch',
      scripts,
      tips,
      jobTitle: job?.title || profile.currentRole || 'the role',
    })
  } catch (error) {
    console.error('Negotiation coach error:', error)
    return NextResponse.json({ message: 'Failed to generate coaching' }, { status: 500 })
  }
}

function buildNegotiationScripts(
  current: number, target: number, worth: number,
  minMarket: number, maxMarket: number,
  experience: number, skillsCount: number,
  role: string, jobTitle: string,
) {
  return [
    {
      scenario: 'When asked for your salary expectations',
      script: `I've researched the market for ${jobTitle} roles and based on my ${experience} years of experience and skill set, I'm looking for something in the range of $${Math.round(target * 0.95).toLocaleString()} to $${Math.round(target * 1.1).toLocaleString()}. I'm flexible depending on the total compensation package, but that's where I see the market right now.`,
    },
    {
      scenario: 'When they give a low offer',
      script: `Thank you so much for the offer — I'm really excited about this role and the team. I was hoping to be closer to $${target.toLocaleString()} based on my experience and the market research I've done. Is there room to move on the base salary, or could we explore adjusting the signing bonus or equity to close the gap?`,
    },
    {
      scenario: 'When they say the budget is fixed',
      script: `I completely understand budget constraints. Would you be open to revisiting the salary after 6 months based on performance? In the meantime, could we look at a signing bonus of $${Math.round((target - worth) * 0.5).toLocaleString()}, additional PTO, or a remote work arrangement to help bridge the gap?`,
    },
    {
      scenario: 'When they ask about your current salary',
      script: `My current compensation is a bit below market because I took the role for growth opportunities. Based on my research, the market rate for someone with my experience and skills in ${role} roles is $${worth.toLocaleString()} to $${maxMarket.toLocaleString()}. I'm looking to align with the market, which is why I'm targeting $${target.toLocaleString()}.`,
    },
    {
      scenario: 'Counter-offer email template',
      script: `Hi [Name],\n\nThank you for the offer for the ${jobTitle} position. I'm thrilled about the opportunity to join the team.\n\nAfter reviewing the offer and considering my ${experience} years of experience and the current market rate, I'd like to propose $${target.toLocaleString()} as the base salary. I believe this reflects the value I'll bring to the role.\n\nI'm open to discussing this and flexible on the overall package — I'd love to find a number that works for both of us.\n\nLooking forward to your thoughts.\n\nBest,\n[Your Name]`,
    },
  ]
}
