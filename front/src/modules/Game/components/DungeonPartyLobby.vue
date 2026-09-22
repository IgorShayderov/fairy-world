<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-[#06141d]/85 p-4 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <section
      class="relative w-full max-w-2xl rounded-2xl border border-[#d8bd75]/45 bg-[#102831] p-6 text-[#d6e1de] shadow-2xl"
    >
      <button
        type="button"
        class="absolute top-6 right-6 flex items-center gap-2 rounded-lg border border-[#d8bd75]/35 bg-[#0b2029] px-3 py-2 text-sm text-[#fff0bd] transition hover:border-[#d8bd75]/65 hover:bg-[#163641]"
        @click="$emit('close')"
      >
        <span aria-hidden="true">←</span>
        {{ t('fantasy.party.back') }}
      </button>
      <div class="pr-24">
        <div>
          <p class="text-xs font-bold tracking-[0.2em] text-[#efca72] uppercase">{{ t('fantasy.party.eyebrow') }}</p>
          <h2 class="mt-1 font-serif text-3xl text-[#fff0bd]">{{ dungeon }}</h2>
          <p class="mt-2 text-sm text-[#a9bfba]">{{ t('fantasy.party.description') }}</p>
        </div>
      </div>

      <p v-if="error" class="mt-4 rounded-lg border border-red-400/30 bg-red-950/35 p-3 text-sm text-red-200">
        {{ error }}
      </p>

      <section v-if="lobby.currentParty" class="mt-5 rounded-xl border border-[#46636d] bg-[#0b2029] p-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="font-semibold text-[#fff0bd]">{{ t('fantasy.party.yourParty') }}</h3>
          <span class="text-xs text-[#a9bfba]">{{ lobby.currentParty.members.length }} / 3</span>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-3">
          <div v-for="member in lobby.currentParty.members" :key="member.profileId" class="rounded-lg bg-[#13313c] p-3">
            <div class="font-semibold">{{ member.name }}</div>
            <div class="text-xs text-[#a9bfba]">
              {{ t('fantasy.encounter.level', { level: member.level }) }}
              <span v-if="member.leader" class="ml-1 text-[#efca72]">· {{ t('fantasy.party.leader') }}</span>
            </div>
          </div>
          <div
            v-for="slot in 3 - lobby.currentParty.members.length"
            :key="`empty-${slot}`"
            class="rounded-lg border border-dashed border-[#46636d] p-3 text-sm text-[#78918d]"
          >
            {{ t('fantasy.party.waiting') }}
          </div>
        </div>
        <div class="mt-4 flex flex-wrap justify-end gap-3">
          <button
            class="rounded-lg border border-red-400/40 px-4 py-2 text-sm text-red-200 disabled:opacity-40"
            :disabled="busy"
            @click="leave"
          >
            {{ t('fantasy.party.leave') }}
          </button>
          <button
            v-if="lobby.currentParty.isLeader"
            class="rounded-lg bg-[#dfc16d] px-4 py-2 text-sm font-bold text-[#102831] disabled:opacity-40"
            :disabled="busy || lobby.currentParty.members.length < 2"
            @click="start"
          >
            {{ lobby.currentParty.members.length < 2 ? t('fantasy.party.needPlayer') : t('fantasy.party.start') }}
          </button>
        </div>
      </section>

      <template v-else>
        <div class="mt-5 flex justify-end">
          <button
            class="rounded-lg bg-[#dfc16d] px-4 py-2 text-sm font-bold text-[#102831] disabled:opacity-40"
            :disabled="busy"
            @click="create"
          >
            {{ t('fantasy.party.create') }}
          </button>
        </div>
        <section class="mt-5">
          <h3 class="text-xs font-bold tracking-[0.16em] text-[#efca72] uppercase">
            {{ t('fantasy.party.openParties') }}
          </h3>
          <div v-if="joinableParties.length" class="mt-3 space-y-2">
            <div
              v-for="party in joinableParties"
              :key="party.id"
              class="flex items-center gap-3 rounded-xl border border-[#35515b] bg-[#0b2029] p-3"
            >
              <div class="mr-auto">
                <div class="font-semibold text-[#fff0bd]">{{ party.members[0]?.name }}</div>
                <div class="text-xs text-[#a9bfba]">
                  {{ party.members.length }} / 3 {{ t('fantasy.party.players') }}
                </div>
              </div>
              <button
                class="rounded-lg border border-[#d8bd75]/50 px-4 py-2 text-sm text-[#fff0bd] disabled:opacity-40"
                :disabled="busy"
                @click="join(party.id)"
              >
                {{ t('fantasy.party.join') }}
              </button>
            </div>
          </div>
          <p v-else class="mt-3 text-sm text-[#8ea7a2]">{{ t('fantasy.party.noParties') }}</p>
        </section>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  createDungeonParty,
  getActiveDungeon,
  getDungeonParties,
  joinDungeonParty,
  leaveDungeonParty,
  startDungeonParty,
  type DungeonPartyLobby,
  type DungeonRunState,
} from '@/modules/Monsters/api';

const props = defineProps<{ dungeon: string }>();
const emit = defineEmits<{ (event: 'close'): void; (event: 'start', run: DungeonRunState): void }>();
const { t } = useTranslation();
const lobby = ref<DungeonPartyLobby>({ currentParty: null, openParties: [] });
const busy = ref(false);
const error = ref('');
let timer: ReturnType<typeof setInterval> | undefined;
const joinableParties = computed(() =>
  lobby.value.openParties.filter((party) => party.id !== lobby.value.currentParty?.id)
);

const refresh = async () => {
  try {
    lobby.value = await getDungeonParties(props.dungeon);
    if (lobby.value.currentParty?.status === 'ACTIVE') {
      const run = await getActiveDungeon();
      if (run) emit('start', run);
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : t('fantasy.party.error');
  }
};
const perform = async (action: () => Promise<unknown>) => {
  busy.value = true;
  error.value = '';
  try {
    await action();
    await refresh();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : t('fantasy.party.error');
  } finally {
    busy.value = false;
  }
};
const create = () => perform(() => createDungeonParty(props.dungeon));
const join = (partyId: string) => perform(() => joinDungeonParty(partyId));
const leave = () => lobby.value.currentParty && perform(() => leaveDungeonParty(lobby.value.currentParty!.id));
const start = async () => {
  if (!lobby.value.currentParty) return;
  busy.value = true;
  error.value = '';
  try {
    emit('start', await startDungeonParty(lobby.value.currentParty.id));
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : t('fantasy.party.error');
  } finally {
    busy.value = false;
  }
};
onMounted(() => {
  void refresh();
  timer = setInterval(() => void refresh(), 2000);
});
onUnmounted(() => timer && clearInterval(timer));
</script>
