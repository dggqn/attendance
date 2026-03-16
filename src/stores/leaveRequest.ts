import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { supabase } from "@/supabase";
import { useUserStore } from "./user";
import type { LeaveRequest, LeaveRequestForm, LeaveStatus } from "@/types/leaveRequest";
import { leaveTypeText, leaveStatusText } from "@/types/leaveRequest";

export const useLeaveRequestStore = defineStore("leaveRequest", () => {
  const userStore = useUserStore();

  // 申请列表
  const requests = ref<LeaveRequest[]>([]);
  const loading = ref(false);

  // 统计
  const stats = computed(() => {
    const pending = requests.value.filter((r) => r.status === "pending").length;
    const approved = requests.value.filter((r) => r.status === "approved").length;
    const rejected = requests.value.filter((r) => r.status === "rejected").length;
    return { pending, approved, rejected, total: requests.value.length };
  });

  // ===== 提交申请 =====
  const submitRequest = async (form: LeaveRequestForm): Promise<boolean> => {
    const userId = userStore.currentUser?.id;
    if (!userId) {
      alert("请先登录");
      return false;
    }

    const { error } = await supabase.from("leave_requests").insert({
      user_id: userId,
      type: form.type,
      start_date: form.startDate,
      end_date: form.endDate,
      reason: form.reason,
      status: "pending",
    });

    if (error) {
      alert("提交失败: " + error.message);
      return false;
    }

    await fetchRequests();
    return true;
  };

  // ===== 获取申请列表 =====
  const fetchRequests = async () => {
    loading.value = true;

    let query = supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });

    // 权限过滤
    if (userStore.isNormalUser) {
      // 普通用户只能看自己的
      query = query.eq("user_id", userStore.currentUser?.id);
    } else if (userStore.currentUser?.role === "admin" && userStore.currentUser?.departmentId) {
      // 管理员看本部门的
      query = query.eq("department_id", userStore.currentUser.departmentId);
    }
    // 超管看全部

    const { data, error } = await query;

    if (error) {
      console.error("加载申请列表失败:", error);
    } else {
      // 获取所有相关的 user_id
      const userIds = [...new Set(data.map((item: any) => item.user_id))];
      
      // 查询用户信息
      let userMap = new Map();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username, nickname')
          .in('id', userIds);
        
        users?.forEach((u: any) => userMap.set(u.id, u));
      }

      requests.value = data.map((item: any) => {
        const user = userMap.get(item.user_id);
        return {
          id: item.id,
          userId: item.user_id,
          userName: user?.nickname || user?.username || '未知用户',
          departmentId: item.department_id,
          departmentName: '', // 暂不查询
          type: item.type,
          startDate: item.start_date,
          endDate: item.end_date,
          reason: item.reason,
          status: item.status,
          approverId: item.approver_id,
          approverComment: item.approver_comment,
          approvedAt: item.approved_at,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      });
    }
    loading.value = false;
  };

  // ===== 审批申请（管理员/超管）=====
  const approveRequest = async (
    requestId: string,
    status: LeaveStatus,
    comment?: string
  ): Promise<boolean> => {
    if (!userStore.isAdmin) {
      alert("无权审批");
      return false;
    }

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status,
        approver_id: userStore.currentUser?.id,
        approver_comment: comment,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      alert("审批失败: " + error.message);
      return false;
    }

    await fetchRequests();
    return true;
  };

  // ===== 撤销申请（普通用户）=====
  const cancelRequest = async (requestId: string): Promise<boolean> => {
    const request = requests.value.find((r) => r.id === requestId);
    if (!request) return false;

    // 只能撤销自己的待审批申请
    if (request.userId !== userStore.currentUser?.id) {
      alert("无权撤销");
      return false;
    }
    if (request.status !== "pending") {
      alert("只能撤销待审批的申请");
      return false;
    }

    const { error } = await supabase.from("leave_requests").delete().eq("id", requestId);

    if (error) {
      alert("撤销失败: " + error.message);
      return false;
    }

    await fetchRequests();
    return true;
  };

  return {
    requests,
    loading,
    stats,
    submitRequest,
    fetchRequests,
    approveRequest,
    cancelRequest,
    leaveTypeText,
    leaveStatusText,
  };
});
