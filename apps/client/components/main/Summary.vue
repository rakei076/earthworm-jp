<template>
  <UModal
    v-model="showModal"
    prevent-close
  >
    <UContainer
      :ui="{
        base: 'w-[90vw]',
        constrained: 'max-w-[780px]',
      }"
    >
      <div class="flex justify-between">
        <h3 className="font-bold text-lg mb-4">🎉 恭喜!</h3>
        <button
          tabindex="0"
          class="btn btn-ghost btn-sm mx-1 h-7 w-7 rounded-md p-0"
          @click="soundSentence"
        >
          <UIcon
            name="i-ph-speaker-simple-high"
            class="h-full w-full"
          ></UIcon>
        </button>
      </div>

      <div class="flex flex-col">
        <div class="flex">
          <span class="text-3xl font-bold sm:text-4xl lg:text-6xl">"</span>
          <div class="flex-1 text-center text-sm leading-loose sm:text-base lg:text-xl">
            {{ enSentence }}
          </div>
          <span class="invisible text-3xl font-bold sm:text-4xl lg:text-6xl">"</span>
        </div>

        <div class="flex">
          <span class="invisible text-3xl font-bold sm:text-4xl lg:text-6xl">"</span>
          <div class="flex-1 text-center text-sm leading-loose sm:text-base lg:text-xl">
            {{ zhSentence }}
          </div>
          <span class="text-3xl font-bold sm:text-4xl lg:text-6xl">"</span>
        </div>
        <p class="text-right text-xs text-gray-200 sm:text-sm">—— 金山词霸「每日一句」</p>
        <p
          class="pl-2 text-xs leading-loose text-gray-600 sm:pl-4 sm:text-sm lg:pl-14 lg:text-base"
        >
          {{
            `恭喜您一共完成 ${courseTimer.totalRecordNumber()} 道题，用时 ${formatSecondsToTime(
              courseTimer.calculateTotalTime(),
            )} `
          }}
        </p>
        <p
          v-if="isAuthenticated()"
          class="pl-2 text-xs leading-loose text-gray-400 sm:pl-4 sm:text-sm lg:pl-14 lg:text-base"
        >
          今天一共学习 <span class="text-blue-400">{{ formattedMinutes }}分钟</span> 啦！
          <span v-if="totalMinutes >= 30">太强了，给自己来点掌声 😄</span>
        </p>
      </div>
      <div className="modal-action flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
        <button
          class="btn btn-primary w-full sm:w-auto"
          @click="toShare"
        >
          生成打卡图
        </button>
        <button
          class="btn w-full sm:w-auto"
          @click="handleDoAgain"
        >
          再来一次
        </button>
        <button
          class="btn w-full sm:w-auto"
          @click="handleGoToCourseList"
        >
          课程列表
        </button>
        <button
          class="btn w-full sm:w-auto"
          @click="goToNextCourse"
        >
          下一课
          <UKbd> ↵ </UKbd>
        </button>
      </div>
    </UContainer>
  </UModal>

  <canvas
    ref="confettiCanvasRef"
    class="pointer-events-none absolute left-0 top-0 z-[1000] h-full w-full"
  ></canvas>
</template>

<script setup lang="ts">
import { useModal } from "#imports";
import { computed, ref, watch } from "vue";
import { toast } from "vue-sonner";

import Dialog from "~/components/common/Dialog.vue";
import { useActiveCourseMap } from "~/composables/courses/activeCourse";
import { courseTimer } from "~/composables/courses/courseTimer";
import { useConfetti } from "~/composables/main/confetti/useConfetti";
import { readOneSentencePerDayAloud } from "~/composables/main/englishSound";
import { useGameMode } from "~/composables/main/game";
import { useLearningTimeTracker } from "~/composables/main/learningTimeTracker";
import { useShareModal } from "~/composables/main/shareImage/share";
import { useDailySentence, useSummary } from "~/composables/main/summary";
import { useNavigation } from "~/composables/useNavigation";
import { isAuthenticated, signIn } from "~/services/auth";
import { useCourseStore } from "~/store/course";
import { useCoursePackStore } from "~/store/coursePack";
import { useGameStore } from "~/store/game";
import { permitSaveStatement, preventSaveStatement } from "~/store/statement";
import { formatSecondsToTime } from "~/utils/date";
import { cancelShortcut, registerShortcut } from "~/utils/keyboardShortcuts";

const courseStore = useCourseStore();
const coursePackStore = useCoursePackStore();
const { gotoCourseList, gotoGame } = useNavigation();
const { showQuestion } = useGameMode();
const { handleGoToCourseList, goToNextCourse, completeCourse } = useCourse();
const { handleDoAgain } = useDoAgain();
const { showModal, hideSummary } = useSummary();
const { zhSentence, enSentence } = useDailySentence();
const { confettiCanvasRef, playConfetti } = useConfetti();
const { showShareModal } = useShareModal();
const { updateActiveCourseMap } = useActiveCourseMap();
const { totalMinutes, formattedMinutes } = useTotalLearningTime();

const gameStore = useGameStore();
const modal = useModal();

watch(showModal, (val) => {
  if (val) {
    // 阻止包含 statement 完成课程后会自动把用户的进度设置成下一课
    // 这里是为了防止先设置成下一课 后更新了 statement 的进度
    // 这就会造成获取用户最近的课程包进度出现错误  因为是基于时间来获取的
    preventSaveStatement();
    // 注册回车键进入下一课
    registerShortcut("enter", goToNextCourse);
    // 显示结算面板代表当前课程已经完成
    completeCourse();
    // 朗读每日一句
    soundSentence();
    // 延迟一小会放彩蛋
    // 停止计时
    gameStore.completeLevel();
    setTimeout(async () => {
      playConfetti();
    }, 300);
  } else {
    // 取消回车键进入下一课
    cancelShortcut("enter", goToNextCourse);
    permitSaveStatement();
  }
});

function useTotalLearningTime() {
  const { totalSeconds } = useLearningTimeTracker();
  const totalMinutes = computed(() => Math.ceil(totalSeconds.value / 60));

  const formattedMinutes = computed(() => {
    return Math.max(totalMinutes.value, 1).toString();
  });

  return {
    totalMinutes,
    formattedMinutes,
  };
}

function useDoAgain() {
  async function handleDoAgain() {
    // 看看是不是没有全部掌握了
    // 如果是全部掌握了 那么给个提示 然后挑战到课程列表
    if (courseStore.isAllMastered()) {
      toast.info("你已经全部都掌握 自动帮你跳转到课程列表啦", {
        duration: 1500,
        onAutoClose: () => {
          handleGoToCourseList();
        },
      });
      return;
    }
    courseStore.doAgain();
    hideSummary();
    showQuestion();
    courseTimer.reset();
    gameStore.startGame();
  }

  return {
    handleDoAgain,
  };
}

// 朗读每日一句
function soundSentence() {
  readOneSentencePerDayAloud(enSentence.value);
}

function useCourse() {
  let nextCourseId = ref("");

  const haveNextCourse = computed(() => {
    return nextCourseId.value;
  });

  async function goToNextCourse() {
    if (!isAuthenticated()) {
      // 去注册
      modal.open(Dialog, {
        title: "✨ 解锁更多学习体验",
        content: "注册后可以进行下一课学习 记录每日学习数据 开启更多功能哦",
        showCancel: true,
        showConfirm: true,
        cancelText: "稍后再说",
        confirmText: "立即注册",
        async onConfirm() {
          courseStore.resetStatementIndex();
          showQuestion();
          signIn();
        },
      });

      return;
    }

    hideSummary();

    if (!haveNextCourse.value) {
      toast.info("已经是最后一课 自动帮你跳转到课程列表啦", {
        duration: 1500,
        onAutoClose: () => {
          handleGoToCourseList();
        },
      });
      return;
    }

    if (courseStore.currentCourse) {
      gotoGame(courseStore.currentCourse.coursePackId, nextCourseId.value);
    }
  }

  function handleGoToCourseList() {
    hideSummary();
    if (courseStore.currentCourse) {
      gotoCourseList(courseStore.currentCourse.coursePackId);
    }
  }

  async function completeCourse() {
    if (isAuthenticated() && courseStore.currentCourse) {
      const { coursePackId } = courseStore.currentCourse;
      const { nextCourse } = await courseStore.completeCourse();
      coursePackStore.updateCoursesCompleteCount(coursePackId);

      if (nextCourse) {
        nextCourseId.value = nextCourse.id;
        updateActiveCourseMap(coursePackId, nextCourseId.value);
      } else {
        updateActiveCourseMap(coursePackId, "");
      }
    }
  }

  return {
    completeCourse,
    goToNextCourse,
    handleGoToCourseList,
  };
}

const toShare = () => {
  showShareModal();
};
</script>
