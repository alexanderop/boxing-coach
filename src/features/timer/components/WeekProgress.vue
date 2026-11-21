<script setup lang="ts">
import { useAtomValue } from '@effect/atom-vue'
import { Flame } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { dayStreakAtom, weeklyTotalsAtom } from '@/features/timer/atoms'

/**
 * The week so far, and the eight it follows: workouts, rounds and minutes as
 * numbers, minutes per week as bars. The current week is the filled bar, so
 * "more than last week" is something to see rather than to work out.
 */
const { t } = useI18n()
const weeks = useAtomValue(() => weeklyTotalsAtom)
const streak = useAtomValue(() => dayStreakAtom)

const STATS = ['sessions', 'rounds', 'minutes'] as const

const thisWeek = () => weeks.value.at(-1)
const trained = (): boolean => weeks.value.some((week) => week.minutes > 0)
const longest = () => Math.max(1, ...weeks.value.map((week) => week.minutes))
/** A week without training still gets a sliver, so the row reads as eight weeks. */
const barHeight = (minutes: number): string => `${Math.max(6, (minutes / longest()) * 100)}%`
</script>

<template>
  <section class="rounded-2xl border bg-card p-4 shadow-xs" aria-labelledby="week-heading">
    <div class="flex items-center justify-between gap-3">
      <h2 id="week-heading" class="font-bold">{{ t('progress.title') }}</h2>
      <p
        class="flex items-center gap-1.5 text-sm font-semibold"
        :class="streak > 0 ? 'text-[var(--mode-color)]' : 'text-muted-foreground'"
      >
        <Flame class="size-4" aria-hidden="true" />
        {{ t('progress.streak', { count: streak }, streak) }}
      </p>
    </div>

    <dl class="mt-3 grid grid-cols-3 gap-2">
      <div v-for="stat in STATS" :key="stat" class="rounded-xl bg-muted p-3 text-center">
        <dd class="text-2xl font-bold tabular-nums">{{ thisWeek()?.[stat] ?? 0 }}</dd>
        <dt class="text-xs text-muted-foreground">{{ t(`progress.${stat}`) }}</dt>
      </div>
    </dl>

    <!-- Eight empty bars read as a broken chart, so it waits for a first workout. -->
    <div
      v-if="trained()"
      class="mt-4 flex h-14 items-end gap-1.5"
      role="img"
      :aria-label="t('progress.weeks')"
    >
      <div
        v-for="(week, index) in weeks"
        :key="week.weekStart"
        class="flex-1 rounded-sm"
        :class="index === weeks.length - 1 ? 'bg-[var(--mode-color)]' : 'bg-muted-foreground/30'"
        :style="{ height: barHeight(week.minutes) }"
      />
    </div>
    <p v-if="trained()" class="mt-1.5 text-xs text-muted-foreground">{{ t('progress.weeks') }}</p>
  </section>
</template>
