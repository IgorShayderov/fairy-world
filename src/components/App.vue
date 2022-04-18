<template>
  <header class="header">
    <PlayerInventory :player-name="playerName" />
  </header>

  <main class="content" />

  <footer class="footer">
    <ul class="console" />
  </footer>
</template>

<script lang="ts">

import PlayerInventory from './PlayerInventory.vue';
import { defineComponent } from 'vue';

export default defineComponent({
  components: { PlayerInventory },
  setup() {
    const playerName = 'Hero';

    return {
      playerName,
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
