<template>
  <div class="record-form">
    <h2 class="form-title">📝 考勤打卡</h2>
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

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card total">
        <div class="stat-value">{{ store.stats.total }}</div>
        <div class="stat-label">总记录</div>
      </div>
      <div class="stat-card normal">
        <div class="stat-value">{{ store.stats.normal }}</div>
        <div class="stat-label">正常</div>
      </div>
      <div class="stat-card late">
        <div class="stat-value">{{ store.stats.late }}</div>
        <div class="stat-label">迟到</div>
      </div>
      <div class="stat-card early">
        <div class="stat-value">{{ store.stats.early }}</div>
        <div class="stat-label">早退</div>
      </div>
      <div class="stat-card absent">
        <div class="stat-value">{{ store.stats.absent }}</div>
        <div class="stat-label">缺勤</div>
      </div>
      <div class="stat-card leave">
        <div class="stat-value">{{ store.stats.leave }}</div>
        <div class="stat-label">请假</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useAttendanceStore } from '@/stores/attendance';
import type { AttendanceRecord } from '@/types';
import dayjs from 'dayjs';

const store = useAttendanceStore();

const form = reactive({
  employeeName: '',
  employeeId: '',
  date: dayjs().format('YYYY-MM-DD'),
  checkIn: dayjs().format('HH:mm'),
  checkOut: '',
  status: 'normal' as AttendanceRecord['status'],
  remark: ''
});

const handleSubmit = () => {
  store.addRecord({ ...form });
  alert('考勤记录提交成功！');
  handleReset();
};

const handleReset = () => {
  form.employeeName = '';
  form.employeeId = '';
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

.form-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
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
      color: @error-color;
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
      border-color: @primary-color;
      box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
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
      background: @primary-color;
      color: #fff;
      border: none;

      &:hover {
        background: #40a9ff;
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
  &.normal .stat-value { color: @success-color; }
  &.late .stat-value { color: @warning-color; }
  &.early .stat-value { color: #f97316; }
  &.absent .stat-value { color: @error-color; }
  &.leave .stat-value { color: #8b5cf6; }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
