<script setup lang="ts">
import { useAtomValue } from '@effect/atom-vue'
import { useI18n } from 'vue-i18n'
import { skillsAtom } from '@/features/timer/atoms'
import StartWorkoutButton from '@/features/timer/components/StartWorkoutButton.vue'
import { configSummary } from '@/features/timer/labels'
import {
  defenseDrillConfig,
  practisedDefense,
  REACTION_ANIMATION_URL,
  STARTER_DEFENSE,
} from '@/features/timer/technique'

/**
 * The reaction drill: the coach calls the athlete's own defensive moves in
 * no order, one every three seconds. On the technique screen and among the
 * defense drills, because it is the answer to both "what do I do with these
 * moves" and "which drill trains my defense".
 */
const { t } = useI18n()
const skills = useAtomValue(() => skillsAtom)

const moves = () => practisedDefense(skills.value)
</script>

<template>
  <article class="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
    <div class="flex gap-4">
      <img
        :src="REACTION_ANIMATION_URL"
        :alt="t('drills.animationAlt', { name: t('technique.reaction.title') })"
        width="210"
        height="350"
        loading="lazy"
        class="h-32 w-auto shrink-0 rounded-xl bg-neutral-950"
      />
      <div class="min-w-0 flex-1">
        <h3 class="text-lg font-bold tracking-tight">{{ t('technique.reaction.title') }}</h3>
        <p class="text-sm font-medium text-[var(--mode-color)] tabular-nums">
          {{ configSummary(defenseDrillConfig(moves()), t) }}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t('technique.reaction.description') }}
          {{
            moves() === STARTER_DEFENSE
              ? t('technique.reaction.starter')
              : t('technique.reaction.own', { count: moves().length })
          }}
        </p>
      </div>
    </div>
    <StartWorkoutButton
      class="h-12 bg-[var(--mode-color)] text-base text-[var(--mode-foreground)]"
      :config="defenseDrillConfig(moves())"
      :notes="t('technique.reaction.title')"
    >
      {{ t('technique.reaction.start') }}
    </StartWorkoutButton>
  </article>
</template>
