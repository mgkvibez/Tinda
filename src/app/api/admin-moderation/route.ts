import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

// Admin moderation panel — requires admin role
export async function GET(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // Check admin status
  const userDoc = await adminDb.collection('users').doc(user.id).get()
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const tab = url.searchParams.get('tab') || 'reports'

    if (tab === 'reports') {
      const snap = await adminDb
        .collection('reports')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()

      const reports: any[] = []
      for (const doc of snap.docs) {
        const data = doc.data()
        // Get reporter and target info
        const reporterDoc = await adminDb.collection('users').doc(data.reporterId).get()
        const reporterInfo = reporterDoc.exists
          ? { email: reporterDoc.data()?.email, displayName: reporterDoc.data()?.displayName }
          : null

        let targetInfo: any = null
        if (data.targetType === 'user') {
          const tDoc = await adminDb.collection('users').doc(data.targetId).get()
          targetInfo = tDoc.exists ? { email: tDoc.data()?.email, displayName: tDoc.data()?.displayName } : null
        } else if (data.targetType === 'job') {
          const tDoc = await adminDb.collection('jobs').doc(data.targetId).get()
          targetInfo = tDoc.exists ? { title: tDoc.data()?.title, companyName: tDoc.data()?.companyName } : null
        }

        reports.push({
          id: doc.id,
          ...data,
          reporterInfo,
          targetInfo,
        })
      }

      return NextResponse.json({ reports })
    }

    if (tab === 'flagged-users') {
      const snap = await adminDb
        .collection('users')
        .where('flagged', '==', true)
        .get()

      const users = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      return NextResponse.json({ users })
    }

    if (tab === 'flagged-jobs') {
      const snap = await adminDb
        .collection('jobs')
        .where('flagged', '==', true)
        .get()

      const jobs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      return NextResponse.json({ jobs })
    }

    if (tab === 'suspicious') {
      const snap = await adminDb
        .collection('suspiciousActivity')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()

      const activities = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      return NextResponse.json({ activities })
    }

    if (tab === 'stats') {
      const [reportsSnap, flaggedUsersSnap, flaggedJobsSnap, suspiciousSnap] = await Promise.all([
        adminDb.collection('reports').where('status', '==', 'pending').get(),
        adminDb.collection('users').where('flagged', '==', true).get(),
        adminDb.collection('jobs').where('flagged', '==', true).get(),
        adminDb.collection('suspiciousActivity').get(),
      ])

      return NextResponse.json({
        pendingReports: reportsSnap.size,
        flaggedUsers: flaggedUsersSnap.size,
        flaggedJobs: flaggedJobsSnap.size,
        suspiciousActivities: suspiciousSnap.size,
      })
    }

    return NextResponse.json({ message: 'Unknown tab' }, { status: 400 })
  } catch (error) {
    console.error('Admin moderation error:', error)
    return NextResponse.json({ message: 'Failed to fetch moderation data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth(request)
  const user = session?.user
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // Check admin status
  const userDoc = await adminDb.collection('users').doc(user.id).get()
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, reportId, userId, jobId, resolution } = body as {
      action: string
      reportId?: string
      userId?: string
      jobId?: string
      resolution?: string
    }

    if (action === 'resolve-report') {
      if (!reportId || !resolution) {
        return NextResponse.json({ message: 'reportId and resolution required' }, { status: 400 })
      }

      await adminDb.collection('reports').doc(reportId).update({
        status: 'resolved',
        resolution,
        resolvedBy: user.id,
        resolvedAt: new Date().toISOString(),
      })

      return NextResponse.json({ message: 'Report resolved' })
    }

    if (action === 'ban-user') {
      if (!userId) return NextResponse.json({ message: 'userId required' }, { status: 400 })

      await adminDb.collection('users').doc(userId).update({
        banned: true,
        bannedAt: new Date().toISOString(),
        bannedBy: user.id,
      })

      // Also disable their jobs
      const jobsSnap = await adminDb.collection('jobs').where('employerId', '==', userId).get()
      const batch = adminDb.batch()
      for (const jobDoc of jobsSnap.docs) {
        batch.update(jobDoc.ref, { active: false, removedAt: new Date().toISOString() })
      }
      await batch.commit()

      return NextResponse.json({ message: 'User banned and jobs removed' })
    }

    if (action === 'unban-user') {
      if (!userId) return NextResponse.json({ message: 'userId required' }, { status: 400 })

      await adminDb.collection('users').doc(userId).update({
        banned: false,
        bannedAt: null,
        bannedBy: null,
        flagged: false,
        flagReason: null,
      })

      return NextResponse.json({ message: 'User unbanned' })
    }

    if (action === 'remove-job') {
      if (!jobId) return NextResponse.json({ message: 'jobId required' }, { status: 400 })

      await adminDb.collection('jobs').doc(jobId).update({
        active: false,
        removedAt: new Date().toISOString(),
        removedBy: user.id,
      })

      return NextResponse.json({ message: 'Job removed' })
    }

    if (action === 'restore-job') {
      if (!jobId) return NextResponse.json({ message: 'jobId required' }, { status: 400 })

      await adminDb.collection('jobs').doc(jobId).update({
        active: true,
        flagged: false,
        flagReason: null,
        removedAt: null,
        removedBy: null,
      })

      return NextResponse.json({ message: 'Job restored' })
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Admin action error:', error)
    return NextResponse.json({ message: 'Action failed' }, { status: 500 })
  }
}
