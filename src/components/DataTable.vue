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
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>姓名</th>
            <th>工号</th>
            <th>日期</th>
            <th>上班时间</th>
            <th>下班时间</th>
            <th>状态</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(record, index) in filteredRecords" :key="record.id">
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
            <td :title="record.remark">{{ record.remark || '-' }}</td>
            <td>
              <button class="btn-delete" @click="handleDelete(record.id)">删除</button>
            </td>
          </tr>
          <tr v-if="filteredRecords.length === 0">
            <td colspan="9" class="empty-cell">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span class="total-info">共 {{ filteredRecords.length }} 条记录</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAttendanceStore } from '@/stores/attendance';
import type { AttendanceRecord } from '@/types';

const store = useAttendanceStore();
const searchKeyword = ref('');
const filterStatus = ref('');

const statusText: Record<AttendanceRecord['status'], string> = {
  normal: '正常',
  late: '迟到',
  early: '早退',
  absent: '缺勤',
  leave: '请假'
};

const filteredRecords = computed(() => {
  return store.records.filter(record => {
    const matchKeyword = !searchKeyword.value || 
      record.employeeName.includes(searchKeyword.value) ||
      record.employeeId.includes(searchKeyword.value);
    
    const matchStatus = !filterStatus.value || record.status === filterStatus.value;
    
    return matchKeyword && matchStatus;
  });
});

const handleDelete = (id: string) => {
  if (confirm('确定要删除这条记录吗？')) {
    store.deleteRecord(id);
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
      border-color: @primary-color;
    }
  }

  .search-input {
    width: 200px;
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
  color: #9ca3af;
  padding: 40px !important;
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
}
</style>
