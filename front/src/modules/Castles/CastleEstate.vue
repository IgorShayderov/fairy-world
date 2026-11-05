<template>
  <svg
    class="castle-estate"
    viewBox="0 0 900 450"
    role="img"
    aria-label="Your private castle estate, with selectable buildings"
  >
    <path
      d="M0 170 80 120 160 150 260 65 350 130 470 45 580 130 690 70 800 125 900 70V450H0Z"
      fill="#163a40"
      opacity=".6"
    />
    <path d="M0 220 140 165 260 200 410 135 540 190 710 145 900 205V450H0Z" fill="#1d4746" opacity=".6" />
    <ellipse cx="455" cy="345" rx="350" ry="90" fill="#061b24" opacity=".45" />
    <path d="m100 290 335-155 375 160-335 135Z" fill="#3c5750" stroke="#739181" stroke-width="2" />
    <path d="m100 290 375 140v15L100 305Zm375 140 335-135v15L475 445Z" fill="#253c3b" />
    <path d="m220 310 215-112 235 108-195 80Z" fill="#577063" opacity=".6" />
    <path d="m450 220 25 165m-215-72 215 72 190-80" fill="none" stroke="#b6a77a" stroke-width="16" opacity=".5" />
    <path d="m125 273 298-137 363 143v18L423 157 125 293Z" fill="#607779" />
    <path d="m125 273 298-137 363 143" fill="none" stroke="#9ba999" stroke-width="7" stroke-dasharray="14 8" />
    <g v-for="tree in trees" :key="tree.x" :transform="`translate(${tree.x} ${tree.y})`">
      <path d="M-3 0V-45H3V0" fill="#57614c" />
      <path d="M-19-19 0-61 19-19ZM-15-37 0-75 15-37Z" fill="#315c51" stroke="#72917a" stroke-width="1" />
    </g>
    <g
      v-for="plot in plots"
      :key="plot.key"
      class="estate-plot"
      :class="{ selected: selected === plot.key, unbuilt: !levels[plot.key] }"
      :transform="`translate(${plot.x} ${plot.y})`"
      role="button"
      tabindex="0"
      :aria-label="`${plot.name}, level ${levels[plot.key]}. Select building`"
      @click="emit('select', plot.key)"
      @keydown.enter.prevent="emit('select', plot.key)"
      @keydown.space.prevent="emit('select', plot.key)"
    >
      <title>{{ plot.name }} · {{ levels[plot.key] ? `Level ${levels[plot.key]}` : 'Not built' }}</title>
      <ellipse class="plot-ring" cy="12" rx="72" ry="23" fill="#142e31" stroke="#a7b190" stroke-width="1" />
      <g class="building-art" stroke="#162f35" stroke-width="2" stroke-linejoin="round">
        <template v-if="plot.key === 'keep'">
          <path d="M-55 4V-80L0-104 57-80V5L0 28Z" fill="#71888a" />
          <path d="M0-104 57-80V5L0 28Z" fill="#475f68" />
          <path d="m-61-81 61-49 64 48-64 25Z" fill="#245560" stroke="#c1ac70" />
          <path d="M-67 6V-94l23-9 20 9V20Zm94 15V-94l23-9 22 9V5Z" fill="#8da09a" />
          <path d="M-67-94-45-131-24-94-45-86Zm94 0 23-37 22 37-22 8Z" fill="#1a4854" stroke="#d4b66e" />
          <path d="M-12 21V-10q12-23 24 0v31" fill="#102b34" />
          <path d="M-51-70v16m95-16v16M-7-65v15m17-15v15" stroke="#efce7a" stroke-width="5" />
          <path d="M0-129v-40m0 0 31 9-31 10" stroke="#d6b976" fill="#61b5a5" />
        </template>
        <template v-else-if="plot.key === 'quarry'">
          <path d="m-60 3 15-48 42-13 38 16 28 52-55 19Z" fill="#637b80" />
          <path d="m-43-7 10-27 25-10 30 11 18 28-36 17Z" fill="#344d56" />
          <path d="m-28-1 20-18 25 6-5 20-27 2Z" fill="#9ab8b7" />
          <path d="m-48-31 25 12m25-39 6 23m27-7-13 20" fill="none" stroke="#bad3c9" />
          <path d="M-47 4v-70H7v51M-57-65H18M-20-65v47" fill="none" stroke="#ac956b" stroke-width="6" />
          <path d="m-25-20 5 10 6-10" fill="#dbbd75" />
        </template>
        <template v-else>
          <path d="M-55 6v-48L0-64 58-40V8L4 29Z" fill="#738981" />
          <path d="M4-23 58-40V8L4 29Z" fill="#415f61" />
          <path
            d="m-65-40 35-45 61 20 34 27L4-17Z"
            :fill="plot.key === 'forge' ? '#614b46' : '#264f59'"
            stroke="#b8a775"
          />
          <path d="m-30-85 34 68 61-21" fill="none" stroke="#8c9c8f" />
          <path d="M-30 16v-28q9-14 18 0v34" fill="#18343b" />
          <path d="M20-11v12m19-18v12" stroke="#e8c778" stroke-width="6" />
          <template v-if="plot.key === 'lumberMill'">
            <path d="m-55 13 55 21m-57-9 55 21m-52-10 48 19" stroke="#ae8653" stroke-width="9" />
            <circle cx="-13" cy="-48" r="17" fill="#819a95" stroke="#dac284" stroke-dasharray="4 3" />
            <circle cx="-13" cy="-48" r="5" fill="#28434b" />
          </template>
          <template v-if="plot.key === 'barracks'">
            <path d="M-60-35v-55m0 0 25 8-25 12" stroke="#d7bc7c" fill="#5eaaa1" />
            <path d="m32 14 12-7 12 7-12 21Z" fill="#a5c0b8" />
            <path d="M44 8v22" stroke="#31525a" />
          </template>
          <template v-if="plot.key === 'storehouse'">
            <path d="m-2 27 27-11 22 10-27 12Zm0 0v19l22 10 25-12V26M22 38v18" fill="#af9464" />
            <path d="m-2 35 24 11 23-11" fill="none" stroke="#d6c69b" />
          </template>
          <template v-if="plot.key === 'forge'">
            <path d="M19-54v-46l17-7 13 7v62" fill="#627a78" />
            <path d="M19-100 17-107l18-7 17 7-3 7" fill="#a8b4a1" />
            <path d="M-22 18V-8q14-22 27 0v36" fill="#f5ad55" />
            <path d="M-15 18-5-4 0 20" fill="#ffe2a1" />
            <path
              class="forge-smoke"
              d="M34-118q-18-19 1-35t-2-30"
              fill="none"
              stroke="#9aaca2"
              stroke-width="7"
              opacity=".4"
            />
          </template>
        </template>
      </g>
      <rect x="-81" y="35" width="162" height="25" rx="9" fill="#0c2730" stroke="#aa9867" stroke-width="1" />
      <text y="52" text-anchor="middle" fill="#ecd69b" font-size="12" font-family="Georgia, serif">
        {{ plot.name }} · {{ levels[plot.key] || 'Build' }}
      </text>
      <g v-if="construction === plot.key">
        <circle cx="58" cy="-61" r="14" fill="#dfbd70" />
        <path d="m50-61 5 5 10-10" fill="none" stroke="#16323b" stroke-width="3" />
      </g>
    </g>
  </svg>
</template>
<script setup lang="ts">
import type { BuildingKey } from './api';
defineProps<{ levels: Record<BuildingKey, number>; selected?: BuildingKey; construction?: BuildingKey | null }>();
const emit = defineEmits<{ select: [key: BuildingKey] }>();
const plots: { key: BuildingKey; name: string; x: number; y: number }[] = [
  { key: 'keep', name: 'Crownkeep', x: 440, y: 182 },
  { key: 'lumberMill', name: 'Timberwright Lodge', x: 232, y: 258 },
  { key: 'quarry', name: 'Moonstone Quarry', x: 665, y: 250 },
  { key: 'barracks', name: 'Oathguard Barracks', x: 365, y: 320 },
  { key: 'forge', name: 'Starfire Forge', x: 550, y: 320 },
  { key: 'storehouse', name: 'Vaulted Storehouse', x: 480, y: 390 },
];
const trees = [
  { x: 125, y: 250 },
  { x: 170, y: 217 },
  { x: 746, y: 251 },
  { x: 789, y: 284 },
  { x: 280, y: 188 },
  { x: 603, y: 189 },
];
</script>
<style scoped>
.castle-estate {
  display: block;
  width: 100%;
  height: auto;
  max-height: 440px;
}
.estate-plot {
  cursor: pointer;
  outline: none;
}
.building-art {
  transition: opacity 0.2s;
}
.unbuilt .building-art {
  opacity: 0.35;
}
.unbuilt .plot-ring {
  stroke-dasharray: 4 4;
}
.estate-plot:hover .plot-ring,
.estate-plot:focus-visible .plot-ring,
.selected .plot-ring {
  stroke: #f5d283;
  stroke-width: 3;
  fill: #416460;
}
.estate-plot:hover .building-art,
.estate-plot:focus-visible .building-art {
  opacity: 1;
}
.forge-smoke {
  animation: smoke 3s ease-in-out infinite alternate;
}
@keyframes smoke {
  to {
    opacity: 0.15;
    transform: translateY(-7px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .forge-smoke {
    animation: none;
  }
}
</style>
