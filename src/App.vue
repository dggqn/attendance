<template>
  <div class="attendance-system">
    <!-- 未登录：显示登录页 -->
    <Login v-if="!userStore.isLoggedIn" />
    
    <!-- 已登录：显示考勤系统 -->
    <template v-else>
      <!-- 部门选择弹窗（首次登录的普通用户） -->
      <DepartmentSelector 
        :show="userStore.needsDepartmentSelection" 
        @confirm="handleDeptSelected"
      />

      <!-- 顶部导航 -->
      <header class="header">
        <div class="header-content">
          <div class="logo">
            <span class="logo-icon">📅</span>
            <h1 class="logo-text">考勤管理系统</h1>
          </div>
          
          <nav class="nav">
            <button 
              v-for="tab in visibleTabs" 
              :key="tab.key"
              :class="['nav-btn', { active: currentTab === tab.key }]"
              @click="currentTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>

          <!-- 用户信息 -->
          <div class="user-info">
            <img 
              :src="userStore.currentUser?.avatar" 
              alt="avatar" 
              class="user-avatar"
              @click="currentTab = 'settings'"
              style="cursor: pointer;"
              title="个人设置"
            />
            <div class="user-meta">
              <span class="user-name">{{ userStore.currentUser?.nickname || userStore.currentUser?.username }}</span>
              <span class="user-dept" v-if="userStore.currentUser?.departmentName">
                {{ userStore.currentUser.departmentName }}
              </span>
              <span :class="['user-role', userStore.currentUser?.role]">
                {{ roleText }}
              </span>
            </div>
            <button class="btn-settings" @click="currentTab = 'settings'" title="个人设置">
              ⚙️
            </button>
            <button class="btn-logout" @click="handleLogout" title="退出登录">
              🚪
            </button>
          </div>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="main-content">
        <section v-show="currentTab === 'home'" class="section">
          <Dashboard :current-tab="currentTab" @change-tab="currentTab = $event" />
        </section>

        <section v-show="currentTab === 'record'" class="section">
          <RecordForm />
        </section>

        <section v-show="currentTab === 'table'" class="section">
          <DataTable @go-record="currentTab = 'record'" />
        </section>

        <section v-show="currentTab === 'chart' && userStore.canViewAllRecordsData" class="section">
          <ChartAnalysis />
        </section>

        <section v-show="currentTab === 'chart' && !userStore.canViewAllRecordsData" class="section">
          <PersonalChart />
        </section>

        <!-- 管理后台（超管和管理员可见） -->
        <section v-show="currentTab === 'admin'" class="section">
          <AdminPanel />
        </section>

        <!-- 请假/补卡 -->
        <section v-show="currentTab === 'leave'" class="section">
          <LeaveRequestList />
        </section>

        <!-- 个人设置 -->
        <section v-show="currentTab === 'settings'" class="section">
          <UserSettings />
        </section>
      </main>

      <!-- 底部版权 -->
      <footer class="footer">
        <p>© 2024 考勤王朝 - 欢迎回来，{{ userStore.currentUser?.nickname || userStore.currentUser?.username }} 👑</p>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { useAttendanceStore } from '@/stores/attendance';
import Login from '@/components/Login.vue';
import RecordForm from '@/components/RecordForm.vue';
import DataTable from '@/components/DataTable.vue';
import ChartAnalysis from '@/components/ChartAnalysis.vue';
import PersonalChart from '@/components/PersonalChart.vue';
import DepartmentSelector from '@/components/DepartmentSelector.vue';
import AdminPanel from '@/components/AdminPanel.vue';
import UserSettings from '@/components/UserSettings.vue';
import LeaveRequestList from '@/components/LeaveRequestList.vue';
import Dashboard from '@/components/Dashboard.vue';

const userStore = useUserStore();
const attendanceStore = useAttendanceStore();

const currentTab = ref('home');

// 根据权限显示不同的导航
const visibleTabs = computed(() => {
  const deptName = userStore.currentUser?.departmentName || '';
  const isPersonal = userStore.isNormalUser;
  
  const tabs = [
    { key: 'home', label: '🏠 首页' },
    { key: 'record', label: isPersonal ? '📝 我的考勤' : `📝 ${deptName}考勤` },
    { key: 'table', label: isPersonal ? '📋 我的记录' : `📋 ${deptName}记录` },
    { key: 'chart', label: isPersonal ? '📊 我的统计' : `📊 ${deptName}统计` },
    { key: 'leave', label: '📄 请假/补卡' },
  ];

  // 超管和管理员显示管理后台
  if (userStore.isAdmin) {
    tabs.push({ key: 'admin', label: '⚙️ 管理后台' });
  }

  return tabs;
});

// 角色显示文本
const roleText = computed(() => {
  const role = userStore.currentUser?.role;
  if (role === 'super_admin') return '超管';
  if (role === 'admin') return '管理员';
  return '员工';
});

// 页面加载时检查登录状态
onMounted(() => {
  userStore.checkLoginStatus().then(() => {
    if (userStore.isLoggedIn) {
      attendanceStore.fetchRecords();
    }
  });
});

// 监听用户变化，切换账号时刷新数据
watch(() => userStore.currentUser?.id, (newUserId, oldUserId) => {
  if (newUserId && newUserId !== oldUserId) {
    // 用户切换了，清空旧数据并重新加载
    attendanceStore.reset();
    attendanceStore.fetchRecords();
  }
});

// 监听标签变化，切换到图表页面时刷新数据（加载全部用于统计）
watch(() => currentTab.value, (newTab) => {
  if ((newTab === 'chart' || newTab === 'home') && userStore.isLoggedIn) {
    // 加载较多数据用于图表统计（这里加载100条，实际应该根据需求调整）
    attendanceStore.fetchRecords(1, 100);
  }
});

const handleDeptSelected = () => {
  // 部门选择完成后刷新数据
  attendanceStore.fetchRecords();
};

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout();
    currentTab.value = 'home';
  }
};
</script>

<style scoped lang="less">
.attendance-system {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

// 顶部导航
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;

  .logo-icon {
    font-size: 28px;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  &.active {
    background: #fff;
    color: #667eea;
    font-weight: 500;
  }
}

// 用户信息
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;

  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.5);
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;

    .user-name {
      font-size: 14px;
      font-weight: 500;
    }

    .user-dept {
      font-size: 11px;
      opacity: 0.8;
    }

    .user-role {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 500;

      &.super_admin {
        background: #fbbf24;
        color: #92400e;
      }

      &.admin {
        background: #60a5fa;
        color: #1e40af;
      }

      &.user {
        background: rgba(255, 255, 255, 0.3);
        color: #fff;
      }
    }
  }

  .btn-settings,
  .btn-logout {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

// 主内容区
.main-content {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 底部版权
.footer {
  background: #fff;
  padding: 16px 24px;
  text-align: center;
  border-top: 1px solid #e5e7eb;

  p {
    margin: 0;
    font-size: 13px;
    color: #6b7280;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    height: auto;
    padding: 12px 0;
    gap: 12px;
  }

  .nav {
    flex-wrap: wrap;
    justify-content: center;
  }

  .user-info {
    .user-meta {
      display: none;
    }
  }

  .main-content {
    padding: 16px;
  }
}
</style>
