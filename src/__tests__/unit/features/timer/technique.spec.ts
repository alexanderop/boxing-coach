import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import de from '@/i18n/messages/de'
import en from '@/i18n/messages/en'
import { isTimerConfig } from '@/features/timer/domain'
import {
  combosUsing,
  defenseDrillConfig,
  parseTechnique,
  practisedDefense,
  STARTER_DEFENSE,
  TECHNIQUE_GROUPS,
  TECHNIQUE_POINTS,
  TECHNIQUE_SKILL_IDS,
  techniqueAnimationUrl,
  techniqueNeighbours,
  TECHNIQUES,
  techniqueSkillId,
  techniquesIn,
} from '@/features/timer/technique'
import { DEFENSE_MOVES, VOICE_CUES } from '@/features/timer/voiceCues'
import { messageAt } from '../../../helpers/messageAt'

const PUBLIC_DIR = fileURLToPath(new URL('../../../../../public/', import.meta.url))

const byId = (id: string) => {
  const found = parseTechnique(id)
  if (found === undefined) throw new Error(`${id} is missing from the technique library`)
  return found
}

/**
 * The technique library is content with a shape: every entry needs its words
 * in both languages and its animation on disk, or a screen renders a hole.
 */
describe('the technique library', () => {
  it('holds stance, guard, four punches and seven defensive moves', () => {
    expect(techniquesIn('basics').map((entry) => entry.id)).toEqual(['stance', 'guard'])
    expect(techniquesIn('punches').map((entry) => entry.id)).toEqual([
      'jab',
      'cross',
      'hook',
      'uppercut',
    ])
    expect(techniquesIn('defense')).toHaveLength(7)
    expect(TECHNIQUE_GROUPS.flatMap((group) => techniquesIn(group))).toHaveLength(TECHNIQUES.length)
  })

  it('has a name, a summary, three how-to lines and three mistakes, in both languages', () => {
    for (const catalogue of [en, de]) {
      for (const technique of TECHNIQUES) {
        const at = (field: string) =>
          messageAt(catalogue, `technique.items.${technique.id}.${field}`)

        expect(at('name')).not.toBe('')
        expect(at('summary')).not.toBe('')
        for (const point of TECHNIQUE_POINTS) {
          expect(at(`how${point}`)).not.toBe('')
          expect(at(`mistake${point}`)).not.toBe('')
        }
      }
    }
  })

  it('ships an animation for every entry', () => {
    for (const technique of TECHNIQUES) {
      expect(existsSync(`${PUBLIC_DIR}technique/${technique.id}.gif`)).toBe(true)
    }
    expect(techniqueAnimationUrl('slip')).toBe(`${import.meta.env.BASE_URL}technique/slip.gif`)
  })

  /** Only a defensive move is called on its own, and every one of them has its clip. */
  it('gives every defensive move a clip the coach can call, and nothing else one', () => {
    expect(techniquesIn('defense').map((entry) => entry.call)).toEqual([...DEFENSE_MOVES])
    expect(
      TECHNIQUES.filter((entry) => entry.group !== 'defense').map((entry) => entry.call),
    ).toEqual([undefined, undefined, undefined, undefined, undefined, undefined])
    for (const move of DEFENSE_MOVES) {
      expect(VOICE_CUES).toContain(move)
      expect(existsSync(`${PUBLIC_DIR}voice/${move}.mp3`)).toBe(true)
    }
  })

  it('finds an entry by the id in the address bar, and steps through in learning order', () => {
    expect(parseTechnique('nonsense')).toBeUndefined()
    expect(parseTechnique(undefined)).toBeUndefined()
    expect(techniqueNeighbours('stance')).toEqual({ previous: undefined, next: byId('guard') })
    expect(techniqueNeighbours('pivot')).toEqual({ previous: byId('step-back'), next: undefined })
  })

  it("stores a technique's level under its own prefixed key", () => {
    expect(techniqueSkillId('step-back')).toBe('technique:step-back')
    expect(TECHNIQUE_SKILL_IDS).toHaveLength(TECHNIQUES.length)
  })
})

describe('defense drills', () => {
  it('calls slip, roll and block until the athlete has marked a move', () => {
    expect(practisedDefense({})).toBe(STARTER_DEFENSE)
    expect(practisedDefense({ 'technique:jab': 'known', 'combo-01': 'known' })).toBe(
      STARTER_DEFENSE,
    )
  })

  it("calls the athlete's own moves once there are any, learning or known", () => {
    expect(practisedDefense({ 'technique:pull': 'learning', 'technique:slip': 'known' })).toEqual([
      'def-slip',
      'def-pull',
    ])
  })

  /** Several moves are a reaction drill; one move is repetition at an easier pace. */
  it('turns a set of moves into a session the timer accepts', () => {
    const reaction = defenseDrillConfig(STARTER_DEFENSE)
    const single = defenseDrillConfig(['def-parry'])

    expect(isTimerConfig(reaction)).toBe(true)
    expect(reaction).toMatchObject({
      mode: 'boxing',
      callouts: 'mine',
      rounds: 3,
      paceMs: 3_000,
      pool: ['def-slip', 'def-roll', 'def-block'],
    })
    expect(single).toMatchObject({ rounds: 2, paceMs: 5_000, pool: ['def-parry'] })
  })

  it('lists the combinations a move appears in, and none for a punch', () => {
    const withPull = combosUsing(byId('pull')).map((combo) => combo.id)

    expect(withPull).toEqual(['combo-35', 'combo-36'])
    expect(combosUsing(byId('slip')).map((combo) => combo.id)).toContain('combo-16')
    expect(combosUsing(byId('jab'))).toEqual([])
  })
})
