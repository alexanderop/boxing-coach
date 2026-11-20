import { MINUTE_MS, type BoxingTheme } from '@/features/timer/domain'

/**
 * Ready-made sessions: the round themes, and the round shape they were
 * written for. `classic` is the six-round bag workout most coaching guides
 * converge on — warm up, two rounds of power, two of speed, one of non-stop
 * work. Each program is exactly as many rounds as it has themes.
 *
 * A table of constants, kept out of `domain.ts` on purpose: that module is
 * graded by mutation testing, which cannot attribute a module-level literal to
 * the tests that read it. The specs hold these values directly instead.
 */
export const BOXING_PROGRAMS = {
  classic: {
    workMs: 3 * MINUTE_MS,
    restMs: MINUTE_MS,
    themes: ['warmup', 'power', 'power', 'speed', 'speed', 'endurance'],
  },
  beginner: {
    workMs: 2 * MINUTE_MS,
    restMs: MINUTE_MS,
    themes: ['warmup', 'combos', 'endurance'],
  },
} satisfies Readonly<
  Record<string, { workMs: number; restMs: number; themes: ReadonlyArray<BoxingTheme> }>
>
