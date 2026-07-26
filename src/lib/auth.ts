import 'server-only'
import { adminAuth } from './firebase/admin'
import { adminDb } from './firebase/admin'
import { getUserById, UserType } from './firebase'

export interface AuthSession {
  user: {
    id: string
    email: string
    name: string
    fullName: string
    userType: UserType
    role: string
    sessionId?: string
    isFrozen: boolean
    frozenReason?: string | null
  }
}

/**
 * Verifies the Firebase ID token from the __session cookie
 * and returns the authenticated user, or null.
 *
 * Works for both Next.js Route Handlers (Request object) and
 * Next.js middleware (NextRequest with cookies).
 */
export async function auth(requestOrCookies?: Request | { cookies: { get: (name: string) => { value: string } | undefined } }): Promise<AuthSession | null> {
  try {
    let token: string | undefined

    if (!requestOrCookies) {
      return null
    }

    if (requestOrCookies instanceof Request) {
      const cookieHeader = requestOrCookies.headers.get('cookie') || ''
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map((c) => {
          const [key, ...vals] = c.split('=')
          return [key, vals.join('=')]
        })
      )
      token = cookies['__session']

      if (!token) {
        const authHeader = requestOrCookies.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.replace('Bearer ', '')
        }
      }
    } else if (requestOrCookies.cookies?.get) {
      token = requestOrCookies.cookies.get('__session')?.value
    }

    if (!token) return null

    const decoded = await adminAuth.verifyIdToken(token)
    const userRecord = await getUserById(decoded.uid)
    if (!userRecord) return null

    // Check if account is frozen
    if (userRecord.banned) {
      return null
    }

    // Check for freeze status from Firestore
    let isFrozen = false
    let frozenReason: string | null = null
    try {
      const userDoc = await adminDb.collection('users').doc(userRecord.id).get()
      if (userDoc.exists) {
        const userData = userDoc.data()!
        isFrozen = userData.isFrozen || false
        frozenReason = userData.frozenReason || null
      }
    } catch {
      // If we can't check, don't block
    }

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        fullName: userRecord.name,
        userType: userRecord.userType,
        role: userRecord.role || 'user',
        isFrozen,
        frozenReason,
      },
    }
  } catch {
    return null
  }
}

export async function getAuthenticatedUser(req?: Request) {
  const session = await auth(req)
  return session?.user ?? null
}
