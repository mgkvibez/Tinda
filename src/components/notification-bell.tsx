'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/firebase/client'
import { getIdToken } from 'firebase/auth'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const user = auth.currentUser
        if (!user) return
        const token = await getIdToken(user)
        const res = await fetch('/api/notifications?action=unread_count', {
          headers: { Cookie: `__session=${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count || 0)
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchCount()
    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Link href="/notifications" className="relative inline-flex items-center px-3 py-1.5 text-sm">
      <span className="text-lg">🔔</span>
      {!loading && unreadCount > 0 && (
        <span className="absolute -top-0 -right-0 bg-red-500 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
