import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { auth } from '@/lib/auth'

// ─── Dispute Resolution System ──────────────────────────

export interface Dispute {
  id: string
  raisedBy: string
  raisedByName: string
  againstUserId: string
  againstUserName: string
  matchId?: string | null
  jobId?: string | null
  type: 'payment' | 'harassment' | 'fake_job' | 'misrepresentation' | 'off_platform' | 'other'
  description: string
  evidenceUrls?: string[]
  status: 'open' | 'under_review' | 'resolved' | 'dismissed'
  resolution?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  createdAt: string
  updatedAt: string
}

export async function createDispute(data: {
  raisedBy: string
  raisedByName: string
  againstUserId: string
  againstUserName: string
  matchId?: string | null
  jobId?: string | null
  type: Dispute['type']
  description: string
  evidenceUrls?: string[]
}): Promise<Dispute> {
  const now = new Date().toISOString()
  const docRef = adminDb.collection('disputes').doc()
  const dispute: Dispute = {
    id: docRef.id,
    raisedBy: data.raisedBy,
    raisedByName: data.raisedByName,
    againstUserId: data.againstUserId,
    againstUserName: data.againstUserName,
    matchId: data.matchId ?? null,
    jobId: data.jobId ?? null,
    type: data.type,
    description: data.description,
    evidenceUrls: data.evidenceUrls ?? [],
    status: 'open',
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await docRef.set(dispute)
  return dispute
}

export async function listDisputes(userId?: string, role?: 'user' | 'admin'): Promise<Dispute[]> {
  let query
  if (role === 'admin') {
    query = adminDb.collection('disputes').orderBy('createdAt', 'desc')
  } else if (userId) {
    query = adminDb.collection('disputes')
      .where('raisedBy', '==', userId)
      .orderBy('createdAt', 'desc')
  } else {
    return []
  }
  const snap = await query.get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Dispute))
}

export async function resolveDispute(disputeId: string, resolution: string, resolvedBy: string, status: 'resolved' | 'dismissed'): Promise<void> {
  const now = new Date().toISOString()
  await adminDb.collection('disputes').doc(disputeId).update({
    status,
    resolution,
    resolvedBy,
    resolvedAt: now,
    updatedAt: now,
  })
}

// ─── Session Management ─────────────────────────────────

export interface SessionRecord {
  id: string
  userId: string
  deviceInfo: string
  ipAddress: string
  location?: string | null
  createdAt: string
  lastActiveAt: string
  isActive: boolean
}

export async function createSession(userId: string, deviceInfo: string, ipAddress: string): Promise<SessionRecord> {
  const now = new Date().toISOString()
  const docRef = adminDb.collection('sessions').doc()
  const session: SessionRecord = {
    id: docRef.id,
    userId,
    deviceInfo,
    ipAddress,
    location: null,
    createdAt: now,
    lastActiveAt: now,
    isActive: true,
  }
  await docRef.set(session)
  return session
}

export async function listUserSessions(userId: string): Promise<SessionRecord[]> {
  const snap = await adminDb.collection('sessions')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .orderBy('lastActiveAt', 'desc')
    .get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SessionRecord))
}

export async function revokeSession(sessionId: string): Promise<void> {
  await adminDb.collection('sessions').doc(sessionId).update({
    isActive: false,
    lastActiveAt: new Date().toISOString(),
  })
}

export async function revokeAllSessionsExcept(userId: string, exceptSessionId: string): Promise<void> {
  const snap = await adminDb.collection('sessions')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get()
  const batch = adminDb.batch()
  for (const doc of snap.docs) {
    if (doc.id !== exceptSessionId) {
      batch.update(doc.ref, { isActive: false, lastActiveAt: new Date().toISOString() })
    }
  }
  await batch.commit()
}

// ─── Security Audit Log ──────────────────────────────────

export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  category: 'auth' | 'dispute' | 'moderation' | 'block' | 'verification' | 'session' | 'freeze' | 'report' | 'settings'
  description: string
  ipAddress?: string | null
  metadata?: Record<string, any>
  severity: 'info' | 'warning' | 'critical'
  createdAt: string
}

export async function logSecurityEvent(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<void> {
  const docRef = adminDb.collection('security_audit_log').doc()
  const log: AuditLogEntry = {
    ...entry,
    id: docRef.id,
    createdAt: new Date().toISOString(),
  }
  await docRef.set(log)
}

export async function getAuditLog(userId?: string, limit = 50): Promise<AuditLogEntry[]> {
  let query
  if (userId) {
    query = adminDb.collection('security_audit_log')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
  } else {
    query = adminDb.collection('security_audit_log')
      .orderBy('createdAt', 'desc')
      .limit(limit)
  }
  const snap = await query.get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuditLogEntry))
}

// ─── Account Freeze / Auto-Lock ──────────────────────────

export async function freezeAccount(userId: string, reason: string, frozenBy: 'system' | 'admin'): Promise<void> {
  const now = new Date().toISOString()
  await adminDb.collection('users').doc(userId).update({
    isFrozen: true,
    frozenReason: reason,
    frozenAt: now,
    frozenBy,
  })

  // Revoke all sessions
  const snap = await adminDb.collection('sessions')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get()
  const batch = adminDb.batch()
  for (const doc of snap.docs) {
    batch.update(doc.ref, { isActive: false, lastActiveAt: now })
  }
  await batch.commit()

  // Log it
  await logSecurityEvent({
    userId,
    action: 'account_frozen',
    category: 'freeze',
    description: `Account frozen by ${frozenBy}: ${reason}`,
    severity: 'critical',
    metadata: { reason, frozenBy },
  })

  // Notify
  await adminDb.collection('notifications').add({
    userId,
    type: 'security',
    title: 'Account Security Action',
    message: `Your account has been frozen. Reason: ${reason}. Please contact support if you believe this is an error.`,
    read: false,
    createdAt: now,
  })
}

export async function unfreezeAccount(userId: string, unfrozenBy: string): Promise<void> {
  await adminDb.collection('users').doc(userId).update({
    isFrozen: false,
    frozenReason: null,
    frozenAt: null,
    frozenBy: null,
    unfrozenAt: new Date().toISOString(),
    unfrozenBy: unfrozenBy,
  })

  await logSecurityEvent({
    userId,
    action: 'account_unfrozen',
    category: 'freeze',
    description: `Account unfrozen by ${unfrozenBy}`,
    severity: 'info',
    metadata: { unfrozenBy },
  })
}

export async function checkAndAutoFreeze(userId: string): Promise<boolean> {
  // Count critical scam detections in last 24h
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const scamSnap = await adminDb.collection('security_audit_log')
    .where('userId', '==', userId)
    .where('category', '==', 'moderation')
    .where('severity', '==', 'critical')
    .get()

  const recentCritical = scamSnap.docs.filter((d) => {
    const data = d.data() as AuditLogEntry
    return data.createdAt > yesterday
  }).length

  // Count reports against this user
  const reportSnap = await adminDb.collection('reports')
    .where('reportedUserId', '==', userId)
    .where('status', '==', 'pending')
    .get()

  const pendingReports = reportSnap.size

  // Auto-freeze if 3+ critical scam detections OR 5+ pending reports
  if (recentCritical >= 3 || pendingReports >= 5) {
    const reason = recentCritical >= 3
      ? `Automatic freeze: ${recentCritical} critical scam detections in 24h`
      : `Automatic freeze: ${pendingReports} pending reports against account`
    await freezeAccount(userId, reason, 'system')
    return true
  }

  return false
}

// ─── Escrow / Offer Protection ───────────────────────────

export interface OfferProtection {
  id: string
  offerId: string
  candidateId: string
  employerId: string
  jobId: string
  agreedSalary: number
  depositAmount: number
  depositStatus: 'pending' | 'funded' | 'released' | 'refunded' | 'disputed'
  fundedAt?: string | null
  releasedAt?: string | null
  disputeId?: string | null
  createdAt: string
  updatedAt: string
}

export async function createOfferProtection(data: {
  offerId: string
  candidateId: string
  employerId: string
  jobId: string
  agreedSalary: number
}): Promise<OfferProtection> {
  const now = new Date().toISOString()
  const depositAmount = Math.round(data.agreedSalary * 0.1) // 10% deposit for protection
  const docRef = adminDb.collection('offer_protection').doc()
  const protection: OfferProtection = {
    id: docRef.id,
    offerId: data.offerId,
    candidateId: data.candidateId,
    employerId: data.employerId,
    jobId: data.jobId,
    agreedSalary: data.agreedSalary,
    depositAmount,
    depositStatus: 'pending',
    fundedAt: null,
    releasedAt: null,
    disputeId: null,
    createdAt: now,
    updatedAt: now,
  }
  await docRef.set(protection)
  return protection
}

export async function fundOfferProtection(protectionId: string): Promise<void> {
  const now = new Date().toISOString()
  await adminDb.collection('offer_protection').doc(protectionId).update({
    depositStatus: 'funded',
    fundedAt: now,
    updatedAt: now,
  })
}

export async function releaseOfferProtection(protectionId: string): Promise<void> {
  const now = new Date().toISOString()
  await adminDb.collection('offer_protection').doc(protectionId).update({
    depositStatus: 'released',
    releasedAt: now,
    updatedAt: now,
  })
}

export async function getOfferProtection(offerId: string): Promise<OfferProtection | null> {
  const snap = await adminDb.collection('offer_protection')
    .where('offerId', '==', offerId)
    .limit(1)
    .get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as OfferProtection
}

// ─── Security Notifications ─────────────────────────────

export async function sendSecurityNotification(userId: string, title: string, message: string, severity: 'info' | 'warning' | 'critical' = 'info'): Promise<void> {
  await adminDb.collection('notifications').add({
    userId,
    type: 'security',
    title,
    message,
    severity,
    read: false,
    createdAt: new Date().toISOString(),
  })

  await logSecurityEvent({
    userId,
    action: 'security_notification_sent',
    category: 'settings',
    description: `${title}: ${message}`,
    severity,
  })
}
