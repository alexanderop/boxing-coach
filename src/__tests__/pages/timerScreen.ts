import { expect, vi } from 'vitest'
import type { Locator } from 'vitest/browser'
import { page } from 'vitest/browser'
import { renderApp } from '../helpers/renderApp'
import { AppScreen } from './appScreen'
import { TimerResultScreen } from './timerResultScreen'
import { TimerRunScreen } from './timerRunScreen'
import { TimerSetupScreen } from './timerSetupScreen'

/**
 * The workout journey. Route transitions expose a setup, run, and result
 * object so specs name intent while each screen owns its locators.
 */
export class TimerScreen extends AppScreen {
  readonly setup = new TimerSetupScreen()
  readonly run = new TimerRunScreen()
  readonly result = new TimerResultScreen()

  static async open(path = '/'): Promise<TimerScreen> {
    const app = await renderApp(path)
    return new TimerScreen(app.container, app.cleanup)
  }

  /** The home screen's ready-made bag sessions. */
  async bagWork(): Promise<Locator> {
    await this.expectHome()
    return page.getByRole('region', { name: 'Bag work' })
  }

  // Scoped to the region: a saved preset named "Classic 6 heavy" would make
  // the lookup ambiguous anywhere else on the screen.
  async chooseProgram(name: 'Freestyle' | 'Classic 6' | 'Beginner 3'): Promise<void> {
    const programs = await this.bagWork()
    await programs.getByRole('button', { name }).click()
  }

  readonly expectHome = vi.defineHelper(async (): Promise<void> => {
    await expect
      .element(page.getByRole('heading', { name: 'Boxing Coach', level: 1 }))
      .toBeVisible()
  })

  readonly expectRecovery = vi.defineHelper(async (): Promise<void> => {
    await expect.element(page.getByText('Workout in progress')).toBeVisible()
  })

  async resume(): Promise<void> {
    await page.getByRole('button', { name: 'Resume timer' }).click()
  }
}
