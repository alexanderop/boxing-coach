<script setup lang="ts">
import { useAtom, useAtomValue } from '@effect/atom-vue'
import { ChevronRight } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/PageLayout.vue'
import { COMBO_FILTERS, comboFilterAtom, skillsAtom } from '@/features/timer/atoms'
import { chipClass } from '@/features/timer/components/chip'
import ComboSteps from '@/features/timer/components/ComboSteps.vue'
import { COMBOS, comboNumbers, countSkills, skillOf, type Combo } from '@/features/timer/combos'
import { callSteps } from '@/features/timer/voiceCues'
import { RouteNames } from '@/router/routeNames'

const { t } = useI18n()
const router = useRouter()
const skills = useAtomValue(() => skillsAtom)
const [filter, setFilter] = useAtom(() => comboFilterAtom)

const LEVELS = ['basic', 'advanced'] as const

const progress = () =>
  countSkills(
    skills.value,
    COMBOS.map((combo) => combo.id),
  )

/** The combinations of one level that the active filter lets through. */
function shown(level: Combo['level']): ReadonlyArray<Combo> {
  return COMBOS.filter(
    (combo) =>
      combo.level === level &&
      (filter.value === 'all' || (skillOf(skills.value, combo.id) ?? 'new') === filter.value),
  )
}

function open(combo: Combo): void {
  void router.push({ name: RouteNames.comboDetail, params: { id: combo.id } })
}
</script>

<template>
  <PageLayout
    :title="t('combos.title')"
    :subtitle="t('home.known', { known: progress().known, total: progress().total })"
    :show-back="false"
    data-mode="boxing"
  >
    <div class="mx-auto flex w-full max-w-lg flex-col gap-section p-4">
      <div
        class="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="progress().known"
        aria-valuemin="0"
        :aria-valuemax="progress().total"
        :aria-label="t('home.progress')"
      >
        <div
          class="h-full rounded-full bg-[var(--mode-color)] transition-[width] duration-300"
          :style="{ width: `${(progress().known / progress().total) * 100}%` }"
        />
      </div>

      <div class="flex flex-wrap gap-2" role="group" :aria-label="t('combos.title')">
        <button
          v-for="option in COMBO_FILTERS"
          :key="option"
          type="button"
          :class="chipClass(filter === option)"
          :aria-pressed="filter === option"
          @click="setFilter(option)"
        >
          {{ t(`combos.filters.${option}`) }}
        </button>
      </div>

      <section v-for="level in LEVELS" :key="level" class="flex flex-col gap-3">
        <h2 class="text-section-title font-semibold">{{ t(`combos.levels.${level}`) }}</h2>
        <p
          v-if="shown(level).length === 0"
          class="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground"
        >
          {{ t('combos.empty') }}
        </p>
        <button
          v-for="combo in shown(level)"
          :key="combo.id"
          type="button"
          class="flex min-h-touch-target select-none touch-manipulation items-center gap-3 rounded-xl border bg-card p-4 text-left transition-transform duration-100 active:scale-[0.99]"
          @click="open(combo)"
        >
          <span class="min-w-0 flex-1">
            <ComboSteps :steps="callSteps(combo.id)" />
            <span class="mt-1.5 block text-sm text-muted-foreground tabular-nums">
              {{ comboNumbers(combo.id) }}
            </span>
          </span>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="{
              'bg-[var(--mode-color)] text-[var(--mode-foreground)]':
                skillOf(skills, combo.id) === 'known',
              'border border-[var(--mode-color)] text-[var(--mode-color)]':
                skillOf(skills, combo.id) === 'learning',
              'bg-muted text-muted-foreground': skillOf(skills, combo.id) === undefined,
            }"
          >
            {{ t(`skills.${skillOf(skills, combo.id) ?? 'new'}`) }}
          </span>
          <ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </section>
    </div>
  </PageLayout>
</template>
