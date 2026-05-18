<template>
  <div class="text-center">
    <div class="ml-8 inline-flex flex-wrap items-center justify-center gap-1 text-5xl">
      <MainFurigana
        v-if="courseStore.currentStatement?.furigana"
        :segments="courseStore.currentStatement.furigana"
        @click-segment="handlePlayWordSound"
      />
      <UIcon
        name="i-ph-speaker-simple-high"
        class="ml-1 inline-block h-7 w-7 cursor-pointer text-gray-500 hover:text-fuchsia-500"
        @click="handlePlayEnglishSound"
      ></UIcon>
    </div>
    <div class="my-6 text-xl text-gray-500">
      {{ courseStore.currentStatement?.chinese }}
    </div>
    <div class="space-y-3">
      <div>
        <button
          class="btn btn-outline btn-sm"
          @click="showQuestion"
        >
          再来一次
        </button>
        <button
          class="btn btn-outline btn-sm ml-6"
          @click="goToNextQuestion"
        >
          下一题
        </button>
      </div>
      <div class="md:hidden">
        <MainMasteredBtn></MainMasteredBtn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

import { useCurrentStatementEnglishSound } from "~/composables/main/englishSound";
import { usePlayWordSound } from "~/composables/main/englishSound/audio";
import { useGameMode } from "~/composables/main/game";
import { useAutoPronunciation } from "~/composables/user/sound";
import { useCourseStore } from "~/store/course";
import { cancelShortcut, registerShortcut } from "~/utils/keyboardShortcuts";
import { useAnswer } from "./QuestionInput/useAnswer";

const courseStore = useCourseStore();
const { handlePlayWordSound } = usePlayWordSound();
const { handlePlayEnglishSound } = usePlayEnglishSound();
const { showQuestion } = useGameMode();
const { isAutoPlaySound } = useAutoPronunciation();
const { goToNextQuestion } = useAnswer();

registerShortcutKeyForNextQuestion();

function usePlayEnglishSound() {
  const { playSound } = useCurrentStatementEnglishSound();

  onMounted(() => {
    if (isAutoPlaySound()) {
      playSound();
    }
  });

  function handlePlayEnglishSound() {
    playSound();
  }

  return {
    handlePlayEnglishSound,
  };
}

function registerShortcutKeyForNextQuestion() {
  function handleKeydown(e: KeyboardEvent) {
    e.preventDefault(); // 阻止到下一个页面的默认按键动作
    goToNextQuestion();
  }
  onMounted(() => {
    registerShortcut(" ", handleKeydown);
    registerShortcut("enter", handleKeydown);
  });

  onUnmounted(() => {
    cancelShortcut(" ", handleKeydown);
    cancelShortcut("enter", handleKeydown);
  });
}
</script>
