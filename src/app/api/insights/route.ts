import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCandidateInsights } from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const insights = await getCandidateInsights(session.user.id)
  return NextResponse.json({ insights })
}
