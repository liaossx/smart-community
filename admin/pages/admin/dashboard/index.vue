<template>
  <admin-sidebar
    pageTitle="仪表盘"
    currentPage="/admin/pages/admin/dashboard/index"
    pageBreadcrumb="管理后台 / 仪表盘"
  >
    <view class="dashboard">
      <view class="dashboard-topbar">
        <view class="dashboard-title-group">
          <text class="dashboard-title">清晰、明亮、高效</text>
          <text class="dashboard-subtitle">更清爽的社区后台控制台，优先强化卡片边框、层级和可读性。</text>
        </view>
        <picker mode="selector" :range="monthOptions" range-key="label" @change="handleMonthChange">
          <view class="stats-filter-btn">
            <text class="stats-filter-text">{{ currentMonthLabel }}</text>
            <text class="stats-filter-arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="panel-card stats-panel">
        <view class="panel-header">
          <text class="panel-title">核心指标</text>
        </view>
        <view class="stats-grid">
          <view class="stat-card" v-for="(item, index) in stats" :key="index">
            <view class="stat-accent" :style="{ background: item.bg }"></view>
            <view class="stat-icon-wrap" :style="{ background: item.bg }">
              <text class="stat-icon">{{ item.icon }}</text>
            </view>
            <view class="stat-info">
              <text class="stat-value">{{ item.value }}</text>
              <text class="stat-label">{{ item.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="chart-grid">
        <view class="panel-card chart-panel">
          <view class="panel-header">
            <text class="panel-title">近七日报修趋势</text>
          </view>
          <view id="repairChart" class="echart-container" :prop="repairTrend" :change:prop="echarts.updateRepairChart"></view>
        </view>

        <view class="panel-card chart-panel">
          <view class="panel-header">
            <text class="panel-title">投诉类型分布</text>
          </view>
          <view id="complaintChart" class="echart-container" :prop="complaintType" :change:prop="echarts.updateComplaintChart"></view>
        </view>
      </view>

      <view class="chart-grid">
        <view class="panel-card chart-panel">
          <view class="panel-header">
            <text class="panel-title">工单处理状态</text>
          </view>
          <view id="workOrderChart" class="echart-container" :prop="workOrderStats" :change:prop="echarts.updateWorkOrderChart"></view>
        </view>

        <view class="panel-card chart-panel">
          <view class="panel-header">
            <text class="panel-title">报修与工单对比</text>
          </view>
          <view id="compareChart" class="echart-container" :prop="compareStats" :change:prop="echarts.updateCompareChart"></view>
        </view>
      </view>

      <view class="panel-card menu-panel">
        <view class="panel-header">
            <text class="panel-title">快捷入口</text>
        </view>
        <view class="menu-grid">
          <view class="menu-item" v-for="(menu, index) in menus" :key="index" @click="navigateTo(menu.path)">
            <view class="menu-icon" :style="{ background: menu.color }">
              <text class="menu-icon-text">{{ menu.icon }}</text>
              <view v-if="getMenuBadge(menu) > 0" class="badge-dot"></view>
            </view>
            <text class="menu-name">{{ menu.name }}</text>
          </view>
        </view>
      </view>
    </view>
  </admin-sidebar>
</template>

<script>
import request from '@/utils/request'
import adminSidebar from '@/admin/components/admin-sidebar/admin-sidebar'

export default {
  components: { adminSidebar },
  data() {
    return {
      userInfo: {},
      stats: [
        { label: '小区总数', value: '-', icon: '▦', bg: 'linear-gradient(135deg, #5e78a2 0%, #7991b2 100%)' },
        { label: '住户总数', value: '-', icon: '☺', bg: 'linear-gradient(135deg, #7da4b8 0%, #92bac8 100%)' },
        { label: '待办事项', value: '-', icon: '≣', bg: 'linear-gradient(135deg, #6a7fa3 0%, #88a0c0 100%)' },
        { label: '今日报修', value: '-', icon: '⌘', bg: 'linear-gradient(135deg, #7ab38a 0%, #9cc3a4 100%)' }
      ],
      menus: [
        { name: '仪表盘', icon: '◫', color: 'linear-gradient(135deg, #617ca4 0%, #7f97b6 100%)', path: '/admin/pages/admin/dashboard/index' },
        { name: '报修管理', icon: '⌂', color: 'linear-gradient(135deg, #6f86a8 0%, #8fa1bf 100%)', path: '/admin/pages/admin/repair-manage', badgeKey: 'repair' },
        { name: '工单管理', icon: '▣', color: 'linear-gradient(135deg, #607099 0%, #7c8db0 100%)', path: '/admin/pages/admin/work-order-manage', badgeKey: 'workorder' },
        { name: '公告管理', icon: '✉', color: 'linear-gradient(135deg, #8ea0b7 0%, #a7b6c9 100%)', path: '/admin/pages/admin/notice-manage' },
        { name: '费用管理', icon: '¥', color: 'linear-gradient(135deg, #c0a57b 0%, #d6b98f 100%)', path: '/admin/pages/admin/fee-manage' },
        { name: '投诉处理', icon: '☏', color: 'linear-gradient(135deg, #a98578 0%, #c29e90 100%)', path: '/admin/pages/admin/complaint-manage', badgeKey: 'complaint' },
        { name: '访客审核', icon: '◉', color: 'linear-gradient(135deg, #7fa494 0%, #95b7a9 100%)', path: '/admin/pages/admin/visitor-manage', badgeKey: 'visitor' },
        { name: '社区活动', icon: '✦', color: 'linear-gradient(135deg, #8c96b5 0%, #adb4cb 100%)', path: '/admin/pages/admin/activity-manage' },
        { name: '停车管理', icon: '▤', color: 'linear-gradient(135deg, #7ea0ae 0%, #97b7c4 100%)', path: '/admin/pages/admin/parking-manage' },
        { name: '用户管理', icon: '☺', color: 'linear-gradient(135deg, #86a18e 0%, #a1b9aa 100%)', path: '/admin/pages/admin/user-manage' },
        { name: '系统配置', icon: '⚙', color: 'linear-gradient(135deg, #8d95a6 0%, #a5adbd 100%)', path: '/admin/pages/admin/system-config' }
      ],
      menuBadges: {},
      repairTrend: [],
      complaintType: [],
      workOrderStats: [],
      compareStats: {},
      monthOptions: [],
      monthIndex: 0,
      monthValue: ''
    }
  },
  computed: {
    currentMonthLabel() {
      const opt = this.monthOptions && this.monthOptions[this.monthIndex]
      return (opt && opt.label) || this.monthValue || '选择月份'
    }
  },
  onShow() {
    const userInfo = uni.getStorageSync('userInfo')
    if (userInfo) {
      if (userInfo.role === 'worker') {
        uni.redirectTo({ url: '/admin/pages/admin/worker-tasks' })
        return
      }
      this.userInfo = userInfo
      if (!this.monthOptions || this.monthOptions.length === 0) {
        this.initMonthOptions()
      }
      this.loadDashboardData()
      this.loadRepairStats()
    } else {
      uni.redirectTo({ url: '/owner/pages/login/login' })
    }
  },
  methods: {
    initMonthOptions() {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      const current = `${y}-${String(m).padStart(2, '0')}`
      const opts = []
      for (let i = 0; i < 12; i++) {
        const d = new Date(y, m - 1 - i, 1)
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const value = `${yy}-${mm}`
        opts.push({ label: value, value })
      }
      this.monthOptions = opts
      this.monthValue = current
      this.monthIndex = Math.max(0, opts.findIndex(o => o.value === current))
    },
    handleMonthChange(e) {
      const idx = Number(e && e.detail ? e.detail.value : 0)
      const option = this.monthOptions && this.monthOptions[idx]
      if (!option) return
      this.monthIndex = idx
      this.monthValue = option.value
      this.loadDashboardData()
      this.loadRepairStats()
    },
    async loadRepairStats() {
      try {
        const params = this.monthValue ? { month: this.monthValue } : {}
        const res = await request({ url: '/api/repair/stats', method: 'GET', params })
        const data = res.data || res

        if (data.workorder) {
          this.workOrderStats = [
            { name: '待指派', value: data.workorder.pending || 0 },
            { name: '已指派', value: data.workorder.assigned || 0 },
            { name: '处理中', value: data.workorder.processing || 0 },
            { name: '已完成', value: data.workorder.completed || 0 }
          ]
        }

        if (data.repair && data.workorder) {
          this.compareStats = {
            repair: data.repair.total || 0,
            workorder: data.workorder.total || 0
          }
        }
      } catch (e) {
        console.error('加载统计失败', e)
      }
    },
    async loadDashboardData() {
      try {
        const params = this.monthValue ? { month: this.monthValue } : {}
        const raw = await request({ url: '/api/admin/stats/overview', method: 'GET', params })
        const data = raw && raw.data ? raw.data : raw
        if (!data) return

        this.stats[0].value = data.community?.total ?? data.communityTotal ?? 0
        this.stats[1].value =
          data.user?.owner ??
          data.user?.total ??
          data.user?.resident ??
          data.user?.count ??
          data.ownerTotal ??
          data.residentTotal ??
          data.userTotal ??
          0

        const repairPending = data.repair?.repair?.pending ?? data.repair?.pending ?? 0
        const workorderPending = data.repair?.workorder?.pending ?? data.workorder?.pending ?? 0
        const complaintPending = data.complaint?.pending ?? 0
        const visitorPending = data.visitor?.pending ?? 0

        const pendingTotal = complaintPending + repairPending + visitorPending + workorderPending
        this.stats[2].value = data.todoTotal ?? pendingTotal
        this.stats[3].value = data.todayRepair ?? data.repair?.todayRepair ?? data.repair?.today ?? 0

        this.menuBadges = {
          repair: repairPending,
          workorder: workorderPending,
          complaint: complaintPending,
          visitor: visitorPending
        }

        if (data.repairTrend && data.repairTrend.length > 0) {
          this.repairTrend = data.repairTrend
        } else {
          const today = new Date()
          const dates = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today)
            d.setDate(today.getDate() - i)
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            dates.push(`${m}-${day}`)
          }
          this.repairTrend = dates.map(d => ({ date: d, count: 0 }))
        }

        if (data.complaintType && data.complaintType.length > 0) {
          const typeMap = {
            noise: '噪音扰民',
            environment: '环境卫生',
            env: '环境卫生',
            sanitation: '环境卫生',
            facility: '设施损坏',
            repair: '设施损坏',
            security: '安保问题',
            safety: '安保问题',
            other: '其他'
          }

          this.complaintType = data.complaintType.map(item => ({
            ...item,
            name: typeMap[(item.name || '').toLowerCase()] || item.name
          }))
        } else {
          this.complaintType = [
            { name: '暂无数据', value: 0, itemStyle: { color: '#c7ccd5' } }
          ]
        }
      } catch (e) {
        console.error('加载看板数据失败', e)
      }
    },
    navigateTo(url) {
      uni.navigateTo({ url })
    },
    getMenuBadge(menu) {
      if (!menu || !menu.badgeKey) return 0
      return Number(this.menuBadges[menu.badgeKey] || 0)
    }
  }
}
</script>

<script module="echarts" lang="renderjs">
export default {
  data() {
    return {
      repairChart: null,
      complaintChart: null,
      workOrderChart: null,
      compareChart: null,
      pendingRepairData: null,
      pendingComplaintData: null,
      pendingWorkOrderData: null,
      pendingCompareData: null
    }
  },
  mounted() {
    if (window.echarts) {
      this.initInstances()
    } else {
      this.initCharts()
    }
  },
  methods: {
    initCharts() {
      if (typeof window.echarts === 'object') {
        this.initInstances()
        return
      }

      const script = document.createElement('script')
      script.id = 'echarts-script'
      script.src = 'https://unpkg.com/echarts@5.4.3/dist/echarts.min.js'
      script.onload = () => this.initInstances()
      document.head.appendChild(script)
    },
    initInstances() {
      if (!window.echarts) return

      const repairDom = document.getElementById('repairChart')
      if (repairDom) this.repairChart = window.echarts.init(repairDom)

      const complaintDom = document.getElementById('complaintChart')
      if (complaintDom) this.complaintChart = window.echarts.init(complaintDom)

      const workOrderDom = document.getElementById('workOrderChart')
      if (workOrderDom) this.workOrderChart = window.echarts.init(workOrderDom)

      const compareDom = document.getElementById('compareChart')
      if (compareDom) this.compareChart = window.echarts.init(compareDom)

      if (this.pendingRepairData) this.renderRepairChart(this.pendingRepairData)
      if (this.pendingComplaintData) this.renderComplaintChart(this.pendingComplaintData)
      if (this.pendingWorkOrderData) this.renderWorkOrderChart(this.pendingWorkOrderData)
      if (this.pendingCompareData) this.renderCompareChart(this.pendingCompareData)
    },
    baseOption() {
      return {
        backgroundColor: 'transparent',
        textStyle: {
          color: '#738090'
        }
      }
    },
    updateRepairChart(newValue) {
      this.pendingRepairData = newValue
      if (this.repairChart) this.renderRepairChart(newValue)
    },
    renderRepairChart(data) {
      if (!data || data.length === 0) return
      const dates = data.map(item => item.date)
      const counts = data.map(item => item.count)
      this.repairChart.setOption({
        ...this.baseOption(),
        grid: { top: 20, bottom: 20, left: 30, right: 10, containLabel: true },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: '#d6dbe1' } },
          axisLabel: { color: '#8a97a4' }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#edf0f3' } },
          axisLabel: { color: '#8a97a4' }
        },
        series: [{
          data: counts,
          type: 'line',
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#6c88b2' },
          lineStyle: { color: '#6c88b2', width: 3 },
          areaStyle: { color: 'rgba(108, 136, 178, 0.16)' }
        }]
      })
    },
    updateComplaintChart(newValue) {
      this.pendingComplaintData = newValue
      if (this.complaintChart) this.renderComplaintChart(newValue)
    },
    renderComplaintChart(data) {
      if (!data || data.length === 0) return
      this.complaintChart.setOption({
        ...this.baseOption(),
        color: ['#6a83aa', '#8fa4bd', '#98b1a0', '#b3a088', '#b28f8d'],
        tooltip: { trigger: 'item' },
        legend: {
          bottom: '2%',
          left: 'center',
          textStyle: { color: '#8a97a4', fontSize: 12 }
        },
        series: [{
          type: 'pie',
          radius: ['42%', '68%'],
          data,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#ffffff',
            borderWidth: 3
          },
          label: { color: '#7f8b97' }
        }]
      })
    },
    updateWorkOrderChart(newValue) {
      this.pendingWorkOrderData = newValue
      if (this.workOrderChart) this.renderWorkOrderChart(newValue)
    },
    renderWorkOrderChart(data) {
      if (!data || data.length === 0) return
      this.workOrderChart.setOption({
        ...this.baseOption(),
        color: ['#6983a7', '#879bbb', '#9bb7a3', '#b09ca0'],
        tooltip: { trigger: 'item' },
        legend: {
          bottom: '2%',
          left: 'center',
          textStyle: { color: '#8a97a4', fontSize: 12 }
        },
        series: [{
          type: 'pie',
          radius: ['36%', '64%'],
          itemStyle: {
            borderRadius: 8,
            borderColor: '#ffffff',
            borderWidth: 3
          },
          label: { color: '#7f8b97' },
          data
        }]
      })
    },
    updateCompareChart(newValue) {
      this.pendingCompareData = newValue
      if (this.compareChart) this.renderCompareChart(newValue)
    },
    renderCompareChart(data) {
      if (!data || data.repair === undefined) return
      this.compareChart.setOption({
        ...this.baseOption(),
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
        xAxis: [{
          type: 'category',
          data: ['总量对比'],
          axisLine: { lineStyle: { color: '#d6dbe1' } },
          axisLabel: { color: '#8a97a4' }
        }],
        yAxis: [{
          type: 'value',
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#edf0f3' } },
          axisLabel: { color: '#8a97a4' }
        }],
        series: [
          { name: '报修总数', type: 'bar', barWidth: '24%', data: [data.repair], itemStyle: { color: '#6c88b2', borderRadius: [8, 8, 0, 0] } },
          { name: '已转工单', type: 'bar', barWidth: '24%', data: [data.workorder], itemStyle: { color: '#99b39f', borderRadius: [8, 8, 0, 0] } }
        ]
      })
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100%;
  padding-bottom: 24rpx;
}

.dashboard-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
  padding: 0 4rpx;
}

.dashboard-title-group {
  display: flex;
  flex-direction: column;
}

.dashboard-title {
  font-size: 40rpx;
  color: #19324a;
  font-weight: 700;
}

.dashboard-subtitle {
  margin-top: 8rpx;
  font-size: 19rpx;
  color: #6e8195;
}

.stats-filter-btn {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  height: 52rpx;
  border: 1rpx solid #d9e4ee;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 18rpx rgba(23, 49, 78, 0.05);
}

.stats-filter-text {
  font-size: 24rpx;
  color: #6f7c8a;
}

.stats-filter-arrow {
  margin-left: 12rpx;
  font-size: 20rpx;
  color: #99a4ae;
}

.panel-card {
  background: #ffffff;
  border: 1rpx solid #e4ecf4;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 36rpx rgba(23, 49, 78, 0.08);
  overflow: hidden;
}

.panel-card + .panel-card {
  margin-top: 20rpx;
}

.panel-header {
  min-height: 72rpx;
  padding: 0 30rpx;
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #edf3f8;
}

.panel-title {
  font-size: 20rpx;
  color: #6c7f94;
  letter-spacing: 1rpx;
  font-weight: 600;
}

.stats-panel {
  margin-bottom: 20rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22rpx;
  padding: 24rpx 30rpx 30rpx;
}

.stat-card {
  position: relative;
  min-height: 150rpx;
  border: 1rpx solid #eaf0f7;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  padding: 24rpx 24rpx 24rpx 28rpx;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.stat-accent {
  position: absolute;
  left: 0;
  top: 0;
  width: 8rpx;
  height: 100%;
  border-radius: 0 8rpx 8rpx 0;
}

.stat-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.stat-icon {
  color: #ffffff;
  font-size: 24rpx;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 42rpx;
  line-height: 1.1;
  color: #19324a;
  font-weight: 700;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 18rpx;
  color: #8a9aae;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22rpx;
  margin-bottom: 22rpx;
}

.chart-panel {
  min-width: 0;
}

.echart-container {
  width: 100%;
  height: 360rpx;
  padding: 10rpx 18rpx 18rpx;
  box-sizing: border-box;
}

.menu-panel {
  margin-bottom: 10rpx;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18rpx;
  padding: 24rpx 30rpx 30rpx;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 150rpx;
  border: 1rpx solid #eaf0f7;
  border-radius: 22rpx;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
}

.menu-icon {
  position: relative;
  width: 70rpx;
  height: 70rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-icon-text {
  color: #ffffff;
  font-size: 28rpx;
}

.badge-dot {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #de5b5b;
  border: 3rpx solid #ffffff;
}

.menu-name {
  margin-top: 16rpx;
  font-size: 16rpx;
  color: #5c7187;
}
</style>
