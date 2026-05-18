import { describe, expect, it } from "vitest";

import { isWord, toHiragana, useInput } from "../question";

const TOKENS_私は学生です = [
  { surface: "私", reading: "わたし" },
  { surface: "は", reading: "は" },
  { surface: "学生", reading: "がくせい" },
  { surface: "です", reading: "です" },
];

const noop = () => {};
const zero = () => 0;

describe("isWord (Japanese)", () => {
  it("matches kana / kanji / ASCII", () => {
    expect(isWord("私")).toBe(true);
    expect(isWord("は")).toBe(true);
    expect(isWord("カメラ")).toBe(true);
    expect(isWord("abc")).toBe(true);
  });
});

describe("toHiragana (wanakana wrapper)", () => {
  it("converts romaji to hiragana progressively", () => {
    expect(toHiragana("wa")).toBe("わ");
    expect(toHiragana("watashi")).toBe("わたし");
    expect(toHiragana("watashiha")).toBe("わたしは");
    expect(toHiragana("watashihagakuseidesu")).toBe("わたしはがくせいです");
  });

  it("keeps unresolved trailing romaji in IME mode", () => {
    // "k" alone isn't a kana yet — wanakana leaves it pending.
    expect(toHiragana("wak")).toBe("わk");
  });
});

describe("useInput (romaji-driven, reading-matched)", () => {
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
    expect(userInputWords.map((w) => w.text)).toEqual(["私", "は", "学生", "です"]);
    expect(userInputWords.map((w) => w.reading)).toEqual(["わたし", "は", "がくせい", "です"]);
    expect(userInputWords[0].isActive).toBe(true);
  });

  it("displays typed hiragana while partial, surface once reading matches", () => {
    const { userInputWords, setInputValue } = setup();

    setInputValue("wa");
    expect(userInputWords[0].userInput).toBe("わ");

    setInputValue("watashi");
    // Full reading matched → block shows the kanji surface, not hiragana.
    expect(userInputWords[0].userInput).toBe("私");
    expect(userInputWords[1].userInput).toBe("");

    setInputValue("watashiha");
    expect(userInputWords[0].userInput).toBe("私");
    expect(userInputWords[1].userInput).toBe("は");

    setInputValue("watashihagaku");
    expect(userInputWords[0].userInput).toBe("私");
    expect(userInputWords[1].userInput).toBe("は");
    expect(userInputWords[2].userInput).toBe("がく"); // partial

    setInputValue("watashihagakusei");
    expect(userInputWords[2].userInput).toBe("学生"); // matched → surface

    setInputValue("watashihagakuseidesu");
    expect(userInputWords.map((w) => w.userInput)).toEqual(["私", "は", "学生", "です"]);
  });

  it("advances active token as readings complete", () => {
    const { userInputWords, setInputValue } = setup();
    setInputValue("watashi");
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(1);
    setInputValue("watashiha");
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(2);
    setInputValue("watashihagakusei");
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(3);
    setInputValue("watashihagakuseidesu");
    expect(userInputWords.findIndex((w) => w.isActive)).toBe(3);
  });

  it("accepts the full correct sentence on submit", () => {
    const { setInputValue, submitAnswer, userInputWords } = setup();
    setInputValue("watashihagakuseidesu");
    let ok = false;
    submitAnswer(
      () => (ok = true),
      () => {
        throw new Error("wrong-path called for correct answer");
      },
    );
    expect(ok).toBe(true);
    expect(userInputWords.every((w) => !w.incorrect)).toBe(true);
  });

  it("flags wrong reading: typing 'wo' instead of 'ha'", () => {
    const { setInputValue, submitAnswer, userInputWords } = setup();
    // 私 + を (wo) + 学生 + です  → を is wrong (expected は)
    setInputValue("watashiwogakuseidesu");
    let wrong = false;
    submitAnswer(
      () => {
        throw new Error("correct-path called for wrong answer");
      },
      () => (wrong = true),
    );
    expect(wrong).toBe(true);
    expect(userInputWords[0].incorrect).toBe(false); // 私 OK
    expect(userInputWords[1].incorrect).toBe(true); // を ≠ は
    expect(userInputWords[2].incorrect).toBe(false); // 学生 OK
    expect(userInputWords[3].incorrect).toBe(false); // です OK
  });

  it("handles unresolved trailing romaji during partial typing", () => {
    const { setInputValue, userInputWords } = setup();
    // "watashik": 私 matched, then "k" alone pending (no kana yet).
    setInputValue("watashik");
    expect(userInputWords[0].userInput).toBe("私");
    // "k" is the unresolved tail; goes into the next active block (は).
    expect(userInputWords[1].userInput).toBe("k");

    // After typing "watashiha", "は" matched.
    setInputValue("watashiha");
    expect(userInputWords[1].userInput).toBe("は");

    // "watashihagaku": tokens 私 / は matched, "がく" partial in 学生.
    setInputValue("watashihagaku");
    expect(userInputWords[2].userInput).toBe("がく");
  });

  it("handles deletion (shrinking romaji)", () => {
    const { setInputValue, userInputWords } = setup();
    setInputValue("watashihagakusei");
    expect(userInputWords[2].userInput).toBe("学生");
    setInputValue("watashihagaku");
    expect(userInputWords[2].userInput).toBe("がく");
    setInputValue("watashiha");
    expect(userInputWords[2].userInput).toBe("");
    setInputValue("");
    expect(userInputWords.every((w) => w.userInput === "")).toBe(true);
    expect(userInputWords[0].isActive).toBe(true);
  });

  it("statement swap re-initializes blocks", () => {
    const t1 = TOKENS_私は学生です;
    const t2 = [
      { surface: "今", reading: "いま" },
      { surface: "九", reading: "く" },
      { surface: "時", reading: "じ" },
      { surface: "です", reading: "です" },
    ];
    let active = t1;
    const api = useInput({
      source: () => active,
      setInputCursorPosition: noop,
      getInputCursorPosition: zero,
    });
    api.initialize();
    api.setInputValue("watashi");
    expect(api.userInputWords[0].userInput).toBe("私");
    active = t2;
    api.initialize();
    expect(api.userInputWords.map((w) => w.text)).toEqual(["今", "九", "時", "です"]);
    expect(api.userInputWords[0].userInput).toBe("");
  });
});
