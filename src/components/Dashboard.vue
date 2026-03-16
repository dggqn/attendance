<template>
  <div class="dashboard">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <h1>
        {{ greeting }}，{{ userStore.currentUser?.nickname || userStore.currentUser?.username }}！
      </h1>
      <p class="date">{{ todayText }}</p>
    </div>

    <!-- 今日打卡状态卡片 -->
    <div class="section">
      <h2 class="section-title">📍 今日打卡</h2>
      <div class="checkin-cards">
        <div class="checkin-card" :class="{ done: attendanceStore.hasCheckedInToday }">
          <div class="checkin-icon">🌅</div>
          <div class="checkin-info">
            <div class="checkin-label">上班打卡</div>
            <div class="checkin-time">
              {{ attendanceStore.todayRecord?.checkIn || '未打卡' }}
            </div>
            <div v-if="attendanceStore.hasCheckedInToday" class="checkin-status success">
              已打卡
            </div>
            <div v-else class="checkin-status pending">
              待打卡
            </div>
          </div>
        </div>

        <div class="checkin-card" :class="{ done: attendanceStore.hasCheckedOutToday }">
          <div class="checkin-icon">🌙</div>
          <div class="checkin-info">
            <div class="checkin-label">下班打卡</div>
            <div class="checkin-time">
              {{ attendanceStore.todayRecord?.checkOut || '未打卡' }}
            </div>
            <div v-if="attendanceStore.hasCheckedOutToday" class="checkin-status success">
              已打卡
            </div>
            <div v-else class="checkin-status pending">
              待打卡
            </div>
          </div>
        </div>

        <!-- 快速打卡按钮 -->
        <div class="quick-actions">
          <button
            v-if="!attendanceStore.hasCheckedInToday"
            class="btn-quick checkin"
            @click="quickCheckIn"
          >
            立即上班打卡
          </button>
          <button
            v-else-if="!attendanceStore.hasCheckedOutToday"
            class="btn-quick checkout"
            @click="quickCheckOut"
          >
            立即下班打卡
          </button>
          <button v-else class="btn-quick completed">
            今日打卡完成 ✓
          </button>
        </div>
      </div>
    </div>

    <!-- 考勤日历 -->
    <div class="section">
      <h2 class="section-title">📅 考勤日历</h2>
      <AttendanceCalendar />
    </div>

    <!-- 本月统计 -->
    <div class="section">
      <h2 class="section-title">📊 本月统计</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon bg-blue">📅</div>
          <div class="stat-info">
            <div class="stat-value">{{ attendanceStore.stats.total }}</div>
            <div class="stat-label">出勤天数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-green">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ attendanceStore.stats.normal }}</div>
            <div class="stat-label">正常出勤</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-yellow">⏰</div>
          <div class="stat-info">
            <div class="stat-value">{{ attendanceStore.stats.late }}</div>
            <div class="stat-label">迟到次数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-red">❌</div>
          <div class="stat-info">
            <div class="stat-value">{{ attendanceStore.stats.absent }}</div>
            <div class="stat-label">缺勤次数</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 待审批提醒（仅管理员/超管） -->
    <div v-if="userStore.isAdmin" class="section">
      <h2 class="section-title">
        🔔 待审批
        <span v-if="leaveRequestStore.stats.pending > 0" class="badge">
          {{ leaveRequestStore.stats.pending }}
        </span>
      </h2>
      <div class="pending-list">
        <div v-if="leaveRequestStore.stats.pending === 0" class="empty">
          暂无待审批的申请
        </div>
        <div v-else class="pending-items">
          <div
            v-for="request in pendingRequests.slice(0, 3)"
            :key="request.id"
            class="pending-item"
            @click="goToLeavePage"
          >
            <div class="pending-type">{{ leaveRequestStore.leaveTypeText[request.type] }}</div>
            <div class="pending-user">{{ request.userName }}</div>
            <div class="pending-date">{{ request.startDate }}</div>
            <div class="pending-arrow">→</div>
          </div>
          <div v-if="leaveRequestStore.stats.pending > 3" class="more" @click="goToLeavePage">
            还有 {{ leaveRequestStore.stats.pending - 3 }} 条待审批 →
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="section">
      <h2 class="section-title">⚡ 快捷入口</h2>
      <div class="quick-links">
        <div class="quick-link" @click="goToPage('record')">
          <div class="link-icon">📝</div>
          <div class="link-text">考勤打卡</div>
        </div>
        <div class="quick-link" @click="goToPage('table')">
          <div class="link-icon">📋</div>
          <div class="link-text">数据查询</div>
        </div>
        <div class="quick-link" @click="goToPage('chart')">
          <div class="link-icon">📊</div>
          <div class="link-text">统计图表</div>
        </div>
        <div class="quick-link" @click="goToPage('leave')">
          <div class="link-icon">📄</div>
          <div class="link-text">请假/补卡</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useAttendanceStore } from '@/stores/attendance';
import { useLeaveRequestStore } from '@/stores/leaveRequest';
import AttendanceCalendar from './AttendanceCalendar.vue';
import dayjs from 'dayjs';

const props = defineProps<{
  currentTab: string;
}>();

const emit = defineEmits<{
  (e: 'change-tab', tab: string): void;
}>();

const userStore = useUserStore();
const attendanceStore = useAttendanceStore();
const leaveRequestStore = useLeaveRequestStore();

// 问候语
const greeting = computed(() => {
  const hour = dayjs().hour();
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

// 今日日期
const todayText = computed(() => {
  return dayjs().format('YYYY年MM月DD日 dddd');
});

// 待审批列表
const pendingRequests = computed(() => {
  return leaveRequestStore.requests.filter(r => r.status === 'pending');
});

onMounted(() => {
  // 加载数据
  attendanceStore.fetchRecords();
  if (userStore.isAdmin) {
    leaveRequestStore.fetchRequests();
  }
});

// 快速打卡
const quickCheckIn = async () => {
  if (!userStore.currentUser) return;
  
  const now = dayjs();
  const isLate = now.hour() > 9 || (now.hour() === 9 && now.minute() > 30);
  
  await attendanceStore.addRecord({
    employeeName: userStore.currentUser.nickname || userStore.currentUser.username,
    employeeId: userStore.currentUser.id.slice(0, 8).toUpperCase(),
    date: now.format('YYYY-MM-DD'),
    checkIn: now.format('HH:mm'),
    checkOut: '',
    status: isLate ? 'late' : 'normal',
    remark: isLate ? '迟到' : '',
  });
};

const quickCheckOut = async () => {
  if (!userStore.currentUser) return;
  
  const now = dayjs();
  
  if (attendanceStore.todayRecord) {
    await attendanceStore.addRecord({
      employeeName: userStore.currentUser.nickname || userStore.currentUser.username,
      employeeId: userStore.currentUser.id.slice(0, 8).toUpperCase(),
      date: now.format('YYYY-MM-DD'),
      checkIn: attendanceStore.todayRecord.checkIn || '',
      checkOut: now.format('HH:mm'),
      status: attendanceStore.todayRecord.status,
      remark: attendanceStore.todayRecord.remark,
    });
  }
};

// 跳转页面
const goToPage = (tab: string) => {
  emit('change-tab', tab);
};

const goToLeavePage = () => {
  emit('change-tab', 'leave');
};
</script>

<style scoped lang="less">
.dashboard {
  padding: 20px 0;
}

// 欢迎区域
.welcome-section {
  margin-bottom: 24px;

  h1 {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 8px 0;
  }

  .date {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }
}

// 区块
.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  .badge {
    background: #ef4444;
    color: #fff;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
  }
}

// 今日打卡
.checkin-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr) auto;
  gap: 16px;
  align-items: stretch;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.checkin-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 2px solid #e5e7eb;
  transition: all 0.3s;

  &.done {
    border-color: #10b981;
    background: #f0fdf4;
  }
}

.checkin-icon {
  font-size: 40px;
}

.checkin-info {
  flex: 1;
}

.checkin-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.checkin-time {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.checkin-status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;

  &.success {
    background: #d1fae5;
    color: #065f46;
  }

  &.pending {
    background: #fef3c7;
    color: #92400e;
  }
}

// 快速打卡按钮
.quick-actions {
  display: flex;
  align-items: center;
}

.btn-quick {
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;

  &.checkin {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
  }

  &.checkout {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #fff;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
    }
  }

  &.completed {
    background: #d1fae5;
    color: #065f46;
    cursor: default;
  }
}

// 统计网格
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;

  &.bg-blue { background: #dbeafe; }
  &.bg-green { background: #d1fae5; }
  &.bg-yellow { background: #fef3c7; }
  &.bg-red { background: #fee2e2; }
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

// 待审批列表
.pending-list {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.empty {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

.pending-items {
  .pending-item {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f9fafb;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .pending-type {
    background: #fef3c7;
    color: #92400e;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    margin-right: 16px;
  }

  .pending-user {
    flex: 1;
    font-weight: 500;
    color: #1f2937;
  }

  .pending-date {
    color: #6b7280;
    font-size: 14px;
  }

  .pending-arrow {
    margin-left: 16px;
    color: #9ca3af;
  }

  .more {
    padding: 12px 20px;
    text-align: center;
    color: #667eea;
    font-size: 14px;
    cursor: pointer;

    &:hover {
      background: #f9fafb;
    }
  }
}

// 快捷入口
.quick-links {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.quick-link {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
}

.link-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.link-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}
</style>
