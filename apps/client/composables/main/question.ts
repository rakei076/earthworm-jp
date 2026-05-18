import type { WatchStopHandle } from "vue";

import { nextTick, reactive, ref, watchEffect } from "vue";
import * as wanakana from "wanakana";

import type { StatementToken } from "~/api/course";

interface Word {
  /** Display surface, e.g. "私" or "学生" or "は". */
  text: string;
  /** Hiragana reading, e.g. "わたし" or "がくせい" or "は". */
  reading: string;
  isActive: boolean;
  /** What the block currently displays (partial hiragana, or surface if matched). */
  userInput: string;
  incorrect: boolean;
  end: number;
  start: number;
  position: number;
  id: number;
}

interface InputOptions {
  source: () => StatementToken[];
  setInputCursorPosition: (position: number) => void;
  getInputCursorPosition: () => number;
  inputChangedCallback?: (e: KeyboardEvent) => void;
}

enum Mode {
  Input = "input",
  Fix = "fix",
  Fix_Input = "fix-input",
}

/**
 * Raw user keystrokes — romaji like "watashihagakuseidesu". The hidden
 * <input> is v-model bound to this. We DERIVE hiragana for matching and
 * display, but keep the raw text here so backspace operates naturally.
 */
const inputValue = ref("");

export function clearQuestionInput() {
  inputValue.value = "";
}

export function isWord(content: string) {
  return /[a-zA-Z0-9぀-ゟ゠-ヿ一-鿿＀-￯]/.test(content);
}

/**
 * Convert raw user input → hiragana. We strip wanakana's intermediate
 * markers (like trailing "n" → "ん" vs literal n) by using IMEMode, which
 * keeps unresolved romaji chars as-is until they form a kana.
 */
export function toHiragana(raw: string) {
  return wanakana.toHiragana(raw, { IMEMode: true });
}

const mode = ref<Mode>(Mode.Input);
let currentEditWord: Word;
const userInputWords = reactive<Word[]>([]);
let stopWatchEffect: WatchStopHandle;

export function useInput({
  source,
  setInputCursorPosition,
  getInputCursorPosition,
  inputChangedCallback,
}: InputOptions) {
  function initialize() {
    stopWatchEffect && stopWatchEffect();
    mode.value = Mode.Input;
    userInputWords.length = 0;
    setupUserInputWords();
    updateActiveWord();
  }

  function setInputValue(rawInput: string) {
    inputValue.value = rawInput;
    syncBlocks(rawInput);
  }

  function createWord(token: StatementToken, id: number): Word {
    return reactive({
      text: token.surface,
      reading: token.reading,
      isActive: false,
      userInput: "",
      incorrect: false,
      start: 0,
      end: 0,
      position: 0,
      id,
    } as Word);
  }

  function setupUserInputWords() {
    stopWatchEffect = watchEffect(() => {
      resetUserInputWords();
      const tokens = source();
      if (!tokens || tokens.length === 0) return;
      tokens.forEach((token, idx) => {
        userInputWords[idx] = createWord(token, idx);
      });
      userInputWords[0].isActive = true;
    });
  }

  /**
   * Distribute the converted hiragana across tokens by reading length.
   *   - If a token's reading is fully present at its cumulative position,
   *     the block shows the SURFACE (e.g. "私") so the user sees the kanji.
   *   - Otherwise the block shows whatever hiragana fragment was typed.
   *   - Any tail that exceeds the total expected length is appended to the
   *     first unsatisfied block so over-typing stays visible (not lost).
   */
  function syncBlocks(rawInput: string) {
    if (userInputWords.length === 0) return;
    const hiragana = toHiragana(rawInput);

    let pos = 0;
    userInputWords.forEach((word) => {
      const len = word.reading.length;
      const chunk = hiragana.slice(pos, pos + len);
      if (chunk === word.reading) {
        word.userInput = word.text; // matched → show surface
      } else {
        word.userInput = chunk; // partial / wrong → show typed hiragana
      }
      word.start = pos;
      word.end = pos + chunk.length;
      pos += len;
    });

    const tail = hiragana.slice(pos);
    if (tail) {
      const idx = userInputWords.findIndex((w) => w.userInput !== w.text);
      const target = idx === -1 ? userInputWords.length - 1 : idx;
      userInputWords[target].userInput += tail;
    }

    updateActiveWord();
  }

  function resetAllWordActive() {
    userInputWords.forEach((word) => {
      word.isActive = false;
    });
  }

  function updateActiveWord() {
    resetAllWordActive();
    if (userInputWords.length === 0) return;
    for (let i = 0; i < userInputWords.length; i++) {
      const word = userInputWords[i];
      if (word.userInput !== word.text) {
        word.isActive = true;
        return;
      }
    }
    userInputWords[userInputWords.length - 1].isActive = true;
  }

  function checkWordCorrect() {
    return userInputWords.every((w) => !w.incorrect);
  }

  function markIncorrectWord() {
    // After typing, word.userInput is either the surface (matched) OR a
    // partial/wrong hiragana fragment. So a token is correct iff
    // userInput === text.
    userInputWords.forEach((word) => {
      word.incorrect = word.userInput !== word.text;
    });
  }

  function findNextIncorrectWordNew() {
    if (!currentEditWord) return;
    const i = userInputWords.findIndex((w) => w.id === currentEditWord.id);
    for (let j = i + 1; j < userInputWords.length; j++) {
      if (userInputWords[j].incorrect) return userInputWords[j];
    }
  }

  function getFirstIncorrectWord() {
    return userInputWords.find((w) => w.incorrect);
  }

  async function resetFromToken(word: Word) {
    // We can't reliably slice romaji at an arbitrary hiragana boundary
    // (multi-char romaji like "shi"/"tsu"). Easiest: clear everything from
    // the wrong token onwards by clearing the whole input. Reasonable for
    // short demo sentences.
    inputValue.value = "";
    syncBlocks("");
    currentEditWord = word;
    await nextTick();
    setInputCursorPosition(0);
    word.isActive = true;
  }

  function submitAnswer(correctCallback?: () => void, wrongCallback?: () => void) {
    if (mode.value === Mode.Fix) return;
    resetAllWordActive();
    markIncorrectWord();
    if (checkWordCorrect()) {
      mode.value = Mode.Input;
      correctCallback?.();
      inputValue.value = "";
    } else {
      mode.value = Mode.Fix;
      wrongCallback?.();
    }
  }

  async function fixFirstIncorrectWord() {
    if (mode.value === Mode.Fix) {
      mode.value = Mode.Fix_Input;
      const first = getFirstIncorrectWord();
      if (first) await resetFromToken(first);
    }
  }

  async function fixNextIncorrectWord() {
    if (mode.value === Mode.Fix_Input) {
      const next = findNextIncorrectWordNew();
      if (next) await resetFromToken(next);
    }
  }

  async function fixIncorrectWord() {
    if (mode.value === Mode.Fix) {
      await fixFirstIncorrectWord();
    } else if (mode.value === Mode.Fix_Input) {
      await fixNextIncorrectWord();
    }
  }

  function isEmptyOfCurrentEditWord() {
    return currentEditWord?.userInput.length <= 0;
  }

  function findPreviousIncorrectWord() {
    if (!currentEditWord) return;
    const i = userInputWords.findIndex((w) => w.id === currentEditWord.id);
    for (let j = i - 1; j >= 0; j--) {
      if (userInputWords[j].incorrect) return userInputWords[j];
    }
  }

  async function activePreviousIncorrectWord() {
    const prev = findPreviousIncorrectWord();
    if (prev) {
      currentEditWord = prev;
      await nextTick();
      prev.isActive = true;
      setInputCursorPosition(prev.end);
    }
  }

  interface KeyboardInputOptions {
    useSpaceSubmitAnswer?: {
      enable: boolean;
      rightCallback?: () => void;
      errorCallback?: () => void;
    };
  }

  function handleKeyboardInput(e: KeyboardEvent, _options?: KeyboardInputOptions) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
      return;
    }
    if (mode.value === Mode.Fix) {
      if (e.code === "Space" || e.code === "Backspace") e.preventDefault();
      fixFirstIncorrectWord();
      inputChangedCallback?.(e);
      return;
    }
    if (mode.value === Mode.Fix_Input && e.code === "Backspace" && isEmptyOfCurrentEditWord()) {
      e.preventDefault();
      activePreviousIncorrectWord();
      inputChangedCallback?.(e);
      return;
    }
    inputChangedCallback?.(e);
  }

  function resetUserInputWords() {
    mode.value = Mode.Input;
    inputValue.value = "";
    userInputWords.splice(0, userInputWords.length);
  }

  function isFixInputMode() {
    return mode.value === Mode.Fix_Input;
  }

  function isFixMode() {
    return mode.value === Mode.Fix;
  }

  function findWordById(id: number) {
    return userInputWords.find((word) => word.id === id);
  }

  return {
    inputValue,
    userInputWords,
    submitAnswer,
    setInputValue,
    activePreviousIncorrectWord,
    handleKeyboardInput,
    fixIncorrectWord,
    fixFirstIncorrectWord,
    resetUserInputWords,
    isFixInputMode,
    isFixMode,
    findWordById,
    initialize,
  };
}
