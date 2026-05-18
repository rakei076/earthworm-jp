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
    // 私 + を (wo, wrong) + … — once a block doesn't match, the rest of the
    // input stays locked inside that block. The submit therefore reports
    // every later block as incorrect (empty), which is the conservative
    // behaviour: the user can't have "completed" 学生 if they never got
    // past は in the first place.
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
    expect(userInputWords[1].incorrect).toBe(true); // をがくせいです ≠ は
    expect(userInputWords[2].incorrect).toBe(true); // empty
    expect(userInputWords[3].incorrect).toBe(true); // empty
  });

  it("handles unresolved trailing romaji during partial typing", () => {
    const { setInputValue, userInputWords } = setup();
    // "watashik": 私 matched, "k" pending kana — locked inside next block.
    setInputValue("watashik");
    expect(userInputWords[0].userInput).toBe("私");
    expect(userInputWords[1].userInput).toBe("k");
    expect(userInputWords[2].userInput).toBe("");
    expect(userInputWords[3].userInput).toBe("");

    setInputValue("watashiha");
    expect(userInputWords[1].userInput).toBe("は");

    setInputValue("watashihagaku");
    expect(userInputWords[2].userInput).toBe("がく");
    expect(userInputWords[3].userInput).toBe("");
  });

  it("does NOT leak typos into the next block (the bug from the screenshot)", () => {
    // Use the 田中 statement tokens.
    const tokens = [
      { surface: "私", reading: "わたし" },
      { surface: "は", reading: "は" },
      { surface: "田中", reading: "たなか" },
      { surface: "です", reading: "です" },
    ];
    const api = useInput({
      source: () => tokens,
      setInputCursorPosition: noop,
      getInputCursorPosition: zero,
    });
    api.initialize();

    // User typo'd: tanasu (たなす) then continued kade (かで).
    // Old code would split "たなす" into block[2] and "かで" into block[3].
    // New code: block[2] holds the entire "たなすかで" until correctly fixed.
    api.setInputValue("watashihatanasukade");
    expect(api.userInputWords[0].userInput).toBe("私");
    expect(api.userInputWords[1].userInput).toBe("は");
    expect(api.userInputWords[2].userInput).toBe("たなすかで");
    expect(api.userInputWords[3].userInput).toBe("");
    expect(api.userInputWords.findIndex((w) => w.isActive)).toBe(2);

    // After backspacing back to a correct prefix:
    api.setInputValue("watashihatanaka");
    expect(api.userInputWords[2].userInput).toBe("田中");
    expect(api.userInputWords[3].userInput).toBe("");
    expect(api.userInputWords.findIndex((w) => w.isActive)).toBe(3);
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
