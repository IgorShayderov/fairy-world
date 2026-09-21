<template>
  <main class="realm-page min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
    <div class="mx-auto max-w-5xl">
      <header class="rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] p-5 shadow-xl">
        <p class="text-xs font-bold tracking-[0.24em] text-[#efca72] uppercase">{{ t('crafting.craftBook') }}</p>
        <h1 class="mt-2 font-serif text-3xl font-semibold text-[#fff0bd]">{{ t('crafting.title') }}</h1>
        <p class="mt-2 text-sm text-[#a9bfba]">{{ t('crafting.subtitle') }}</p>
      </header>

      <section class="mt-6">
        <h2 class="mb-3 font-serif text-xl font-semibold text-[#fff0bd]">{{ t('crafting.craftBook') }}</h2>
        <p v-if="!unlocked" class="rounded-xl border border-[#d8bd75]/25 bg-[#0b2530] p-5 text-sm text-[#efca72]">
          {{ t('crafting.availableAtLevel', { level: CRAFTING_MIN_LEVEL }) }}
        </p>
        <p
          v-else-if="!loading && !data?.recipes.length"
          class="rounded-xl border border-white/10 bg-[#0b2530] p-5 text-[#a9bfba]"
        >
          {{ t('crafting.noRecipes') }}
        </p>
        <div v-else class="grid items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="recipe in data?.recipes ?? []"
            :key="recipe.id"
            class="flex min-h-48 flex-col rounded-lg border border-[#d8bd75]/25 bg-[#0b2530] p-3 shadow-lg"
          >
            <div class="flex gap-3">
              <img
                :src="`/icons/items/${recipe.result.icon}`"
                alt=""
                class="h-12 w-12 shrink-0 rounded-lg bg-[#071a23] object-contain p-1"
              />
              <div class="min-w-0">
                <h3 class="font-serif text-sm leading-tight font-semibold text-[#fff0bd]">
                  {{ recipe.name.replace('Recipe: ', '') }}
                </h3>
                <p class="mt-1 line-clamp-2 min-h-8 text-[0.7rem] leading-4 text-[#a9bfba]">
                  {{ recipe.result.description }}
                </p>
              </div>
            </div>
            <div class="mt-auto pt-3">
              <h4 class="text-[0.6rem] font-bold tracking-wider text-[#efca72] uppercase">
                {{ t('crafting.ingredients') }}
              </h4>
              <div class="mt-1.5 flex min-h-7 flex-wrap content-start gap-1">
                <span
                  v-for="ingredient in recipe.ingredients"
                  :key="ingredient.id"
                  class="rounded-md border px-1.5 py-1 text-[0.65rem] leading-none"
                  :class="
                    ingredient.owned >= ingredient.quantity
                      ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
                      : 'border-red-500/40 bg-red-950/40 text-red-200'
                  "
                >
                  {{ ingredient.name }} {{ ingredient.owned }}/{{ ingredient.quantity }}
                </span>
              </div>
            </div>
            <button
              type="button"
              class="mt-2 self-start rounded-md bg-[#c5963e] px-3 py-1.5 text-[0.7rem] font-bold text-[#081820] transition hover:bg-[#e1bb65] disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="busy || !canCraft(recipe)"
              @click="craftRecipe(recipe)"
            >
              {{ t('crafting.craft') }}
            </button>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';
import { useQuasar } from 'quasar';
import { computed, onMounted, ref } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { CRAFTING_MIN_LEVEL, craftingApi, type CraftingData, type CraftRecipe } from '@/modules/Crafting/api';

const { t } = useTranslation();
const $q = useQuasar();
const currentUserStore = useCurrentUserStore();
const data = ref<CraftingData | null>(null);
const loading = ref(true);
const busy = ref(false);
const unlocked = computed(() => (currentUserStore.user?.level ?? 1) >= CRAFTING_MIN_LEVEL);
const load = async () => {
  loading.value = true;
  try {
    data.value = await craftingApi.get();
  } finally {
    loading.value = false;
  }
};
const canCraft = (recipe: CraftRecipe) => recipe.ingredients.every(({ owned, quantity }) => owned >= quantity);
const craftRecipe = async (recipe: CraftRecipe) => {
  busy.value = true;
  try {
    await craftingApi.craft(recipe.id);
    $q.notify({ type: 'positive', message: t('crafting.crafted', { name: recipe.result.name }) });
    await Promise.all([load(), currentUserStore.fetchCurrentUser(true)]);
  } catch {
    $q.notify({ type: 'negative', message: t('crafting.error') });
  } finally {
    busy.value = false;
  }
};
onMounted(async () => {
  await currentUserStore.fetchCurrentUser();
  if (unlocked.value) await load();
  else loading.value = false;
});
</script>
