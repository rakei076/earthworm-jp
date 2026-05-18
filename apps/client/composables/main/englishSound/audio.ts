/**
 * TTS playback wrapper backed by Web Speech API (Japanese).
 *
 * Module-level state mirrors the original Audio-based implementation so the
 * higher-level API surface in englishSound/index.ts stays unchanged.
 */

const LANG = "ja-JP";

interface JpTTSProvider {
  speak(text: string, opts: { rate?: number }): void;
  cancel(): void;
}

class WebSpeechProvider implements JpTTSProvider {
  speak(text: string, opts: { rate?: number } = {}) {
    if (!text) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = LANG;
    if (opts.rate) utt.rate = opts.rate;
    window.speechSynthesis.speak(utt);
  }

  cancel() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
  }
}

let provider: JpTTSProvider = new WebSpeechProvider();
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

  const playOnce = () => {
    if (cancelled) return;
    provider.speak(currentText, { rate });
    count++;
    if (count < times) {
      const utt = new SpeechSynthesisUtterance(currentText);
      utt.lang = LANG;
      utt.rate = rate;
      utt.onend = () => {
        timeoutId = setTimeout(playOnce, interval);
      };
      // The actual playback is already triggered by provider.speak above.
      // We just need a separate utterance to listen for onend on the cloned
      // queue entry. For Web Speech, we use a simpler approach: schedule via
      // timeout after a rough estimate.
      // Simpler fallback: rely on a fixed interval between plays.
      if (count < times) {
        const estimatedMs = currentText.length * 200 + interval;
        timeoutId = setTimeout(playOnce, estimatedMs);
      }
    }
  };

  playOnce();

  return () => {
    cancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
    provider.cancel();
  };
}

export function usePlayWordSound() {
  let lastWord = "";
  let isPlaying = false;

  function handlePlayWordSound(word: string) {
    if (isPlaying && lastWord === word) return;
    lastWord = word;
    isPlaying = true;
    provider.speak(word, {});
    // No reliable onend in this simplified flow — treat each call as fire-and-forget.
    setTimeout(
      () => {
        isPlaying = false;
      },
      Math.max(800, word.length * 250),
    );
  }

  return {
    handlePlayWordSound,
  };
}
