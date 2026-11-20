<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SKILL_LEVELS } from '@/db'
import { chipClass } from '@/features/timer/components/chip'
import type { SkillLevel } from '@/features/timer/combos'

/**
 * New / Learning / Known, for one combination or drill. Three plain buttons
 * rather than a cycling one: the level is set on purpose, and a control that
 * steps through the states turns "known" back into "new" with one stray tap.
 */
const { level } = defineProps<{ level: SkillLevel | undefined }>()
const emit = defineEmits<{ select: [SkillLevel | undefined] }>()

const { t } = useI18n()
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="mb-2 text-sm font-medium">{{ t('skills.label') }}</legend>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :class="chipClass(level === undefined)"
        :aria-pressed="level === undefined"
        @click="emit('select', undefined)"
      >
        {{ t('skills.new') }}
      </button>
      <button
        v-for="option in SKILL_LEVELS"
        :key="option"
        type="button"
        :class="chipClass(level === option)"
        :aria-pressed="level === option"
        @click="emit('select', option)"
      >
        {{ t(`skills.${option}`) }}
      </button>
    </div>
  </fieldset>
</template>
