<template>
  <article class="flex h-full w-[500px] w-full items-center justify-center">
    <QCard class="w-full max-w-md rounded-lg p-6 shadow-lg">
      <QCardSection>
        <h2 class="mb-6 text-center text-xl! font-bold text-gray-800">
          {{ $t('auth.labels.forgotPassword') }}
        </h2>

        <QForm @submit.prevent="handleSubmit" class="space-y-4">
          <QInput
            v-model="email"
            :label="$t('auth.fields.email.label')"
            type="email"
            outlined
            :rules="emailRules"
            lazy-rules
            class="mb-4"
          >
            <template #prepend>
              <QIcon name="mail" />
            </template>
          </QInput>

          <footer class="flex justify-center px-4">
            <QBtn
              type="submit"
              :label="$t('auth.buttons.sendResetLink')"
              color="primary"
              class="w-[200px]"
              :loading="loading"
            />
          </footer>
        </QForm>

        <div class="mt-4 text-center">
          <RouterLink :to="routes.loginPath()" class="text-sm text-blue-600 hover:underline">
            {{ $t('auth.buttons.backToLogin') }}
          </RouterLink>
        </div>
      </QCardSection>
    </QCard>
  </article>
</template>

<script lang="ts" setup>
import { useTranslation } from 'i18next-vue';
import { useQuasar, QCardSection, QCard, QForm, QInput, QBtn, QIcon } from 'quasar';
import { logger } from 'src/boot/logger';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

import { requestPasswordReset } from '@/modules/Auth/api/passwords';
import routes from '@/routes';

const email = ref('');
const $q = useQuasar();
const { t } = useTranslation();
const loading = ref(false);

const emailRules = [
  (val: string) => !!val || t('auth.validation.errors.email.required'),
  (val: string) => /.+@.+\..+/.test(val) || t('auth.validation.errors.email.incorrect'),
];

const handleSubmit = async () => {
  try {
    loading.value = true;

    await requestPasswordReset(email.value);

    $q.notify({
      type: 'positive',
      message: t('auth.notifications.resetLinkSent'),
    });

    email.value = '';
  } catch (e) {
    logger.error('Что-то пошло не так!', e);

    $q.notify({
      type: 'negative',
      message: t('auth.notifications.resetRequestError'),
    });
  } finally {
    loading.value = false;
  }
};
</script>
