// Calculates study streak from an array of ISO date strings (YYYY-MM-DD)
// Returns { current, longest }

export interface StreakResult {
  current: number
  longest: number
}

export function calculateStreak(loggedDates: string[]): StreakResult {
  if (loggedDates.length === 0) return { current: 0, longest: 0 }

  // Deduplicate and sort ascending
  const unique = [...new Set(loggedDates)].sort()

  let longest = 1
  let streak  = 1

  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
    if (diff === 1) {
      streak++
      longest = Math.max(longest, streak)
    } else {
      streak = 1
    }
  }

  // Check if streak is current (last date was today or yesterday)
  const lastDate = new Date(unique[unique.length - 1])
  const today    = new Date(); today.setHours(0,0,0,0)
  const lastDay  = new Date(lastDate); lastDay.setHours(0,0,0,0)
  const dayDiff  = Math.round((today.getTime() - lastDay.getTime()) / 86_400_000)

  // Rebuild current streak from the end
  let currentStreak = 1
  for (let i = unique.length - 1; i > 0; i--) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
    if (diff === 1) {
      currentStreak++
    } else {
      break
    }
  }

  // If the last log was more than 1 day ago, streak is broken
  const current = dayDiff > 1 ? 0 : currentStreak

  return { current, longest: Math.max(longest, currentStreak) }
}
