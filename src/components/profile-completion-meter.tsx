'use client'

import { motion } from 'framer-motion'
import { ProfileCompletion } from '@/lib/profile-completion'

export function ProfileCompletionMeter({ completion }: { completion: ProfileCompletion }) {
  const { percentage, missing, tips } = completion
  const color = percentage >= 80 ? 'text-green-500' : percentage >= 50 ? 'text-orange-500' : 'text-red-500'
  const bgColor = percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-orange-500' : 'bg-red-500'

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Profile Completion</h3>
        <span className={`text-2xl font-bold ${color}`}>{percentage}%</span>
      </div>

      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full ${bgColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {tips.length > 0 && (
        <p className="text-xs text-textSecondary">{tips[0]}</p>
      )}

      {missing.length > 0 && percentage < 100 && (
        <div className="flex flex-wrap gap-1.5">
          {missing.slice(0, 5).map((m) => (
            <span key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-textSecondary">
              {m}
            </span>
          ))}
        </div>
      )}

      {percentage === 100 && (
        <p className="text-xs text-green-500 font-medium">Profile complete! You're getting maximum visibility.</p>
      )}
    </div>
  )
}
