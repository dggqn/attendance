<template>
  <div class="personal-chart">
    <h2 class="section-title">📊 我的考勤统计</h2>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-icon">📅</div>
        <div class="stat-info">
          <div class="stat-value">{{ attendanceStore.stats.total }}</div>
          <div class="stat-label">本月打卡</div>
        </div>
      </div>
      <div class="stat-card normal">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ attendanceStore.stats.normal }}</div>
          <div class="stat-label">正常出勤</div>
        </div>
      </div>
      <div class="stat-card late">
        <div class="stat-icon">⏰</div>
        <div class="stat-info">
          <div class="stat-value">{{ attendanceStore.stats.late }}</div>
          <div class="stat-label">迟到次数</div>
        </div>
      </div>
      <div class="stat-card absent">
        <div class="stat-icon">❌</div>
        <div class="stat-info">
          <div class="stat-value">{{ attendanceStore.stats.absent }}</div>
          <div class="stat-label">缺勤次数</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-container">
      <div ref="chartRef" class="chart"></div>
    </div>

    <!-- 今日状态 -->
    <div class="today-status">
      <h3>📍 今日打卡状态</h3>
      <div class="status-timeline">
        <div class="status-item" :class="{ done: attendanceStore.hasCheckedInToday }">
          <div class="status-dot">{{ attendanceStore.hasCheckedInToday ? '✓' : '○' }}</div>
          <div class="status-info">
            <div class="status-label">上班打卡</div>
            <div class="status-time">{{ attendanceStore.todayRecord?.checkIn || '未打卡' }}</div>
          </div>
        </div>
        <div class="status-line"></div>
        <div class="status-item" :class="{ done: attendanceStore.hasCheckedOutToday }">
          <div class="status-dot">{{ attendanceStore.hasCheckedOutToday ? '✓' : '○' }}</div>
          <div class="status-info">
            <div class="status-label">下班打卡</div>
            <div class="status-time">{{ attendanceStore.todayRecord?.checkOut || '未打卡' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as echarts from 'echarts';
import { useAttendanceStore } from '@/stores/attendance';

const attendanceStore = useAttendanceStore();
const chartRef = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;

  chart = echarts.init(chartRef.value);
  updateChart();
};

// 更新图表
const updateChart = () => {
  if (!chart) return;

  const data = attendanceStore.chartData;

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['正常', '迟到', '缺勤'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.dates,
      axisLabel: {
        rotate: 45,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: '正常',
        type: 'bar',
        stack: 'total',
        data: data.normalCount,
        itemStyle: { color: '#10b981' }
      },
      {
        name: '迟到',
        type: 'bar',
        stack: 'total',
        data: data.lateCount,
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: '缺勤',
        type: 'bar',
        stack: 'total',
        data: data.absentCount,
        itemStyle: { color: '#ef4444' }
      }
    ]
  };

  chart.setOption(option);
};

// 监听数据变化
watch(() => attendanceStore.chartData, updateChart, { deep: true });

onMounted(() => {
  initChart();
  window.addEventListener('resize', () => chart?.resize());
});
</script>

<style scoped lang="less">
.personal-chart {
  padding: 20px 0;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

// 统计卡片
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &.total { border-left: 4px solid #667eea; }
  &.normal { border-left: 4px solid #10b981; }
  &.late { border-left: 4px solid #f59e0b; }
  &.absent { border-left: 4px solid #ef4444; }

  .stat-icon {
    font-size: 28px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-label {
    font-size: 13px;
    color: #6b7280;
  }
}

// 图表
.chart-container {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.chart {
  width: 100%;
  height: 300px;
}

// 今日状态
.today-status {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 16px 0;
  }
}

.status-timeline {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: #f9fafb;
  border-radius: 10px;
  flex: 1;
  transition: all 0.3s;

  &.done {
    background: #ecfdf5;

    .status-dot {
      background: #10b981;
      color: #fff;
    }

    .status-label {
      color: #059669;
    }
  }
}

.status-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.status-info {
  .status-label {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .status-time {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }
}

.status-line {
  width: 40px;
  height: 2px;
  background: #e5e7eb;
}
</style>
