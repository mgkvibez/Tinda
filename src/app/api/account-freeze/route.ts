import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { freezeAccount, unfreezeAccount, checkAndAutoFreeze } from '@/lib/security'
import { logSecurityEvent } from '@/lib/security'

// GET — check if account is frozen
export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const userDoc = await adminDb.collection('users').doc(session.user.id).get()
  if (!userDoc.exists) return NextResponse.json({ message: 'User not found' }, { status: 404 })

  const userData = userDoc.data()!
  return NextResponse.json({
    isFrozen: userData.isFrozen || false,
    frozenReason: userData.frozenReason || null,
    frozenAt: userData.frozenAt || null,
  })
}

// POST — freeze/unfreeze (admin only, or system auto-freeze check)
export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, userId, reason } = body as {
      action: 'freeze' | 'unfreeze' | 'auto_check'
      userId?: string
      reason?: string
    }

    if (action === 'auto_check') {
      // Check current user for auto-freeze triggers
      const frozen = await checkAndAutoFreeze(session.user.id)
      return NextResponse.json({ frozen, message: frozen ? 'Account auto-frozen due to suspicious activity' : 'No action needed' })
    }

    // Manual freeze/unfreeze — admin only
    if (session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    if (!userId) {
      return NextResponse.json({ message: 'userId required' }, { status: 400 })
    }

    if (action === 'freeze') {
      await freezeAccount(userId, reason || 'Manual freeze by admin', 'admin')
      return NextResponse.json({ message: 'Account frozen' })
    } else if (action === 'unfreeze') {
      await unfreezeAccount(userId, session.user.id)
      return NextResponse.json({ message: 'Account unfrozen' })
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to process freeze action' }, { status: 500 })
  }
}
