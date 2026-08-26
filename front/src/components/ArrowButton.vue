<template>
        <QBtn
        round
        dense
        color="white"
        text-color="grey-8"
        :icon="isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'"
        class="absolute -top-4 left-1/2 z-30 -translate-x-1/2 border border-gray-200 shadow-sm"
        @click="isExpanded = !isExpanded"
      />
</template>

<script lang="ts" setup>
import { QBtn } from 'quasar';

const $props = defineProps({

})
</script>

<style lang="scss" module></style>
