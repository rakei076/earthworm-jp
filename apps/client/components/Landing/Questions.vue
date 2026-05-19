<template>
  <section
    class="body-font overflow-hidden pt-24 text-gray-600"
    id="faq"
  >
    <CommonTitle
      title="常见问题"
      :description="[
        `句楽部 是基于 Earthworm 改造的中→日学习版`,
        `如果有问题或建议，欢迎在 GitHub 提 issue`,
      ]"
    />
    <div class="divide-y divide-gray-100 py-16 dark:divide-gray-800">
      <template
        v-for="(qsItem, qsIndex) in QUESTIONS"
        :key="qsIndex"
      >
        <details
          class="group"
          :open="qsIndex === 0"
        >
          <summary class="flex cursor-pointer items-center justify-between py-5">
            <h2 class="text-base font-medium text-black dark:text-gray-300 lg:text-lg">
              {{ qsItem.title }}
            </h2>
            <UIcon
              name="i-ph-caret-right-bold"
              class="icon h-6 w-6"
            ></UIcon>
          </summary>
          <div
            class="transition-max-height mb-4 overflow-hidden duration-500 ease-in-out dark:text-gray-500"
          >
            <template
              v-for="(asItem, asIndex) in qsItem.content"
              :key="`content-${asIndex}`"
            >
              <p class="py-2 text-sm lg:text-base">
                <span v-if="qsItem.content.length > 1">{{ asIndex + 1 }}. </span>
                {{ asItem }}
              </p>
            </template>
          </div>
        </details>
      </template>
    </div>
  </section>
  <CommonDivider />
</template>

<script setup lang="ts">
const QUESTIONS = [
  {
    title: "我需要装日语输入法吗？",
    content: [
      "不需要。直接在英文键盘上敲罗马字，wanakana 会实时转成假名，匹配上读音后自动显示对应汉字。",
      "如果你已经习惯日语 IME，也可以照常用 —— 输入的假名/汉字会通过同样的匹配逻辑处理。",
    ],
  },
  {
    title: "课程内容从哪来？版权没问题吗？",
    content: [
      "句子来自 Tatoeba（https://tatoeba.org），CC-BY 2.0 协议的开放语料库，每条都是社区贡献的真实日语句子。",
      "词表用的是 jamsinclair/open-anki-jlpt-decks，MIT 协议的 JLPT N5 词表。",
      "TTS 朗读由 Microsoft Edge Neural TTS 离线生成 MP3 文件（ja-JP-NanamiNeural），免费、无限制。",
    ],
  },
  {
    title: "为什么不直接用浏览器的日语 TTS？",
    content: [
      "Web Speech API 在不同系统上不稳定，macOS 上的 Siri 风格 voice 必须显式下载才有声音。",
      "句楽部 在构建时用 Edge Neural TTS 把每条句子预生成 MP3，直接当静态文件播放，任何浏览器都能听。",
    ],
  },
  {
    title: "「句楽部」这名字什么意思？",
    content: [
      "致敬上游开源项目「句乐部」（cuixueshe/earthworm），日语写法是「句楽部」(KuRakuBu)，意思是「造句俱乐部」。",
      "「楽」在日语里同时有「音乐」「快乐」「轻松」的意思，正好对应这个学习工具的定位。",
    ],
  },
  {
    title: "和原版 Earthworm 有什么区别？",
    content: [
      "学习方向: 原版 中→英，句楽部 中→日",
      "分词逻辑: 原版按空格切单词，句楽部 用 kuromoji.js 离线把日语句子切成 token",
      "校验逻辑: 原版按英文单词大小写匹配，句楽部 按 token 读音匹配（reading），匹配上才显示汉字",
      "答案展示: 原版只有 IPA 音标，句楽部 给每个汉字加振假名 + 一键开关",
      "语音: 原版用有道词典 URL，句楽部 用预生成的 Edge Neural TTS MP3",
    ],
  },
  {
    title: "怎么贡献课程内容 / 报 bug？",
    content: [
      "GitHub: https://github.com/rakei076/earthworm-jp",
      "课程内容是脚本生成的，改 packages/xingrong-courses/scripts/build-jlpt-packs.ts 的过滤规则就能换内容池。",
      "想加 N4 / N3 课程包：换词表 CSV + 调长度桶，重跑 build:jlpt 即可。",
    ],
  },
];
</script>

<style scoped>
.icon {
  transition: transform 0.5s ease;
}

details[open] .icon {
  transform: rotate(90deg);
}

.transition-max-height {
  max-height: 0;
  transition: max-height 0.5s ease-in-out;
}

details[open] .transition-max-height {
  max-height: 800px;
}
</style>
