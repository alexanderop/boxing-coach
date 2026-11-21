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
  it('starts a jump rope drill under its block names', async ({ drills: _screen }) => {
    await page.getByRole('button', { name: 'Start' }).first().click()
    // The run screen is titled with the drill, and the ring names the block.
    await expect.element(page.getByRole('heading', { name: 'Basic bounce' })).toBeVisible()
    await expect.element(page.getByText('Round 1 of 3')).toBeVisible()

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

  it('records a defensive move as known', async ({ techniqueDetail: _screen }) => {
    await expect.element(page.getByRole('heading', { name: 'Slip', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Known', exact: true }).click()

    await expect.poll(storedSkills).toEqual({ 'technique:slip': 'known' })
  })

  /** One move, two rounds, called every five seconds. */
  it('starts a drill on a single defensive move', async ({ techniqueDetail: timer }) => {
    await page.getByRole('button', { name: 'Drill this move' }).click()
    await timer.run.expectRunning()

    expect(await storedSessions()).toMatchObject([
      { workoutNotes: 'Slip', config: { mode: 'boxing', pool: ['def-slip'], paceMs: 5_000 } },
    ])
  })

  /** Nothing marked yet, so the coach calls the three starter moves. */
  it('starts a reaction drill from the technique library', async ({ technique: timer }) => {
    await page.getByRole('button', { name: 'Start reaction drill' }).click()
    await timer.run.expectRunning()

    expect(await storedSessions()).toMatchObject([
      {
        workoutNotes: 'Reaction drill',
        config: { callouts: 'mine', paceMs: 3_000, pool: ['def-slip', 'def-roll', 'def-block'] },
      },
    ])
  })

  it("starts the first step of today's training from the home screen", async ({ timer }) => {
    await expect.element(page.getByRole('heading', { name: "Today's training" })).toBeVisible()
    await page.getByRole('button', { name: 'Start: Warm-up' }).click()
    await timer.run.expectPhase('Basic bounce')

    expect(await storedSessions()).toMatchObject([
      { workoutNotes: 'Warm-up · Basic bounce', config: { mode: 'custom', repeat: 3 } },
    ])
  })
})
