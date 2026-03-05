# 考勤系统 - 项目上下文

## 技术决策记录

### 认证方案
- 使用 Supabase Auth（不是自建 JWT）
- 用户表：`auth.users`（系统表）+ `profiles`（扩展表）
- 触发器：`handle_new_user` 自动同步
- 登录方式：邮箱+密码（用户名转邮箱格式）

### 状态管理
- Pinia：`user.ts` 管理登录状态
- 关键函数：`checkLoginStatus`, `login`, `register`, `logout`

### 待办
- [ ] 测试注册流程
- [ ] 添加邮箱验证（可选）
- [ ] 管理员功能

## 上次做到哪
正在修改 `src/stores/user.ts`，把 mock 数据改成 Supabase 调用。
