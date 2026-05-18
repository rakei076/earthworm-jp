import type { FuriganaSegment, StatementToken } from "@earthworm/schema";

export interface Statement {
  japanese: string;
  tokens: StatementToken[];
  furigana: FuriganaSegment[];
  chinese: string;
}

interface Course {
  title: string;
  description: string;
  statements: Statement[];
  learningContent: string;
}

export interface CreateCoursePack {
  title: string;
  description: string;
  cover: string;
  uId: string;
  shareLevel: string;
  courses: Course[];
}

type UpdateCourse = Course & { publishCourseId: string };

export interface UpdateCoursePack {
  title: string;
  description: string;
  cover: string;
  uId: string;
  shareLevel: string;
  courses: UpdateCourse[];
}
