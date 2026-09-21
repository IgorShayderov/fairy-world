<template>
  <main class="realm-page min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
    <div class="mx-auto max-w-6xl">
      <header class="rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] p-6 shadow-xl">
        <p class="text-xs font-bold tracking-[0.24em] text-[#efca72] uppercase">{{ t('crafting.craftBook') }}</p>
        <h1 class="mt-2 font-serif text-3xl font-semibold text-[#fff0bd]">{{ t('crafting.title') }}</h1>
        <p class="mt-2 text-sm text-[#a9bfba]">{{ t('crafting.subtitle') }}</p>
      </header>

      <section class="mt-6">
        <h2 class="mb-3 font-serif text-xl font-semibold text-[#fff0bd]">{{ t('crafting.craftBook') }}</h2>
        <p
          v-if="!loading && !data?.recipes.length"
          class="rounded-xl border border-white/10 bg-[#0b2530] p-5 text-[#a9bfba]"
        >
          {{ t('crafting.noRecipes') }}
        </p>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="recipe in data?.recipes ?? []"
            :key="recipe.id"
            class="rounded-lg border border-[#d8bd75]/25 bg-[#0b2530] p-3.5 shadow-lg"
          >
            <div class="flex gap-3">
              <img
                :src="`/icons/items/${recipe.result.icon}`"
                alt=""
                class="h-14 w-14 shrink-0 rounded-lg bg-[#071a23] object-contain p-1.5"
              />
              <div class="min-w-0">
                <h3 class="font-serif text-base leading-tight font-semibold text-[#fff0bd]">
                  {{ recipe.name.replace('Recipe: ', '') }}
                </h3>
                <p class="mt-1 text-xs leading-snug text-[#a9bfba]">{{ recipe.result.description }}</p>
              </div>
            </div>
            <h4 class="mt-3 text-[0.65rem] font-bold tracking-wider text-[#efca72] uppercase">
              {{ t('crafting.ingredients') }}
            </h4>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <span
                v-for="ingredient in recipe.ingredients"
                :key="ingredient.id"
                class="rounded-md border px-2 py-1 text-[0.7rem] leading-none"
                :class="
                  ingredient.owned >= ingredient.quantity
                    ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
                    : 'border-red-500/40 bg-red-950/40 text-red-200'
                "
              >
                {{ ingredient.name }} {{ ingredient.owned }}/{{ ingredient.quantity }}
              </span>
            </div>
            <button
              type="button"
              class="mt-3 rounded-md bg-[#c5963e] px-3 py-1.5 text-xs font-bold text-[#081820] transition hover:bg-[#e1bb65] disabled:cursor-not-allowed disabled:opacity-40"
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
import { onMounted, ref } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import { craftingApi, type CraftingData, type CraftRecipe } from '@/modules/Crafting/api';

const { t } = useTranslation();
const $q = useQuasar();
const currentUserStore = useCurrentUserStore();
const data = ref<CraftingData | null>(null);
const loading = ref(true);
const busy = ref(false);
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
onMounted(load);
</script>
