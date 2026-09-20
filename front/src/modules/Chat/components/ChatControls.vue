<template>
  <footer class="flex items-center gap-2 border-t border-[#35515b] bg-[#0a202b] px-4 py-2">
    <QInput
      ref="inputRef"
      v-model="inputText"
      :placeholder="t('chat.inputs.messagePlaceholder')"
      class="chat-input flex-1"
      outlined
      dense
      dark
      color="amber-4"
      :disable="!chatStore.activeChannelId || isSending"
      @keyup.enter.prevent="handleSend"
    />
    <QBtn
      unelevated
      color="amber-7"
      text-color="blue-grey-10"
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

<style scoped>
.chat-input :deep(.q-field__control) {
  background: #102b36;
  color: #e6eff1;
}

.chat-input :deep(.q-field__native),
.chat-input :deep(.q-field__input) {
  color: #e6eff1;
}

.chat-input :deep(.q-field__native::placeholder) {
  color: #89a4ad;
  opacity: 1;
}
</style>
