/**
 * JLPT N5 course-pack builder.
 *
 * Pipeline:
 *   1. Load N5 vocabulary list (CSV from open-anki-jlpt-decks)
 *   2. Stream Tatoeba 中-日 sentence pairs (bzip2 dumps)
 *   3. Tokenize each Japanese sentence with kuromoji
 *   4. Keep only sentences whose every content word is in the N5 list
 *   5. Sort by sentence length, slice into N course packs
 *   6. For each kept sentence, run the same tokenize + furigana logic
 *      as build-japanese.ts to produce statement JSON
 *
 * Outputs:
 *   data/courses/jlpt-n5-01.json … data/courses/jlpt-n5-NN.json
 *   data/courses/_metadata.json  (per-pack title/description/order)
 *
 * Data sources (downloaded ahead of time into data/{tatoeba,jlpt}-cache/):
 *   - jpn_sentences.tsv.bz2     (sentence_id <TAB> jpn <TAB> text)
 *   - cmn_sentences.tsv.bz2     (sentence_id <TAB> cmn <TAB> text)
 *   - jpn-cmn_links.tsv.bz2     (jpn_id <TAB> cmn_id)
 *   - n5.csv                    (expression, reading, meaning, tags, guid)
 *
 * License attribution required at runtime UI / docs:
 *   - Tatoeba sentences: CC-BY 2.0  https://tatoeba.org
 *   - JLPT N5 wordlist: MIT  jamsinclair/open-anki-jlpt-decks
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import kuromoji from "kuromoji";
import { toHiragana } from "wanakana";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TATOEBA_DIR = path.resolve(__dirname, "../data/tatoeba-cache");
const JLPT_DIR = path.resolve(__dirname, "../data/jlpt-cache");
const OUTPUT_DIR = path.resolve(__dirname, "../data/courses");
const METADATA_FILE = path.resolve(__dirname, "../data/courses/_metadata.json");
const DICT_PATH = path.resolve(__dirname, "../node_modules/kuromoji/dict");

// Tuning knobs
const PACK_COUNT = 5;
const SENTENCES_PER_PACK = 100;

// Buckets of (min, max) sentence-length characters — controls difficulty curve.
// Buckets are sized against the actual N5 candidate histogram (see
// scripts/check-buckets.ts), so each bucket has 60-150 sentences available
// even before we apply the per-pack cap.
const LENGTH_BUCKETS: Array<[number, number]> = [
  [6, 7],
  [8, 9],
  [10, 11],
  [12, 14],
  [15, 30],
];

const PACK_TITLES = [
  "JLPT N5 · 入门短句",
  "JLPT N5 · 日常基础",
  "JLPT N5 · 简单造句",
  "JLPT N5 · 复合句型",
  "JLPT N5 · 进阶练习",
];

const PACK_DESCRIPTIONS = [
  "短而完整的陈述/疑问句",
  "日常对话场景的入门句",
  "增加助词和动词变化",
  "包含从句、并列结构",
  "N5 范围内的较长句子",
];

type Statement = {
  chinese: string;
  japanese: string;
  tokens: { surface: string; reading: string }[];
  furigana: { base: string; ruby?: string }[];
};

function hasKanji(s: string): boolean {
  return /[一-鿿㐀-䶿]/.test(s);
}

function bzcat(file: string): string {
  const r = spawnSync("bzcat", [file], { maxBuffer: 200 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`bzcat failed for ${file}: ${r.stderr.toString()}`);
  return r.stdout.toString("utf-8");
}

function loadN5Vocab(): Set<string> {
  const csv = fs.readFileSync(path.join(JLPT_DIR, "n5.csv"), "utf-8");
  const set = new Set<string>();
  const lines = csv.split("\n").slice(1); // skip header
  for (const line of lines) {
    if (!line) continue;
    // CSV: expression,reading,meaning,tags,guid — meaning may contain commas,
    // but expression is always the first field with no commas (it's a word).
    const expr = line.split(",")[0]?.trim();
    if (expr) set.add(expr);
  }
  return set;
}

function loadTatoebaPairs(): Map<number, string> {
  // Returns map of jpn_sentence_id → matching Chinese text.
  const jpnText: Map<number, string> = new Map();
  const cmnText: Map<number, string> = new Map();
  const pairs: Map<number, string> = new Map();

  console.log("  loading jpn sentences...");
  for (const line of bzcat(path.join(TATOEBA_DIR, "jpn_sentences.tsv.bz2")).split("\n")) {
    if (!line) continue;
    const [id, , text] = line.split("\t");
    if (id && text) jpnText.set(Number(id), text);
  }
  console.log(`    ${jpnText.size} jpn sentences indexed`);

  console.log("  loading cmn sentences...");
  for (const line of bzcat(path.join(TATOEBA_DIR, "cmn_sentences.tsv.bz2")).split("\n")) {
    if (!line) continue;
    const [id, , text] = line.split("\t");
    if (id && text) cmnText.set(Number(id), text);
  }
  console.log(`    ${cmnText.size} cmn sentences indexed`);

  console.log("  joining links...");
  for (const line of bzcat(path.join(TATOEBA_DIR, "jpn-cmn_links.tsv.bz2")).split("\n")) {
    if (!line) continue;
    const [srcId, tgtId] = line.split("\t").map(Number);
    const jpn = jpnText.get(srcId);
    const cmn = cmnText.get(tgtId);
    if (jpn && cmn) {
      // Keep ONE chinese translation per jpn sentence (first found).
      if (!pairs.has(srcId)) pairs.set(srcId, cmn);
    }
  }
  console.log(`    ${pairs.size} jpn↔cmn pairs`);

  // Re-key by Japanese text for convenience downstream.
  const byJpn = new Map<string, string>();
  for (const [id, cmn] of pairs) {
    const jpn = jpnText.get(id);
    if (jpn) byJpn.set(jpn, cmn);
  }
  return byJpn;
}

function buildTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_PATH }).build((err, t) => (err ? reject(err) : resolve(t)));
  });
}

/**
 * Returns true if all content words in the Japanese sentence are present
 * in the N5 vocabulary list. Particles, auxiliary verbs and symbols are
 * exempted (they aren't usually in vocab lists but are universally needed).
 */
function fitsN5(tokens: kuromoji.IpadicFeatures[], vocab: Set<string>): boolean {
  const EXEMPT_POS = new Set([
    "助詞", // particles (は, が, を, に, …)
    "助動詞", // auxiliary verbs (です, ます, …)
    "記号", // symbols (、, 。, ?)
    "フィラー", // fillers
  ]);
  for (const t of tokens) {
    if (EXEMPT_POS.has(t.pos)) continue;
    // Match by dictionary form (basic_form) OR surface form
    const base = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
    if (vocab.has(base) || vocab.has(t.surface_form)) continue;
    return false;
  }
  return true;
}

function buildStatement(
  chinese: string,
  japanese: string,
  rawTokens: kuromoji.IpadicFeatures[],
): Statement {
  const tokens = rawTokens.map((t) => {
    const reading = t.reading && t.reading !== "*" ? toHiragana(t.reading) : t.surface_form;
    return { surface: t.surface_form, reading };
  });
  const furigana = tokens.map((t) =>
    hasKanji(t.surface) && t.reading !== t.surface
      ? { base: t.surface, ruby: t.reading }
      : { base: t.surface },
  );
  return { chinese, japanese, tokens, furigana };
}

async function main() {
  console.log("Loading N5 vocabulary...");
  const vocab = loadN5Vocab();
  console.log(`  ${vocab.size} N5 words loaded`);

  console.log("Loading Tatoeba pairs...");
  const pairs = loadTatoebaPairs();

  console.log("Tokenizing & filtering by N5...");
  const tokenizer = await buildTokenizer();

  type Candidate = { jpn: string; cmn: string; raw: kuromoji.IpadicFeatures[]; length: number };
  const candidates: Candidate[] = [];

  // Dedup by both sides — same Japanese with different punctuation should
  // not appear twice, AND same Chinese sentence should not pair with
  // multiple Japanese variants (confusing for a learner).
  const seenJpn = new Set<string>();
  const seenCmn = new Set<string>();

  let i = 0;
  for (const [jpn, cmn] of pairs) {
    i++;
    if (i % 2000 === 0) console.log(`  scanned ${i} pairs, kept ${candidates.length}`);
    if (jpn.length > 30) continue;
    if (jpn.length < 6) continue;
    // Skip ASCII / half-width digits — usually unnatural mixed content
    if (/[A-Za-z0-9!?]/.test(jpn)) continue;
    // Skip exclamations: usually single-word imperatives, advanced grammar
    if (jpn.endsWith("！") || jpn.endsWith("!")) continue;
    // Skip if more than 40% katakana (loanword-heavy, not great for learners)
    const katakanaCount = (jpn.match(/[ァ-ヿ]/g) || []).length;
    if (katakanaCount / jpn.length > 0.4) continue;

    const normJpn = jpn.replace(/[、。？！]/g, "");
    const normCmn = cmn.replace(/[，。？！,]/g, "");
    if (seenJpn.has(normJpn) || seenCmn.has(normCmn)) continue;

    const raw = tokenizer.tokenize(jpn);
    if (!fitsN5(raw, vocab)) continue;

    seenJpn.add(normJpn);
    seenCmn.add(normCmn);
    candidates.push({ jpn, cmn, raw, length: jpn.length });
  }
  console.log(`  ${candidates.length} candidates fit N5`);

  // Slice into packs by length bucket
  console.log("Slicing into course packs...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const packMetadata: Array<{ file: string; title: string; description: string; order: number }> =
    [];

  for (let p = 0; p < PACK_COUNT; p++) {
    const [lo, hi] = LENGTH_BUCKETS[p];
    const pool = candidates.filter((c) => c.length >= lo && c.length <= hi);
    // Diverse selection: take SENTENCES_PER_PACK with the shortest cmn translation
    // to favor learner-friendly Chinese prompts; ties broken by jpn length.
    pool.sort((a, b) => a.cmn.length - b.cmn.length || a.length - b.length);
    const picked = pool.slice(0, SENTENCES_PER_PACK);

    if (picked.length === 0) {
      console.log(`  pack ${p + 1}: empty (no sentences in [${lo}, ${hi}] chars)`);
      continue;
    }

    const statements = picked.map((c) => buildStatement(c.cmn, c.jpn, c.raw));
    const filename = `jlpt-n5-${String(p + 1).padStart(2, "0")}.json`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(statements, null, 2));
    packMetadata.push({
      file: filename,
      title: PACK_TITLES[p],
      description: `${PACK_DESCRIPTIONS[p]}（${lo}-${hi} 字）`,
      order: p + 2, // leave order=1 for the existing minna pack
    });
    console.log(`  pack ${p + 1}: ${filename} (${picked.length} sentences, ${lo}-${hi} chars)`);
  }

  fs.writeFileSync(METADATA_FILE, JSON.stringify({ packs: packMetadata }, null, 2));
  console.log(`Metadata written to ${METADATA_FILE}`);

  // Show preview
  console.log("\nPreview (first pack, first 3 statements):");
  const first = JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, "jlpt-n5-01.json"), "utf-8"),
  ) as Statement[];
  for (const s of first.slice(0, 3)) {
    console.log(`  ${s.chinese} → ${s.japanese}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
