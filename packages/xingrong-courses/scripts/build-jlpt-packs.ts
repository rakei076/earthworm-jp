/**
 * JLPT N5 / N4 course-pack builder.
 *
 * Pipeline:
 *   1. Load JLPT vocabulary list(s) (CSV from open-anki-jlpt-decks).
 *   2. Stream Tatoeba 中-日 sentence pairs (bzip2 dumps).
 *   3. Tokenize each Japanese sentence with kuromoji.
 *   4. Keep sentences whose every content word is in the allowed vocab set.
 *      For an N4 build we also require at least one N4-specific word so the
 *      pack is actually "more advanced", not just more N5 sentences.
 *   5. Sort by sentence length, slice into N course packs.
 *   6. For each kept sentence, run jp-tokenize.processSentence to produce
 *      merged tokens + furigana segments.
 *
 * The N5 build is the original — kept stable so the existing course IDs
 * don't churn. The N4 build is additive and uses sentences disjoint from
 * the N5 ones.
 *
 * Data sources (downloaded ahead of time into data/{tatoeba,jlpt}-cache/):
 *   - jpn_sentences.tsv.bz2     (sentence_id <TAB> jpn <TAB> text)
 *   - cmn_sentences.tsv.bz2     (sentence_id <TAB> cmn <TAB> text)
 *   - jpn-cmn_links.tsv.bz2     (jpn_id <TAB> cmn_id)
 *   - n5.csv / n4.csv           (expression, reading, meaning, tags, guid)
 *
 * Attribution required at runtime UI / docs:
 *   - Tatoeba sentences: CC-BY 2.0  https://tatoeba.org
 *   - JLPT wordlist: MIT  jamsinclair/open-anki-jlpt-decks
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import kuromoji from "kuromoji";

import { processSentence } from "./jp-tokenize";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TATOEBA_DIR = path.resolve(__dirname, "../data/tatoeba-cache");
const JLPT_DIR = path.resolve(__dirname, "../data/jlpt-cache");
const OUTPUT_DIR = path.resolve(__dirname, "../data/courses");
const METADATA_FILE = path.resolve(__dirname, "../data/courses/_metadata.json");
const DICT_PATH = path.resolve(__dirname, "../node_modules/kuromoji/dict");

type Statement = {
  chinese: string;
  japanese: string;
  tokens: { surface: string; reading: string }[];
  furigana: { base: string; ruby?: string }[];
};

type Candidate = { jpn: string; cmn: string; raw: kuromoji.IpadicFeatures[]; length: number };

type LevelConfig = {
  /** Pack-file prefix, e.g. "jlpt-n5". Files become `<prefix>-01.json` … */
  prefix: string;
  /** Wordlists ALLOWED in this level (cumulative — N4 typically passes both n5.csv and n4.csv). */
  vocabFiles: string[];
  /** Optional: a wordlist whose words MUST appear at least once. Used to keep
   *  N4 packs genuinely N4 — they have to contain at least one N4-only word. */
  requireFromFile?: string;
  /** Pack metadata. Length count must match `lengthBuckets`. */
  packs: Array<{ title: string; description: string; bucket: [number, number] }>;
  /** Order of the FIRST pack on the home page; subsequent packs are order+1, +2 … */
  startOrder: number;
  /** Max sentences per pack. */
  sentencesPerPack: number;
  /** Optional set of Japanese sentences to skip (e.g. already used in a lower level). */
  excludeJpn?: Set<string>;
};

function loadVocab(file: string): Set<string> {
  const csv = fs.readFileSync(path.join(JLPT_DIR, file), "utf-8");
  const set = new Set<string>();
  for (const line of csv.split("\n").slice(1)) {
    if (!line) continue;
    const expr = line.split(",")[0]?.trim();
    if (expr) set.add(expr);
  }
  return set;
}

function bzcat(file: string): string {
  const r = spawnSync("bzcat", [file], { maxBuffer: 200 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`bzcat failed for ${file}: ${r.stderr.toString()}`);
  return r.stdout.toString("utf-8");
}

function loadTatoebaPairs(): Map<string, string> {
  const jpnText = new Map<number, string>();
  const cmnText = new Map<number, string>();
  const pairs = new Map<number, string>();

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
    if (jpn && cmn && !pairs.has(srcId)) pairs.set(srcId, cmn);
  }
  console.log(`    ${pairs.size} jpn↔cmn pairs`);

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

const EXEMPT_POS = new Set(["助詞", "助動詞", "記号", "フィラー"]);

function fits(tokens: kuromoji.IpadicFeatures[], allowed: Set<string>): boolean {
  for (const t of tokens) {
    if (EXEMPT_POS.has(t.pos)) continue;
    const base = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
    if (allowed.has(base) || allowed.has(t.surface_form)) continue;
    return false;
  }
  return true;
}

function containsAnyFrom(tokens: kuromoji.IpadicFeatures[], target: Set<string>): boolean {
  for (const t of tokens) {
    if (EXEMPT_POS.has(t.pos)) continue;
    const base = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
    if (target.has(base) || target.has(t.surface_form)) return true;
  }
  return false;
}

function buildStatement(
  chinese: string,
  japanese: string,
  rawTokens: kuromoji.IpadicFeatures[],
): Statement {
  const { tokens, furigana } = processSentence(rawTokens);
  return { chinese, japanese, tokens, furigana };
}

async function buildLevel(
  cfg: LevelConfig,
  pairs: Map<string, string>,
  tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>,
  globalSeenJpn: Set<string>,
  globalSeenCmn: Set<string>,
): Promise<{ candidates: Candidate[]; packsCreated: number; statementsKept: Set<string> }> {
  console.log(`\n=== ${cfg.prefix.toUpperCase()} build ===`);

  // Allowed vocab (union of all configured wordlists)
  const allowed = new Set<string>();
  for (const f of cfg.vocabFiles) {
    const v = loadVocab(f);
    for (const w of v) allowed.add(w);
    console.log(`  + ${f}: ${v.size} words (running total ${allowed.size})`);
  }

  // Require-set (e.g. n4.csv on an N4 build)
  let requireSet: Set<string> | null = null;
  if (cfg.requireFromFile) {
    requireSet = loadVocab(cfg.requireFromFile);
    console.log(`  require ≥1 word from ${cfg.requireFromFile} (${requireSet.size} words)`);
  }

  console.log("Tokenizing & filtering...");
  const candidates: Candidate[] = [];
  let i = 0;
  for (const [jpn, cmn] of pairs) {
    i++;
    if (i % 2000 === 0) console.log(`  scanned ${i}, kept ${candidates.length}`);
    if (jpn.length > 30 || jpn.length < 6) continue;
    if (/[A-Za-z0-9!?]/.test(jpn)) continue;
    if (jpn.endsWith("！") || jpn.endsWith("!")) continue;
    const katakanaCount = (jpn.match(/[ァ-ヿ]/g) || []).length;
    if (katakanaCount / jpn.length > 0.4) continue;

    const normJpn = jpn.replace(/[、。？！]/g, "");
    const normCmn = cmn.replace(/[，。？！,]/g, "");
    if (globalSeenJpn.has(normJpn) || globalSeenCmn.has(normCmn)) continue;
    if (cfg.excludeJpn?.has(normJpn)) continue;

    const raw = tokenizer.tokenize(jpn);
    if (!fits(raw, allowed)) continue;
    if (requireSet && !containsAnyFrom(raw, requireSet)) continue;

    globalSeenJpn.add(normJpn);
    globalSeenCmn.add(normCmn);
    candidates.push({ jpn, cmn, raw, length: jpn.length });
  }
  console.log(`  ${candidates.length} candidates`);

  // Slice into packs by length bucket
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let packsCreated = 0;
  const statementsKept = new Set<string>();

  for (let p = 0; p < cfg.packs.length; p++) {
    const [lo, hi] = cfg.packs[p].bucket;
    const pool = candidates.filter((c) => c.length >= lo && c.length <= hi);
    pool.sort((a, b) => a.cmn.length - b.cmn.length || a.length - b.length);
    const picked = pool.slice(0, cfg.sentencesPerPack);

    if (picked.length === 0) {
      console.log(`  pack ${p + 1}: empty (${lo}-${hi} chars)`);
      continue;
    }

    for (const c of picked) statementsKept.add(c.jpn);

    const statements = picked.map((c) => buildStatement(c.cmn, c.jpn, c.raw));
    const filename = `${cfg.prefix}-${String(p + 1).padStart(2, "0")}.json`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(statements, null, 2));
    packsCreated++;
    console.log(
      `  ${filename}: ${picked.length} sentences (${lo}-${hi} chars) → "${cfg.packs[p].title}"`,
    );
  }

  return { candidates, packsCreated, statementsKept };
}

async function main() {
  const pairs = loadTatoebaPairs();
  const tokenizer = await buildTokenizer();

  // Shared dedup across both levels — same JP sentence can't appear in both
  // N5 and N4 packs.
  const seenJpn = new Set<string>();
  const seenCmn = new Set<string>();

  // ============================================================
  // N5 — sentences using ONLY N5 vocabulary.
  // ============================================================
  const n5 = await buildLevel(
    {
      prefix: "jlpt-n5",
      vocabFiles: ["n5.csv"],
      packs: [
        { title: "JLPT N5 · 入门短句", description: "短而完整的陈述/疑问句", bucket: [6, 7] },
        { title: "JLPT N5 · 日常基础", description: "日常对话场景的入门句", bucket: [8, 9] },
        { title: "JLPT N5 · 简单造句", description: "增加助词和动词变化", bucket: [10, 11] },
        { title: "JLPT N5 · 复合句型", description: "包含从句、并列结构", bucket: [12, 14] },
        { title: "JLPT N5 · 进阶练习", description: "N5 范围内的较长句子", bucket: [15, 30] },
      ],
      startOrder: 10,
      sentencesPerPack: 100,
    },
    pairs,
    tokenizer,
    seenJpn,
    seenCmn,
  );

  // ============================================================
  // N4 — sentences using N5 ∪ N4 vocabulary, AND must contain at least
  // one N4-only word so the pack is actually more advanced than N5.
  // ============================================================
  const n4 = await buildLevel(
    {
      prefix: "jlpt-n4",
      vocabFiles: ["n5.csv", "n4.csv"],
      requireFromFile: "n4.csv",
      packs: [
        { title: "JLPT N4 · 进阶短句", description: "含 N4 词汇的入门短句", bucket: [7, 9] },
        { title: "JLPT N4 · 日常造句", description: "N4 日常对话用句", bucket: [10, 12] },
        { title: "JLPT N4 · 复合句型", description: "条件、原因、并列从句", bucket: [13, 16] },
        { title: "JLPT N4 · 进阶练习", description: "N4 范围内的较长句子", bucket: [17, 30] },
      ],
      startOrder: 20,
      sentencesPerPack: 80,
    },
    pairs,
    tokenizer,
    seenJpn,
    seenCmn,
  );

  // ============================================================
  // Metadata index for downstream tools / docs.
  // ============================================================
  const meta = {
    n5: { candidates: n5.candidates.length, packs: n5.packsCreated },
    n4: { candidates: n4.candidates.length, packs: n4.packsCreated },
    total_sentences: [...n5.statementsKept].length + [...n4.statementsKept].length,
  };
  fs.writeFileSync(METADATA_FILE, JSON.stringify(meta, null, 2));
  console.log("\n=== Summary ===");
  console.log(JSON.stringify(meta, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
