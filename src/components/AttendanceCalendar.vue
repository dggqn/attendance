<template>
  <div class="attendance-calendar">
    <div class="calendar-header">
      <h2 class="section-title">📅 当月考勤</h2>
      <div class="month-selector">
        <button class="btn-nav" @click="prevMonth">◀</button>
        <span class="current-month">{{ currentYear }}年 {{ currentMonth + 1 }}月</span>
        <button class="btn-nav" @click="nextMonth">▶</button>
        <button class="btn-today" @click="goToToday">今天</button>
      </div>
    </div>

    <!-- 日历网格 -->
    <div class="calendar">
      <!-- 星期标题 -->
      <div class="week-header">
        <div v-for="day in weekDays" :key="day" class="week-day">{{ day }}</div>
      </div>

      <!-- 日期网格 -->
      <div class="days-grid">
        <div
          v-for="(date, index) in calendarDays"
          :key="index"
          :class="['day-cell', {
            'other-month': !date.isCurrentMonth,
            'today': date.isToday,
            'weekend': date.isWeekend,
            'has-record': date.record
          }]"
          @click="handleDateClick(date)"
        >
          <div class="day-number">{{ date.day }}</div>
          <div v-if="date.record" :class="['status-dot', date.record.status]"></div>
          <div v-else-if="date.isCurrentMonth && date.isPast" class="status-dot absent"></div>
          <div v-if="date.record?.checkIn" class="time-info">
            {{ date.record.checkIn }}
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="legend">
      <div class="legend-item">
        <span class="dot normal"></span>
        <span>正常</span>
      </div>
      <div class="legend-item">
        <span class="dot late"></span>
        <span>迟到</span>
      </div>
      <div class="legend-item">
        <span class="dot early"></span>
        <span>早退</span>
      </div>
      <div class="legend-item">
        <span class="dot absent"></span>
        <span>缺勤</span>
      </div>
      <div class="legend-item">
        <span class="dot leave"></span>
        <span>请假</span>
      </div>
    </div>

    <!-- 日期详情弹窗 -->
    <div v-if="selectedDate" class="modal-overlay" @click.self="closeModal">
      <div class="date-modal">
        <div class="modal-header">
          <h3>{{ selectedDate.fullDate }} 考勤详情</h3>
          <button class="btn-close" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <div v-if="selectedDate.record" class="record-detail">
            <div class="detail-item">
              <span class="label">状态：</span>
              <span :class="['status-tag', selectedDate.record.status]">
                {{ statusText[selectedDate.record.status] }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">上班时间：</span>
              <span class="value">{{ selectedDate.record.checkIn || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">下班时间：</span>
              <span class="value">{{ selectedDate.record.checkOut || '-' }}</span>
            </div>
            <div class="detail-item" v-if="selectedDate.record.remark">
              <span class="label">备注：</span>
              <span class="value">{{ selectedDate.record.remark }}</span>
            </div>
          </div>

          <div v-else class="no-record">
            <p>当天暂无考勤记录</p>
            <button
              v-if="canAddRecord"
              class="btn-add"
              @click="addRecordForDate"
            >
              补录考勤
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAttendanceStore } from '@/stores/attendance';
import { useUserStore } from '@/stores/user';
import dayjs from 'dayjs';

const attendanceStore = useAttendanceStore();
const userStore = useUserStore();

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const currentYear = ref(dayjs().year());
const currentMonth = ref(dayjs().month());
const selectedDate = ref<any>(null);

const statusText: Record<string, string> = {
  normal: '正常',
  late: '迟到',
  early: '早退',
  absent: '缺勤',
  leave: '请假',
};

// 获取某月的日历数据
const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;

  const firstDayOfMonth = dayjs(new Date(year, month, 1));
  const lastDayOfMonth = firstDayOfMonth.endOf('month');
  const startOfCalendar = firstDayOfMonth.startOf('week');
  const endOfCalendar = lastDayOfMonth.endOf('week');

  const days: any[] = [];
  let currentDay = startOfCalendar;

  // 构建日期映射，方便查找记录
  const recordMap = new Map();
  attendanceStore.records.forEach(record => {
    recordMap.set(record.date, record);
  });

  while (currentDay.isBefore(endOfCalendar) || currentDay.isSame(endOfCalendar, 'day')) {
    const dateStr = currentDay.format('YYYY-MM-DD');
    const isCurrentMonth = currentDay.month() === month;
    const isToday = currentDay.isSame(dayjs(), 'day');
    const isWeekend = currentDay.day() === 0 || currentDay.day() === 6;
    const isPast = currentDay.isBefore(dayjs(), 'day');

    days.push({
      date: currentDay,
      day: currentDay.date(),
      fullDate: dateStr,
      isCurrentMonth,
      isToday,
      isWeekend,
      isPast,
      record: recordMap.get(dateStr),
    });

    currentDay = currentDay.add(1, 'day');
  }

  return days;
});

// 是否可以补录
const canAddRecord = computed(() => {
  if (!selectedDate.value) return false;
  // 只能补录过去的日期
  return selectedDate.value.isPast || selectedDate.value.isToday;
});

// 加载当前月的考勤数据
const loadMonthData = () => {
  const startOfMonth = dayjs(new Date(currentYear.value, currentMonth.value, 1))
    .startOf('month')
    .format('YYYY-MM-DD');
  const endOfMonth = dayjs(new Date(currentYear.value, currentMonth.value, 1))
    .endOf('month')
    .format('YYYY-MM-DD');

  // 这里可以优化为按月份查询，目前先加载全部
  attendanceStore.fetchRecords();
};

onMounted(() => {
  loadMonthData();
});

// 切换月份时重新加载
watch([currentYear, currentMonth], () => {
  loadMonthData();
});

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

const goToToday = () => {
  currentYear.value = dayjs().year();
  currentMonth.value = dayjs().month();
};

const handleDateClick = (date: any) => {
  selectedDate.value = date;
};

const closeModal = () => {
  selectedDate.value = null;
};

const addRecordForDate = () => {
  // 跳转到考勤打卡页面并预填日期
  closeModal();
  // 可以 emit 事件让父组件切换 tab 并传日期
};
</script>

<style scoped lang="less">
.attendance-calendar {
  padding: 20px 0;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-nav {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
  }
}

.current-month {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  min-width: 120px;
  text-align: center;
}

.btn-today {
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

// 日历
.calendar {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.week-day {
  text-align: center;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: #f3f4f6;
  }

  &.other-month {
    color: #d1d5db;
  }

  &.today {
    background: #eef2ff;
    border: 2px solid #667eea;
  }

  &.weekend {
    background: #f9fafb;
  }

  &.has-record {
    font-weight: 500;
  }
}

.day-number {
  font-size: 14px;
  margin-bottom: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-bottom: 4px;

  &.normal { background: #10b981; }
  &.late { background: #f59e0b; }
  &.early { background: #f97316; }
  &.absent { background: #ef4444; }
  &.leave { background: #8b5cf6; }
}

.time-info {
  font-size: 11px;
  color: #6b7280;
}

// 图例
.legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #4b5563;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;

  &.normal { background: #10b981; }
  &.late { background: #f59e0b; }
  &.early { background: #f97316; }
  &.absent { background: #ef4444; }
  &.leave { background: #8b5cf6; }
}

// 弹窗
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.date-modal {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.record-detail {
  .detail-item {
    display: flex;
    margin-bottom: 12px;
    font-size: 14px;

    .label {
      color: #6b7280;
      width: 80px;
    }

    .value {
      color: #1f2937;
    }
  }
}

.status-tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;

  &.normal { background: #d1fae5; color: #065f46; }
  &.late { background: #fef3c7; color: #92400e; }
  &.early { background: #ffedd5; color: #9a3412; }
  &.absent { background: #fee2e2; color: #991b1b; }
  &.leave { background: #ede9fe; color: #5b21b6; }
}

.no-record {
  text-align: center;
  padding: 20px;

  p {
    color: #6b7280;
    margin-bottom: 16px;
  }
}

.btn-add {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

@media (max-width: 768px) {
  .days-grid {
    gap: 2px;
  }

  .day-cell {
    padding: 4px 2px;
  }

  .day-number {
    font-size: 12px;
  }

  .time-info {
    font-size: 10px;
  }

  .legend {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>
