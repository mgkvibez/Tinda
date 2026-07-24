import 'server-only'
import { adminAuth, adminDb } from './firebase/admin'

export async function getAuthenticatedUser(req?: Request) {
  try {
    const token = req?.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded
  } catch { return null }
}

// Dummy exports to make old [...nextauth] route not crash - we are moving to Firebase Auth
export const auth = { getAuthenticatedUser }
export const GET = async () => new Response('Use Firebase Auth', { status: 200 })
export const POST = async () => new Response('Use Firebase Auth', { status: 200 })