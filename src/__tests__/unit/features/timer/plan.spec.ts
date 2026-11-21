import { describe, expect, it } from 'vitest'
import { sameTimerConfig, type TimerConfig, type WorkoutSession } from '@/db'
import en from '@/i18n/messages/en'
import { COMBOS } from '@/features/timer/combos'
import { isTimerConfig } from '@/features/timer/domain'
import { finishedSteps, nextStep, todaysPlan } from '@/features/timer/plan'
import { TECHNIQUES, techniqueSkillId } from '@/features/timer/technique'
import { messageAt } from '../../../helpers/messageAt'

const t = (key: string): string => messageAt(en, key)

const NOON = new Date(2026, 10, 20, 12).getTime()
const MIDNIGHT = new Date(2026, 10, 20).getTime()

function done(config: TimerConfig, patch: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    config,
    status: 'completed',
    workoutNotes: '',
    notes: '',
    countdownDurationMs: 0,
    startedAt: NOON,
    accumulatedPausedMs: 0,
    finishedAt: NOON + 60_000,
    finishReason: 'endpoint',
    rounds: [],
    createdAt: NOON,
    updatedAt: NOON,
    ...patch,
  }
}

const everyCombo = Object.fromEntries(COMBOS.map((combo) => [combo.id, 'known'] as const))
const everyMove = Object.fromEntries(
  TECHNIQUES.map((technique) => [techniqueSkillId(technique.id), 'known'] as const),
)

/**
 * The plan is the app's answer to "what do I do today". What is held here is
 * that it is always a full session the timer can run, and that it follows the
 * athlete: what they have marked changes what each step is.
 */
describe("today's training", () => {
  it('is five steps in gym order, each one a workout the timer accepts', () => {
    const plan = todaysPlan({}, 0, t)

    expect(plan.map((step) => step.id)).toEqual([
      'warmup',
      'technique',
      'bag',
      'defense',
      'finisher',
    ])
    for (const step of plan) {
      expect(isTimerConfig(step.config)).toBe(true)
      expect(step.durationMs).toBeGreaterThan(0)
      expect(step.detail).not.toBe('')
    }
  })

  it('starts a beginner with the basic bounce, the jab, three bag rounds and slip-roll-block', () => {
    const [warmup, technique, bag, defense, finisher] = todaysPlan({}, 0, t)

    expect(warmup).toMatchObject({ detail: 'Basic bounce', config: { mode: 'custom', repeat: 3 } })
    expect(technique).toMatchObject({ detail: 'Jab', config: { pool: ['combo-01'] } })
    expect(bag).toMatchObject({
      detail: 'Beginner 3',
      config: { rounds: 3, callouts: 'mine', pool: [], themes: ['warmup', 'combos', 'endurance'] },
    })
    expect(defense).toMatchObject({
      detail: 'Reaction drill',
      config: { pool: ['def-slip', 'def-roll', 'def-block'] },
    })
    expect(finisher).toMatchObject({ detail: 'Punch-out finisher', config: { repeat: 8 } })
  })

  /** Even days are for a combination, odd days for a defensive move. */
  it('alternates the new thing between a combination and a defensive move', () => {
    expect(todaysPlan({}, 2, t)[1]).toMatchObject({ detail: 'Jab' })
    expect(todaysPlan({}, 3, t)[1]).toMatchObject({
      detail: 'Slip',
      config: { pool: ['def-slip'] },
    })
    expect(todaysPlan({ 'technique:slip': 'known' }, 3, t)[1]).toMatchObject({ detail: 'Roll' })
  })

  it('gives every day to whichever library is not finished yet', () => {
    expect(todaysPlan(everyCombo, 2, t)[1]).toMatchObject({ detail: 'Slip' })
    expect(todaysPlan(everyMove, 3, t)[1]).toMatchObject({ detail: 'Jab' })
  })

  it('walks back through the combinations, one a day, once everything is known', () => {
    const skills = { ...everyCombo, ...everyMove }

    expect(todaysPlan(skills, 0, t)[1]?.config).toMatchObject({ pool: [COMBOS[0]?.id] })
    expect(todaysPlan(skills, 1, t)[1]?.config).toMatchObject({ pool: [COMBOS[1]?.id] })
    expect(todaysPlan(skills, COMBOS.length, t)[1]?.config).toMatchObject({
      pool: [COMBOS[0]?.id],
    })
  })

  it('moves the warm-up on as the rope drills are mastered, and stays on the last', () => {
    expect(todaysPlan({ 'drill:rope-basic': 'known' }, 0, t)[0]?.detail).toBe('Boxer skip')
    expect(
      todaysPlan(
        {
          'drill:rope-basic': 'known',
          'drill:rope-skip': 'known',
          'drill:rope-intervals': 'known',
        },
        0,
        t,
      )[0]?.detail,
    ).toBe('Rope intervals')
  })

  /** Six rounds need something to call: the full session starts at five combinations. */
  it('grows the bag work to the classic six rounds with five combinations in hand', () => {
    const four = {
      'combo-01': 'known',
      'combo-02': 'known',
      'combo-03': 'learning',
      'combo-04': 'known',
    } as const
    const five = { ...four, 'combo-05': 'learning' } as const

    expect(todaysPlan(four, 0, t)[2]).toMatchObject({ detail: 'Beginner 3' })
    expect(todaysPlan(five, 0, t)[2]).toMatchObject({
      detail: 'Classic 6',
      config: {
        rounds: 6,
        pool: ['combo-01', 'combo-02', 'combo-03', 'combo-04', 'combo-05'],
      },
    })
  })

  it("drills the athlete's own defensive moves once they have marked some", () => {
    expect(todaysPlan({ 'technique:parry': 'learning' }, 0, t)[3]?.config).toMatchObject({
      pool: ['def-parry'],
    })
  })
})

describe('ticking the plan off', () => {
  const plan = todaysPlan({}, 0, t)
  const [warmup, technique] = plan
  if (warmup === undefined || technique === undefined) throw new Error('the plan is empty')

  it('marks a step done when a workout with its config was finished today', () => {
    expect(finishedSteps(plan, [done(warmup.config)], MIDNIGHT)).toEqual(['warmup'])
    expect(finishedSteps(plan, [done(technique.config), done(warmup.config)], MIDNIGHT)).toEqual([
      'warmup',
      'technique',
    ])
  })

  it('does not count yesterday, a cancelled workout, or a different workout', () => {
    expect(
      finishedSteps(plan, [done(warmup.config, { startedAt: MIDNIGHT - 1 })], MIDNIGHT),
    ).toEqual([])
    expect(finishedSteps(plan, [done(warmup.config, { status: 'cancelled' })], MIDNIGHT)).toEqual(
      [],
    )
    expect(finishedSteps(plan, [done({ mode: 'amrap', durationMs: 60_000 })], MIDNIGHT)).toEqual([])
    expect(finishedSteps(plan, [done(warmup.config, { startedAt: MIDNIGHT })], MIDNIGHT)).toEqual([
      'warmup',
    ])
  })

  it('points at the first step still open, and at nothing when all are done', () => {
    expect(nextStep(plan, [])?.id).toBe('warmup')
    expect(nextStep(plan, ['warmup', 'bag'])?.id).toBe('technique')
    expect(
      nextStep(
        plan,
        plan.map((step) => step.id),
      ),
    ).toBeUndefined()
  })
})

/** A row read back from the database has its keys in whatever order it was written. */
describe('comparing two configs', () => {
  it('ignores the order of the keys, and nothing else', () => {
    const built: TimerConfig = { mode: 'tabata', workMs: 20_000, restMs: 10_000, rounds: 8 }
    const stored: TimerConfig = { rounds: 8, restMs: 10_000, mode: 'tabata', workMs: 20_000 }

    expect(sameTimerConfig(built, stored)).toBe(true)
    expect(sameTimerConfig(built, { ...stored, rounds: 7 })).toBe(false)
    expect(sameTimerConfig(built, { mode: 'emom', intervalMs: 20_000, rounds: 8 })).toBe(false)
  })
})
