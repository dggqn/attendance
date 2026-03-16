// 用户角色
export type UserRole = 'super_admin' | 'admin' | 'user';

// 用户类型定义
export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
}

export interface LoginForm {
  username: string;
  password: string;
  remember?: boolean;
}

export interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  nickname?: string;
}

// 权限检查工具
export const canManageAll = (role: UserRole) => role === 'super_admin';
export const canManageDepartment = (role: UserRole) => role === 'super_admin' || role === 'admin';
export const canViewAllRecords = (role: UserRole) => role === 'super_admin' || role === 'admin';
export const canEditOthersRecord = (role: UserRole, isOwner: boolean) => {
  if (role === 'super_admin') return true;
  if (role === 'admin') return true; // 管理员可以编辑本部门
  return isOwner;
};
