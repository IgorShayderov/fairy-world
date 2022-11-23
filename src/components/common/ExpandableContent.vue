<template>
  <button
    class="button-icon"
    @click="toggleContent"
  >
    <slot name="button-content">
      Toggle content
    </slot>

    Toggle content
  </button>

  <main
    v-show="shouldShowContent"
    class="expandable-content"
  >
    <slot name="default" />
  </main>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import useEmitter from '@src/plugins/emitter';

export default defineComponent({
  setup() {
    const emitter = useEmitter();
    const shouldShowContent = ref(false);
    const toggleContent = () => {
      if (!shouldShowContent.value) {
        emitter.emit('close');
      }

      shouldShowContent.value = !shouldShowContent.value;
    };

    emitter.on('close', () => {
      shouldShowContent.value = false;
    });

    return {
      shouldShowContent,
      toggleContent,
    };
  },
});
</script>

<style lang="scss" scoped>
.expandable-content {
  position: fixed;
  background-color: var(--background-color);
  top: 10vh;
  height: 80vh;
  width: 100vw;
}
</style>
