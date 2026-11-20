<script setup lang="ts">
import { useAtomSet, useAtomValue } from '@effect/atom-vue'
import { Play } from '@lucide/vue'
import { Effect } from 'effect'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/PageLayout.vue'
import { Button } from '@/components/ui/button'
import { createSession, settingsMutation, workoutStartMutation } from '@/db'
import { hasActiveSessionAtom, skillsAtom } from '@/features/timer/atoms'
import SkillPicker from '@/features/timer/components/SkillPicker.vue'
import { countSkills, saveSkill, skillOf, type SkillLevel } from '@/features/timer/combos'
import {
  DRILL_GROUPS,
  DRILL_SKILL_IDS,
  drillAnimationUrl,
  drillConfig,
  drillSkillId,
  drillsIn,
  type Drill,
} from '@/features/timer/drills'
import { configSummary } from '@/features/timer/labels'
import { unlockTimerAudio } from '@/features/timer/timerFeedback'
import { failureReporter } from '@/lib/reportFailure'
import { RouteNames } from '@/router/routeNames'
import { pendingAtom } from '@/state/pending'
import { timerSettingsValueAtom } from '@/state/timerData'
import { showToastAtom } from '@/state/toast'

const { t } = useI18n()
const router = useRouter()
const showToast = useAtomSet(() => showToastAtom)
const reportFailure = failureReporter('drills', showToast)
const runSettingsMutation = useAtomSet(() => settingsMutation, { mode: 'promise' })
const runStartMutation = useAtomSet(() => workoutStartMutation, { mode: 'promise' })

const skills = useAtomValue(() => skillsAtom)
const settings = useAtomValue(() => timerSettingsValueAtom)
const hasActiveSession = useAtomValue(() => hasActiveSessionAtom)
const isStarting = useAtomValue(() => pendingAtom('drills.start'))
const setStarting = useAtomSet(() => pendingAtom('drills.start'))

const progress = () => countSkills(skills.value, DRILL_SKILL_IDS)
const config = (drill: Drill) => drillConfig(drill, (block) => t(`drills.blocks.${block}`))

function setLevel(drill: Drill, level: SkillLevel | undefined): Promise<void> {
  return runSettingsMutation(
    saveSkill(skills.value, drillSkillId(drill.id), level).pipe(
      Effect.catchTag(
        'Db.DatabaseError',
        reportFailure('save skill level', t('skills.saveFailed')),
      ),
    ),
  )
}

async function start(drill: Drill): Promise<void> {
  if (isStarting.value || hasActiveSession.value) return
  setStarting(true)
  unlockTimerAudio()
  const failed = reportFailure('start drill', t('timer.setup.startFailed'))
  await runStartMutation(
    createSession({
      config: config(drill),
      workoutNotes: t(`drills.items.${drill.id}.name`),
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
  <PageLayout
    :title="t('drills.title')"
    :subtitle="t('drills.progress', { known: progress().known, total: progress().total })"
    :show-back="false"
    data-mode="boxing"
  >
    <div class="mx-auto flex w-full max-w-lg flex-col gap-section p-4">
      <p v-if="hasActiveSession" class="rounded-xl border border-dashed p-4 text-center text-sm">
        {{ t('timer.setup.activeExists') }}
      </p>

      <section v-for="group in DRILL_GROUPS" :key="group" class="flex flex-col gap-3">
        <h2 class="text-section-title font-semibold">{{ t(`drills.groups.${group}`) }}</h2>
        <article
          v-for="drill in drillsIn(group)"
          :key="drill.id"
          class="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs"
        >
          <div class="flex gap-4">
            <img
              :src="drillAnimationUrl(drill.id)"
              :alt="t('drills.animationAlt', { name: t(`drills.items.${drill.id}.name`) })"
              width="210"
              height="350"
              loading="lazy"
              class="h-32 w-auto shrink-0 rounded-xl bg-neutral-950"
            />
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-bold tracking-tight">
                {{ t(`drills.items.${drill.id}.name`) }}
              </h3>
              <p class="text-sm font-medium text-[var(--mode-color)] tabular-nums">
                {{ configSummary(config(drill), t) }}
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ t(`drills.items.${drill.id}.description`) }}
              </p>
            </div>
          </div>
          <SkillPicker
            :level="skillOf(skills, drillSkillId(drill.id))"
            @select="setLevel(drill, $event)"
          />
          <Button
            class="h-12 bg-[var(--mode-color)] text-base text-[var(--mode-foreground)]"
            :disabled="isStarting || hasActiveSession"
            @click="start(drill)"
          >
            <Play />
            {{ t('drills.start') }}
          </Button>
        </article>
      </section>
    </div>
  </PageLayout>
</template>
