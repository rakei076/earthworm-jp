import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { course } from "./course";

export type StatementToken = {
  surface: string;
  reading: string;
};

export type FuriganaSegment = {
  base: string;
  ruby?: string;
};

export const statement = pgTable("statements", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  order: integer("order").notNull(),
  chinese: text("chinese").notNull(),
  japanese: text("japanese").notNull(),
  tokens: jsonb("tokens").$type<StatementToken[]>().notNull(),
  furigana: jsonb("furigana").$type<FuriganaSegment[]>().notNull(),
  courseId: text("course_id")
    .notNull()
    .references(() => course.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

export const statementRelations = relations(statement, ({ one }) => ({
  course: one(course, {
    fields: [statement.courseId],
    references: [course.id],
  }),
}));
