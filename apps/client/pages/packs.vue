<template>
  <div class="packs">
    <div class="head">
      <div class="title">课程包</div>
      <div class="count">{{ cards.length }} 个课程</div>
    </div>
    <div
      v-if="loading"
      class="loading"
    >
      加载中…
    </div>
    <div
      v-else
      class="grid"
    >
      <DashboardCourseCard
        v-for="c in cards"
        :key="c.href"
        v-bind="c"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchCoursePack, fetchCoursePacks } from "~/api/course-pack";
import DashboardCourseCard from "~/components/dashboard/CourseCard.vue";

const packs = ref<Array<{ id: string; title: string; description: string }>>([]);
const firstCourseIdByPack = ref<Record<string, string>>({});
const loading = ref(true);

const palette = [
  "cover-blue",
  "cover-teal",
  "cover-violet",
  "cover-rose",
  "cover-amber",
  "cover-slate",
];

function glyphFor(title: string): string {
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

const cards = computed(() =>
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
    console.warn("[packs] load failed", err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.packs {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-0);
}
.count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-3);
}
.loading {
  text-align: center;
  padding: 60px;
  color: var(--text-3);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
</style>
