<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧装饰 -->
      <div class="login-left">
        <div class="brand">
          <div class="logo">📅</div>
          <h1 class="title">考勤管理系统</h1>
          <p class="subtitle">王朝霸业 · 始于考勤</p>
        </div>
        <div class="features">
          <div class="feature-item">
            <span class="icon">✓</span>
            <span>智能考勤记录</span>
          </div>
          <div class="feature-item">
            <span class="icon">✓</span>
            <span>实时数据分析</span>
          </div>
          <div class="feature-item">
            <span class="icon">✓</span>
            <span>可视化报表</span>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="login-right">
        <div class="login-box">
          <h2 class="login-title">{{ isRegister ? '注册账号' : '欢迎回来' }}</h2>
          <p class="login-desc">{{ isRegister ? '创建您的考勤王朝账号' : '请登录您的账号' }}</p>

          <!-- 登录表单 -->
          <form v-if="!isRegister" @submit.prevent="handleLogin" class="login-form">
            <div class="form-item">
              <label>用户名</label>
              <input 
                v-model="loginForm.username" 
                type="text" 
                placeholder="请输入用户名"
                required
              />
            </div>

            <div class="form-item">
              <label>密码</label>
              <input 
                v-model="loginForm.password" 
                type="password" 
                placeholder="请输入密码"
                required
              />
            </div>

            <div class="form-options">
              <label class="remember">
                <input v-model="loginForm.remember" type="checkbox" />
                <span>记住我</span>
              </label>
              <a href="#" class="forgot" @click.prevent="forgotPassword">忘记密码？</a>
            </div>

            <div v-if="userStore.error" class="error-msg">
              {{ userStore.error }}
            </div>

            <button type="submit" class="btn-login" :disabled="userStore.loading">
              {{ userStore.loading ? '登录中...' : '登 录' }}
            </button>
          </form>

          <!-- 注册表单 -->
          <form v-else @submit.prevent="handleRegister" class="login-form">
            <div class="form-item">
              <label>用户名</label>
              <input 
                v-model="registerForm.username" 
                type="text" 
                placeholder="请输入用户名"
                required
              />
            </div>

            <div class="form-item">
              <label>昵称</label>
              <input 
                v-model="registerForm.nickname" 
                type="text" 
                placeholder="请输入昵称（选填）"
              />
            </div>

            <div class="form-item">
              <label>密码</label>
              <input 
                v-model="registerForm.password" 
                type="password" 
                placeholder="请输入密码"
                required
              />
            </div>

            <div class="form-item">
              <label>确认密码</label>
              <input 
                v-model="registerForm.confirmPassword" 
                type="password" 
                placeholder="请再次输入密码"
                required
              />
            </div>

            <div v-if="registerError" class="error-msg">
              {{ registerError }}
            </div>
            <div v-if="userStore.error" class="error-msg">
              {{ userStore.error }}
            </div>

            <button type="submit" class="btn-login" :disabled="userStore.loading">
              {{ userStore.loading ? '注册中...' : '注 册' }}
            </button>
          </form>

          <!-- 切换登录/注册 -->
          <div class="login-footer">
            <span v-if="!isRegister">还没有账号？</span>
            <span v-else>已有账号？</span>
            <a href="#" @click.prevent="toggleMode">
              {{ isRegister ? '立即登录' : '立即注册' }}
            </a>
          </div>

          <!-- 测试账号提示 -->
          <div class="test-accounts">
            <p>测试账号：</p>
            <p>admin / admin123（管理员）</p>
            <p>user / user123（普通用户）</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const isRegister = ref(false);
const registerError = ref('');

const loginForm = reactive({
  username: '',
  password: '',
  remember: false,
});

const registerForm = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
});

const handleLogin = async () => {
  const success = await userStore.login({
    username: loginForm.username,
    password: loginForm.password,
    remember: loginForm.remember,
  });
  
  if (success) {
    // 登录成功，App.vue 会自动检测状态并显示主界面
    loginForm.username = '';
    loginForm.password = '';
  }
};

const handleRegister = async () => {
  registerError.value = '';
  
  if (registerForm.password !== registerForm.confirmPassword) {
    registerError.value = '两次输入的密码不一致';
    return;
  }
  
  if (registerForm.password.length < 6) {
    registerError.value = '密码长度至少6位';
    return;
  }
  
  const success = await userStore.register({
    username: registerForm.username,
    password: registerForm.password,
    confirmPassword: registerForm.confirmPassword,
    nickname: registerForm.nickname,
  });
  
  if (success) {
    // 注册成功，自动登录了
    registerForm.username = '';
    registerForm.nickname = '';
    registerForm.password = '';
    registerForm.confirmPassword = '';
    isRegister.value = false;
  }
};

const toggleMode = () => {
  isRegister.value = !isRegister.value;
  userStore.error = '';
  registerError.value = '';
};

const forgotPassword = () => {
  alert('请联系管理员重置密码');
};
</script>

<style scoped lang="less">
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  display: flex;
  width: 100%;
  max-width: 900px;
  min-height: 500px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

// 左侧装饰
.login-left {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .brand {
    .logo {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .title {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 16px;
      opacity: 0.8;
    }
  }

  .features {
    margin-top: 40px;

    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 15px;

      .icon {
        width: 24px;
        height: 24px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
    }
  }
}

// 右侧表单
.login-right {
  flex: 1;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .login-box {
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }

  .login-title {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .login-desc {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 32px;
  }
}

.login-form {
  .form-item {
    margin-bottom: 20px;

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;

      &:focus {
        outline: none;
        border-color: @primary-color;
        box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
      }

      &::placeholder {
        color: #9ca3af;
      }
    }
  }

  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .remember {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: #4b5563;
      cursor: pointer;

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
    }

    .forgot {
      font-size: 14px;
      color: @primary-color;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .error-msg {
    background: #fee2e2;
    color: #dc2626;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .btn-login {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #6b7280;

  a {
    color: @primary-color;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}

.test-accounts {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px dashed #e5e7eb;
  font-size: 12px;
  color: #9ca3af;

  p {
    margin: 4px 0;
  }
}

// 响应式
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    min-height: auto;
  }

  .login-left {
    padding: 40px 30px;
    text-align: center;

    .features {
      display: none;
    }
  }

  .login-right {
    padding: 40px 30px;
  }
}
</style>
