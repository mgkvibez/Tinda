import 'server-only'
import { adminAuth } from './firebase/admin'
import { getUserById, UserType } from './firebase'

export interface AuthSession {
  user: {
    id: string
    email: string
    name: string
    userType: UserType
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
      // No request passed — can't authenticate
      return null
    }

    // Check if it's a Request object (has headers)
    if (requestOrCookies instanceof Request) {
      // Try cookie first
      const cookieHeader = requestOrCookies.headers.get('cookie') || ''
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map((c) => {
          const [key, ...vals] = c.split('=')
          return [key, vals.join('=')]
        })
      )
      token = cookies['__session']

      // Fall back to Authorization header
      if (!token) {
        const authHeader = requestOrCookies.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.replace('Bearer ', '')
        }
      }
    } else if (requestOrCookies.cookies?.get) {
      // Middleware-style object with cookies.get()
      token = requestOrCookies.cookies.get('__session')?.value
    }

    if (!token) return null

    const decoded = await adminAuth.verifyIdToken(token)
    const userRecord = await getUserById(decoded.uid)
    if (!userRecord) return null

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        userType: userRecord.userType,
      },
    }
  } catch {
    return null
  }
}

// Keep for backward compatibility with any code that uses getAuthenticatedUser
export async function getAuthenticatedUser(req?: Request) {
  const session = await auth(req)
  return session?.user ?? null
}
