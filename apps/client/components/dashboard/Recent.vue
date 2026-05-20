<template>
  <div class="card">
    <div class="card-head">
      <div class="card-title">最近练习</div>
    </div>

    <div
      v-if="items.length === 0"
      class="empty"
    >
      <div class="ico">
        <ShellNavIcon name="pack" />
      </div>
      还没有学习记录哦
    </div>

    <NuxtLink
      v-for="r in items"
      :key="r.id"
      :to="r.href"
      class="row"
    >
      <div
        class="glyph"
        :class="r.color"
      >
        {{ r.glyph }}
      </div>
      <div class="body">
        <div class="t">{{ r.title }}</div>
        <div class="s">{{ r.subtitle }}</div>
      </div>
      <ShellNavIcon name="chevronRight" />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import ShellNavIcon from "~/components/shell/NavIcon.vue";

defineProps<{
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    glyph: string;
    color: string;
    href: string;
  }>;
}>();
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
  justify-content: space-between;
  margin-bottom: 18px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
}

.empty {
  padding: 32px 12px;
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
}
.empty .ico {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-2);
  margin: 0 auto 12px;
  display: grid;
  place-items: center;
  color: var(--text-2);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-2);
  border: 1px solid var(--border-soft);
  margin-bottom: 8px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.12s ease;
}
.row:hover {
  border-color: var(--border);
}
.row:last-child {
  margin-bottom: 0;
}
.row :deep(svg) {
  color: var(--text-3);
}

.glyph {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
}
.glyph.blue {
  background: var(--accent-soft);
  color: var(--accent);
}
.glyph.teal {
  background: var(--teal-soft);
  color: var(--teal);
}
.glyph.violet {
  background: rgba(139, 127, 255, 0.14);
  color: var(--violet);
}

.body {
  flex: 1;
  min-width: 0;
}
.t {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-0);
}
.s {
  font-size: 11.5px;
  color: var(--text-3);
  font-family: var(--font-mono);
  margin-top: 1px;
}
</style>
