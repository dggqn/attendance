<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h3>📝 提交申请</h3>
        <button class="btn-close" @click="close">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>申请类型 <span class="required">*</span></label>
          <select v-model="form.type" class="form-control">
            <option v-for="(text, value) in leaveRequestStore.leaveTypeText" :key="value" :value="value">
              {{ text }}
            </option>
          </select>
          <span class="hint">补卡：忘记打卡时申请 | 请假：事假、病假等</span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>开始日期 <span class="required">*</span></label>
            <input v-model="form.startDate" type="date" class="form-control" />
          </div>
          <div class="form-group">
            <label>结束日期 <span class="required">*</span></label>
            <input v-model="form.endDate" type="date" class="form-control" />
          </div>
        </div>

        <div class="form-group">
          <label>申请理由 <span class="required">*</span></label>
          <textarea
            v-model="form.reason"
            class="form-control"
            rows="4"
            placeholder="请详细说明申请原因..."
          ></textarea>
        </div>

        <!-- 补卡提醒 -->
        <div v-if="form.type === 'makeup'" class="tip-box">
          <p>💡 补卡申请通过后，请在考勤打卡页面手动补录该日期的上下班时间</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" @click="close">取消</button>
        <button class="btn-primary" :disabled="!isValid || submitting" @click="submit">
          {{ submitting ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLeaveRequestStore } from '@/stores/leaveRequest';
import dayjs from 'dayjs';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const leaveRequestStore = useLeaveRequestStore();
const submitting = ref(false);

const form = ref({
  type: 'makeup' as const,
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  reason: '',
});

// 表单验证
const isValid = computed(() => {
  return form.value.type &&
    form.value.startDate &&
    form.value.endDate &&
    form.value.reason.trim().length >= 5;
});

// 监听弹窗显示，重置表单
watch(() => props.show, (val) => {
  if (val) {
    form.value = {
      type: 'makeup',
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
      reason: '',
    };
  }
});

const close = () => {
  emit('close');
};

const submit = async () => {
  if (!isValid.value) return;

  submitting.value = true;
  const success = await leaveRequestStore.submitRequest(form.value);
  submitting.value = false;

  if (success) {
    emit('success');
    close();
  }
};
</script>

<style scoped lang="less">
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
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;

  &:hover {
    color: #4b5563;
  }
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;

    .required {
      color: #ef4444;
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.form-control {
  width: 100%;
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
}

.hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
  display: block;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.tip-box {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 16px;

  p {
    margin: 0;
    font-size: 13px;
    color: #4338ca;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  padding: 10px 20px;
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
  }
}
</style>
