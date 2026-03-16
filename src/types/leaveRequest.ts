// 请假/补卡申请类型

export type LeaveType = 'makeup' | 'sick' | 'personal' | 'annual' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  userId: string;
  userName?: string;
  departmentId?: string;
  departmentName?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approverId?: string;
  approverName?: string;
  approverComment?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeaveRequestForm {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export const leaveTypeText: Record<LeaveType, string> = {
  makeup: '补卡',
  sick: '病假',
  personal: '事假',
  annual: '年假',
  other: '其他',
};

export const leaveStatusText: Record<LeaveStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
};
