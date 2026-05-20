<template>
  <div class="topbar">
    <div class="topbar-left">
      <NavIcon name="panel" />
      <span>{{ title }}</span>
    </div>
    <div class="topbar-right">
      <UButton
        v-if="!authed"
        color="primary"
        size="sm"
        @click="signIn()"
      >
        登录
      </UButton>
      <div
        v-else
        class="avatar"
      >
        {{ avatarChar }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { isAuthenticated, signIn } from "~/services/auth";
import { useUserStore } from "~/store/user";
import NavIcon from "./NavIcon.vue";

defineProps<{ title: string }>();

const userStore = useUserStore();
const authed = computed(() => isAuthenticated());
const avatarChar = computed(() => {
  const name = userStore.user?.username || "句";
  return String(name).slice(0, 1);
});
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  position: sticky;
  top: 0;
  background: rgba(11, 13, 18, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-soft);
  z-index: 10;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-1);
  font-size: 15px;
  font-weight: 500;
}
.topbar-left :deep(svg) {
  color: var(--text-2);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-strong), var(--accent));
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}
</style>
