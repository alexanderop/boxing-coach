<script setup lang="ts">
import { useAtomSet, useAtomValue } from '@effect/atom-vue'
import { ChevronLeft, ChevronRight, Play, Volume2 } from '@lucide/vue'
import { Effect } from 'effect'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/PageLayout.vue'
import { Button } from '@/components/ui/button'
import { createSession, settingsMutation, workoutStartMutation } from '@/db'
import { hasActiveSessionAtom, routeComboAtom, skillsAtom } from '@/features/timer/atoms'
import ComboSteps from '@/features/timer/components/ComboSteps.vue'
import SkillPicker from '@/features/timer/components/SkillPicker.vue'
import {
  comboAnimationUrl,
  comboDrillConfig,
  comboNeighbours,
  comboNumbers,
  saveSkill,
  skillOf,
  type Combo,
  type SkillLevel,
} from '@/features/timer/combos'
import { playVoiceClip, unlockTimerAudio } from '@/features/timer/timerFeedback'
import { callSteps, comboClip } from '@/features/timer/voiceCues'
import { failureReporter } from '@/lib/reportFailure'
import { RouteNames } from '@/router/routeNames'
import { pendingAtom } from '@/state/pending'
import { timerSettingsValueAtom } from '@/state/timerData'
import { showToastAtom } from '@/state/toast'

const { t } = useI18n()
const router = useRouter()
const showToast = useAtomSet(() => showToastAtom)
const reportFailure = failureReporter('combos', showToast)
const runSettingsMutation = useAtomSet(() => settingsMutation, { mode: 'promise' })
const runStartMutation = useAtomSet(() => workoutStartMutation, { mode: 'promise' })

const combo = useAtomValue(() => routeComboAtom)
const skills = useAtomValue(() => skillsAtom)
const settings = useAtomValue(() => timerSettingsValueAtom)
const hasActiveSession = useAtomValue(() => hasActiveSessionAtom)
const isStarting = useAtomValue(() => pendingAtom('combos.start'))
const setStarting = useAtomSet(() => pendingAtom('combos.start'))

/** The combination's own words, for the picture's alt text: "Jab, Cross, Hook". */
const spelled = (shown: Combo): string =>
  callSteps(shown.id)
    .map((step) => step.label)
    .join(', ')

function setLevel(shown: Combo, level: SkillLevel | undefined): Promise<void> {
  return runSettingsMutation(
    saveSkill(skills.value, shown.id, level).pipe(
      Effect.catchTag(
        'Db.DatabaseError',
        reportFailure('save skill level', t('skills.saveFailed')),
      ),
    ),
  )
}

function show(other: Combo): void {
  void router.replace({ name: RouteNames.comboDetail, params: { id: other.id } })
}

async function practise(shown: Combo): Promise<void> {
  if (isStarting.value || hasActiveSession.value) return
  setStarting(true)
  unlockTimerAudio()
  const failed = reportFailure('start combination drill', t('timer.setup.startFailed'))
  await runStartMutation(
    createSession({
      config: comboDrillConfig(shown.id),
      workoutNotes: '',
      countdownDurationMs: settings.value.startCountdownMs,
    }).pipe(
      Effect.tap((session) =>
        Effect.sync(() => {
          void router.push({ name: RouteNames.timerRun, params: { id: session.id } })
        }),
      ),
      Effect.catchTags({ 'Db.DatabaseError': failed, 'Db.WorkoutInvalidError': failed }),
      Effect.ensuring(Effect.sync(() => setStarting(false))),
    ),
  )
}
</script>

<template>
  <PageLayout :title="t('combos.detailTitle')" back-to="/combos" data-mode="boxing">
    <div v-if="!combo" class="grid flex-1 place-items-center p-6 text-center">
      <p role="alert">{{ t('combos.missing') }}</p>
    </div>

    <div v-else class="mx-auto flex w-full max-w-lg flex-col gap-section p-4">
      <figure class="overflow-hidden rounded-2xl bg-neutral-950">
        <img
          :key="combo.id"
          :src="comboAnimationUrl(combo.id)"
          :alt="t('combos.animationAlt', { name: spelled(combo) })"
          width="210"
          height="350"
          class="mx-auto h-72 w-auto"
        />
        <figcaption class="px-4 pb-3 text-center text-xs text-white/60">
          {{ t('combos.hands') }}
        </figcaption>
      </figure>

      <section class="flex flex-col gap-2">
        <ComboSteps :steps="callSteps(combo.id)" large />
        <p class="text-lg font-semibold text-muted-foreground tabular-nums">
          {{ comboNumbers(combo.id) }}
        </p>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium">{{ t('combos.hear') }}</h2>
        <div class="grid grid-cols-2 gap-2">
          <Button variant="outline" @click="playVoiceClip(comboClip(combo.id, 'names'))">
            <Volume2 />
            {{ t('combos.hearNames') }}
          </Button>
          <Button variant="outline" @click="playVoiceClip(comboClip(combo.id, 'numbers'))">
            <Volume2 />
            {{ t('combos.hearNumbers') }}
          </Button>
        </div>
      </section>

      <SkillPicker :level="skillOf(skills, combo.id)" @select="setLevel(combo, $event)" />

      <section class="flex flex-col gap-2">
        <Button
          class="h-12 bg-[var(--mode-color)] text-base text-[var(--mode-foreground)]"
          :disabled="isStarting || hasActiveSession"
          @click="practise(combo)"
        >
          <Play />
          {{ t('combos.practise') }}
        </Button>
        <p class="text-center text-sm text-muted-foreground">
          {{ hasActiveSession ? t('timer.setup.activeExists') : t('combos.practiseHint') }}
        </p>
      </section>

      <nav class="grid grid-cols-2 gap-2" :aria-label="t('combos.title')">
        <Button
          variant="ghost"
          :disabled="!comboNeighbours(combo.id).previous"
          @click="show(comboNeighbours(combo.id).previous ?? combo)"
        >
          <ChevronLeft />
          {{ t('combos.previous') }}
        </Button>
        <Button
          variant="ghost"
          :disabled="!comboNeighbours(combo.id).next"
          @click="show(comboNeighbours(combo.id).next ?? combo)"
        >
          {{ t('combos.next') }}
          <ChevronRight />
        </Button>
      </nav>
    </div>
  </PageLayout>
</template>
