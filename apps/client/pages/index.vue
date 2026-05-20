<template>
  <div class="dashboard">
    <div class="row-2">
      <DashboardCheckin />
      <div class="stack">
        <DashboardHeatmap />
        <DashboardRecent :items="[]" />
      </div>
    </div>

    <DashboardCoursesGrid :cards="cards" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchCoursePack, fetchCoursePacks } from "~/api/course-pack";
import DashboardCheckin from "~/components/dashboard/Checkin.vue";
import DashboardCoursesGrid from "~/components/dashboard/CoursesGrid.vue";
import DashboardHeatmap from "~/components/dashboard/Heatmap.vue";
import DashboardRecent from "~/components/dashboard/Recent.vue";

type Card = {
  href: string;
  glyph: string;
  level: string;
  title: string;
  meta: string[];
  progress: number;
  coverClass: string;
};

const packs = ref<Array<{ id: string; title: string; description: string }>>([]);
const firstCourseIdByPack = ref<Record<string, string>>({});

const palette = [
  "cover-blue",
  "cover-teal",
  "cover-violet",
  "cover-rose",
  "cover-amber",
  "cover-slate",
];

function glyphFor(title: string): string {
  if (title.includes("〜てください")) return "願";
  if (title.includes("〜ています")) return "進";
  if (title.includes("〜なければなりません")) return "必";
  if (title.includes("〜たい")) return "欲";
  if (title.includes("〜ことができる")) return "能";
  if (title.includes("〜より")) return "比";
  if (title.includes("〜から")) return "因";
  if (title.includes("入门短句")) return "あ";
  if (title.includes("日常基础")) return "話";
  if (title.includes("简单造句")) return "は";
  if (title.includes("复合句型")) return "文";
  if (title.includes("进阶练习")) return "級";
  if (title.includes("进阶短句")) return "中";
  if (title.includes("日常造句")) return "中";
  if (title.includes("大家")) return "本";
  const m = title.match(/[一-鿿぀-ヿ]/);
  return m ? m[0] : "句";
}

function levelFor(title: string): string {
  if (title.includes("N5")) return "N5";
  if (title.includes("N4")) return "N4";
  if (title.includes("N3")) return "N3";
  return "入门";
}

const cards = computed<Card[]>(() =>
  packs.value.map((p, i) => ({
    href: firstCourseIdByPack.value[p.id]
      ? `/game/${p.id}/${firstCourseIdByPack.value[p.id]}`
      : `/course-pack/${p.id}`,
    glyph: glyphFor(p.title),
    level: levelFor(p.title),
    title: p.title,
    meta: p.description ? [p.description] : [],
    progress: 0,
    coverClass: palette[i % palette.length],
  })),
);

onMounted(async () => {
  try {
    const list = await fetchCoursePacks();
    packs.value = list as any;
    const entries = await Promise.all(
      list.map(async (p: any) => {
        try {
          const detail = await fetchCoursePack(p.id);
          return [p.id, detail.courses?.[0]?.id ?? ""] as const;
        } catch {
          return [p.id, ""] as const;
        }
      }),
    );
    firstCourseIdByPack.value = Object.fromEntries(entries);
  } catch (err) {
    console.warn("[dashboard] failed to load course packs", err);
  }
});
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.row-2 {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr);
  gap: 18px;
}
@media (max-width: 900px) {
  .row-2 {
    grid-template-columns: 1fr;
  }
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
</style>
