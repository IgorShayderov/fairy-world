<template>
  <footer class="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2">
    <QInput
      ref="inputRef"
      v-model="inputText"
      :placeholder="t('chat.inputs.messagePlaceholder')"
      class="flex-1 bg-white"
      outlined
      dense
      :disable="!chatStore.activeChannelId || isSending"
      @keyup.enter.prevent="handleSend"
    />
    <QBtn
      color="primary"
      :label="t('chat.buttons.send')"
      :disable="!inputText.trim() || !chatStore.activeChannelId || isSending"
      :loading="isSending"
      @click="handleSend"
    />
  </footer>
</template>

<script lang="ts" setup>
import { useTranslation } from 'i18next-vue';
import { QInput, QBtn } from 'quasar';
import { ref, useTemplateRef, nextTick } from 'vue';

import { useChatStore } from '@/modules/Chat/store';

const { t } = useTranslation();
const chatStore = useChatStore();

const inputText = ref('');
const inputRef = useTemplateRef<InstanceType<typeof QInput>>('inputRef');

const isSending = ref(false);
const handleSend = async () => {
  if (inputText.value.trim() && !isSending.value) {
    isSending.value = true;
    try {
      await chatStore.postMessage(inputText.value);
      inputText.value = '';
    } finally {
      isSending.value = false;

      await nextTick();
      inputRef.value?.focus();
    }
  }
};
</script>
