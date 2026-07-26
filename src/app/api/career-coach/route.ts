import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCandidateProfile, getUserById, listJobs } from '@/lib/firebase'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { question } = body as { question: string }

    if (!question || question.trim().length < 3) {
      return NextResponse.json({ message: 'Please ask a question' }, { status: 400 })
    }

    const profile = await getCandidateProfile(user.id)
    const userRecord = await getUserById(user.id)

    // Build context from profile
    const context = {
      currentRole: profile?.currentRole || 'Not specified',
      experience: profile?.yearsOfExperience || 0,
      skills: profile?.skills || [],
      location: profile?.location || 'Not specified',
      desiredSalary: `${profile?.desiredSalaryMin || 'N/A'} - ${profile?.desiredSalaryMax || 'N/A'}`,
      education: profile?.education || [],
      languages: profile?.languages || [],
      bio: profile?.bio || '',
    }

    // Get market context from available jobs
    const jobs = await listJobs()
    const topSkills = jobs
      .flatMap((j) => j.skillsRequired || [])
      .reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {} as Record<string, number>)
    const trendingSkills = Object.entries(topSkills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => `${skill} (${count} jobs)`)

    // Generate AI advice based on the question and context
    const advice = generateAdvice(question, context, trendingSkills, jobs.length)

    return NextResponse.json({ advice, context, trendingSkills, jobCount: jobs.length })
  } catch (error) {
    console.error('Career coach error:', error)
    return NextResponse.json({ message: 'Failed to generate advice' }, { status: 500 })
  }
}

function generateAdvice(
  question: string,
  context: Record<string, any>,
  trendingSkills: string[],
  jobCount: number,
): string {
  const q = question.toLowerCase()
  const skills = context.skills.join(', ') || 'no skills listed yet'
  const role = context.currentRole
  const exp = context.experience

  let advice = ''

  if (q.includes('salary') || q.includes('pay') || q.includes('money') || q.includes('earn')) {
    advice = `Based on your profile as a ${role} with ${exp} years of experience in ${context.location}, here's my salary guidance:\n\n`
    advice += `Your desired range is ${context.desiredSalary}. In the current market with ${jobCount} active jobs, `
    advice += `the most in-demand skills are ${trendingSkills.slice(0, 5).join(', ')}.\n\n`
    advice += `To maximize your earning potential:\n`
    advice += `1. Focus on developing the trending skills above — each one can add 5-15% to your base salary\n`
    advice += `2. Your current skills (${skills}) are valuable, but consider adding complementary ones\n`
    advice += `3. Location matters — if you're open to remote work, you can access higher-paying markets\n`
    advice += `4. Don't undersell yourself — aim for the upper end of your range when negotiating\n`
  } else if (q.includes('skill') || q.includes('learn') || q.includes('improve') || q.includes('develop')) {
    advice = `Looking at your profile and the current job market:\n\n`
    advice += `Your current skills: ${skills}\n\n`
    advice += `The hottest skills right now: ${trendingSkills.slice(0, 7).join(', ')}\n\n`
    advice += `My recommendations:\n`
    advice += `1. Identify skills you're missing from the trending list above\n`
    advice += `2. Prioritize the ones most relevant to your field (${role})\n`
    advice += `3. Build portfolio projects that demonstrate these skills\n`
    advice += `4. Get certifications for high-demand skills to stand out to employers\n`
    advice += `5. Update your profile regularly as you add new skills — our matching algorithm will start surfacing more relevant jobs immediately\n`
  } else if (q.includes('career') || q.includes('path') || q.includes('next') || q.includes('future') || q.includes('transition')) {
    advice = `As a ${role} with ${exp} years of experience, here's your career outlook:\n\n`
    advice += `Current trajectory analysis:\n`
    advice += `- Your skills (${skills}) position you well for ${role} roles and adjacent fields\n`
    advice += `- With ${jobCount} active jobs on the platform, demand is ${jobCount > 50 ? 'high' : 'moderate'}\n\n`
    advice += `Potential next steps:\n`
    advice += `1. Senior ${role} — natural progression, typically +20-30% salary bump\n`
    advice += `2. Team lead/Manager — if you're interested in leadership, start mentoring\n`
    advice += `3. Specialization — pick a niche from trending skills to differentiate\n`
    advice += `4. Lateral move — consider adjacent roles that leverage your existing skills\n\n`
    advice += `Key advice: Don't wait for the perfect opportunity. Apply to roles that are 60-70% match — you can grow into the rest on the job.\n`
  } else if (q.includes('job') || q.includes('apply') || q.includes('search') || q.includes('find')) {
    advice = `Job search strategy for a ${role}:\n\n`
    advice += `1. Swipe regularly — our algorithm learns from your swipes and improves recommendations over time\n`
    advice += `2. Keep your profile at 100% completion — complete profiles get 3x more matches\n`
    advice += `3. Your skills (${skills}) match well with the ${jobCount} active jobs on the platform\n`
    advice += `4. Top skills in demand right now: ${trendingSkills.slice(0, 5).join(', ')}\n`
    advice += `5. Be strategic with super-likes — save them for jobs you're genuinely excited about\n`
    advice += `6. Check the salary calculator to make sure you're targeting the right pay range\n`
  } else {
    advice = `I'm your AI career coach! I can help you with:\n\n`
    advice += `• Salary guidance and negotiation tips\n`
    advice += `• Skills development recommendations\n`
    advice += `• Career path planning and transitions\n`
    advice += `• Job search strategy\n`
    advice += `• Interview preparation advice\n\n`
    advice += `Based on your profile as a ${role} with ${exp} years of experience, you have solid potential. `
    advice += `The market currently has ${jobCount} active jobs, and the top trending skills are: ${trendingSkills.slice(0, 5).join(', ')}.\n\n`
    advice += `Ask me anything about your career!\n`
  }

  return advice
}
