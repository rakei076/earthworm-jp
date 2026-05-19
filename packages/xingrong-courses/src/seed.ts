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
  /** Sentences per lesson within the pack. Defaults to LESSON_SIZE. */
  lessonSize?: number;
};

/**
 * Pack-level metadata indexed by data file basename (without .json).
 *
 * Each JSON file → one course pack. Statements in the file are sliced
 * into lessons of `lessonSize` (default 20). The Chinese learner picks
 * a pack from the home page, then drills lesson 1 → lesson N.
 */
const PACK_METADATA: Record<string, PackMeta> = {
  "jp-minna-1": {
    title: "大家的日本语 · 第一课",
    description: "通过造句学习《大家的日本语》初级教材",
    order: 1,
    lessonSize: 15, // small pack — keep it as a single 15-sentence lesson
  },
  "jlpt-n5-01": {
    title: "JLPT N5 · 入门短句",
    description: "短而完整的陈述/疑问句（6-7 字）",
    order: 10,
  },
  "jlpt-n5-02": {
    title: "JLPT N5 · 日常基础",
    description: "日常对话场景的入门句（8-9 字）",
    order: 11,
  },
  "jlpt-n5-03": {
    title: "JLPT N5 · 简单造句",
    description: "增加助词和动词变化（10-11 字）",
    order: 12,
  },
  "jlpt-n5-04": {
    title: "JLPT N5 · 复合句型",
    description: "包含从句、并列结构（12-14 字）",
    order: 13,
  },
  "jlpt-n5-05": {
    title: "JLPT N5 · 进阶练习",
    description: "N5 范围内的较长句子（15+ 字）",
    order: 14,
  },
};

const LESSON_SIZE_DEFAULT = 20;

const COVER_DEFAULT =
  "https://earthworm-prod-1312884695.cos.ap-beijing.myqcloud.com/course-packs/xingrong.jpg";

function toChineseLessonName(n: number): string {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  if (n <= 10) return `第${digits[n]}课`;
  if (n < 20) return `第十${digits[n - 10]}课`;
  if (n === 20) return `第二十课`;
  return `第${n}课`;
}

(async function () {
  // Reset everything — keeps the run idempotent.
  await db.delete(statementSchema);
  await db.delete(courseSchema);
  await db.delete(coursePack);

  const coursesDir = path.resolve(__dirname, "../data/courses");
  const files = fs.readdirSync(coursesDir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));

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
      console.log(`skip ${file} — no metadata in PACK_METADATA`);
      continue;
    }

    const allStatements = JSON.parse(
      fs.readFileSync(path.join(coursesDir, file), "utf-8"),
    ) as Statement[];

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

    const lessonSize = meta.lessonSize ?? LESSON_SIZE_DEFAULT;
    const lessonCount = Math.ceil(allStatements.length / lessonSize);

    for (let li = 0; li < lessonCount; li++) {
      const slice = allStatements.slice(li * lessonSize, (li + 1) * lessonSize);

      const [courseEntity] = await db
        .insert(courseSchema)
        .values({
          coursePackId: packEntity.id,
          order: li + 1,
          title: toChineseLessonName(li + 1),
        })
        .returning({ id: courseSchema.id, title: courseSchema.title });

      let order = 1;
      await Promise.all(
        slice.map((s) =>
          db.insert(statementSchema).values({
            ...s,
            order: order++,
            courseId: courseEntity.id,
          }),
        ),
      );
    }

    console.log(`✓ ${meta.title} — ${allStatements.length} sentences in ${lessonCount} lesson(s)`);
  }

  console.log("全部创建完成");
  process.exit(0);
})();
