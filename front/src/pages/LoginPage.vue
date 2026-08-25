<template>
  <article class="flex h-full w-[500px] w-full items-center justify-center">
    <QCard class="w-full max-w-md rounded-lg p-6 shadow-lg">
      <QCardSection>
        <h2 class="mb-6 text-center text-xl! font-bold text-gray-800">{{ $t('auth.labels.login') }}</h2>

        <QForm @submit.prevent="handleSubmit" class="space-y-4">
          <QInput v-model="form.email" label="Email" type="email" outlined :rules="emailRules" lazy-rules class="mb-4">
            <template #prepend>
              <QIcon name="mail" />
            </template>
          </QInput>

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

          <footer class="flex justify-center px-4">
            <QBtn
              type="submit"
              :label="$t('auth.buttons.login')"
              color="primary"
              class="w-[200px]"
              :loading="loading"
            />
          </footer>
        </QForm>

        <div class="mt-6 text-center">
          <RouterLink to="/forgot-password" class="text-sm text-blue-600 hover:underline">
            {{ $t('auth.buttons.forgotPassword') }}
          </RouterLink>
        </div>
      </QCardSection>
    </QCard>
  </article>
</template>

<script lang="ts" setup>
import { useQuasar, QCardSection, QCard, QForm, QInput, QBtn, QIcon } from 'quasar';
import { ref, reactive } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useTranslation } from 'i18next-vue';

import { signIn } from '@/modules/Auth/api';
import { socket } from '@/boot/socket';

interface LoginForm {
  email: string;
  password: string;
}

const form = reactive<LoginForm>({
  email: '',
  password: '',
});

const $q = useQuasar();
const router = useRouter();
const { t } = useTranslation();

const showPassword = ref(false);
const loading = ref(false);

const emailRules = [
  (val: string) => !!val || t('auth.validation.errors.email.required'),
  (val: string) => /.+@.+\..+/.test(val) || t('auth.validation.errors.email.incorrect'),
];

const passwordRules = [(val: string) => !!val || t('auth.validation.errors.password.required')];

const handleSubmit = async () => {
  try {
    loading.value = true;

    await signIn({
      email: form.email,
      password: form.password,
    });

    $q.notify({
      type: 'positive',
      message: 'Вход выполнен успешно',
    });

    await router.push('/');
    socket.connect();
    // socket.disconnect();
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Ошибка авторизации',
    });
  } finally {
    loading.value = false;
  }
};
</script>
