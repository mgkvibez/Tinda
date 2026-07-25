import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  scheduleInterview,
  listInterviews,
  updateInterviewStatus,
  getInterviewById,
  createNotification,
} from '@/lib/firebase'
import * as z from 'zod'

const scheduleSchema = z.object({
  matchId: z.string(),
  candidateId: z.string(),
  employerId: z.string(),
  jobId: z.string(),
  scheduledAt: z.string(),
  duration: z.number().min(15).max(180),
  type: z.enum(['video', 'phone', 'in_person']),
  location: z.string().nullable().optional(),
  meetingUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const interviews = await listInterviews(session.user.id)

  // Enrich with job and candidate info
  const { getJobById, getCandidateProfile } = await import('@/lib/firebase')
  const enriched = []
  for (const interview of interviews) {
    const job = await getJobById(interview.jobId)
    const candidate = await getCandidateProfile(interview.candidateId)
    enriched.push({ ...interview, job, candidate })
  }

  return NextResponse.json({ interviews: enriched })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = scheduleSchema.parse(body)

    const interview = await scheduleInterview({
      ...data,
      status: 'scheduled',
    })

    return NextResponse.json({ interview })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    console.error('Interview scheduling error:', error)
    return NextResponse.json({ message: 'Failed to schedule interview' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { interviewId, status } = body

    await updateInterviewStatus(interviewId, status)

    // Notify the other party
    const interview = await getInterviewById(interviewId)
    if (interview) {
      const otherId = session.user.id === interview.candidateId ? interview.employerId : interview.candidateId
      await createNotification({
        userId: otherId,
        type: 'interview_update',
        title: 'Interview Updated',
        body: `Interview status changed to ${status}`,
        data: { interviewId },
      })
    }

    return NextResponse.json({ message: 'Interview updated' })
  } catch (error) {
    console.error('Interview update error:', error)
    return NextResponse.json({ message: 'Failed to update interview' }, { status: 500 })
  }
}
