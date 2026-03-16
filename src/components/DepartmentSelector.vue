<template>
  <div v-if="show" class="dept-modal-overlay">
    <div class="dept-modal">
      <div class="dept-modal-header">
        <h2>🏢 选择您的部门</h2>
        <p>首次登录，请选择您所属的部门</p>
      </div>

      <div class="dept-modal-body">
        <div v-if="userStore.departments.length === 0" class="dept-empty">
          暂无可用部门，请联系管理员
        </div>
        <div v-else class="dept-list">
          <div
            v-for="dept in userStore.departments"
            :key="dept.id"
            :class="['dept-item', { selected: selectedDept === dept.id }]"
            @click="selectedDept = dept.id"
          >
            <div class="dept-icon">🏢</div>
            <div class="dept-info">
              <div class="dept-name">{{ dept.name }}</div>
            </div>
            <div v-if="selectedDept === dept.id" class="dept-check">✓</div>
          </div>
        </div>
      </div>

      <div class="dept-modal-footer">
        <button
          class="btn-confirm"
          :disabled="!selectedDept || saving"
          @click="confirmSelection"
        >
          {{ saving ? '保存中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
}>();

const userStore = useUserStore();

// 监听 show 变化，当弹窗显示时刷新部门列表
watch(() => props.show, (newVal) => {
  if (newVal) {
    userStore.fetchDepartments();
  }
});
const selectedDept = ref('');
const saving = ref(false);

onMounted(async () => {
  await userStore.fetchDepartments();
});

const confirmSelection = async () => {
  if (!selectedDept.value) return;

  saving.value = true;
  const success = await userStore.selectDepartment(selectedDept.value);
  saving.value = false;

  if (success) {
    emit('confirm');
  } else {
    alert('选择部门失败，请重试');
  }
};
</script>

<style scoped lang="less">
.dept-modal-overlay {
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

.dept-modal {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dept-modal-header {
  padding: 24px;
  text-align: center;
  border-bottom: 1px solid #e5e7eb;

  h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #1f2937;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
  }
}

.dept-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.dept-empty {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

.dept-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dept-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    background: #f9fafb;
  }

  &.selected {
    border-color: #667eea;
    background: #eef2ff;
  }
}

.dept-icon {
  font-size: 24px;
}

.dept-info {
  flex: 1;
}

.dept-name {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
}

.dept-check {
  width: 24px;
  height: 24px;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.dept-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-confirm {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
