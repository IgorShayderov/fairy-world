<template>
  <main class="min-h-0 flex-1 overflow-auto bg-slate-950 p-8 text-white">
    <div class="mx-auto max-w-4xl">
      <p class="text-sm tracking-widest text-violet-300 uppercase">PayPal · USD</p>
      <h1 class="mt-3 text-3xl font-bold">{{ t('gemStore.title') }}</h1>
      <p class="mt-3 text-slate-300">{{ t('gemStore.description') }}</p>
      <p class="mt-5 text-lg text-violet-200">💎 {{ store.user?.gems ?? 0 }} {{ t('profile.summary.gems') }}</p>
      <section class="mt-8 rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-900/30 to-slate-900 p-6">
        <h2 class="text-2xl font-bold text-amber-200">✦ {{ t('gemStore.premiumTitle') }}</h2>
        <p class="mt-3 text-slate-200">{{ t('gemStore.premiumDescription') }}</p>
        <p class="mt-3 font-semibold text-amber-100">200 💎 / {{ t('gemStore.premiumMonth') }}</p>
        <p v-if="store.user?.premium?.active" class="mt-3 text-emerald-300">
          {{ t('gemStore.premiumUntil') }} {{ new Date(store.user.premium.expiresAt!).toLocaleDateString() }}
        </p>
        <button
          :disabled="buyingPremium || (store.user?.gems ?? 0) < 200"
          class="mt-5 rounded-xl bg-amber-300 px-6 py-3 font-bold text-slate-950 disabled:opacity-40"
          @click="buyPremium"
        >
          {{ t(store.user?.premium?.active ? 'gemStore.premiumExtend' : 'gemStore.premiumBuy') }}
        </button>
        <p v-if="premiumError" role="alert" class="mt-3 text-red-300">{{ t('gemStore.premiumError') }}</p>
      </section>
      <button
        v-if="isDev"
        :disabled="claiming"
        class="mt-6 rounded-xl bg-violet-500 px-6 py-3 font-bold disabled:opacity-50"
        @click="claimGems"
      >
        {{ t('gemStore.devClaim') }}
      </button>
      <p v-if="claimError" role="alert" class="mt-3 text-amber-200">{{ t('gemStore.devError') }}</p>
      <div role="status" class="mt-6 rounded-xl border border-amber-300/30 bg-amber-200/10 p-4 text-sm text-amber-100">
        {{ t('gemStore.pending') }}
      </div>
      <div class="mt-8 grid gap-5 sm:grid-cols-3">
        <section
          v-for="amount in [100, 500, 1200]"
          :key="amount"
          class="rounded-2xl border border-violet-400/30 bg-gradient-to-b from-violet-950 to-slate-900 p-6 text-center"
        >
          <div class="text-5xl" aria-hidden="true">💎</div>
          <h2 class="mt-5 text-2xl font-bold">{{ amount }} {{ t('profile.summary.gems') }}</h2>
          <p class="my-5 text-sm text-slate-400">{{ t('gemStore.pricePending') }}</p>
          <button disabled class="w-full cursor-not-allowed rounded-lg bg-white/10 px-4 py-3 text-sm text-slate-400">
            {{ t('gemStore.unavailable') }}
          </button>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { onMounted, ref } from 'vue';

import { usersApi } from '@/modules/Auth/api/users';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

const { t } = useTranslation();
const store = useCurrentUserStore();
const isDev = import.meta.env.DEV;
const claiming = ref(false);
const claimError = ref(false);
const buyingPremium = ref(false);
const premiumError = ref(false);
const buyPremium = async () => {
  if (buyingPremium.value) return;
  buyingPremium.value = true;
  premiumError.value = false;
  try {
    await usersApi.buyPremium();
    await store.fetchCurrentUser(true);
  } catch {
    premiumError.value = true;
  } finally {
    buyingPremium.value = false;
  }
};
const claimGems = async () => {
  if (claiming.value) return;
  claiming.value = true;
  claimError.value = false;
  try {
    await usersApi.claimDevGems();
    await store.fetchCurrentUser(true);
  } catch {
    claimError.value = true;
  } finally {
    claiming.value = false;
  }
};
onMounted(() => store.fetchCurrentUser());
</script>
