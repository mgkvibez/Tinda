import 'server-only'
import { JobRecord, CandidateProfile, EmployerProfile } from './firebase'

/**
 * AI Cover Letter Generator
 * Generates a tailored cover letter based on job requirements and candidate profile.
 * Uses a template-based approach with dynamic content matching.
 */

export function generateCoverLetter(
  job: JobRecord,
  candidate: CandidateProfile,
  employer?: EmployerProfile | null,
): string {
  const candidateName = candidate.fullName || 'Candidate'
  const companyName = employer?.companyName || job.companyName || 'your company'
  const jobTitle = job.title
  const skills = candidate.skills || []
  const matchingSkills = skills.filter((s) =>
    job.skillsRequired.some((js) =>
      js.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(js.toLowerCase()),
    ),
  )

  const experience = candidate.yearsOfExperience
    ? `with ${candidate.yearsOfExperience} years of experience`
    : ''

  const skillLine = matchingSkills.length > 0
    ? `My expertise in ${matchingSkills.slice(0, 4).join(', ')}${matchingSkills.length > 4 ? ' and other relevant technologies' : ''} aligns perfectly with your requirements.`
    : skills.length > 0
      ? `I bring strong skills in ${skills.slice(0, 4).join(', ')} that I believe would be valuable for this role.`
      : `I am eager to bring my dedication and fresh perspective to this role.`

  const motivation = job.description
    ? `Reading through the job description, I was particularly excited about the opportunity to ${job.description.slice(0, 120).replace(/\.$/, '')}...`
    : `I am very interested in this position.`

  const closing = employer?.recruiterName
    ? `Thank you, ${employer.recruiterName}, for considering my application.`
    : `Thank you for considering my application.`

  return `Dear ${companyName} Hiring Team,

I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. ${motivation}

${skillLine} ${experience ? `As a professional ${experience},` : 'As a dedicated professional,'} I have ${candidate.bio || 'built a track record of delivering quality work and collaborating effectively with teams.'}

${candidate.portfolioUrl ? `You can view my portfolio at ${candidate.portfolioUrl} to see examples of my work.` : ''}
${candidate.linkedinUrl ? `My LinkedIn profile: ${candidate.linkedinUrl}` : ''}
${candidate.githubUrl ? `GitHub: ${candidate.githubUrl}` : ''}

I am particularly drawn to ${companyName} because of ${employer?.mission || employer?.aboutCompany || 'the innovative work your team is doing'}. I am confident that my background and enthusiasm make me a strong fit for this role.

${closing} I look forward to the opportunity to discuss how I can contribute to your team.

Best regards,
${candidateName}
${candidate.email || ''}
${candidate.phone || ''}`.trim()
}
