<template>
  <button
    class="button-icon inventory-icon"
    @click="toggleInventory"
  >
    Open inventory
  </button>

  <main
    v-show="isInventoryOpened"
    class="inventory"
  >
    <h4 class="inventory-title">
      {{ playerName }}
    </h4>

    <article class="player-equipment">
      <div
        v-for="{key: slotName } in itemTypes"
        :key="slotName"
        :class="[`${slotName}-icon`, 'player-equipment__item']"
        :title="slotName"
      >
        {{ slotName }}
      </div>
    </article>

    <article class="inventory-items">
      <div
        v-for="slotsCount in itemSlotsCount"
        :key="slotsCount"
        class="inventory-items__slot"
      >
        Slot # {{ slotsCount }}
      </div>
    </article>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'PlayerInventory',
  props: {
    playerName: {
      type: String,
      default: 'Hero',
    },
  },
  setup() {
    const isInventoryOpened = ref(false);
    const toggleInventory = () => {
      isInventoryOpened.value = !isInventoryOpened.value;
    };
    const itemTypes = [
      { key: 'ring' },
      { key: 'helmet' },
      { key: 'necklace' },
      { key: 'first-hand' },
      { key: 'armor' },
      { key: 'second-hand' },
      { key: 'gloves' },
      { key: 'pants' },
      { key: 'shoes' },
    ];
    const itemSlotsCount = 10;

    return {
      itemTypes,
      isInventoryOpened,
      itemSlotsCount,
      toggleInventory,
    };
  },
});
</script>

<style lang="scss">
.inventory {
  position: fixed;
  background-color: var(--background-color);
  top: 10vh;
  height: 80vh;
  width: 100vw;
}

.inventory-title {
  text-align: center;
}

.player-equipment {
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(3, calc(33% - (20px / 3)));
  margin-bottom: 15px;
  padding: 0 10px;
}

.player-equipment__item {
  color: transparent;
  min-height: 10vh;
}

.inventory-items {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc(33% - 10px);
  grid-gap: 10px;
  grid-template-columns: repeat(3, calc(33% - (20px / 3)));
  grid-template-rows: repeat(3, 1fr);
  margin-bottom: 15px;
  padding: 0 10px;
  overflow-x: scroll;
}

.inventory-items__slot {
  min-height: 10vh;
  color: transparent;
  border: 1px solid black;
}
</style>
