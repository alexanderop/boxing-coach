<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SkillLevel } from '@/features/timer/combos'

/** New / Learning / Known as a small pill, for a row in a library list. */
const { level } = defineProps<{ level: SkillLevel | undefined }>()
const { t } = useI18n()
</script>

<template>
  <span
    class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="{
      'bg-[var(--mode-color)] text-[var(--mode-foreground)]': level === 'known',
      'border border-[var(--mode-color)] text-[var(--mode-color)]': level === 'learning',
      'bg-muted text-muted-foreground': level === undefined,
    }"
  >
    {{ t(`skills.${level ?? 'new'}`) }}
  </span>
</template>
