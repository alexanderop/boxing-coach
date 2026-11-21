<script setup lang="ts">
import { useAtomValue } from '@effect/atom-vue'
import { ChevronRight } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/PageLayout.vue'
import { skillsAtom } from '@/features/timer/atoms'
import ReactionDrillCard from '@/features/timer/components/ReactionDrillCard.vue'
import SkillBadge from '@/features/timer/components/SkillBadge.vue'
import { countSkills, skillOf } from '@/features/timer/combos'
import {
  TECHNIQUE_GROUPS,
  TECHNIQUE_SKILL_IDS,
  techniqueAnimationUrl,
  techniqueSkillId,
  techniquesIn,
  type Technique,
} from '@/features/timer/technique'
import { RouteNames } from '@/router/routeNames'

const { t } = useI18n()
const router = useRouter()
const skills = useAtomValue(() => skillsAtom)

const progress = () => countSkills(skills.value, TECHNIQUE_SKILL_IDS)

function open(technique: Technique): void {
  void router.push({ name: RouteNames.techniqueDetail, params: { id: technique.id } })
}
</script>

<template>
  <PageLayout
    :title="t('technique.title')"
    :subtitle="t('technique.progress', { known: progress().known, total: progress().total })"
    :show-back="false"
    data-mode="boxing"
  >
    <div class="mx-auto flex w-full max-w-lg flex-col gap-section p-4">
      <div
        class="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        :aria-valuenow="progress().known"
        aria-valuemin="0"
        :aria-valuemax="progress().total"
        :aria-label="t('technique.title')"
      >
        <div
          class="h-full rounded-full bg-[var(--mode-color)] transition-[width] duration-300"
          :style="{ width: `${(progress().known / progress().total) * 100}%` }"
        />
      </div>

      <section v-for="group in TECHNIQUE_GROUPS" :key="group" class="flex flex-col gap-3">
        <h2 class="text-section-title font-semibold">{{ t(`technique.groups.${group}`) }}</h2>
        <button
          v-for="technique in techniquesIn(group)"
          :key="technique.id"
          type="button"
          class="flex min-h-touch-target select-none touch-manipulation items-center gap-3 rounded-xl border bg-card p-3 text-left transition-transform duration-100 active:scale-[0.99]"
          @click="open(technique)"
        >
          <img
            :src="techniqueAnimationUrl(technique.id)"
            alt=""
            width="210"
            height="350"
            loading="lazy"
            class="h-16 w-auto shrink-0 rounded-lg bg-neutral-950"
          />
          <span class="min-w-0 flex-1">
            <span class="block font-bold tracking-tight">
              {{ t(`technique.items.${technique.id}.name`) }}
            </span>
            <span class="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {{ t(`technique.items.${technique.id}.summary`) }}
            </span>
          </span>
          <SkillBadge :level="skillOf(skills, techniqueSkillId(technique.id))" />
          <ChevronRight class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
        <ReactionDrillCard v-if="group === 'defense'" />
      </section>
    </div>
  </PageLayout>
</template>
