<template>
  <div class="relative z-10 flex flex-auto flex-col bg-gray-50">
    <div class="flex min-h-0 flex-1">
      <div class="flex-1 overflow-auto p-4">
        <div class="grid grid-cols-2 gap-4">
          <QCard v-for="n in 4" :key="n" class="rounded-lg p-4 shadow">
            <div class="text-gray-600">{{ t('dashboard.contentBlock', { n }) }}</div>
          </QCard>
        </div>
      </div>

      <aside class="min-h-0 w-[30%] overflow-auto border-l border-gray-200 bg-white p-4">
        <h2 class="mb-3 text-lg font-semibold text-gray-700">
          {{ t('dashboard.sidebarTitle') }}
        </h2>
        <div class="space-y-3">
          <QCard v-for="n in 6" :key="n" class="rounded p-3 shadow-sm">
            <div class="text-sm text-gray-600">{{ t('dashboard.item', { n }) }}</div>
          </QCard>
        </div>
      </aside>
    </div>

    <ChatWindow />

    <FantasyMap3D />
  </div>
</template>

<script setup lang="ts">
import { QCard } from 'quasar'
import { useTranslation } from 'i18next-vue'
import ChatWindow from '@components/ChatWindow.vue'
import FantasyMap3D from '@components/FantasyMap3D.vue'

const { t } = useTranslation()
</script>
