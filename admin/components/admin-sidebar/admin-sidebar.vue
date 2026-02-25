<template>
  <view class="sidebar-container">
    <!-- 侧边栏遮罩 -->
    <view 
      class="sidebar-mask" 
      v-if="showSidebar" 
      @click="closeSidebar"
    ></view>
    
    <!-- 侧边栏主体 -->
    <view class="sidebar" :class="{ 'sidebar-open': showSidebar }">
      <!-- 管理员信息 -->
      <view class="admin-info">
        <view class="avatar">
          <text class="avatar-text">{{ adminName }}</text>
        </view>
        <text class="admin-role">{{ roleName }}</text>
      </view>
      
      <!-- 导航菜单 -->
      <view class="menu-list">
        <view 
          v-for="(menu, index) in menuList" 
          :key="index"
          class="menu-item"
          :class="{ 'active': currentPage === menu.path }"
          @click="handleMenuClick(menu)"
        >
          <text class="menu-icon">{{ menu.icon }}</text>
          <text class="menu-text">{{ menu.text }}</text>
        </view>
      </view>
      
      <!-- 退出登录 -->
      <view class="logout-section">
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </view>
    </view>
    
    <!-- 顶部导航栏 -->
    <view class="top-nav">
      <text class="nav-title">{{ pageTitle }}</text>
      <button class="menu-btn" @click="toggleSidebar">
        ☰
      </button>
    </view>
    
    <!-- 页面内容区域 -->
    <view class="slot-container">
      <slot></slot>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    showSidebar: {
      type: Boolean,
      default: false
    },
    pageTitle: {
      type: String,
      default: '管理员后台'
    },
    currentPage: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      adminName: '管理员',
      roleName: '管理员',
      menuList: [
        { text: '报修管理', icon: '🛠️', path: '/admin/pages/admin/repair-manage' },
        { text: '公告管理', icon: '📢', path: '/admin/pages/admin/notice-manage' },
        { text: '费用管理', icon: '💰', path: '/admin/pages/admin/fee-manage' },
        { text: '投诉处理', icon: '🗣️', path: '/admin/pages/admin/complaint-manage' },
        { text: '访客审核', icon: '👁️', path: '/admin/pages/admin/visitor-manage' },
        { text: '社区活动', icon: '🎉', path: '/admin/pages/admin/activity-manage' },
        { text: '停车管理', icon: '🚗', path: '/admin/pages/admin/parking-manage' },
        { text: '用户管理', icon: '👥', path: '/admin/pages/admin/user-manage' },
        { text: '社区管理', icon: '🏘️', path: '/admin/pages/admin/community-manage' }
      ]
    }
  },
  mounted() {
    const userInfo = uni.getStorageSync('userInfo')
    if (userInfo && userInfo.username) {
      this.adminName = userInfo.username
    }
    if (userInfo && userInfo.role === 'super_admin') {
      this.roleName = '超级管理员'
    } else {
      this.roleName = '普通管理员'
    }
  },
  methods: {
    toggleSidebar() {
      this.$emit('update:showSidebar', !this.showSidebar)
    },
    
    closeSidebar() {
      this.$emit('update:showSidebar', false)
    },
    
    handleMenuClick(menu) {
      uni.navigateTo({
        url: menu.path,
        success: () => {
          this.closeSidebar()
        }
      })
    },
    
    handleLogout() {
      uni.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            uni.removeStorageSync('token')
            uni.removeStorageSync('userInfo')
            uni.redirectTo({ url: '/owner/pages/login/login' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.slot-container {
  padding-top: 90rpx; /* 和 top-nav 高度一致 */
  height: 100%;
  box-sizing: border-box; /* 防止 padding 导致滚动异常 */
  background-color: #f5f5f5; /* 可以和 sidebar-container 一致 */
}

.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 90rpx;
  background-color: #2D81FF;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.nav-title {
  color: white;
  font-size: 36rpx;
  font-weight: bold;
}

.menu-btn {
  position: absolute;
  left: 30rpx;
  background: transparent;
  border: none;
  color: white;
  font-size: 48rpx;
  padding: 0;
  min-width: auto;
  line-height: normal;
}

.sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 101;
  transition: all 0.3s ease;
}

.sidebar {
  position: fixed;
  top: 0;
  left: -70%;
  width: 70%;
  height: 100vh;
  background-color: white;
  z-index: 102;
  transition: all 0.3s ease;
  overflow-y: auto;
}

.sidebar-open {
  left: 0;
}

.admin-info {
  padding: 40rpx 0;
  text-align: center;
  background-color: #2D81FF;
  color: white;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin: 0 auto 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 48rpx;
  font-weight: bold;
  color: white;
}

.admin-role {
  font-size: 28rpx;
  opacity: 0.9;
}

.menu-list {
  padding: 20rpx 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx 40rpx;
  transition: all 0.2s ease;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-item:active {
  background-color: #f5f5f5;
}

.menu-item.active {
  background-color: rgba(45, 129, 255, 0.1);
  color: #2D81FF;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
  width: 40rpx;
  text-align: center;
}

.menu-text {
  font-size: 32rpx;
  flex: 1;
}

.logout-section {
  padding: 40rpx;
  margin-top: 40rpx;
}

.logout-btn {
  width: 100%;
  background-color: #ff4757;
  color: white;
  border: none;
  border-radius: 20rpx;
  padding: 24rpx 0;
  font-size: 32rpx;
}

.slot-container {
  padding-top: 90rpx;
  height: 100%;
}
</style>
