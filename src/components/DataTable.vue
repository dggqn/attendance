<template>
  <div class="data-table">
    <div class="table-header">
      <h2 class="table-title">📋 考勤记录表</h2>
      <div class="table-actions">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索姓名或工号..."
          class="search-input"
        />
        <select v-model="filterStatus" class="filter-select">
          <option value="">全部状态</option>
          <option value="normal">正常</option>
          <option value="late">迟到</option>
          <option value="early">早退</option>
          <option value="absent">缺勤</option>
          <option value="leave">请假</option>
        </select>
        <button class="btn-export" @click="handleExport">
          📥 导出 Excel
        </button>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="canDelete && selectedIds.length > 0" class="batch-actions">
      <span class="batch-info">已选择 {{ selectedIds.length }} 条记录</span>
      <button class="btn-batch-delete" @click="handleBatchDelete">
        🗑️ 批量删除
      </button>
      <button class="btn-batch-cancel" @click="clearSelection">取消选择</button>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th v-if="canDelete" class="checkbox-col">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th>序号</th>
            <th>姓名</th>
            <th>工号</th>
            <th>日期</th>
            <th>上班时间</th>
            <th>下班时间</th>
            <th>状态</th>
            <th>备注</th>
            <th v-if="canDelete && selectedIds.length === 0">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(record, index) in filteredRecords" :key="record.id">
            <td v-if="canDelete" class="checkbox-col">
              <input
                type="checkbox"
                :checked="selectedIds.includes(record.id)"
                @change="toggleSelect(record.id)"
              />
            </td>
            <td>{{ index + 1 }}</td>
            <td>{{ record.employeeName }}</td>
            <td>{{ record.employeeId }}</td>
            <td>{{ record.date }}</td>
            <td>{{ record.checkIn || '-' }}</td>
            <td>{{ record.checkOut || '-' }}</td>
            <td>
              <span :class="['status-tag', record.status]">
                {{ statusText[record.status] }}
              </span>
            </td>
            <td class="remark-cell">
              <!-- 普通用户可以编辑自己的备注 -->
              <div v-if="canEditRemark(record)" class="remark-edit">
                <input
                  v-model="record.editRemark"
                  type="text"
                  :placeholder="record.remark || '添加备注...'"
                  @blur="saveRemark(record)"
                  @keyup.enter="saveRemark(record)"
                />
                <button class="btn-save" @click="saveRemark(record)">保存</button>
              </div>
              <span v-else :title="record.remark">{{ record.remark || '-' }}</span>
            </td>
            <td v-if="canDelete">
              <button class="btn-delete" @click="handleDelete(record.id)">删除</button>
            </td>
          </tr>
          <tr v-if="filteredRecords.length === 0">
            <td :colspan="canDelete ? 9 : 8" class="empty-cell">
              <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">暂无考勤记录</div>
                <div class="empty-desc">
                  {{ searchKeyword || filterStatus ? '试试调整搜索条件' : '开始记录您的第一条考勤吧' }}
                </div>
                <button v-if="!searchKeyword && !filterStatus" class="btn-empty-action" @click="goToRecord">
                  去打卡
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页控件 -->
    <div class="pagination">
      <div class="pagination-info">
        共 {{ attendanceStore.pagination.total }} 条记录，
        每页
        <select v-model="pageSize" @change="handlePageSizeChange">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
        条
      </div>
      <div class="pagination-controls">
        <button
          class="page-btn"
          :disabled="attendanceStore.pagination.currentPage === 1"
          @click="changePage(1)"
        >
          首页
        </button>
        <button
          class="page-btn"
          :disabled="attendanceStore.pagination.currentPage === 1"
          @click="changePage(attendanceStore.pagination.currentPage - 1)"
        >
          上一页
        </button>
        <span class="page-info">
          {{ attendanceStore.pagination.currentPage }} / {{ attendanceStore.pagination.totalPages }}
        </span>
        <button
          class="page-btn"
          :disabled="attendanceStore.pagination.currentPage === attendanceStore.pagination.totalPages"
          @click="changePage(attendanceStore.pagination.currentPage + 1)"
        >
          下一页
        </button>
        <button
          class="page-btn"
          :disabled="attendanceStore.pagination.currentPage === attendanceStore.pagination.totalPages"
          @click="changePage(attendanceStore.pagination.totalPages)"
        >
          末页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAttendanceStore } from '@/stores/attendance';
import { useUserStore } from '@/stores/user';
import type { AttendanceRecord } from '@/types';

const attendanceStore = useAttendanceStore();
const userStore = useUserStore();

// 事件定义
const emit = defineEmits<{
  (e: 'go-record'): void;
}>();

const searchKeyword = ref('');
const filterStatus = ref('');
const selectedIds = ref<string[]>([]);

const statusText: Record<AttendanceRecord['status'], string> = {
  normal: '正常',
  late: '迟到',
  early: '早退',
  absent: '缺勤',
  leave: '请假'
};

// 权限判断
const canDelete = computed(() => userStore.isAdmin);
const canEditRemark = (record: AttendanceRecord) => {
  // 普通用户只能编辑自己的备注，管理员可以编辑所有
  if (userStore.isAdmin) return true;
  return record.userId === userStore.currentUser?.id;
};

// 分页相关
const pageSize = computed({
  get: () => attendanceStore.pagination.pageSize,
  set: (val) => attendanceStore.changePageSize(val),
});

const changePage = (page: number) => {
  attendanceStore.changePage(page);
};

const handlePageSizeChange = () => {
  // pageSize 的 setter 已经处理了
};

// 过滤记录（仅前端过滤当前页数据）
const filteredRecords = computed(() => {
  return attendanceStore.records.filter(record => {
    const matchKeyword = !searchKeyword.value ||
      record.employeeName.includes(searchKeyword.value) ||
      record.employeeId.includes(searchKeyword.value);

    const matchStatus = !filterStatus.value || record.status === filterStatus.value;

    return matchKeyword && matchStatus;
  }).map(record => ({
    ...record,
    editRemark: record.remark || '' // 添加临时编辑字段
  }));
});

const handleDelete = (id: string) => {
  if (confirm('确定要删除这条记录吗？')) {
    attendanceStore.deleteRecord(id);
  }
};

const handleExport = () => {
  attendanceStore.exportToExcel();
};

// 跳转到打卡页面
const goToRecord = () => {
  emit('go-record');
};

// 批量选择
const isAllSelected = computed(() => {
  return filteredRecords.value.length > 0 && 
    filteredRecords.value.every(r => selectedIds.value.includes(r.id));
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = filteredRecords.value.map(r => r.id);
  }
};

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

// 批量删除
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return;
  
  if (!confirm(`确定要删除选中的 ${selectedIds.value.length} 条记录吗？`)) {
    return;
  }

  // 逐个删除
  for (const id of selectedIds.value) {
    await attendanceStore.deleteRecord(id);
  }
  
  selectedIds.value = [];
};

const saveRemark = async (record: any) => {
  if (record.editRemark === record.remark) return;

  const success = await attendanceStore.updateRemark(record.id, record.editRemark);
  if (success) {
    record.remark = record.editRemark;
  }
};
</script>

<style scoped lang="less">
.data-table {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.table-header {
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
}

.batch-info {
  font-size: 14px;
  color: #92400e;
  font-weight: 500;
}

.btn-batch-delete {
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

// 复选框列
.checkbox-col {
  width: 40px;
  text-align: center;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
}

.table-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.table-actions {
  display: flex;
  gap: 12px;

  .search-input,
  .filter-select {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }

  .search-input {
    width: 200px;
  }

  .btn-export {
    padding: 8px 16px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  }
}

.table-wrapper {
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;

    th,
    td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
    }

    tbody tr {
      transition: background 0.2s;

      &:hover {
        background: #f9fafb;
      }
    }

    td {
      color: #4b5563;

      &:nth-child(4),
      &:nth-child(5),
      &:nth-child(6) {
        font-family: 'Monaco', monospace;
      }
    }
  }
}

.status-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  &.normal {
    background: #dcfce7;
    color: #166534;
  }

  &.late {
    background: #fef3c7;
    color: #92400e;
  }

  &.early {
    background: #ffedd5;
    color: #9a3412;
  }

  &.absent {
    background: #fee2e2;
    color: #991b1b;
  }

  &.leave {
    background: #ede9fe;
    color: #5b21b6;
  }
}

// 备注编辑
.remark-cell {
  min-width: 150px;
}

.remark-edit {
  display: flex;
  gap: 8px;
  align-items: center;

  input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;

    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }

  .btn-save {
    padding: 6px 12px;
    background: #667eea;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      background: #5a67d8;
    }
  }
}

.btn-delete {
  padding: 6px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fecaca;
  }
}

.empty-cell {
  text-align: center;
  padding: 40px !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
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

.table-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
}

.total-info {
  font-size: 14px;
  color: #6b7280;
}

// 分页
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;

  select {
    padding: 4px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
  }
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: #667eea;
    color: #667eea;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f3f4f6;
  }
}

.page-info {
  padding: 6px 12px;
  font-size: 14px;
  color: #374151;
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }

  .table-actions {
    flex-direction: column;

    .search-input {
      width: 100%;
    }
  }

  .remark-edit {
    flex-direction: column;

    input {
      width: 100%;
    }
  }
}
</style>
