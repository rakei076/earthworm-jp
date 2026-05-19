<template>
  <section
    class="pt-28 text-gray-500"
    id="home"
  >
    <div class="mx-auto my-5 text-center">
      <div class="mb-4 inline-block">
        <span
          class="rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-200"
        >
          中→日 · JLPT N5 · 460+ 句
        </span>
      </div>
      <h2
        class="bg-gradient-to-r from-purple-600 to-rose-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:from-purple-500 dark:to-rose-300 lg:text-5xl xl:text-6xl"
      >
        造句学日语 · 句楽部
      </h2>
      <p class="mt-3 text-sm text-gray-400 dark:text-gray-500 lg:text-base">
        く・らく・ぶ — 让学日语像玩游戏一样上瘾
      </p>

      <div class="mt-8 text-sm md:text-base xl:text-lg">
        <p class="pt-2 text-center text-gray-500 dark:text-gray-300 lg:text-xl">
          看中文 → 用<span class="text-purple-400 dark:text-purple-200"> 罗马字 </span
          >打日语，自动转<span class="text-purple-400 dark:text-purple-200"> 假名汉字 </span>
        </p>
        <p class="pt-2 text-center text-gray-500 dark:text-gray-300 lg:text-xl">
          每条句子配<span class="text-purple-400 dark:text-purple-200"> 振假名 </span>与<span
            class="text-purple-400 dark:text-purple-200"
          >
            母语级 TTS 朗读
          </span>
        </p>
        <p class="pt-2 text-center text-gray-500 dark:text-gray-300 lg:text-xl">
          课程来源 <span class="text-purple-400 dark:text-purple-200">Tatoeba 真实语料</span>，按
          <span class="text-purple-400 dark:text-purple-200"> JLPT 词表 </span>筛选难度
        </p>
      </div>
    </div>
    <div class="my-10 flex flex-wrap items-center justify-center gap-4 font-customFont">
      <button
        @click="handleKeydown"
        class="btn relative"
        type="button"
      >
        <strong>開始学習</strong>
        <div id="container-stars">
          <div id="stars"></div>
        </div>

        <div id="glow">
          <div class="circle"></div>
          <div class="circle"></div>
        </div>
      </button>
      <a
        href="https://github.com/rakei076/earthworm-jp"
        rel="noreferrer noopener"
        target="_blank"
        class="group relative inline-flex h-12 cursor-pointer items-center justify-center overflow-hidden rounded-full px-6 duration-500"
      >
        <div
          class="relative inline-flex -translate-x-0 items-center transition group-hover:-translate-x-6"
        >
          <div
            class="absolute flex translate-x-0 items-center justify-center text-purple-600 opacity-100 transition group-hover:-translate-x-6 group-hover:opacity-0"
          >
            <UIcon
              name="i-ph-star-fill"
              class="h-5 w-5"
            ></UIcon>
          </div>
          <span
            class="bg-gradient-to-r from-purple-600 to-gray-300 bg-clip-text pl-6 font-medium text-transparent"
            >Star on GitHub</span
          >
          <div
            class="absolute right-0 flex translate-x-12 items-center justify-center text-purple-400 opacity-0 transition group-hover:translate-x-6 group-hover:opacity-100"
          >
            <UIcon
              name="i-ph-arrow-right"
              class="h-5 w-5"
            ></UIcon>
          </div>
        </div>
      </a>
    </div>

    <!-- 6 sample sentences as a "see what you'll learn" preview -->
    <div class="mx-auto mt-12 max-w-3xl px-4">
      <div
        class="rounded-2xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/40"
      >
        <div class="mb-3 text-center text-xs uppercase tracking-wider text-gray-400">
          课程示例 · JLPT N5
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <div
            v-for="(s, i) in sampleSentences"
            :key="i"
            class="flex items-baseline gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40"
          >
            <span class="shrink-0 text-sm text-gray-400">{{ s.cn }}</span>
            <span class="text-base text-purple-700 dark:text-purple-200">→</span>
            <span class="text-base text-gray-800 dark:text-gray-100">{{ s.jp }}</span>
          </div>
        </div>
      </div>
    </div>

    <CommonDivider class="mt-20" />
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits(["start-earthworm"]);

function handleKeydown() {
  emit("start-earthworm");
}

const sampleSentences = [
  { cn: "我是学生", jp: "私は学生です" },
  { cn: "这是书", jp: "これは本です" },
  { cn: "现在是九点", jp: "今九時です" },
  { cn: "我七点起床", jp: "私は七時に起きます" },
  { cn: "请稍等一下", jp: "ちょっと待って下さい" },
  { cn: "我想学英语", jp: "私は英語を勉強したい" },
];
</script>

<style scoped>
.btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: fit-content;
  overflow: hidden;
  height: 3rem;
  background-size: 300% 300%;
  backdrop-filter: blur(1rem);
  border-radius: 5rem;
  transition: 0.5s;
  animation: gradient_301 5s ease infinite;
  border: double 4px transparent;
  background-image: linear-gradient(#05051d, #05051d),
    linear-gradient(137.48deg, #ffdb3b 10%, #fe53bb 45%, #8f51ea 67%, #0044ff 87%);
  background-origin: border-box;
  background-clip: content-box, border-box;
}

#container-stars {
  position: absolute;
  z-index: -1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: 0.5s;
  backdrop-filter: blur(1rem);
  border-radius: 5rem;
  background-color: #05051d;
}

strong {
  z-index: 2;
  font-size: 15px;
  letter-spacing: 5px;
  color: #ffffff;
  padding: 0 1.2rem;
}

#glow {
  position: absolute;
  display: flex;
  width: 12rem;
}

.circle {
  width: 100%;
  height: 30px;
  filter: blur(2rem);
  animation: pulse_3011 4s infinite;
  z-index: -1;
}

.circle:nth-of-type(1) {
  background: rgba(254, 83, 186, 0.636);
}
.circle:nth-of-type(2) {
  background: rgba(142, 81, 234, 0.704);
}

.btn:hover #container-stars {
  z-index: 1;
  background-color: #05051d;
}
.btn:hover {
  transform: scale(1.1);
}
.btn:active {
  border: double 4px #fe53bb;
  background-origin: border-box;
  background-clip: content-box, border-box;
  animation: none;
}
.btn:active .circle {
  background: #fe53bb;
}

#stars {
  position: relative;
  background: transparent;
  width: 200rem;
  height: 200rem;
}
#stars::after {
  content: "";
  position: absolute;
  top: -10rem;
  left: -100rem;
  width: 100%;
  height: 100%;
  animation: animStarRotate 90s linear infinite;
  background-image: radial-gradient(#ffffff 1px, transparent 1%);
  background-size: 50px 50px;
}
#stars::before {
  content: "";
  position: absolute;
  top: 0;
  left: -50%;
  width: 170%;
  height: 500%;
  animation: animStar 60s linear infinite;
  background-image: radial-gradient(#ffffff 1px, transparent 1%);
  background-size: 50px 50px;
  opacity: 0.5;
}

@keyframes animStar {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-135rem);
  }
}
@keyframes animStarRotate {
  from {
    transform: rotate(360deg);
  }
  to {
    transform: rotate(0);
  }
}
@keyframes gradient_301 {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
@keyframes pulse_3011 {
  0% {
    transform: scale(0.75);
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
  }
  100% {
    transform: scale(0.75);
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
  }
}
</style>
