<template>
  <header
    class="flex max-h-(--header-height) min-h-(--header-height) items-center justify-between bg-gray-800 px-4 py-2 text-white"
  >
    <div class="flex items-center gap-2">
      <span class="text-lg font-bold tracking-wide">✦ {{ appName }}</span>
    </div>

    <QBtn
      v-if="$props.auth"
      unelevated
      color="negative"
      icon="logout"
      :label="t('auth.buttons.logout')"
      @click="handleLogout"
    />
  </header>
</template>

<script setup lang="ts">
import { signOut } from '@modules/Auth/api';
import { useTranslation } from 'i18next-vue';
import { QBtn } from 'quasar';
import { useRouter } from 'vue-router';


import routes from '@/routes';

const $props = defineProps({
  auth: {
    type: Boolean,
    default: false,
  },
});

const { t } = useTranslation();

const appName = import.meta.env.VITE_APP_NAME;
const router = useRouter();

const handleLogout = async () => {
  try {
    await signOut();
  } catch (error) {
    console.error('Ошибка при выходе:', error);
  } finally {
    await router.push(routes.loginPath());
  }
};
</script>
