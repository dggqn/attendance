<template>
  <div class="admin-panel">
    <h2 class="section-title">⚙️ 管理后台</h2>

    <!-- Tab 切换 -->
    <div class="admin-tabs">
      <button
        v-for="tab in adminTabs"
        :key="tab.key"
        :class="['admin-tab', { active: currentTab === tab.key }]"
        @click="currentTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 部门管理（超管） -->
    <div v-if="currentTab === 'departments' && userStore.isSuperAdmin" class="tab-content">
      <div class="content-header">
        <h3>部门列表</h3>
        <button class="btn-primary" @click="showAddDept = true">+ 新增部门</button>
      </div>

      <div class="dept-list">
        <div v-for="dept in departments" :key="dept.id" class="dept-card">
          <div class="dept-info">
            <div class="dept-name">🏢 {{ dept.name }}</div>
            <div class="dept-desc">{{ dept.description || '暂无描述' }}</div>
          </div>
          <div class="dept-manager" v-if="dept.managerName">
            主管: {{ dept.managerName }}
          </div>
        </div>
      </div>
    </div>

    <!-- 用户管理 -->
    <div v-if="currentTab === 'users'" class="tab-content">
      <div class="content-header">
        <h3>
          {{ userStore.isSuperAdmin ? '全部用户' : '部门成员' }}
          <span class="user-count">({{ users.length }}人)</span>
        </h3>
      </div>

      <div class="user-table">
        <table>
          <thead>
            <tr>
              <th>用户</th>
              <th>角色</th>
              <th>部门</th>
              <th v-if="userStore.isSuperAdmin">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <div class="user-cell">
                  <img :src="user.avatar" class="user-avatar-sm" />
                  <div>
                    <div class="user-name">{{ user.nickname || user.username }}</div>
                    <div class="user-username">@{{ user.username }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['role-badge', user.role]">
                  {{ roleText(user.role) }}
                </span>
              </td>
              <td>{{ user.departmentName || '未分配' }}</td>
              <td v-if="userStore.isSuperAdmin">
                <div class="actions">
                  <select
                    v-model="user.newRole"
                    @change="updateUserRole(user.id, user.newRole)"
                    class="role-select"
                  >
                    <option value="user">员工</option>
                    <option value="admin">管理员</option>
                    <option value="super_admin">超管</option>
                  </select>
                  <select
                    v-model="user.newDeptId"
                    @change="updateUserDept(user.id, user.newDeptId)"
                    class="dept-select"
                  >
                    <option value="">未分配</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                      {{ dept.name }}
                    </option>
                  </select>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增部门弹窗 -->
    <div v-if="showAddDept" class="modal-overlay" @click.self="showAddDept = false">
      <div class="modal">
        <h3>新增部门</h3>
        <div class="form-group">
          <label>部门名称</label>
          <input v-model="newDept.name" placeholder="请输入部门名称" />
        </div>
        <div class="form-group">
          <label>部门描述</label>
          <textarea v-model="newDept.description" placeholder="可选"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showAddDept = false">取消</button>
          <button class="btn-primary" @click="addDepartment" :disabled="!newDept.name">
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { supabase } from '@/supabase';
import type { Department, UserRole } from '@/types';

const userStore = useUserStore();
const currentTab = ref('users');
const showAddDept = ref(false);
const departments = ref<Department[]>([]);
const users = ref<any[]>([]);

const newDept = ref({
  name: '',
  description: '',
});

// 根据权限显示不同的 Tab
const adminTabs = computed(() => {
  const tabs = [{ key: 'users', label: '👥 用户管理' }];
  if (userStore.isSuperAdmin) {
    tabs.unshift({ key: 'departments', label: '🏢 部门管理' });
  }
  return tabs;
});

// 角色文本
const roleText = (role: UserRole) => {
  if (role === 'super_admin') return '超管';
  if (role === 'admin') return '管理员';
  return '员工';
};

// 加载部门列表
const loadDepartments = async () => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (error) {
    console.error('加载部门失败:', error);
    return;
  }

  departments.value = data || [];
};

// 加载用户列表
const loadUsers = async () => {
  const userList = await userStore.fetchAllUsers();
  // 添加临时字段用于编辑
  users.value = userList.map(u => ({
    ...u,
    newRole: u.role,
    newDeptId: u.departmentId || '',
  }));
};

// 新增部门
const addDepartment = async () => {
  const { error } = await supabase.from('departments').insert({
    name: newDept.value.name,
    description: newDept.value.description,
  });

  if (error) {
    alert('新增部门失败: ' + error.message);
    return;
  }

  showAddDept.value = false;
  newDept.value = { name: '', description: '' };
  await loadDepartments();
};

// 更新用户角色
const updateUserRole = async (userId: string, role: UserRole) => {
  const success = await userStore.updateUser(userId, { role });
  if (!success) {
    alert('更新角色失败');
    await loadUsers(); // 刷新
  }
};

// 更新用户部门
const updateUserDept = async (userId: string, departmentId: string) => {
  const success = await userStore.updateUser(userId, { departmentId: departmentId || undefined });
  if (!success) {
    alert('更新部门失败');
    await loadUsers(); // 刷新
  }
};

onMounted(() => {
  loadDepartments();
  loadUsers();
});
</script>

<style scoped lang="less">
.admin-panel {
  padding: 20px 0;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

// Tab 切换
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.admin-tab {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #1f2937;
  }

  &.active {
    background: #667eea;
    color: #fff;
  }
}

// 内容区
.tab-content {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
}

.user-count {
  font-size: 14px;
  color: #6b7280;
  font-weight: normal;
}

.btn-primary {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #e5e7eb;
  }
}

// 部门列表
.dept-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.dept-card {
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;

  .dept-name {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .dept-desc {
    font-size: 13px;
    color: #6b7280;
  }

  .dept-manager {
    margin-top: 8px;
    font-size: 13px;
    color: #667eea;
  }
}

// 用户表格
.user-table {
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    background: #f9fafb;
  }
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .user-avatar-sm {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .user-name {
    font-size: 14px;
    font-weight: 500;
    color: #1f2937;
  }

  .user-username {
    font-size: 12px;
    color: #6b7280;
  }
}

.role-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  &.super_admin {
    background: #fef3c7;
    color: #92400e;
  }

  &.admin {
    background: #dbeafe;
    color: #1e40af;
  }

  &.user {
    background: #f3f4f6;
    color: #4b5563;
  }
}

.actions {
  display: flex;
  gap: 8px;
}

.role-select, .dept-select {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
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

.modal {
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

  input, textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #667eea;
    }
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
