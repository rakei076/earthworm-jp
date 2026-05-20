/**
 * Curriculum-driven LLM content generator for 句楽部.
 *
 * Reads data/curriculum/<level>.yaml, where each lesson declares a
 * grammar focus + a few seed examples + a target sentence count. For
 * each lesson we call Anthropic Claude (or OpenAI GPT — see below) to
 * generate `target_count` Chinese↔Japanese sentence pairs that match
 * the grammar target and the surrounding sample style.
 *
 * Output:
 *   data/source/llm-<lessonId>.yaml — a {chinese, japanese} pair list,
 *   in the same schema build-japanese.ts already understands. After
 *   running this script the standard pipeline is:
 *
 *     1. Edit / accept the generated YAMLs (this script doesn't write
 *        anything that fails our N5+N4 vocab check, but a manual eye-
 *        over still catches odd wording).
 *     2. Run `pnpm build:japanese` once per source YAML (or wire it
 *        into a wrapper that fans out).
 *     3. Run `python scripts/generate-audio.py` to backfill MP3s.
 *     4. Add a PACK_METADATA entry in src/seed.ts and `pnpm db:upload`.
 *
 * API keys: set ANTHROPIC_API_KEY (preferred) in your shell. If the
 * env var is missing the script prints a friendly message and exits 1.
 *
 * Cost note: claude-haiku-4-5 at ~$1/M input, ~$5/M output handles a
 * 40-sentence batch for well under one US cent.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import yaml from "js-yaml";
import kuromoji from "kuromoji";

import { processSentence } from "./jp-tokenize";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, "..");
const CURRICULUM_DIR = path.join(ROOT, "data", "curriculum");
const SOURCE_DIR = path.join(ROOT, "data", "source");
const JLPT_DIR = path.join(ROOT, "data", "jlpt-cache");
const DICT_PATH = path.join(ROOT, "node_modules", "kuromoji", "dict");

// ============================================================
// Types
// ============================================================
type Example = { cn: string; jp: string };

type LessonSpec = {
  id: string;
  title: string;
  grammar: string;
  description?: string;
  examples?: Example[];
  target_count?: number;
  voice?: "polite" | "plain" | "mixed";
  min_chars?: number;
  max_chars?: number;
};

type CurriculumSpec = {
  level: "n5" | "n4" | "n3" | "n2" | "n1";
  defaults?: Partial<LessonSpec>;
  lessons: LessonSpec[];
};

type SourceEntry = { chinese: string; japanese: string };

// ============================================================
// Vocab + filter helpers (mirrors build-jlpt-packs.ts)
// ============================================================
function loadVocab(file: string): Set<string> {
  const csv = fs.readFileSync(path.join(JLPT_DIR, file), "utf-8");
  const set = new Set<string>();
  for (const line of csv.split("\n").slice(1)) {
    const expr = line.split(",")[0]?.trim();
    if (expr) set.add(expr);
  }
  return set;
}

const EXEMPT_POS = new Set(["助詞", "助動詞", "記号", "フィラー"]);

function fitsVocab(
  tokens: kuromoji.IpadicFeatures[],
  allowed: Set<string>,
): { ok: boolean; offenders: string[] } {
  const offenders: string[] = [];
  for (const t of tokens) {
    if (EXEMPT_POS.has(t.pos)) continue;
    const base = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
    if (allowed.has(base) || allowed.has(t.surface_form)) continue;
    offenders.push(t.surface_form);
  }
  return { ok: offenders.length === 0, offenders };
}

function buildTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_PATH }).build((err, t) => (err ? reject(err) : resolve(t)));
  });
}

// ============================================================
// Prompt construction
// ============================================================
function buildPrompt(spec: CurriculumSpec, lesson: LessonSpec, existing: Set<string>): string {
  const minChars = lesson.min_chars ?? spec.defaults?.min_chars ?? 7;
  const maxChars = lesson.max_chars ?? spec.defaults?.max_chars ?? 16;
  const voice = lesson.voice ?? spec.defaults?.voice ?? "polite";
  const examples = lesson.examples ?? [];

  const voiceHint =
    voice === "polite"
      ? "Use polite forms (〜です / 〜ます / 〜てください). No casual short-form."
      : voice === "plain"
        ? "Use plain casual short-form (〜だ / 〜る / 〜た / 〜ない). No 〜です/〜ます."
        : "Mix polite and plain forms naturally.";

  const existingList = [...existing].slice(0, 30).join("\n  - ");

  return `You are an expert Japanese language teacher building drill sentences for a Chinese-speaker who is studying JLPT ${spec.level.toUpperCase()}.

GOAL
Generate ${lesson.target_count ?? spec.defaults?.target_count ?? 40} new (Chinese prompt → Japanese answer) pairs that drill the grammar point below.

GRAMMAR FOCUS
  Title:       ${lesson.title}
  Pattern:     ${lesson.grammar}
  ${lesson.description ? `Notes:       ${lesson.description}` : ""}

CONSTRAINTS
- Every Japanese sentence must be ${minChars}–${maxChars} characters (excluding 「、」「。」「？」).
- Only use JLPT ${spec.level.toUpperCase()} vocabulary (the lower-level vocab is also fine).
- ${voiceHint}
- Vary the topics across the batch: meals, school, weather, family, work, travel, hobbies.
- The Chinese prompt should be a natural, short Mandarin sentence — NOT a literal word-by-word translation.
- DO NOT include furigana / brackets / pronunciations. Plain Japanese only.

STYLE EXAMPLES (copy the tone, do not repeat any of these)
${examples.map((e) => `  - ${e.cn} → ${e.jp}`).join("\n") || "  (no examples)"}

${
  existingList
    ? `ALREADY USED — DO NOT REPEAT these Japanese sentences:\n  - ${existingList}\n`
    : ""
}

OUTPUT FORMAT
Strict JSON array. No prose, no markdown, no code fences. Example:
[
  {"cn": "...", "jp": "..."},
  {"cn": "...", "jp": "..."}
]
`;
}

// ============================================================
// Anthropic call + JSON parse
// ============================================================
async function callClaude(client: Anthropic, prompt: string): Promise<SourceEntry[]> {
  const resp = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  // Concatenate text blocks
  const text = resp.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  // Strip code fences if the model added them despite instructions.
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    throw new Error(`Model returned non-JSON. First 200 chars:\n${text.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Model returned non-array");

  const out: SourceEntry[] = [];
  for (const raw of parsed) {
    if (
      raw &&
      typeof raw === "object" &&
      typeof (raw as any).cn === "string" &&
      typeof (raw as any).jp === "string"
    ) {
      out.push({ chinese: (raw as any).cn.trim(), japanese: (raw as any).jp.trim() });
    }
  }
  return out;
}

// ============================================================
// Existing-sentence collector — dedup across course pool
// ============================================================
function loadExistingJpn(): Set<string> {
  const set = new Set<string>();
  const dir = path.join(ROOT, "data", "courses");
  if (!fs.existsSync(dir)) return set;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json") || f.startsWith("_") || f.startsWith(".")) continue;
    try {
      const list = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as any[];
      for (const s of list) {
        if (s.japanese) set.add(s.japanese.replace(/[、。？！]/g, ""));
      }
    } catch {
      /* ignore */
    }
  }
  return set;
}

// ============================================================
// Main
// ============================================================
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "✗ ANTHROPIC_API_KEY is not set.\n\n" +
        "  Get one at https://console.anthropic.com/, then:\n" +
        "    export ANTHROPIC_API_KEY=sk-ant-...\n" +
        "    pnpm -F @earthworm/xingrong-courses gen:llm <curriculum-name>\n",
    );
    process.exit(1);
  }

  const curriculumArg = process.argv[2];
  if (!curriculumArg) {
    console.error("Usage: pnpm gen:llm <curriculum-name>");
    console.error("       e.g. `pnpm gen:llm n4-grammar` (reads data/curriculum/n4-grammar.yaml)");
    process.exit(1);
  }

  const curriculumPath = path.join(CURRICULUM_DIR, `${curriculumArg}.yaml`);
  if (!fs.existsSync(curriculumPath)) {
    console.error(`✗ ${curriculumPath} not found`);
    process.exit(1);
  }

  const spec = yaml.load(fs.readFileSync(curriculumPath, "utf-8")) as CurriculumSpec;
  console.log(`Loaded ${spec.lessons.length} lessons from ${path.basename(curriculumPath)}`);

  // Allowed vocab — N4 build allows N5∪N4, etc.
  const allowed = new Set<string>();
  if (spec.level === "n5") {
    for (const w of loadVocab("n5.csv")) allowed.add(w);
  } else if (spec.level === "n4") {
    for (const w of loadVocab("n5.csv")) allowed.add(w);
    for (const w of loadVocab("n4.csv")) allowed.add(w);
  } else {
    console.warn(`⚠ vocab filter not configured for level=${spec.level}, accepting all`);
  }
  console.log(`Allowed vocab: ${allowed.size} words`);

  const client = new Anthropic({ apiKey });
  const tokenizer = await buildTokenizer();
  const existing = loadExistingJpn();
  fs.mkdirSync(SOURCE_DIR, { recursive: true });

  for (const lesson of spec.lessons) {
    console.log(`\n→ Lesson: ${lesson.id} (${lesson.title})`);
    const prompt = buildPrompt(spec, lesson, existing);

    let raw: SourceEntry[] = [];
    try {
      raw = await callClaude(client, prompt);
    } catch (e: any) {
      console.error(`  ✗ ${e.message}`);
      continue;
    }
    console.log(`  model returned ${raw.length} candidates`);

    // Validate each candidate
    const accepted: SourceEntry[] = [];
    const minChars = lesson.min_chars ?? spec.defaults?.min_chars ?? 7;
    const maxChars = lesson.max_chars ?? spec.defaults?.max_chars ?? 16;

    for (const ent of raw) {
      const cleanJp = ent.japanese.replace(/[、。？！]/g, "");
      if (cleanJp.length < minChars || cleanJp.length > maxChars) continue;
      if (existing.has(cleanJp)) continue;
      if (allowed.size > 0) {
        const toks = tokenizer.tokenize(ent.japanese);
        const check = fitsVocab(toks, allowed);
        if (!check.ok) continue;
        // Also sanity-check that processSentence doesn't blow up
        processSentence(toks);
      }
      accepted.push(ent);
      existing.add(cleanJp);
    }
    console.log(`  accepted ${accepted.length} / ${raw.length}`);

    const outFile = path.join(SOURCE_DIR, `llm-${lesson.id}.yaml`);
    fs.writeFileSync(
      outFile,
      yaml.dump(
        accepted.map((e) => ({ chinese: e.chinese, japanese: e.japanese })),
        { lineWidth: 200, noRefs: true },
      ),
    );
    console.log(`  wrote ${outFile}`);
  }

  console.log("\nDone. Next steps:");
  console.log("  1. Review the generated data/source/llm-*.yaml files.");
  console.log(
    "  2. For each lesson you want to ship, set SOURCE_FILE in scripts/build-japanese.ts",
  );
  console.log("     (or extend it to loop) and run `pnpm build:japanese`.");
  console.log("  3. Run `python scripts/generate-audio.py` to backfill MP3s.");
  console.log("  4. Add PACK_METADATA entries in src/seed.ts and run `pnpm db:upload`.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
