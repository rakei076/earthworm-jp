/**
 * Japanese TTS playback via Web Speech API.
 *
 * The browser ships with at least one ja-JP voice on macOS / Windows /
 * mainstream Linux distros. We:
 *   - wait for the `voiceschanged` event (Chrome's getVoices() returns []
 *     on first call until the engine warms up)
 *   - pick the first installed ja-JP voice and pin it on each utterance,
 *     so the engine doesn't fall back to a default English voice that
 *     would mangle Japanese pronunciation
 *   - log a warning once if no Japanese voice is found, so the user can
 *     see in DevTools that they need to install one
 *
 * The module-level surface (updateSource / play / usePlayWordSound)
 * stays compatible with the original Earthworm Audio-based version so the
 * englishSound/index.ts orchestrator needs no changes.
 */

const LANG = "ja-JP";

let jaVoice: SpeechSynthesisVoice | null = null;
let voiceWarned = false;

function refreshVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  // Prefer ja-JP, then any voice whose lang starts with "ja".
  jaVoice =
    voices.find((v) => v.lang === LANG) ?? voices.find((v) => v.lang.startsWith("ja")) ?? null;
  if (!jaVoice && voices.length > 0 && !voiceWarned) {
    voiceWarned = true;
    console.warn(
      "[earthworm-jp TTS] No Japanese voice installed in this browser. " +
        "Install one in your OS settings " +
        "(macOS: System Settings → Accessibility → Spoken Content → System Voice → 日本語; " +
        "Windows: Settings → Time & Language → Language → 日本語).",
    );
  }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoice();
  window.speechSynthesis.onvoiceschanged = refreshVoice;
}

function speakOnce(text: string, rate: number) {
  if (!text) return null;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  // If voices weren't ready when this module loaded, try once more.
  if (!jaVoice) refreshVoice();

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = LANG;
  if (jaVoice) utt.voice = jaVoice;
  utt.rate = rate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
  return utt;
}

function cancelAll() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

let currentText = "";

export function updateSource(src: string) {
  currentText = src;
}

export interface PlayOptions {
  times?: number;
  rate?: number;
  interval?: number;
}

const DefaultPlayOptions: Required<PlayOptions> = {
  times: 1,
  rate: 1,
  interval: 500,
};

/**
 * Play the current source. Returns a stop function.
 * When `times > 1`, replay after each utterance ends (used by dictation mode).
 */
export function play(playOptions?: PlayOptions) {
  const { times, rate, interval } = { ...DefaultPlayOptions, ...playOptions };
  if (!currentText) return () => {};

  let count = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const step = () => {
    if (cancelled) return;
    const utt = speakOnce(currentText, rate);
    count++;
    if (!utt) return;
    if (count < times) {
      utt.onend = () => {
        if (cancelled) return;
        timeoutId = setTimeout(step, interval);
      };
    }
  };

  step();

  return () => {
    cancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
    cancelAll();
  };
}

/**
 * Click-a-word handler used on the Answer screen.
 * Plays a single short utterance for the clicked token.
 */
export function usePlayWordSound() {
  let lastWord = "";
  let isPlaying = false;

  function handlePlayWordSound(word: string) {
    if (isPlaying && lastWord === word) return;
    lastWord = word;
    isPlaying = true;
    const utt = speakOnce(word, 1);
    if (utt) {
      utt.onend = () => {
        isPlaying = false;
      };
    } else {
      isPlaying = false;
    }
    // Safety: never get stuck "playing" if onend never fires.
    setTimeout(
      () => {
        isPlaying = false;
      },
      Math.max(1500, word.length * 350),
    );
  }

  return { handlePlayWordSound };
}
