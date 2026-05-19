<template>
  <div
    class="mt-16 w-full flex-col"
    id="what"
  >
    <CommonTitle
      title="什么是 句楽部？"
      :description="['开源、可改造、对中文母语者特别友好的日语造句训练工具']"
    />
    <section class="flex w-full flex-col justify-around gap-6 py-8 lg:flex-row">
      <div
        class="flex h-[420px] w-full flex-shrink-0 items-center justify-center rounded-2xl border border-gray-700 bg-[#111128] lg:w-[45%]"
      >
        <div
          class="hide-scrollbar h-[96%] w-[97%] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-700 bg-[#17172e] px-5 py-4"
        >
          <h2 class="mb-3 rounded-lg bg-[#232339] py-4 text-center text-xl font-bold">怎么练？</h2>

          <h3 class="pb-2 text-base font-semibold">1. 看中文，敲罗马字</h3>
          <p class="py-1 leading-7">
            题目展示中文「<span class="text-purple-300">我是学生</span
            >」，期望日语是「私は学生です」。你在英文键盘上敲
            <code class="rounded bg-gray-700 px-1 py-0.5 text-xs">watashihagakuseidesu</code
            >，每个字母实时转假名。
          </p>

          <h3 class="py-2 text-base font-semibold">2. 读音匹配自动变汉字</h3>
          <p class="py-1 leading-7">
            打到 <code class="rounded bg-gray-700 px-1 text-xs">watashi</code>，block 显示
            <span class="text-base text-purple-300">わたし</span
            >；继续打，匹配上「私」的读音后，block 自动翻成「<span class="text-base text-purple-300"
              >私</span
            >」并跳到下一个 token。
          </p>

          <h3 class="py-2 text-base font-semibold">3. 卡住有提示</h3>
          <p class="py-1 leading-7">
            每个 token 上方写着读音（振假名
            ふりがな）。学到一半忘了汉字怎么念，瞄一眼就够。可全局开关。
          </p>

          <h3 class="py-2 text-base font-semibold">4. 听原音强化</h3>
          <p class="py-1 leading-7">
            Enter 提交后自动播放 Microsoft Neural TTS 朗读，听写口语一起练。Ctrl+'
            可以任意时刻重播。
          </p>

          <h2 class="mb-3 mt-6 rounded-lg bg-[#232339] py-4 text-center text-xl font-bold">
            快捷键
          </h2>
          <p class="p-1"><button class="instruction-btn">Enter</button> 提交答案 / 下一题</p>
          <p class="p-1"><button class="instruction-btn">⌃ Ctrl+'</button> 播放/重播朗读</p>
          <p class="p-1"><button class="instruction-btn">⌃ Ctrl+;</button> 显示/隐藏答案</p>
          <p class="p-1"><button class="instruction-btn">⌃ Ctrl+M</button> 标记为掌握</p>
        </div>
      </div>

      <div
        class="flex h-[420px] w-full flex-shrink-0 items-center justify-center rounded-2xl border border-gray-700 bg-[#111128] lg:w-[45%]"
      >
        <div
          class="hide-scrollbar h-[96%] w-[97%] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-700 bg-[#17172e] px-5 py-4"
        >
          <h2 class="mb-3 rounded-lg bg-[#232339] py-4 text-center text-xl font-bold">学习理念</h2>

          <h3 class="pb-2 text-base font-semibold">以句子为单位</h3>
          <p class="py-1 leading-7">
            背单词容易忘。把单词放在自然的句子里反复造，词汇 + 语法 + 助词用法一起练，记忆更稳。
          </p>

          <h3 class="py-2 text-base font-semibold">i+1 原则</h3>
          <p class="py-1 leading-7">
            课程按句长分难度。第一包 6-8 字短句巩固基础语序，逐级加长到 17+
            字复合句，每一步都是「比上一个稍微难一点」。
          </p>

          <h3 class="py-2 text-base font-semibold">真实语料，不是 AI 编的</h3>
          <p class="py-1 leading-7">
            每条句子都来自
            <a
              href="https://tatoeba.org"
              target="_blank"
              class="text-[#3498db] hover:text-theme-dark"
              >Tatoeba</a
            >
            的真实平行语料（CC-BY 2.0），都是母语者贡献并多人校验过的自然句子。
          </p>

          <h3 class="py-2 text-base font-semibold">N5 词表过滤</h3>
          <p class="py-1 leading-7">
            用 kuromoji.js 形态素分析每条 Tatoeba 句子，确保每个内容词都在
            <a
              href="https://github.com/jamsinclair/open-anki-jlpt-decks"
              target="_blank"
              class="text-[#3498db] hover:text-theme-dark"
              >JLPT N5 词表</a
            >
            内。N5 学完再扩 N4 / N3 一键就成。
          </p>

          <h3 class="py-2 text-base font-semibold">不和你的输入法抢</h3>
          <p class="py-1 leading-7">
            直接绕开系统 IME，用 wanakana 在前端把罗马字实时转假名。不用切日语键盘，不用装语音包。
          </p>
        </div>
      </div>
    </section>
  </div>
  <CommonDivider />
</template>

<script setup lang="ts"></script>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
}
.hide-scrollbar::-webkit-scrollbar-thumb {
  background-color: transparent;
}
.instruction-btn {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 2px;
  background: #232339;
  border: 1px solid #393968;
  border-radius: 4px;
  font-size: 12px;
  color: #c0c0d6;
}
</style>
