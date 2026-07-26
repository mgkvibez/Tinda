import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuditLog } from '@/lib/security'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const userId = url.searchParams.get('userId')

  // Only admins can view other users' audit logs
  const targetUserId = userId && session.user.role === 'admin' ? userId : session.user.id

  const logs = await getAuditLog(targetUserId, limit)
  return NextResponse.json({ logs })
}
