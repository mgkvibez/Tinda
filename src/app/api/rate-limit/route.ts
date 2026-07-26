import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Simple in-memory rate limiter (for production, use Redis or Firestore)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const LIMITS: Record<string, { maxRequests: number; windowMs: number; label: string }> = {
  // Auth
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000, label: 'login attempts' },
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000, label: 'signup attempts' },
  // Messaging
  send_message: { maxRequests: 30, windowMs: 60 * 1000, label: 'messages per minute' },
  // Swiping
  swipe: { maxRequests: 100, windowMs: 60 * 1000, label: 'swipes per minute' },
  // Job posting
  create_job: { maxRequests: 5, windowMs: 60 * 60 * 1000, label: 'jobs per hour' },
  // API general
  api: { maxRequests: 60, windowMs: 60 * 1000, label: 'API requests per minute' },
  // Reports
  report: { maxRequests: 10, windowMs: 60 * 60 * 1000, label: 'reports per hour' },
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, identifier } = body as { action: string; identifier?: string }

    const userId = session.user!.id
    const key = `${userId}:${action}`
    const limit = LIMITS[action] || LIMITS.api

    const now = Date.now()
    const existing = rateLimitMap.get(key)

    if (!existing || existing.resetAt < now) {
      rateLimitMap.set(key, { count: 1, resetAt: now + limit.windowMs })
      return NextResponse.json({ allowed: true, remaining: limit.maxRequests - 1, limit: limit.maxRequests })
    }

    existing.count++
    const remaining = limit.maxRequests - existing.count

    if (remaining < 0) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
      return NextResponse.json(
        { allowed: false, message: `Rate limit exceeded: ${limit.label}. Try again in ${retryAfter} seconds.`, retryAfter },
        { status: 429 },
      )
    }

    // Auto-flag suspicious behavior
    if (existing.count > limit.maxRequests * 0.8) {
      return NextResponse.json({
        allowed: true,
        remaining,
        warning: 'You are approaching the rate limit. Slow down to avoid being flagged.',
      })
    }

    return NextResponse.json({ allowed: true, remaining, limit: limit.maxRequests })
  } catch (error) {
    console.error('Rate limit error:', error)
    return NextResponse.json({ message: 'Rate limit check failed' }, { status: 500 })
  }
}

// Helper for other routes to check rate limit
export async function checkRateLimit(userId: string, action: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `${userId}:${action}`
  const limit = LIMITS[action] || LIMITS.api
  const now = Date.now()
  const existing = rateLimitMap.get(key)

  if (!existing || existing.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + limit.windowMs })
    return { allowed: true, remaining: limit.maxRequests - 1 }
  }

  existing.count++
  const remaining = limit.maxRequests - existing.count

  return { allowed: remaining >= 0, remaining: Math.max(0, remaining) }
}
