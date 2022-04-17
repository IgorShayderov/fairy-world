<template>
  <button class="button-icon">
    Open inventory
    <object
      data="@images/menu/inventory-button.svg"
      type="image/svg+xml"
    />
  </button>

  <img
    src="@images/menu/inventory-button.svg"
    alt=""
  >
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PlayerInventory',
  setup() {
    console.info('setup');
  },
});
</script>

<style>

</style>
