import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveJob, unsaveJob, listSavedJobs, isJobSaved, getJobById } from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const jobId = url.searchParams.get('jobId')

  // Check if a specific job is saved
  if (jobId) {
    const saved = await isJobSaved(session.user.id, jobId)
    return NextResponse.json({ saved })
  }

  // List all saved jobs
  const saved = await listSavedJobs(session.user.id)
  const enriched = []
  for (const s of saved) {
    const job = await getJobById(s.jobId)
    if (job) enriched.push({ ...s, job })
  }

  return NextResponse.json({ savedJobs: enriched })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { jobId, action } = body

    if (action === 'save') {
      await saveJob(session.user.id, jobId)
      return NextResponse.json({ message: 'Job saved' })
    } else if (action === 'unsave') {
      await unsaveJob(session.user.id, jobId)
      return NextResponse.json({ message: 'Job removed' })
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ message: 'Failed to save job' }, { status: 500 })
  }
}
