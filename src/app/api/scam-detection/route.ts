import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { text, context } = body as { text: string; context?: 'chat' | 'job' | 'profile' }

    if (!text || text.trim().length < 1) {
      return NextResponse.json({ message: 'Text required' }, { status: 400 })
    }

    const analysis = detectScam(text, context || 'chat')
    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Scam detection error:', error)
    return NextResponse.json({ message: 'Detection failed' }, { status: 500 })
  }
}

function detectScam(text: string, context: string) {
  const lower = text.toLowerCase()
  const detected: Array<{ type: string; severity: 'critical' | 'high' | 'medium' | 'low'; message: string; snippet?: string }> = []

  // Payment scams
  const scamPatterns = [
    { pattern: /wire transfer|western union|moneygram|bitcoin|crypto.*payment|gift card/i, type: 'Payment Scam', severity: 'critical' as const, message: 'Requests payment via wire transfer, crypto, or gift cards — these are untraceable and classic scam indicators.' },
    { pattern: /check.*(clear|deposit|cash)|deposit.*check|overpay.*check|cash.*check/i, type: 'Check Scam', severity: 'critical' as const, message: 'Mentions depositing or cashing checks — the "overpayment check scam" is the #1 scam on freelance platforms.' },
    { pattern: /send.*money|pay.*fee|processing fee|registration fee|training fee|equipment fee/i, type: 'Fee Scam', severity: 'critical' as const, message: 'Asking you to pay a fee upfront — legitimate employers never ask candidates to pay for training, equipment, or registration.' },
    { pattern: /bank account|routing number|social security|ssn|date of birth|passport number/i, type: 'Sensitive Info Request', severity: 'critical' as const, message: 'Requesting sensitive financial or personal information before an official offer — this is a phishing attempt.' },
    { pattern: /work from home.*\$|earn \$\d+.*(week|day|hour)|guaranteed income|make money (fast|online)/i, type: 'MLM/Get-Rich-Quick', severity: 'high' as const, message: 'Guaranteed income claims with high dollar amounts — classic MLM or get-rich-quick scheme language.' },
    { pattern: /telegram|whatsapp|signal|personal email|gmail|yahoo|hotmail|discord/i, type: 'Off-Platform Redirect', severity: 'high' as const, message: 'Trying to move conversation off-platform to a messaging app or personal email — scammers do this to evade platform monitoring.' },
    { pattern: /urgent|immediately|asap|need.*now|act fast|limited (time|spots)/i, type: 'Pressure Tactic', severity: 'medium' as const, message: 'Creating false urgency — scammers pressure you to act before you can think or verify.' },
    { pattern: /no experience (needed|required|necessary)|no skills required/i, type: 'Too Good To Be True', severity: 'high' as const, message: 'Claims no experience needed for high-paying work — legitimate jobs have requirements.' },
    { pattern: /shipping.*package|reship|forwarding.*package|receive.*package/i, type: 'Package Reshipping Scam', severity: 'critical' as const, message: 'Asking you to receive and reship packages — this is a fencing operation using stolen goods.' },
    { pattern: /nigeria|lagos.*prince|lottery|inheritance|you.*won|congratulations.*selected/i, type: 'Advance Fee Scam', severity: 'critical' as const, message: 'Classic advance fee / lottery scam language — do not engage.' },
    { pattern: /fake.*profile|catfish|not.*who.*say|pretending/i, type: 'Identity Fraud', severity: 'high' as const, message: 'May be impersonating someone else — verify their identity before sharing any information.' },
    { pattern: /hire.*assistant.*personal|personal assistant.*needed|hire.*helper/i, type: 'Fake Personal Assistant', severity: 'high' as const, message: '"Personal assistant" listings are often fronts for check scams or money laundering.' },
  ]

  for (const { pattern, type, severity, message } of scamPatterns) {
    const match = text.match(pattern)
    if (match) {
      detected.push({ type, severity, message, snippet: match[0] })
    }
  }

  // Check for suspicious URLs
  const urlPattern = /https?:\/\/(?!app\.tinda\.|tinda\.)[^\s]+/gi
  const urls = text.match(urlPattern)
  if (urls) {
    detected.push({
      type: 'External Link',
      severity: 'medium',
      message: `Contains external link${urls.length > 1 ? 's' : ''}: ${urls.slice(0, 3).join(', ')}. Be cautious — phishing links are common.`,
      snippet: urls[0],
    })
  }

  // Check for shortened URLs (often phishing)
  const shortUrlPattern = /(bit\.ly|tinyurl|t\.co|short\.link|rb\.gy|cutt\.ly)/i
  if (shortUrlPattern.test(text)) {
    detected.push({
      type: 'Shortened URL',
      severity: 'high',
      message: 'Contains shortened URL — these can hide phishing destinations. Do not click without verifying.',
    })
  }

  // Calculate risk score
  const criticalCount = detected.filter((d) => d.severity === 'critical').length
  const highCount = detected.filter((d) => d.severity === 'high').length
  const mediumCount = detected.filter((d) => d.severity === 'medium').length

  let riskScore = criticalCount * 30 + highCount * 15 + mediumCount * 5
  riskScore = Math.min(100, riskScore)

  let riskLevel: 'safe' | 'low' | 'moderate' | 'high' | 'critical'
  if (riskScore === 0) riskLevel = 'safe'
  else if (riskScore < 15) riskLevel = 'low'
  else if (riskScore < 35) riskLevel = 'moderate'
  else if (riskScore < 60) riskLevel = 'high'
  else riskLevel = 'critical'

  // Should block?
  const shouldBlock = criticalCount > 0 || riskScore >= 60
  const shouldWarn = riskScore >= 15

  return {
    riskScore,
    riskLevel,
    detected,
    shouldBlock,
    shouldWarn,
    summary: detected.length === 0
      ? 'No scam indicators detected in this message.'
      : `Detected ${detected.length} potential issue${detected.length !== 1 ? 's' : ''} (${criticalCount} critical, ${highCount} high, ${mediumCount} medium).`,
  }
}
