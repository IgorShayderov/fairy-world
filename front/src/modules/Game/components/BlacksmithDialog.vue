<template>
  <QDialog :model-value="true" :persistent="pending" @update:model-value="!$event && emit('close')">
    <div class="forge-panel">
      <header>
        <QIcon name="hardware" size="32px" />
        <h2>{{ t('blacksmith.title') }}</h2>
        <button :disabled="pending" :aria-label="t('blacksmith.close')" @click="emit('close')">×</button>
      </header>
      <p>{{ t('blacksmith.description') }}</p>
      <p v-if="offer" class="forge-gold">
        {{ t('blacksmith.price', { cost: offer.cost, gemCost: offer.gemCost, gold: offer.gold, gems: offer.gems }) }}
      </p>
      <p v-if="message" role="status">{{ message }}</p>
      <p v-if="error" role="alert" class="forge-error">{{ error }}</p>
      <button v-if="!offer && !pending" class="forge-action" @click="load">{{ t('blacksmith.retry') }}</button>
      <p v-if="pending && !offer">{{ t('shop.loading') }}</p>
      <p v-if="offer && !offer.items.length">{{ t('blacksmith.empty') }}</p>
      <article v-for="item in offer?.items ?? []" :key="item.id" class="forge-item">
        <div>
          <strong>{{ item.name }}</strong
          ><small
            >{{ item.rarity }} · {{ t('blacksmith.level', { level: item.level })
            }}<span v-if="item.equipped"> · {{ t('blacksmith.equipped') }}</span></small
          >
          <p class="forge-bonus">
            +{{ item.upgradeValue }}{{ ['GOLD', 'EXPERIENCE'].includes(item.upgradeType) ? '%' : '' }}
            {{ t(`blacksmith.bonuses.${item.upgradeType}`) }}
          </p>
        </div>
        <button class="forge-action" :disabled="pending || !canAfford" @click="selected = item.id">
          {{ t('blacksmith.removeWithCost', { cost: offer!.cost, gemCost: offer!.gemCost }) }}
        </button>
      </article>
      <div
        v-if="selected !== null && offer"
        class="forge-confirm"
        role="alertdialog"
        :aria-label="t('blacksmith.confirmTitle')"
      >
        <strong>{{ t('blacksmith.confirmTitle') }}</strong>
        <p>
          {{
            t('blacksmith.warning', {
              name: offer.items.find((item) => item.id === selected)?.name,
              cost: offer.cost,
              gemCost: offer.gemCost,
            })
          }}
        </p>
        <div>
          <button :disabled="pending" @click="selected = null">{{ t('blacksmith.cancel') }}</button>
          <button class="forge-action" :disabled="pending || !canAfford" @click="remove">
            {{ t('blacksmith.confirm', { cost: offer.cost, gemCost: offer.gemCost }) }}
          </button>
        </div>
      </div>
    </div>
  </QDialog>
</template>
<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QDialog, QIcon } from 'quasar';
import { computed, onMounted, ref } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { getBlacksmithOffer, removeItemBonus, type BlacksmithOffer } from '@/modules/Locations/api';

const emit = defineEmits<{ close: [] }>();
const { t } = useTranslation();
const user = useCurrentUserStore();
const offer = ref<BlacksmithOffer | null>(null);
const canAfford = computed(
  () => !!offer.value && offer.value.gold >= offer.value.cost && offer.value.gems >= offer.value.gemCost
);
const pending = ref(false),
  error = ref(''),
  message = ref('');
const selected = ref<number | null>(null);
async function load() {
  pending.value = true;
  error.value = '';
  try {
    offer.value = await getBlacksmithOffer();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : t('blacksmith.failed');
  } finally {
    pending.value = false;
  }
}
async function remove() {
  if (pending.value || selected.value === null || !offer.value || !canAfford.value) return;
  pending.value = true;
  error.value = '';
  message.value = '';
  try {
    await removeItemBonus(selected.value, offer.value.cost, offer.value.gemCost);
    selected.value = null;
    message.value = t('blacksmith.done');
    await user.fetchCurrentUser(true);
    offer.value = await getBlacksmithOffer();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : t('blacksmith.failed');
  } finally {
    pending.value = false;
  }
}
onMounted(load);
</script>
<style scoped>
.forge-panel {
  width: min(640px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  padding: 24px;
  background: #102831;
  border: 1px solid #d5a765;
  border-radius: 18px;
  color: #d6e1de;
}
header {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffe1a1;
}
header h2 {
  font:
    28px Georgia,
    serif;
  flex: 1;
  margin: 0;
}
header button {
  font-size: 26px;
}
p {
  margin: 12px 0;
}
.forge-gold,
.forge-bonus {
  color: #efca72;
}
.forge-error {
  color: #ff9c8e;
}
.forge-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid #38525b;
}
.forge-item small {
  display: block;
  margin-top: 6px;
  color: #a8bec3;
}
.forge-action {
  border: 1px solid #d8bd75;
  border-radius: 8px;
  padding: 10px 16px;
  color: #ffe4a4;
}
.forge-item .forge-action {
  flex-shrink: 0;
}
@media (max-width: 520px) {
  .forge-item {
    align-items: stretch;
    flex-direction: column;
  }
}
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.forge-confirm {
  margin-top: 16px;
  border: 1px solid #b87b55;
  padding: 18px;
  border-radius: 12px;
  background: #302a24;
}
.forge-confirm > div {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
}
</style>
