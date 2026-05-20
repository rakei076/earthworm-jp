<template>
  <aside class="sidebar">
    <NuxtLink
      to="/"
      class="brand"
    >
      <div class="brand-mark">句</div>
      <div>
        <div class="brand-name">句楽部 KuRakuBu</div>
        <div class="brand-sub">type · to · learn 日本語</div>
      </div>
    </NuxtLink>

    <nav class="nav">
      <NuxtLink
        v-for="item in mainItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
      >
        <span class="icon"><NavIcon :name="item.icon" /></span>
        <span class="label">{{ item.label }}</span>
      </NuxtLink>

      <div class="nav-section">
        <div class="nav-section-title">
          <span>竞技场</span>
        </div>
        <NuxtLink
          v-for="item in arenaItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
        >
          <span class="icon"><NavIcon :name="item.icon" /></span>
          <span class="label">{{ item.label }}</span>
          <span
            v-if="item.badge"
            class="badge"
            >{{ item.badge }}</span
          >
        </NuxtLink>
      </div>
    </nav>

    <a
      class="upstream"
      href="https://github.com/rakei076/earthworm-jp"
      target="_blank"
      rel="noreferrer"
    >
      <NavIcon name="star" />
      Star on GitHub
    </a>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

import NavIcon from "./NavIcon.vue";

const route = useRoute();

const mainItems = [
  { to: "/", icon: "home", label: "主页" },
  { to: "/packs", icon: "pack", label: "课程包" },
  { to: "/analytics", icon: "chart", label: "速度分析" },
];

const arenaItems = [
  { to: "/pk", icon: "sword", label: "PK 对战", badge: "WIP" },
  { to: "/rank", icon: "ranking", label: "排行榜" },
];

function isActive(to: string) {
  if (to === "/") return route.path === "/";
  return route.path.startsWith(to);
}
</script>

<style scoped>
.sidebar {
  background: var(--bg-1);
  border-right: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
  position: sticky;
  top: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  color: var(--text-0);
  text-decoration: none;
}
.brand:hover {
  background: transparent;
}

.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #fff;
  font-size: 16px;
  box-shadow: 0 4px 14px -4px rgba(59, 130, 246, 0.55);
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.brand-sub {
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 12px;
}

.nav-section {
  margin-top: 14px;
}
.nav-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--text-3);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  color: var(--text-1);
  cursor: pointer;
  font-size: 13.5px;
  position: relative;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  text-decoration: none;
  margin-bottom: 2px;
}
.nav-item:hover {
  background: var(--bg-2);
  color: var(--text-0);
}
.nav-item.active {
  background: linear-gradient(90deg, var(--accent-soft), transparent 80%);
  color: var(--text-0);
  font-weight: 500;
}
.nav-item.active::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: var(--accent);
  border-radius: 2px;
}
.nav-item .icon {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  color: var(--text-2);
  flex-shrink: 0;
}
.nav-item.active .icon {
  color: var(--accent);
}
.nav-item .label {
  flex: 1;
}
.nav-item .badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-3);
  color: var(--text-2);
  letter-spacing: 0.05em;
}

.upstream {
  margin: 8px 14px 14px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-2);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  font-size: 12.5px;
  color: var(--text-1);
  text-decoration: none;
}
.upstream:hover {
  background: var(--bg-3);
  color: var(--text-0);
}
.upstream :deep(svg) {
  color: var(--gold);
}
</style>
