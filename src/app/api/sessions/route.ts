import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listUserSessions, revokeSession, revokeAllSessionsExcept } from '@/lib/security'
import { logSecurityEvent } from '@/lib/security'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const sessions = await listUserSessions(session.user.id)
  return NextResponse.json({ sessions })
}

export async function DELETE(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')
  const all = url.searchParams.get('all')

  try {
    if (all === 'true') {
      // Revoke all sessions except current
      await revokeAllSessionsExcept(session.user.id, session.user.sessionId || '')
      await logSecurityEvent({
        userId: session.user.id,
        action: 'revoke_all_sessions',
        category: 'session',
        description: 'Revoked all other sessions',
        severity: 'warning',
      })
      return NextResponse.json({ message: 'All other sessions revoked' })
    } else if (sessionId) {
      await revokeSession(sessionId)
      await logSecurityEvent({
        userId: session.user.id,
        action: 'revoke_session',
        category: 'session',
        description: `Revoked session ${sessionId}`,
        severity: 'info',
        metadata: { sessionId },
      })
      return NextResponse.json({ message: 'Session revoked' })
    } else {
      return NextResponse.json({ message: 'sessionId or all=true required' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ message: 'Failed to revoke session' }, { status: 500 })
  }
}
