export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null

  const getStreakEmoji = (s: number) => {
    if (s >= 30) return '🚀'
    if (s >= 7) return '⚡'
    if (s >= 3) return '🔥'
    return '🔥'
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-600 dark:text-orange-400">
      <span className="text-base">{getStreakEmoji(streak)}</span>
      <span>{streak} day{streak !== 1 ? 's' : ''}</span>
    </div>
  )
}
