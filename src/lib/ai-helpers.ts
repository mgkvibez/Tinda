import 'server-only'

/**
 * AI Interview Feedback Generator
 * Analyzes a candidate's answer to an interview question and provides feedback.
 */

export interface InterviewFeedback {
  feedback: string
  score: number // 0-100
}

export async function generateInterviewFeedback(
  question: string,
  answer: string,
  jobTitle: string | null
): Promise<InterviewFeedback> {
  // Heuristic-based feedback since we don't have an LLM API key configured
  const answerLength = answer.trim().length
  const words = answer.trim().split(/\s+/).length
  const hasSpecifics = /\b(I|me|my|we|our|project|team|built|launched|achieved|result|percent|increased|decreased|led|managed|created|developed|implemented)\b/i.test(answer)
  const hasStructure = /\b(first|second|third|then|next|finally|because|so|therefore|as a result|for example|for instance)\b/i.test(answer)
  const hasNumbers = /\d+%|\$|million|thousand|\d+ (people|users|customers|projects|months|years)/i.test(answer)
  const hasSTAR = /\b(situation|task|action|result|challenge|goal|approach|outcome)\b/i.test(answer)

  let score = 0
  const tips: string[] = []

  // Length scoring
  if (words < 20) {
    score += 10
    tips.push('Your answer is very short. Aim for at least 3-4 sentences to fully address the question.')
  } else if (words < 50) {
    score += 30
    tips.push('Decent length, but could be more detailed. Expand on your specific experience.')
  } else if (words < 100) {
    score += 50
  } else if (words < 200) {
    score += 70
  } else {
    score += 60
    tips.push('Your answer is quite long. Consider being more concise — interviewers appreciate focused, punchy answers.')
  }

  // Specificity scoring
  if (hasSpecifics) {
    score += 15
  } else {
    tips.push('Include specific examples from your experience. Use "I" statements and mention concrete outcomes.')
  }

  // Structure scoring
  if (hasStructure) {
    score += 10
  } else {
    tips.push('Structure your answer using the STAR method: Situation, Task, Action, Result.')
  }

  // Numbers/metrics scoring
  if (hasNumbers) {
    score += 15
  } else {
    tips.push('Quantify your achievements with numbers — percentages, dollar amounts, or user counts make your answer more impactful.')
  }

  // STAR method check
  if (hasSTAR) {
    score += 10
  }

  score = Math.min(score, 95)

  const strengths: string[] = []
  if (hasSpecifics) strengths.push('good use of personal experience')
  if (hasNumbers) strengths.push('quantified achievements')
  if (hasStructure) strengths.push('logical structure')
  if (hasSTAR) strengths.push('follows the STAR method')

  let feedback = ''
  if (score >= 80) {
    feedback = `Excellent answer! You demonstrated ${strengths.join(', ')}. `
  } else if (score >= 60) {
    feedback = `Good answer with ${strengths.join(', ') || 'decent content'}. `
  } else if (score >= 40) {
    feedback = `This answer needs improvement. `
  } else {
    feedback = `This answer is too brief or lacks detail. `
  }

  if (tips.length > 0) {
    feedback += `Tips: ${tips.join(' ')}`
  } else if (score >= 80) {
    feedback += `Keep up this level of detail in all your answers!`
  }

  if (jobTitle) {
    feedback += ` Remember to tailor your answer to the ${jobTitle} role when possible.`
  }

  return { feedback, score }
}

/**
 * Salary Estimator
 * Provides a salary range estimate based on role, location, and experience.
 */

export interface SalaryEstimate {
  low: number
  mid: number
  high: number
  currency: string
  factors: string[]
}

const SALARY_DATA: Record<string, { base: { entry: number; mid: number; senior: number }; locationMultiplier: Record<string, number> }> = {
  'software engineer': { base: { entry: 3000000, mid: 6000000, senior: 12000000 }, locationMultiplier: { lagos: 1.2, abuja: 1.0, remote: 1.1, port_harcourt: 0.9, ibadan: 0.85 } },
  'product manager': { base: { entry: 4000000, mid: 8000000, senior: 15000000 }, locationMultiplier: { lagos: 1.2, abuja: 1.0, remote: 1.1, port_harcourt: 0.9, ibadan: 0.85 } },
  'designer': { base: { entry: 2500000, mid: 5000000, senior: 9000000 }, locationMultiplier: { lagos: 1.15, abuja: 1.0, remote: 1.1, port_harcourt: 0.9, ibadan: 0.85 } },
  'data analyst': { base: { entry: 2500000, mid: 5500000, senior: 10000000 }, locationMultiplier: { lagos: 1.2, abuja: 1.0, remote: 1.1, port_harcourt: 0.9, ibadan: 0.85 } },
  'marketing': { base: { entry: 2000000, mid: 4500000, senior: 8500000 }, locationMultiplier: { lagos: 1.15, abuja: 1.0, remote: 1.0, port_harcourt: 0.9, ibadan: 0.85 } },
  'sales': { base: { entry: 2000000, mid: 4000000, senior: 8000000 }, locationMultiplier: { lagos: 1.2, abuja: 1.0, remote: 1.0, port_harcourt: 0.9, ibadan: 0.85 } },
}

const DEFAULT_SALARY = { base: { entry: 2500000, mid: 5000000, senior: 9000000 }, locationMultiplier: { lagos: 1.2, abuja: 1.0, remote: 1.1, port_harcourt: 0.9, ibadan: 0.85 } }

export function estimateSalary(role: string, location: string, experience: 'entry' | 'mid' | 'senior'): SalaryEstimate {
  const roleKey = role.toLowerCase().trim()
  const data = SALARY_DATA[roleKey] || DEFAULT_SALARY
  const locKey = location.toLowerCase().replace(/\s+/g, '_').trim()
  const locMult = data.locationMultiplier[locKey] || 1.0

  const base = data.base[experience]
  const adjusted = Math.round(base * locMult)

  const factors: string[] = []
  factors.push(`${role} base salary for ${experience} level`)
  if (locMult > 1) factors.push(`${location} location premium (+${Math.round((locMult - 1) * 100)}%)`)
  else if (locMult < 1) factors.push(`${location} location adjustment (${Math.round((1 - locMult) * 100)}% lower)`)
  else factors.push(`Standard location rate for ${location}`)
  factors.push(`${experience} level experience`)

  return {
    low: Math.round(adjusted * 0.85 / 12),
    mid: Math.round(adjusted / 12),
    high: Math.round(adjusted * 1.15 / 12),
    currency: 'NGN',
    factors,
  }
}
