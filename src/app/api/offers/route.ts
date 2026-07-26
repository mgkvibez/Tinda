import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getOffers, createOffer, updateOfferStatus, createNotification } from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const role = (url.searchParams.get('role') as 'candidate' | 'employer') || 'candidate'
  const offers = await getOffers(session.user.id, role)
  return NextResponse.json({ offers })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { matchId, candidateId, jobId, jobTitle, companyName, salary, salaryCurrency, startDate, benefits, terms } = body

    const offer = await createOffer({
      matchId,
      candidateId,
      employerId: session.user.id,
      jobId,
      jobTitle,
      companyName,
      salary,
      salaryCurrency: salaryCurrency || 'NGN',
      startDate,
      benefits: benefits || [],
      terms,
    })

    await createNotification({
      userId: candidateId,
      type: 'offer',
      title: 'Job Offer Received!',
      body: `You received an offer from ${companyName} for ${jobTitle}`,
      data: { offerId: offer.id, matchId },
    })

    return NextResponse.json({ offer })
  } catch (error) {
    console.error('Create offer error:', error)
    return NextResponse.json({ message: 'Failed to create offer' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { offerId, status } = body

    const offer = await updateOfferStatus(offerId, status, session.user.id)
    if (!offer) return NextResponse.json({ message: 'Not authorized or offer not found' }, { status: 403 })

    const otherId = status === 'accepted' || status === 'declined' ? offer.employerId : offer.candidateId
    const msg = status === 'accepted' ? `Offer accepted for ${offer.jobTitle}` : status === 'declined' ? `Offer declined for ${offer.jobTitle}` : `Offer withdrawn for ${offer.jobTitle}`
    await createNotification({
      userId: otherId,
      type: 'offer',
      title: msg,
      body: msg,
      data: { offerId: offer.id },
    })

    return NextResponse.json({ offer })
  } catch (error) {
    console.error('Update offer error:', error)
    return NextResponse.json({ message: 'Failed to update offer' }, { status: 500 })
  }
}
