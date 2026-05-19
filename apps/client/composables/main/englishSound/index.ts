import { watchEffect } from "vue";

import type { PlayOptions } from "./audio";
import { useToolbar } from "~/composables/main/dictation";
import { useGamePlayMode } from "~/composables/user/gamePlayMode";
import { useCourseStore } from "~/store/course";
import { play, updateSource } from "./audio";

let lastAudioKey = "";
export function useCurrentStatementEnglishSound() {
  const courseStore = useCourseStore();
  const { toolBarData } = useToolbar();
  const { isDictationMode } = useGamePlayMode();

  watchEffect(() => {
    const text = courseStore.currentStatement?.japanese ?? "";
    const audioPath = courseStore.currentStatement?.audioPath ?? null;
    const key = `${text}|${audioPath ?? ""}`;
    if (key !== lastAudioKey) {
      updateSource(text, audioPath);
      lastAudioKey = key;
    }
  });

  return {
    playSound: (options?: PlayOptions) => {
      if (isDictationMode()) {
        const { times, rate, interval } = toolBarData;
        return play({ times, rate, interval });
      } else {
        return play(options);
      }
    },
  };
}

// Read one sentence per day aloud (Web Speech fallback only — these
// helpers are called from contexts that don't carry the statement's
// pre-generated audioPath).
export function readOneSentencePerDayAloud(str: string) {
  updateSource(str, null);
  play();
}

export function playEnglish(text: string) {
  updateSource(text, null);
  play();
}
