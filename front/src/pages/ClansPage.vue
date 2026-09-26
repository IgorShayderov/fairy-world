<template>
  <main class="realm-page min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
    <div class="mx-auto max-w-6xl">
      <header class="clan-header relative overflow-hidden rounded-2xl border border-[#d8bd75]/30 p-6 shadow-xl sm:p-8">
        <div class="relative z-10 flex items-center gap-5">
          <ClanBanner :code="clan?.activeBannerCode ?? null" size="large" />
          <div>
            <p class="text-xs font-bold tracking-[0.24em] text-[#efca72] uppercase">{{ t('clans.eyebrow') }}</p>
            <h1 class="mt-1 font-serif text-3xl font-semibold text-[#fff0bd] sm:text-4xl">
              {{ clan ? `[${clan.tag}] ${clan.name}` : t('clans.title') }}
            </h1>
            <p class="mt-2 max-w-2xl text-sm text-[#a9bfba]">
              {{ clan?.description || t('clans.subtitle') }}
            </p>
          </div>
        </div>
      </header>

      <div v-if="loading" class="flex justify-center py-20 text-[#efca72]">
        <QIcon name="hourglass_empty" size="34px" class="animate-spin" />
      </div>

      <section v-else-if="!eligible" class="mt-7 rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] p-8 text-center">
        <QIcon name="lock" size="46px" class="text-[#efca72]" />
        <h2 class="mt-4 font-serif text-2xl text-[#fff0bd]">{{ t('clans.lockedTitle', { level: minLevel }) }}</h2>
        <p class="mt-2 text-[#a9bfba]">{{ t('clans.lockedText', { level: minLevel }) }}</p>
      </section>

      <template v-else-if="clan">
        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <div class="summary-card">
            <QIcon name="groups" size="24px" />
            <div>
              <span>{{ t('clans.members') }}</span
              ><strong>{{ clan.memberCount }} / {{ clan.maxMembers }}</strong>
            </div>
          </div>
          <div class="summary-card">
            <QIcon name="local_fire_department" size="24px" />
            <div>
              <span>{{ t('clans.activityAvailable') }}</span
              ><strong>{{ clan.activityPoints }}</strong>
            </div>
          </div>
          <div class="summary-card">
            <QIcon name="military_tech" size="24px" />
            <div>
              <span>{{ t('clans.role.' + clan.viewerRole) }}</span
              ><strong>{{ clan.tag }}</strong>
            </div>
          </div>
        </div>

        <nav class="mt-6 flex gap-2 rounded-xl border border-[#d8bd75]/20 bg-[#071a23] p-1.5">
          <button class="tab-button" :class="{ active: activeTab === 'hall' }" @click="activeTab = 'hall'">
            <QIcon name="groups" size="18px" />{{ t('clans.hall') }}
          </button>
          <button class="tab-button" :class="{ active: activeTab === 'shop' }" @click="openShop">
            <QIcon name="flag" size="18px" />{{ t('clans.shop') }}
          </button>
        </nav>

        <section v-if="activeTab === 'hall'" class="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div class="rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] p-5 shadow-lg">
            <h2 class="font-serif text-2xl text-[#fff0bd]">{{ t('clans.members') }}</h2>
            <div class="mt-4 space-y-2">
              <article v-for="member in clan.members" :key="member.profileId" class="member-row">
                <div class="member-rank" :class="`member-rank--${member.role.toLowerCase()}`">
                  <QIcon :name="roleIcon(member.role)" size="20px" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="truncate text-white">{{ member.name }}</strong>
                    <span class="role-chip">{{ t('clans.role.' + member.role) }}</span>
                    <span class="text-xs text-[#7e9a9b]">Lvl {{ member.level }}</span>
                  </div>
                  <div class="mt-1 text-xs text-[#7e9a9b]">
                    {{ t('clans.joined', { date: formatDate(member.joinedAt) }) }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-[10px] font-bold tracking-wider text-[#7e9a9b] uppercase">
                    {{ t('clans.contribution') }}
                  </div>
                  <div class="font-bold text-[#efca72]">{{ member.contributedActivity }}</div>
                </div>
                <div v-if="canManageMember(member)" class="flex gap-1">
                  <template v-if="pendingRemoveId === member.profileId">
                    <button
                      class="icon-action icon-action--danger"
                      :title="t('clans.remove')"
                      @click="removeMember(member)"
                    >
                      <QIcon name="check" size="18px" />
                    </button>
                    <button class="icon-action" :title="t('clans.cancel')" @click="pendingRemoveId = null">
                      <QIcon name="close" size="18px" />
                    </button>
                  </template>
                  <button
                    v-else
                    class="icon-action"
                    :title="member.role === 'MEMBER' ? t('clans.promote') : t('clans.demote')"
                    @click="toggleRole(member)"
                  >
                    <QIcon :name="member.role === 'MEMBER' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" size="20px" />
                  </button>
                  <button
                    v-if="pendingRemoveId !== member.profileId"
                    class="icon-action icon-action--danger"
                    :title="t('clans.remove')"
                    @click="pendingRemoveId = member.profileId"
                  >
                    <QIcon name="person_remove" size="18px" />
                  </button>
                </div>
              </article>
            </div>
          </div>

          <aside class="space-y-5">
            <div class="rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] p-5">
              <h3 class="font-serif text-xl text-[#fff0bd]">{{ t('clans.activityGuide') }}</h3>
              <div class="mt-4 grid gap-2 text-sm text-[#c6d4d1]">
                <div class="activity-line">
                  <QIcon name="pets" />{{ t('clans.perKill', { value: clan.activityRewards.monsterKill }) }}
                </div>
                <div class="activity-line">
                  <QIcon name="assignment_turned_in" />{{ t('clans.perQuest', { value: clan.activityRewards.quest }) }}
                </div>
                <div class="activity-line">
                  <QIcon name="shield" />{{ t('clans.perPvp', { value: clan.activityRewards.pvpVictory }) }}
                </div>
                <div class="activity-line">
                  <QIcon name="fort" />{{ t('clans.perDungeon', { value: clan.activityRewards.dungeon }) }}
                </div>
              </div>
              <p class="mt-4 text-xs leading-5 text-[#7e9a9b]">{{ t('clans.activityHint') }}</p>
            </div>

            <div class="rounded-2xl border border-rose-400/20 bg-[#17181f] p-4">
              <p v-if="clan.viewerRole === 'LEADER' && clan.memberCount > 1" class="mb-3 text-xs text-rose-200/70">
                {{ t('clans.leaderWarning') }}
              </p>
              <div v-if="leaveArmed" class="flex gap-2">
                <button class="danger-button flex-1" @click="leaveClan">{{ t('clans.confirmLeave') }}</button>
                <button class="quiet-button" @click="leaveArmed = false">{{ t('clans.cancel') }}</button>
              </div>
              <button v-else class="danger-button w-full" @click="leaveArmed = true">{{ t('clans.leave') }}</button>
            </div>
          </aside>
        </section>

        <section v-else class="mt-5 rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] p-5 shadow-lg sm:p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="font-serif text-2xl text-[#fff0bd]">{{ t('clans.shop') }}</h2>
              <p class="mt-1 max-w-2xl text-sm text-[#a9bfba]">{{ t('clans.bannerShopText') }}</p>
            </div>
            <div class="rounded-xl border border-[#efca72]/25 bg-[#071a23] px-4 py-2 text-right">
              <span class="block text-[10px] font-bold tracking-wider text-[#7e9a9b] uppercase">{{
                t('clans.activityAvailable')
              }}</span>
              <strong class="text-xl text-[#efca72]">{{ shop?.activityPoints ?? clan.activityPoints }}</strong>
            </div>
          </div>
          <p
            v-if="shop && !shop.canManage"
            class="mt-4 rounded-xl border border-amber-300/20 bg-amber-950/20 p-3 text-sm text-amber-100/80"
          >
            {{ t('clans.officersOnly') }}
          </p>
          <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article v-for="banner in shop?.banners ?? []" :key="banner.code" class="banner-card">
              <ClanBanner :code="banner.code" :catalog="shop?.banners ?? []" size="medium" />
              <div class="min-w-0 flex-1">
                <h3 class="font-serif text-lg font-semibold text-[#fff0bd]">{{ banner.name }}</h3>
                <p class="mt-1 min-h-12 text-xs leading-5 text-[#a9bfba]">{{ banner.description }}</p>
                <button
                  class="banner-action mt-3 w-full"
                  :disabled="
                    !shop?.canManage ||
                    shop.activeBannerCode === banner.code ||
                    (!banner.unlocked && (shop?.activityPoints ?? 0) < banner.cost) ||
                    actionBusy
                  "
                  @click="banner.unlocked ? equipBanner(banner) : buyBanner(banner)"
                >
                  <QIcon
                    :name="
                      shop?.activeBannerCode === banner.code ? 'check_circle' : banner.unlocked ? 'flag' : 'lock_open'
                    "
                    size="17px"
                  />
                  {{
                    shop?.activeBannerCode === banner.code
                      ? t('clans.equipped')
                      : banner.unlocked
                        ? t('clans.equip')
                        : t('clans.buy', { cost: banner.cost })
                  }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="mt-6 grid gap-5 lg:grid-cols-[360px_1fr]">
          <form class="rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] p-5 shadow-lg" @submit.prevent="createClan">
            <h2 class="font-serif text-2xl text-[#fff0bd]">{{ t('clans.createTitle') }}</h2>
            <p class="mt-1 text-sm text-[#a9bfba]">{{ t('clans.createText') }}</p>
            <label class="field-label"
              ><span>{{ t('clans.name') }}</span
              ><input v-model="form.name" minlength="3" maxlength="24" required
            /></label>
            <label class="field-label"
              ><span>{{ t('clans.tag') }}</span
              ><input v-model="form.tag" minlength="2" maxlength="5" pattern="[A-Za-z0-9]+" required class="uppercase"
            /></label>
            <label class="field-label"
              ><span>{{ t('clans.description') }}</span
              ><textarea v-model="form.description" maxlength="160" rows="3" />
            </label>
            <button class="primary-button mt-5 w-full" :disabled="actionBusy">
              <QIcon name="add" size="18px" />{{ t('clans.create') }}
            </button>
          </form>

          <div class="rounded-2xl border border-[#d8bd75]/25 bg-[#0b2530] p-5 shadow-lg">
            <div class="flex items-center justify-between">
              <h2 class="font-serif text-2xl text-[#fff0bd]">{{ t('clans.browse') }}</h2>
              <QIcon name="travel_explore" size="25px" class="text-[#efca72]" />
            </div>
            <p v-if="!clanList.length" class="mt-8 text-center text-sm text-[#7e9a9b]">{{ t('clans.noClans') }}</p>
            <div v-else class="mt-4 space-y-3">
              <article v-for="entry in clanList" :key="entry.id" class="registry-row">
                <ClanBanner :code="entry.activeBannerCode" size="small" />
                <div class="min-w-0 flex-1">
                  <h3 class="truncate font-serif text-lg text-white">[{{ entry.tag }}] {{ entry.name }}</h3>
                  <p class="truncate text-xs text-[#7e9a9b]">{{ entry.description }}</p>
                </div>
                <div class="hidden text-right text-xs text-[#a9bfba] sm:block">
                  <div><QIcon name="groups" size="14px" /> {{ entry.memberCount }} / {{ maxMembers }}</div>
                  <div><QIcon name="local_fire_department" size="14px" /> {{ entry.activityPoints }}</div>
                </div>
                <button
                  class="quiet-button"
                  :disabled="entry.memberCount >= maxMembers || actionBusy"
                  @click="joinClan(entry)"
                >
                  {{ t('clans.join') }}
                </button>
              </article>
            </div>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import '@/css/realm-pages.css';
import { useTranslation } from 'i18next-vue';
import { Notify, QIcon } from 'quasar';
import { onMounted, reactive, ref } from 'vue';

import {
  clansApi,
  type Clan,
  type ClanBanner as ClanBannerType,
  type ClanMember,
  type ClanShop,
  type ClanSummary,
} from '@/modules/Clans/api';
import { getApiErrorMessage } from '@/shared/api/error-message';

import ClanBanner from '@/modules/Clans/ClanBanner.vue';

const { t } = useTranslation();
const loading = ref(true);
const actionBusy = ref(false);
const eligible = ref(true);
const minLevel = ref(10);
const maxMembers = ref(20);
const clan = ref<Clan | null>(null);
const clanList = ref<ClanSummary[]>([]);
const shop = ref<ClanShop | null>(null);
const activeTab = ref<'hall' | 'shop'>('hall');
const leaveArmed = ref(false);
const pendingRemoveId = ref<number | null>(null);
const form = reactive({ name: '', tag: '', description: '' });

const load = async () => {
  loading.value = true;
  try {
    const mine = await clansApi.getMine();
    clan.value = mine.clan;
    eligible.value = mine.eligible;
    minLevel.value = mine.minLevel;
    if (!mine.clan && mine.eligible) {
      const registry = await clansApi.list();
      clanList.value = registry.clans;
      maxMembers.value = registry.maxMembers;
    }
  } catch (error) {
    notifyError(error);
  } finally {
    loading.value = false;
  }
};

const createClan = async () =>
  run(async () => {
    clan.value = await clansApi.create({ ...form, tag: form.tag.toUpperCase() });
    Notify.create({ type: 'positive', message: t('clans.created') });
  });

const joinClan = async (entry: ClanSummary) =>
  run(async () => {
    clan.value = await clansApi.join(entry.id);
    Notify.create({ type: 'positive', message: t('clans.joinedClan', { name: entry.name }) });
  });

const leaveClan = async () =>
  run(async () => {
    await clansApi.leave();
    clan.value = null;
    shop.value = null;
    leaveArmed.value = false;
    Notify.create({ type: 'info', message: t('clans.leftClan') });
    await load();
  });

const openShop = async () => {
  activeTab.value = 'shop';
  if (!shop.value)
    await run(async () => {
      shop.value = await clansApi.getShop();
    });
};

const buyBanner = async (banner: ClanBannerType) =>
  run(async () => {
    shop.value = await clansApi.buyBanner(banner.code);
    if (clan.value) {
      clan.value.activityPoints = shop.value.activityPoints;
      clan.value.activeBannerCode = banner.code;
    }
    Notify.create({ type: 'positive', message: t('clans.bannerUnlocked', { name: banner.name }) });
  });

const equipBanner = async (banner: ClanBannerType) =>
  run(async () => {
    shop.value = await clansApi.equipBanner(banner.code);
    if (clan.value) clan.value.activeBannerCode = banner.code;
    Notify.create({ type: 'positive', message: t('clans.bannerEquipped', { name: banner.name }) });
  });

const toggleRole = async (member: ClanMember) =>
  run(async () => {
    clan.value = await clansApi.setRole(member.profileId, member.role === 'MEMBER' ? 'OFFICER' : 'MEMBER');
  });

const removeMember = async (member: ClanMember) =>
  run(async () => {
    clan.value = await clansApi.removeMember(member.profileId);
    pendingRemoveId.value = null;
  });

const canManageMember = (member: ClanMember) => {
  if (!clan.value || member.profileId === clan.value.viewerProfileId || member.role === 'LEADER') return false;
  return clan.value.viewerRole === 'LEADER' || (clan.value.viewerRole === 'OFFICER' && member.role === 'MEMBER');
};

const roleIcon = (role: ClanMember['role']) =>
  role === 'LEADER' ? 'workspace_premium' : role === 'OFFICER' ? 'military_tech' : 'person';
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

const run = async (action: () => Promise<void>) => {
  actionBusy.value = true;
  try {
    await action();
  } catch (error) {
    notifyError(error);
  } finally {
    actionBusy.value = false;
  }
};
const notifyError = (error: unknown) =>
  Notify.create({ type: 'negative', message: getApiErrorMessage(error) || t('clans.error') });

onMounted(() => void load());
</script>

<style scoped>
.clan-header {
  background:
    radial-gradient(circle at 90% 0%, rgb(239 202 114 / 15%), transparent 38%),
    linear-gradient(135deg, #0d2b35, #0b2530 55%, #171d28);
}
.summary-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-height: 76px;
  padding: 1rem 1.15rem;
  border: 1px solid rgb(216 189 117 / 22%);
  border-radius: 1rem;
  color: #efca72;
  background: #0b2530;
  box-shadow: 0 8px 24px rgb(0 0 0 / 20%);
}
.summary-card span {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7e9a9b;
}
.summary-card strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.1rem;
  color: #fff0bd;
}
.tab-button {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border-radius: 0.65rem;
  color: #8ea8a7;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: 0.2s;
}
.tab-button.active {
  color: #fff0bd;
  background: #173a45;
  box-shadow: inset 0 0 0 1px rgb(239 202 114 / 25%);
}
.member-row,
.registry-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.85rem;
  border: 1px solid rgb(216 189 117 / 14%);
  border-radius: 0.85rem;
  background: #071a23;
}
.member-rank {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #a9bfba;
  background: #102f39;
}
.member-rank--leader {
  color: #ffd878;
  background: #4b351d;
}
.member-rank--officer {
  color: #bcecff;
  background: #173b49;
}
.role-chip {
  padding: 0.12rem 0.4rem;
  border: 1px solid rgb(216 189 117 / 22%);
  border-radius: 999px;
  color: #cbbd91;
  font-size: 0.62rem;
  text-transform: uppercase;
}
.activity-line {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.65rem;
  border-radius: 0.6rem;
  background: #071a23;
}
.activity-line :deep(.q-icon) {
  color: #efca72;
}
.icon-action {
  display: flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 1px solid #35515b;
  border-radius: 0.55rem;
  color: #a9bfba;
}
.icon-action:hover {
  color: #fff0bd;
  border-color: #806f43;
}
.icon-action--danger:hover {
  color: #fca5a5;
  border-color: #9f3f45;
}
.danger-button,
.quiet-button,
.primary-button,
.banner-action {
  display: inline-flex;
  min-height: 2.6rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.55rem 1rem;
  border-radius: 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: 0.2s;
}
.danger-button {
  border: 1px solid rgb(190 70 75 / 55%);
  color: #fecaca;
  background: rgb(90 24 32 / 35%);
}
.danger-button:disabled {
  opacity: 0.4;
}
.quiet-button {
  border: 1px solid #35515b;
  color: #b7c8c6;
  background: #102833;
}
.quiet-button:hover {
  border-color: #806f43;
  color: #fff0bd;
}
.primary-button,
.banner-action {
  color: #10212a;
  background: #dfbd68;
}
.primary-button:hover,
.banner-action:hover {
  filter: brightness(1.08);
}
.primary-button:disabled,
.banner-action:disabled {
  cursor: not-allowed;
  opacity: 0.42;
  filter: none;
}
.field-label {
  display: block;
  margin-top: 1rem;
  color: #a9bfba;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.field-label input,
.field-label textarea {
  display: block;
  width: 100%;
  margin-top: 0.4rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid #35515b;
  border-radius: 0.65rem;
  outline: none;
  color: white;
  background: #071a23;
  font-size: 0.9rem;
  font-weight: 400;
  letter-spacing: normal;
  text-transform: none;
}
.field-label input:focus,
.field-label textarea:focus {
  border-color: #d8bd75;
  box-shadow: 0 0 0 2px rgb(216 189 117 / 10%);
}
.banner-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid rgb(216 189 117 / 18%);
  border-radius: 1rem;
  background: #071a23;
}
.banner-action {
  font-size: 0.68rem;
}
@media (max-width: 640px) {
  .member-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .member-row > div:nth-child(2) {
    min-width: calc(100% - 3.5rem);
  }
  .registry-row {
    flex-wrap: wrap;
  }
  .registry-row .quiet-button {
    width: 100%;
  }
}
</style>
