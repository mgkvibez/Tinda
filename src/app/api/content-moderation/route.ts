import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { text, context } = body as { text: string; context: 'job' | 'profile' | 'message' }

    if (!text || text.trim().length < 1) {
      return NextResponse.json({ message: 'Text required' }, { status: 400 })
    }

    const result = moderateContent(text, context || 'job')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Content moderation error:', error)
    return NextResponse.json({ message: 'Moderation failed' }, { status: 500 })
  }
}

function moderateContent(text: string, context: string) {
  const lower = text.toLowerCase()
  const violations: Array<{ type: string; severity: 'block' | 'flag' | 'warn'; message: string }> = []

  // Prohibited content — auto-block
  const blocked = [
    { pattern: /hate\s+speech|racial\s+slur|n[- ]?word|f[- ]?aggot|tranny|retard/i, type: 'Hate Speech', message: 'Hate speech is not allowed on Tinda.' },
    { pattern: /kill\s+yourself|self[- ]harm|suicide\s+method/i, type: 'Self-Harm', message: 'Content promoting self-harm is prohibited.' },
    { pattern: /child\s+porn|underage|csam|minor.*sexual/i, type: 'CSAM', message: 'Content involving minors is illegal and will be reported to authorities.' },
    { pattern: /bomb|terrorist|isis|al[- ]qaeda|mass\s+shoot/i, type: 'Terrorism', message: 'Content promoting violence or terrorism is prohibited.' },
    { pattern: /cocaine|heroin|meth|fentanyl|drug\s+deal|selling\s+drugs/i, type: 'Drug Trafficking', message: 'Content promoting illegal drug sales is prohibited.' },
    { pattern: /human\s+traffick|sex\s+traffick|forced\s+labor/i, type: 'Human Trafficking', message: 'Content promoting human trafficking is illegal and will be reported.' },
  ]

  for (const { pattern, type, message } of blocked) {
    if (pattern.test(text)) {
      violations.push({ type, severity: 'block', message })
    }
  }

  // Flagged content — requires review
  const flagged = [
    { pattern: /fuck|shit|bitch|asshole|dick|cunt|pussy/i, type: 'Profanity', message: 'Contains profanity.' },
    { pattern: /discrim|no\s+blacks|no\s+jews|no\s+muslims|whites\s+only|straight\s+only/i, type: 'Discrimination', message: 'Discriminatory language detected — this violates fair hiring laws.' },
    { pattern: /escort|sugar\s+daddy|sugar\s+baby|onlyfans|cam\s+girl/i, type: 'Adult Content', message: 'Adult/sex work content is not allowed.' },
    { pattern: /mlm|pyramid|multi[- ]level\s+marketing/i, type: 'MLM', message: 'MLM/pyramid scheme content flagged for review.' },
    { pattern: /illegal|fraud|scam|phishing/i, type: 'Illegal Activity', message: 'References to illegal activity flagged for review.' },
  ]

  for (const { pattern, type, message } of flagged) {
    if (pattern.test(text)) {
      violations.push({ type, severity: 'flag', message })
    }
  }

  // Warnings — context dependent
  const warnings: string[] = []

  if (context === 'job') {
    if (/unpaid|no\s+pay|for\s+experience|exposure/i.test(lower)) {
      warnings.push('Unpaid or "for exposure" positions are discouraged — they exploit workers.')
    }
    if (lower.length < 100) {
      warnings.push('Job description is very short — detailed descriptions attract better candidates.')
    }
    if (!/\$|salary|pay|compensation/i.test(lower)) {
      warnings.push('No salary information provided — salary transparency improves application rates by 3x.')
    }
    if (/\d+\s+years.*experience/i.test(lower) && /must\s+have/i.test(lower)) {
      warnings.push('Strict experience requirements may exclude qualified candidates — consider equivalent experience.')
    }
  }

  if (context === 'profile') {
    if (/personal\s+phone|my\s+number|call\s+me\s+at|text\s+me/i.test(lower)) {
      warnings.push('Personal contact info in profile — scammers may use it. Keep communication on Tinda.')
    }
    if (/@\w+\.(com|org|net|io)/i.test(lower)) {
      warnings.push('Email address in profile — be cautious about sharing contact info publicly.')
    }
  }

  const shouldBlock = violations.some((v) => v.severity === 'block')
  const shouldFlag = violations.some((v) => v.severity === 'flag')
  const cleanText = violations.filter((v) => v.severity === 'block').length === 0

  return {
    shouldBlock,
    shouldFlag,
    cleanText,
    violations: violations.map((v) => ({ ...v, context: text.match(/.{0,20}\w+.{0,20}/)?.[0] || '' })),
    warnings,
    summary: shouldBlock
      ? 'Content BLOCKED — contains prohibited content.'
      : shouldFlag
        ? 'Content flagged for review — may violate community guidelines.'
        : warnings.length > 0
          ? 'Content allowed with warnings.'
          : 'Content passes moderation checks.',
  }
}
