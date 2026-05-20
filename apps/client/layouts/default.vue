<template>
  <div class="shell">
    <ShellSidebar />
    <main class="main">
      <ShellTopbar :title="pageTitle" />
      <div class="content">
        <NuxtPage />
      </div>
    </main>
  </div>
  <UserMenu />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const TITLES: Record<string, string> = {
  "/": "主页",
  "/packs": "课程包",
  "/analytics": "速度分析",
  "/pk": "PK 对战",
  "/rank": "排行榜",
  "/mastered-elements": "已掌握",
};

const pageTitle = computed(() => {
  if (route.path.startsWith("/game/")) return "练习";
  if (route.path.startsWith("/packs/")) return "课程包";
  return TITLES[route.path] || "句楽部";
});
</script>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 100vh;
  background: var(--bg-0);
}

.main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content {
  padding: 22px 28px 80px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .shell {
    grid-template-columns: 1fr;
  }
}
</style>
