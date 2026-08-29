<template>
  <article class="flex h-full w-[500px] w-full items-center justify-center">
    <QCard class="w-full max-w-md rounded-lg p-6 shadow-lg">
      <QCardSection>
        <h2 class="mb-6 text-center text-xl! font-bold text-gray-800">
          {{ $t('auth.labels.resetPassword') }}
        </h2>

        <QForm @submit.prevent="handleSubmit" class="space-y-4">
          <QInput
            v-model="form.password"
            :label="$t('auth.fields.password.label')"
            :type="showPassword ? 'text' : 'password'"
            outlined
            :rules="passwordRules"
            lazy-rules
          >
            <template #prepend>
              <QIcon name="lock" />
            </template>
            <template #append>
              <QIcon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </QInput>

          <QInput
            v-model="form.confirmPassword"
            :label="$t('auth.fields.passwordConfirm.label')"
            :type="showConfirmPassword ? 'text' : 'password'"
            outlined
            :rules="confirmPasswordRules"
            lazy-rules
          >
            <template #prepend>
              <QIcon name="lock" />
            </template>
            <template #append>
              <QIcon
                :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </QInput>

          <footer class="flex justify-center px-4">
            <QBtn
              type="submit"
              :label="$t('auth.buttons.saveNewPassword')"
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
import { ref, reactive, computed } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { useTranslation } from 'i18next-vue';

import { resetPassword } from '@/modules/Auth/api/passwords';

interface ResetForm {
  password: string;
  confirmPassword: string;
}

const route = useRoute();

const token = ref((route.query.token as string) || '');

const form = reactive<ResetForm>({
  password: '',
  confirmPassword: '',
});

const $q = useQuasar();
const router = useRouter();
const { t } = useTranslation();

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);

const passwordRules = [
  (val: string) => !!val || t('auth.validation.errors.password.required'),
  (val: string) => (val || '').length >= 6 || t('auth.validation.errors.password.minLength'),
  (val: string) => /[a-zA-Z]/.test(val || '') || t('auth.validation.errors.password.mustContainLetter'),
  (val: string) => /[0-9]/.test(val || '') || t('auth.validation.errors.password.mustContainDigit'),
];

const passwordMismatch = computed(() => {
  return form.password !== form.confirmPassword && form.confirmPassword.length > 0;
});

const confirmPasswordRules = [
  (val: string) => !!val || t('auth.validation.errors.password.required'),
  () => !passwordMismatch.value || t('auth.validation.errors.password.mismatch'),
];

const handleSubmit = async () => {
  if (!token.value) {
    $q.notify({
      type: 'negative',
      message: t('auth.notifications.tokenMissing'),
    });
    return;
  }

  if (!form.password || form.password !== form.confirmPassword) {
    $q.notify({
      type: 'negative',
      message: t('auth.notifications.passwordsMismatch'),
    });
    return;
  }

  try {
    loading.value = true;

    await resetPassword(token.value, form.password);

    $q.notify({
      type: 'positive',
      message: t('auth.notifications.resetSuccess'),
    });

    await router.push('/login');
  } catch {
    $q.notify({
      type: 'negative',
      message: t('auth.notifications.resetError'),
    });
  } finally {
    loading.value = false;
  }
};
</script>
