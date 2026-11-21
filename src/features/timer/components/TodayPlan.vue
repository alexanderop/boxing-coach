<script setup lang="ts">
import { useAtomValue } from '@effect/atom-vue'
import { Check } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { sessionsAtom, skillsAtom, todayAtom } from '@/features/timer/atoms'
import StartWorkoutButton from '@/features/timer/components/StartWorkoutButton.vue'
import { MINUTE_MS } from '@/features/timer/domain'
import { finishedSteps, nextStep, todaysPlan, type PlanStep } from '@/features/timer/plan'
import { dayNumber } from '@/features/timer/progress'

/**
 * Today's session as a checklist: five steps in gym order, each one tap from
 * its run screen. The step to do next carries the one filled button; a step
 * ticks itself once its workout is finished, because "done" is read off the
 * history rather than kept as a flag.
 */
const { t } = useI18n()
const skills = useAtomValue(() => skillsAtom)
const sessions = useAtomValue(() => sessionsAtom)
const today = useAtomValue(() => todayAtom)

const plan = () => todaysPlan(skills.value, dayNumber(today.value), t)
const done = () => finishedSteps(plan(), sessions.value, today.value)
const upNext = () => nextStep(plan(), done())
const minutes = (durationMs: number): number => Math.round(durationMs / MINUTE_MS)
const totalMinutes = () => minutes(plan().reduce((sum, step) => sum + step.durationMs, 0))
const notes = (step: PlanStep): string => `${t(`plan.steps.${step.id}`)} · ${step.detail}`
</script>

<template>
  <section class="rounded-2xl border bg-card p-4 shadow-xs" aria-labelledby="plan-heading">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="plan-heading" class="font-bold">{{ t('plan.title') }}</h2>
      <p class="text-sm text-muted-foreground tabular-nums">
        {{ t('plan.progress', { done: done().length, total: plan().length }) }} ·
        {{ t('plan.minutes', { count: totalMinutes() }) }}
      </p>
    </div>

    <ol class="mt-3 flex flex-col gap-2">
      <li
        v-for="(step, index) in plan()"
        :key="step.id"
        class="flex items-center gap-3 rounded-xl border bg-background p-3"
      >
        <span
          class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums"
          :class="
            done().includes(step.id)
              ? 'bg-[var(--mode-color)] text-[var(--mode-foreground)]'
              : 'border text-muted-foreground'
          "
        >
          <Check v-if="done().includes(step.id)" class="size-4" :aria-label="t('plan.done')" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">{{ t(`plan.steps.${step.id}`) }}</span>
          <span class="block text-sm text-muted-foreground">
            {{ step.detail }} · {{ t('plan.minutes', { count: minutes(step.durationMs) }) }}
          </span>
        </span>
        <!-- One labelled button, on the step to do next; the others keep a
             quiet play icon, so the card has a single place to tap. -->
        <StartWorkoutButton
          :variant="step.id === upNext()?.id ? 'default' : 'ghost'"
          :size="step.id === upNext()?.id ? 'default' : 'icon'"
          :config="step.config"
          :notes="notes(step)"
          :aria-label="`${t(done().includes(step.id) ? 'plan.again' : 'plan.start')}: ${t(`plan.steps.${step.id}`)}`"
        >
          <template v-if="step.id === upNext()?.id">{{ t('plan.start') }}</template>
        </StartWorkoutButton>
      </li>
    </ol>

    <p v-if="!upNext()" class="mt-3 text-sm font-medium">{{ t('plan.allDone') }}</p>
  </section>
</template>
