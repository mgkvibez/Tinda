import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

// Check for suspicious activity patterns across the platform
export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, eventType, metadata } = body as {
      action: string
      eventType?: string
      metadata?: Record<string, any>
    }

    if (action === 'log') {
      // Log activity for pattern detection
      if (!eventType) return NextResponse.json({ message: 'eventType required' }, { status: 400 })

      await adminDb.collection('activityLogs').add({
        userId: user.id,
        eventType,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ipHash: metadata?.ipHash || null,
      })

      // Check for suspicious patterns
      const flags = await checkSuspiciousPatterns(user.id, eventType)
      return NextResponse.json({ logged: true, flags })
    }

    if (action === 'my-flags') {
      // Get user's suspicious activity flags
      const flagsSnap = await adminDb
        .collection('suspiciousActivity')
        .where('userId', '==', user.id)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()

      const flags = flagsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      return NextResponse.json({ flags })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Suspicious activity error:', error)
    return NextResponse.json({ message: 'Activity logging failed' }, { status: 500 })
  }
}

async function checkSuspiciousPatterns(userId: string, eventType: string): Promise<string[]> {
  const flags: string[] = []
  const now = Date.now()

  // Get recent activity for this user
  const recentSnap = await adminDb
    .collection('activityLogs')
    .where('userId', '==', userId)
    .get()

  const recent = recentSnap.docs
    .map((d: any) => ({ ...d.data(), timestamp: new Date(d.data().timestamp).getTime() }))
    .filter((d) => now - d.timestamp < 60 * 60 * 1000) // Last hour

  // Pattern: Rapid account creation + immediate messaging
  const userDoc = await adminDb.collection('users').doc(userId).get()
  const accountAge = userDoc.exists && userDoc.data()?.createdAt
    ? now - new Date(userDoc.data()!.createdAt).getTime()
    : Infinity

  if (accountAge < 10 * 60 * 1000 && eventType === 'send_message') {
    flags.push('New account sending messages within 10 minutes of signup')
  }

  // Pattern: Excessive swiping (bot behavior)
  const swipesLastHour = recent.filter((d) => d.eventType === 'swipe').length
  if (swipesLastHour > 500) {
    flags.push(`Excessive swiping: ${swipesLastHour} swipes in 1 hour`)
  }

  // Pattern: Multiple accounts from same IP
  if (recent[0]?.ipHash) {
    const sameIpSnap = await adminDb
      .collection('activityLogs')
      .where('ipHash', '==', recent[0].ipHash)
      .get()
    const uniqueUsers = new Set(sameIpSnap.docs.map((d: any) => d.data().userId))
    if (uniqueUsers.size > 3) {
      flags.push(`Multiple accounts (${uniqueUsers.size}) detected from same IP`)
    }
  }

  // Pattern: Failed login attempts
  if (eventType === 'login_failed') {
    const failedLogins = recent.filter((d) => d.eventType === 'login_failed').length
    if (failedLogins >= 5) {
      flags.push(`${failedLogins} failed login attempts in 1 hour`)
    }
  }

  // Save flags
  for (const flag of flags) {
    await adminDb.collection('suspiciousActivity').add({
      userId,
      flag,
      eventType,
      createdAt: new Date().toISOString(),
      severity: flag.includes('Multiple accounts') || flag.includes('New account') ? 'high' : 'medium',
    })
  }

  return flags
}
