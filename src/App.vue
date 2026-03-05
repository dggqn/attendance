<template>
  <div class="attendance-system">
    <!-- 未登录：显示登录页 -->
    <Login v-if="!userStore.isLoggedIn" />
    
    <!-- 已登录：显示考勤系统 -->
    <template v-else>
      <!-- 顶部导航 -->
      <header class="header">
        <div class="header-content">
          <div class="logo">
            <span class="logo-icon">📅</span>
            <h1 class="logo-text">考勤管理系统</h1>
          </div>
          
          <nav class="nav">
            <button 
              v-for="tab in tabs" 
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
            />
            <div class="user-meta">
              <span class="user-name">{{ userStore.currentUser?.nickname || userStore.currentUser?.username }}</span>
              <span v-if="userStore.isAdmin" class="user-role">管理员</span>
            </div>
            <button class="btn-logout" @click="handleLogout" title="退出登录">
              🚪
            </button>
          </div>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="main-content">
        <section v-show="currentTab === 'record'" class="section">
          <RecordForm />
        </section>

        <section v-show="currentTab === 'table'" class="section">
          <DataTable />
        </section>

        <section v-show="currentTab === 'chart'" class="section">
          <ChartAnalysis />
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
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import Login from '@/components/Login.vue';
import RecordForm from '@/components/RecordForm.vue';
import DataTable from '@/components/DataTable.vue';
import ChartAnalysis from '@/components/ChartAnalysis.vue';
import { useAttendanceStore } from '@/stores/attendance';

const userStore = useUserStore();
const attendanceStore = useAttendanceStore();

const tabs = [
  { key: 'record', label: '📝 考勤打卡' },
  { key: 'table', label: '📋 数据表单' },
  { key: 'chart', label: '📊 分析图表' }
];

const currentTab = ref('record');

// 页面加载时检查登录状态
onMounted(() => {
  userStore.checkLoginStatus();
  if (userStore.isLoggedIn) {
    attendanceStore.fetchRecords();
  }
});

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout();
    currentTab.value = 'record'; // 重置标签页
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

    .user-role {
      font-size: 11px;
      background: rgba(255, 255, 255, 0.3);
      padding: 2px 8px;
      border-radius: 10px;
    }
  }

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
