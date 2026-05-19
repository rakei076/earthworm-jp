/**
 * Japanese TTS playback via Web Speech API.
 *
 * Pitfalls we deal with:
 *   1. Chrome lazy-loads voices → handle `voiceschanged`.
 *   2. macOS lists Siri-style voices (Eddy / Flo / Grandma / Grandpa) in
 *      getVoices() even when they haven't been downloaded — using them
 *      produces NO audio. We explicitly prefer Kyoko / Otoya, the legacy
 *      voices that ship with every macOS install, and fall back to any
 *      other ja voice only if those aren't present.
 *   3. Some chrome builds silently drop a speak() that fires too early,
 *      with no error event. We surface onstart / onend / onerror through
 *      console.debug so we can confirm playback in DevTools.
 */

const LANG = "ja-JP";
const RELIABLE_VOICE_NAMES = ["Kyoko", "Otoya"];

let jaVoice: SpeechSynthesisVoice | null = null;
let voiceWarned = false;

function refreshVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  const ja = voices.filter((v) => v.lang.startsWith("ja"));

  // 1) Try the always-installed legacy macOS voices first — they actually
  //    produce sound out of the box. Siri-style voices may be undownloaded.
  jaVoice =
    RELIABLE_VOICE_NAMES.map((n) => ja.find((v) => v.name === n)).find(Boolean) ?? ja[0] ?? null;

  if (!jaVoice && voices.length > 0 && !voiceWarned) {
    voiceWarned = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[earthworm-jp TTS] No Japanese voice installed. " +
        "macOS: System Settings → Accessibility → Spoken Content → System Voice → 管理声音 → 下载 Kyoko or Otoya.",
    );
  }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoice();
  window.speechSynthesis.onvoiceschanged = refreshVoice;
}

function speakOnce(text: string, rate: number): SpeechSynthesisUtterance | null {
  if (!text) return null;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (!jaVoice) refreshVoice();

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = LANG;
  if (jaVoice) utt.voice = jaVoice;
  utt.rate = rate;

  // Lightweight observability. Visible in DevTools console.
  utt.onstart = () =>
    console.debug(
      `[earthworm-jp TTS] onstart "${text.slice(0, 20)}" voice=${jaVoice?.name ?? "(default)"}`,
    );
  utt.onend = () => console.debug(`[earthworm-jp TTS] onend "${text.slice(0, 20)}"`);
  utt.onerror = (e) => console.warn(`[earthworm-jp TTS] onerror "${text.slice(0, 20)}"`, e.error);

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
    setTimeout(
      () => {
        isPlaying = false;
      },
      Math.max(1500, word.length * 350),
    );
  }

  return { handlePlayWordSound };
}

/**
 * Exposed for the in-page TTS diagnostic. Returns enough state to render
 * "is the voice loaded? is the engine speaking? did the last utterance
 * actually start?" in the UI without each caller poking at
 * window.speechSynthesis themselves.
 */
export function diagnosticState() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return {
      supported: false,
      voiceCount: 0,
      jaVoices: [] as string[],
      pickedVoice: null as string | null,
    };
  }
  const voices = window.speechSynthesis.getVoices();
  return {
    supported: true,
    voiceCount: voices.length,
    jaVoices: voices.filter((v) => v.lang.startsWith("ja")).map((v) => v.name),
    pickedVoice: jaVoice?.name ?? null,
  };
}
