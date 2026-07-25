import { CandidateProfile, EmployerProfile } from './firebase'

export interface ProfileCompletion {
  percentage: number
  missing: string[]
  tips: string[]
}

const CANDIDATE_REQUIRED_FIELDS: Array<{ key: keyof CandidateProfile; label: string; weight: number }> = [
  { key: 'fullName', label: 'Full name', weight: 5 },
  { key: 'profilePicture', label: 'Profile picture', weight: 10 },
  { key: 'bio', label: 'Bio', weight: 10 },
  { key: 'currentRole', label: 'Current role', weight: 5 },
  { key: 'yearsOfExperience', label: 'Years of experience', weight: 5 },
  { key: 'skills', label: 'Skills', weight: 15 },
  { key: 'education', label: 'Education', weight: 10 },
  { key: 'resumeUrl', label: 'Resume', weight: 10 },
  { key: 'videoIntroUrl', label: 'Video intro', weight: 15 },
  { key: 'location', label: 'Location', weight: 5 },
  { key: 'portfolioUrl', label: 'Portfolio URL', weight: 5 },
  { key: 'linkedinUrl', label: 'LinkedIn', weight: 5 },
]

export function calculateCandidateCompletion(profile: CandidateProfile | null): ProfileCompletion {
  if (!profile) {
    return {
      percentage: 0,
      missing: CANDIDATE_REQUIRED_FIELDS.map((f) => f.label),
      tips: ['Complete your profile to get 3x more matches'],
    }
  }

  let totalWeight = 0
  let earnedWeight = 0
  const missing: string[] = []

  for (const field of CANDIDATE_REQUIRED_FIELDS) {
    totalWeight += field.weight
    const value = profile[field.key]
    const isFilled = Array.isArray(value) ? value.length > 0 : !!value

    if (isFilled) {
      earnedWeight += field.weight
    } else {
      missing.push(field.label)
    }
  }

  const percentage = Math.round((earnedWeight / totalWeight) * 100)

  const tips: string[] = []
  if (percentage < 50) {
    tips.push('Profiles with a video intro get 5x more views')
  } else if (percentage < 80) {
    tips.push(`Add ${missing[0]} to boost your match rate`)
  } else if (percentage < 100) {
    tips.push('Almost there! Complete your profile for maximum visibility')
  }

  return { percentage, missing, tips }
}

const EMPLOYER_REQUIRED_FIELDS: Array<{ key: keyof EmployerProfile; label: string; weight: number }> = [
  { key: 'companyName', label: 'Company name', weight: 10 },
  { key: 'logo', label: 'Company logo', weight: 10 },
  { key: 'industry', label: 'Industry', weight: 5 },
  { key: 'companySize', label: 'Company size', weight: 5 },
  { key: 'website', label: 'Website', weight: 5 },
  { key: 'headquarters', label: 'Headquarters', weight: 5 },
  { key: 'aboutCompany', label: 'About company', weight: 15 },
  { key: 'mission', label: 'Mission statement', weight: 10 },
  { key: 'values', label: 'Company values', weight: 10 },
  { key: 'perks', label: 'Perks & benefits', weight: 10 },
  { key: 'cultureVideoUrl', label: 'Culture video', weight: 10 },
  { key: 'teamPhotos', label: 'Team photos', weight: 5 },
]

export function calculateEmployerCompletion(profile: EmployerProfile | null): ProfileCompletion {
  if (!profile) {
    return {
      percentage: 0,
      missing: EMPLOYER_REQUIRED_FIELDS.map((f) => f.label),
      tips: ['Complete your company profile to attract more candidates'],
    }
  }

  let totalWeight = 0
  let earnedWeight = 0
  const missing: string[] = []

  for (const field of EMPLOYER_REQUIRED_FIELDS) {
    totalWeight += field.weight
    const value = profile[field.key]
    const isFilled = Array.isArray(value) ? value.length > 0 : !!value

    if (isFilled) {
      earnedWeight += field.weight
    } else {
      missing.push(field.label)
    }
  }

  const percentage = Math.round((earnedWeight / totalWeight) * 100)

  const tips: string[] = []
  if (percentage < 50) {
    tips.push('Candidates are 3x more likely to swipe right on companies with detailed profiles')
  } else if (percentage < 80) {
    tips.push(`Add ${missing[0]} to attract top talent`)
  }

  return { percentage, missing, tips }
}
