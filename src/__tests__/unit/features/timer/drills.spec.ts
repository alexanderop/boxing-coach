import { describe, expect, it } from 'vitest'
import en from '@/i18n/messages/en'
import de from '@/i18n/messages/de'
import { isTimerConfig, totalDurationMs } from '@/features/timer/domain'
import {
  DRILL_GROUPS,
  DRILL_SKILL_IDS,
  drillAnimationUrl,
  drillConfig,
  DRILLS,
  drillSkillId,
  drillsIn,
} from '@/features/timer/drills'
import { messageAt } from '../../../helpers/messageAt'

/**
 * A drill is a circuit the timer already runs, so the thing worth holding is
 * that every one of them *is* a circuit it accepts — and that each has the
 * words the screens look up for it, in both languages.
 */
describe('the drill catalogue', () => {
  it('turns every drill into a config the timer accepts', () => {
    for (const drill of DRILLS) {
      expect(isTimerConfig(drillConfig(drill, (block) => block))).toBe(true)
    }
  })

  /** A session is a record of what was done: the block names are written in at the start. */
  it("names the work blocks in the athlete's language and leaves the rests unnamed", () => {
    const intervals = DRILLS.find((drill) => drill.id === 'rope-intervals')
    if (intervals === undefined) throw new Error('rope-intervals is missing from the catalogue')
    const config = drillConfig(intervals, (block) => messageAt(en, `drills.blocks.${block}`))

    expect(config).toEqual({
      mode: 'custom',
      blocks: [
        { label: 'Basic bounce', kind: 'work', durationMs: 30_000 },
        { label: 'High knees', kind: 'work', durationMs: 30_000 },
        { label: 'Boxer skip', kind: 'work', durationMs: 30_000 },
        { label: 'Double unders', kind: 'work', durationMs: 20_000 },
        { label: '', kind: 'rest', durationMs: 40_000 },
      ],
      repeat: 3,
    })
    expect(totalDurationMs(config)).toBe(450_000)
  })

  it('has a name, a description and block names for every drill, in both languages', () => {
    for (const catalogue of [en, de]) {
      for (const drill of DRILLS) {
        expect(messageAt(catalogue, `drills.items.${drill.id}.name`)).not.toBe('')
        expect(messageAt(catalogue, `drills.items.${drill.id}.description`)).not.toBe('')
        for (const [what] of drill.steps) {
          if (what !== 'rest') expect(messageAt(catalogue, `drills.blocks.${what}`)).not.toBe('')
        }
      }
    }
  })

  it('puts every drill in exactly one group, and leaves no group empty', () => {
    expect(DRILL_GROUPS.flatMap((group) => drillsIn(group))).toHaveLength(DRILLS.length)
    for (const group of DRILL_GROUPS) expect(drillsIn(group).length).toBeGreaterThan(0)
  })

  /** Kept apart from the combinations' ids, which share the same map. */
  it("stores a drill's level under its own prefixed key", () => {
    expect(drillSkillId('footwork')).toBe('drill:footwork')
    expect(DRILL_SKILL_IDS).toHaveLength(DRILLS.length)
    expect(DRILL_SKILL_IDS.every((id) => id.startsWith('drill:'))).toBe(true)
  })

  it('serves each animation from under the deployed base path', () => {
    expect(drillAnimationUrl('defense')).toBe(`${import.meta.env.BASE_URL}drills/defense.gif`)
  })
})
