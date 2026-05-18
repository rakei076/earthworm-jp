import { ref } from "vue";

const inputEl = ref<HTMLInputElement>();
const focusing = ref(true);

export function useQuestionInput() {
  function focusInput() {
    focusing.value = true;
    inputEl.value?.focus();
  }

  function blurInput() {
    focusing.value = false;
    inputEl.value?.blur();
  }

  function setInputCursorPosition(position: number) {
    inputEl.value?.setSelectionRange(position, position);
  }

  function getInputCursorPosition() {
    return inputEl.value?.selectionStart || 0;
  }

  return {
    inputEl,
    focusing,
    focusInput,
    blurInput,
    setInputCursorPosition,
    getInputCursorPosition,
  };
}

// CJK / full-width chars render at roughly 2× the width of ASCII letters in a
// monospace context. The original Earthworm used per-letter weights for
// English; for Japanese we just count full-width chars as 2 and ASCII as 1.
export function getWordWidth(word: string) {
  let width = 0;
  for (const ch of word) {
    // Full-width range: CJK ideographs, hiragana, katakana, full-width forms.
    if (/[぀-ゟ゠-ヿ一-鿿＀-￯々]/.test(ch)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  // Padding so the input has visible room for the cursor.
  return width + 1;
}
