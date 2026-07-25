import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listMessages,
  saveMessage,
  markMessagesRead,
  getConversation,
} from '@/lib/firebase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await params

  // Verify the user is a participant
  const conversation = await getConversation(conversationId)
  if (!conversation) {
    return NextResponse.json({ message: 'Conversation not found' }, { status: 404 })
  }

  const userId = session.user.id
  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
  }

  const messages = await listMessages(conversationId)

  // Mark as read
  await markMessagesRead(conversationId, userId)

  return NextResponse.json({ messages, conversation })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await params
  const userId = session.user.id

  // Verify participant
  const conversation = await getConversation(conversationId)
  if (!conversation) {
    return NextResponse.json({ message: 'Conversation not found' }, { status: 404 })
  }
  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ message: 'Message text required' }, { status: 400 })
    }

    const message = await saveMessage({
      conversationId,
      senderId: userId,
      text: text.trim(),
      read: false,
    })

    // Create a notification for the other participant
    const recipientId = conversation.participant1Id === userId
      ? conversation.participant2Id
      : conversation.participant1Id

    const { createNotification } = await import('@/lib/firebase')
    await createNotification({
      userId: recipientId,
      type: 'new_message',
      title: 'New Message',
      body: `${session.user.name}: ${text.trim().slice(0, 50)}...`,
      data: { conversationId },
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ message: 'Failed to send message' }, { status: 500 })
  }
}
