<template>
  <div class="w-full">
    <div
      class="rounded-md bg-purple-200 px-4 py-1.5 text-white dark:bg-gray-800 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8"
    >
      <p class="text-center font-medium text-black dark:text-white sm:text-left">
        {{ main_title }}
        <br class="sm:hidden" />
        {{ sub_title }}
      </p>
      <a
        class="mt-4 block rounded-lg bg-white px-5 py-3 text-center text-sm font-medium text-purple-600 transition hover:bg-white/90 hover:text-pink-500 focus:outline-none focus:ring active:text-pink-500 sm:mt-0"
        :href="link"
      >
        {{ btn_text }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  main_title: {
    type: String,
    default: "句楽部 已开放！🎉",
  },
  sub_title: {
    type: String,
    default: "现在就开始你的日语造句训练之旅",
  },
  link: {
    type: String,
    default: "https://github.com/rakei076/earthworm-jp",
  },
  btn_text: {
    type: String,
    default: "了解更多",
  },
});

const { main_title, sub_title, link, btn_text } = props;
</script>

<style scoped></style>
