<template>
  <svg
    class="castle-estate"
    viewBox="0 0 1200 680"
    role="img"
    aria-label="Your private castle estate, with selectable buildings"
  >
    <defs>
      <linearGradient :id="`${artId}-sky`" x2="0" y2="1">
        <stop stop-color="#152e43" />
        <stop offset="1" stop-color="#63867b" />
      </linearGradient>
      <linearGradient :id="`${artId}-land`" x2=".3" y2="1">
        <stop stop-color="#63806b" />
        <stop offset="1" stop-color="#304e49" />
      </linearGradient>
      <linearGradient :id="`${artId}-water`" x2="1" y2="1">
        <stop stop-color="#376c79" />
        <stop offset="1" stop-color="#163c52" />
      </linearGradient>
      <pattern :id="`${artId}-stone`" width="24" height="16" patternUnits="userSpaceOnUse">
        <path d="M0 0H24M0 8H24M12 0V8M0 8V16M24 8V16" fill="none" stroke="#d4d7bb" stroke-opacity=".16" />
      </pattern>
      <pattern :id="`${artId}-tiles`" width="12" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 7H12M6 0V7" fill="none" stroke="#91b1a2" stroke-opacity=".3" />
      </pattern>
      <radialGradient :id="`${artId}-light`">
        <stop stop-color="#ffd893" stop-opacity=".45" />
        <stop offset="1" stop-color="#ffd893" stop-opacity="0" />
      </radialGradient>
    </defs>
    <g aria-hidden="true" class="estate-landscape">
      <path d="M0 0H1200V680H0Z" :fill="`url(#${artId}-sky)`" />
      <circle cx="1010" cy="82" r="105" :fill="`url(#${artId}-light)`" />
      <circle cx="1010" cy="82" r="26" fill="#e9d8a5" opacity=".65" />
      <path d="M0 197 120 104 221 164 354 45 520 183 674 69 811 168 930 105 1060 159 1200 74V680H0Z" fill="#203e4a" />
      <path
        d="m313 86 41-41 51 43-40-16-13 12-14-13Z m326 27 35-44 42 40-31-13-12 13-12-8Z"
        fill="#8caaa7"
        opacity=".4"
      />
      <path d="M0 260Q150 145 308 211T650 197 966 212 1200 174V680H0Z" fill="#2b514e" />
      <path d="M0 391Q145 270 305 318T640 283 1000 340 1200 260V680H0Z" fill="#31594f" />
      <path d="M54 383 575 142 1156 380 642 660Z" fill="#102d35" opacity=".65" />
      <path
        d="M67 363 575 130 1145 364 643 644Z"
        :fill="`url(#${artId}-water)`"
        stroke="#7aa7a0"
        stroke-opacity=".5"
        stroke-width="2"
      />
      <path d="m93 365 482-221 544 221-476 259Z" fill="none" stroke="#a5ceba" stroke-opacity=".15" stroke-width="3" />
      <path d="m111 355 465-211 525 213-460 249Z" :fill="`url(#${artId}-land)`" stroke="#82967a" stroke-width="3" />
      <!-- Broad terraces and separate districts leave room around every building. -->
      <path d="m432 234 147-67 177 72-161 79Z" fill="#8b987b" opacity=".5" />
      <path d="m174 352 133-66 116 49-134 70Zm613-25 131-66 122 51-120 81Z" fill="#7c8c6c" opacity=".5" />
      <path
        d="M592 224 604 557M300 321 600 384 920 315M380 457 600 384 832 453M604 557 640 615"
        fill="none"
        stroke="#4c574c"
        stroke-width="30"
        stroke-linejoin="round"
      />
      <path
        d="M592 224 604 557M300 321 600 384 920 315M380 457 600 384 832 453M604 557 640 615"
        fill="none"
        stroke="#b4a67d"
        stroke-width="19"
        stroke-linejoin="round"
      />
      <path
        d="M592 224 604 557M300 321 600 384 920 315M380 457 600 384 832 453"
        fill="none"
        stroke="#d5c49b"
        stroke-opacity=".3"
        stroke-width="2"
        stroke-dasharray="3 10"
      />
      <!-- Rear curtain wall, battlements and watchtowers. -->
      <path d="M122 339 576 134 1090 342V367L576 159 122 364Z" fill="#617b77" stroke="#314b4d" stroke-width="2" />
      <path d="M122 339 576 134 1090 342" fill="none" stroke="#bec0a1" stroke-width="9" stroke-dasharray="16 8" />
      <path d="M122 339 576 134 1090 342V367L576 159 122 364Z" :fill="`url(#${artId}-stone)`" />
      <!-- Gardens, orchard and training yard are scenery, not extra buildings. -->
      <g transform="translate(455 299)">
        <path d="m-30 0 46-21 48 20-46 23Z" fill="#254e43" stroke="#91a47b" stroke-width="3" />
        <path d="m-18 0 33-14 33 14-31 15Z" fill="#597c51" />
        <path d="m-5-2 4-4m12 9 4-4m8-9 4-4m10 10 4-4" stroke="#ddb578" stroke-width="4" />
      </g>
      <g transform="translate(736 310)">
        <ellipse rx="49" ry="23" fill="#284c47" stroke="#91a891" stroke-width="3" />
        <ellipse rx="38" ry="16" :fill="`url(#${artId}-water)`" />
        <path d="M-17 0 0-9 17 0 0 9Z" fill="#a7b6a3" />
        <path d="M0 0V-30" stroke="#b7ccc1" stroke-width="5" />
        <path d="M-21-1Q-18-38 0-30 18-38 21-1" fill="none" stroke="#91c6c5" stroke-width="2" />
      </g>
      <g v-for="x in [255, 280, 305]" :key="`target-${x}`" :transform="`translate(${x} 437)`">
        <path d="M0 0V-27m-9 30 9-16 9 16" stroke="#b19972" stroke-width="3" fill="none" />
        <ellipse cy="-25" rx="9" ry="13" fill="#a98462" stroke="#dbc9a3" stroke-width="2" />
        <ellipse cy="-25" rx="4" ry="6" fill="#563b33" />
      </g>
      <g
        v-for="bed in [0, 1, 2, 3]"
        :key="`field-${bed}`"
        :transform="`translate(${865 + bed * 22} ${493 - bed * 11})`"
      >
        <path d="m0 0 15-7 44 23-15 8Z" fill="#455c40" stroke="#9c9569" />
        <path d="m6-1 36 20m-30-24 36 20" stroke="#bca96d" stroke-width="2" stroke-dasharray="2 3" />
      </g>
      <path d="m617 604 43-22 51 53-46 25Z" fill="#9a8766" stroke="#c4b28b" stroke-width="2" />
      <path d="m624 613 44-23m-37 32 45-23m-37 32 44-23m-36 32 43-23" stroke="#4d5147" stroke-width="3" />
    </g>
    <g
      v-for="tree in trees"
      :key="`${tree.x}-${tree.y}`"
      :transform="`translate(${tree.x} ${tree.y}) scale(${tree.scale})`"
      aria-hidden="true"
    >
      <ellipse cy="-2" rx="21" ry="7" fill="#112e32" opacity=".4" />
      <path d="M-3 0V-45H3V0" fill="#57614c" />
      <path
        d="M-22-16 0-57 22-16ZM-18-34 0-70 18-34ZM-12-51 0-80 12-51Z"
        fill="#315c51"
        stroke="#72917a"
        stroke-width="1"
      />
      <path d="M0-80 12-51H0Zm0 10 18 36H0Zm0 13 22 41H0Z" fill="#214a45" />
    </g>
    <g
      v-for="plot in plots"
      :key="plot.key"
      class="estate-plot"
      :class="{ selected: selected === plot.key, unbuilt: !levels[plot.key] }"
      :transform="`translate(${plot.x} ${plot.y})`"
      role="button"
      tabindex="0"
      :aria-label="`${plot.name}, level ${levels[plot.key] || 0}. Select building`"
      @click="emit('select', plot.key)"
      @keydown.enter.prevent="emit('select', plot.key)"
      @keydown.space.prevent="emit('select', plot.key)"
    >
      <title>{{ plot.name }} · {{ levels[plot.key] ? `Level ${levels[plot.key]}` : 'Not built' }}</title>
      <ellipse class="plot-ring" cy="12" rx="72" ry="23" fill="#142e31" stroke="#a7b190" stroke-width="1" />
      <ellipse cx="15" cy="18" rx="73" ry="20" fill="#0a252c" opacity=".35" />
      <g class="building-art" stroke="#162f35" stroke-width="2" stroke-linejoin="round">
        <template v-if="plot.key === 'keep'">
          <path d="M-55 4V-80L0-104 57-80V5L0 28Z" fill="#71888a" />
          <path d="M0-104 57-80V5L0 28Z" fill="#475f68" />
          <path d="m-61-81 61-49 64 48-64 25Z" fill="#245560" stroke="#c1ac70" />
          <path d="M-67 6V-94l23-9 20 9V20Zm94 15V-94l23-9 22 9V5Z" fill="#8da09a" />
          <path d="M-67 6V-94l23-9 20 9V20Zm94 15V-94l23-9 22 9V5Z" :fill="`url(#${artId}-stone)`" stroke="none" />
          <path d="M-67-94-45-131-24-94-45-86Zm94 0 23-37 22 37-22 8Z" fill="#1a4854" stroke="#d4b66e" />
          <path d="M-12 21V-10q12-23 24 0v31" fill="#102b34" />
          <path d="M-51-70v16m95-16v16M-7-65v15m17-15v15" stroke="#efce7a" stroke-width="5" />
          <path d="M0-129v-40m0 0 31 9-31 10" stroke="#d6b976" fill="#61b5a5" />
          <path d="m-61-81 61-49 64 48-64 25Z" :fill="`url(#${artId}-tiles)`" stroke="none" />
          <path d="M-65-41h38m57 0h40M-64-35h38m56 0h40" stroke="#526c6c" stroke-width="3" />
          <path d="M-42-32v30l9-7 9 7v-30M32-32v30l9-7 9 7v-30" fill="#246e70" stroke="#d3b87a" stroke-width="1" />
          <path d="M-10 20V-9q10-15 20 0v29M-5-12v31m10-31v31" fill="none" stroke="#b6a37c" stroke-width="2" />
          <path d="m-18 23 18 8 20-8m-41 7 21 9 23-9" stroke="#8e9f92" stroke-width="4" />
        </template>
        <template v-else-if="plot.key.includes('Tower')">
          <path d="M-28 10V-66L0-78 28-66V10L0 24Z" fill="#718b8c" />
          <path d="M0-78 28-66V10L0 24Z" fill="#3a565f" />
          <path d="M-28 10V-66L0-78 28-66V10L0 24Z" :fill="`url(#${artId}-stone)`" />
          <template v-if="plot.key.startsWith('mage')">
            <path d="M-38-64 0-108 38-64 0-49Z" fill="#55517c" stroke="#c6a5e5" />
            <path d="m0-137 12 20-12 19-12-19Z" fill="#a6f0ef" stroke="#defcff" />
            <ellipse cy="-117" rx="25" ry="9" fill="none" stroke="#b2a1eb" opacity=".7" />
            <path d="M-15-44v22M12-41v22" stroke="#b5afff" stroke-width="5" />
          </template>
          <template v-else>
            <path d="M-35-65v-16h12v9h12v-12h22v12h12v-9h12v16L0-51Z" fill="#9aab95" stroke="#d5be7b" />
            <path d="M-17-44v22M13-40v22" stroke="#192f34" stroke-width="5" />
            <path d="M-14-88Q0-104 14-88M0-102v28m-5-6 5 6 5-6" fill="none" stroke="#dfc47e" stroke-width="3" />
          </template>
          <path d="M-8 20V-2Q0-14 8-2V20" fill="#18343b" />
        </template>
        <template v-else-if="plot.key === 'gates'">
          <path d="M-64 7V-61h29v12h70v-12h29V7L34 21V-9Q0-49-34-9v30Z" fill="#80978d" stroke="#bca776" />
          <path d="M-64 7V-61h29v12h70v-12h29V7L34 21V-9Q0-49-34-9v30Z" :fill="`url(#${artId}-stone)`" />
          <path d="M-28 18V-8Q0-40 28-8v26" fill="#1a3037" />
          <path
            d="M-20 16V-14M-10 20V-21M0 23V-24M10 20V-21M20 16V-14M-25 0H25M-25 10H25"
            stroke="#b8aa7f"
            stroke-width="3"
          />
          <path d="m-35 21 35 16 35-16 17 30-52 23-52-23Z" fill="#9c8e69" />
          <path d="M-45 48 0 68 45 48M-40 39 0 58 40 39" fill="none" stroke="#c9b688" />
        </template>
        <template v-else-if="plot.key === 'gemMine'">
          <path d="m-70 10 18-48 38-31 48 15 31 62-62 22Z" fill="#5e6e82" />
          <path d="M-28 17V-18Q0-55 28-18v35" fill="#10212f" stroke="#b89b73" stroke-width="8" />
          <path
            d="m-48-19 7-25 11 23-9 16Zm77-18 10-27 12 26-13 20ZM11-57l9-29 12 27-13 21Z"
            fill="#a294e4"
            stroke="#e6d8ff"
          />
          <path d="M-18 17-37 34M18 17 37 34M-24 23H24M-31 30H31" fill="none" stroke="#9daaad" stroke-width="3" />
          <path d="M-15-5H13L8 15H-10Z" fill="#547582" stroke="#b4bdad" />
          <circle cx="-8" cy="16" r="4" fill="#1d313d" />
          <circle cx="8" cy="16" r="4" fill="#1d313d" />
          <path d="m-8-8 7-13 7 14-7 8Z" fill="#b6e7e3" />
        </template>
        <template v-else-if="plot.key === 'quarry'">
          <path d="m-60 3 15-48 42-13 38 16 28 52-55 19Z" fill="#637b80" />
          <path d="m-43-7 10-27 25-10 30 11 18 28-36 17Z" fill="#344d56" />
          <path d="m-28-1 20-18 25 6-5 20-27 2Z" fill="#9ab8b7" />
          <path d="m-48-31 25 12m25-39 6 23m27-7-13 20" fill="none" stroke="#bad3c9" />
          <path d="M-47 4v-70H7v51M-57-65H18M-20-65v47" fill="none" stroke="#ac956b" stroke-width="6" />
          <path d="m-25-20 5 10 6-10" fill="#dbbd75" />
          <path d="m26 13 13-9 17 4-6 15-18 3Zm-84-3 14-6 14 5-6 13-19 1Z" fill="#839d9a" />
          <path d="m-9-32 5-13 6 13-5 14Zm18 7 6-14 7 15-8 13Z" fill="#87c9cf" stroke="#c6ece0" stroke-width="1" />
          <path d="M-47-8-3-62M-46-45-4-8" fill="none" stroke="#745f49" stroke-width="3" />
        </template>
        <template v-else>
          <path d="M-55 6v-48L0-64 58-40V8L4 29Z" fill="#738981" />
          <path d="M4-23 58-40V8L4 29Z" fill="#415f61" />
          <path d="M-55 6v-48L0-64 58-40V8L4 29Z" :fill="`url(#${artId}-stone)`" stroke="none" />
          <path
            d="m-65-40 35-45 61 20 34 27L4-17Z"
            :fill="plot.key === 'forge' ? '#614b46' : '#264f59'"
            stroke="#b8a775"
          />
          <path d="m-30-85 34 68 61-21" fill="none" stroke="#8c9c8f" />
          <path d="m-65-40 35-45 61 20 34 27L4-17Z" :fill="`url(#${artId}-tiles)`" stroke="none" />
          <path d="M-52-28 3-9 56-28M4-17V28M-47-28V7M48-25V11" fill="none" stroke="#ae9c72" stroke-width="3" />
          <path d="M-30 16v-28q9-14 18 0v34" fill="#18343b" />
          <path d="M20-11v12m19-18v12" stroke="#e8c778" stroke-width="6" />
          <template v-if="plot.key === 'lumberMill'">
            <path d="m-55 13 55 21m-57-9 55 21m-52-10 48 19" stroke="#ae8653" stroke-width="9" />
            <circle cx="-13" cy="-48" r="17" fill="#819a95" stroke="#dac284" stroke-dasharray="4 3" />
            <circle cx="-13" cy="-48" r="5" fill="#28434b" />
            <path d="m-61 20 17 7m-19 1 17 7m-14 3 14 6" stroke="#dfbf83" stroke-width="3" />
            <path d="M56 5h24v17H56Z" fill="#8d7450" />
            <circle cx="59" cy="23" r="6" fill="#233c3a" />
            <circle cx="77" cy="23" r="6" fill="#233c3a" />
          </template>
          <template v-if="plot.key === 'barracks'">
            <path d="M-60-35v-55m0 0 25 8-25 12" stroke="#d7bc7c" fill="#5eaaa1" />
            <path d="m32 14 12-7 12 7-12 21Z" fill="#a5c0b8" />
            <path d="M44 8v22" stroke="#31525a" />
            <path d="M16-43v27l9-6 9 6v-34" fill="#316c6c" stroke="#d5bc7b" stroke-width="1" />
            <path d="M-71 17V-11m12 33V-6m-18-8 6-12 6 12m0 5 6-12 6 12" fill="#adbbb0" />
          </template>
          <template v-if="plot.key === 'storehouse'">
            <path d="m-2 27 27-11 22 10-27 12Zm0 0v19l22 10 25-12V26M22 38v18" fill="#af9464" />
            <path d="m-2 35 24 11 23-11" fill="none" stroke="#d6c69b" />
          </template>
          <template v-if="plot.key === 'forge'">
            <ellipse cx="-8" cy="7" rx="45" ry="35" :fill="`url(#${artId}-light)`" stroke="none" />
            <path d="M19-54v-46l17-7 13 7v62" fill="#627a78" />
            <path d="M19-100 17-107l18-7 17 7-3 7" fill="#a8b4a1" />
            <path d="M-22 18V-8q14-22 27 0v36" fill="#f5ad55" />
            <path d="M-15 18-5-4 0 20" fill="#ffe2a1" />
            <path d="m49 13 34-9-5 10-10 4v10H56V17Z" fill="#90a8a6" />
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
      <g v-if="construction === plot.key">
        <circle cx="58" cy="-61" r="14" fill="#dfbd70" />
        <path
          d="M52-69h12m-12 16h12m-11-15q0 6 5 7-5 2-5 7m10-14q0 6-5 7 5 2 5 7"
          fill="none"
          stroke="#16323b"
          stroke-width="2"
        />
      </g>
    </g>
    <g aria-hidden="true" pointer-events="none">
      <path
        d="M118 355 606 588v22L118 378Zm554 233 426-231v23L672 610Z"
        fill="#546f6b"
        stroke="#29494b"
        stroke-width="2"
      />
      <path d="M118 355 606 588v22L118 378Zm554 233 426-231v23L672 610Z" :fill="`url(#${artId}-stone)`" />
      <path d="M118 355 606 588m66 0 426-231" fill="none" stroke="#a7b198" stroke-width="8" stroke-dasharray="14 8" />
    </g>
    <!-- Draw labels above every building so foreground roofs cannot cover their names. -->
    <g
      v-for="plot in plots"
      :key="`label-${plot.key}`"
      :transform="`translate(${plot.x} ${plot.y})`"
      aria-hidden="true"
      class="estate-label"
      @click="emit('select', plot.key)"
    >
      <rect
        :x="plot.key.includes('Tower') || plot.key === 'gates' ? -75 : -99"
        y="35"
        :width="plot.key.includes('Tower') || plot.key === 'gates' ? 150 : 198"
        height="25"
        rx="9"
        fill="#0c2730"
        stroke="#aa9867"
        stroke-width="1"
      />
      <text y="52" text-anchor="middle" fill="#ecd69b" font-size="12" font-family="Georgia, serif">
        {{ plot.name }} · {{ levels[plot.key] || 'Build' }}
      </text>
    </g>
  </svg>
</template>
<script setup lang="ts">
import { useId } from 'vue';

import type { BuildingKey } from './api';
const artId = `estate-${useId()}`;
defineProps<{
  levels: Partial<Record<BuildingKey, number>>;
  selected?: BuildingKey;
  construction?: BuildingKey | null;
}>();
const emit = defineEmits<{ select: [key: BuildingKey] }>();
const plots: { key: BuildingKey; name: string; x: number; y: number }[] = [
  { key: 'mageTower1', name: 'North Mage Tower', x: 576, y: 150 },
  { key: 'gemMine', name: 'Starlight Gem Mine', x: 375, y: 248 },
  { key: 'forge', name: 'Starfire Forge', x: 805, y: 248 },
  { key: 'lumberMill', name: 'Timberwright Lodge', x: 300, y: 345 },
  { key: 'quarry', name: 'Moonstone Quarry', x: 920, y: 345 },
  { key: 'keep', name: 'Crownkeep', x: 600, y: 365 },
  { key: 'arrowTower1', name: 'West Arrow Tower', x: 122, y: 355 },
  { key: 'arrowTower2', name: 'East Arrow Tower', x: 1090, y: 357 },
  { key: 'barracks', name: 'Oathguard Barracks', x: 480, y: 480 },
  { key: 'storehouse', name: 'Vaulted Storehouse', x: 800, y: 480 },
  { key: 'gates', name: 'Dawnsteel Gates', x: 290, y: 445 },
  { key: 'mageTower2', name: 'South Mage Tower', x: 640, y: 600 },
];
const trees = [
  [36, 363, 1.2],
  [67, 303, 1],
  [116, 271, 1.2],
  [165, 232, 0.9],
  [235, 211, 1.1],
  [1000, 225, 1.1],
  [1050, 255, 0.9],
  [1120, 291, 1.2],
  [1165, 343, 1.1],
  [97, 466, 1.2],
  [151, 507, 0.95],
  [221, 546, 1.2],
  [290, 590, 0.9],
  [1020, 514, 1.15],
  [1080, 476, 0.9],
  [1133, 443, 1.1],
  [940, 563, 1],
].map(([x, y, scale]) => ({ x, y, scale }));
</script>
<style scoped>
.castle-estate {
  display: block;
  width: 100%;
  height: auto;
  max-height: 440px;
}
.estate-plot,
.estate-label {
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
