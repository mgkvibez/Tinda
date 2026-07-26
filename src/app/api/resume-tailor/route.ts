import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCandidateProfile, getJobById } from '@/lib/firebase'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { jobId } = body as { jobId: string }

    if (!jobId) return NextResponse.json({ message: 'Job ID required' }, { status: 400 })

    const job = await getJobById(jobId)
    if (!job) return NextResponse.json({ message: 'Job not found' }, { status: 404 })

    const profile = await getCandidateProfile(user.id)
    if (!profile) return NextResponse.json({ message: 'Complete your profile first' }, { status: 400 })

    // Extract job requirements
    const jobSkills = (job.skillsRequired || []).map((s: string) => s.toLowerCase())
    const jobTitle = job.title.toLowerCase()
    const jobDescription = (job.description || '').toLowerCase()

    // Extract candidate info
    const candidateSkills = (profile.skills || []).map((s: string) => s.toLowerCase())
    const candidateRole = (profile.currentRole || '').toLowerCase()
    const candidateBio = (profile.bio || '').toLowerCase()
    const candidateEducation = (profile.education || []).map((e: any) =>
      `${e.degree || ''} ${e.field || ''} ${e.institution || ''}`.toLowerCase(),
    ).join(' ')

    // Build tailored resume sections
    const matchedSkills: string[] = candidateSkills.filter((s: string) => jobSkills.includes(s))
  const partialSkills: string[] = jobSkills.filter((s: string) =>
      candidateSkills.some((cs: string) => cs.includes(s) || s.includes(cs)) && !candidateSkills.includes(s),
    )
  const missingSkills: string[] = jobSkills.filter((s: string) =>
      !candidateSkills.includes(s) && !partialSkills.includes(s),
    )

    // Reorder skills to prioritize matched ones
  const reorderedSkills = [
      ...matchedSkills.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)),
      ...candidateSkills.filter((s: string) => !jobSkills.includes(s)).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)),
    ]

    // Generate tailored summary
    const summary = generateTailoredSummary(job, profile, matchedSkills)
    const coverSkills = generateSkillsSection(job, profile, matchedSkills, partialSkills)
    const experienceHighlights = generateExperienceHighlights(job, profile, matchedSkills)
    const keywordOptimization = generateKeywordAnalysis(job, profile, matchedSkills, missingSkills)

    return NextResponse.json({
      jobId: job.id,
      jobTitle: job.title,
      companyName: job.companyName,
      tailoredSummary: summary,
      optimizedSkills: reorderedSkills,
      skillsSection: coverSkills,
      experienceHighlights,
      keywordAnalysis: keywordOptimization,
      matchRate: Math.round((matchedSkills.length / Math.max(jobSkills.length, 1)) * 100),
      recommendations: buildRecommendations(matchedSkills, partialSkills, missingSkills, job, profile),
    })
  } catch (error) {
    console.error('Resume tailor error:', error)
    return NextResponse.json({ message: 'Failed to tailor resume' }, { status: 500 })
  }
}

function generateTailoredSummary(job: any, profile: any, matchedSkills: string[]): string {
  const role = profile.currentRole || 'Professional'
  const exp = profile.yearsOfExperience || 0
  const topSkills = matchedSkills.slice(0, 4).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
  const company = job.companyName || 'your company'

  let summary = `${exp > 0 ? `${exp}+ years experienced ` : ''}${role} with proven expertise in ${topSkills || 'the field'}. `
  summary += `Passionate about ${job.title?.toLowerCase() || 'the role'} and excited about the opportunity at ${company}. `
  if (profile.bio) {
    summary += `${profile.bio.slice(0, 120)}`
  } else {
    summary += `Track record of delivering high-impact results and thriving in collaborative environments.`
  }
  summary += ` Eager to bring my skills and drive to help ${company} achieve its goals.`

  return summary
}

function generateSkillsSection(job: any, profile: any, matched: string[], partial: string[]): string {
  const sections: string[] = []

  if (matched.length > 0) {
    sections.push(`CORE SKILLS (matched to ${job.title}):`)
    sections.push(matched.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' • '))
  }

  const otherSkills: string[] = (profile.skills || []).filter((s: string) => !matched.includes(s.toLowerCase()))
  if (otherSkills.length > 0) {
    sections.push('\nADDITIONAL SKILLS:')
    sections.push(otherSkills.slice(0, 10).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' • '))
  }

  if (partial.length > 0) {
    sections.push('\nRELATED EXPERIENCE:')
    sections.push(partial.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' • '))
  }

  return sections.join('\n')
}

function generateExperienceHighlights(job: any, profile: any, matchedSkills: string[]): string[] {
  const highlights: string[] = []
  const jobTitle = job.title?.toLowerCase() || 'the role'

  if (matchedSkills.length > 0) {
    highlights.push(
      `• Applied ${matchedSkills.slice(0, 3).map((s) => s).join(', ')} in production environments, directly relevant to ${job.title} requirements`,
    )
  }

  highlights.push(`• Collaborated with cross-functional teams to deliver projects aligned with business objectives`)
  highlights.push(`• Maintained and improved systems ensuring reliability and performance`)

  if (profile.yearsOfExperience && profile.yearsOfExperience > 3) {
    highlights.push(`• Mentored junior team members and drove best practices across ${profile.yearsOfExperience}+ years of experience`)
  }

  if (profile.portfolioUrl) {
    highlights.push(`• Built and deployed projects showcasing hands-on expertise (see: ${profile.portfolioUrl})`)
  }

  return highlights
}

function generateKeywordAnalysis(job: any, profile: any, matched: string[], missing: string[]) {
  const jobKeywords: string[] = (job.skillsRequired || []).map((s: string) => s.toLowerCase())
  const profileKeywords: string[] = (profile.skills || []).map((s: string) => s.toLowerCase())

  const present: string[] = jobKeywords.filter((k: string) => profileKeywords.includes(k))
  const absent: string[] = jobKeywords.filter((k: string) => !profileKeywords.includes(k))

  // Check for synonyms
  const synonyms: Record<string, string[]> = {
    javascript: ['js', 'node.js', 'nodejs', 'es6'],
    typescript: ['ts', 'type safety'],
    react: ['reactjs', 'react.js', 'jsx'],
    python: ['py', 'django', 'flask'],
    aws: ['amazon web services', 'ec2', 's3', 'lambda'],
    docker: ['containerization', 'containers', 'k8s'],
  }

  const synonymMatches: string[] = []
  for (const missing_ of absent) {
    const syns = synonyms[missing_]
    if (syns && profileKeywords.some((p: string) => syns.includes(p))) {
      synonymMatches.push(`${missing_} (via ${syns.find((s) => profileKeywords.includes(s))})`)
    }
  }

  return {
    keywordsPresent: present,
    keywordsMissing: absent,
    synonymMatches,
    coveragePercent: Math.round((present.length / Math.max(jobKeywords.length, 1)) * 100),
    suggestion: absent.length > 0
      ? `Add these keywords to your resume if you have relevant experience: ${absent.join(', ')}`
      : 'Your resume covers all required keywords for this job!',
  }
}

function buildRecommendations(matched: string[], partial: string[], missing: string[], job: any, profile: any) {
  const recs: string[] = []

  if (missing.length > 0) {
    recs.push(`Highlight any experience with: ${missing.map((s) => s).join(', ')} — even if it's not a primary skill, mentioning it increases ATS pass rate.`)
  }

  if (matched.length > 0) {
    recs.push(`Lead with your ${matched.slice(0, 3).join(', ')} experience — these are the most important keywords for this role.`)
  }

  recs.push(`Mirror the job title language: use "${job.title}" if your current title is similar but differently named.`)

  if (profile.bio && profile.bio.length < 50) {
    recs.push('Your professional summary is short — expand it to 2-3 sentences highlighting your most relevant achievements.')
  }

  recs.push('Quantify your achievements: use numbers, percentages, and metrics wherever possible.')
  recs.push('Remove irrelevant experience — keep only the last 2-3 roles and ensure each one connects to the job requirements.')

  return recs
}
