<template>
  <span class="inline-flex flex-wrap items-end justify-center gap-0.5">
    <span
      v-for="(seg, i) in segments"
      :key="i"
      class="cursor-pointer p-1 hover:text-fuchsia-500"
      @click="emit('click-segment', seg.base)"
    >
      <ruby v-if="seg.ruby && showFurigana">
        {{ seg.base }}<rt class="text-[0.45em] font-normal text-gray-500">{{ seg.ruby }}</rt>
      </ruby>
      <template v-else>{{ seg.base }}</template>
    </span>
  </span>
</template>

<script setup lang="ts">
import type { FuriganaSegment } from "~/api/course";
import { useShowFurigana } from "~/composables/user/furigana";

defineProps<{
  segments: FuriganaSegment[];
}>();

const emit = defineEmits<{
  (e: "click-segment", text: string): void;
}>();

const { showFurigana } = useShowFurigana();
</script>
