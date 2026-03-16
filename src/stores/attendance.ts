import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/supabase";
import type { AttendanceRecord, AttendanceStats, ChartData } from "@/types";
import { useUserStore } from "./user";
import * as XLSX from "xlsx";

export const useAttendanceStore = defineStore("attendance", () => {
  const userStore = useUserStore();

  // 考勤记录列表
  const records = ref<AttendanceRecord[]>([]);
  const loading = ref(false);

  // 分页状态
  const pagination = ref({
    currentPage: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  // ===== 根据权限加载数据（分页）=====
  const fetchRecords = async (page = 1, pageSize = 1000) => {
    loading.value = true;

    // 计算分页范围
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 先查询总数
    let countQuery = supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true });

    // 权限过滤
    if (userStore.isNormalUser) {
      countQuery = countQuery.eq('user_id', userStore.currentUser?.id);
    } else if (userStore.currentUser?.role === 'admin' && userStore.currentUser?.departmentId) {
      countQuery = countQuery.eq('department_id', userStore.currentUser.departmentId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("获取总数失败:", countError);
    } else {
      pagination.value.total = count || 0;
      pagination.value.totalPages = Math.ceil((count || 0) / pageSize);
    }

    // 查询分页数据
    let query = supabase
      .from("attendance_records")
      .select("*")
      .order("date", { ascending: false })
      .range(from, to);

    // 权限过滤
    if (userStore.isNormalUser) {
      query = query.eq('user_id', userStore.currentUser?.id);
    } else if (userStore.currentUser?.role === 'admin' && userStore.currentUser?.departmentId) {
      query = query.eq('department_id', userStore.currentUser.departmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("加载失败:", error);
    } else {
      records.value = data.map(item => ({
        id: item.id,
        employeeName: item.employee_name,
        employeeId: item.employee_id,
        date: item.date,
        checkIn: item.check_in,
        checkOut: item.check_out,
        status: item.status,
        remark: item.remark,
        userId: item.user_id,
        departmentId: item.department_id,
      }));
      pagination.value.currentPage = page;
      pagination.value.pageSize = pageSize;
    }
    loading.value = false;
  };

  // ===== 添加/覆盖记录 =====
  const addRecord = async (record: Omit<AttendanceRecord, "id">) => {
    const userId = userStore.currentUser?.id;
    const departmentId = userStore.currentUser?.departmentId;

    if (!userId) {
      alert("请先登录");
      return;
    }

    // 检查是否已有同一天的记录（覆盖逻辑）
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("user_id", userId)
      .eq("date", record.date)
      .maybeSingle();

    if (existingRecord) {
      // 覆盖已有记录
      const { error } = await supabase
        .from("attendance_records")
        .update({
          check_in: record.checkIn,
          check_out: record.checkOut,
          status: record.status,
          remark: record.remark,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id);

      if (error) {
        alert("更新失败: " + error.message);
      } else {
        await fetchRecords();
      }
    } else {
      // 新建记录
      const { error } = await supabase
        .from("attendance_records")
        .insert({
          user_id: userId,
          department_id: departmentId,
          employee_name: record.employeeName,
          employee_id: record.employeeId,
          date: record.date,
          check_in: record.checkIn,
          check_out: record.checkOut,
          status: record.status,
          remark: record.remark,
        })
        .select();

      if (error) {
        alert("添加失败: " + error.message);
      } else {
        await fetchRecords();
      }
    }
  };

  // ===== 删除记录 =====
  const deleteRecord = async (id: string) => {
    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("id", id);

    if (error) {
      alert("删除失败: " + error.message);
    } else {
      await fetchRecords();
    }
  };

  // ===== 更新备注（普通用户可用）=====
  const updateRemark = async (id: string, remark: string) => {
    const { error } = await supabase
      .from("attendance_records")
      .update({ remark })
      .eq("id", id);

    if (error) {
      alert("更新备注失败: " + error.message);
      return false;
    }

    await fetchRecords();
    return true;
  };

  // ===== 统计信息（根据权限过滤）=====
  const stats = computed<AttendanceStats>(() => {
    const total = records.value.length;
    const normal = records.value.filter(r => r.status === "normal").length;
    const late = records.value.filter(r => r.status === "late").length;
    const early = records.value.filter(r => r.status === "early").length;
    const absent = records.value.filter(r => r.status === "absent").length;
    const leave = records.value.filter(r => r.status === "leave").length;
    return { total, normal, late, early, absent, leave };
  });

  // ===== 图表数据 =====
  const chartData = computed<ChartData>(() => {
    const dateMap = new Map<
      string,
      { normal: number; late: number; absent: number }
    >();

    records.value.forEach(record => {
      const current = dateMap.get(record.date) || {
        normal: 0,
        late: 0,
        absent: 0,
      };
      if (record.status === "normal") current.normal++;
      else if (record.status === "late") current.late++;
      else if (record.status === "absent") current.absent++;
      dateMap.set(record.date, current);
    });

    const sortedDates = Array.from(dateMap.keys()).sort();

    return {
      dates: sortedDates,
      normalCount: sortedDates.map(d => dateMap.get(d)?.normal || 0),
      lateCount: sortedDates.map(d => dateMap.get(d)?.late || 0),
      absentCount: sortedDates.map(d => dateMap.get(d)?.absent || 0),
    };
  });

  // ===== 今日打卡状态 =====
  const todayRecord = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return records.value.find(r => r.date === today);
  });

  const hasCheckedInToday = computed(() => !!todayRecord.value?.checkIn);
  const hasCheckedOutToday = computed(() => !!todayRecord.value?.checkOut);

  // ===== 清空数据（切换账号时用）=====
  const reset = () => {
    records.value = [];
    loading.value = false;
    pagination.value = {
      currentPage: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    };
  };

  // ===== 切换页码 =====
  const changePage = (page: number) => {
    if (page < 1 || page > pagination.value.totalPages) return;
    fetchRecords(page, pagination.value.pageSize);
  };

  // ===== 切换每页条数 =====
  const changePageSize = (size: number) => {
    pagination.value.pageSize = size;
    fetchRecords(1, size); // 重置到第一页
  };

  // ===== 导出 Excel =====
  const exportToExcel = (filename?: string) => {
    if (records.value.length === 0) {
      alert("暂无数据可导出");
      return;
    }

    // 准备数据
    const data = records.value.map((record, index) => ({
      序号: index + 1,
      姓名: record.employeeName,
      工号: record.employeeId,
      日期: record.date,
      上班时间: record.checkIn || "-",
      下班时间: record.checkOut || "-",
      状态: statusText[record.status],
      备注: record.remark || "-",
    }));

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "考勤记录");

    // 设置列宽
    ws["!cols"] = [
      { wch: 6 },   // 序号
      { wch: 12 },  // 姓名
      { wch: 12 },  // 工号
      { wch: 12 },  // 日期
      { wch: 10 },  // 上班时间
      { wch: 10 },  // 下班时间
      { wch: 8 },   // 状态
      { wch: 20 },  // 备注
    ];

    // 导出文件
    const defaultName = `考勤记录_${new Date().toISOString().split("T")[0]}`;
    XLSX.writeFile(wb, `${filename || defaultName}.xlsx`);
  };

  // 状态文本映射
  const statusText: Record<string, string> = {
    normal: "正常",
    late: "迟到",
    early: "早退",
    absent: "缺勤",
    leave: "请假",
  };

  return {
    records,
    loading,
    stats,
    chartData,
    todayRecord,
    hasCheckedInToday,
    hasCheckedOutToday,
    pagination,
    fetchRecords,
    addRecord,
    deleteRecord,
    updateRemark,
    reset,
    changePage,
    changePageSize,
    exportToExcel,
  };
});
