import { describe, expect } from 'vitest'
import { it } from '../fixtures'

/**
 * ARIA snapshots protect promised semantics that axe does not consider a
 * violation when they disappear. Keep them scoped to stable regions.
 */
describe('accessibility tree', () => {
  it('the tab bar names all destinations', async ({ timer }) => {
    await expect.element(timer.tabBar).toMatchAriaSnapshot()
  })

  it('the home screen exposes each bag session as a button', async ({ timer }) => {
    await expect.element(await timer.bagWork()).toMatchAriaSnapshot()
  })
})
