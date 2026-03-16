// 部门类型定义
export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentForm {
  name: string;
  description?: string;
  managerId?: string;
}
