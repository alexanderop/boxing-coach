import type { TimerConfig } from '@/db'
import { COMBOS, type Combo, type Skills } from '@/features/timer/combos'
import { MINUTE_MS, SECOND_MS } from '@/features/timer/domain'
import { callSteps, type DefenseCue } from '@/features/timer/voiceCues'

/**
 * The technique library: what a combination is made of, one piece at a time.
 *
 * The combinations teach an order of punches; this teaches each punch, the
 * stance it is thrown from, and the seven ways of not being hit back. Every
 * entry has the same shape — how to do it, what goes wrong, an animation, a
 * level — and a defensive move also has a clip, so the coach can call it in a
 * reaction drill.
 */
export const TECHNIQUE_GROUPS = ['basics', 'punches', 'defense'] as const
export type TechniqueGroup = (typeof TECHNIQUE_GROUPS)[number]

interface TechniqueSpec {
  readonly id: string
  readonly group: TechniqueGroup
  /** The clip that calls this move, for the ones the coach calls on their own. */
  readonly call: DefenseCue | undefined
}

/** In the order worth learning: how to stand, how to hit, how not to be hit. */
export const TECHNIQUES = [
  { id: 'stance', group: 'basics', call: undefined },
  { id: 'guard', group: 'basics', call: undefined },
  { id: 'jab', group: 'punches', call: undefined },
  { id: 'cross', group: 'punches', call: undefined },
  { id: 'hook', group: 'punches', call: undefined },
  { id: 'uppercut', group: 'punches', call: undefined },
  { id: 'slip', group: 'defense', call: 'def-slip' },
  { id: 'roll', group: 'defense', call: 'def-roll' },
  { id: 'block', group: 'defense', call: 'def-block' },
  { id: 'parry', group: 'defense', call: 'def-parry' },
  { id: 'pull', group: 'defense', call: 'def-pull' },
  { id: 'step-back', group: 'defense', call: 'def-step-back' },
  { id: 'pivot', group: 'defense', call: 'def-pivot' },
] as const satisfies ReadonlyArray<TechniqueSpec>

export type Technique = (typeof TECHNIQUES)[number]
export type TechniqueId = Technique['id']

/** How many "how to" lines and how many mistakes every entry has, in every language. */
export const TECHNIQUE_POINTS = [1, 2, 3] as const

/** A route param is a string from the address bar: `undefined` means "not a technique". */
export function parseTechnique(value: string | undefined): Technique | undefined {
  return TECHNIQUES.find((technique) => technique.id === value)
}

export function techniquesIn(group: TechniqueGroup): ReadonlyArray<Technique> {
  return TECHNIQUES.filter((technique) => technique.group === group)
}

/** The key a technique's level is stored under, apart from the combinations' and the drills'. */
export function techniqueSkillId(id: TechniqueId): string {
  return `technique:${id}`
}

export const TECHNIQUE_SKILL_IDS = TECHNIQUES.map((technique) => techniqueSkillId(technique.id))

/** Where a technique's animation is served from, under whatever base the app is deployed at. */
export function techniqueAnimationUrl(id: TechniqueId): string {
  return `${import.meta.env.BASE_URL}technique/${id}.gif`
}

/** The reaction drill's own animation: a little of every move. */
export const REACTION_ANIMATION_URL = `${import.meta.env.BASE_URL}drills/defense-react.gif`

/** The entries on either side of one in learning order, for stepping through the library. */
export interface TechniqueNeighbours {
  readonly previous: Technique | undefined
  readonly next: Technique | undefined
}

export function techniqueNeighbours(id: TechniqueId): TechniqueNeighbours {
  const index = TECHNIQUES.findIndex((technique) => technique.id === id)
  return { previous: TECHNIQUES[index - 1], next: TECHNIQUES[index + 1] }
}

/**
 * What a reaction drill calls before the athlete has marked any move: the
 * slip, the roll and the block — one for each kind of punch coming back.
 */
export const STARTER_DEFENSE = ['def-slip', 'def-roll', 'def-block'] as const

/** The athlete's own defensive moves: every one they have marked, learning or known. */
export function practisedDefense(skills: Skills): ReadonlyArray<DefenseCue> {
  const own = TECHNIQUES.flatMap((technique) =>
    technique.call !== undefined && skills[techniqueSkillId(technique.id)] !== undefined
      ? [technique.call]
      : [],
  )
  return own.length === 0 ? STARTER_DEFENSE : own
}

/**
 * A reaction drill: the coach calls a move, the athlete makes it. One move is
 * repetition — two rounds of it at an easy pace. Several is reaction — three
 * rounds, a call every three seconds, never the same one twice running.
 */
export function defenseDrillConfig(moves: ReadonlyArray<DefenseCue>): TimerConfig {
  const single = moves.length === 1
  return {
    mode: 'boxing',
    workMs: 2 * MINUTE_MS,
    restMs: 30 * SECOND_MS,
    rounds: single ? 2 : 3,
    callouts: 'mine',
    callsAs: 'names',
    paceMs: single ? 5_000 : 3_000,
    themes: [],
    pool: [...moves],
  }
}

/** The combinations that use a move — where a defense learned alone gets its counter. */
export function combosUsing(technique: Technique): ReadonlyArray<Combo> {
  if (technique.call === undefined) return []
  const [move] = callSteps(technique.call)
  return COMBOS.filter((combo) => callSteps(combo.id).some((step) => step.label === move?.label))
}
