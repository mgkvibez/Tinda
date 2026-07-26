// Client-safe version of safe-chat scanning (no server imports)
// Used in chat UI for real-time warnings

export function scanMessageClient(text: string) {
  const warnings: Array<{ type: string; message: string; severity: "warning" | "danger" }> = []

  // Off-platform redirect detection
  const offPlatformPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /telegram/i, label: "Telegram" },
    { pattern: /whatsapp/i, label: "WhatsApp" },
    { pattern: /signal/i, label: "Signal" },
    { pattern: /discord/i, label: "Discord" },
    { pattern: /gmail\.com|yahoo\.com|hotmail\.com|outlook\.com/i, label: "personal email" },
    { pattern: /add me on|contact me at|reach me at|message me on|dm me on/i, label: "off-platform redirect" },
    { pattern: /personal\s+number|my\s+number|call\s+me\s+at|text\s+me\s+at/i, label: "phone number request" },
  ]

  for (const { pattern, label } of offPlatformPatterns) {
    if (pattern.test(text)) {
      warnings.push({
        type: "off-platform",
        message: `This mentions ${label}. For your safety, keep all communication on Tinda.`,
        severity: "warning",
      })
    }
  }

  // Payment scam detection
  const paymentScamPatterns: RegExp[] = [
    /wire\s+transfer|western\s+union|moneygram/i,
    /bitcoin|crypto.*payment|ethereum/i,
    /gift\s+card|itunes\s+card|google\s+play\s+card/i,
    /check.*deposit|deposit.*check|cash.*check/i,
    /bank\s+account|routing\s+number|social\s+security/i,
    /processing\s+fee|registration\s+fee|training\s+fee/i,
  ]

  for (const pattern of paymentScamPatterns) {
    if (pattern.test(text)) {
      warnings.push({
        type: "payment-scam",
        message: "This message contains payment-related language matching known scam patterns. Never send money or share banking info.",
        severity: "danger",
      })
      break
    }
  }

  // Phishing link detection
  const shortUrlPattern = /(bit\.ly|tinyurl|t\.co|short\.link|rb\.gy|cutt\.ly)/i
  if (shortUrlPattern.test(text)) {
    warnings.push({
      type: "phishing",
      message: "This message contains a shortened URL which can hide phishing destinations. Do not click.",
      severity: "danger",
    })
  }

  return {
    warnings,
    hasWarning: warnings.some((w) => w.severity === "warning"),
    hasDanger: warnings.some((w) => w.severity === "danger"),
  }
}
