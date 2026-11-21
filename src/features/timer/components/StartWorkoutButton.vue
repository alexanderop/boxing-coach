<script setup lang="ts">
import { useAtomSet, useAtomValue } from '@effect/atom-vue'
import { Play } from '@lucide/vue'
import { Effect } from 'effect'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { createSession, workoutStartMutation, type TimerConfig } from '@/db'
import { hasActiveSessionAtom } from '@/features/timer/atoms'
import { unlockTimerAudio } from '@/features/timer/timerFeedback'
import { failureReporter } from '@/lib/reportFailure'
import { RouteNames } from '@/router/routeNames'
import { pendingAtom } from '@/state/pending'
import { timerSettingsValueAtom } from '@/state/timerData'
import { showToastAtom } from '@/state/toast'

/**
 * One tap from a ready-made workout to its run screen: the plan's steps, a
 * review, a reaction drill. There is nothing to set up, so there is no setup
 * screen — the config is whatever the caller built, and `notes` is the name
 * the history will show it under.
 *
 * Disabled while a workout is on the clock, like every other way of starting
 * one: the repository would refuse the second anyway.
 */
const { config, notes } = defineProps<{ config: TimerConfig; notes: string }>()

const { t } = useI18n()
const router = useRouter()
const showToast = useAtomSet(() => showToastAtom)
const reportFailure = failureReporter('start', showToast)
const runStartMutation = useAtomSet(() => workoutStartMutation, { mode: 'promise' })
const settings = useAtomValue(() => timerSettingsValueAtom)
const hasActiveSession = useAtomValue(() => hasActiveSessionAtom)
const isStarting = useAtomValue(() => pendingAtom('workout.start'))
const setStarting = useAtomSet(() => pendingAtom('workout.start'))

async function start(): Promise<void> {
  if (isStarting.value || hasActiveSession.value) return
  setStarting(true)
  unlockTimerAudio()
  const failed = reportFailure('start ready-made workout', t('timer.setup.startFailed'))
  await runStartMutation(
    createSession({
      config,
      workoutNotes: notes,
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
  <Button :disabled="isStarting || hasActiveSession" @click="start">
    <Play />
    <slot />
  </Button>
</template>
