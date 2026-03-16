import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, LoginForm, UserRole } from '@/types/user';
import { canManageAll, canManageDepartment, canViewAllRecords } from '@/types/user';
import { supabase } from '@/supabase';

export const useUserStore = defineStore('user', () => {
  // 当前登录用户
  const currentUser = ref<User | null>(null);
  const loading = ref(false);
  const error = ref('');
  const departments = ref<{ id: string; name: string }[]>([]);

  // 是否已登录
  const isLoggedIn = computed(() => !!currentUser.value);

  // 角色判断
  const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin');
  const isAdmin = computed(() => currentUser.value?.role === 'admin' || currentUser.value?.role === 'super_admin');
  const isNormalUser = computed(() => currentUser.value?.role === 'user');

  // 是否需要选择部门（首次登录的普通用户）
  const needsDepartmentSelection = computed(() => {
    if (!currentUser.value) return false;
    if (currentUser.value.role !== 'user') return false;
    return !currentUser.value.departmentId || currentUser.value.departmentId === '00000000-0000-0000-0000-000000000000';
  });

  // 权限检查
  const canManageAllData = computed(() => canManageAll(currentUser.value?.role as UserRole));
  const canManageDeptData = computed(() => canManageDepartment(currentUser.value?.role as UserRole));
  const canViewAllRecordsData = computed(() => canViewAllRecords(currentUser.value?.role as UserRole));

  // ===== 登录 =====
  const login = async (form): Promise<boolean> => {
    loading.value = true;
    error.value = '';

    const email = form.username.includes('@')
      ? form.username
      : `${form.username}@attendance.local`;

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: form.password,
    });

    if (signInError) {
      if (signInError.message === 'Invalid login credentials') {
        error.value = '用户名或密码错误';
      } else if (signInError.message.includes('Email not confirmed')) {
        error.value = '邮箱未验证，请查收邮件并点击确认链接';
      } else {
        error.value = signInError.message;
      }
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
  const logout = async () => {
    await supabase.auth.signOut();
    currentUser.value = null;
  };

  // ===== 获取用户资料 =====
  const fetchUserProfile = async (userId: string) => {
    const { data, error: fetchError } = await supabase.from('profiles')
      .select(`
        *,
        departments:department_id (name)
      `)
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.warn('Profile not found, using auth metadata:', fetchError);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metadata = user.user_metadata;
        currentUser.value = {
          id: user.id,
          username: metadata?.nickname || user.email?.split('@')[0] || 'user',
          nickname: metadata?.nickname || user.email?.split('@')[0] || 'user',
          role: metadata?.role || 'user',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        };
      }
      return;
    }

    if (data) {
      currentUser.value = {
        id: data.id,
        username: data.username,
        nickname: data.nickname,
        role: data.role,
        departmentId: data.department_id,
        departmentName: data.departments?.name || data.department_name,
        avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
      };
    }
  };

  // ===== 检查登录状态 =====
  const checkLoginStatus = async () => {
    loading.value = true;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user.id);
    }
    loading.value = false;
  };

  // ===== 注册 =====
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
          role: 'user',
        },
      },
    });

    if (signUpError) {
      error.value = signUpError.message;
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

  // ===== 获取部门列表 =====
  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .neq('id', '00000000-0000-0000-0000-000000000000') // 排除"未分配"
      .order('name');

    if (error) {
      console.error('获取部门列表失败:', error);
      return;
    }

    departments.value = data || [];
  };

  // ===== 用户选择部门（首次登录）=====
  const selectDepartment = async (departmentId: string): Promise<boolean> => {
    if (!currentUser.value) return false;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ department_id: departmentId })
      .eq('id', currentUser.value.id);

    if (updateError) {
      console.error('选择部门失败:', updateError);
      return false;
    }

    // 更新本地状态
    await fetchUserProfile(currentUser.value.id);
    return true;
  };

  // ===== 超管/管理员：获取所有用户 =====
  const fetchAllUsers = async () => {
    if (!canManageDeptData.value) return [];

    let query = supabase
      .from('profiles')
      .select(`
        *,
        departments:department_id (name)
      `)
      .order('created_at', { ascending: false });

    // 管理员只能看自己部门的
    if (currentUser.value?.role === 'admin' && currentUser.value?.departmentId) {
      query = query.eq('department_id', currentUser.value.departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取用户列表失败:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      username: item.username,
      nickname: item.nickname,
      role: item.role,
      departmentId: item.department_id,
      departmentName: item.departments?.name || item.department_name,
      avatar: item.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username}`,
    }));
  };

  // ===== 超管：修改用户角色/部门 =====
  const updateUser = async (userId: string, updates: { role?: UserRole; departmentId?: string }): Promise<boolean> => {
    if (!canManageAllData.value && !canManageDeptData.value) return false;

    const updateData: any = {};
    if (updates.role) updateData.role = updates.role;
    if (updates.departmentId) updateData.department_id = updates.departmentId;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('更新用户失败:', error);
      return false;
    }

    return true;
  };

  return {
    currentUser,
    loading,
    error,
    isLoggedIn,
    isSuperAdmin,
    isAdmin,
    isNormalUser,
    needsDepartmentSelection,
    departments,
    canManageAllData,
    canManageDeptData,
    canViewAllRecordsData,
    login,
    logout,
    checkLoginStatus,
    register,
    fetchDepartments,
    selectDepartment,
    fetchAllUsers,
    updateUser,
    fetchUserProfile,
  };
});
