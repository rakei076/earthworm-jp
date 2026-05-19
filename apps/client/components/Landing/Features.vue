<template>
  <div
    class="w-full flex-col pt-24"
    id="features"
  >
    <CommonTitle
      title="为什么是 句楽部"
      :description="['专为中文学习者设计的日语造句训练，把每一句都掰开揉碎']"
    />
    <section class="py-16">
      <div class="grid grid-cols-1 gap-8 md:mt-8 md:grid-cols-2 md:gap-12 lg:grid-cols-3">
        <template
          v-for="(feItem, feIndex) in FEATURES"
          :key="feIndex"
        >
          <div class="flex items-start gap-4">
            <span
              class="shrink-0 rounded-lg border border-gray-300 bg-white p-2 text-2xl text-purple-500 dark:border-gray-800 dark:bg-[#121229] dark:text-[#bea6ff]"
            >
              {{ feItem.icon }}
            </span>

            <div>
              <h2 class="text-lg font-bold dark:text-white">
                {{ feItem.title }}
              </h2>
              <p class="mt-1 text-sm leading-6 text-gray-500 opacity-90 dark:text-white">
                {{ feItem.desc }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
  <CommonDivider />
</template>

<script setup lang="ts">
const FEATURES = [
  {
    icon: "⌨️",
    title: "罗马字直接输入",
    desc: "不需要切换日语 IME。在英文键盘上敲 watashi，自动转 わたし，匹配上读音后自动显示为 私。借助 wanakana 实时转换。",
  },
  {
    icon: "🈂️",
    title: "汉字自带振假名",
    desc: "每个 token 上方实时显示假名读音（ふりがな）。kuromoji.js 离线分词，准确率比浏览器内置高一档。可一键开关。",
  },
  {
    icon: "🔊",
    title: "母语级 TTS 朗读",
    desc: "Microsoft Edge Neural TTS 在构建时预生成 MP3 朗读，浏览器直接播放音频文件，不依赖系统语音引擎。每个句子都能听原音。",
  },
  {
    icon: "📚",
    title: "Tatoeba 真实语料",
    desc: "课程句子来自 Tatoeba 开放语料库（CC-BY 2.0），都是母语者写的自然句子，不是 LLM 拼凑的，发音和用法都地道。",
  },
  {
    icon: "🎯",
    title: "按 JLPT 词表筛选",
    desc: "用 open-anki-jlpt-decks 的 JLPT N5 词表过滤，每条 N5 课程的句子都只含 N5 范围词汇。从 6 字短句到 17 字长句，按难度分组。",
  },
  {
    icon: "🧩",
    title: "Token 锁定式校验",
    desc: "原版 Earthworm 的「连词成句」逻辑改造为「连音造句」。左边的词没打对，右边的 block 锁住不亮，每个 token 必须完美匹配才能前进。",
  },
];
</script>

<style scoped></style>
