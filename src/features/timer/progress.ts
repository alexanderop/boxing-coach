import type { TimerConfig, WorkoutSession } from '@/db'
import { practisedCombos, type Skills } from '@/features/timer/combos'
import { finalResult, MINUTE_MS, SECOND_MS } from '@/features/timer/domain'
import { sessionCalls, type ComboCue } from '@/features/timer/voiceCues'

/**
 * Progress over time, read off the finished workouts: how much this week, how
 * many days running, and when each combination was last thrown.
 *
 * Nothing here is stored. A streak written to the settings row would be a
 * second copy of what the history already says, and the two would disagree
 * the first time a workout is deleted or a backup restored.
 */
const DAY_MS = 24 * 60 * MINUTE_MS
const WEEK_DAYS = 7

/** Midnight, local time, of the day `at` falls in. */
export function startOfDay(at: number): number {
  const day = new Date(at)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

/** `days` calendar days from a midnight — by the calendar, so a clock change cannot shift it. */
function addDays(dayStart: number, days: number): number {
  const day = new Date(dayStart)
  day.setDate(day.getDate() + days)
  return day.getTime()
}

/** Midnight of the Monday of the week `at` falls in. */
export function startOfWeek(at: number): number {
  const dayStart = startOfDay(at)
  // `getDay` counts from Sunday; a training week starts on Monday.
  return addDays(dayStart, -((new Date(dayStart).getDay() + WEEK_DAYS - 1) % WEEK_DAYS))
}

/** A number that changes once per local day — what "today's" plan is picked by. */
export function dayNumber(at: number): number {
  // Noon, so a daylight-saving hour either way stays inside the same day.
  return Math.floor((startOfDay(at) + DAY_MS / 2) / DAY_MS)
}

/** A workout counts once it was finished rather than cancelled. */
function finished(sessions: ReadonlyArray<WorkoutSession>): ReadonlyArray<WorkoutSession> {
  return sessions.filter((session) => session.status === 'completed')
}

/**
 * How many days in a row there was training, ending today — or yesterday,
 * because a streak is not broken by the day not being over yet.
 */
export function dayStreak(sessions: ReadonlyArray<WorkoutSession>, now: number): number {
  const days = new Set(finished(sessions).map((session) => startOfDay(session.startedAt)))
  const today = startOfDay(now)
  let day = days.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (days.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

interface TrainingTotals {
  readonly sessions: number
  readonly rounds: number
  readonly minutes: number
}

/** What was done between two moments: workouts, rounds finished, minutes on the clock. */
export function trainingTotals(
  sessions: ReadonlyArray<WorkoutSession>,
  from: number,
  to: number,
): TrainingTotals {
  const within = finished(sessions).filter(
    (session) => session.startedAt >= from && session.startedAt < to,
  )
  const results = within.map((session) => finalResult(session))
  return {
    sessions: within.length,
    // Rounds actually finished: a workout stopped halfway counts what was done.
    rounds: results.reduce((sum, result) => sum + result.completedRounds, 0),
    minutes: Math.round(results.reduce((sum, result) => sum + result.elapsedMs, 0) / MINUTE_MS),
  }
}

export interface WeekTotals extends TrainingTotals {
  readonly weekStart: number
}

/** The last `weeks` weeks, oldest first, the current one last — the bars of the chart. */
export function weeklyTotals(
  sessions: ReadonlyArray<WorkoutSession>,
  now: number,
  weeks = 8,
): ReadonlyArray<WeekTotals> {
  const thisWeek = startOfWeek(now)
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(thisWeek, (index - weeks + 1) * WEEK_DAYS)
    return {
      weekStart,
      ...trainingTotals(sessions, weekStart, addDays(weekStart, WEEK_DAYS)),
    }
  })
}

/** When each combination or move was last in a finished workout's calls. */
export function lastPractised(
  sessions: ReadonlyArray<WorkoutSession>,
): ReadonlyMap<string, number> {
  const last = new Map<string, number>()
  for (const session of finished(sessions)) {
    for (const call of sessionCalls(session.config)) {
      last.set(call, Math.max(last.get(call) ?? 0, session.startedAt))
    }
  }
  return last
}

/** A known combination goes stale after a week without being called. */
const REVIEW_AFTER_DAYS = 7
/** A review is one short session: more than this many is a freestyle round again. */
const REVIEW_SIZE = 5

/**
 * The known combinations worth refreshing: not called for a week, or never
 * called by this app at all — the longest-neglected first. "Known" is a claim
 * the athlete made once; this is what keeps it true.
 */
export function dueForReview(
  skills: Skills,
  sessions: ReadonlyArray<WorkoutSession>,
  now: number,
): ReadonlyArray<ComboCue> {
  const last = lastPractised(sessions)
  const staleBefore = addDays(startOfDay(now), -REVIEW_AFTER_DAYS + 1)
  return practisedCombos(skills)
    .filter((combo) => skills[combo] === 'known' && (last.get(combo) ?? 0) < staleBefore)
    .toSorted((a, b) => (last.get(a) ?? 0) - (last.get(b) ?? 0))
    .slice(0, REVIEW_SIZE)
}

/** A review session: three rounds of exactly the combinations that are due. */
export function reviewConfig(combos: ReadonlyArray<ComboCue>): TimerConfig {
  return {
    mode: 'boxing',
    workMs: 2 * MINUTE_MS,
    restMs: 30 * SECOND_MS,
    rounds: 3,
    callouts: 'mine',
    callsAs: 'names',
    paceMs: 5_000,
    themes: [],
    pool: [...combos],
  }
}
