import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getReferrals, createReferral } from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const referrals = await getReferrals(session.user.id)
  return NextResponse.json({ referrals })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { jobId, jobTitle, referredEmail, referredName } = body

    const referral = await createReferral({
      referrerId: session.user.id,
      referrerName: session.user.name || 'Someone',
      jobId,
      jobTitle,
      referredEmail,
      referredName,
      reward: 'Profile boost + badge',
    })

    return NextResponse.json({ referral })
  } catch (error) {
    console.error('Create referral error:', error)
    return NextResponse.json({ message: 'Failed to create referral' }, { status: 500 })
  }
}
