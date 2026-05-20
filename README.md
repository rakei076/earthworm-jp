<div align="center">

# 句楽部 · KuRakuBu

**让中文母语者通过造句训练学日语**

用罗马字打字 → 实时转假名 → 匹配读音 → 自动显示汉字 → 每句配神经 TTS 朗读 · 振假名标注 · JLPT 分级课程

[特性](#特性) · [快速开始](#快速开始) · [项目结构](#项目结构) · [致谢](#致谢)

</div>

---

## 是什么

「句楽部」是一个**专为中文母语者**设计的开源日语造句训练工具，基于
[cuixueshe/earthworm](https://github.com/cuixueshe/earthworm)（"句乐部"，中→英学习工具）改造。

工作流非常简单：

1. 屏幕显示中文 → 例如「我是学生」
2. 你在英文键盘上敲罗马字 → `watashihagakuseidesu`
3. 句子被自动切成 token，每个 token 上方显示读音 → `わたし は がくせい です`
4. 读音匹配上，对应 block 自动从假名翻成汉字 → **私は学生です**
5. Enter 提交 → Microsoft Neural TTS 朗读原音

---

## 特性

|                            |                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ⌨️ **不用切日语 IME**      | 罗马字直接打字，[wanakana](https://github.com/WaniKani/WanaKana) 实时转假名                                        |
| 🈂️ **振假名标注**          | [kuromoji.js](https://github.com/takuyaa/kuromoji.js) 离线形态素分析，每个汉字配假名读音                           |
| 🔊 **母语级 TTS**          | [Edge Neural TTS](https://github.com/rany2/edge-tts) 构建时预生成 MP3，跨浏览器跨系统稳定播放                      |
| 📚 **真实语料**            | 句子来自 [Tatoeba](https://tatoeba.org)，CC-BY 2.0，母语者贡献 + 多人校验                                          |
| 🎯 **JLPT 分级**           | 用 [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) 词表过滤，N5 463 句、5 个分难度课包 |
| 🧩 **Token 锁定**          | 左边的词没打对，右边的 block 锁住不亮，强制每步都对                                                                |
| 🎮 **保留 Earthworm 玩法** | 进度记录、错词修复模式、键盘音效、键位自定义一应俱全                                                               |

---

## 课程内容

当前 478 句，6 个课包：

| 课包                  | 句数 | Lesson | 范围     |
| --------------------- | ---- | ------ | -------- |
| 大家的日本语 · 第一课 | 15   | 1      | 入门示例 |
| JLPT N5 · 入门短句    | 100  | 5 × 20 | 6-7 字   |
| JLPT N5 · 日常基础    | 100  | 5 × 20 | 8-9 字   |
| JLPT N5 · 简单造句    | 100  | 5 × 20 | 10-11 字 |
| JLPT N5 · 复合句型    | 100  | 5 × 20 | 12-14 字 |
| JLPT N5 · 进阶练习    | 63   | 4 × 15 | 15+ 字   |

加 N4 / N3 课包：换 `n5.csv` → `n4.csv`，调长度桶，跑 `pnpm build:jlpt` 即可。

---

## 快速开始

依赖与上游 Earthworm 相同。详情见上游
[README](https://github.com/cuixueshe/earthworm/blob/main/README.zh-CN.md)。

```bash
# 一次性环境
brew install postgresql@16 redis colima
brew services start postgresql@16 redis
colima start --cpu 2 --memory 4

# 项目启动
pnpm install
pnpm db:init           # 建 schema
pnpm db:upload         # 灌课程数据
pnpm dev:serve &       # API → :3002
pnpm dev:client        # Client → :3001
```

打开 http://localhost:3001 选课包开始练。

### 扩展课程内容

```bash
cd packages/xingrong-courses

# ── A. Tatoeba 挖掘（自动筛 N5 / N4 句子） ──
pnpm build:jlpt
# 产出 data/courses/jlpt-n5-*.json + jlpt-n4-*.json

# ── B. LLM 按 curriculum 生成（需要 Anthropic API key） ──
export ANTHROPIC_API_KEY=sk-ant-...
pnpm gen:llm n4-grammar           # 读 data/curriculum/n4-grammar.yaml
# 产出 data/source/llm-<lesson>.yaml
pnpm build:japanese               # 跑 kuromoji 把 source YAML → course JSON

# ── C. 给所有新句子生成 MP3 + 写入 DB ──
python3 -m venv .venv && .venv/bin/pip install edge-tts
.venv/bin/python scripts/generate-audio.py
# 在 src/seed.ts 的 PACK_METADATA 加上新 pack 的标题/描述/order
cd ../.. && pnpm db:upload
```

三条扩展路径：

| 路径           | 适合                               | 输入                              | 输出                         |
| -------------- | ---------------------------------- | --------------------------------- | ---------------------------- |
| **build:jlpt** | 想要规模、对内容主题不挑           | Tatoeba 14k 句对 + JLPT 词表      | 数百句按长度分包             |
| **gen:llm**    | 想要按语法点 / 主题 / 风格定向生成 | `data/curriculum/*.yaml` 课程规格 | 每个 lesson 一个 source YAML |
| **手写**       | 教材精选、想百分百控制             | 直接编辑 `data/source/*.yaml`     | 同上                         |

三种产物最后都会被 `build:japanese` / `generate-audio.py` / `db:upload` 统一处理。

---

## 技术栈

```
前端       Nuxt 3 + Vue 3 + Pinia + TailwindCSS + daisyUI
后端       NestJS + Drizzle ORM + Logto (auth)
数据库     PostgreSQL 16, Redis
分词       kuromoji.js (offline, ipadic)
转换       wanakana (romaji ↔ kana 实时转换)
TTS        Microsoft Edge Neural Voice (ja-JP-NanamiNeural)
数据源     Tatoeba 平行语料 + JLPT N5 词表
```

---

## 项目结构

```
earthworm-jp/
├── apps/
│   ├── client/                   # Nuxt 3 前端
│   │   ├── components/
│   │   │   ├── Landing/          # 首页营销组件（已为日语版重写）
│   │   │   ├── main/
│   │   │   │   ├── Furigana.vue           # 振假名 <ruby> 渲染
│   │   │   │   └── QuestionInput/         # 罗马字输入逻辑
│   │   │   └── ...
│   │   ├── composables/main/
│   │   │   ├── question.ts                # token 锁定校验逻辑
│   │   │   └── englishSound/audio.ts      # HTML5 Audio + MP3 播放
│   │   └── public/audio/                  # 478 个预生成 MP3
│   └── api/                      # NestJS 后端
├── packages/
│   ├── schema/                   # Drizzle schema (statement.ts 加了 tokens/furigana/audioPath)
│   ├── db/                       # DB 初始化
│   ├── xingrong-courses/
│   │   ├── data/
│   │   │   ├── courses/                   # 课程包 JSON
│   │   │   ├── tatoeba-cache/             # Tatoeba 原始数据（gitignored）
│   │   │   └── jlpt-cache/                # JLPT 词表
│   │   ├── scripts/
│   │   │   ├── build-jlpt-packs.ts        # 数据筛选 + 分包
│   │   │   ├── build-japanese.ts          # 单文件 kuromoji 分词
│   │   │   └── generate-audio.py          # Edge TTS 批量生成 MP3
│   │   └── src/seed.ts                    # 课程包 → DB seeding
│   └── game-data-sdk/
└── docker-compose.yml            # Postgres / Redis / Logto
```

---

## 设计取舍

### 不用浏览器原生 TTS

`speechSynthesis.speak()` 在多数 macOS 上对 Siri 风格的日语 voice 没有声音
（需要单独下载），且不同浏览器对 voice 列表的处理不一致。我们改为**构建时**用
Edge Neural TTS 生成 MP3 静态文件，运行时纯用 HTML5 Audio 播放——任何浏览器
都能稳定出声。

### 不用系统日语 IME

让中文用户额外装日语输入法不友好。直接绕开 OS 的 IME，用 `wanakana` 在前端
把罗马字实时转假名，再按 `token.reading` 匹配判定。

### Token 锁定校验

原版 Earthworm 按空格切词后逐词比较。日语无空格，我们把 token 边界做成
"严格闸门"：左边 token 没完全对，所有后续输入都锁在当前 block 里，不溢出
到下一个 token。打错了直接退格修就行。

---

## 致谢

句楽部 站在巨人的肩膀上。

- **[cuixueshe/earthworm](https://github.com/cuixueshe/earthworm)** —— 原作者 cuixiaorui 把"造句学外语"做成了爽到上瘾的游戏体验
- **[Tatoeba Project](https://tatoeba.org)** —— 提供了开放的中日平行语料库（CC-BY 2.0）
- **[jamsinclair/open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks)** —— MIT 协议的 JLPT N5-N1 词表
- **[kuromoji.js](https://github.com/takuyaa/kuromoji.js)** —— 浏览器/Node 双端的日语形态素分析器
- **[wanakana](https://github.com/WaniKani/WanaKana)** —— WaniKani 团队的罗马字↔假名转换库
- **[edge-tts](https://github.com/rany2/edge-tts)** —— 让 Microsoft Edge Neural Voice 在 Python 里能调

---

## License

[ISC](./LICENSE)（继承自上游 Earthworm）。

数据集另有协议：

- Tatoeba 句子：[CC-BY 2.0](https://creativecommons.org/licenses/by/2.0/)
- JLPT 词表：[MIT](https://github.com/jamsinclair/open-anki-jlpt-decks/blob/main/LICENSE)
