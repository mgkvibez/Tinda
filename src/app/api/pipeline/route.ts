import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getEmployerPipeline,
  updateMatchStage,
  MatchStage,
  UserType,
} from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const pipeline = await getEmployerPipeline(session.user.id)
  return NextResponse.json({ pipeline })
}

export async function PATCH(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { matchId, stage, notes } = body

    const validStages: MatchStage[] = ['matched', 'screening', 'interviewing', 'offer', 'hired', 'rejected']
    if (!validStages.includes(stage)) {
      return NextResponse.json({ message: 'Invalid stage' }, { status: 400 })
    }

    await updateMatchStage(matchId, stage, notes)
    return NextResponse.json({ message: 'Stage updated' })
  } catch (error) {
    console.error('Pipeline update error:', error)
    return NextResponse.json({ message: 'Failed to update stage' }, { status: 500 })
  }
}
