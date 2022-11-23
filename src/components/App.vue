<template>
  <header class="header">
    <PlayerAttributes />
    <PlayerInventory />
  </header>

  <main class="content" />

  <footer class="footer">
    <ul class="console" />
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import PlayerInventory from './PlayerInventory.vue';
import PlayerAttributes from './PlayerAttributes.vue';

export default defineComponent({
  components: { PlayerInventory, PlayerAttributes },
  setup() {
    return {
    };
  },
});
</script>

<style lang="scss" scoped>
.header {
  border-bottom: 1px solid black;
  height: 10vh;
  display: flex;
  justify-content: flex-end;
}

.content {
  height: 80vh;
}

.footer {
  border-top: 1px solid black;
  height: 10vh;
}

.console {
  display: flex;
  margin: 0;

  li {
    list-style: none;
  }
}
</style>
