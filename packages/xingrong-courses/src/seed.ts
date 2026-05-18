import fs from "node:fs";
import path from "node:path";

import { db } from "@earthworm/db";
import {
  coursePack,
  course as courseSchema,
  statement as statementSchema,
} from "@earthworm/schema";

type Statement = typeof statementSchema.$inferInsert;

const courses = fs.readdirSync(path.resolve(__dirname, "../data/courses"));

(async function () {
  await db.delete(coursePack);
  await db.delete(statementSchema);
  await db.delete(courseSchema);

  const [coursePackEntity] = await db
    .insert(coursePack)
    .values({
      order: 1,
      title: "零基础日语 · 大家的日本语",
      description: "通过造句学习《大家的日本语》初级教材",
      creatorId: "1",
      shareLevel: "public",
      isFree: true,
      cover:
        "https://earthworm-prod-1312884695.cos.ap-beijing.myqcloud.com/course-packs/xingrong.jpg",
    })
    .returning();

  const courseList = await Promise.all(
    courses.map(async (courseFileName, index) => {
      const courseName = path.parse(courseFileName).name;
      const [course] = await db
        .insert(courseSchema)
        .values({
          coursePackId: coursePackEntity.id,
          // Index starts from 0
          order: index + 1,
          title: convertToChineseNumber(courseName),
        })
        .returning({ id: courseSchema.id, order: courseSchema.order, title: courseSchema.title });

      console.log(`创建: id-${course.id} order-${course.order} title-${course.title}`);

      return {
        ...course,
        meta: {
          courseFileName,
          courseName,
        },
      };
    }),
  );

  await Promise.all(
    courseList.map(async (course) => {
      const { id: courseId, meta } = course;

      const courseDataJsonText = fs.readFileSync(
        path.resolve(__dirname, `../data/courses/${meta.courseFileName}`),
        "utf-8",
      );

      const statementList = JSON.parse(courseDataJsonText) as Statement[];

      let order = 1;
      const statementInsertTask = statementList.map(async (statement) => {
        return await db.insert(statementSchema).values({
          ...statement,
          order: order++,
          courseId,
        });
      });

      console.log(`courseName: ${meta.courseFileName} 开始上传`);
      await Promise.all(statementInsertTask);
      console.log(`courseName: ${meta.courseFileName} 全部上传成功`);
    }),
  );

  console.log("全部创建完成");
  process.exit(0);
})();

function convertToChineseNumber(name: string): string {
  // Pattern like "jp-minna-1" → "大家的日本语 第一课"
  const minnaMatch = name.match(/^jp-minna-(\d+)$/);
  if (minnaMatch) {
    return `大家的日本语 ${toChineseLessonName(minnaMatch[1])}`;
  }

  // Original numeric-only filenames
  if (/^\d+$/.test(name)) {
    return toChineseLessonName(name);
  }

  return name;
}

function toChineseLessonName(numStr: string): string {
  const chineseNumbers = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  let chineseStr = "第";
  if (parseInt(numStr) >= 10) {
    const [tens, ones] = numStr.split("");
    if (tens !== "1") {
      chineseStr += chineseNumbers[parseInt(tens, 10)];
    }
    chineseStr += "十";
    if (ones !== "0") {
      chineseStr += chineseNumbers[parseInt(ones, 10)];
    }
  } else {
    chineseStr += chineseNumbers[parseInt(numStr, 10)];
  }
  chineseStr += "课";
  return chineseStr;
}
