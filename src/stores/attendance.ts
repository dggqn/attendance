import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/supabase";
import type { AttendanceRecord, AttendanceStats, ChartData } from "@/types";
import dayjs from "dayjs";

export const useAttendanceStore = defineStore("attendance", () => {
  // 考勤记录列表
  const records = ref<AttendanceRecord[]>([]);
  const loading = ref(false);

  // ===== 关键：从 Supabase 加载数据 =====
  const fetchRecords = async () => {
    loading.value = true;
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("加载失败:", error);
    } else {
      // 把数据库字段映射到前端类型
      records.value = data.map(item => ({
        id: item.id,
        employeeName: item.employee_name,
        employeeId: item.employee_id,
        date: item.date,
        checkIn: item.check_in,
        checkOut: item.check_out,
        status: item.status,
        remark: item.remark,
      }));
    }
    loading.value = false;
  };

  // ===== 关键：添加记录到 Supabase =====
  const addRecord = async (record: Omit<AttendanceRecord, "id">) => {
    const { data, error } = await supabase
      .from("attendance_records")
      .insert({
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
      await fetchRecords(); // 重新加载列表
    }
  };

  // ===== 关键：删除记录 =====
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

  // 统计信息（不变）
  const stats = computed<AttendanceStats>(() => {
    const total = records.value.length;
    const normal = records.value.filter(r => r.status === "normal").length;
    const late = records.value.filter(r => r.status === "late").length;
    const early = records.value.filter(r => r.status === "early").length;
    const absent = records.value.filter(r => r.status === "absent").length;
    const leave = records.value.filter(r => r.status === "leave").length;
    return { total, normal, late, early, absent, leave };
  });

  // 图表数据（不变）
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

  return {
    records,
    loading,
    stats,
    chartData,
    fetchRecords,
    addRecord,
    deleteRecord,
  };
});
