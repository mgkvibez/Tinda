import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listBadges, getLeaderboard, getUserById, updateStreak } from '@/lib/firebase'

export async function GET(request: Request) {
  const session = await auth(request)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action === 'leaderboard') {
    const leaders = await getLeaderboard(10)
    return NextResponse.json({
      leaderboard: leaders.map((u, i) => ({
        rank: i + 1,
        name: u.name,
        streak: u.streak || 0,
        totalSwipes: u.totalSwipes || 0,
        totalMatches: u.totalMatches || 0,
        isYou: u.id === session.user.id,
      })),
    })
  }

  // Default: get user's gamification stats
  const user = await getUserById(session.user.id)
  const badges = await listBadges(session.user.id)

  const badgeInfo: Record<string, { label: string; icon: string; description: string }> = {
    first_swipe: { label: 'First Swipe', icon: '👋', description: 'Made your first swipe' },
    streak_3: { label: '3-Day Streak', icon: '🔥', description: 'Swiped 3 days in a row' },
    streak_7: { label: 'Week Warrior', icon: '⚡', description: 'Swiped 7 days in a row' },
    streak_30: { label: 'Unstoppable', icon: '🚀', description: 'Swiped 30 days in a row' },
    swipes_50: { label: 'Swipe Master', icon: '🎯', description: '50 total swipes' },
    swipes_100: { label: 'Century Club', icon: '💯', description: '100 total swipes' },
    swipes_500: { label: 'Swipe Legend', icon: '👑', description: '500 total swipes' },
  }

  return NextResponse.json({
    streak: user?.streak || 0,
    totalSwipes: user?.totalSwipes || 0,
    totalMatches: user?.totalMatches || 0,
    badges: badges.map((b) => ({
      ...b,
      ...badgeInfo[b.badgeType],
    })),
  })
}
