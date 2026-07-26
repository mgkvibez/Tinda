import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getJobById } from '@/lib/firebase'

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { jobId, description } = body as { jobId?: string; description?: string }

    let jobDescription = description || ''
    let jobTitle = 'this position'

    if (jobId) {
      const job = await getJobById(jobId)
      if (!job) return NextResponse.json({ message: 'Job not found' }, { status: 404 })
      jobDescription = `${job.title}\n\n${job.description}`
      jobTitle = job.title
    }

    if (!jobDescription || jobDescription.trim().length < 10) {
      return NextResponse.json({ message: 'Job description required' }, { status: 400 })
    }

    const analysis = analyzeJobDescription(jobDescription, jobTitle)
    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Red flag detector error:', error)
    return NextResponse.json({ message: 'Analysis failed' }, { status: 500 })
  }
}

function analyzeJobDescription(text: string, title: string) {
  const lower = text.toLowerCase()
  const flags: Array<{ type: string; severity: 'red' | 'yellow'; message: string; snippet?: string }> = []
  const greenFlags: string[] = []

  // Red flags
  const redFlagPatterns = [
    { pattern: /unlimited (pto|vacation|paid time off)/i, type: 'PTO Vague', message: '"Unlimited PTO" often means no guaranteed time off and makes it hard to accrue benefits. Check the actual average taken.' },
    { pattern: /fast[- ]paced|fast paced environment/i, type: 'Workload', message: '"Fast-paced environment" can indicate understaffing, unrealistic deadlines, or burnout risk.' },
    { pattern: /work hard play hard/i, type: 'Culture', message: '"Work hard, play hard" often signals long hours with pressure to socialize after work.' },
    { pattern: /rockstar|ninja|guru|wizard|jedi/i, type: 'Job Title Inflation', message: 'Uses buzzword titles like "rockstar" or "ninja" — may indicate immature culture or unrealistic expectations.' },
    { pattern: /wear (many|multiple) hats/i, type: 'Role Scope', message: '"Wearing many hats" often means the role is undefined and you\'ll be doing 3 people\'s jobs.' },
    { pattern: /self[- ]starter|self starter/i, type: 'Support', message: 'Heavy emphasis on "self-starter" may indicate lack of training, mentorship, or onboarding.' },
    { pattern: /flexible (hours|schedule)/i, type: 'Work Hours', message: '"Flexible hours" without specifics can mean always-on-call or unpaid overtime. Ask for clear boundaries.' },
    { pattern: /competitive (salary|pay|compensation)/i, type: 'Salary Vague', message: '"Competitive salary" without a range usually means below-market pay. Always ask for the range upfront.' },
    { pattern: /must be (willing )?able to work (long|extended|weekend|late)/i, type: 'Overtime', message: 'Explicitly mentions long/weekend hours — expect regular overtime, possibly unpaid.' },
    { pattern: /family/i, type: 'Boundary', message: '"We\'re like a family" can indicate blurred personal/professional boundaries and pressure to overcommit.' },
    { pattern: /startup mentality|entrepreneurial mindset/i, type: 'Stability', message: 'May indicate low structure, unstable funding, or expectation to work outside your role.' },
    { pattern: /zero tolerance|no excuses/i, type: 'Management Style', message: 'Rigid language may indicate authoritarian management and low tolerance for mistakes.' },
  ]

  // Yellow flags
  const yellowFlagPatterns = [
    { pattern: /on[- ]site|in[- ]office|must be (local|on[- ]?site)/i, type: 'Location', message: 'Requires on-site work with no remote option — reduces flexibility.' },
    { pattern: /bonus eligible|equity|stock options/i, type: 'Compensation', message: 'Equity/bonuses mentioned — verify the details and vesting schedule, not just base salary.' },
    { pattern: /probation|trial period/i, type: 'Job Security', message: 'Probation period mentioned — clarify expectations and whether it affects benefits.' },
    { pattern: /available 24\/7|on[- ]call/i, type: 'Availability', message: 'On-call expectations — confirm compensation for after-hours availability.' },
    { pattern: /must have \d+ years (of )?experience/i, type: 'Experience Requirements', message: 'Strict experience requirements — may be a ceiling if you\'re early career or flexible if you\'re senior.' },
  ]

  // Green flags
  const greenFlagPatterns = [
    { pattern: /remote (first|friendly)|work from home|wfh/i, flag: 'Remote-friendly' },
    { pattern: /mentorship|mentor|learning (budget|stipend)/i, flag: 'Values mentorship and growth' },
    { pattern: /health insurance|dental|vision|401k|pension/i, flag: 'Comprehensive benefits' },
    { pattern: /diversity|inclusion|equal opportunity|ei|belonging/i, flag: 'Commits to DEI' },
    { pattern: /flexible (working|schedule|hours)|flexitime/i, flag: 'Flexible schedule' },
    { pattern: /training (budget|allowance)|conference|professional development/i, flag: 'Invests in professional development' },
    { pattern: /mental health|wellness|wellbeing|well-being/i, flag: 'Prioritizes wellbeing' },
    { pattern: /transparent|transparency/i, flag: 'Values transparency' },
    { pattern: /internal mobility|growth opportunities|career progression/i, flag: 'Clear growth path' },
  ]

  for (const { pattern, type, message } of redFlagPatterns) {
    const match = text.match(pattern)
    if (match) {
      flags.push({ type, severity: 'red', message, snippet: match[0] })
    }
  }

  for (const { pattern, type, message } of yellowFlagPatterns) {
    const match = text.match(pattern)
    if (match) {
      flags.push({ type, severity: 'yellow', message, snippet: match[0] })
    }
  }

  for (const { pattern, flag } of greenFlagPatterns) {
    if (pattern.test(text)) greenFlags.push(flag)
  }

  // Check for salary transparency
  const salaryMentioned = /\$[\d,]+(k|,\d{3})?|\d{2,3}k|salary range/i.test(text)
  if (salaryMentioned) greenFlags.push('Transparent about salary')

  // Overall score
  const redCount = flags.filter((f) => f.severity === 'red').length
  const yellowCount = flags.filter((f) => f.severity === 'yellow').length
  let score = 100 - (redCount * 15) - (yellowCount * 5)
  score = Math.max(0, Math.min(100, score))

  let recommendation = 'caution'
  if (score >= 80) recommendation = 'safe'
  else if (score >= 50) recommendation = 'caution'
  else recommendation = 'investigate'

  return {
    jobTitle: title,
    score,
    recommendation,
    redFlags: flags.filter((f) => f.severity === 'red'),
    yellowFlags: flags.filter((f) => f.severity === 'yellow'),
    greenFlags,
    totalFlags: flags.length,
    summary: `Found ${redCount} red flag${redCount !== 1 ? 's' : ''}, ${yellowCount} warning${yellowCount !== 1 ? 's' : ''}, and ${greenFlags.length} positive indicator${greenFlags.length !== 1 ? 's' : ''}.`,
  }
}
