<template>
  <view class="admin-layout">
    <view class="sidebar-fixed">
      <view class="sidebar-header">
        <view class="brand-row">
          <text class="brand-name">{{ appName }}</text>
          <text class="brand-version">{{ version }}</text>
        </view>
        <view class="header-tools">
          <view class="tool-chip">☰</view>
          <view class="tool-chip tool-chip-badge">
            <text>✉</text>
            <text class="chip-badge">23</text>
          </view>
          <view class="tool-chip tool-chip-badge">
            <text>⚠</text>
            <text class="chip-badge success">5</text>
          </view>
        </view>
      </view>

      <view class="menu-search" @click="showSearch">
        <text class="menu-search-icon">⌕</text>
        <text class="menu-search-text">搜索内容</text>
      </view>

      <scroll-view class="menu-scroll" scroll-y>
        <view class="menu-section">
          <view class="menu-section-head">
            <text class="menu-section-title">工作台</text>
            <text class="menu-section-gear">⚙</text>
          </view>
          <view
            v-for="(menu, index) in filteredMenuList"
            :key="index"
            class="menu-item"
            :class="{ 'menu-item-active': currentPage === menu.path }"
            @click="handleMenuClick(menu)"
          >
            <text class="menu-icon">{{ menu.icon }}</text>
            <text class="menu-text">{{ menu.text }}</text>
            <view v-if="menu.badge && menu.badge > 0" class="menu-badge">
              {{ menu.badge > 99 ? '99+' : menu.badge }}
            </view>
            <text v-else class="menu-dot">•</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="main-content">
      <view class="top-navbar">
        <view class="nav-left">
          <view class="nav-chip">
            <text class="nav-chip-icon">📅</text>
            <text class="nav-chip-text">{{ currentDate }}</text>
          </view>
          <view class="nav-chip">
            <text class="nav-chip-icon">🕒</text>
            <text class="nav-chip-text">{{ currentTime }}</text>
          </view>
          <view class="nav-chip nav-chip-wide">
            <text class="nav-chip-icon">☼</text>
            <text class="nav-chip-text">{{ weather }}</text>
          </view>
        </view>

        <view class="nav-right">
          <view class="user-avatar" @click="showUserMenu">
            <text class="avatar-text">{{ userInitial }}</text>
          </view>
          <view class="user-block" @click="showUserMenu">
            <text class="user-greet">Hi, {{ userName }}</text>
            <text class="user-role">{{ userRoleLabel }}</text>
          </view>
          <view class="nav-action" @click="showUserMenu">
            <text class="nav-action-text">设置</text>
          </view>
          <view class="nav-action nav-action-square" @click="handleLogout">
            <text class="nav-action-text">⎋</text>
          </view>
        </view>
      </view>

      <view v-if="showPageBanner" class="page-banner">
        <view class="page-banner-left">
          <view class="banner-fold"></view>
          <view>
            <text class="banner-title">{{ pageTitle }}</text>
            <text class="banner-breadcrumb">{{ pageBreadcrumb }}</text>
          </view>
        </view>
        <view class="page-banner-right">
          <text class="welcome-icon">ℹ</text>
          <text class="welcome-text">欢迎回来，{{ userName }}。上次登录时间 {{ lastSignIn }}</text>
        </view>
      </view>

      <view class="page-toolbar">
        <view class="toolbar-left">
          <text class="toolbar-home">⌂</text>
          <text class="toolbar-breadcrumb">{{ pageBreadcrumb }}</text>
        </view>
        <view class="toolbar-search" @click="showSearch">
          <text class="toolbar-search-text">搜索记录...</text>
        </view>
      </view>

      <scroll-view class="page-content-scroll" scroll-y>
        <view class="page-content">
          <slot></slot>
        </view>
      </scroll-view>
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
    },
    pageBreadcrumb: {
      type: String,
      default: 'Home > Dashboard'
    },
    showPageBanner: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      appName: '智慧社区',
      version: '物业运营后台',
      userName: '管理员',
      userInitial: 'A',
      userRoleLabel: '管理员',
      currentDate: '',
      currentTime: '',
      weather: '多云 26°C 12km/h',
      lastSignIn: '昨天 16:54',
      menuList: [
        { text: '仪表盘', icon: '◫', path: '/admin/pages/admin/dashboard/index', roles: ['admin', 'super_admin'] },
        { text: '任务中心', icon: '⌘', path: '/admin/pages/admin/worker-tasks', roles: ['worker'] },
        { text: '报修管理', icon: '⌂', path: '/admin/pages/admin/repair-manage', roles: ['admin', 'super_admin'], badge: 0 },
        { text: '工单管理', icon: '▣', path: '/admin/pages/admin/work-order-manage', roles: ['admin', 'super_admin'], badge: 0 },
        { text: '公告管理', icon: '✉', path: '/admin/pages/admin/notice-manage', roles: ['admin', 'super_admin'] },
        { text: '费用管理', icon: '¥', path: '/admin/pages/admin/fee-manage', roles: ['admin', 'super_admin'] },
        { text: '投诉处理', icon: '☏', path: '/admin/pages/admin/complaint-manage', roles: ['admin', 'super_admin'], badge: 0 },
        { text: '访客审核', icon: '◉', path: '/admin/pages/admin/visitor-manage', roles: ['admin', 'super_admin'], badge: 0 },
        { text: '注册审核', icon: '✓', path: '/admin/pages/admin/register-review', roles: ['super_admin'] },
        { text: '房屋绑定审核', icon: '⌂', path: '/admin/pages/admin/house-bind-review', roles: ['admin', 'super_admin'] },
        { text: '社区活动', icon: '✦', path: '/admin/pages/admin/activity-manage', roles: ['admin', 'super_admin'] },
        { text: '停车管理', icon: '▤', path: '/admin/pages/admin/parking-manage', roles: ['admin', 'super_admin'] },
        { text: '用户管理', icon: '☺', path: '/admin/pages/admin/user-manage', roles: ['admin', 'super_admin'] },
        { text: '操作日志', icon: '≣', path: '/admin/pages/admin/oper-log', roles: ['super_admin'] },
        { text: '系统配置', icon: '⚙', path: '/admin/pages/admin/system-config', roles: ['super_admin'] }
      ],
      timer: null
    }
  },
  computed: {
    filteredMenuList() {
      const userInfo = uni.getStorageSync('userInfo')
      const role = userInfo ? userInfo.role : ''

      return this.menuList.filter(item => {
        if (!item.roles) return true
        return item.roles.includes(role)
      })
    }
  },
  mounted() {
    this.initUserInfo()
    this.updateDateTime()
    this.timer = setInterval(() => {
      this.updateDateTime()
    }, 1000)
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  },
  methods: {
    initUserInfo() {
      const userInfo = uni.getStorageSync('userInfo')
      if (userInfo && userInfo.username) {
        this.userName = userInfo.username
        this.userInitial = userInfo.username.charAt(0).toUpperCase()
      }

      if (userInfo && userInfo.role) {
        const roleMap = {
          super_admin: '超级管理员',
          admin: '管理员',
          worker: '维修人员'
        }
        this.userRoleLabel = roleMap[userInfo.role] || '管理员'
      }
    },
    updateDateTime() {
      const now = new Date()
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      const day = days[now.getDay()]
      const date = now.getDate()
      const month = months[now.getMonth()]
      const year = now.getFullYear()
      this.currentDate = `${day}, ${date} ${month} ${year}`

      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      this.currentTime = `${hours}:${minutes}:${seconds}`
    },
    handleMenuClick(menu) {
      if (this.currentPage === menu.path) return

      uni.navigateTo({
        url: menu.path,
        fail: () => {
          uni.switchTab({
            url: menu.path
          })
        }
      })
    },
    showSearch() {
      uni.showToast({ title: '搜索功能开发中', icon: 'none' })
    },
    showUserMenu() {
      uni.showActionSheet({
        itemList: ['个人信息', '修改密码', '退出登录'],
        success: (res) => {
          if (res.tapIndex === 2) {
            this.handleLogout()
          }
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
            uni.reLaunch({ url: '/owner/pages/login/login' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4fa 100%);
}

.sidebar-fixed {
  width: 250rpx;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24rpx 16rpx 20rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #102a43 0%, #183b5b 100%);
}

.sidebar-header {
  padding: 4rpx 10rpx 24rpx;
}

.brand-row {
  display: block;
  margin-bottom: 24rpx;
}

.brand-name {
  display: block;
  font-size: 34rpx;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.brand-version {
  display: block;
  margin-top: 8rpx;
  font-size: 16rpx;
  color: #86a3c4;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.tool-chip {
  width: 42rpx;
  height: 42rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 24rpx;
}

.tool-chip-badge .chip-badge {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  min-width: 24rpx;
  height: 24rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  background: #ef5350;
  color: #fff;
  font-size: 16rpx;
  line-height: 24rpx;
  text-align: center;
}

.tool-chip-badge .chip-badge.success {
  background: #4dbf74;
}

.menu-search {
  height: 58rpx;
  border-radius: 14rpx;
  background: #21476a;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  color: #aac4e3;
  margin: 0 12rpx 24rpx;
}

.menu-search-icon {
  font-size: 24rpx;
}

.menu-search-text {
  margin-left: 14rpx;
  font-size: 24rpx;
}

.menu-scroll {
  flex: 1;
}

.menu-section {
  padding: 0 8rpx 18rpx;
}

.menu-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
  padding: 0 10rpx;
}

.menu-section-title {
  color: #87a3c2;
  font-size: 13rpx;
  letter-spacing: 1.6rpx;
}

.menu-section-gear {
  color: #87a3c2;
  font-size: 26rpx;
}

.menu-item {
  min-height: 58rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  border-radius: 18rpx;
  color: #d6e3f3;
  position: relative;
  border: 1rpx solid transparent;
}

.menu-item + .menu-item {
  margin-top: 10rpx;
}

.menu-item-active {
  background: #f2f7ff;
  border-color: #d9e7fb;
}

.menu-icon {
  width: 34rpx;
  text-align: center;
  font-size: 24rpx;
}

.menu-text {
  flex: 1;
  margin-left: 16rpx;
  font-size: 19rpx;
  color: inherit;
}

.menu-item-active .menu-text,
.menu-item-active .menu-icon,
.menu-item-active .menu-dot {
  color: #14324d;
  font-weight: 700;
}

.menu-badge {
  min-width: 40rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: #2c74ff;
  color: #fff;
  font-size: 20rpx;
  text-align: center;
}

.menu-dot {
  color: #6f97bf;
  font-size: 30rpx;
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.top-navbar {
  min-height: 88rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1rpx solid #e8eef6;
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
}

.nav-left {
  gap: 14rpx;
  flex: 1;
}

.nav-right {
  gap: 14rpx;
  margin-left: 20rpx;
}

.nav-chip {
  min-height: 42rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #f3f7fb;
  border: 1rpx solid #e3ebf5;
  display: flex;
  align-items: center;
}

.nav-chip-wide {
  max-width: 340rpx;
}

.nav-chip-icon {
  font-size: 20rpx;
  color: #7990a7;
}

.nav-chip-text {
  margin-left: 10rpx;
  font-size: 20rpx;
  color: #5f748b;
}

.user-avatar {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #cfe1ff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #b9d1f7;
}

.avatar-text {
  color: #24425f;
  font-size: 20rpx;
  font-weight: 700;
}

.user-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.user-greet {
  font-size: 18rpx;
  color: #24384e;
  font-weight: 600;
}

.user-role {
  font-size: 16rpx;
  color: #8ea1b6;
}

.nav-action {
  min-height: 42rpx;
  padding: 0 16rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f748b;
  background: #f3f7fb;
  border: 1rpx solid #e3ebf5;
}

.nav-action-square {
  width: 42rpx;
  padding: 0;
}

.nav-action-text {
  font-size: 18rpx;
}

.page-banner {
  min-height: 122rpx;
  margin: 22rpx 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1rpx solid #e7edf4;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 36rpx rgba(23, 49, 78, 0.08);
}

.page-banner-left {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
}

.banner-fold {
  display: none;
}

.banner-title {
  display: block;
  font-size: 40rpx;
  color: #19324a;
  font-weight: 700;
  line-height: 1.2;
}

.banner-breadcrumb {
  display: block;
  margin-top: 10rpx;
  font-size: 18rpx;
  color: #94a4b6;
}

.page-banner-right {
  width: 38%;
  min-width: 360rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 28rpx;
  color: #6e8195;
}

.welcome-icon {
  color: #2c74ff;
  font-size: 22rpx;
}

.welcome-text {
  margin-left: 10rpx;
  font-size: 18rpx;
}

.page-toolbar {
  min-height: 64rpx;
  margin: 0 32rpx;
  padding: 0 4rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-home {
  font-size: 18rpx;
  color: #90a2b4;
}

.toolbar-breadcrumb {
  margin-left: 12rpx;
  font-size: 16rpx;
  color: #98a9ba;
}

.toolbar-search {
  width: 250rpx;
  height: 44rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  border: 1rpx solid #dbe5ef;
  background: #ffffff;
  display: flex;
  align-items: center;
}

.toolbar-search-text {
  font-size: 22rpx;
  color: #9ca3ab;
}

.page-content-scroll {
  flex: 1;
  min-height: 0;
}

.page-content {
  min-height: 100%;
  padding: 0 32rpx 28rpx;
  box-sizing: border-box;
  background: transparent;
}

/deep/ .manage-container,
/deep/ .dashboard {
  padding-top: 0 !important;
  min-height: auto !important;
}

::-webkit-scrollbar {
  width: 8rpx;
  height: 8rpx;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.04);
}

::-webkit-scrollbar-thumb {
  background: rgba(120, 146, 176, 0.55);
  border-radius: 999rpx;
}
</style>
