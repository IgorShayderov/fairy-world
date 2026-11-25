<template>
  <QDialog :model-value="guide.open" persistent @show="heading?.focus()">
    <div
      class="onboarding-guide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-body"
      :aria-busy="guide.pending"
    >
      <header class="onboarding-header">
        <span>{{ copy.title }}</span>
        <button type="button" :disabled="guide.pending" @click="guide.finish()">{{ copy.skip }}</button>
      </header>
      <div class="onboarding-host">
        <div class="onboarding-portrait" role="img" :aria-label="host.name" :style="portraitStyle" />
        <div>
          <strong>{{ host.name }}</strong>
          <p>{{ copy.subtitle }}</p>
        </div>
      </div>
      <div class="onboarding-content" :key="guide.step">
        <div class="onboarding-step-icon" aria-hidden="true"><QIcon :name="icons[guide.step]" size="30px" /></div>
        <p class="onboarding-counter">{{ progress }}</p>
        <h2 id="onboarding-title" ref="heading" tabindex="-1">{{ entry.title }}</h2>
        <p id="onboarding-body">{{ entry.body }}</p>
        <p class="onboarding-tip">{{ entry.tip }}</p>
      </div>
      <div
        class="onboarding-progress"
        role="progressbar"
        :aria-label="copy.title"
        :aria-valuenow="guide.step + 1"
        :aria-valuemin="0"
        :aria-valuemax="6"
      >
        <span v-for="index in 6" :key="index" :class="{ reached: index <= guide.step + 1 }" />
      </div>
      <div v-if="guide.failed" class="onboarding-error">
        <p role="alert">{{ copy.error }}</p>
        <button type="button" @click="guide.dismissForSession()">{{ copy.closeWithoutSaving }}</button>
      </div>
      <footer class="onboarding-actions">
        <button v-if="guide.step > 0" type="button" :disabled="guide.pending" @click="guide.back()">
          {{ copy.back }}
        </button>
        <button type="button" class="onboarding-primary" :disabled="guide.pending" @click="advance">
          {{ guide.pending ? copy.saving : guide.step === 5 ? copy.finish : copy.next }}
        </button>
      </footer>
    </div>
  </QDialog>
</template>
<script setup lang="ts">
import {
  matExplore,
  matMap,
  matBackpack,
  matAutoAwesome,
  matShield,
  matAssignment,
} from '@quasar/extras/material-icons';
import { useTranslation } from 'i18next-vue';
import { QDialog, QIcon } from 'quasar';
import { computed, nextTick, ref, watch } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { characterFor } from '@/modules/Towns/characters';

import { onboardingCopy } from './content';
import { useOnboardingStore } from './store';

const guide = useOnboardingStore();
const user = useCurrentUserStore();
const { i18next } = useTranslation();
const copy = computed(() => onboardingCopy[i18next.language.startsWith('ru') ? 'ru' : 'en']);
const entry = computed(() => copy.value.steps[guide.step]!);
const progress = computed(() => copy.value.progress.replace('{step}', String(guide.step + 1)).replace('{total}', '6'));
const host = computed(() => characterFor('quests', undefined, user.user?.mapPosition));
const portraitStyle = computed(() => ({ backgroundPosition: `100% ${(host.value.row / 6) * 100}%` }));
const icons = [matExplore, matMap, matBackpack, matAutoAwesome, matShield, matAssignment];
const heading = ref<HTMLElement>();
watch(
  () => guide.step,
  async () => {
    await nextTick();
    heading.value?.focus();
  }
);
function advance() {
  if (guide.step === 5) void guide.finish();
  else void guide.next();
}
</script>
<style scoped>
.onboarding-guide {
  width: 560px;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #bca26988;
  border-radius: 20px;
  background: linear-gradient(135deg, #1c4148, #0b202b 75%);
  color: #d8e6e3;
  box-shadow: 0 24px 80px #0007;
  scrollbar-color: #52747a #0b202b;
}
.onboarding-header {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.onboarding-header > span {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #a9c3c5;
}
.onboarding-guide button {
  padding: 9px 14px;
  border: 1px solid #bca26988;
  border-radius: 8px;
  color: #f2d897;
  background: #12313a;
  font-size: 13px;
  cursor: pointer;
}
.onboarding-guide button:hover:not(:disabled) {
  background: #254b52;
  border-color: #f2d897;
}
.onboarding-guide button:focus-visible {
  outline: 2px solid #f2d897;
  outline-offset: 3px;
}
.onboarding-guide button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.onboarding-host {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid #bca26944;
}
.onboarding-portrait {
  flex: 0 0 64px;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background-image: url('/images/towns/characters.png');
  background-size: 400% 700%;
  box-shadow: 0 0 0 1px #e9cd8566;
}
.onboarding-host strong {
  font:
    600 20px/1.3 Georgia,
    serif;
  color: #f2d897;
}
.onboarding-host p {
  margin: 4px 0 0;
  color: #a9c3c5;
  font-size: 13px;
}
.onboarding-content {
  padding-top: 20px;
}
.onboarding-step-icon {
  float: right;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #244951;
  color: #f2d897;
  margin-left: 12px;
}
.onboarding-counter {
  margin: 0 0 8px;
  color: #8fd1be;
  font-size: 12px;
}
.onboarding-content h2 {
  margin: 0 0 16px;
  font:
    600 28px/1.2 Georgia,
    serif;
  color: #f2d897;
}
.onboarding-content h2:focus {
  outline: none;
}
#onboarding-body {
  font-size: 15px;
  line-height: 1.7;
  margin: 0 0 20px;
}
.onboarding-tip {
  padding: 12px 16px;
  border-left: 2px solid #cfb56e;
  border-radius: 0 8px 8px 0;
  background: #081d27;
  color: #bdd5d3;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
.onboarding-progress {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 24px 0;
}
.onboarding-progress span {
  height: 4px;
  flex: 1;
  border-radius: 8px;
  background: #35535b;
}
.onboarding-progress .reached {
  background: #dfc16d;
}
.onboarding-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}
.onboarding-guide .onboarding-primary {
  margin-left: auto;
  background: #dfc16d;
  border-color: #dfc16d;
  color: #102b34;
  font-weight: 600;
  min-width: 130px;
}
.onboarding-guide .onboarding-primary:hover:not(:disabled) {
  background: #f2d897;
}
.onboarding-error {
  color: #ffc2b2;
  font-size: 13px;
  margin: 0 0 16px;
}
@media (max-width: 480px) {
  .onboarding-guide {
    padding: 18px;
  }
  .onboarding-content h2 {
    font-size: 24px;
  }
  .onboarding-host strong {
    font-size: 18px;
  }
}
</style>
