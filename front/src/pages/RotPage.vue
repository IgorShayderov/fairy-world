<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Верхняя часть: левая зона + правая панель -->
    <div class="flex flex-1 min-h-0">
      <!-- Левая зона (70%) -->
      <main class="flex-1 p-4 overflow-auto">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">Ротовая страница</h1>
        <div class="grid grid-cols-2 gap-4">
          <QCard v-for="n in 4" :key="n" class="p-4 shadow rounded-lg">
            <div class="text-gray-600">Контент блок {{ n }}</div>
          </QCard>
        </div>
      </main>

      <!-- Правая панель (30% ширины, не доходящая до чата) -->
      <aside class="w-[30%] border-l border-gray-200 bg-white min-h-0 overflow-auto p-4">
        <h2 class="text-lg font-semibold text-gray-700 mb-3">Панель</h2>
        <div class="space-y-3">
          <QCard v-for="n in 6" :key="n" class="p-3 shadow-sm rounded">
            <div class="text-sm text-gray-600">Элемент {{ n }}</div>
          </QCard>
        </div>
      </aside>
    </div>

    <!-- Окно чата: внизу, на всей ширине, не делится панелью -->
    <div class="border-t border-gray-200 bg-white mt-auto" style="height: clamp(150px, 15vh, 200px)">
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <h3 class="text-sm font-semibold text-gray-700">Чат</h3>
          <QBtn flat dense round icon="close" size="sm" />
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-2 text-sm text-gray-600">
          <div class="bg-gray-100 rounded p-2 inline-block">Привет! Как дела?</div>
          <div class="bg-blue-50 rounded p-2 inline-block ml-12">Хорошо, спасибо!</div>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 border-t border-gray-200">
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
import { QCard, QBtn, QInput, RouterLink } from 'quasar';

const message = ref('');
const messages = ref<string[]>(['Привет! Как дела?', 'Хорошо, спасибо!']);

const sendMessage = () => {
  if (message.value.trim()) {
    messages.value.push(message.value.trim());
    message.value = '';
  }
};
</script>

<style lang="scss" scoped>
// 
</style>
