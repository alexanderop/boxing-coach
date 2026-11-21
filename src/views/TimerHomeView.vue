<script setup lang="ts">
import { useAtomValue } from '@effect/atom-vue'
import { ChevronRight, Play, Settings, Swords } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/PageLayout.vue'
import { Button } from '@/components/ui/button'
import {
  activeSessionAtom,
  homeLoadFailedAtom,
  recentPresetsAtom,
  skillsAtom,
} from '@/features/timer/atoms'
import ComboSteps from '@/features/timer/components/ComboSteps.vue'
import ReviewCard from '@/features/timer/components/ReviewCard.vue'
import TodayPlan from '@/features/timer/components/TodayPlan.vue'
import WeekProgress from '@/features/timer/components/WeekProgress.vue'
import { COMBOS, countSkills, nextComboToLearn } from '@/features/timer/combos'
import { configSummary } from '@/features/timer/labels'
import { BOXING_PROGRAM_CHOICES } from '@/features/timer/setupForm'
import { callSteps } from '@/features/timer/voiceCues'
import { RouteNames } from '@/router/routeNames'
import type { TimerConfig } from '@/db'

const { t } = useI18n()
const router = useRouter()

const loadFailed = useAtomValue(() => homeLoadFailedAtom)
const activeSession = useAtomValue(() => activeSessionAtom)
const recentPresets = useAtomValue(() => recentPresetsAtom)
const skills = useAtomValue(() => skillsAtom)

const summary = (config: TimerConfig): string => configSummary(config, t)
const progress = () =>
  countSkills(
    skills.value,
    COMBOS.map((combo) => combo.id),
  )
const learnNext = () => nextComboToLearn(skills.value)

function openProgram(program: (typeof BOXING_PROGRAM_CHOICES)[number]): void {
  void router.push({
    name: RouteNames.timerSetup,
    params: { mode: 'boxing' },
    query: { program },
  })
}
</script>

<template>
  <PageLayout
    :title="t('timer.title')"
    :subtitle="t('timer.subtitle')"
    :show-back="false"
    data-mode="boxing"
  >
    <template #header-actions>
      <Button
        variant="ghost"
        size="icon"
        :aria-label="t('nav.settings')"
        @click="router.push({ name: RouteNames.settings })"
      >
        <Settings class="size-5" />
      </Button>
    </template>
    <div class="mx-auto flex w-full max-w-lg flex-col gap-section p-4">
      <div v-if="loadFailed" role="alert" class="rounded-xl border border-dashed p-6 text-center">
        <p class="text-sm text-muted-foreground">{{ t('common.loadError') }}</p>
      </div>

      <section
        v-if="activeSession"
        :data-mode="activeSession.config.mode"
        class="rounded-2xl border-2 border-[var(--mode-color)] bg-card p-4 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <span
            class="grid size-11 place-items-center rounded-full bg-[var(--mode-color)] text-[var(--mode-foreground)]"
          >
            <Play class="size-5" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="font-bold">{{ t('timer.resume.title') }}</h2>
            <p class="text-sm text-muted-foreground">{{ t('timer.resume.body') }}</p>
          </div>
        </div>
        <Button
          class="mt-4 w-full bg-[var(--mode-color)] text-[var(--mode-foreground)]"
          @click="router.push({ name: RouteNames.timerRun, params: { id: activeSession.id } })"
        >
          {{ t('timer.resume.action') }}
        </Button>
      </section>

      <TodayPlan />
      <WeekProgress />
      <ReviewCard />

      <!-- Where the athlete stands, and the one thing to work on next. -->
      <section class="rounded-2xl border bg-card p-4 shadow-xs" aria-labelledby="progress-heading">
        <div class="flex items-baseline justify-between gap-3">
          <h2 id="progress-heading" class="font-bold">{{ t('home.progress') }}</h2>
          <p class="text-sm text-muted-foreground tabular-nums">
            {{ t('home.known', { known: progress().known, total: progress().total }) }}
          </p>
        </div>
        <div
          class="mt-3 h-2 overflow-hidden rounded-full bg-muted"
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
        <p v-if="progress().learning > 0" class="mt-2 text-sm text-muted-foreground">
          {{ t('home.learning', { count: progress().learning }) }}
        </p>

        <button
          v-if="learnNext()"
          type="button"
          class="mt-4 flex min-h-touch-target w-full select-none touch-manipulation items-center gap-3 rounded-xl border bg-background p-3 text-left transition-transform duration-100 active:scale-[0.99]"
          @click="
            router.push({ name: RouteNames.comboDetail, params: { id: learnNext()?.id ?? '' } })
          "
        >
          <span class="min-w-0 flex-1">
            <span class="block text-xs font-bold tracking-widest text-muted-foreground uppercase">
              {{ t('home.learnNext') }}
            </span>
            <ComboSteps class="mt-1.5" :steps="callSteps(learnNext()?.id ?? '')" />
          </span>
          <ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
        <p v-else class="mt-4 text-sm">{{ t('home.allKnown') }}</p>
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="bag-work-heading">
        <h2 id="bag-work-heading" class="text-section-title font-semibold">
          {{ t('home.bagWork') }}
        </h2>
        <button
          v-for="program in BOXING_PROGRAM_CHOICES"
          :key="program"
          type="button"
          class="group flex min-h-20 w-full select-none touch-manipulation items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-xs transition-transform duration-100 active:scale-[0.99]"
          @click="openProgram(program)"
        >
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--mode-color)] text-[var(--mode-foreground)] shadow-sm"
          >
            <Swords class="size-6" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-lg font-bold tracking-tight">
              {{ t(`home.programs.${program}.name`) }}
            </span>
            <span class="mt-0.5 block text-sm text-muted-foreground">
              {{ t(`home.programs.${program}.description`) }}
            </span>
          </span>
          <ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </section>

      <section
        v-if="recentPresets.length > 0"
        class="flex flex-col gap-3"
        aria-labelledby="recent-presets-heading"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 id="recent-presets-heading" class="text-section-title font-semibold">
            {{ t('timer.recentPresets') }}
          </h2>
          <Button variant="ghost" size="sm" @click="router.push({ name: RouteNames.presets })">
            {{ t('timer.viewPresets') }}
          </Button>
        </div>

        <button
          v-for="preset in recentPresets"
          :key="preset.id"
          type="button"
          :data-mode="preset.config.mode"
          class="flex min-h-touch-target items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left"
          @click="
            router.push({
              name: RouteNames.timerSetup,
              params: { mode: preset.config.mode },
              query: { preset: preset.id },
            })
          "
        >
          <span>
            <span class="block font-semibold">{{ preset.name }}</span>
            <span class="block text-sm text-muted-foreground">{{ summary(preset.config) }}</span>
          </span>
          <span class="size-3 rounded-full bg-[var(--mode-color)]" aria-hidden="true" />
        </button>
      </section>
    </div>
  </PageLayout>
</template>
