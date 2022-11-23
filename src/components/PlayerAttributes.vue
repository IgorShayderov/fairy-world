<template>
  <ExpandableContent>
    <template #button-content>
      <div class="profile-icon" />
    </template>

    <template #default>
      <h4 class="inventory-title">
        {{ playerName }}
      </h4>

      <!-- <article class="player-equipment">
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
      </article> -->
    </template>
  </ExpandableContent>
</template>

<script lang="ts">
import { useStore } from 'vuex';
import { defineComponent, computed } from 'vue';

import ExpandableContent from '@components/common/ExpandableContent.vue';

export default defineComponent({
  name: 'PlayerAttributes',
  components: { ExpandableContent },
  setup() {
    const store = useStore();

    return {
      playerName: computed(() => store.state.playerName),
    };
  },
});
</script>

<style>

</style>
