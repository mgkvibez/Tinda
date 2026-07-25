import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEmployerProfile, upsertEmployerProfile } from '@/lib/firebase'

// POST: Request employer verification
export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { companyWebsite, companyEmail, linkedinUrl } = body

    if (!companyWebsite || !companyEmail) {
      return NextResponse.json({ message: 'Company website and email required' }, { status: 400 })
    }

    // In production, this would trigger an async verification process
    // (email verification, domain check, LinkedIn cross-reference)
    // For now, we store the verification request and auto-verify if email domain matches website domain

    let isVerified = false
    try {
      const websiteDomain = new URL(companyWebsite).hostname.replace(/^www\./, '')
      const emailDomain = companyEmail.split('@')[1]
      if (websiteDomain === emailDomain) {
        isVerified = true
      }
    } catch {
      // Invalid URL, leave unverified
    }

    await upsertEmployerProfile(session.user.id, {
      isVerified,
      website: companyWebsite,
      recruiterEmail: companyEmail,
    })

    return NextResponse.json({
      message: isVerified
        ? 'Verification successful! Your company is now verified.'
        : 'Verification submitted. We will review your request within 48 hours.',
      isVerified,
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ message: 'Failed to submit verification' }, { status: 500 })
  }
}

// GET: Check verification status
export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const profile = await getEmployerProfile(session.user.id)
  return NextResponse.json({ isVerified: profile?.isVerified || false })
}
