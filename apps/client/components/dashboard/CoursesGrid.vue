<template>
  <div class="courses-card">
    <div class="head">
      <div class="title">我的课程</div>
      <NuxtLink
        to="/packs"
        class="more"
      >
        查看全部 →
      </NuxtLink>
    </div>

    <div
      v-if="cards.length === 0"
      class="empty"
    >
      <div class="ico">+</div>
      <div class="t">还没有课程</div>
      <div class="s">从下方任选一个课程包开始练习</div>
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
import DashboardCourseCard from "./CourseCard.vue";

defineProps<{
  cards: Array<{
    href: string;
    glyph: string;
    level: string;
    title: string;
    meta: string[];
    progress: number;
    coverClass?: string;
  }>;
}>();
</script>

<style scoped>
.courses-card {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-l);
  padding: 22px;
  box-shadow: var(--shadow-card);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.more {
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
}
.more:hover {
  color: var(--accent-hover);
}

.empty {
  text-align: center;
  padding: 40px 12px;
  color: var(--text-3);
}
.empty .ico {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-2);
  margin: 0 auto 12px;
  display: grid;
  place-items: center;
  font-size: 22px;
  color: var(--text-2);
}
.empty .t {
  font-size: 14px;
  color: var(--text-1);
  margin-bottom: 4px;
}
.empty .s {
  font-size: 12.5px;
  color: var(--text-3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
</style>
