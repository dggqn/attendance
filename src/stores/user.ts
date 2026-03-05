import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, LoginForm } from '@/types/user';
import { supabase } from '@/supabase';  // 新增：导入 supabase

export const useUserStore = defineStore('user', () => {
  // 当前登录用户
  const currentUser = ref<User | null>(null);
  const loading = ref(false);
  const error = ref('');

  // 是否已登录
  const isLoggedIn = computed(() => !!currentUser.value);
  
  // 是否是管理员
  const isAdmin = computed(() => currentUser.value?.role === 'admin');

  // ===== 登录（本地模拟版）=====
  const login = async (form): Promise<boolean> => {
    loading.value = true;
    error.value = '';

    // Supabase Auth 使用邮箱登录
    // 如果用户名不包含 @，自动加上默认域名
    const email = form.username.includes('@')
      ? form.username
      : `${form.username}@attendance.local`;

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: form.password,
    });

    if (signInError) {
      error.value = signInError.message === 'Invalid login credentials'
        ? '用户名或密码错误'
        : signInError.message;
      loading.value = false;
      return false;
    }

    if (data.user) {
      await fetchUserProfile(data.user.id);
      loading.value = false;
      return true;
    }

    loading.value = false;
    return false;
  };

  // ===== 登出 =====
  const logout = async() => {
    await supabase.auth.signOut();
    currentUser.value = null;
  };
  const fetchUserProfile = async (userId: string) => {
    const {data, error:fetchError} = await supabase.from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
      if(fetchError){
        console.error(fetchError);
        return;
      }
      if(data){
        currentUser.value = {
          id: data.id,
          username: data.username,
          nickname: data.nickname,
          role: data.role,
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
        };
      }
  }
  // ===== 检查本地存储的登录状态 =====
  const checkLoginStatus = async() => {
    loading.value = true;
    // 获取当前会话
    const { data: { session } } = await supabase.auth.getSession();
    if(session?.user){
      // get user details from profiles table
      await fetchUserProfile(session.user.id);
    }
    loading.value = false;
  };

  // ===== 注册（本地模拟版）=====
  const register = async (form): Promise<boolean> => {
    loading.value = true;
    error.value = '';

    const email = form.username.includes('@')
      ? form.username
      : `${form.username}@attendance.local`;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          nickname: form.nickname || form.username,
          role: 'user', // 默认普通用户
        },
      },
    });

    if (signUpError) {
      error.value = signUpError.message;
      loading.value = false;
      return false;
    }

    if (data.user) {
      // 触发器会自动创建 profile
      await fetchUserProfile(data.user.id);
      loading.value = false;
      return true;
    }

    loading.value = false;
    return false;
  };

  return {
    currentUser,
    loading,
    error,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    checkLoginStatus,
    register,
  };
});
