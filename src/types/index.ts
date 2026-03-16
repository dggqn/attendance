// 考勤记录类型
export interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  remark?: string;
}

// 考勤状态
export type AttendanceStatus = 'normal' | 'late' | 'early' | 'absent' | 'leave';

// 统计信息
export interface AttendanceStats {
  total: number;
  normal: number;
  late: number;
  early: number;
  absent: number;
  leave: number;
}

// 图表数据
export interface ChartData {
  dates: string[];
  normalCount: number[];
  lateCount: number[];
  absentCount: number[];
}

// 重新导出用户和部门类型
export * from './user';
export * from './department';
export * from './leaveRequest';
