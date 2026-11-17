<template>
  <section aria-label="Story quests" class="space-y-4">
    <ActionToasts :error="error" :success="message" />
    <p class="text-sm text-gray-500">
      Follow a story through ordered objectives. Rewards are fixed when you accept it. Town contracts remain available
      in the other journal tabs.
    </p>
    <p v-if="loading" role="status">Loading stories…</p>
    <button v-if="error" class="quest-button" @click="load">Retry stories</button>
    <article v-for="story in stories" :key="story.code" class="quest-card rounded-xl p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">{{ story.title }}</h2>
        <span class="text-sm">{{
          story.progress?.claimedAt
            ? 'Completed'
            : story.progress?.completedAt
              ? 'Reward ready'
              : story.progress
                ? `Step ${story.progress.step + 1} / ${story.steps.length}`
                : `Level ${story.minLevel} · ${story.town.name}`
        }}</span>
      </div>
      <p class="mt-2 text-sm">{{ story.description }}</p>
      <ol class="mt-4 space-y-3">
        <li
          v-for="(step, index) in story.steps"
          :key="index"
          :class="{ 'opacity-60': story.progress && index !== story.progress.step }"
        >
          <strong>{{ story.progress && story.progress.step > index ? '✓' : `${index + 1}.` }} {{ step.title }}</strong>
          <p v-if="!story.progress || index === story.progress.step" class="mt-1 text-sm">{{ step.description }}</p>
          <p v-if="story.progress && index === story.progress.step" class="text-sm text-amber-200">
            {{ story.progress.progress }} / {{ step.target }}
          </p>
          <p v-if="step.optionalNoPotion" class="mt-1 text-sm text-emerald-300">
            Optional: win the final fight of this step without drinking a health potion. Bonus: one +{{
              story.rewards.gemValue
            }}
            damage equipment gem. The story continues even if you miss the bonus.
          </p>
        </li>
      </ol>
      <p class="mt-4 text-sm text-amber-200">
        {{ story.rewards.experience }} experience + choose {{ story.rewards.gold }} gold OR
        {{ story.rewards.wood }} wood and {{ story.rewards.stone }} stone (requires a castle with storage space).
      </p>
      <p v-if="story.progress?.completedAt" class="mt-2 text-sm">
        {{ story.progress.bonusEarned ? 'Bonus gem earned.' : 'Optional bonus not earned.' }}
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          v-if="!story.progress"
          class="quest-button quest-button--primary"
          :disabled="pending"
          @click="act(story, 'accept')"
        >
          Accept story
        </button>
        <template v-else-if="!story.progress.claimedAt">
          <button v-if="!story.progress.completedAt" class="quest-button" @click="track(story)">
            {{ selected === `story:${story.code}` ? 'Tracked on map' : 'Track on map' }}
          </button>
          <RouterLink to="/" class="quest-button">Open map</RouterLink>
          <button
            v-if="story.steps[story.progress.step]?.kind === 'VISIT'"
            class="quest-button"
            :disabled="pending"
            @click="act(story, 'investigate')"
          >
            Investigate location
          </button>
          <template v-if="story.progress.completedAt">
            <button class="quest-button quest-button--primary" :disabled="pending" @click="act(story, 'claim', 'gold')">
              Claim {{ story.rewards.gold }} gold
            </button>
            <button class="quest-button" :disabled="pending" @click="act(story, 'claim', 'resources')">
              Claim wood &amp; stone
            </button>
          </template>
        </template>
        <p v-else class="text-sm">
          Rewards claimed:
          {{
            story.progress.rewardChoice === 'gold'
              ? `${story.rewards.gold} gold`
              : `${story.rewards.wood} wood + ${story.rewards.stone} stone`
          }}
          + {{ story.rewards.experience }} experience{{ story.progress.bonusEarned ? ' + bonus gem' : '' }}.
        </p>
      </div>
    </article>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import ActionToasts from '@/components/ActionToasts';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { getStories, storyAction, trackQuest, trackedQuest, trackingVersion, type StoryQuest } from './stories';
const user = useCurrentUserStore();
const stories = ref<StoryQuest[]>([]),
  loading = ref(true),
  pending = ref(false),
  error = ref(''),
  message = ref('');
const selected = computed(() => {
  void trackingVersion.value;
  return trackedQuest(user.user?.id ?? 0);
});
async function load() {
  error.value = '';
  try {
    stories.value = await getStories();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not load stories';
  } finally {
    loading.value = false;
  }
}
function track(story: StoryQuest) {
  trackQuest(user.user!.id, `story:${story.code}`);
}
async function act(story: StoryQuest, action: 'accept' | 'investigate' | 'claim', choice?: string) {
  if (pending.value) return;
  pending.value = true;
  error.value = '';
  message.value = '';
  try {
    await storyAction(story.code, action, choice);
    if (action === 'accept') track(story);
    if (action === 'claim' && selected.value === `story:${story.code}`) trackQuest(user.user!.id, null);
    await user.fetchCurrentUser(true);
    await load();
    message.value =
      action === 'claim'
        ? 'Rewards collected.'
        : action === 'accept'
          ? 'Story accepted and tracked on the map.'
          : 'Location investigated. Your journal has been updated.';
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Could not update story';
  } finally {
    pending.value = false;
  }
}
onMounted(load);
</script>
