/**
 * Audio playback for Japanese sentences.
 *
 * Each statement carries an `audioPath` pointing at a pre-generated MP3
 * synthesized at build time by Microsoft Edge TTS (ja-JP-NanamiNeural,
 * see packages/xingrong-courses/scripts/generate-audio.py). At runtime
 * the client just plays the MP3 with a plain HTMLAudioElement — works
 * in every browser, no Web Speech API, no system voice install needed.
 *
 * If a statement has no audioPath (e.g. legacy data, generation failed),
 * we silently fall back to Web Speech API so the play button still does
 * something visible. The fallback uses the always-installed macOS
 * "Kyoko" / "Otoya" voices when available.
 */

const WEBSPEECH_LANG = "ja-JP";
const WEBSPEECH_PREFERRED_VOICES = ["Kyoko", "Otoya"];

let audioEl: HTMLAudioElement | null = null;
let currentText = "";
let currentAudioPath: string | null = null;

function getAudio(): HTMLAudioElement {
  if (typeof window === "undefined") {
    // SSR guard — return a stub.
    return {} as HTMLAudioElement;
  }
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
  }
  return audioEl;
}

export function updateSource(text: string, audioPath?: string | null) {
  currentText = text;
  currentAudioPath = audioPath ?? null;
  if (typeof window === "undefined") return;
  if (currentAudioPath) {
    const a = getAudio();
    if (a.src !== window.location.origin + currentAudioPath) {
      a.src = currentAudioPath;
      a.load();
    }
  }
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

let webSpeechVoice: SpeechSynthesisVoice | null = null;
function pickWebSpeechVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const vs = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("ja"));
  webSpeechVoice =
    WEBSPEECH_PREFERRED_VOICES.map((n) => vs.find((v) => v.name === n)).find(Boolean) ??
    vs[0] ??
    null;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickWebSpeechVoice();
  window.speechSynthesis.onvoiceschanged = pickWebSpeechVoice;
}

function webSpeechFallback(text: string, rate: number): SpeechSynthesisUtterance | null {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (!webSpeechVoice) pickWebSpeechVoice();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = WEBSPEECH_LANG;
  if (webSpeechVoice) utt.voice = webSpeechVoice;
  utt.rate = rate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
  return utt;
}

/**
 * Play the current source. Returns a stop function.
 *
 * The path is:
 *   1. If an MP3 audioPath is set → play HTMLAudio.
 *   2. Else → fall back to Web Speech API.
 */
export function play(playOptions?: PlayOptions) {
  const { times, rate, interval } = { ...DefaultPlayOptions, ...playOptions };
  if (!currentText && !currentAudioPath) return () => {};

  let count = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const step = () => {
    if (cancelled) return;
    count++;

    if (currentAudioPath) {
      const a = getAudio();
      a.playbackRate = rate;
      a.currentTime = 0;
      const playPromise = a.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => {
          console.warn(`[audio] play() failed for ${currentAudioPath}:`, err);
        });
      }
      if (count < times) {
        a.onended = () => {
          if (cancelled) return;
          timeoutId = setTimeout(step, interval);
        };
      }
    } else {
      // Fallback: Web Speech
      const utt = webSpeechFallback(currentText, rate);
      if (utt && count < times) {
        utt.onend = () => {
          if (cancelled) return;
          timeoutId = setTimeout(step, interval);
        };
      }
    }
  };

  step();

  return () => {
    cancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (currentAudioPath && audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };
}

/** Click-a-word handler on the Answer screen. Plays a per-word utterance.
 *  Falls back to Web Speech since individual word audio isn't pre-generated. */
export function usePlayWordSound() {
  let lastWord = "";
  let isPlaying = false;

  function handlePlayWordSound(word: string) {
    if (isPlaying && lastWord === word) return;
    lastWord = word;
    isPlaying = true;
    const utt = webSpeechFallback(word, 1);
    if (utt) {
      utt.onend = () => {
        isPlaying = false;
      };
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

export function diagnosticState() {
  if (typeof window === "undefined") {
    return {
      mode: "ssr" as const,
      audioPath: null as string | null,
      mp3Ready: false,
    };
  }
  return {
    mode: currentAudioPath ? ("mp3" as const) : ("webspeech" as const),
    audioPath: currentAudioPath,
    mp3Ready: !!audioEl && audioEl.readyState >= 2,
    webSpeechVoice: webSpeechVoice?.name ?? null,
  };
}
