import { describe, expect, it } from 'vitest'
import {
  comboAnimationUrl,
  comboDrillConfig,
  comboNeighbours,
  comboNumbers,
  COMBOS,
  countSkills,
  nextComboToLearn,
  parseCombo,
  practisedCombos,
  skillOf,
  withSkill,
  type Skills,
} from '@/features/timer/combos'
import { isTimerConfig } from '@/features/timer/domain'
import { callSteps } from '@/features/timer/voiceCues'

/**
 * The library as something to learn: an order, a level per entry, and the
 * athlete's own list that a session calls from. Every rule here is one the
 * screens rely on without checking — a combination in the wrong set, or a
 * level that does not survive a save, shows up as a round calling the wrong
 * thing.
 */
describe('the combination library', () => {
  it('holds thirty-nine combinations: fifteen basics, fifteen advanced, nine counters', () => {
    expect(COMBOS).toHaveLength(39)
    expect(COMBOS.filter((combo) => combo.level === 'basic')).toHaveLength(15)
    expect(COMBOS.filter((combo) => combo.level === 'advanced')).toHaveLength(15)
    expect(COMBOS.filter((combo) => combo.level === 'counter')).toHaveLength(9)
    expect(new Set(COMBOS.map((combo) => combo.id)).size).toBe(39)
  })

  /** A counter is defense with a punch behind it, or a combination that ends by getting out. */
  it('puts a defensive move in every counter', () => {
    const moves = new Set(['Slip', 'Roll', 'Block', 'Parry', 'Pull', 'Step back', 'Pivot'])
    for (const combo of COMBOS.filter((entry) => entry.level === 'counter')) {
      expect(callSteps(combo.id).some((step) => moves.has(step.label))).toBe(true)
    }
    expect(comboNumbers('combo-34')).toBe('Parry-1-2')
  })

  /** Basics, then the advanced set, then the counters, short before long: the jab comes first. */
  it('is ordered the way it is worth learning', () => {
    expect(COMBOS[0]).toEqual({ id: 'combo-01', level: 'basic', length: 1 })
    expect(COMBOS.map((combo) => combo.level).join()).toMatch(/^(basic,)+(advanced,)+(counter,?)+$/)
    for (const level of ['basic', 'advanced', 'counter'] as const) {
      const lengths = COMBOS.filter((combo) => combo.level === level).map((combo) => combo.length)

      expect(lengths).toEqual(lengths.toSorted((a, b) => a - b))
    }
  })

  it('counts a double jab as two punches, and never asks for more than four', () => {
    expect(COMBOS.find((combo) => combo.id === 'combo-04')?.length).toBe(3)
    expect(Math.max(...COMBOS.map((combo) => combo.length))).toBe(4)
  })

  it('keeps the basics free of uppercuts, body shots, slips and rolls', () => {
    const basics = COMBOS.filter((combo) => combo.level === 'basic')
    const punches = new Set(
      basics.flatMap((combo) => callSteps(combo.id).map((step) => step.label)),
    )

    expect([...punches].toSorted()).toEqual(['Cross', 'Double jab', 'Hook', 'Jab'])
  })

  it('writes a combination in the gym shorthand', () => {
    expect(comboNumbers('combo-04')).toBe('1-1-2')
    expect(comboNumbers('combo-09')).toBe('1-2-3-2')
    expect(comboNumbers('combo-25')).toBe('1-6-3-2')
    expect(comboNumbers('combo-16')).toBe('1-2-Slip-2')
    expect(comboNumbers('combo-18')).toBe('2-3 body')
  })

  it('finds a combination by the id in the address bar, and nothing for anything else', () => {
    expect(parseCombo('combo-05')?.id).toBe('combo-05')
    expect(parseCombo('combo-99')).toBeUndefined()
    expect(parseCombo('num-05')).toBeUndefined()
    expect(parseCombo(undefined)).toBeUndefined()
  })

  it('steps through the library in learning order, stopping at both ends', () => {
    const first = COMBOS[0]?.id ?? 'combo-01'
    const last = COMBOS.at(-1)?.id ?? 'combo-01'

    expect(comboNeighbours(first).previous).toBeUndefined()
    expect(comboNeighbours(first).next).toBe(COMBOS[1])
    expect(comboNeighbours(last).next).toBeUndefined()
    expect(comboNeighbours(last).previous).toBe(COMBOS.at(-2))
  })

  it('serves each animation from under the deployed base path', () => {
    expect(comboAnimationUrl('combo-07')).toBe(`${import.meta.env.BASE_URL}combos/combo-07.gif`)
  })
})

describe('skill levels', () => {
  const skills: Skills = { 'combo-03': 'known', 'combo-05': 'learning', 'drill:footwork': 'known' }

  it('reads a level, and nothing for what has not been started', () => {
    expect(skillOf(skills, 'combo-03')).toBe('known')
    expect(skillOf(skills, 'combo-04')).toBeUndefined()
  })

  /** The settings row is replaced, never edited in place. */
  it('sets and clears a level without touching the map it was given', () => {
    const raised = withSkill(skills, 'combo-05', 'known')
    const cleared = withSkill(skills, 'combo-03', undefined)

    expect(raised).toEqual({ ...skills, 'combo-05': 'known' })
    expect(cleared).toEqual({ 'combo-05': 'learning', 'drill:footwork': 'known' })
    expect(skills).toEqual({
      'combo-03': 'known',
      'combo-05': 'learning',
      'drill:footwork': 'known',
    })
    expect(withSkill({}, 'combo-01', undefined)).toEqual({})
  })

  /** You practise what you are learning as well as what you have. */
  it("makes the athlete's own list out of everything marked, in catalogue order", () => {
    expect(practisedCombos(skills)).toEqual(['combo-03', 'combo-05'])
    expect(practisedCombos({ 'combo-27': 'known', 'combo-02': 'learning' })).toEqual([
      'combo-02',
      'combo-27',
    ])
    expect(practisedCombos({})).toEqual([])
  })

  it('counts only the ids it was asked about', () => {
    expect(countSkills(skills, ['combo-03', 'combo-04', 'combo-05'])).toEqual({
      known: 1,
      learning: 1,
      total: 3,
    })
    expect(countSkills(skills, ['drill:footwork'])).toEqual({ known: 1, learning: 0, total: 1 })
  })

  it('points at the first combination not yet known', () => {
    expect(nextComboToLearn({})?.id).toBe('combo-01')
    expect(nextComboToLearn({ 'combo-01': 'known' })?.id).toBe(COMBOS[1]?.id)
    // Learning is not known: it stays the thing to work on.
    expect(nextComboToLearn({ 'combo-01': 'learning' })?.id).toBe('combo-01')
    expect(
      nextComboToLearn(Object.fromEntries(COMBOS.map((combo) => [combo.id, 'known'] as const))),
    ).toBeUndefined()
  })
})

describe('drilling one combination', () => {
  /** Two short rounds of it and nothing else — repetition is the point. */
  it('builds a valid session that can only call that combination', () => {
    const config = comboDrillConfig('combo-09')

    expect(isTimerConfig(config)).toBe(true)
    expect(config).toMatchObject({
      mode: 'boxing',
      rounds: 2,
      workMs: 120_000,
      callouts: 'mine',
      pool: ['combo-09'],
      themes: [],
    })
  })
})
