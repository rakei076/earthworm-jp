import type { WatchStopHandle } from "vue";

import { nextTick, reactive, ref, watchEffect } from "vue";

import type { StatementToken } from "~/api/course";
import * as wanakana from "wanakana";

interface Word {
  text: string;
  reading: string;
  isActive: boolean;
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

const inputValue = ref("");

export function clearQuestionInput() {
  inputValue.value = "";
}

export function isWord(content: string) {
  // ASCII letters/digits OR any Japanese character (hiragana, katakana,
  // CJK ideographs, full-width forms).
  return /[a-zA-Z0-9぀-ゟ゠-ヿ一-鿿＀-￯]/.test(content);
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
    updateActiveWord(getInputCursorPosition());
  }

  function setInputValue(val: string) {
    // 罗马字转假名
    const converted = wanakana.toHiragana(val, { IMEMode: true });
    inputValue.value = converted;
    resetAllWordUserInput();
    inputSyncUserInputWords();
    updateActiveWord(converted.length);
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

  function userInputWordsSyncInput() {
    inputValue.value = userInputWords.map(({ userInput }) => userInput).join("");
  }

  function inputSyncUserInputWords() {
    if (userInputWords.length === 0) return;

    const input = inputValue.value;
    let pos = 0;

    // 先按 surface 长度分配已知部分
    userInputWords.forEach((word) => {
      const len = word.text.length;
      word.userInput = input.slice(pos, pos + len);
      word.start = pos;
      word.end = pos + word.userInput.length;
      pos += len;
    });

    // 剩余输入（日语 reading 更长的情况）追加到当前 active block
    const remaining = input.slice(pos);
    if (remaining) {
      let targetIdx = userInputWords.findIndex((w) => w.userInput !== w.text);
      if (targetIdx === -1) targetIdx = userInputWords.length - 1;
      userInputWords[targetIdx].userInput += remaining;
    }
  }

  function resetAllWordUserInput() {
    userInputWords.forEach((word) => {
      word.userInput = "";
    });
  }

  function resetAllWordActive() {
    userInputWords.forEach((word) => {
      word.isActive = false;
    });
  }

  function updateActiveWord(_position: number) {
    resetAllWordActive();
    if (userInputWords.length === 0) return;

    // Find first word that's not yet fully filled correctly.
    for (let i = 0; i < userInputWords.length; i++) {
      const word = userInputWords[i];
      if (word.userInput !== word.text) {
        word.isActive = true;
        return;
      }
    }
    // All filled → highlight last as active.
    userInputWords[userInputWords.length - 1].isActive = true;
  }

  function checkWordCorrect() {
    return userInputWords.every((w) => !w.incorrect);
  }

  function markIncorrectWord() {
    userInputWords.forEach((word) => {
      word.incorrect = word.userInput !== word.text;
    });
  }

  function lastWordIsActive() {
    const len = userInputWords.length;
    return userInputWords[len - 1]?.isActive;
  }

  function findNextIncorrectWordNew() {
    if (!currentEditWord) return;
    const wordIndex = userInputWords.findIndex((w) => w.id === currentEditWord.id);
    for (let i = wordIndex + 1; i < userInputWords.length; i++) {
      if (userInputWords[i].incorrect) return userInputWords[i];
    }
  }

  function isLastIncorrectWord() {
    return !findNextIncorrectWordNew();
  }

  function getFirstIncorrectWord() {
    return userInputWords.find((w) => w.incorrect);
  }

  async function clearNextIncorrectWord(word: Word) {
    // Clear this word and everything after it from the input string.
    const before = inputValue.value.slice(0, word.start);
    inputValue.value = before;
    currentEditWord = word;
    userInputWordsSyncInput();

    await nextTick();
    setInputCursorPosition(word.start);
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
      if (first) await clearNextIncorrectWord(first);
    }
  }

  async function fixNextIncorrectWord() {
    if (mode.value === Mode.Fix_Input) {
      const next = findNextIncorrectWordNew();
      if (next) await clearNextIncorrectWord(next);
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
    const wordIndex = userInputWords.findIndex((w) => w.id === currentEditWord.id);
    for (let i = wordIndex - 1; i >= 0; i--) {
      if (userInputWords[i].incorrect) return userInputWords[i];
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

  function handleSpaceSubmitAnswer(
    useSpaceSubmitAnswer: KeyboardInputOptions["useSpaceSubmitAnswer"],
  ) {
    if (useSpaceSubmitAnswer?.enable) {
      submitAnswer(
        () => useSpaceSubmitAnswer?.rightCallback?.(),
        () => useSpaceSubmitAnswer?.errorCallback?.(),
      );
    }
  }

  interface KeyboardInputOptions {
    useSpaceSubmitAnswer?: {
      enable: boolean;
      rightCallback?: () => void;
      errorCallback?: () => void;
    };
  }

  function handleKeyboardInput(e: KeyboardEvent, options?: KeyboardInputOptions) {
    // Block arrow keys.
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
      return;
    }

    // Space-to-submit is disabled for Japanese (space is not natural input).
    // The Enter key handler in QuestionInput.vue is the primary submit path.

    // Fix mode: any key restarts editing at first incorrect token.
    if (mode.value === Mode.Fix) {
      if (e.code === "Space" || e.code === "Backspace") e.preventDefault();
      fixFirstIncorrectWord();
      inputChangedCallback?.(e);
      return;
    }

    // Backspace at empty edit slot during fix-input → jump to prev wrong token.
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
