<template>
  <aside class="town-character" :aria-label="`${character.name}, ${role}`">
    <div
      class="town-character-portrait"
      role="img"
      :aria-label="`${character.name} of ${character.town}`"
      :style="portraitStyle"
    />
    <div class="town-character-copy">
      <small>{{ character.town }} · {{ role }}</small>
      <strong>{{ character.name }}</strong>
      <p>“{{ character.greeting }}”</p>
    </div>
  </aside>
</template>
<script setup lang="ts">
import { computed } from 'vue';

import { useCurrentUserStore } from '@/modules/Auth/store/currentUser';

import { characterFor, type TownService } from './characters';
const props = defineProps<{ service: TownService; townName?: string }>();
const user = useCurrentUserStore();
const character = computed(() => characterFor(props.service, props.townName, user.user?.mapPosition));
const role = computed(
  () => ({ market: 'Merchant', blacksmith: 'Blacksmith', auction: 'Auctioneer', quests: 'Quest giver' })[props.service]
);
const portraitStyle = computed(() => ({
  backgroundPosition: `${(character.value.column / 3) * 100}% ${(character.value.row / 6) * 100}%`,
}));
</script>
<style scoped>
.town-character {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 18px;
  flex-shrink: 0;
  margin: 0 0 16px;
  padding: 12px 18px 12px 12px;
  border: 1px solid #bca26955;
  border-radius: 14px;
  background: linear-gradient(110deg, #1c4148, #0b202b);
  color: #d8e6e3;
  overflow: hidden;
}
.town-character-portrait {
  width: 88px;
  height: 88px;
  flex: 0 0 88px;
  border-radius: 9px;
  background-image: url('/images/towns/characters.png');
  background-size: 400% 700%;
  background-repeat: no-repeat;
  box-shadow: 0 0 0 1px #e9cd8566;
}
.town-character-copy {
  min-width: 0;
}
.town-character small {
  display: block;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a9c3c5;
}
.town-character strong {
  display: block;
  margin: 4px 0;
  font:
    600 21px/1.2 Georgia,
    serif;
  color: #f2d897;
}
.town-character p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #c0d4d2;
}
@media (max-width: 600px) {
  .town-character {
    gap: 12px;
    padding: 10px;
  }
  .town-character-portrait {
    width: 64px;
    flex-basis: 64px;
    height: 64px;
  }
  .town-character strong {
    font-size: 18px;
  }
}
</style>
