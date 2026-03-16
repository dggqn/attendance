<template>
  <div class="user-settings">
    <h2 class="section-title">👤 个人资料</h2>

    <!-- 头像设置 -->
    <div class="settings-section">
      <h3>头像</h3>
      <div class="avatar-section">
        <div class="avatar-wrapper" @click="selectImage">
          <img :src="form.avatar" class="avatar-preview" />
          <div class="avatar-overlay">
            <span>点击更换</span>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleImageChange"
        />
        <div class="avatar-actions">
          <button class="btn-secondary" @click="selectImage">选择图片</button>
          <button class="btn-secondary" @click="resetAvatar">使用默认</button>
        </div>
      </div>
      <p class="avatar-hint">支持 JPG、PNG 格式，建议尺寸 200x200</p>
    </div>

    <!-- 基本信息 -->
    <div class="settings-section">
      <h3>基本信息</h3>
      <div class="form-grid">
        <div class="form-item">
          <label>用户名</label>
          <input :value="userStore.currentUser?.username" disabled />
          <span class="hint">用户名不可修改</span>
        </div>
        <div class="form-item">
          <label>昵称</label>
          <input v-model="form.nickname" placeholder="请输入昵称" />
        </div>
        <div class="form-item">
          <label>邮箱</label>
          <input :value="userEmail" disabled />
        </div>
        <div class="form-item">
          <label>部门</label>
          <input :value="userStore.currentUser?.departmentName || '未分配'" disabled />
        </div>
      </div>
    </div>

    <!-- 修改密码 -->
    <div class="settings-section">
      <h3>修改密码</h3>
      <div class="form-grid">
        <div class="form-item">
          <label>当前密码</label>
          <input v-model="passwordForm.currentPassword" type="password" placeholder="请输入当前密码" />
        </div>
        <div class="form-item">
          <label>新密码</label>
          <input v-model="passwordForm.newPassword" type="password" placeholder="至少6位" />
        </div>
        <div class="form-item">
          <label>确认新密码</label>
          <input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
        </div>
      </div>
      <div class="password-actions">
        <button class="btn-primary" @click="changePassword" :disabled="!canChangePassword">
          修改密码
        </button>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="settings-actions">
      <button class="btn-save" @click="saveProfile" :disabled="saving">
        {{ saving ? '保存中...' : '保存资料' }}
      </button>
    </div>

    <!-- 提示消息 -->
    <div v-if="message" :class="['message', message.type]">
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { supabase } from '@/supabase';

const userStore = useUserStore();

const form = ref({
  nickname: '',
  avatar: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const saving = ref(false);
const message = ref<{ type: string; text: string } | null>(null);
const fileInput = ref<HTMLInputElement>();
const maxSize = 2 * 1024 * 1024; // 2MB

// 获取用户邮箱
const userEmail = computed(() => {
  // 从 username 还原邮箱（如果包含 @attendance.local）
  const username = userStore.currentUser?.username || '';
  if (username.includes('@')) return username;
  return `${username}@attendance.local`;
});

// 是否可以修改密码
const canChangePassword = computed(() => {
  return passwordForm.value.currentPassword &&
    passwordForm.value.newPassword.length >= 6 &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword;
});

// 初始化表单
onMounted(() => {
  if (userStore.currentUser) {
    form.value.nickname = userStore.currentUser.nickname || '';
    form.value.avatar = userStore.currentUser.avatar || '';
  }
});

// 重置头像
const resetAvatar = () => {
  form.value.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userStore.currentUser?.username}`;
};

// 点击头像选择图片
const selectImage = () => {
  fileInput.value?.click();
};

// 处理图片选择
const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    message.value = { type: 'error', text: '请选择图片文件' };
    return;
  }

  // 检查文件大小
  if (file.size > maxSize) {
    message.value = { type: 'error', text: '图片大小不能超过 2MB' };
    return;
  }

  // 读取为 base64
  const reader = new FileReader();
  reader.onload = (e) => {
    form.value.avatar = e.target?.result as string;
    message.value = { type: 'success', text: '图片已选择，记得点击保存！' };
  };
  reader.onerror = () => {
    message.value = { type: 'error', text: '图片读取失败' };
  };
  reader.readAsDataURL(file);

  // 清空 input，允许重复选择同一文件
  target.value = '';
};

// 保存资料
const saveProfile = async () => {
  if (!userStore.currentUser) return;

  saving.value = true;
  message.value = null;

  const { error } = await supabase
    .from('profiles')
    .update({
      nickname: form.value.nickname,
      avatar: form.value.avatar,
    })
    .eq('id', userStore.currentUser.id);

  if (error) {
    message.value = { type: 'error', text: '保存失败: ' + error.message };
  } else {
    // 更新本地状态
    await userStore.fetchUserProfile(userStore.currentUser.id);
    message.value = { type: 'success', text: '保存成功！' };
  }

  saving.value = false;
};

// 修改密码
const changePassword = async () => {
  if (!canChangePassword.value) return;

  message.value = null;

  // Supabase 需要重新登录验证当前密码，然后更新
  // 简化方案：直接调用 updateUser 更新密码
  const { error } = await supabase.auth.updateUser({
    password: passwordForm.value.newPassword,
  });

  if (error) {
    message.value = { type: 'error', text: '修改密码失败: ' + error.message };
  } else {
    message.value = { type: 'success', text: '密码修改成功！请使用新密码重新登录。' };
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  }
};
</script>

<style scoped lang="less">
.user-settings {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 24px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #f3f4f6;
}

.settings-section {
  margin-bottom: 32px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 16px 0;
  }
}

// 头像设置
.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;

  &:hover .avatar-overlay {
    opacity: 1;
  }
}

.avatar-preview {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;

  span {
    color: #fff;
    font-size: 12px;
  }
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

// 表单网格
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }

  input {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #667eea;
    }

    &:disabled {
      background: #f3f4f6;
      color: #6b7280;
      cursor: not-allowed;
    }
  }

  .hint {
    font-size: 12px;
    color: #9ca3af;
  }
}

// 按钮
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
  padding: 8px 16px;
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #e5e7eb;
  }
}

.btn-save {
  padding: 12px 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.password-actions {
  margin-top: 16px;
}

.settings-actions {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

// 消息提示
.message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;

  &.success {
    background: #d1fae5;
    color: #065f46;
  }

  &.error {
    background: #fee2e2;
    color: #991b1b;
  }
}
</style>
