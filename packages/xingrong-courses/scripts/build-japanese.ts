import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";
import kuromoji from "kuromoji";
import { toHiragana } from "wanakana";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_FILE = path.resolve(__dirname, "../data/source/jp-minna-1.yaml");
const OUTPUT_FILE = path.resolve(__dirname, "../data/courses/jp-minna-1.json");
const DICT_PATH = path.resolve(__dirname, "../node_modules/kuromoji/dict");

type SourceEntry = { chinese: string; japanese: string };
type Token = { surface: string; reading: string };
type FuriganaSegment = { base: string; ruby?: string };

type Statement = {
  chinese: string;
  japanese: string;
  tokens: Token[];
  furigana: FuriganaSegment[];
};

function hasKanji(text: string): boolean {
  return /[一-鿿㐀-䶿]/.test(text);
}

function buildTokenizer(): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_PATH }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

function buildStatement(
  entry: SourceEntry,
  tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>,
): Statement {
  const rawTokens = tokenizer.tokenize(entry.japanese);

  const tokens: Token[] = rawTokens.map((t) => {
    const reading = t.reading && t.reading !== "*" ? toHiragana(t.reading) : t.surface_form;
    return { surface: t.surface_form, reading };
  });

  const furigana: FuriganaSegment[] = tokens.map((t) =>
    hasKanji(t.surface) && t.reading !== t.surface
      ? { base: t.surface, ruby: t.reading }
      : { base: t.surface },
  );

  return {
    chinese: entry.chinese,
    japanese: entry.japanese,
    tokens,
    furigana,
  };
}

async function main() {
  if (!fs.existsSync(DICT_PATH)) {
    console.error(`kuromoji dictionary not found at ${DICT_PATH}`);
    console.error("Run `pnpm install` in this package first.");
    process.exit(1);
  }

  const raw = fs.readFileSync(SOURCE_FILE, "utf-8");
  const entries = yaml.load(raw) as SourceEntry[];

  console.log(`Building ${entries.length} statements from ${path.basename(SOURCE_FILE)}...`);

  const tokenizer = await buildTokenizer();
  const statements = entries.map((e) => buildStatement(e, tokenizer));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(statements, null, 2), "utf-8");
  console.log(`Wrote ${statements.length} statements to ${path.basename(OUTPUT_FILE)}`);

  // Print preview of first 3 for sanity check
  console.log("\nPreview:");
  for (const s of statements.slice(0, 3)) {
    console.log(`  ${s.chinese} → ${s.japanese}`);
    console.log(`    tokens: ${s.tokens.map((t) => `${t.surface}(${t.reading})`).join(" / ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
