import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb, adminAuth } from '@/lib/firebase/admin'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, code } = body as { action: string; code?: string }

    if (action === 'enable') {
      // Generate 6-digit code
      const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

      await adminDb.collection('twoFactor').doc(user.id).set({
        code: twoFactorCode,
        enabled: false,
        pendingEnable: true,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      })

      // In production, send via SMS/Email. For now, return the code (dev mode)
      return NextResponse.json({
        message: '2FA setup initiated. Use the code sent to your email/phone.',
        devCode: twoFactorCode, // Remove in production
      })
    }

    if (action === 'verify') {
      if (!code) return NextResponse.json({ message: 'Code required' }, { status: 400 })

      const twoFactorDoc = await adminDb.collection('twoFactor').doc(user.id).get()
      if (!twoFactorDoc.exists) {
        return NextResponse.json({ message: 'No 2FA setup in progress' }, { status: 400 })
      }

      const data = twoFactorDoc.data()!
      if (data.expiresAt < new Date().toISOString()) {
        return NextResponse.json({ message: 'Code expired. Start again.' }, { status: 400 })
      }

      if (data.code !== code) {
        // Track failed attempts
        const attempts = (data.attempts || 0) + 1
        if (attempts >= 5) {
          await adminDb.collection('twoFactor').doc(user.id).delete()
          return NextResponse.json({ message: 'Too many failed attempts. 2FA setup cancelled.' }, { status: 429 })
        }
        await adminDb.collection('twoFactor').doc(user.id).update({ attempts })
        return NextResponse.json({ message: `Invalid code. ${5 - attempts} attempts remaining.` }, { status: 400 })
      }

      // Enable 2FA
      await adminDb.collection('twoFactor').doc(user.id).set({
        enabled: true,
        pendingEnable: false,
        enabledAt: new Date().toISOString(),
      }, { merge: true })

      // Update user record
      await adminDb.collection('users').doc(user.id).update({
        twoFactorEnabled: true,
      })

      return NextResponse.json({ message: '2FA enabled successfully!' })
    }

    if (action === 'disable') {
      if (!code) return NextResponse.json({ message: 'Confirm with your 2FA code to disable' }, { status: 400 })

      const twoFactorDoc = await adminDb.collection('twoFactor').doc(user.id).get()
      if (!twoFactorDoc.exists || !twoFactorDoc.data()?.enabled) {
        return NextResponse.json({ message: '2FA is not enabled' }, { status: 400 })
      }

      if (twoFactorDoc.data()!.code !== code) {
        return NextResponse.json({ message: 'Invalid code' }, { status: 400 })
      }

      await adminDb.collection('twoFactor').doc(user.id).delete()
      await adminDb.collection('users').doc(user.id).update({ twoFactorEnabled: false })

      return NextResponse.json({ message: '2FA disabled' })
    }

    if (action === 'status') {
      const twoFactorDoc = await adminDb.collection('twoFactor').doc(user.id).get()
      const enabled = twoFactorDoc.exists && twoFactorDoc.data()?.enabled

      return NextResponse.json({ enabled })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('2FA error:', error)
    return NextResponse.json({ message: '2FA operation failed' }, { status: 500 })
  }
}
