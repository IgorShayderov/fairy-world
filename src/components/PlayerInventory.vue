<template>
  <ExpandableContent>
    <template #button-content>
      <div class="inventory-icon" />
    </template>

    <template #default>
      <h4 class="inventory-title">
        {{ playerName }}
      </h4>

      <article
        class="player-equipment"
      >
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
          draggable="true"
          @dragstart="slotDragstartHandler"
        >
          <img
            src="@images/items/weapons/makarov-pistol.png"
            alt=""
          >
          Slot # {{ slotsCount }}
        </div>
      </article>
    </template>
  </ExpandableContent>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useStore } from 'vuex';

import ExpandableContent from '@components/common/ExpandableContent.vue';

export default defineComponent({
  name: 'PlayerInventory',
  components: { ExpandableContent },
  setup() {
    const store = useStore();
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
    const slotDragstartHandler = (event) => {
      console.log('dragstart');
      console.log({ event });
    };

    return {
      itemTypes,
      itemSlotsCount,
      playerName: computed(() => store.state.playerName),
      slotDragstartHandler,
    };
  },
});
</script>

<style lang="scss">
.inventory-title {
  text-align: center;
  font-size: 1.25rem;
  margin: 1vh 0;
}

.player-equipment {
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(3, calc((100% - 20px) / 3));
  margin-bottom: 15px;
  padding: 0 10px;
}

.player-equipment__item {
  color: transparent;
  min-height: 9vh;
}

.inventory-items {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc(33% - 10px);
  grid-gap: 10px;
  grid-template-columns: repeat(3, calc((100% - 20px) / 3));
  grid-template-rows: repeat(3, 1fr);
  margin-bottom: 15px;
  padding: 0 10px;
  overflow-x: scroll;
}

.inventory-items__slot {
  min-height: 9vh;
  color: transparent;
  border: 1px solid black;
  text-align: center;

  img {
    max-height: 9vh;
    max-width: 100%;
  }
}
</style>
