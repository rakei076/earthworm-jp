import fs from "node:fs";
import path from "node:path";

import { db } from "@earthworm/db";
import {
  coursePack,
  course as courseSchema,
  statement as statementSchema,
} from "@earthworm/schema";

type Statement = typeof statementSchema.$inferInsert;

type PackMeta = {
  title: string;
  description: string;
  order: number;
};

/**
 * Pack-level metadata indexed by data file basename (without .json).
 *
 * Each course-data JSON file becomes ONE course pack containing ONE course
 * which holds all the statements. The Chinese learner's journey then is:
 *   1. pick a pack (e.g. "JLPT N5 · 入门短句")
 *   2. enter its lesson (just "全部" for now)
 *   3. type through every sentence one by one
 *
 * If you add a new JSON, drop a matching entry below or it will be skipped.
 */
const PACK_METADATA: Record<string, PackMeta> = {
  "jp-minna-1": {
    title: "大家的日本语 · 第一课",
    description: "通过造句学习《大家的日本语》初级教材",
    order: 1,
  },
  "jlpt-n5-01": {
    title: "JLPT N5 · 入门短句",
    description: "短而完整的陈述/疑问句（6-8 字）",
    order: 10,
  },
  "jlpt-n5-02": {
    title: "JLPT N5 · 日常基础",
    description: "日常对话场景的入门句（9-10 字）",
    order: 11,
  },
  "jlpt-n5-03": {
    title: "JLPT N5 · 简单造句",
    description: "增加助词和动词变化（11-13 字）",
    order: 12,
  },
  "jlpt-n5-04": {
    title: "JLPT N5 · 复合句型",
    description: "包含从句、并列结构（14-16 字）",
    order: 13,
  },
  "jlpt-n5-05": {
    title: "JLPT N5 · 进阶练习",
    description: "N5 范围内的较长句子（17+ 字）",
    order: 14,
  },
};

const COVER_DEFAULT =
  "https://earthworm-prod-1312884695.cos.ap-beijing.myqcloud.com/course-packs/xingrong.jpg";

(async function () {
  // Reset everything — keeps the run idempotent.
  await db.delete(statementSchema);
  await db.delete(courseSchema);
  await db.delete(coursePack);

  const coursesDir = path.resolve(__dirname, "../data/courses");
  const files = fs.readdirSync(coursesDir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  // Order packs by their declared `order`; unknown files alphabetical.
  const sorted = files.slice().sort((a, b) => {
    const ka = path.parse(a).name;
    const kb = path.parse(b).name;
    const oa = PACK_METADATA[ka]?.order ?? 9999;
    const ob = PACK_METADATA[kb]?.order ?? 9999;
    return oa - ob || a.localeCompare(b);
  });

  for (const file of sorted) {
    const key = path.parse(file).name;
    const meta = PACK_METADATA[key];
    if (!meta) {
      console.log(`skip ${file} — no metadata declared in PACK_METADATA`);
      continue;
    }

    const [packEntity] = await db
      .insert(coursePack)
      .values({
        order: meta.order,
        title: meta.title,
        description: meta.description,
        creatorId: "1",
        shareLevel: "public",
        isFree: true,
        cover: COVER_DEFAULT,
      })
      .returning();

    const [courseEntity] = await db
      .insert(courseSchema)
      .values({
        coursePackId: packEntity.id,
        order: 1,
        title: "全部",
      })
      .returning({ id: courseSchema.id, title: courseSchema.title });

    const statements = JSON.parse(
      fs.readFileSync(path.join(coursesDir, file), "utf-8"),
    ) as Statement[];

    let order = 1;
    await Promise.all(
      statements.map((s) =>
        db.insert(statementSchema).values({
          ...s,
          order: order++,
          courseId: courseEntity.id,
        }),
      ),
    );

    console.log(`✓ ${meta.title} — ${statements.length} sentences`);
  }

  console.log("全部创建完成");
  process.exit(0);
})();
