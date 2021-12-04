<template>
  <main>
    <header class="header"></header>

    <main class="content"></main>

    <footer class="footer">
      <ul class="console"></ul>
    </footer>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({

})
</script>

<style lang="scss" scoped>
.header {
  background-color: red;
  height: 10vh;
}

.content {
  background-color: yellow;
  height: 80vh;
}

.footer {
  background-color: purple;
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
