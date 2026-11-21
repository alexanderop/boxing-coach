<script setup lang="ts">
import { useAtomValue } from '@effect/atom-vue'
import { useI18n } from 'vue-i18n'
import { reviewDueAtom } from '@/features/timer/atoms'
import StartWorkoutButton from '@/features/timer/components/StartWorkoutButton.vue'
import { comboNumbers } from '@/features/timer/combos'
import { reviewConfig } from '@/features/timer/progress'

/**
 * The known combinations that have not been called for a week, and one
 * button that calls only those. Absent when nothing is due: a card that says
 * "nothing to review" is one more thing to read before training.
 */
const { t } = useI18n()
const due = useAtomValue(() => reviewDueAtom)
</script>

<template>
  <section
    v-if="due.length > 0"
    class="rounded-2xl border bg-card p-4 shadow-xs"
    aria-labelledby="review-heading"
  >
    <h2 id="review-heading" class="font-bold">{{ t('review.title') }}</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      {{ t('review.count', { count: due.length }, due.length) }}. {{ t('review.body') }}.
    </p>
    <ul class="mt-3 flex flex-wrap gap-2">
      <li
        v-for="combo in due"
        :key="combo"
        class="rounded-full bg-muted px-3 py-1 text-sm font-semibold tabular-nums"
      >
        {{ comboNumbers(combo) }}
      </li>
    </ul>
    <StartWorkoutButton
      class="mt-4 h-12 w-full bg-[var(--mode-color)] text-base text-[var(--mode-foreground)]"
      :config="reviewConfig(due)"
      :notes="t('review.title')"
    >
      {{ t('review.start') }}
    </StartWorkoutButton>
    <p class="mt-2 text-center text-sm text-muted-foreground">{{ t('review.hint') }}</p>
  </section>
</template>
