import { SECOND_MS } from '@/features/timer/domain'
import type { TimerConfig } from '@/db'

/**
 * The drills around the punching: rope work, footwork, a block of defense
 * circuits, and the simple bag and shadow rounds that build everything else.
 *
 * A drill is a circuit the timer already knows how to run — named blocks of
 * work and rest, repeated — plus an animation and a level to track. Nothing
 * here is a new kind of workout: `drillConfig` turns one into the `custom`
 * config the run screen, the history and the backups already handle.
 */
const DRILL_BLOCKS = [
  'basicBounce',
  'boxerSkip',
  'highKnees',
  'doubleUnders',
  'forwardBack',
  'sideToSide',
  'pivots',
  'slips',
  'rolls',
  'slipCounter',
  'highGuard',
  'parries',
  'blockCounter',
  'pullBacks',
  'stepBacks',
  'pullCounter',
  'slipPivot',
  'rollOut',
  'defenseOnly',
  'counterOnly',
  'hitAndMove',
  'jabOnly',
  'jabCross',
  'freeCombos',
  'straightPunches',
] as const
export type DrillBlock = (typeof DRILL_BLOCKS)[number]

export const DRILL_GROUPS = ['rope', 'movement', 'defense', 'punching'] as const
export type DrillGroup = (typeof DRILL_GROUPS)[number]

/** One block of a drill: what to do, or `rest`, and for how many seconds. */
type DrillStep = readonly [what: DrillBlock | 'rest', seconds: number]

interface DrillSpec {
  readonly id: string
  readonly group: DrillGroup
  readonly steps: ReadonlyArray<DrillStep>
  readonly repeat: number
}

export const DRILLS = [
  {
    id: 'rope-basic',
    group: 'rope',
    steps: [
      ['basicBounce', 60],
      ['rest', 30],
    ],
    repeat: 3,
  },
  {
    id: 'rope-skip',
    group: 'rope',
    steps: [
      ['boxerSkip', 60],
      ['rest', 30],
    ],
    repeat: 3,
  },
  {
    id: 'rope-intervals',
    group: 'rope',
    steps: [
      ['basicBounce', 30],
      ['highKnees', 30],
      ['boxerSkip', 30],
      ['doubleUnders', 20],
      ['rest', 40],
    ],
    repeat: 3,
  },
  {
    id: 'footwork',
    group: 'movement',
    steps: [
      ['forwardBack', 60],
      ['sideToSide', 60],
      ['pivots', 60],
      ['rest', 30],
    ],
    repeat: 2,
  },
  {
    id: 'defense',
    group: 'defense',
    steps: [
      ['slips', 45],
      ['rolls', 45],
      ['slipCounter', 45],
      ['rest', 30],
    ],
    repeat: 2,
  },
  {
    id: 'defense-guard',
    group: 'defense',
    steps: [
      ['highGuard', 45],
      ['parries', 45],
      ['blockCounter', 45],
      ['rest', 30],
    ],
    repeat: 2,
  },
  {
    id: 'defense-distance',
    group: 'defense',
    steps: [
      ['pullBacks', 45],
      ['stepBacks', 45],
      ['pullCounter', 45],
      ['rest', 30],
    ],
    repeat: 2,
  },
  {
    id: 'defense-angles',
    group: 'defense',
    steps: [
      ['pivots', 45],
      ['slipPivot', 45],
      ['rollOut', 45],
      ['rest', 30],
    ],
    repeat: 2,
  },
  {
    id: 'defense-shadow',
    group: 'defense',
    steps: [
      ['defenseOnly', 60],
      ['counterOnly', 60],
      ['hitAndMove', 60],
      ['rest', 30],
    ],
    repeat: 2,
  },
  {
    id: 'shadow',
    group: 'punching',
    steps: [
      ['jabOnly', 60],
      ['jabCross', 60],
      ['freeCombos', 60],
      ['rest', 30],
    ],
    repeat: 2,
  },
  {
    id: 'bag-jab',
    group: 'punching',
    steps: [
      ['jabOnly', 120],
      ['rest', 45],
    ],
    repeat: 2,
  },
  {
    id: 'punch-out',
    group: 'punching',
    steps: [
      ['straightPunches', 20],
      ['rest', 10],
    ],
    repeat: 8,
  },
] as const satisfies ReadonlyArray<DrillSpec>

export type Drill = (typeof DRILLS)[number]
export type DrillId = Drill['id']

/** The key a drill's level is stored under, apart from the combinations' own ids. */
export function drillSkillId(id: DrillId): string {
  return `drill:${id}`
}

export const DRILL_SKILL_IDS = DRILLS.map((drill) => drillSkillId(drill.id))

export function drillsIn(group: DrillGroup): ReadonlyArray<Drill> {
  return DRILLS.filter((drill) => drill.group === group)
}

/**
 * A drill as the timer runs it. The block names are written into the config
 * in the athlete's language at the moment they start — a session is a record
 * of what was done, and should not change its words when the locale does.
 * A rest has no name: the run screen says "Rest" for it.
 */
export function drillConfig(drill: Drill, blockName: (block: DrillBlock) => string): TimerConfig {
  return {
    mode: 'custom',
    blocks: drill.steps.map(([what, seconds]) =>
      what === 'rest'
        ? { label: '', kind: 'rest', durationMs: seconds * SECOND_MS }
        : { label: blockName(what), kind: 'work', durationMs: seconds * SECOND_MS },
    ),
    repeat: drill.repeat,
  }
}

/** Where a drill's animation is served from, under whatever base the app is deployed at. */
export function drillAnimationUrl(id: DrillId): string {
  return `${import.meta.env.BASE_URL}drills/${id}.gif`
}
