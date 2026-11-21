import { describe, expect, it } from 'vitest'
import type { TimerConfig, WorkoutSession } from '@/db'
import { isTimerConfig } from '@/features/timer/domain'
import {
  dayNumber,
  dayStreak,
  dueForReview,
  lastPractised,
  reviewConfig,
  startOfDay,
  startOfWeek,
  trainingTotals,
  weeklyTotals,
} from '@/features/timer/progress'

/** Local time throughout: the app counts days the way the athlete's calendar does. */
const at = (day: number, hour = 18): number => new Date(2026, 10, day, hour).getTime()

const TABATA: TimerConfig = { mode: 'tabata', workMs: 60_000, restMs: 0, rounds: 4 }
type Boxing = Extract<TimerConfig, { mode: 'boxing' }>
const mine = (pool: ReadonlyArray<string>, patch: Partial<Boxing> = {}): TimerConfig => ({
  mode: 'boxing',
  workMs: 120_000,
  restMs: 30_000,
  rounds: 2,
  callouts: 'mine',
  callsAs: 'names',
  paceMs: 5_000,
  themes: [],
  pool: [...pool],
  ...patch,
})

/** A finished workout that ran its full length, started at `startedAt`. */
function done(
  startedAt: number,
  config: TimerConfig = TABATA,
  patch: Partial<WorkoutSession> = {},
): WorkoutSession {
  return {
    id: `session-${startedAt}`,
    config,
    status: 'completed',
    workoutNotes: '',
    notes: '',
    countdownDurationMs: 0,
    startedAt,
    accumulatedPausedMs: 0,
    finishedAt: startedAt + 240_000,
    finishReason: 'endpoint',
    rounds: [],
    createdAt: startedAt,
    updatedAt: startedAt,
    ...patch,
  }
}

describe('days and weeks', () => {
  it('finds midnight of a day and the Monday of its week', () => {
    // 20 November 2026 is a Friday.
    expect(startOfDay(at(20))).toBe(new Date(2026, 10, 20).getTime())
    expect(startOfWeek(at(20))).toBe(new Date(2026, 10, 16).getTime())
    expect(startOfWeek(at(16, 0))).toBe(new Date(2026, 10, 16).getTime())
    expect(startOfWeek(at(22, 23))).toBe(new Date(2026, 10, 16).getTime())
  })

  it('numbers the days so that the number changes at midnight and not before', () => {
    expect(dayNumber(at(20, 0))).toBe(dayNumber(at(20, 23)))
    expect(dayNumber(at(21, 0))).toBe(dayNumber(at(20, 23)) + 1)
  })
})

describe('the training streak', () => {
  it('counts the days in a row up to today', () => {
    expect(dayStreak([done(at(18)), done(at(19)), done(at(20, 7))], at(20))).toBe(3)
  })

  /** The day is not over: yesterday's workout still holds the streak. */
  it('is not broken by today having no workout yet', () => {
    expect(dayStreak([done(at(18)), done(at(19))], at(20))).toBe(2)
  })

  it('ends at the first day without a workout', () => {
    expect(dayStreak([done(at(16)), done(at(19)), done(at(20))], at(20))).toBe(2)
    expect(dayStreak([done(at(17))], at(20))).toBe(0)
    expect(dayStreak([], at(20))).toBe(0)
  })

  it('counts a day once however often there was training, and never a cancelled workout', () => {
    expect(dayStreak([done(at(20, 7)), done(at(20, 19))], at(20))).toBe(1)
    expect(dayStreak([done(at(20), TABATA, { status: 'cancelled' })], at(20))).toBe(0)
  })
})

describe('training totals', () => {
  it('adds up workouts, rounds and minutes inside the window', () => {
    const sessions = [done(at(16)), done(at(18)), done(at(23))]

    expect(trainingTotals(sessions, at(16, 0), at(23, 0))).toEqual({
      sessions: 2,
      rounds: 8,
      minutes: 8,
    })
  })

  /** Stopped after ninety seconds of a four-minute Tabata: one round was finished, not four. */
  it('counts only the rounds that were reached', () => {
    const early = done(at(18), TABATA, { finishedAt: at(18) + 90_000, finishReason: 'manual' })

    expect(trainingTotals([early], at(16, 0), at(23, 0))).toMatchObject({ sessions: 1, rounds: 1 })
  })

  it('counts the taps, and so none, in a mode where the athlete counts the rounds', () => {
    const amrap = done(at(18), { mode: 'amrap', durationMs: 240_000 })

    expect(trainingTotals([amrap], at(16, 0), at(23, 0))).toEqual({
      sessions: 1,
      rounds: 0,
      minutes: 4,
    })
  })

  it('lays out eight weeks, oldest first, ending with the current one', () => {
    const weeks = weeklyTotals([done(at(20)), done(at(10)), done(at(11))], at(20))

    expect(weeks).toHaveLength(8)
    expect(weeks.at(-1)).toEqual({
      weekStart: new Date(2026, 10, 16).getTime(),
      sessions: 1,
      rounds: 4,
      minutes: 4,
    })
    expect(weeks.at(-2)).toMatchObject({ weekStart: new Date(2026, 10, 9).getTime(), sessions: 2 })
    expect(weeks[0]?.sessions).toBe(0)
    expect(weeklyTotals([], at(20), 3)).toHaveLength(3)
  })
})

describe('keeping combinations sharp', () => {
  it('remembers when each combination was last in a finished workout', () => {
    const last = lastPractised([
      done(at(10), mine(['combo-03', 'combo-05'])),
      done(at(18), mine(['combo-05'])),
      done(at(19), mine(['combo-07']), { status: 'cancelled' }),
      done(at(19)),
    ])

    expect(last.get('combo-03')).toBe(at(10))
    expect(last.get('combo-05')).toBe(at(18))
    expect(last.has('combo-07')).toBe(false)
  })

  /** A themed session with no free round calls nothing in particular. */
  it('does not count a session that never called combinations', () => {
    const themed = mine(['combo-03'], { themes: ['power', 'speed'] })
    const silent = mine(['combo-03'], { callouts: 'off' })
    const mixed = mine(['combo-03'], { themes: ['warmup', 'combos'] })

    expect(lastPractised([done(at(18), themed), done(at(18), silent)]).size).toBe(0)
    expect(lastPractised([done(at(18), mixed)]).get('combo-03')).toBe(at(18))
  })

  it('asks for the known combinations not called for a week, the longest-neglected first', () => {
    const skills = {
      'combo-01': 'known',
      'combo-03': 'known',
      'combo-05': 'known',
      'combo-07': 'learning',
    } as const
    const sessions = [done(at(5), mine(['combo-03'])), done(at(18), mine(['combo-05']))]

    // Never called comes before called long ago; called this week is not due;
    // a combination still being learned is the technique block's job.
    expect(dueForReview(skills, sessions, at(20))).toEqual(['combo-01', 'combo-03'])
  })

  it('treats exactly a week ago as still fresh, and the day before as stale', () => {
    const skills = { 'combo-03': 'known' } as const

    expect(dueForReview(skills, [done(at(14), mine(['combo-03']))], at(20))).toEqual([])
    expect(dueForReview(skills, [done(at(13), mine(['combo-03']))], at(20))).toEqual(['combo-03'])
  })

  it('never asks for more than five at once', () => {
    const skills = Object.fromEntries(
      ['01', '02', '03', '04', '05', '06', '07'].map((n) => [`combo-${n}`, 'known'] as const),
    )

    expect(dueForReview(skills, [], at(20))).toHaveLength(5)
  })

  it('turns what is due into a session of only those', () => {
    const config = reviewConfig(['combo-01', 'combo-03'])

    expect(isTimerConfig(config)).toBe(true)
    expect(config).toMatchObject({ callouts: 'mine', rounds: 3, pool: ['combo-01', 'combo-03'] })
  })
})
