// 用户类型定义
export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  role: 'admin' | 'user';
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
