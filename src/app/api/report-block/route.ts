import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { action, targetType, targetId, reason, details } = body

    if (action === 'report') {
      if (!targetType || !targetId || !reason) {
        return NextResponse.json({ message: 'targetType, targetId, and reason required' }, { status: 400 })
      }

      // Check for duplicate reports
      const existing = await adminDb
        .collection('reports')
        .where('reporterId', '==', user.id)
        .where('targetId', '==', targetId)
        .limit(1)
        .get()

      if (!existing.empty) {
        return NextResponse.json({ message: 'You have already reported this' }, { status: 409 })
      }

      const report = {
        reporterId: user.id,
        targetType, // 'user' | 'job' | 'message'
        targetId,
        reason, // 'scam' | 'fake_profile' | 'inappropriate' | 'spam' | 'harassment' | 'misleading_job' | 'other'
        details: details || '',
        status: 'pending', // 'pending' | 'reviewing' | 'resolved' | 'dismissed'
        createdAt: new Date().toISOString(),
      }

      const ref = await adminDb.collection('reports').add(report)

      // Auto-flag if target has multiple reports
      const allReports = await adminDb
        .collection('reports')
        .where('targetId', '==', targetId)
        .get()

      if (allReports.size >= 3) {
        // Auto-hide content after 3 reports (like Reddit/LinkedIn)
        if (targetType === 'job') {
          await adminDb.collection('jobs').doc(targetId).update({
            flagged: true,
            flagReason: 'Multiple reports received',
            flaggedAt: new Date().toISOString(),
          })
        } else if (targetType === 'user') {
          await adminDb.collection('users').doc(targetId).update({
            flagged: true,
            flagReason: 'Multiple reports received',
            flaggedAt: new Date().toISOString(),
          })
        }
      }

      return NextResponse.json({ id: ref.id, message: 'Report submitted successfully', reportCount: allReports.size })
    }

    if (action === 'block') {
      if (!targetId) {
        return NextResponse.json({ message: 'targetId required' }, { status: 400 })
      }

      // Add to blocked users collection
      await adminDb.collection('blockedUsers').add({
        blockerId: user.id,
        blockedId: targetId,
        createdAt: new Date().toISOString(),
      })

      // Also remove any existing matches/conversations
      const matches = await adminDb
        .collection('matches')
        .where('participant1Id', '==', user.id)
        .where('participant2Id', '==', targetId)
        .get()
      const matches2 = await adminDb
        .collection('matches')
        .where('participant1Id', '==', targetId)
        .where('participant2Id', '==', user.id)
        .get()

      const batch = adminDb.batch()
      for (const m of [...matches.docs, ...matches2.docs]) {
        batch.update(m.ref, { blocked: true })
      }
      await batch.commit()

      return NextResponse.json({ message: 'User blocked successfully' })
    }

    if (action === 'unblock') {
      if (!targetId) {
        return NextResponse.json({ message: 'targetId required' }, { status: 400 })
      }

      const blocked = await adminDb
        .collection('blockedUsers')
        .where('blockerId', '==', user.id)
        .where('blockedId', '==', targetId)
        .limit(1)
        .get()

      if (!blocked.empty) {
        await blocked.docs[0].ref.delete()
      }

      return NextResponse.json({ message: 'User unblocked successfully' })
    }

    if (action === 'list-blocked') {
      const blocked = await adminDb
        .collection('blockedUsers')
        .where('blockerId', '==', user.id)
        .get()

      const blockedUsers: any[] = []
      for (const doc of blocked.docs) {
        const data = doc.data()
        const userDoc = await adminDb.collection('users').doc(data.blockedId).get()
        blockedUsers.push({
          id: doc.id,
          blockedId: data.blockedId,
          name: userDoc.exists ? ((userDoc.data() as any)?.displayName || (userDoc.data() as any)?.email) : 'Unknown',
          createdAt: data.createdAt,
        })
      }

      return NextResponse.json({ blockedUsers })
    }

    if (action === 'check-blocked') {
      const { otherUserId } = body
      if (!otherUserId) return NextResponse.json({ message: 'otherUserId required' }, { status: 400 })

      const isBlocked = await adminDb
        .collection('blockedUsers')
        .where('blockerId', '==', user.id)
        .where('blockedId', '==', otherUserId)
        .limit(1)
        .get()

      const isBlockedBy = await adminDb
        .collection('blockedUsers')
        .where('blockerId', '==', otherUserId)
        .where('blockedId', '==', user.id)
        .limit(1)
        .get()

      return NextResponse.json({
        isBlocked: !isBlocked.empty,
        isBlockedBy: !isBlockedBy.empty,
        canInteract: isBlocked.empty && isBlockedBy.empty,
      })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Report/block error:', error)
    return NextResponse.json({ message: 'Operation failed' }, { status: 500 })
  }
}
