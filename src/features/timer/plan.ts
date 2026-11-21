import { sameTimerConfig, type TimerConfig, type WorkoutSession } from '@/db'
import {
  comboDrillConfig,
  COMBOS,
  countSkills,
  nextComboToLearn,
  practisedCombos,
  type Skills,
} from '@/features/timer/combos'
import { totalDurationMs } from '@/features/timer/domain'
import { drillConfig, DRILLS, drillSkillId, type Drill } from '@/features/timer/drills'
import { BOXING_PROGRAMS } from '@/features/timer/programs'
import {
  defenseDrillConfig,
  practisedDefense,
  techniqueSkillId,
  TECHNIQUES,
} from '@/features/timer/technique'
import { callSteps } from '@/features/timer/voiceCues'

/**
 * Today's training: one complete session, in the order a boxing gym runs it —
 * warm up on the rope, work on one new thing, do the rounds on the bag, drill
 * the defense, empty the tank.
 *
 * The library says what there is to learn; this says what to do *today*. It
 * is put together from what the athlete has marked, so it grows with them:
 * the bag rounds call their own combinations, the technique block is whatever
 * comes next in the library, and the session gets longer once there is enough
 * to fill it.
 *
 * A function of the levels and the date, never stored: a step is done when a
 * workout with exactly its config was finished today.
 */
const PLAN_STEPS = ['warmup', 'technique', 'bag', 'defense', 'finisher'] as const
export type PlanStepId = (typeof PLAN_STEPS)[number]

export interface PlanStep {
  readonly id: PlanStepId
  /** What the step is today, in the athlete's language: "Boxer skip", "Jab, Cross, Hook". */
  readonly detail: string
  readonly config: TimerConfig
  readonly durationMs: number
}

type Translate = (key: string) => string

/** With this many combinations in hand a full six-round session has enough to call. */
const FULL_SESSION_COMBOS = 5

const ROPE_DRILLS = DRILLS.filter((drill) => drill.group === 'rope')

/** The first rope drill not mastered yet; the intervals once all of them are. */
function warmupDrill(skills: Skills): Drill {
  const next = ROPE_DRILLS.find((drill) => skills[drillSkillId(drill.id)] !== 'known')
  // SAFETY: the catalogue holds three rope drills, so the last one exists.
  return next ?? (ROPE_DRILLS.at(-1) as Drill)
}

function drillStep(id: PlanStepId, drill: Drill, t: Translate): PlanStep {
  return step(
    id,
    t(`drills.items.${drill.id}.name`),
    drillConfig(drill, (block) => t(`drills.blocks.${block}`)),
  )
}

function step(id: PlanStepId, detail: string, config: TimerConfig): PlanStep {
  return { id, detail, config, durationMs: totalDurationMs(config) ?? 0 }
}

/**
 * The one new thing. Even days work on a combination, odd days on a
 * defensive move — the next of each that is not known yet. When one library
 * is finished the other takes every day, and when both are, the combinations
 * are walked through again one a day.
 */
function techniqueStep(skills: Skills, day: number, t: Translate): PlanStep {
  const combo = nextComboToLearn(skills)
  const move = TECHNIQUES.find(
    (technique) =>
      technique.call !== undefined && skills[techniqueSkillId(technique.id)] !== 'known',
  )
  const defenseDay = day % 2 === 1
  if (move?.call !== undefined && (defenseDay || combo === undefined)) {
    return step('technique', t(`technique.items.${move.id}.name`), defenseDrillConfig([move.call]))
  }
  // SAFETY: `day % length` is always an index into the non-empty catalogue.
  const chosen = combo ?? (COMBOS[day % COMBOS.length] as (typeof COMBOS)[number])
  return step(
    'technique',
    callSteps(chosen.id)
      .map((punch) => punch.label)
      .join(', '),
    comboDrillConfig(chosen.id),
  )
}

function bagStep(skills: Skills, t: Translate): PlanStep {
  const own = practisedCombos(skills)
  const count = countSkills(skills, own)
  const name = count.known + count.learning >= FULL_SESSION_COMBOS ? 'classic' : 'beginner'
  const program = BOXING_PROGRAMS[name]
  return step('bag', t(`home.programs.${name}.name`), {
    mode: 'boxing',
    workMs: program.workMs,
    restMs: program.restMs,
    rounds: program.themes.length,
    callouts: 'mine',
    callsAs: 'names',
    paceMs: 5_000,
    themes: program.themes,
    pool: [...own],
  })
}

/**
 * The session for one day. `day` is any number that changes once a day; `t`
 * writes the block names into the configs, as starting a drill by hand does.
 */
export function todaysPlan(skills: Skills, day: number, t: Translate): ReadonlyArray<PlanStep> {
  const finisher = DRILLS.find((drill) => drill.id === 'punch-out')
  return [
    drillStep('warmup', warmupDrill(skills), t),
    techniqueStep(skills, day, t),
    bagStep(skills, t),
    step('defense', t('plan.reaction'), defenseDrillConfig(practisedDefense(skills))),
    ...(finisher === undefined ? [] : [drillStep('finisher', finisher, t)]),
  ]
}

/** The steps of a plan already done: a workout with the step's config, finished since `dayStart`. */
export function finishedSteps(
  plan: ReadonlyArray<PlanStep>,
  sessions: ReadonlyArray<WorkoutSession>,
  dayStart: number,
): ReadonlyArray<PlanStepId> {
  const today = sessions.filter(
    (session) => session.status === 'completed' && session.startedAt >= dayStart,
  )
  return plan
    .filter((planned) => today.some((session) => sameTimerConfig(session.config, planned.config)))
    .map((planned) => planned.id)
}

/** The first step still open — the one "Start" button a plan has. */
export function nextStep(
  plan: ReadonlyArray<PlanStep>,
  done: ReadonlyArray<PlanStepId>,
): PlanStep | undefined {
  return plan.find((planned) => !done.includes(planned.id))
}
