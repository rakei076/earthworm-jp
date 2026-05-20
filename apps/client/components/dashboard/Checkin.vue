<template>
  <div class="card">
    <div class="card-head">
      <div class="card-title">每日打卡</div>
    </div>

    <div class="checkin-stats">
      <div class="stat-left">
        <div class="stat-label">
          <ShellNavIcon name="flame" />
          连胜
        </div>
        <div class="stat-val">{{ streak }}<span class="unit">日</span></div>
      </div>
      <div class="stat-right">
        <div class="stat-label">累计打卡</div>
        <div class="stat-val">{{ total }}<span class="unit">日</span></div>
      </div>
    </div>

    <div class="goal-row">
      <div class="top">
        <span>今日目标</span>
        <span class="val">{{ todayGoal }}/{{ goalMax }} 句</span>
      </div>
      <div class="bar">
        <div
          class="fill"
          :style="{ width: `${Math.min(100, (todayGoal / goalMax) * 100)}%` }"
        />
      </div>
    </div>

    <div class="week-row">
      <div class="label">本周打卡记录</div>
      <div class="week-grid">
        <div
          v-for="(d, i) in dayNames"
          :key="d"
          class="day-cell"
          :class="{ today: i === todayIdx, done: weekDone[i] === 1 }"
        >
          <div class="name">{{ d }}</div>
          <div class="box">
            <ShellNavIcon
              v-if="weekDone[i] === 1"
              name="check"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="actions">
      <NuxtLink
        v-if="!authed"
        to="#"
        class="btn btn-secondary"
        @click.prevent="signIn"
      >
        登录后开始记录
      </NuxtLink>
      <NuxtLink
        v-else
        to="/packs"
        class="btn btn-primary"
      >
        继续练习
        <ShellNavIcon name="chevronRight" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import ShellNavIcon from "~/components/shell/NavIcon.vue";
import { isAuthenticated, signIn } from "~/services/auth";

// Real progress data hookup TBD — show empty state for now.
const streak = 0;
const total = 0;
const todayGoal = 0;
const goalMax = 5;
const weekDone = [0, 0, 0, 0, 0, 0, 0];

const dayNames = ["月", "火", "水", "木", "金", "土", "日"];
const todayIdx = (() => {
  // Monday = 0, Sunday = 6
  const d = new Date().getDay(); // Sunday=0
  return d === 0 ? 6 : d - 1;
})();

const authed = computed(() => isAuthenticated());
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-l);
  padding: 22px;
  display: flex;
  flex-direction: column;
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

.checkin-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: linear-gradient(180deg, var(--accent-soft), transparent);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-m);
  padding: 16px 18px;
  position: relative;
  overflow: hidden;
}
.stat-label {
  font-size: 12px;
  color: var(--text-2);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.stat-right .stat-label {
  justify-content: flex-end;
}
.stat-val {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 30px;
  line-height: 1;
  color: var(--accent);
}
.stat-right .stat-val {
  color: var(--text-0);
  justify-content: flex-end;
}
.stat-val .unit {
  font-size: 13px;
  color: var(--text-2);
  font-weight: 500;
}
.stat-right {
  text-align: right;
}

.goal-row {
  margin-top: 14px;
  background: var(--bg-2);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 12px 16px;
}
.goal-row .top {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 8px;
}
.goal-row .top .val {
  font-family: var(--font-mono);
  color: var(--text-2);
}
.goal-row .bar {
  height: 6px;
  background: var(--bg-3);
  border-radius: 3px;
  overflow: hidden;
}
.goal-row .fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  border-radius: 3px;
  transition: width 0.4s ease;
}

.week-row {
  margin-top: 16px;
}
.week-row .label {
  font-size: 13px;
  color: var(--text-1);
  margin-bottom: 10px;
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.day-cell .name {
  font-size: 11px;
  color: var(--text-3);
}
.day-cell .box {
  width: 100%;
  aspect-ratio: 1;
  max-width: 38px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  display: grid;
  place-items: center;
  color: var(--text-3);
}
.day-cell.today .box {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
.day-cell.done .box {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.actions {
  margin-top: 18px;
}
.btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: none;
}
.btn-secondary {
  background: var(--bg-2);
  border: 1px solid var(--border);
  color: var(--text-0);
}
.btn-secondary:hover {
  background: var(--bg-3);
}
.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 14px -6px rgba(59, 130, 246, 0.5);
}
.btn-primary:hover {
  filter: brightness(1.05);
}
</style>
