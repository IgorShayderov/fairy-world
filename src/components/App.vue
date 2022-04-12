<template>
  <main>
    <header class="header" />

    <main class="content" />

    <footer class="footer">
      <ul class="console" />
    </footer>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({

});
</script>

<style lang="scss" scoped>
.header {
  border-bottom: 1px solid red;
  height: 10vh;
}

.content {
  height: 80vh;
}

.footer {
  border-top: 1px solid purple;
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
