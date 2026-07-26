import { NextResponse } from 'next/server'

// Safe chat detection — used as a helper by chat routes
// Scans messages for off-platform redirects and scam patterns

export const SAFE_CHAT_RULES = {
  // Detect attempts to move conversation off-platform
  offPlatformIndicators: [
    { pattern: /telegram/i, label: 'Telegram' },
    { pattern: /whatsapp/i, label: 'WhatsApp' },
    { pattern: /signal/i, label: 'Signal' },
    { pattern: /discord/i, label: 'Discord' },
    { pattern: /\b snapchat \b/i, label: 'Snapchat' },
    { pattern: /gmail\.com|yahoo\.com|hotmail\.com|outlook\.com/i, label: 'personal email' },
    { pattern: /add me on|contact me at|reach me at|message me on|dm me on/i, label: 'off-platform redirect' },
    { pattern: /personal\s+number|my\s+number|call\s+me\s+at|text\s+me\s+at/i, label: 'phone number request' },
  ],

  // Detect payment-related scam language
  paymentScamIndicators: [
    /wire\s+transfer|western\s+union|moneygram/i,
    /bitcoin|crypto.*payment|ethereum/i,
    /gift\s+card|itunes\s+card|google\s+play\s+card/i,
    /check.*deposit|deposit.*check|cash.*check/i,
    /bank\s+account|routing\s+number|social\s+security/i,
    /processing\s+fee|registration\s+fee|training\s+fee/i,
    /send\s+money|pay\s+upfront|advance\s+payment/i,
  ],

  // Detect phishing links
  phishingIndicators: [
    /(bit\.ly|tinyurl|t\.co|short\.link|rb\.gy|cutt\.ly)/i,
    /https?:\/\/(?!app\.tinda\.|tinda\.|google\.com|linkedin\.com|github\.com)[^\s]+/i,
  ],
}

export function scanMessage(text: string) {
  const warnings: Array<{ type: string; message: string; severity: 'warning' | 'danger' }> = []

  for (const { pattern, label } of SAFE_CHAT_RULES.offPlatformIndicators) {
    if (pattern.test(text)) {
      warnings.push({
        type: 'off-platform',
        message: `This message mentions ${label}. For your safety, keep all communication on Tinda. Scammers often try to move conversations off-platform to avoid detection.`,
        severity: 'warning',
      })
    }
  }

  for (const pattern of SAFE_CHAT_RULES.paymentScamIndicators) {
    if (pattern.test(text)) {
      warnings.push({
        type: 'payment-scam',
        message: 'This message contains payment-related language that matches known scam patterns. Never send money, deposit checks, or share banking information. Report this user if you feel unsafe.',
        severity: 'danger',
      })
      break
    }
  }

  for (const pattern of SAFE_CHAT_RULES.phishingIndicators) {
    if (pattern.test(text)) {
      warnings.push({
        type: 'phishing',
        message: 'This message contains a potentially unsafe link. Do not click links from unknown users. If this seems suspicious, report it.',
        severity: 'danger',
      })
      break
    }
  }

  return {
    warnings,
    hasWarning: warnings.some((w) => w.severity === 'warning'),
    hasDanger: warnings.some((w) => w.severity === 'danger'),
    shouldBlock: warnings.some((w) => w.type === 'payment-scam' || w.type === 'phishing'),
  }
}
