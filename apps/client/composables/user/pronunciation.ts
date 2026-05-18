/**
 * Japanese pronunciation via Web Speech API.
 *
 * The original Earthworm shipped with Youdao Dictionary audio URLs.
 * For the JP edition we rely on the browser's built-in synthesis with
 * `lang=ja-JP`. The interface keeps the original signatures so that
 * callers (englishSound/* modules) need minimal change.
 */

export function usePronunciation() {
  /**
   * In the original codebase this returned an audio URL string that was
   * loaded into an Audio element. With Web Speech we no longer need a URL —
   * we just hand back the original text so that callers' cache-by-URL
   * comparisons still work as a cache-by-text.
   */
  function getPronunciationUrl(text: string | undefined): string {
    return text ?? "";
  }

  return {
    getPronunciationUrl,
  };
}
