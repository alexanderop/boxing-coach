<script setup lang="ts">
import { useAtomSet, useAtomValue } from '@effect/atom-vue'
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, Volume2 } from '@lucide/vue'
import { Effect } from 'effect'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/PageLayout.vue'
import { Button } from '@/components/ui/button'
import { settingsMutation } from '@/db'
import { routeTechniqueAtom, skillsAtom } from '@/features/timer/atoms'
import ComboSteps from '@/features/timer/components/ComboSteps.vue'
import SkillPicker from '@/features/timer/components/SkillPicker.vue'
import StartWorkoutButton from '@/features/timer/components/StartWorkoutButton.vue'
import { saveSkill, skillOf, type Combo, type SkillLevel } from '@/features/timer/combos'
import {
  combosUsing,
  defenseDrillConfig,
  TECHNIQUE_POINTS,
  techniqueAnimationUrl,
  techniqueNeighbours,
  techniqueSkillId,
  type Technique,
} from '@/features/timer/technique'
import { playVoiceClip } from '@/features/timer/timerFeedback'
import { callSteps } from '@/features/timer/voiceCues'
import { failureReporter } from '@/lib/reportFailure'
import { RouteNames } from '@/router/routeNames'
import { showToastAtom } from '@/state/toast'

const { t } = useI18n()
const router = useRouter()
const showToast = useAtomSet(() => showToastAtom)
const reportFailure = failureReporter('technique', showToast)
const runSettingsMutation = useAtomSet(() => settingsMutation, { mode: 'promise' })

const technique = useAtomValue(() => routeTechniqueAtom)
const skills = useAtomValue(() => skillsAtom)

const name = (shown: Technique): string => t(`technique.items.${shown.id}.name`)

function setLevel(shown: Technique, level: SkillLevel | undefined): Promise<void> {
  return runSettingsMutation(
    saveSkill(skills.value, techniqueSkillId(shown.id), level).pipe(
      Effect.catchTag(
        'Db.DatabaseError',
        reportFailure('save skill level', t('skills.saveFailed')),
      ),
    ),
  )
}

function show(other: Technique): void {
  void router.replace({ name: RouteNames.techniqueDetail, params: { id: other.id } })
}

function openCombo(combo: Combo): void {
  void router.push({ name: RouteNames.comboDetail, params: { id: combo.id } })
}
</script>

<template>
  <PageLayout :title="t('technique.detailTitle')" back-to="/technique" data-mode="boxing">
    <div v-if="!technique" class="grid flex-1 place-items-center p-6 text-center">
      <p role="alert">{{ t('technique.missing') }}</p>
    </div>

    <div v-else class="mx-auto flex w-full max-w-lg flex-col gap-section p-4">
      <figure class="overflow-hidden rounded-2xl bg-neutral-950">
        <img
          :key="technique.id"
          :src="techniqueAnimationUrl(technique.id)"
          :alt="t('combos.animationAlt', { name: name(technique) })"
          width="210"
          height="350"
          class="mx-auto h-72 w-auto"
        />
        <figcaption class="px-4 pb-3 text-center text-xs text-white/60">
          {{ t('combos.hands') }}
        </figcaption>
      </figure>

      <section class="flex flex-col gap-2">
        <h2 class="text-2xl font-bold tracking-tight">{{ name(technique) }}</h2>
        <p class="text-muted-foreground">{{ t(`technique.items.${technique.id}.summary`) }}</p>
        <Button
          v-if="technique.call"
          variant="outline"
          class="mt-1 self-start"
          @click="playVoiceClip(technique.call)"
        >
          <Volume2 />
          {{ t('technique.hear') }}
        </Button>
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="technique-how">
        <h2 id="technique-how" class="text-section-title font-semibold">
          {{ t('technique.how') }}
        </h2>
        <ol class="divide-y rounded-xl border bg-card">
          <li v-for="point in TECHNIQUE_POINTS" :key="point" class="flex items-start gap-3 p-3">
            <CircleCheck class="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{{ t(`technique.items.${technique.id}.how${point}`) }}</span>
          </li>
        </ol>
      </section>

      <section class="flex flex-col gap-3" aria-labelledby="technique-mistakes">
        <h2 id="technique-mistakes" class="text-section-title font-semibold">
          {{ t('technique.mistakes') }}
        </h2>
        <ul class="divide-y rounded-xl border bg-card">
          <li v-for="point in TECHNIQUE_POINTS" :key="point" class="flex items-start gap-3 p-3">
            <CircleX class="mt-0.5 size-5 shrink-0 text-[var(--mode-color)]" aria-hidden="true" />
            <span>{{ t(`technique.items.${technique.id}.mistake${point}`) }}</span>
          </li>
        </ul>
      </section>

      <SkillPicker
        :level="skillOf(skills, techniqueSkillId(technique.id))"
        @select="setLevel(technique, $event)"
      />

      <section
        v-if="combosUsing(technique).length > 0"
        class="flex flex-col gap-3"
        aria-labelledby="technique-counters"
      >
        <h2 id="technique-counters" class="text-section-title font-semibold">
          {{ t('technique.counters') }}
        </h2>
        <button
          v-for="combo in combosUsing(technique)"
          :key="combo.id"
          type="button"
          class="flex min-h-touch-target select-none touch-manipulation items-center gap-3 rounded-xl border bg-card p-4 text-left transition-transform duration-100 active:scale-[0.99]"
          @click="openCombo(combo)"
        >
          <ComboSteps class="min-w-0 flex-1" :steps="callSteps(combo.id)" />
          <ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </section>

      <nav class="grid grid-cols-2 gap-2" :aria-label="t('technique.title')">
        <Button
          variant="ghost"
          :disabled="!techniqueNeighbours(technique.id).previous"
          @click="show(techniqueNeighbours(technique.id).previous ?? technique)"
        >
          <ChevronLeft />
          {{ t('combos.previous') }}
        </Button>
        <Button
          variant="ghost"
          :disabled="!techniqueNeighbours(technique.id).next"
          @click="show(techniqueNeighbours(technique.id).next ?? technique)"
        >
          {{ t('combos.next') }}
          <ChevronRight />
        </Button>
      </nav>
    </div>

    <!-- The drill is the point of the page, so it stays in reach while reading. -->
    <template v-if="technique?.call" #footer>
      <div class="mx-auto flex w-full max-w-lg flex-col gap-1.5 px-4 py-3">
        <StartWorkoutButton
          class="h-12 bg-[var(--mode-color)] text-base text-[var(--mode-foreground)]"
          :config="defenseDrillConfig([technique.call])"
          :notes="name(technique)"
        >
          {{ t('technique.drill') }}
        </StartWorkoutButton>
        <p class="text-center text-xs text-muted-foreground">{{ t('technique.drillHint') }}</p>
      </div>
    </template>
  </PageLayout>
</template>
