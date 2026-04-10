<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="仪表盘"
    currentPage="/admin/pages/admin/dashboard/index"
  >
    <view class="dashboard">
      <!-- 顶部欢迎区 -->
      <view class="welcome-card">
        <view class="welcome-text">
          <text class="greeting">你好，{{ userInfo.name || userInfo.username || '管理员' }}</text>
          <text class="role-badge">系统管理员</text>
        </view>
        <view class="logout-btn" @click="handleLogout">
          <text>退出登录</text>
        </view>
      </view>

      <view class="stats-filter">
        <picker mode="selector" :range="monthOptions" range-key="label" @change="handleMonthChange">
          <view class="stats-filter-btn">
            <text class="stats-filter-text">{{ currentMonthLabel }}</text>
            <text class="stats-filter-arrow">▼</text>
          </view>
        </picker>
      </view>

      <!-- 数据概览 -->
      <view class="stats-grid">
        <view class="stat-card" v-for="(item, index) in stats" :key="index" :style="{ background: item.bg }">
          <view class="stat-icon">{{ item.icon }}</view>
          <view class="stat-info">
            <text class="stat-value">{{ item.value }}</text>
            <text class="stat-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 图表区域 -->
      <view class="charts-section">
        <text class="section-title">数据分析</text>
        <view class="charts-container">
          <!-- 报修趋势图 -->
          <view class="chart-box">
            <view class="chart-title">近七日报修趋势</view>
            <view id="repairChart" class="echart-container" :prop="repairTrend" :change:prop="echarts.updateRepairChart"></view>
          </view>
          
          <!-- 投诉分布图 -->
          <view class="chart-box">
            <view class="chart-title">投诉类型分布</view>
            <view id="complaintChart" class="echart-container" :prop="complaintType" :change:prop="echarts.updateComplaintChart"></view>
          </view>

          <!-- 新增：工单状态占比 -->
          <view class="chart-box full-width">
            <view class="chart-title">工单处理状态</view>
            <view id="workOrderChart" class="echart-container" :prop="workOrderStats" :change:prop="echarts.updateWorkOrderChart"></view>
          </view>

          <!-- 新增：报修与工单对比 -->
          <view class="chart-box full-width">
            <view class="chart-title">报修转工单对比</view>
            <view id="compareChart" class="echart-container" :prop="compareStats" :change:prop="echarts.updateCompareChart"></view>
          </view>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-section">
        <text class="section-title">常用功能</text>
        <view class="menu-grid">
          <view class="menu-item" v-for="(menu, index) in menus" :key="index" @click="navigateTo(menu.path)">
            <view class="menu-icon" :style="{ background: menu.color }">
              {{ menu.icon }}
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
      showSidebar: false,
      userInfo: {},
      stats: [
        { label: '小区总数', value: '-', icon: '🏢', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { label: '住户总数', value: '-', icon: '👥', bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)' },
        { label: '待办事项', value: '-', icon: '📝', bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
        { label: '今日报修', value: '-', icon: '🔧', bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }
      ],
      menus: [
        { name: '仪表盘', icon: '📊', color: '#4facfe', path: '/admin/pages/admin/dashboard/index' },
        { name: '报修管理', icon: '🛠️', color: '#a18cd1', path: '/admin/pages/admin/repair-manage', badgeKey: 'repair' },
        { name: '工单管理', icon: '📋', color: '#667eea', path: '/admin/pages/admin/work-order-manage', badgeKey: 'workorder' },
        { name: '公告管理', icon: '📢', color: '#ff9a9e', path: '/admin/pages/admin/notice-manage' },
        { name: '费用管理', icon: '�', color: '#f6d365', path: '/admin/pages/admin/fee-manage' },
        { name: '投诉处理', icon: '�️', color: '#fda085', path: '/admin/pages/admin/complaint-manage', badgeKey: 'complaint' },
        { name: '访客审核', icon: '�️', color: '#84fab0', path: '/admin/pages/admin/visitor-manage', badgeKey: 'visitor' },
        { name: '社区活动', icon: '🎉', color: '#ffecd2', path: '/admin/pages/admin/activity-manage' },
        { name: '停车管理', icon: '🚗', color: '#00f2fe', path: '/admin/pages/admin/parking-manage' },
        { name: '用户管理', icon: '�', color: '#a8e6cf', path: '/admin/pages/admin/user-manage' },
        { name: '系统配置', icon: '⚙️', color: '#b8c6ff', path: '/admin/pages/admin/system-config' }
      ],
      menuBadges: {},
      // 图表数据
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
      // 如果是维修员，直接重定向到任务中心
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
        
        // 1. 工单状态占比 (环形图)
        if (data.workorder) {
          this.workOrderStats = [
            { name: '待指派', value: data.workorder.pending || 0 },
            { name: '已指派', value: data.workorder.assigned || 0 },
            { name: '处理中', value: data.workorder.processing || 0 },
            { name: '已完成', value: data.workorder.completed || 0 }
          ]
        }
        
        // 2. 报修与工单对比 (柱状图)
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
        // 使用聚合统计接口，一次请求获取所有数据
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
            // 如果后端返回空，显示空趋势图
            const today = new Date();
            const dates = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const m = (d.getMonth() + 1).toString().padStart(2, '0');
                const day = d.getDate().toString().padStart(2, '0');
                dates.push(`${m}-${day}`);
            }
            
            this.repairTrend = dates.map(d => ({ date: d, count: 0 }));
          }
          
        if (data.complaintType && data.complaintType.length > 0) {
            // 尝试将英文类型映射为中文
            const typeMap = {
              'noise': '噪音扰民',
              'environment': '环境卫生',
              'env': '环境卫生',
              'sanitation': '环境卫生',
              'facility': '设施损坏',
              'repair': '设施损坏',
              'security': '安保问题',
              'safety': '安保问题',
              'other': '其他'
            }
            
            this.complaintType = data.complaintType.map(item => ({
              ...item,
              name: typeMap[item.name.toLowerCase()] || item.name
            }))
        } else {
            // 如果后端返回空数组，显示“暂无数据”
            this.complaintType = [
                { name: '暂无数据', value: 0, itemStyle: { color: '#e0e0e0' } }
            ]
        }
      } catch (e) {
        console.error('加载看板数据失败', e)
        // 接口调用失败时，显示 "-" 或者重试逻辑
      }
    },

    navigateTo(url) {
      uni.navigateTo({ url })
    },
    getMenuBadge(menu) {
      if (!menu || !menu.badgeKey) return 0
      return Number(this.menuBadges[menu.badgeKey] || 0)
    },
    handleLogout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            uni.clearStorageSync()
            uni.reLaunch({ url: '/owner/pages/login/login' })
          }
        }
      })
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
      // 缓存数据
      pendingRepairData: null,
      pendingComplaintData: null,
      pendingWorkOrderData: null,
      pendingCompareData: null
    }
  },
  mounted() {
    console.log('ECharts 模块已挂载')
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

      // 新增工单状态图
      const workOrderDom = document.getElementById('workOrderChart')
      if (workOrderDom) this.workOrderChart = window.echarts.init(workOrderDom)

      // 新增对比图
      const compareDom = document.getElementById('compareChart')
      if (compareDom) this.compareChart = window.echarts.init(compareDom)
      
      // 渲染缓存数据
      if (this.pendingRepairData) this.renderRepairChart(this.pendingRepairData)
      if (this.pendingComplaintData) this.renderComplaintChart(this.pendingComplaintData)
      if (this.pendingWorkOrderData) this.renderWorkOrderChart(this.pendingWorkOrderData)
      if (this.pendingCompareData) this.renderCompareChart(this.pendingCompareData)
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
        grid: { top: 30, bottom: 30, left: 40, right: 20, containLabel: true },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{ data: counts, type: 'line', smooth: true, areaStyle: { color: 'rgba(132, 250, 176, 0.3)' }, itemStyle: { color: '#84fab0' } }]
      })
    },
    
    updateComplaintChart(newValue) {
      this.pendingComplaintData = newValue
      if (this.complaintChart) this.renderComplaintChart(newValue)
    },

    renderComplaintChart(data) {
      if (!data || data.length === 0) return
      this.complaintChart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: '0%', left: 'center' },
        series: [{ type: 'pie', radius: ['40%', '70%'], data: data, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 } }]
      })
    },

    // 新增：工单状态占比渲染
    updateWorkOrderChart(newValue) {
      this.pendingWorkOrderData = newValue
      if (this.workOrderChart) this.renderWorkOrderChart(newValue)
    },

    renderWorkOrderChart(data) {
      if (!data || data.length === 0) return
      const option = {
        backgroundColor: '#1a1a2e', // 深色系风格
        title: { text: '工单状态分布', left: 'center', textStyle: { color: '#fff' } },
        tooltip: { trigger: 'item' },
        legend: { bottom: '5%', left: 'center', textStyle: { color: '#ccc' } },
        color: ['#4facfe', '#00f2fe', '#84fab0', '#a18cd1'],
        series: [{
          type: 'pie',
          radius: ['40%', '65%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 8, borderColor: '#1a1a2e', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: '18', fontWeight: 'bold', color: '#fff' } },
          data: data
        }]
      }
      this.workOrderChart.setOption(option)
    },

    // 新增：报修与工单对比图渲染
    updateCompareChart(newValue) {
      this.pendingCompareData = newValue
      if (this.compareChart) this.renderCompareChart(newValue)
    },

    renderCompareChart(data) {
      if (!data || !data.repair) return
      const option = {
        backgroundColor: '#1a1a2e', // 深色系风格
        title: { text: '报修与工单对比', left: 'center', textStyle: { color: '#fff' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: [{ type: 'category', data: ['总量对比'], axisLine: { lineStyle: { color: '#ccc' } } }],
        yAxis: [{ type: 'value', axisLine: { lineStyle: { color: '#ccc' } }, splitLine: { lineStyle: { color: '#333' } } }],
        series: [
          { name: '报修总数', type: 'bar', barWidth: '30%', data: [data.repair], itemStyle: { color: '#4facfe' } },
          { name: '已转工单', type: 'bar', barWidth: '30%', data: [data.workorder], itemStyle: { color: '#84fab0' } }
        ]
      }
      this.compareChart.setOption(option)
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
  padding-top: 100rpx;
}

.welcome-card {
  background: white;
  padding: 40rpx;
  border-radius: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
}

.stats-filter {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16rpx;
}

.stats-filter-btn {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.stats-filter-text {
  font-size: 24rpx;
  color: #333;
}

.stats-filter-arrow {
  margin-left: 10rpx;
  font-size: 22rpx;
  color: #999;
}

.welcome-text {
  display: flex;
  flex-direction: column;
}

.greeting {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.role-badge {
  font-size: 24rpx;
  color: #2D81FF;
  background: rgba(45, 129, 255, 0.1);
  padding: 4rpx 16rpx;
  border-radius: 10rpx;
  align-self: flex-start;
}

.logout-btn {
  background: #f5f5f5;
  padding: 12rpx 24rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.stat-card {
  padding: 30rpx;
  border-radius: 20rpx;
  color: white;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.stat-icon {
  font-size: 60rpx;
  margin-right: 20rpx;
  opacity: 0.8;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 40rpx;
  font-weight: bold;
}

.stat-label {
  font-size: 24rpx;
  opacity: 0.9;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
  border-left: 8rpx solid #2D81FF;
  padding-left: 16rpx;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  background: white;
  padding: 30rpx;
  border-radius: 20rpx;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}

.menu-icon {
  width: 90rpx;
  height: 90rpx;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-bottom: 16rpx;
  color: white;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.1);
  position: relative;
}

.badge-dot {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 18rpx;
  height: 18rpx;
  background: #ff3b30;
  border-radius: 50%;
  border: 3rpx solid #fff;
}

.menu-name {
  font-size: 26rpx;
  color: #666;
}

.charts-section {
  margin-bottom: 40rpx;
}

.charts-container {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}

.chart-box {
  flex: 1;
  min-width: 300rpx;
  background: white;
  padding: 30rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.05);
}

.chart-box.full-width {
  flex: none;
  width: 100%;
  box-sizing: border-box;
}

.chart-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  border-left: 6rpx solid #84fab0;
  padding-left: 16rpx;
}

.echart-container {
  width: 100%;
  height: 400rpx;
}
</style>
