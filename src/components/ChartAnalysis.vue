<template>
  <div class="chart-analysis">
    <h2 class="chart-title">📊 考勤数据分析</h2>
    
    <div class="charts-grid">
      <!-- 饼图 - 考勤状态分布 -->
      <div class="chart-card">
        <h3 class="chart-subtitle">考勤状态分布</h3>
        <v-chart class="chart" :option="pieOption" autoresize />
      </div>

      <!-- 柱状图 - 每日考勤趋势 -->
      <div class="chart-card">
        <h3 class="chart-subtitle">每日考勤趋势</h3>
        <v-chart class="chart" :option="barOption" autoresize />
      </div>

      <!-- 折线图 - 考勤率趋势 -->
      <div class="chart-card full-width">
        <h3 class="chart-subtitle">考勤率变化趋势</h3>
        <v-chart class="chart" :option="lineOption" autoresize />
      </div>
    </div>

    <!-- 数据概览 -->
    <div class="overview-section">
      <h3 class="overview-title">📈 数据概览</h3>
      <div class="overview-grid">
        <div class="overview-item">
          <div class="overview-value">{{ attendanceRate }}%</div>
          <div class="overview-label">出勤率</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ lateRate }}%</div>
          <div class="overview-label">迟到率</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ absentRate }}%</div>
          <div class="overview-label">缺勤率</div>
        </div>
        <div class="overview-item">
          <div class="overview-value">{{ avgCheckIn }}</div>
          <div class="overview-label">平均上班时间</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent
} from 'echarts/components';
import VChart from 'vue-echarts';
import { useAttendanceStore } from '@/stores/attendance';

// 注册 ECharts 组件
use([
  CanvasRenderer,
  PieChart,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent
]);

const store = useAttendanceStore();

// 计算比率
const attendanceRate = computed(() => {
  const { total, normal, leave } = store.stats;
  if (total === 0) return 0;
  return Math.round(((normal + leave) / total) * 100);
});

const lateRate = computed(() => {
  const { total, late } = store.stats;
  if (total === 0) return 0;
  return Math.round((late / total) * 100);
});

const absentRate = computed(() => {
  const { total, absent } = store.stats;
  if (total === 0) return 0;
  return Math.round((absent / total) * 100);
});

// 计算平均上班时间
const avgCheckIn = computed(() => {
  const validRecords = store.records.filter(r => r.checkIn);
  if (validRecords.length === 0) return '--:--';
  
  let totalMinutes = 0;
  validRecords.forEach(r => {
    const [hours, minutes] = r.checkIn.split(':').map(Number);
    totalMinutes += hours * 60 + minutes;
  });
  
  const avgMinutes = Math.round(totalMinutes / validRecords.length);
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

// 饼图配置
const pieOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    data: ['正常', '迟到', '早退', '缺勤', '请假']
  },
  series: [
    {
      name: '考勤状态',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {c}'
      },
      data: [
        { value: store.stats.normal, name: '正常', itemStyle: { color: '#52c41a' } },
        { value: store.stats.late, name: '迟到', itemStyle: { color: '#faad14' } },
        { value: store.stats.early, name: '早退', itemStyle: { color: '#f97316' } },
        { value: store.stats.absent, name: '缺勤', itemStyle: { color: '#f5222d' } },
        { value: store.stats.leave, name: '请假', itemStyle: { color: '#8b5cf6' } }
      ]
    }
  ]
}));

// 柱状图配置
const barOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  legend: {
    data: ['正常', '迟到', '缺勤']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: store.chartData.dates,
    axisLabel: {
      rotate: 30
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
      data: store.chartData.normalCount,
      itemStyle: { color: '#52c41a' }
    },
    {
      name: '迟到',
      type: 'bar',
      stack: 'total',
      data: store.chartData.lateCount,
      itemStyle: { color: '#faad14' }
    },
    {
      name: '缺勤',
      type: 'bar',
      stack: 'total',
      data: store.chartData.absentCount,
      itemStyle: { color: '#f5222d' }
    }
  ]
}));

// 折线图配置
const lineOption = computed(() => {
  // 计算每天的考勤率
  const dates = store.chartData.dates;
  const rates = dates.map((date, index) => {
    const normal = store.chartData.normalCount[index] || 0;
    const late = store.chartData.lateCount[index] || 0;
    const absent = store.chartData.absentCount[index] || 0;
    const total = normal + late + absent;
    return total > 0 ? Math.round((normal / total) * 100) : 0;
  });

  return {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>出勤率: {c}%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: '出勤率',
        type: 'line',
        smooth: true,
        data: rates,
        itemStyle: { color: '#1890ff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
            ]
          }
        },
        lineStyle: {
          width: 3
        }
      }
    ]
  };
});
</script>

<style scoped lang="less">
.chart-analysis {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chart-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f3f4f6;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;

  &.full-width {
    grid-column: 1 / -1;
  }
}

.chart-subtitle {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.chart {
  width: 100%;
  height: 300px;
}

// 数据概览
.overview-section {
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.overview-title {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.overview-item {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: #fff;

  &:nth-child(2) {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  &:nth-child(3) {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  &:nth-child(4) {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  }

  .overview-value {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .overview-label {
    font-size: 14px;
    opacity: 0.9;
  }
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .chart-card.full-width {
    grid-column: 1;
  }

  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
