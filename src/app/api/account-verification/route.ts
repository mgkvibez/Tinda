import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getUserById } from '@/lib/firebase'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    if (action === 'status') {
      const userRecord = await getUserById(user.id)
      if (!userRecord) return NextResponse.json({ message: 'User not found' }, { status: 404 })

      return NextResponse.json({
        emailVerified: userRecord.emailVerified || false,
        phoneVerified: userRecord.phoneVerified || false,
        identityVerified: userRecord.identityVerified || false,
        verificationLevel: userRecord.verificationLevel || 0,
        email: userRecord.email,
        phone: userRecord.phone || null,
      })
    }

    if (action === 'verify-email') {
      // Generate verification token
      const token = Math.random().toString(36).substring(2, 15)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      await adminDb.collection('verificationTokens').add({
        userId: user.id,
        type: 'email',
        token,
        expiresAt: expiresAt.toISOString(),
        used: false,
        createdAt: new Date().toISOString(),
      })

      // In production, send email with link. Dev: return token
      return NextResponse.json({
        message: 'Verification email sent. Check your inbox.',
        devToken: token, // Remove in production
      })
    }

    if (action === 'confirm-email') {
      const { token } = body as { token?: string }
      if (!token) return NextResponse.json({ message: 'Token required' }, { status: 400 })

      const tokenSnap = await adminDb
        .collection('verificationTokens')
        .where('userId', '==', user.id)
        .where('type', '==', 'email')
        .where('token', '==', token)
        .where('used', '==', false)
        .limit(1)
        .get()

      if (tokenSnap.empty) {
        return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 })
      }

      const tokenData = tokenSnap.docs[0].data()
      if (tokenData.expiresAt < new Date().toISOString()) {
        return NextResponse.json({ message: 'Token expired. Request a new one.' }, { status: 400 })
      }

      // Mark token as used
      await tokenSnap.docs[0].ref.update({ used: true })

      // Update user verification
      await adminDb.collection('users').doc(user.id).update({
        emailVerified: true,
        verificationLevel: 1,
      })

      return NextResponse.json({ message: 'Email verified successfully!', verificationLevel: 1 })
    }

    if (action === 'verify-phone') {
      const { phone } = body as { phone?: string }
      if (!phone) return NextResponse.json({ message: 'Phone number required' }, { status: 400 })

      // Generate 6-digit SMS code
      const smsCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      await adminDb.collection('phoneVerification').doc(user.id).set({
        phone,
        code: smsCode,
        expiresAt: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
        createdAt: new Date().toISOString(),
      })

      // In production, send SMS via Twilio. Dev: return code
      return NextResponse.json({
        message: 'SMS code sent to your phone.',
        devCode: smsCode, // Remove in production
      })
    }

    if (action === 'confirm-phone') {
      const { code } = body as { code?: string }
      if (!code) return NextResponse.json({ message: 'Code required' }, { status: 400 })

      const phoneDoc = await adminDb.collection('phoneVerification').doc(user.id).get()
      if (!phoneDoc.exists) {
        return NextResponse.json({ message: 'No phone verification in progress' }, { status: 400 })
      }

      const data = phoneDoc.data()!
      if (data.expiresAt < new Date().toISOString()) {
        return NextResponse.json({ message: 'Code expired' }, { status: 400 })
      }

      if (data.code !== code) {
        const attempts = (data.attempts || 0) + 1
        if (attempts >= 5) {
          await adminDb.collection('phoneVerification').doc(user.id).delete()
          return NextResponse.json({ message: 'Too many failed attempts. Start again.' }, { status: 429 })
        }
        await adminDb.collection('phoneVerification').doc(user.id).update({ attempts })
        return NextResponse.json({ message: `Invalid code. ${5 - attempts} attempts remaining.` }, { status: 400 })
      }

      // Mark as verified
      await adminDb.collection('phoneVerification').doc(user.id).update({ verified: true })
      await adminDb.collection('users').doc(user.id).update({
        phoneVerified: true,
        phone: data.phone,
        verificationLevel: 2,
      })

      return NextResponse.json({ message: 'Phone verified successfully!', verificationLevel: 2 })
    }

    if (action === 'verify-identity') {
      // Identity verification — in production this would integrate with
      // Stripe Identity, Onfido, or Persona. For now, mark as initiated.
      const { documentType } = body as { documentType?: string }

      await adminDb.collection('identityVerification').doc(user.id).set({
        userId: user.id,
        status: 'pending',
        documentType: documentType || 'government_id',
        initiatedAt: new Date().toISOString(),
      })

      return NextResponse.json({
        message: 'Identity verification initiated. In production, this would redirect to Stripe Identity / Onfido.',
        status: 'pending',
        note: 'Integration with Stripe Identity or Onfido needed for production.',
      })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Account verification error:', error)
    return NextResponse.json({ message: 'Verification failed' }, { status: 500 })
  }
}
