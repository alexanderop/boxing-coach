<script setup lang="ts">
import type { ShownStep } from '@/features/timer/voiceCues'

/**
 * A combination written out punch by punch, each with the hand that throws
 * it: red for the left, white for the right — the same two colours as the
 * gloves in the animations, so the text and the picture say one thing.
 */
const { steps, large = false } = defineProps<{
  steps: ReadonlyArray<ShownStep>
  large?: boolean
}>()
</script>

<template>
  <ol class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <li
      v-for="(step, index) in steps"
      :key="index"
      class="flex items-center gap-1.5 leading-none font-bold tracking-tight"
      :class="large ? 'text-2xl' : 'text-base'"
    >
      {{ step.label }}
      <span
        v-if="step.side"
        class="grid place-items-center rounded-md"
        :class="[
          large ? 'size-7 text-base' : 'size-5 text-xs',
          step.side === 'L'
            ? 'bg-[var(--mode-color)] text-[var(--mode-foreground)]'
            : 'border bg-white text-black',
        ]"
      >
        {{ step.side }}
      </span>
    </li>
  </ol>
</template>
