import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getJobById, getCandidateProfile, getEmployerProfile } from '@/lib/firebase'
import { generateCoverLetter } from '@/lib/cover-letter'

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json({ message: 'Job ID required' }, { status: 400 })
    }

    const job = await getJobById(jobId)
    if (!job) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 })
    }

    const candidate = await getCandidateProfile(session.user.id)
    if (!candidate) {
      return NextResponse.json({ message: 'Please complete your profile first' }, { status: 400 })
    }

    const employer = await getEmployerProfile(job.employerId)

    const coverLetter = generateCoverLetter(job, candidate, employer)

    return NextResponse.json({ coverLetter })
  } catch (error) {
    console.error('Cover letter error:', error)
    return NextResponse.json({ message: 'Failed to generate cover letter' }, { status: 500 })
  }
}
