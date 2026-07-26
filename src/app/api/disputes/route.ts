import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createDispute, listDisputes, resolveDispute } from '@/lib/security'
import { adminDb } from '@/lib/firebase/admin'
import * as z from 'zod'

const disputeSchema = z.object({
  againstUserId: z.string().min(1),
  againstUserName: z.string().min(1),
  matchId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  type: z.enum(['payment', 'harassment', 'fake_job', 'misrepresentation', 'off_platform', 'other']),
  description: z.string().min(10).max(2000),
  evidenceUrls: z.array(z.string()).optional().default([]),
})

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const isAdmin = session.user.role === 'admin'
  const disputes = await listDisputes(session.user.id, isAdmin ? 'admin' : 'user')
  return NextResponse.json({ disputes })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = disputeSchema.parse(body)

    // Prevent self-disputes
    if (data.againstUserId === session.user.id) {
      return NextResponse.json({ message: 'Cannot file a dispute against yourself' }, { status: 400 })
    }

    // Check for duplicate open disputes
    const existing = await adminDb.collection('disputes')
      .where('raisedBy', '==', session.user.id)
      .where('againstUserId', '==', data.againstUserId)
      .where('status', 'in', ['open', 'under_review'])
      .limit(1)
      .get()

    if (!existing.empty) {
      return NextResponse.json({ message: 'You already have an open dispute with this user' }, { status: 409 })
    }

    const dispute = await createDispute({
      raisedBy: session.user.id,
      raisedByName: session.user.fullName || session.user.email,
      againstUserId: data.againstUserId,
      againstUserName: data.againstUserName,
      matchId: data.matchId ?? null,
      jobId: data.jobId ?? null,
      type: data.type,
      description: data.description,
      evidenceUrls: data.evidenceUrls,
    })

    return NextResponse.json({ dispute })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ message: 'Failed to create dispute' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // Only admins can resolve disputes
  if (session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { disputeId, resolution, status } = body as {
      disputeId: string
      resolution: string
      status: 'resolved' | 'dismissed'
    }

    if (!disputeId || !resolution || !status) {
      return NextResponse.json({ message: 'disputeId, resolution, and status required' }, { status: 400 })
    }

    await resolveDispute(disputeId, resolution, session.user.id, status)
    return NextResponse.json({ message: 'Dispute resolved' })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to resolve dispute' }, { status: 500 })
  }
}
