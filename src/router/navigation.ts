import { Dumbbell, History, ListChecks, Shield, Swords } from '@lucide/vue'
import type { NavItem } from '@/types/navigation'
import { RouteNames } from './routeNames'

/**
 * A tab before its label has been translated.
 *
 * Derived from `NavItem` rather than spelled out again: the shell renders a
 * `NavItem`, and the only difference here is that the label is still a message
 * key. Written as two independent shapes, a field added to one would silently
 * not reach the other — and the mapping below would still compile.
 */
type NavItemConfig = Omit<NavItem, 'label'> & { readonly labelKey: string }

const NAV_ITEMS: ReadonlyArray<NavItemConfig> = [
  {
    routeName: RouteNames.timer,
    icon: Swords,
    labelKey: 'nav.timer',
    within: [RouteNames.timerSetup, RouteNames.presets, RouteNames.settings],
  },
  {
    routeName: RouteNames.technique,
    icon: Shield,
    labelKey: 'nav.technique',
    within: [RouteNames.techniqueDetail],
  },
  {
    routeName: RouteNames.combos,
    icon: ListChecks,
    labelKey: 'nav.combos',
    within: [RouteNames.comboDetail],
  },
  { routeName: RouteNames.drills, icon: Dumbbell, labelKey: 'nav.drills' },
  {
    routeName: RouteNames.history,
    icon: History,
    labelKey: 'nav.history',
    within: [RouteNames.sessionDetail],
  },
]

/**
 * The tabs as the shell wants them: labels translated.
 *
 * The list and its untranslated shape stay private: this function is the only
 * thing anyone needs, and a module whose surface is one function cannot be
 * half-used.
 *
 * A pure function over a `translate`, like the timer's label functions — so
 * the unit tier can hold it, and the app calls it from a template rather than
 * memoising it. The only dependency is the active locale, and reading it
 * during render is what makes the shell re-render when the language changes.
 */
export function navItems(t: (key: string) => string): Array<NavItem> {
  return NAV_ITEMS.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }))
}
