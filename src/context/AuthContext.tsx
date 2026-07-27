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

function setSessionCookie(token: string) {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const secureFlag = isHttps ? 'Secure; ' : ''
  document.cookie = `__session=${token}; path=/; ${secureFlag}SameSite=Strict; max-age=3600`
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error)

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        const token = await currentUser.getIdToken()
        setSessionCookie(token)

        const refreshTimer = setTimeout(async () => {
          if (auth.currentUser) {
            const freshToken = await auth.currentUser.getIdToken(true)
            setSessionCookie(freshToken)
          }
        }, 55 * 60 * 1000)
        return () => clearTimeout(refreshTimer)
      } else {
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
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const googleUser = result.user

    const token = await googleUser.getIdToken()
    setSessionCookie(token)

    const userDocRef = doc(db, 'users', googleUser.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: googleUser.uid,
        email: googleUser.email,
        name: googleUser.displayName || 'New User',
        userType: null,
        ownerId: googleUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    router.push('/dashboard')
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
