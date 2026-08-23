<template>
  <div class="flex h-screen flex-col bg-gray-50">
    <div class="flex min-h-0 flex-1">
      <main class="flex-1 overflow-auto p-4">
        <h1 class="mb-4 text-2xl font-bold text-gray-800">Ротовая страница</h1>
        <div class="grid grid-cols-2 gap-4">
          <QCard v-for="n in 4" :key="n" class="rounded-lg p-4 shadow">
            <div class="text-gray-600">Контент блок {{ n }}</div>
          </QCard>
        </div>
      </main>

      <aside class="min-h-0 w-[30%] overflow-auto border-l border-gray-200 bg-white p-4">
        <h2 class="mb-3 text-lg font-semibold text-gray-700">Панель</h2>
        <div class="space-y-3">
          <QCard v-for="n in 6" :key="n" class="rounded p-3 shadow-sm">
            <div class="text-sm text-gray-600">Элемент {{ n }}</div>
          </QCard>
        </div>
      </aside>
    </div>

    <div class="mt-auto border-t border-gray-200 bg-white" style="height: clamp(150px, 15vh, 200px)">
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between border-b border-gray-200 px-4 py-2">
          <h3 class="text-sm font-semibold text-gray-700">Чат</h3>
          <QBtn flat dense round icon="close" size="sm" />
        </div>
        <div class="flex-1 space-y-2 overflow-y-auto p-4 text-sm text-gray-600">
          <div class="inline-block rounded bg-gray-100 p-2">Привет! Как дела?</div>
          <div class="ml-12 inline-block rounded bg-blue-50 p-2">Хорошо, спасибо!</div>
        </div>
        <div class="flex items-center gap-2 border-t border-gray-200 px-4 py-2">
          <QInput
            v-model="message"
            placeholder="Сообщение..."
            class="flex-1"
            outlined
            dense
            @keyup.enter.prevent="sendMessage"
          />
          <QBtn color="primary" label="Отправить" @click="sendMessage" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { QCard, QBtn, QInput } from 'quasar';

const message = ref('');
const messages = ref<string[]>(['Привет! Как дела?', 'Хорошо, спасибо!']);

const sendMessage = () => {
  if (message.value.trim()) {
    messages.value.push(message.value.trim());
    message.value = '';
  }
};
</script>
