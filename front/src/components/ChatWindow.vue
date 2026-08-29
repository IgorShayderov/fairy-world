<template>
  <div class="mt-auto h-[300px] w-full shrink-0">
    <article
      class="absolute bottom-0 left-0 z-20 flex w-full border-t border-gray-200 bg-white transition-all duration-500 ease-in-out"
      :class="isExpanded ? 'h-full shadow-[0_-20px_50px_rgba(0,0,0,0.1)]' : 'h-[300px]'"
    >
      <ToggleExpandButton v-model="isExpanded" class="absolute -top-4 left-1/2 z-30 -translate-x-1/2" />

      <aside class="flex w-1/5 flex-col border-r border-gray-200 bg-gray-50">
        <div class="border-b border-gray-200 p-3 font-bold text-gray-700">
          {{ t('chat.titles.channels') }}
        </div>
        <div class="flex-1 overflow-y-auto">
          <template v-if="chatStore.isLoading">
            <div class="p-4 text-center text-gray-400">
              {{ t('chat.statuses.loadingChannels') }}
            </div>
          </template>
          <template v-else>
            <div
              v-for="channel in chatStore.channels"
              :key="channel.id"
              @click="chatStore.selectChannel(channel.id)"
              class="cursor-pointer border-b border-gray-100 p-3 text-sm transition-colors"
              :class="
                chatStore.activeChannelId === channel.id
                  ? 'border-l-4 border-l-blue-500 bg-blue-100 text-blue-800'
                  : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              "
            >
              # {{ channel.name }}
            </div>
          </template>
        </div>
      </aside>

      <section class="flex h-full w-4/5 flex-col">
        <header class="border-b border-gray-200 p-3 font-bold text-gray-700">
          {{ chatStore.activeChannel ? `# ${chatStore.activeChannel.name}` : t('chat.statuses.selectChannel') }}
        </header>

        <div class="flex-1 space-y-3 overflow-y-auto bg-white p-4" ref="messagesContainer">
          <div v-if="chatStore.isMessagesLoading" class="text-center text-gray-400">
            {{ t('chat.statuses.loadingMessages') }}
          </div>
          <template v-else>
            <div
              v-for="msg in chatStore.messages"
              :key="msg.id"
              class="flex flex-col"
              :class="amIAuthor ? 'items-end' : 'items-start'"
            >
              <div
                class="block max-w-[80%] rounded p-2 text-sm"
                :class="amIAuthor ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-800'"
              >
                {{ msg.text }}
              </div>
            </div>
          </template>
        </div>

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
      </section>
    </article>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, watch, useTemplateRef } from 'vue';
import { QBtn, QInput } from 'quasar';
import { useTranslation } from 'i18next-vue';
import { useChatStore } from '@/modules/Chat/store';
import { StorageService } from '@services/storage.service';
import ToggleExpandButton from '@/components/ToggleExpandButton.vue';

const amIAuthor = ref(true);

const isExpanded = ref(StorageService.get('chatExpanded'));

watch(isExpanded, (newValue) => {
  StorageService.set('chatExpanded', newValue);
});

const { t } = useTranslation();
const chatStore = useChatStore();

const inputText = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = useTemplateRef<InstanceType<typeof QInput>>('inputRef');

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(() => chatStore.messages, scrollToBottom, { deep: true });

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

onMounted(async () => {
  await chatStore.loadChannels();

  const [firstChannel] = chatStore.channels;
  const savedChannelId = StorageService.get('selectedChannelId');

  if (savedChannelId) {
    await chatStore.selectChannel(savedChannelId);
  } else if (firstChannel) {
    await chatStore.selectChannel(firstChannel.id);
  }
});
</script>
