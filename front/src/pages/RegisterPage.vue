<template>
  <article class="flex min-h-full w-full items-center justify-center p-4">
    <QCard class="w-full max-w-md rounded-lg p-6 shadow-lg">
      <QCardSection>
        <h1 class="mb-6 text-center text-xl font-bold text-gray-800">{{ t('auth.buttons.register') }}</h1>
        <QForm class="space-y-4" @submit.prevent="handleSubmit">
          <QInput
            v-model="form.email"
            type="email"
            name="email"
            autocomplete="email"
            outlined
            :label="t('auth.fields.email.label')"
            :rules="emailRules"
            lazy-rules
          />
          <QInput
            v-model="form.password"
            type="password"
            name="password"
            autocomplete="new-password"
            outlined
            :label="t('auth.fields.password.label')"
            :rules="passwordRules"
            lazy-rules
          />
          <p class="text-xs text-gray-500">{{ t('auth.registration.passwordHint') }}</p>
          <QInput
            v-model="form.confirm"
            type="password"
            name="password-confirm"
            autocomplete="new-password"
            outlined
            :label="t('auth.fields.passwordConfirm.label')"
            :rules="[(value: string) => value === form.password || t('auth.validation.errors.password.mismatch')]"
            lazy-rules
          />
          <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
          <QBtn type="submit" color="primary" class="w-full" :label="t('auth.buttons.register')" :loading="loading" />
        </QForm>
        <RouterLink :to="routes.loginPath()" class="mt-6 block text-center text-sm text-blue-600 hover:underline">{{
          t('auth.buttons.backToLogin')
        }}</RouterLink>
      </QCardSection>
    </QCard>
  </article>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { QBtn, QCard, QCardSection, QForm, QInput } from 'quasar';
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

import { socket } from '@/boot/socket';
import { signUp } from '@/modules/Auth/api';
import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';
import routes from '@/routes';
import { HttpError } from '@/shared/api/HttpError';

const { t } = useTranslation();
const router = useRouter();
const currentUser = useCurrentUserStore();
const form = reactive({ email: '', password: '', confirm: '' });
const loading = ref(false);
const error = ref('');
const emailRules = [(value: string) => /.+@.+\..+/.test(value.trim()) || t('auth.validation.errors.email.incorrect')];
const passwordRules = [
  (value: string) =>
    (value.length >= 15 &&
      value.length <= 30 &&
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(value) &&
      !/(.)\1{3}/.test(value)) ||
    t('auth.registration.passwordHint'),
];
const handleSubmit = async () => {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    await signUp({ email: form.email.trim(), password: form.password });
    currentUser.reset();
    socket.disconnect();
    await router.push(routes.rootPath());
    socket.connect();
  } catch (cause) {
    error.value = t(
      cause instanceof HttpError && cause.status === 401 ? 'auth.registration.exists' : 'auth.registration.error'
    );
  } finally {
    loading.value = false;
  }
};
</script>
