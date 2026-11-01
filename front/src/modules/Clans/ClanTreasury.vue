<template>
  <section class="treasury-panel" :aria-label="t('clans.treasury')">
    <h2>{{ t('clans.treasury') }}</h2>
    <p class="treasury-balances">{{ t('clans.treasuryBalance', clan.treasury) }}</p>
    <p>{{ t('clans.treasuryWarning') }}</p>
    <p>{{ t('clans.walletBalance', { gold: clan.viewerGold, gems: clan.viewerGems }) }}</p>
    <form class="treasury-form" @submit.prevent="confirming = true">
      <label
        >{{ t('clans.depositGold') }}
        <input v-model.number="gold" type="number" min="0" :max="clan.viewerGold" step="1" required :disabled="busy" />
      </label>
      <label
        >{{ t('clans.depositGems') }}
        <input v-model.number="gems" type="number" min="0" :max="clan.viewerGems" step="1" required :disabled="busy" />
      </label>
      <button class="primary-button" :disabled="busy || !valid">{{ t('clans.deposit') }}</button>
    </form>
    <QDialog v-model="confirming">
      <div class="treasury-panel treasury-confirm" role="alertdialog" :aria-label="t('clans.confirmDeposit')">
        <h2>{{ t('clans.confirmDeposit') }}</h2>
        <p>{{ t('clans.depositAmount', { gold, gems }) }}</p>
        <p>{{ t('clans.treasuryWarning') }}</p>
        <div class="treasury-form">
          <button class="quiet-button" @click="confirming = false">{{ t('clans.cancel') }}</button>
          <button class="primary-button" :disabled="busy || !valid" @click="deposit">
            {{ t('clans.confirmDeposit') }}
          </button>
        </div>
      </div>
    </QDialog>
  </section>
</template>
<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QDialog } from 'quasar';
import { computed, ref, watch } from 'vue';

import type { Clan } from './api';
const props = defineProps<{ clan: Clan; busy: boolean }>();
const emit = defineEmits<{ deposit: [gold: number, gems: number] }>();
const { t } = useTranslation();
const gold = ref(0),
  gems = ref(0),
  confirming = ref(false);
const valid = computed(
  () =>
    [gold.value, gems.value].every((n) => Number.isInteger(n) && n >= 0 && n <= 2147483647) &&
    gold.value + gems.value > 0 &&
    gold.value <= props.clan.viewerGold &&
    gems.value <= props.clan.viewerGems
);
function deposit() {
  if (!valid.value || props.busy) return;
  confirming.value = false;
  emit('deposit', gold.value, gems.value);
}
watch(
  () => props.clan,
  () => {
    gold.value = 0;
    gems.value = 0;
  }
);
</script>
<style scoped>
.treasury-panel {
  padding: 24px;
  border: 1px solid #d8bd7540;
  border-radius: 16px;
  background: #0b2530;
  color: #a9bfba;
  margin-bottom: 20px;
}
h2 {
  font:
    24px Georgia,
    serif;
  color: #fff0bd;
  margin: 0 0 12px;
}
p {
  margin: 8px 0;
}
.treasury-balances {
  color: #efca72;
  font-size: 20px;
  font-weight: bold;
}
.treasury-form {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 16px;
  margin-top: 20px;
}
label {
  flex: 1 1 160px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
input {
  min-width: 0;
  width: 100%;
  padding: 10px;
  background: #071a23;
  color: #fff0bd;
  border: 1px solid #42616a;
  border-radius: 8px;
}
.treasury-confirm {
  width: min(520px, calc(100vw - 32px));
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.primary-button,
.quiet-button {
  padding: 10px 16px;
  border: 1px solid #d8bd7560;
  border-radius: 8px;
  font-weight: 600;
}
.primary-button {
  background: #dfbd69;
  color: #071a23;
}
.quiet-button {
  background: #071a23;
  color: #efca72;
}
</style>
