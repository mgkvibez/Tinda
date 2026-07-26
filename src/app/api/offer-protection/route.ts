import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createOfferProtection, fundOfferProtection, releaseOfferProtection, getOfferProtection } from '@/lib/security'
import { logSecurityEvent } from '@/lib/security'
import * as z from 'zod'

const createSchema = z.object({
  offerId: z.string().min(1),
  candidateId: z.string().min(1),
  employerId: z.string().min(1),
  jobId: z.string().min(1),
  agreedSalary: z.number().min(0),
})

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const offerId = url.searchParams.get('offerId')

  if (!offerId) {
    return NextResponse.json({ message: 'offerId required' }, { status: 400 })
  }

  const protection = await getOfferProtection(offerId)
  return NextResponse.json({ protection })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    // Only the employer on the offer can create protection
    if (session.user.id !== data.employerId) {
      return NextResponse.json({ message: 'Only the employer can create offer protection' }, { status: 403 })
    }

    const protection = await createOfferProtection(data)

    await logSecurityEvent({
      userId: session.user.id,
      action: 'offer_protection_created',
      category: 'settings',
      description: `Created offer protection for offer ${data.offerId} with deposit ${protection.depositAmount}`,
      severity: 'info',
      metadata: { offerId: data.offerId, protectionId: protection.id },
    })

    return NextResponse.json({ protection })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ message: 'Failed to create offer protection' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { protectionId, action } = body as { protectionId: string; action: 'fund' | 'release' }

    if (!protectionId || !action) {
      return NextResponse.json({ message: 'protectionId and action required' }, { status: 400 })
    }

    if (action === 'fund') {
      await fundOfferProtection(protectionId)
      await logSecurityEvent({
        userId: session.user.id,
        action: 'offer_protection_funded',
        category: 'settings',
        description: `Funded offer protection ${protectionId}`,
        severity: 'info',
      })
      return NextResponse.json({ message: 'Deposit funded' })
    } else if (action === 'release') {
      await releaseOfferProtection(protectionId)
      await logSecurityEvent({
        userId: session.user.id,
        action: 'offer_protection_released',
        category: 'settings',
        description: `Released offer protection ${protectionId}`,
        severity: 'info',
      })
      return NextResponse.json({ message: 'Deposit released' })
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update offer protection' }, { status: 500 })
  }
}
