<template>
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
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <text class="section-title">常用功能</text>
      <view class="menu-grid">
        <view class="menu-item" v-for="(menu, index) in menus" :key="index" @click="navigateTo(menu.path)">
          <view class="menu-icon" :style="{ background: menu.color }">{{ menu.icon }}</view>
          <text class="menu-name">{{ menu.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      userInfo: {},
      stats: [
        { label: '小区总数', value: '-', icon: '🏢', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { label: '住户总数', value: '-', icon: '👥', bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)' },
        { label: '待办事项', value: '-', icon: '📝', bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
        { label: '今日报修', value: '-', icon: '🔧', bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }
      ],
      menus: [
        { name: '用户管理', icon: '👤', color: '#4facfe', path: '/admin/pages/admin/user-manage' },
        { name: '社区管理', icon: '🏘️', color: '#00f2fe', path: '/admin/pages/admin/community-manage' },
        { name: '公告管理', icon: '📢', color: '#ff9a9e', path: '/admin/pages/admin/notice-manage' },
        { name: '报修管理', icon: '🛠️', color: '#a18cd1', path: '/admin/pages/admin/repair-manage' },
        { name: '缴费管理', icon: '💰', color: '#f6d365', path: '/admin/pages/admin/fee-manage' },
        { name: '投诉处理', icon: '💬', color: '#fda085', path: '/admin/pages/admin/complaint-manage' },
        { name: '访客审核', icon: '🚶', color: '#84fab0', path: '/admin/pages/admin/visitor-manage' },
        { name: '活动管理', icon: '🎉', color: '#ffecd2', path: '/admin/pages/admin/activity-manage' },
        { name: '操作日志', icon: '📝', color: '#a8e6cf', path: '/admin/pages/admin/oper-log' }
      ],
      // 图表数据
      repairTrend: [],
      complaintType: []
    }
  },
  onShow() {
    const userInfo = uni.getStorageSync('userInfo')
    if (userInfo) {
      this.userInfo = userInfo
      this.loadDashboardData()
    } else {
      uni.redirectTo({ url: '/owner/pages/login/login' })
    }
  },
  methods: {
    async loadDashboardData() {
      try {
        // 使用聚合统计接口，一次请求获取所有数据
        const data = await request('/api/admin/stats/overview', {}, 'GET')
        
        if (data) {
          // 1. 小区总数
          this.stats[0].value = data.community?.total || 0
          
          // 2. 住户总数
          this.stats[1].value = data.user?.owner || 0
          
          // 3. 待办事项 (投诉+报修+访客)
          const pendingTotal = (data.complaint?.pending || 0) + 
                             (data.repair?.pending || 0) + 
                             (data.visitor?.pending || 0)
          this.stats[2].value = pendingTotal
          
          // 4. 今日报修
          this.stats[3].value = data.repair?.today || 0
          
          // 5. 更新图表数据
          if (data.repairTrend && data.repairTrend.length > 0) {
            this.repairTrend = data.repairTrend
          } else {
            // 模拟数据：近七日报修趋势
            this.repairTrend = [
              { date: '03-01', count: 2 },
              { date: '03-02', count: 1 },
              { date: '03-03', count: 3 },
              { date: '03-04', count: 0 },
              { date: '03-05', count: 2 },
              { date: '03-06', count: 5 },
              { date: '03-07', count: 1 }
            ]
          }
          
          if (data.complaintType && data.complaintType.length > 0) {
            this.complaintType = data.complaintType
          } else {
            // 模拟数据：投诉类型分布
            this.complaintType = [
              { name: '噪音扰民', value: 5 },
              { name: '环境卫生', value: 3 },
              { name: '设施损坏', value: 4 },
              { name: '安保问题', value: 2 },
              { name: '其他', value: 1 }
            ]
          }
        }
      } catch (e) {
        console.error('加载看板数据失败', e)
        // 接口调用失败时，显示 "-" 或者重试逻辑
      }
    },

    navigateTo(url) {
      uni.navigateTo({ url })
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
      complaintChart: null
    }
  },
  mounted() {
    console.log('ECharts 模块已挂载')
    // 检查是否已经有 script 标签
    if (document.getElementById('echarts-script')) {
      console.log('ECharts 脚本已存在，等待加载完成')
      return
    }
    this.initCharts()
  },
  methods: {
    initCharts() {
      // 检查 echarts 是否已加载
      if (typeof window.echarts === 'object' || typeof window.echarts === 'function') {
        console.log('ECharts 全局对象已存在，直接初始化')
        this.initInstances()
        return
      }

      console.log('正在动态加载 ECharts 脚本...')
      const script = document.createElement('script')
      script.id = 'echarts-script'
      // 更换为 unpkg 源，兼容性更好
      script.src = 'https://unpkg.com/echarts@5.4.3/dist/echarts.min.js'
      
      script.onload = () => {
        console.log('ECharts 脚本加载成功')
        this.initInstances()
      }
      script.onerror = (e) => {
        console.error('ECharts 脚本加载失败', e)
        // 移除错误的 script 标签以便重试
        const badScript = document.getElementById('echarts-script')
        if (badScript) badScript.remove()
      }
      document.head.appendChild(script)
    },

    initInstances() {
      console.log('开始初始化图表实例...')
      
      // 初始化报修趋势图
      const repairDom = document.getElementById('repairChart')
      if (repairDom) {
        if (!this.repairChart) {
          try {
            this.repairChart = window.echarts.init(repairDom)
            console.log('报修图表初始化成功')
          } catch (e) {
            console.error('报修图表初始化异常', e)
          }
        }
        // 如果已经有数据，立即渲染
        if (this.repairTrend && this.repairTrend.length > 0) {
            console.log('初始化时立即渲染报修图表', this.repairTrend)
            this.updateRepairChart(this.repairTrend)
        }
      }
      
      // 初始化投诉分布图
      const complaintDom = document.getElementById('complaintChart')
      if (complaintDom) {
        if (!this.complaintChart) {
          try {
            this.complaintChart = window.echarts.init(complaintDom)
            console.log('投诉图表初始化成功')
          } catch (e) {
            console.error('投诉图表初始化异常', e)
          }
        }
        // 如果已经有数据，立即渲染
        if (this.complaintType && this.complaintType.length > 0) {
            console.log('初始化时立即渲染投诉图表', this.complaintType)
            this.updateComplaintChart(this.complaintType)
        }
      }
    },
    
    updateRepairChart(newValue, oldValue, ownerInstance, instance) {
      console.log('收到报修数据更新:', JSON.stringify(newValue))
      
      if (!this.repairChart) {
        // 如果图表实例不存在，可能是还没初始化，或者 DOM 还没准备好
        const repairDom = document.getElementById('repairChart')
        if (repairDom && window.echarts) {
             this.repairChart = window.echarts.init(repairDom)
        } else {
             // 还没准备好，放弃本次更新，等待 initInstances 里的逻辑
             return
        }
      }
      
      if (!newValue || newValue.length === 0) {
          console.warn('报修数据为空，清空图表')
          this.repairChart.clear()
          return
      }
      
      const dates = newValue.map(item => item.date)
      const counts = newValue.map(item => item.count)
      
      const option = {
        grid: {
          top: 30,
          bottom: 30,
          left: 40,
          right: 20,
          containLabel: true 
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: '#999' } }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
        },
        series: [{
          data: counts,
          type: 'line',
          smooth: true,
          areaStyle: {
            color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(132, 250, 176, 0.5)' },
              { offset: 1, color: 'rgba(132, 250, 176, 0.05)' }
            ])
          },
          itemStyle: {
            color: '#84fab0'
          },
          lineStyle: {
            width: 3
          }
        }]
      }
      this.repairChart.setOption(option)
    },
    
    updateComplaintChart(newValue, oldValue, ownerInstance, instance) {
      console.log('收到投诉数据更新:', JSON.stringify(newValue))

      if (!this.complaintChart) {
        const complaintDom = document.getElementById('complaintChart')
        if (complaintDom && window.echarts) {
             this.complaintChart = window.echarts.init(complaintDom)
        } else {
             return
        }
      }
      
      if (!newValue || newValue.length === 0) {
          console.warn('投诉数据为空，清空图表')
          this.complaintChart.clear()
          return
      }
      
      const option = {
        tooltip: {
          trigger: 'item'
        },
        legend: {
          bottom: '0%',
          left: 'center',
          icon: 'circle'
        },
        series: [
          {
            name: '投诉类型',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            data: newValue
          }
        ]
      }
      this.complaintChart.setOption(option)
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
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