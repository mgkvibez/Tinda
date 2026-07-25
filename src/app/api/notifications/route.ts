import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action === 'unread_count') {
    const count = await getUnreadNotificationCount(session.user.id)
    return NextResponse.json({ count })
  }

  const notifications = await listNotifications(session.user.id)
  return NextResponse.json({ notifications })
}

export async function PATCH(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { notificationId, markAll } = body

    if (markAll) {
      await markAllNotificationsRead(session.user.id)
      return NextResponse.json({ message: 'All notifications marked as read' })
    }

    if (notificationId) {
      await markNotificationRead(notificationId)
      return NextResponse.json({ message: 'Notification marked as read' })
    }

    return NextResponse.json({ message: 'Nothing to do' }, { status: 400 })
  } catch {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
  }
}
