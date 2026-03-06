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
        { name: '活动管理', icon: '🎉', color: '#ffecd2', path: '/admin/pages/admin/activity-manage' }
      ]
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
</style>