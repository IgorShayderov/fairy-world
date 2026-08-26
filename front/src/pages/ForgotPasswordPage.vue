<template>
  <article class="flex h-full w-[500px] w-full items-center justify-center">
    <QCard class="w-full max-w-md rounded-lg p-6 shadow-lg">
      <QCardSection>
        <h2 class="mb-6 text-center text-xl! font-bold text-gray-800">
          {{ $t('auth.labels.forgotPassword') }}
        </h2>

        <QForm @submit.prevent="handleSubmit" class="space-y-4">
          <QInput v-model="email" label="Email" type="email" outlined :rules="emailRules" lazy-rules class="mb-4">
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
          <RouterLink to="/login" class="text-sm text-blue-600 hover:underline">
            {{ $t('auth.buttons.backToLogin') }}
          </RouterLink>
        </div>
      </QCardSection>
    </QCard>
  </article>
</template>

<script lang="ts" setup>
import { useQuasar, QCardSection, QCard, QForm, QInput, QBtn, QIcon } from 'quasar';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useTranslation } from 'i18next-vue';

import { requestPasswordReset } from '@/modules/Auth/api';

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
      message: 'Если аккаунт существует, инструкции будут отправлены на email.',
    });

    email.value = '';
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Произошла ошибка при запросе восстановления пароля',
    });
  } finally {
    loading.value = false;
  }
};
</script>