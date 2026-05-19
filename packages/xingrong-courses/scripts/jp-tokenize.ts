/**
 * Shared post-processing helpers for kuromoji output.
 *
 * Raw kuromoji output splits at the morpheme level: 知らなかった becomes
 * (知ら, なかっ, た) — three separate tokens, one of which is a single
 * mora ("た"). For a typing/learning UI these morphemes need to be
 * re-glued into bunsetsu-like units: the conjugated verb stays whole,
 * the trailing 助動詞 chain attaches to it. We also strip standalone
 * punctuation since it shouldn't claim its own input block.
 */

import type kuromoji from "kuromoji";

import { toHiragana } from "wanakana";

export type Token = { surface: string; reading: string };
export type FuriganaSegment = { base: string; ruby?: string };

function readingFor(t: kuromoji.IpadicFeatures): string {
  return t.reading && t.reading !== "*" ? toHiragana(t.reading) : t.surface_form;
}

function isKana(ch: string): boolean {
  // hiragana, katakana, prolonged-sound mark, small kana
  return /[ぁ-ゟ゠-ヿ]/.test(ch);
}

function hasKanji(s: string): boolean {
  return /[一-鿿㐀-䶿]/.test(s);
}

/**
 * Merge morphemes that should be displayed as a single learner-facing
 * unit. Heuristics, in priority order:
 *
 *   - 記号 (punctuation): dropped entirely from the tokens array.
 *   - 助動詞 (auxiliary verb: です、ます、た、ない…): attach to previous.
 *   - 動詞 with pos_detail_1 === "非自立" or === "接尾": verb suffix,
 *     attach to previous (e.g. 〜て下さい).
 *   - 名詞 with pos_detail_1 === "接尾" (さん, たち, etc.): attach.
 *   - 助詞 接続助詞 て / で / ば / ても: attach when previous is a verb
 *     stem (covers the te-form chain).
 *
 * Everything else stays standalone — particles like は / を / に / が
 * are deliberately their own block because they're the part of Japanese
 * a Chinese learner most needs to internalize.
 */
export function mergeJpTokens(raw: kuromoji.IpadicFeatures[]): Token[] {
  const out: Token[] = [];
  let lastIsVerbLike = false;

  for (const t of raw) {
    if (t.pos === "記号") continue;

    const reading = readingFor(t);
    const surface = t.surface_form;

    const isAux = t.pos === "助動詞";
    const isVerbSuffix =
      t.pos === "動詞" && (t.pos_detail_1 === "非自立" || t.pos_detail_1 === "接尾");
    const isNounSuffix = t.pos === "名詞" && t.pos_detail_1 === "接尾";
    const isVerbContinuingParticle =
      t.pos === "助詞" &&
      t.pos_detail_1 === "接続助詞" &&
      (surface === "て" ||
        surface === "で" ||
        surface === "ば" ||
        surface === "ても" ||
        surface === "でも");

    const shouldAttach =
      out.length > 0 &&
      (isAux || isVerbSuffix || isNounSuffix || (isVerbContinuingParticle && lastIsVerbLike));

    if (shouldAttach) {
      out[out.length - 1].surface += surface;
      out[out.length - 1].reading += reading;
    } else {
      out.push({ surface, reading });
    }

    lastIsVerbLike =
      t.pos === "動詞" || isAux || isVerbSuffix || (isVerbContinuingParticle && lastIsVerbLike);
  }

  return out;
}

/**
 * Split a merged token into a sequence of furigana segments. A pure-kana
 * suffix or prefix is emitted without ruby; the kanji "core" gets ruby
 * with whatever portion of the reading is left after peeling off the
 * matching kana edges.
 *
 * Works well for the common shapes 知らなかった → [{知,し} {らなかった}],
 * 学生 → [{学生,がくせい}], 私 → [{私,わたし}], カメラ → [{カメラ}].
 * For interleaved kanji-kana-kanji words like 食べ物 it falls back to
 * one segment that covers the whole surface (still legible).
 */
export function splitFurigana(surface: string, reading: string): FuriganaSegment[] {
  if (!hasKanji(surface) || reading === surface) {
    return [{ base: surface }];
  }

  let lo = 0;
  let hi = surface.length;
  let rLo = 0;
  let rHi = reading.length;

  // peel matching kana from the right
  while (hi > lo && isKana(surface[hi - 1]) && reading[rHi - 1] === surface[hi - 1]) {
    hi--;
    rHi--;
  }
  // peel matching kana from the left
  while (lo < hi && isKana(surface[lo]) && reading[rLo] === surface[lo]) {
    lo++;
    rLo++;
  }

  const prefix = surface.slice(0, lo);
  const core = surface.slice(lo, hi);
  const coreReading = reading.slice(rLo, rHi);
  const suffix = surface.slice(hi);

  const segs: FuriganaSegment[] = [];
  if (prefix) segs.push({ base: prefix });
  if (core) {
    if (coreReading === core || !coreReading) segs.push({ base: core });
    else segs.push({ base: core, ruby: coreReading });
  }
  if (suffix) segs.push({ base: suffix });
  return segs;
}

/**
 * Convenience: kuromoji raw output → final (tokens, furigana) pair.
 * The flat furigana array is the concat of per-token splits, so the UI
 * can render the answer line continuously.
 */
export function processSentence(raw: kuromoji.IpadicFeatures[]): {
  tokens: Token[];
  furigana: FuriganaSegment[];
} {
  const tokens = mergeJpTokens(raw);
  const furigana: FuriganaSegment[] = [];
  for (const t of tokens) {
    for (const seg of splitFurigana(t.surface, t.reading)) furigana.push(seg);
  }
  return { tokens, furigana };
}
