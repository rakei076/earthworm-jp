<template>
  <div
    v-if="visible"
    class="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg bg-white p-3 text-sm shadow-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
  >
    <div class="mb-2 flex items-center justify-between">
      <span class="font-bold">🔊 TTS 诊断</span>
      <button
        class="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
        @click="visible = false"
      >
        ✕
      </button>
    </div>

    <div class="space-y-1 text-xs">
      <div>支持：{{ state.supported ? "✓" : "✗" }}</div>
      <div>所有 voice 数：{{ state.voiceCount }}</div>
      <div>日语 voice 数：{{ state.jaVoices.length }}</div>
      <div>
        已选 voice：<span class="font-mono">{{ state.pickedVoice || "(无)" }}</span>
      </div>
      <div
        v-if="state.jaVoices.length > 0"
        class="max-h-20 overflow-y-auto rounded bg-gray-100 px-2 py-1 dark:bg-gray-700"
      >
        <div
          v-for="v in state.jaVoices"
          :key="v"
          class="font-mono"
        >
          {{ v }}
        </div>
      </div>
    </div>

    <div class="mt-3 space-y-2">
      <button
        class="w-full rounded bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700"
        @click="testSpeak"
      >
        测试朗读「私は学生です」
      </button>
      <div
        class="rounded px-2 py-1 text-center text-xs"
        :class="resultClass"
      >
        {{ result }}
      </div>
    </div>
  </div>

  <!-- A small always-visible toggle so the user can find this. -->
  <button
    v-show="!visible"
    class="fixed bottom-4 right-4 z-50 h-9 w-9 rounded-full bg-purple-600 text-sm text-white shadow-lg hover:bg-purple-700"
    title="测试日语朗读"
    @click="visible = true"
  >
    🔊
  </button>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import { diagnosticState } from "~/composables/main/englishSound/audio";

const visible = ref(false);
const state = ref({
  supported: false,
  voiceCount: 0,
  jaVoices: [] as string[],
  pickedVoice: null as string | null,
});
const result = ref("（点上面按钮测试）");
const resultClass = ref("bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200");

function refresh() {
  state.value = diagnosticState();
}

onMounted(() => {
  refresh();
  // Voices may load lazily; refresh on voiceschanged.
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
  }
});

function testSpeak() {
  refresh();
  result.value = "→ 调用 speak...";
  resultClass.value = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";

  if (!state.value.supported) {
    result.value = "✗ 浏览器不支持 Web Speech API";
    resultClass.value = "bg-red-100 text-red-800";
    return;
  }
  if (state.value.jaVoices.length === 0) {
    result.value = "✗ 没有日语 voice。去系统设置下载 Kyoko 或 Otoya";
    resultClass.value = "bg-red-100 text-red-800";
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  const ja =
    voices.find((v) => v.name === "Kyoko") ??
    voices.find((v) => v.name === "Otoya") ??
    voices.find((v) => v.lang.startsWith("ja"));

  const utt = new SpeechSynthesisUtterance("私は学生です");
  utt.lang = "ja-JP";
  if (ja) utt.voice = ja;

  let started = false;
  const startTimeout = setTimeout(() => {
    if (!started) {
      result.value = `✗ 3秒内 onstart 没触发，voice="${ja?.name}" 可能未下载`;
      resultClass.value = "bg-red-100 text-red-800";
    }
  }, 3000);

  utt.onstart = () => {
    started = true;
    clearTimeout(startTimeout);
    result.value = `✓ 已开始朗读  voice="${ja?.name}"`;
    resultClass.value = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
  };
  utt.onerror = (e) => {
    started = true;
    clearTimeout(startTimeout);
    result.value = `✗ onerror: ${e.error}`;
    resultClass.value = "bg-red-100 text-red-800";
  };
  utt.onend = () => {
    if (started) {
      result.value = `✓ 已朗读完成  voice="${ja?.name}"`;
    }
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}
</script>
