<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="section-header">
      <text class="section-title">全部公告</text>
    </view>

    <!-- 公告列表 -->
    <view class="notice-list">
      <view
        v-for="item in notices"
        :key="item.id"
        class="notice-item"
        @tap="openNoticeDetail(item)"
      >
        <view class="notice-main">
          <text
            class="notice-title"
            :class="{ unread: item.readFlag === 0 }"
          >
            {{ item.title }}
          </text>

          <text class="notice-time">{{ item.time }}</text>
        </view>

        <text class="notice-tag">{{ item.tag }}</text>
      </view>
    </view>
  </view>
</template>
<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      notices: []
    }
  },

  onShow() {
    this.loadNotices()
  },

  methods: {
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
            pageSize: 100
          }
        })

        const records = data.records || []

        this.notices = records.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          publishTime: item.publishTime,
          readFlag: item.readFlag,
          time: this.formatTime(item.publishTime),
          tag: this.getTag(item.targetType)
        }))

        console.log("【DEBUG】全部公告 =", this.notices)

      } catch (err) {
        console.error("加载全部公告失败", err)
      }
    },

    async openNoticeDetail(item) {
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

      uni.navigateTo({
        url: `/pages/notice/detail?notice=${encodeURIComponent(
          JSON.stringify(item)
        )}`
      })
    },

    formatTime(str) {
      if (!str) return ""
      const date = new Date(str.replace(" ", "T"))
      if (isNaN(date.getTime())) return ""
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`
    },

    getTag(type) {
      switch (type) {
        case "ALL": return "通知"
        case "COMMUNITY": return "小区"
        case "BUILDING": return "楼栋"
        default: return "公告"
      }
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

/* 标题 */
.section-header {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2430;
}

/* 列表 */
.notice-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 单条公告（卡片感） */
.notice-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx;
  background: #ffffff;
  border-radius: 24rpx;
}

/* 左侧内容 */
.notice-main {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  flex: 1;
  margin-right: 20rpx;
}

.notice-title {
  font-size: 28rpx;
  color: #1f2430;
  line-height: 1.4;
}

/* 未读样式（不刺眼） */
.notice-title.unread {
  font-weight: 600;
  color: #ff4d4f;
}

.notice-time {
  font-size: 24rpx;
  color: #a0a4ac;
}

/* 标签 */
.notice-tag {
  font-size: 22rpx;
  color: #2d81ff;
  background: rgba(45, 129, 255, 0.12);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  white-space: nowrap;
}
</style>
