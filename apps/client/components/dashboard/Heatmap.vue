<template>
  <div class="card">
    <div class="card-head">
      <div class="card-title">学习热力图</div>
      <div class="heatmap-head">
        <button
          class="nav-arrow"
          @click="month = Math.max(1, month - 1)"
        >
          <ShellNavIcon name="chevronLeft" />
        </button>
        {{ year }}年{{ month }}月
        <button
          class="nav-arrow"
          @click="month = Math.min(12, month + 1)"
        >
          <ShellNavIcon name="chevronRight" />
        </button>
      </div>
    </div>

    <div class="heatmap">
      <div
        v-for="d in ['月', '火', '水', '木', '金', '土', '日']"
        :key="d"
        class="heat-head"
      >
        {{ d }}
      </div>
      <template
        v-for="(cell, i) in cells"
        :key="i"
      >
        <div
          v-if="cell.kind === 'empty'"
          class="empty"
        />
        <div
          v-else
          class="heat-cell"
          :class="cell.cls"
          :title="`${month}月${cell.d}日`"
        />
      </template>
    </div>

    <div class="legend">
      <span>少</span>
      <div class="scale">
        <span class="sq heat-cell" />
        <span class="sq heat-cell heat-1" />
        <span class="sq heat-cell heat-2" />
        <span class="sq heat-cell heat-3" />
        <span class="sq heat-cell heat-4" />
      </div>
      <span>多</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import ShellNavIcon from "~/components/shell/NavIcon.vue";

const now = new Date();
const year = now.getFullYear();
const month = ref(now.getMonth() + 1);
const today = now.getDate();

const cells = computed(() => {
  const result: Array<{ kind: "empty" } | { kind: "day"; d: number; cls: string }> = [];
  const firstOfMonth = new Date(year, month.value - 1, 1);
  // Monday = 0 ... Sunday = 6
  const dow = firstOfMonth.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  for (let i = 0; i < offset; i++) result.push({ kind: "empty" });

  const daysInMonth = new Date(year, month.value, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    let cls = "";
    if (d > today) cls = "heat-future";
    // Real intensity hookup TBD — empty for now
    result.push({ kind: "day", d, cls });
  }
  while (result.length % 7 !== 0) result.push({ kind: "empty" });
  return result;
});
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-l);
  padding: 22px;
  box-shadow: var(--shadow-card);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
}

.heatmap-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-1);
}
.nav-arrow {
  background: none;
  border: 0;
  color: var(--text-3);
  padding: 2px;
  cursor: pointer;
}
.nav-arrow:hover {
  color: var(--text-0);
}

.heatmap {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-top: 6px;
}
.heat-head {
  font-size: 10px;
  color: var(--text-3);
  text-align: center;
  padding-bottom: 4px;
  font-family: var(--font-mono);
}
.heat-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  background: var(--bg-2);
  transition: transform 0.12s ease;
}
.heat-cell:hover {
  transform: scale(1.18);
  z-index: 2;
}
.heat-1 {
  background: rgba(59, 130, 246, 0.18);
}
.heat-2 {
  background: rgba(59, 130, 246, 0.36);
}
.heat-3 {
  background: rgba(59, 130, 246, 0.6);
}
.heat-4 {
  background: var(--accent);
}
.heat-future {
  background: var(--bg-1);
  opacity: 0.5;
}

.legend {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.legend .scale {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend .sq {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
</style>
