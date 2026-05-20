<template>
  <NuxtLink
    :to="href"
    class="course-card"
  >
    <div
      class="cover"
      :class="coverClass"
    >
      <div class="kana">{{ glyph }}</div>
    </div>
    <div class="level">{{ level }}</div>
    <div class="ctitle">{{ title }}</div>
    <div class="cmeta">
      <template
        v-for="(m, i) in meta"
        :key="i"
      >
        <span
          v-if="i > 0"
          class="dot"
          >·</span
        >
        <span>{{ m }}</span>
      </template>
    </div>
    <div class="progress-row">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <span>{{ progress }}%</span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  href: string;
  glyph: string;
  level: string;
  title: string;
  meta: string[];
  progress: number;
  coverClass?: string;
}>();
</script>

<style scoped>
.course-card {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-l);
  padding: 14px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.12s ease,
    transform 0.12s ease;
}
.course-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.cover {
  height: 110px;
  border-radius: var(--radius-m);
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  position: relative;
  overflow: hidden;
}
.cover::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.1), transparent 60%);
}
.cover.cover-blue {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}
.cover.cover-teal {
  background: linear-gradient(135deg, #4fd1c5, #0d9488);
}
.cover.cover-violet {
  background: linear-gradient(135deg, #8b7fff, #6d28d9);
}
.cover.cover-slate {
  background: linear-gradient(135deg, #64748b, #334155);
}
.cover.cover-amber {
  background: linear-gradient(135deg, #f59e0b, #b45309);
}
.cover.cover-rose {
  background: linear-gradient(135deg, #f43f5e, #9f1239);
}

.kana {
  font-size: 54px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.02em;
  font-family: var(--font-jp);
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  z-index: 1;
}

.level {
  position: absolute;
  top: 20px;
  right: 20px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  letter-spacing: 0.05em;
  z-index: 2;
}

.ctitle {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--text-0);
  margin-top: 4px;
  line-height: 1.4;
}

.cmeta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.cmeta .dot {
  color: var(--text-3);
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.progress-bar {
  flex: 1;
  height: 5px;
  background: var(--bg-3);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  border-radius: 3px;
  transition: width 0.4s ease;
}
.progress-row span {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-2);
  min-width: 32px;
  text-align: right;
}
</style>
