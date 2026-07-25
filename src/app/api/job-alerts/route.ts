import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  createJobAlert,
  listJobAlerts,
  updateJobAlert,
  deleteJobAlert,
} from '@/lib/firebase'
import * as z from 'zod'

const alertSchema = z.object({
  keywords: z.array(z.string()).optional().default([]),
  location: z.string().nullable().optional(),
  salaryMin: z.number().nullable().optional(),
  jobTypes: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
})

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const alerts = await listJobAlerts(session.user.id)
  return NextResponse.json({ alerts })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = alertSchema.parse(body)

    const alert = await createJobAlert({
      candidateId: session.user.id,
      ...data,
    })

    return NextResponse.json({ alert })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    return NextResponse.json({ message: 'Failed to create alert' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const alertId = url.searchParams.get('id')

  if (!alertId) return NextResponse.json({ message: 'Alert ID required' }, { status: 400 })

  await deleteJobAlert(alertId)
  return NextResponse.json({ message: 'Alert deleted' })
}
