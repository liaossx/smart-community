<template>
  <view class="page">
    <!-- 顶部欢迎卡片 -->
    <view class="hero-card">
      <view>
        <text class="hello">您好，{{ userInfo?.username || '访客' }}</text>
        <view class="sub">社区服务实时在线</view>
        <view class="user-role" v-if="userInfo">
          <text>{{ (userInfo.role === 'admin' || userInfo.role === 'super_admin') ? '管理员' : '业主' }}账号</text>
        </view>
      </view>

      <view class="status-badge" @tap="logout">
        <text>{{ userInfo ? '退出登录' : '登录' }}</text>
      </view>
    </view>

    <!-- 社区公告 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">社区公告</text>
    
        <!-- 将 text 改为 view 包裹，确保 @tap 生效 -->
        <view class="section-link" @tap="gotoNoticeList">
          <text>查看全部</text>
        </view>
      </view>
    
      <view class="notice-list">
        <view
          v-for="item in notices"
          :key="item.id"
          class="notice-item"
          @tap="openNoticeDetail(item)"
        >
          <view class="notice-main">
            <text class="notice-title">
              <text :style="{ fontWeight: item.readFlag === 0 ? '600' : '400', color: item.readFlag === 0 ? '#ff4d4f' : '#1f2430' }">
                {{ item.title }}
              </text>
            </text>
    
            <text class="notice-time">{{ item.time }}</text>
          </view>
    
          <text class="notice-tag">{{ item.tag }}</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">快捷入口</text>
      </view>

      <view class="entry-grid">
        <view
          v-for="entry in shortcuts"
          :key="entry.id"
          class="entry-item"
          @tap="jump(entry.path)"
        >
          <view class="entry-icon">{{ entry.icon }}</view>
          <text class="entry-title">{{ entry.title }}</text>
          <text class="entry-desc">{{ entry.desc }}</text>
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
      userInfo: null,
      notices: [],
      shortcuts: [
        {
          id: 1,
          title: "在线报修",
          desc: "2小时响应",
          icon: "修",
          path: "/owner/pages/repair/repair"
        },
        {
          id: 2,
          title: "快递代收",
          desc: "扫码取件",
          icon: "递",
          path: "/owner/pages/communityService/index"
        },
        {
          id: 3,
          title: "费用缴纳",
          desc: "在线支付",
          icon: "费",
          path: "/owner/pages/communityService/pay-fee"
        },
        {
          id: 4,
          title: "访客登记",
          desc: "通行凭证",
          icon: "访",
          path: "/owner/pages/communityService/visitor-apply"
        },
        {
          id: 5,
          title: "投诉建议",
          desc: "反馈问题",
          icon: "诉",
          path: "/owner/pages/communityService/complaint"
        },
        {
          id: 6,
          title: "社区活动",
          desc: "报名参与",
          icon: "活",
          path: "/owner/pages/communityService/activity-list"
        }
      ]
    }
  },

  onShow() {
    this.loadUser()
    this.loadNotices()
  },

  methods: {
    jump(url) {
      if (url) uni.navigateTo({ url })
    },

    gotoNoticeList() {
      uni.navigateTo({ 
        url: "/owner/pages/notice/list"
      })
    },
    openNoticeDetail(item) {
      uni.navigateTo({
        url: `/owner/pages/notice/detail?notice=${encodeURIComponent(JSON.stringify(item))}`
      })
    },

    /** 统一读取用户信息（使用 id 字段） */
    loadUser() {
      const u = uni.getStorageSync("userInfo")
      if (u && u.userId && !u.id) {
        // 自动修正旧数据
        u.id = u.userId
      }
      this.userInfo = u
    },

    /** 请求公告 */
   async loadNotices() {
     const user = uni.getStorageSync("userInfo")
   
     if (!user?.id) return
   
     try {
       const data = await request({
         url: "/api/notice/list",
         method: "GET",
         params: {
           userId: user.id,
           pageNum: 1,
           pageSize: 5
         }
       })
   
       const records = data.records || []
   
       this.notices = records.slice(0, 4).map(n => ({
         id: n.id,
         title: n.title,
         content: n.content,              // ✅ 关键
         publishTime: n.publishTime,      // ✅ 关键
         readFlag: n.readFlag,
         tag: this.getTag(n.targetType)
       }))
   
     } catch (err) {
       console.error("公告加载失败", err)
     }
   },
   
   
   
   async openNoticeDetail(item) {
     // 未读先标记已读
     if (item.readFlag === 0) {
       try {
         await request({
           url: `/api/notice/${item.id}/read`,
           method: "PUT"
         })
         item.readFlag = 1
         this.notices = [...this.notices]
       } catch (err) {
         console.error("标记已读失败", err)
       }
     }
   
     // 把完整公告对象传过去
     uni.navigateTo({
       url: `/owner/pages/notice/detail?notice=${encodeURIComponent(
         JSON.stringify(item)
       )}`
     })
   },


    /** 时间格式化 */
    formatTime(str) {
      if (!str) return ""
      if (str.includes(" ") && !str.includes("T")) {
        str = str.replace(" ", "T")
      }
      const date = new Date(str)
      if (isNaN(date.getTime())) return ""
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`
    },

    getTag(type) {
      switch (type) {
        case "ALL": return "通知"
        case "COMMUNITY": return "小区"
        case "BUILDING": return "楼栋"
        case "USER": return "提醒"
        default: return "公告"
      }
    },

    logout() {
      uni.removeStorageSync("userInfo")
      uni.removeStorageSync("token")
      this.userInfo = null
      uni.redirectTo({ url: "/owner/pages/login/login" })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 32rpx 28rpx 120rpx;
  background: #f5f6fa;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #5ba8ff, #386bff);
  color: #fff;
  margin-bottom: 32rpx;
}

.hello {
  font-size: 36rpx;
  font-weight: 600;
}

.sub {
  opacity: 0.9;
  font-size: 26rpx;
  margin-top: 8rpx;
}

.user-role {
  font-size: 22rpx;
  opacity: 0.8;
  margin-top: 4rpx;
}

.status-badge {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.15);
  font-size: 26rpx;
}

.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.section-link {
  font-size: 26rpx;
  color: #2d81ff;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.notice-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.notice-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.notice-time {
  font-size: 24rpx;
  color: #a0a4ac;
}

.notice-tag {
  font-size: 24rpx;
  color: #2d81ff;
  background: rgba(45, 129, 255, 0.12);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.entry-item {
  border-radius: 24rpx;
  padding: 24rpx;
  background: #f6f8ff;
}

.entry-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: #2d81ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  margin-bottom: 16rpx;
}

.entry-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.entry-desc {
  font-size: 24rpx;
  color: #7a7e8a;
}
</style>