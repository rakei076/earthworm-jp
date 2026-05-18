import { describe, expect, it } from "vitest";

import { isWord, useInput } from "../question";

const TOKENS_私は学生です = [
  { surface: "私", reading: "わたし" },
  { surface: "は", reading: "は" },
  { surface: "学生", reading: "がくせい" },
  { surface: "です", reading: "です" },
];

const noop = () => {};
const zero = () => 0;

describe("isWord (Japanese)", () => {
  it("matches hiragana / katakana / kanji / ASCII", () => {
    expect(isWord("私")).toBe(true);
    expect(isWord("は")).toBe(true);
    expect(isWord("カメラ")).toBe(true);
    expect(isWord("abc")).toBe(true);
  });

  it("rejects spaces and pure punctuation", () => {
    expect(isWord(" ")).toBe(false);
    expect(isWord("、")).toBe(false);
    expect(isWord("。")).toBe(false);
  });
});

describe("useInput (Japanese token-based)", () => {
  function setup(tokens = TOKENS_私は学生です) {
    const api = useInput({
      source: () => tokens,
      setInputCursorPosition: noop,
      getInputCursorPosition: zero,
    });
    api.initialize();
    return api;
  }

  it("creates one Word per token, first one active", () => {
    const { userInputWords } = setup();
    expect(userInputWords.length).toBe(4);
    expect(userInputWords.map((w) => w.text)).toEqual(["私", "は", "学生", "です"]);
    expect(userInputWords.map((w) => w.reading)).toEqual(["わたし", "は", "がくせい", "です"]);
    expect(userInputWords[0].isActive).toBe(true);
    expect(userInputWords[1].isActive).toBe(false);
  });

  it("distributes typed chars to tokens by cumulative length", () => {
    const { userInputWords, setInputValue } = setup();

    setInputValue("私");
    expect(userInputWords.map((w) => w.userInput)).toEqual(["私", "", "", ""]);

    setInputValue("私は");
    expect(userInputWords.map((w) => w.userInput)).toEqual(["私", "は", "", ""]);

    setInputValue("私は学生");
    expect(userInputWords.map((w) => w.userInput)).toEqual(["私", "は", "学生", ""]);

    setInputValue("私は学生です");
    expect(userInputWords.map((w) => w.userInput)).toEqual(["私", "は", "学生", "です"]);
  });

  it("advances active token as user types", () => {
    const { userInputWords, setInputValue } = setup();

    setInputValue("私");
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(1); // は

    setInputValue("私は");
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(2); // 学生

    setInputValue("私は学");
    // 学生 not yet fully typed (only 1 of 2 chars)
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(2);

    setInputValue("私は学生");
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(3); // です

    setInputValue("私は学生です");
    // All filled → last token stays active.
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(3);
  });

  it("submitAnswer accepts the correct full sentence", () => {
    const { setInputValue, submitAnswer, userInputWords } = setup();
    setInputValue("私は学生です");
    let correctCalled = false;
    submitAnswer(
      () => {
        correctCalled = true;
      },
      () => {
        throw new Error("wrong path called for correct answer");
      },
    );
    expect(correctCalled).toBe(true);
    expect(userInputWords.every((w) => !w.incorrect)).toBe(true);
  });

  it("submitAnswer flags wrong tokens", () => {
    const { setInputValue, submitAnswer, userInputWords } = setup();
    // Typed 私 _ 学生 で  (where _ is wrong)
    setInputValue("私を学生です");
    let wrongCalled = false;
    submitAnswer(
      () => {
        throw new Error("correct path called for wrong answer");
      },
      () => {
        wrongCalled = true;
      },
    );
    expect(wrongCalled).toBe(true);
    expect(userInputWords[0].incorrect).toBe(false); // 私 OK
    expect(userInputWords[1].incorrect).toBe(true); // を ≠ は
    expect(userInputWords[2].incorrect).toBe(false); // 学生 OK
    expect(userInputWords[3].incorrect).toBe(false); // です OK
  });

  it("partial input does not mark words as correct prematurely", () => {
    const { setInputValue, submitAnswer, userInputWords } = setup();
    setInputValue("私は"); // only first two tokens filled
    submitAnswer(noop, noop);
    expect(userInputWords[0].incorrect).toBe(false);
    expect(userInputWords[1].incorrect).toBe(false);
    expect(userInputWords[2].incorrect).toBe(true); // empty ≠ 学生
    expect(userInputWords[3].incorrect).toBe(true); // empty ≠ です
  });

  it("simulates IME composition: incremental commits", () => {
    // Real IME flow: user commits one composition unit at a time.
    // Between compositions, inputValue grows.
    const { setInputValue, userInputWords } = setup();
    const commits = ["私", "私は", "私は学生", "私は学生です"];
    for (const v of commits) {
      setInputValue(v);
    }
    expect(userInputWords.map((w) => w.userInput).join("")).toBe("私は学生です");
  });

  it("handles statement change mid-input (re-initialize)", () => {
    const tokens1 = TOKENS_私は学生です;
    const tokens2 = [
      { surface: "今", reading: "いま" },
      { surface: "九", reading: "く" },
      { surface: "時", reading: "じ" },
      { surface: "です", reading: "です" },
    ];
    let active = tokens1;
    const api = useInput({
      source: () => active,
      setInputCursorPosition: noop,
      getInputCursorPosition: zero,
    });
    api.initialize();
    api.setInputValue("私は");
    expect(api.userInputWords[0].userInput).toBe("私");

    active = tokens2;
    api.initialize(); // simulates statement change
    expect(api.userInputWords.map((w) => w.text)).toEqual(["今", "九", "時", "です"]);
    expect(api.userInputWords[0].userInput).toBe("");
  });

  it("handles backspace-style deletion (shrinking input)", () => {
    const { setInputValue, userInputWords } = setup();
    setInputValue("私は学生");
    expect(userInputWords[2].userInput).toBe("学生");

    setInputValue("私は学");
    expect(userInputWords[2].userInput).toBe("学");

    setInputValue("私は");
    expect(userInputWords[2].userInput).toBe("");

    setInputValue("私");
    expect(userInputWords[1].userInput).toBe("");

    setInputValue("");
    expect(userInputWords[0].userInput).toBe("");
    expect(userInputWords[0].isActive).toBe(true);
  });
});
