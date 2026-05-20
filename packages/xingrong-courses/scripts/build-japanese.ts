/**
 * Tokenize + furigana-ize raw {chinese, japanese} YAML sources.
 *
 * Looks at every *.yaml in `data/source/` and emits a matching JSON
 * file into `data/courses/`. Filenames map straight across:
 *   data/source/jp-minna-1.yaml   →   data/courses/jp-minna-1.json
 *   data/source/llm-te-form.yaml  →   data/courses/llm-te-form.json
 *
 * Usage:
 *   pnpm build:japanese            # process every yaml in data/source/
 *   pnpm build:japanese minna-1    # process only data/source/minna-1.yaml
 *
 * Source YAML schema:
 *   - chinese: "我是学生"
 *     japanese: "私は学生です"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";
import kuromoji from "kuromoji";

import type { FuriganaSegment, Token } from "./jp-tokenize";
import { processSentence } from "./jp-tokenize";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_DIR = path.resolve(__dirname, "../data/source");
const OUTPUT_DIR = path.resolve(__dirname, "../data/courses");
const DICT_PATH = path.resolve(__dirname, "../node_modules/kuromoji/dict");

type SourceEntry = { chinese: string; japanese: string };

type Statement = {
  chinese: string;
  japanese: string;
  tokens: Token[];
  furigana: FuriganaSegment[];
};

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
  const raw = tokenizer.tokenize(entry.japanese);
  const { tokens, furigana } = processSentence(raw);
  return {
    chinese: entry.chinese,
    japanese: entry.japanese,
    tokens,
    furigana,
  };
}

function processSourceFile(
  sourcePath: string,
  tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>,
): { name: string; count: number; outFile: string } {
  const name = path.basename(sourcePath, ".yaml");
  const text = fs.readFileSync(sourcePath, "utf-8");
  const entries = (yaml.load(text) as SourceEntry[]) || [];

  const statements = entries
    .filter((e) => e && typeof e.chinese === "string" && typeof e.japanese === "string")
    .map((e) => buildStatement(e, tokenizer));

  const outFile = path.join(OUTPUT_DIR, `${name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(statements, null, 2), "utf-8");
  return { name, count: statements.length, outFile };
}

async function main() {
  if (!fs.existsSync(DICT_PATH)) {
    console.error(`kuromoji dictionary not found at ${DICT_PATH}`);
    console.error("Run `pnpm install` in this package first.");
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const filterArg = process.argv[2];
  const sources = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => f.endsWith(".yaml") && !f.startsWith(".") && !f.startsWith("_"))
    .filter((f) => !filterArg || path.basename(f, ".yaml") === filterArg)
    .sort();

  if (sources.length === 0) {
    console.log(filterArg ? `No matching source: ${filterArg}` : "No YAML files in data/source/");
    return;
  }

  const tokenizer = await buildTokenizer();
  for (const f of sources) {
    const { name, count, outFile } = processSourceFile(path.join(SOURCE_DIR, f), tokenizer);
    console.log(`  ✓ ${name}: ${count} statements → ${path.basename(outFile)}`);
  }

  console.log(`\nDone. ${sources.length} source file(s) processed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
