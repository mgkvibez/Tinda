'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase/client'
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  signInWithGoogle: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Set persistence to local so the user stays logged in across sessions
    setPersistence(auth, browserLocalPersistence).catch(console.error)

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        // Sync ID token to a cookie so middleware/API routes can verify it
        const token = await currentUser.getIdToken()
        document.cookie = `__session=${token}; path=/; Secure; SameSite=Strict; max-age=3600`

        // Set up token refresh — Firebase tokens expire in 1 hour
        // Refresh the cookie 5 minutes before expiry
        const refreshTimer = setTimeout(async () => {
          if (auth.currentUser) {
            const freshToken = await auth.currentUser.getIdToken(true)
            document.cookie = `__session=${freshToken}; path=/; Secure; SameSite=Strict; max-age=3600`
          }
        }, 55 * 60 * 1000) // 55 minutes
        return () => clearTimeout(refreshTimer)
      } else {
        // Clear cookie on logout
        document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    try {
      await firebaseSignOut(auth)
      document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const googleUser = result.user

      // Check if the user already has a Firestore doc
      const userDocRef = doc(db, 'users', googleUser.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        // Google sign-in — new user. Create a minimal doc.
        // userType will be set during onboarding on the dashboard.
        await setDoc(userDocRef, {
          uid: googleUser.uid,
          email: googleUser.email,
          name: googleUser.displayName || 'New User',
          userType: null, // will be set during onboarding
          ownerId: googleUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
