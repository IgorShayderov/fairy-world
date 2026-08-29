<template>
  <QBtn
    round
    dense
    color="white"
    text-color="grey-8"
    :icon="modelValue ? 'keyboard_arrow_down' : 'keyboard_arrow_up'"
    class="border border-gray-200"
    @click="modelValue = !modelValue"
  />
</template>

<script setup lang="ts">
import { QBtn } from 'quasar';

const modelValue = defineModel<boolean>({
  required: true,
});
</script>

