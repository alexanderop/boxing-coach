import { Effect } from 'effect'
import { describe, expect } from 'vitest'
import { page } from 'vitest/browser'
import { getTimerSettings, listSessions, runDb } from '@/db'
import { it } from '../../fixtures'

const storedSessions = () => runDb(listSessions.pipe(Effect.orDie))
const storedSkills = async () => (await runDb(getTimerSettings.pipe(Effect.orDie))).skills

/**
 * What makes this a coach rather than a timer: a library to work through, a
 * level per combination and drill, and sessions built from what the athlete
 * has marked. Each test below is one of those promises, end to end against
 * the real store.
 */
describe('boxing coach', () => {
  it('opens a ready-made bag session from the home screen', async ({ timer }) => {
    await timer.chooseProgram('Classic 6')

    await expect
      .element(page.getByRole('button', { name: 'Classic 6' }))
      .toHaveAttribute('aria-pressed', 'true')
    await expect.element(page.getByRole('region', { name: 'Round plan' })).toBeVisible()
  })

  it('records a combination as known', async ({ comboDetail: _screen }) => {
    await page.getByRole('button', { name: 'Known', exact: true }).click()

    await expect
      .element(page.getByRole('button', { name: 'Known', exact: true }))
      .toHaveAttribute('aria-pressed', 'true')
    await expect.poll(storedSkills).toEqual({ 'combo-05': 'known' })
  })

  /** Two rounds of one combination and nothing else. */
  it('starts a drill on a single combination', async ({ comboDetail: timer }) => {
    await page.getByRole('button', { name: 'Drill this combination' }).click()
    await timer.run.expectRunning()

    expect(await storedSessions()).toMatchObject([
      { config: { mode: 'boxing', callouts: 'mine', pool: ['combo-05'], rounds: 2 } },
    ])
  })

  /** A drill is a circuit the timer already runs, under its own block names. */
  it('starts a jump rope drill under its block names', async ({ drills: timer }) => {
    await page.getByRole('button', { name: 'Start' }).first().click()
    await timer.run.expectPhase('Basic bounce')

    expect(await storedSessions()).toMatchObject([
      {
        workoutNotes: 'Basic bounce',
        config: { mode: 'custom', repeat: 3, blocks: [{ label: 'Basic bounce' }, { label: '' }] },
      },
    ])
  })

  it('records a drill as being learned', async ({ drills: _screen }) => {
    await page.getByRole('button', { name: 'Learning', exact: true }).first().click()

    await expect.poll(storedSkills).toEqual({ 'drill:rope-basic': 'learning' })
  })
})
