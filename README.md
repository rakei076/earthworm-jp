<div align="center">
  <h1>Earthworm 日本語</h1>
  <p>通过造句的方式学习日语</p>
</div>

## 介绍

Earthworm 日本語版（earthworm-jp）是基于 [cuixueshe/earthworm](https://github.com/cuixueshe/earthworm)（"句乐部"）的中→日造句学习版。原项目用于中国人学英语，本版本针对**中国人学日语**：

- 中文提示 → 用日语 IME 输入对应日语句子
- 自动振假名（ふりがな）标注汉字读音
- 浏览器原生日语 TTS 朗读
- 课程内容遵循《大家的日本语》教材体系

## 关键差异（与原版 Earthworm）

| 维度     | 原版         | 日本語版                              |
| -------- | ------------ | ------------------------------------- |
| 学习方向 | 中→英        | 中→日                                 |
| 分词     | 空格分词     | kuromoji.js 形态素分析（离线烤入 DB） |
| 答案展示 | IPA 音标     | 振假名（`<ruby>` 标签）               |
| TTS      | 有道词典 API | Web Speech API（`lang=ja-JP`）        |
| 课程数据 | 星荣英语课程 | 《大家的日本语》初级                  |

## 快速启动

依赖与原项目相同，详见 [上游 README](https://github.com/cuixueshe/earthworm/blob/main/README.zh-CN.md)。

```bash
pnpm install
pnpm db:init          # 初始化 schema
pnpm db:upload        # 导入日语课程
pnpm dev:serve &      # 启动 API（端口 3002）
pnpm dev:client       # 启动 client（端口 3001）
```

## 致谢

本项目 fork 自 [cuixueshe/earthworm](https://github.com/cuixueshe/earthworm)，所有原始设计与代码版权归原作者所有。日本語版仅做了语言层面和数据层面的本地化改造。

## License

继承上游 [ISC License](./LICENSE)。
