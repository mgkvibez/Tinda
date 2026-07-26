import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCandidateNotes, createCandidateNote, deleteCandidateNote } from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const candidateId = url.searchParams.get('candidateId')

  if (!candidateId) return NextResponse.json({ message: 'Missing candidateId' }, { status: 400 })

  const notes = await getCandidateNotes(session.user.id, candidateId)
  return NextResponse.json({ notes })
}

export async function POST(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { candidateId, matchId, note, color } = body

    const created = await createCandidateNote({
      employerId: session.user.id,
      candidateId,
      matchId: matchId || null,
      note,
      color: color || 'yellow',
    })

    return NextResponse.json({ note: created })
  } catch (error) {
    console.error('Create note error:', error)
    return NextResponse.json({ message: 'Failed to create note' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const noteId = url.searchParams.get('id')

  if (!noteId) return NextResponse.json({ message: 'Missing note id' }, { status: 400 })

  await deleteCandidateNote(noteId, session.user.id)
  return NextResponse.json({ message: 'Note deleted' })
}
