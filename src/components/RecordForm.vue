<template>
  <div class="record-form">
    <h2 class="form-title">📝 考勤打卡</h2>

    <!-- 快速打卡区域 -->
    <div class="quick-check">
      <h3>⚡ 快速打卡</h3>
      <div class="quick-actions">
        <button
          class="quick-btn check-in"
          :class="{ done: attendanceStore.hasCheckedInToday }"
          :disabled="attendanceStore.hasCheckedInToday"
          @click="quickCheckIn"
        >
          <span class="quick-icon">🌅</span>
          <span class="quick-text">
            {{ attendanceStore.hasCheckedInToday ? '已上班打卡' : '上班打卡' }}
          </span>
          <span class="quick-time" v-if="attendanceStore.todayRecord?.checkIn">
            {{ attendanceStore.todayRecord.checkIn }}
          </span>
        </button>
        <button
          class="quick-btn check-out"
          :class="{ done: attendanceStore.hasCheckedOutToday }"
          :disabled="attendanceStore.hasCheckedOutToday"
          @click="quickCheckOut"
        >
          <span class="quick-icon">🌙</span>
          <span class="quick-text">
            {{ attendanceStore.hasCheckedOutToday ? '已下班打卡' : '下班打卡' }}
          </span>
          <span class="quick-time" v-if="attendanceStore.todayRecord?.checkOut">
            {{ attendanceStore.todayRecord.checkOut }}
          </span>
        </button>
      </div>
    </div>

    <!-- 手动填写表单 -->
    <div class="manual-form">
      <h3>📝 手动补录</h3>
      <form @submit.prevent="handleSubmit" class="form-content">
        <div class="form-row">
          <div class="form-item">
            <label>姓名 <span class="required">*</span></label>
            <input
              v-model="form.employeeName"
              type="text"
              placeholder="请输入姓名"
              required
            />
          </div>
          <div class="form-item">
            <label>工号 <span class="required">*</span></label>
            <input
              v-model="form.employeeId"
              type="text"
              placeholder="请输入工号"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>日期 <span class="required">*</span></label>
            <input
              v-model="form.date"
              type="date"
              required
            />
          </div>
          <div class="form-item">
            <label>考勤状态 <span class="required">*</span></label>
            <select v-model="form.status" required>
              <option value="normal">正常</option>
              <option value="late">迟到</option>
              <option value="early">早退</option>
              <option value="absent">缺勤</option>
              <option value="leave">请假</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label>上班时间</label>
            <input
              v-model="form.checkIn"
              type="time"
              :disabled="form.status === 'absent'"
            />
          </div>
          <div class="form-item">
            <label>下班时间</label>
            <input
              v-model="form.checkOut"
              type="time"
              :disabled="form.status === 'absent'"
            />
          </div>
        </div>

        <div class="form-item full-width">
          <label>备注</label>
          <textarea
            v-model="form.remark"
            placeholder="请输入备注信息（选填）"
            rows="3"
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">提交记录</button>
          <button type="button" class="btn-secondary" @click="handleReset">重置</button>
        </div>
      </form>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card total">
        <div class="stat-value">{{ attendanceStore.stats.total }}</div>
        <div class="stat-label">总记录</div>
      </div>
      <div class="stat-card normal">
        <div class="stat-value">{{ attendanceStore.stats.normal }}</div>
        <div class="stat-label">正常</div>
      </div>
      <div class="stat-card late">
        <div class="stat-value">{{ attendanceStore.stats.late }}</div>
        <div class="stat-label">迟到</div>
      </div>
      <div class="stat-card early">
        <div class="stat-value">{{ attendanceStore.stats.early }}</div>
        <div class="stat-label">早退</div>
      </div>
      <div class="stat-card absent">
        <div class="stat-value">{{ attendanceStore.stats.absent }}</div>
        <div class="stat-label">缺勤</div>
      </div>
      <div class="stat-card leave">
        <div class="stat-value">{{ attendanceStore.stats.leave }}</div>
        <div class="stat-label">请假</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useAttendanceStore } from '@/stores/attendance';
import { useUserStore } from '@/stores/user';
import type { AttendanceRecord } from '@/types';
import dayjs from 'dayjs';

const attendanceStore = useAttendanceStore();
const userStore = useUserStore();

const form = reactive({
  employeeName: '',
  employeeId: '',
  date: dayjs().format('YYYY-MM-DD'),
  checkIn: dayjs().format('HH:mm'),
  checkOut: '',
  status: 'normal' as AttendanceRecord['status'],
  remark: ''
});

// 初始化表单，自动填充当前用户信息
onMounted(() => {
  if (userStore.currentUser) {
    form.employeeName = userStore.currentUser.nickname || userStore.currentUser.username;
    form.employeeId = userStore.currentUser.id.slice(0, 8).toUpperCase();
  }
});

// 快速上班打卡
const quickCheckIn = async () => {
  if (!userStore.currentUser) return;

  const now = dayjs();
  const checkInTime = now.format('HH:mm');
  // 9:30 之后算迟到
  const isLate = now.hour() > 9 || (now.hour() === 9 && now.minute() > 30);

  await attendanceStore.addRecord({
    employeeName: userStore.currentUser.nickname || userStore.currentUser.username,
    employeeId: userStore.currentUser.id.slice(0, 8).toUpperCase(),
    date: now.format('YYYY-MM-DD'),
    checkIn: checkInTime,
    checkOut: '',
    status: isLate ? 'late' : 'normal',
    remark: isLate ? '迟到' : '',
  });
};

// 快速下班打卡
const quickCheckOut = async () => {
  if (!userStore.currentUser) return;

  const now = dayjs();
  const checkOutTime = now.format('HH:mm');

  // 如果今天已有记录，更新下班时间
  if (attendanceStore.todayRecord) {
    await attendanceStore.addRecord({
      employeeName: userStore.currentUser.nickname || userStore.currentUser.username,
      employeeId: userStore.currentUser.id.slice(0, 8).toUpperCase(),
      date: now.format('YYYY-MM-DD'),
      checkIn: attendanceStore.todayRecord.checkIn || '',
      checkOut: checkOutTime,
      status: attendanceStore.todayRecord.status,
      remark: attendanceStore.todayRecord.remark,
    });
  } else {
    // 没有上班记录，直接打下班卡（异常）
    await attendanceStore.addRecord({
      employeeName: userStore.currentUser.nickname || userStore.currentUser.username,
      employeeId: userStore.currentUser.id.slice(0, 8).toUpperCase(),
      date: now.format('YYYY-MM-DD'),
      checkIn: '',
      checkOut: checkOutTime,
      status: 'early',
      remark: '未打上班卡',
    });
  }
};

const handleSubmit = async () => {
  await attendanceStore.addRecord({ ...form });
  alert('考勤记录提交成功！');
  handleReset();
};

const handleReset = () => {
  form.employeeName = userStore.currentUser?.nickname || userStore.currentUser?.username || '';
  form.employeeId = userStore.currentUser?.id.slice(0, 8).toUpperCase() || '';
  form.date = dayjs().format('YYYY-MM-DD');
  form.checkIn = dayjs().format('HH:mm');
  form.checkOut = '';
  form.status = 'normal';
  form.remark = '';
};
</script>

<style scoped lang="less">
.record-form {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.form-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f3f4f6;
}

// 快速打卡
.quick-check {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f3f4f6;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 16px 0;
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.15);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  &.done {
    border-color: #10b981;
    background: #ecfdf5;
  }

  .quick-icon {
    font-size: 32px;
  }

  .quick-text {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  .quick-time {
    font-size: 14px;
    color: #6b7280;
  }
}

// 手动表单
.manual-form {
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 16px 0;
  }
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.full-width {
    grid-column: 1 / -1;
  }

  label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;

    .required {
      color: #ef4444;
    }
  }

  input,
  select,
  textarea {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;

    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    &:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;

  button {
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &.btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border: none;

      &:hover {
        opacity: 0.9;
      }
    }

    &.btn-secondary {
      background: #fff;
      color: #374151;
      border: 1px solid #d1d5db;

      &:hover {
        background: #f3f4f6;
      }
    }
  }
}

// 统计卡片
.stats-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.stat-card {
  text-align: center;
  padding: 16px 8px;
  border-radius: 8px;
  background: #f9fafb;

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: #6b7280;
  }

  &.total .stat-value { color: #1f2937; }
  &.normal .stat-value { color: #10b981; }
  &.late .stat-value { color: #f59e0b; }
  &.early .stat-value { color: #f97316; }
  &.absent .stat-value { color: #ef4444; }
  &.leave .stat-value { color: #8b5cf6; }
}
</style>
