<template>
  <div class="leave-request-list">
    <div class="list-header">
      <h2 class="section-title">
        {{ userStore.isAdmin ? '📋 请假/补卡审批' : '📋 我的申请' }}
      </h2>
      <div class="header-actions">
        <!-- 统计卡片 -->
        <div class="stat-badges" v-if="userStore.isAdmin">
          <span class="badge pending">待审批 {{ leaveRequestStore.stats.pending }}</span>
          <span class="badge approved">已通过 {{ leaveRequestStore.stats.approved }}</span>
          <span class="badge rejected">已拒绝 {{ leaveRequestStore.stats.rejected }}</span>
        </div>
        <button v-if="!userStore.isAdmin" class="btn-add" @click="showModal = true">
          + 提交申请
        </button>
      </div>
    </div>

    <!-- 批量操作栏（管理员） -->
    <div v-if="userStore.isAdmin && selectedIds.length > 0" class="batch-actions">
      <span class="batch-info">已选择 {{ selectedIds.length }} 条申请</span>
      <button class="btn-batch-approve" @click="handleBatchApprove('approved')">
        ✓ 批量通过
      </button>
      <button class="btn-batch-reject" @click="handleBatchApprove('rejected')">
        ✗ 批量拒绝
      </button>
      <button class="btn-batch-cancel" @click="clearSelection">取消</button>
    </div>

    <!-- 申请列表 -->
    <div class="list-content">
      <div v-if="leaveRequestStore.loading" class="loading">加载中...</div>
      <div v-else-if="leaveRequestStore.requests.length === 0" class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-title">
          {{ userStore.isAdmin ? '暂无待审批的申请' : '您还没有提交过申请' }}
        </div>
        <div class="empty-desc">
          {{ userStore.isAdmin ? '当员工提交请假/补卡申请时，会显示在这里' : '忘记打卡或需要请假时，可以在这里提交申请' }}
        </div>
        <button v-if="!userStore.isAdmin" class="btn-empty-action" @click="showModal = true">
          提交申请
        </button>
      </div>
      <div v-else class="request-cards">
        <div
          v-for="request in leaveRequestStore.requests"
          :key="request.id"
          :class="['request-card', request.status]"
        >
          <!-- 复选框（管理员且待审批） -->
          <div v-if="userStore.isAdmin && request.status === 'pending'" class="card-checkbox">
            <input
              type="checkbox"
              :checked="selectedIds.includes(request.id)"
              @change="toggleSelect(request.id)"
              @click.stop
            />
          </div>
          <div class="card-header">
            <div class="request-type">
              <span class="type-tag">{{ leaveRequestStore.leaveTypeText[request.type] }}</span>
              <span :class="['status-tag', request.status]">
                {{ leaveRequestStore.leaveStatusText[request.status] }}
              </span>
            </div>
            <div class="request-date">
              {{ formatDate(request.createdAt) }}
            </div>
          </div>

          <div class="card-body">
            <!-- 管理员显示申请人信息 -->
            <div v-if="userStore.isAdmin" class="user-info">
              <img :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.userName}`" class="user-avatar" />
              <span class="user-name">{{ request.userName }}</span>
              <span class="dept-name">{{ request.departmentName || '未分配' }}</span>
            </div>

            <div class="date-range">
              <span class="label">日期：</span>
              <span class="value">{{ request.startDate }} 至 {{ request.endDate }}</span>
              <span class="days">({{ calcDays(request.startDate, request.endDate) }}天)</span>
            </div>

            <div class="reason">
              <span class="label">理由：</span>
              <span class="value">{{ request.reason }}</span>
            </div>

            <!-- 审批信息 -->
            <div v-if="request.status !== 'pending'" class="approval-info">
              <div class="approval-item">
                <span class="label">审批人：</span>
                <span class="value">{{ request.approverName || '管理员' }}</span>
              </div>
              <div v-if="request.approverComment" class="approval-item">
                <span class="label">审批意见：</span>
                <span class="value">{{ request.approverComment }}</span>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="card-actions">
            <!-- 管理员审批按钮 -->
            <template v-if="userStore.isAdmin && request.status === 'pending'">
              <button class="btn-approve" @click="handleApprove(request.id, 'approved')">
                ✓ 通过
              </button>
              <button class="btn-reject" @click="handleApprove(request.id, 'rejected')">
                ✗ 拒绝
              </button>
            </template>

            <!-- 用户撤销按钮 -->
            <button
              v-if="!userStore.isAdmin && request.status === 'pending'"
              class="btn-cancel"
              @click="handleCancel(request.id)"
            >
              撤销申请
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 申请弹窗 -->
    <LeaveRequestModal
      :show="showModal"
      @close="showModal = false"
      @success="handleSuccess"
    />

    <!-- 审批弹窗 -->
    <div v-if="showApproveModal" class="modal-overlay" @click.self="showApproveModal = false">
      <div class="approve-modal">
        <h3>{{ approveAction === 'approved' ? '✓ 通过申请' : '✗ 拒绝申请' }}</h3>
        <div class="form-group">
          <label>审批意见（可选）</label>
          <textarea v-model="approveComment" placeholder="请输入审批意见..." rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showApproveModal = false">取消</button>
          <button
            :class="['btn-primary', approveAction === 'rejected' ? 'danger' : '']"
            @click="confirmApprove"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useLeaveRequestStore } from '@/stores/leaveRequest';
import type { LeaveStatus } from '@/types/leaveRequest';
import LeaveRequestModal from './LeaveRequestModal.vue';
import dayjs from 'dayjs';

const userStore = useUserStore();
const leaveRequestStore = useLeaveRequestStore();

const showModal = ref(false);
const showApproveModal = ref(false);
const currentRequestId = ref('');
const approveAction = ref<LeaveStatus>('approved');
const approveComment = ref('');
const selectedIds = ref<string[]>([]);
const batchComment = ref('');

onMounted(() => {
  leaveRequestStore.fetchRequests();
});

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('MM-DD HH:mm');
};

const calcDays = (start: string, end: string) => {
  const startDate = dayjs(start);
  const endDate = dayjs(end);
  return endDate.diff(startDate, 'day') + 1;
};

const handleSuccess = () => {
  // 申请成功后的回调
};

const handleApprove = (requestId: string, action: LeaveStatus) => {
  currentRequestId.value = requestId;
  approveAction.value = action;
  approveComment.value = '';
  showApproveModal.value = true;
};

const confirmApprove = async () => {
  const success = await leaveRequestStore.approveRequest(
    currentRequestId.value,
    approveAction.value,
    approveComment.value
  );
  if (success) {
    showApproveModal.value = false;
  }
};

const handleCancel = async (requestId: string) => {
  if (confirm('确定要撤销这条申请吗？')) {
    await leaveRequestStore.cancelRequest(requestId);
  }
};

// 批量选择
const toggleSelect = (id: string) => {
  const index = selectedIds.value.indexOf(id);
  if (index > -1) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(id);
  }
};

const clearSelection = () => {
  selectedIds.value = [];
};

// 批量审批
const handleBatchApprove = async (status: LeaveStatus) => {
  if (selectedIds.value.length === 0) return;
  
  const actionText = status === 'approved' ? '通过' : '拒绝';
  if (!confirm(`确定要${actionText}选中的 ${selectedIds.value.length} 条申请吗？`)) {
    return;
  }

  // 逐个审批
  for (const id of selectedIds.value) {
    await leaveRequestStore.approveRequest(id, status, batchComment.value);
  }
  
  selectedIds.value = [];
  batchComment.value = '';
};
</script>

<style scoped lang="less">
.leave-request-list {
  padding: 20px 0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

// 批量操作栏
.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.batch-info {
  font-size: 14px;
  color: #92400e;
  font-weight: 500;
}

.btn-batch-approve {
  padding: 6px 16px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #059669;
  }
}

.btn-batch-reject {
  padding: 6px 16px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #dc2626;
  }
}

.btn-batch-cancel {
  padding: 6px 16px;
  background: transparent;
  color: #6b7280;
  border: none;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    color: #374151;
  }
}

// 卡片复选框
.card-checkbox {
  position: absolute;
  top: 16px;
  right: 16px;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;

  &.pending {
    background: #fef3c7;
    color: #92400e;
  }

  &.approved {
    background: #d1fae5;
    color: #065f46;
  }

  &.rejected {
    background: #fee2e2;
    color: #991b1b;
  }
}

.btn-add {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
}

// 列表内容
.list-content {
  min-height: 200px;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f9fafb;
  border-radius: 12px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 20px;
}

.btn-empty-action {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
}

.request-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.request-card {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #e5e7eb;

  &.pending {
    border-left-color: #f59e0b;
  }

  &.approved {
    border-left-color: #10b981;
  }

  &.rejected {
    border-left-color: #ef4444;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.request-type {
  display: flex;
  gap: 8px;
  align-items: center;
}

.type-tag {
  padding: 4px 10px;
  background: #eef2ff;
  color: #4338ca;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.status-tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;

  &.pending {
    background: #fef3c7;
    color: #92400e;
  }

  &.approved {
    background: #d1fae5;
    color: #065f46;
  }

  &.rejected {
    background: #fee2e2;
    color: #991b1b;
  }
}

.request-date {
  font-size: 13px;
  color: #9ca3af;
}

.card-body {
  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px dashed #e5e7eb;

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
    }

    .user-name {
      font-weight: 500;
      color: #1f2937;
    }

    .dept-name {
      font-size: 12px;
      color: #6b7280;
      background: #f3f4f6;
      padding: 2px 8px;
      border-radius: 10px;
    }
  }

  .date-range,
  .reason,
  .approval-item {
    margin-bottom: 8px;
    font-size: 14px;

    .label {
      color: #6b7280;
    }

    .value {
      color: #1f2937;
    }

    .days {
      color: #9ca3af;
      font-size: 13px;
    }
  }

  .approval-info {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e5e7eb;
    background: #f9fafb;
    padding: 12px;
    border-radius: 8px;
  }
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-approve,
.btn-reject,
.btn-cancel {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-approve {
  background: #d1fae5;
  color: #065f46;

  &:hover {
    background: #a7f3d0;
  }
}

.btn-reject {
  background: #fee2e2;
  color: #991b1b;

  &:hover {
    background: #fecaca;
  }
}

.btn-cancel {
  background: #f3f4f6;
  color: #4b5563;

  &:hover {
    background: #e5e7eb;
  }
}

// 审批弹窗
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
  z-index: 1001;
}

.approve-modal {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;

  h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
  }
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 13px;
    color: #4b5563;
    margin-bottom: 6px;
  }

  textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    resize: vertical;
    min-height: 80px;

    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary {
  padding: 10px 20px;
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;

  &.danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }
}
</style>
