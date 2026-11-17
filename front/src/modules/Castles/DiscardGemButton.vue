<template>
  <button
    type="button"
    class="discard-gem"
    :aria-label="`Discard +${gem.value} ${gem.type.toLowerCase()} gem`"
    @click.stop="confirming = true"
  >
    Discard
  </button>
  <QDialog v-model="confirming" :persistent="pending">
    <div class="discard-gem-dialog" role="alertdialog" aria-label="Discard equipment gem">
      <h2>Discard gem?</h2>
      <p>+{{ gem.value }} {{ gem.type.toLowerCase() }} · Mine level {{ gem.mineLevel }}</p>
      <p>This permanently destroys the gem. You will not receive gold or resources.</p>
      <footer>
        <button type="button" :disabled="pending" @click="confirming = false">Cancel</button>
        <button type="button" :disabled="pending" @click="discard">
          {{ pending ? 'Discarding…' : 'Discard permanently' }}
        </button>
      </footer>
    </div>
  </QDialog>
</template>
<script setup lang="ts">
import { QDialog, Notify } from 'quasar';
import { ref } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { castlesApi, type EquipmentGem } from './api';
const props = defineProps<{ gem: EquipmentGem }>();
const emit = defineEmits<{ discarded: [id: string] }>();
const user = useCurrentUserStore();
const confirming = ref(false),
  pending = ref(false);
async function discard() {
  if (pending.value) return;
  pending.value = true;
  try {
    await castlesApi.discardGem(props.gem.id);
    confirming.value = false;
    emit('discarded', props.gem.id);
    Notify.create({ type: 'positive', message: 'Gem discarded.' });
    await user.fetchCurrentUser(true);
  } catch (error) {
    Notify.create({ type: 'negative', message: error instanceof Error ? error.message : 'Could not discard the gem.' });
  } finally {
    pending.value = false;
  }
}
</script>
<style scoped>
.discard-gem {
  font-size: 11px;
  padding: 3px 7px;
  border: 1px solid #a96c63;
  border-radius: 6px;
  color: #efb4a7;
}
.discard-gem-dialog {
  width: 420px;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 48px);
  overflow: auto;
  padding: 24px;
  border-radius: 14px;
  border: 1px solid #b88a62;
  background: #102e37;
  color: #d4e1dc;
}
.discard-gem-dialog h2 {
  font:
    600 24px/1.3 Georgia,
    serif;
  margin: 0 0 16px;
  color: #ffe4a4;
}
.discard-gem-dialog p {
  margin: 12px 0;
}
.discard-gem-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.discard-gem-dialog button {
  padding: 8px 12px;
  border: 1px solid #b88a62;
  border-radius: 8px;
}
.discard-gem-dialog button:last-child {
  background: #923f38;
  color: white;
}
</style>
