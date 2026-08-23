<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <QCard class="w-full max-w-md rounded-lg shadow-lg p-6 bg-white">
      <QCardSection class="mb-4">
        <h1 class="text-2xl font-bold text-center text-gray-800"> Fairy World </h1>
        <p class="text-center text-gray-500 text-sm mt-1"> Авторизация </p>
      </QCardSection>

      <!-- Вкладки: вход / регистрация -->
      <QTabs v-model="activeTab" class="q-mt-md">
        <QTab name="login" label="Вход" />
        <QTab name="register" label="Регистрация" />
      </QTabs>

      <QTabPanel name="login" class="q-mt-md">
        <h2 class="text-lg font-semibold text-center text-gray-700 mb-4"> Вход </h2>
        <QForm @submit.prevent="handleLogin" class="space-y-4">
          <QInput v-model="loginForm.email" label="Email" type="email" outlined :rules="emailRules" lazy-rules class="mb-4" />
          <QInput v-model="loginForm.password" label="Password" type="password" outlined :rules="passwordRules" lazy-rules />
          <div class="flex justify-center mt-4">
            <QBtn type="submit" label="Войти" color="primary" class="w-full" :loading="loading" />
          </div>
        </QForm>
      </QTabPanel>

      <QTabPanel name="register" class="q-mt-md">
        <h2 class="text-lg font-semibold text-center text-gray-700 mb-4"> Регистрация </h2>
        <QForm @submit.prevent="handleRegister" class="space-y-4">
          <QInput v-model="registerForm.email" label="Email" type="email" outlined :rules="emailRules" lazy-rules class="mb-4" />
          <QInput v-model="registerForm.password" label="Password" type="password" outlined :rules="passwordRules" lazy-rules class="mb-4" />
          <QInput v-model="registerForm.confirmPassword" label="Confirm password" type="password" outlined :rules="confirmPasswordRules" lazy-rules />
          <div class="flex justify-center mt-4">
            <QBtn type="submit" label="Зарегистрироваться" color="primary" class="w-full" :loading="loading" />
          </div>
        </QForm>
      </QTabPanel>

      <!-- Сообщения об ошибках -->
      <div v-if="error" class="mt-4 text-red-600 text-center text-sm">
        {{ error }}
      </div>
    </QCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar, QCard, QCardSection, QForm, QInput, QBtn, QTabs, QTab, QTabPanel } from 'quasar';
import { signIn } from '@/modules/Auth/api';

const $q = useQuasar();
const router = useRouter();

const activeTab = ref<string>('login');
const loading = ref(false);
const error = ref('');

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}

const loginForm = reactive<LoginForm>({
  email: '',
  password: '',
});

const registerForm = reactive<RegisterForm>({
  email: '',
  password: '',
  confirmPassword: '',
});

const emailRules = [(v: string) => !!v || 'Email обязателен', (v: string) => /.+@.+\..+/.test(v) || 'Некорректный email'];
const passwordRules = [(v: string) => !!v || 'Password обязателен', (v: string) => v.length >= 6 || 'Минимум 6 символов'];
const confirmPasswordRules = [
  (v: string) => !!v || 'Подтверждение обязательно',
  (v: string) => v === registerForm.password || 'Пароли не совпадают',
];

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  try {
    await signIn({
      email: loginForm.email,
      password: loginForm.password,
    });
    $q.notify({ type: 'positive', message: 'Вход выполнен успешно' });
    void router.push('/profile');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    error.value = message || 'Ошибка авторизации';
    $q.notify({ type: 'negative', message: error.value });
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  loading.value = true;
  error.value = '';
  // Регистрация пока не реализована — заглушка
  await void 0;
  $q.notify({ type: 'warning', message: 'Регистрация временно недоступна' });
  loading.value = false;
};
</script>

<style lang="scss" scoped>
// стили для вкладок и формы
</style>
