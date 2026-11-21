import { SKILL_LEVELS, type TimerConfig, type TimerSettings, updateTimerSettings } from '@/db'
import { MINUTE_MS, SECOND_MS } from '@/features/timer/domain'
import {
  ALL_COMBOS,
  callSteps,
  COMBO_LEVELS,
  comboLevel,
  type ComboCue,
  type ComboLevel,
} from '@/features/timer/voiceCues'

/**
 * The combination library, and how far along the athlete is with it.
 *
 * The clips and the hands live with the voice in `voiceCues.ts`; this is the
 * same catalogue seen as something to *learn* — an order to learn it in, and
 * a level per entry. The level is one of three: not started (absent from the
 * map), learning, known. Anything with a level is in the athlete's own list,
 * which is what a session set to "my combinations" calls from: you practise
 * what you are learning as well as what you have.
 */
export type SkillLevel = (typeof SKILL_LEVELS)[number]
export type Skills = TimerSettings['skills']

export interface Combo {
  readonly id: ComboCue
  readonly level: ComboLevel
  /** How many punches and movements it strings together — a double jab is two. */
  readonly length: number
}

function comboLength(id: ComboCue): number {
  return callSteps(id, 'numbers').reduce((count, step) => count + step.label.split(' · ').length, 0)
}

/**
 * Every combination in the order worth learning it: the basics, then the
 * advanced set, then the counters, short before long. `toSorted` is stable, so combinations of
 * one length keep the catalogue's own order.
 */
export const COMBOS: ReadonlyArray<Combo> = ALL_COMBOS.map((id) => ({
  id,
  level: comboLevel(id),
  length: comboLength(id),
})).toSorted(
  (a, b) => COMBO_LEVELS.indexOf(a.level) - COMBO_LEVELS.indexOf(b.level) || a.length - b.length,
)

/** A route param is a string from the address bar: `undefined` means "not a combination". */
export function parseCombo(value: string | undefined): Combo | undefined {
  return COMBOS.find((combo) => combo.id === value)
}

/** The combinations on either side of one in learning order, for stepping through the library. */
export interface ComboNeighbours {
  readonly previous: Combo | undefined
  readonly next: Combo | undefined
}

export function comboNeighbours(id: ComboCue): ComboNeighbours {
  const index = COMBOS.findIndex((combo) => combo.id === id)
  return { previous: COMBOS[index - 1], next: COMBOS[index + 1] }
}

/** A combination in the gym's shorthand: "1-1-2". A slip or a roll keeps its word. */
export function comboNumbers(id: ComboCue): string {
  return callSteps(id, 'numbers')
    .flatMap((step) => step.label.split(' · '))
    .join('-')
}

export function skillOf(skills: Skills, id: string): SkillLevel | undefined {
  return skills[id]
}

/**
 * The skills with one entry set — or removed, for `undefined`. A new object
 * either way: the settings row is replaced, never edited in place.
 */
export function withSkill(skills: Skills, id: string, level: SkillLevel | undefined): Skills {
  const { [id]: _previous, ...rest } = skills
  return level === undefined ? rest : { ...rest, [id]: level }
}

/**
 * The athlete's own combinations: every one they have marked, learning or
 * known, in catalogue order. Ids the catalogue does not hold — a drill's, or
 * a combination from a newer backup — are left out.
 */
export function practisedCombos(skills: Skills): ReadonlyArray<ComboCue> {
  return ALL_COMBOS.filter((combo) => skills[combo] !== undefined)
}

export interface SkillCount {
  readonly known: number
  readonly learning: number
  readonly total: number
}

/** How many of `ids` are known and how many are being learned. */
export function countSkills(skills: Skills, ids: ReadonlyArray<string>): SkillCount {
  return {
    known: ids.filter((id) => skills[id] === 'known').length,
    learning: ids.filter((id) => skills[id] === 'learning').length,
    total: ids.length,
  }
}

/** The first combination in learning order that is not known yet — what to work on next. */
export function nextComboToLearn(skills: Skills): Combo | undefined {
  return COMBOS.find((combo) => skills[combo.id] !== 'known')
}

/** Where a combination's animation is served from, under whatever base the app is deployed at. */
export function comboAnimationUrl(id: ComboCue): string {
  return `${import.meta.env.BASE_URL}combos/${id}.gif`
}

/**
 * A short session on one combination and nothing else: two two-minute rounds
 * of it, called every five seconds. Repetition is how a combination moves
 * from "learning" to "known", and a full freestyle round dilutes it.
 */
export function comboDrillConfig(id: ComboCue): TimerConfig {
  return {
    mode: 'boxing',
    workMs: 2 * MINUTE_MS,
    restMs: 30 * SECOND_MS,
    rounds: 2,
    callouts: 'mine',
    callsAs: 'names',
    paceMs: 5_000,
    themes: [],
    pool: [id],
  }
}

/** The write that records a level — for a combination or a drill, by its skill id. */
export function saveSkill(skills: Skills, id: string, level: SkillLevel | undefined) {
  return updateTimerSettings({ skills: withSkill(skills, id, level) })
}
