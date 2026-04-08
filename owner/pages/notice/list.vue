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
        const params = {
          userId: user.id,
          pageNum: 1,
          pageSize: 100
        }
        console.log("【NOTICE_DEBUG】请求公告列表 params =", params)
        const data = await request({
          url: "/api/notice/list",
          method: "GET",
          params
        })

        console.log("【NOTICE_DEBUG】公告列表原始响应 =", data)
        const records = Array.isArray(data && data.records) ? data.records : []
        console.log("【NOTICE_DEBUG】公告 records.length =", records.length)
        const readCacheRaw = uni.getStorageSync('noticeReadIds')
        const readCacheSet = new Set((Array.isArray(readCacheRaw) ? readCacheRaw : []).map(v => String(v)))

        const uid = String(user.id)
        const getTargetUserId = (item) => {
          return item?.targetUserId ??
            item?.target_user_id ??
            item?.target_userId ??
            item?.targetUserID ??
            item?.toUserId ??
            item?.to_user_id ??
            item?.userId ??
            item?.user_id ??
            null
        }
        const isUserTarget = (item) => {
          const t = item?.targetType ?? item?.target_type ?? ''
          return String(t).toUpperCase() === 'USER'
        }
        const userTypeItems = records.filter(isUserTarget)
        const mismatchUserTargets = userTypeItems.filter(item => {
          const t = getTargetUserId(item)
          if (t === null || t === undefined || t === '') return true
          return String(t) !== uid
        })
        console.log("【NOTICE_DEBUG】USER类型数量 =", userTypeItems.length)
        console.log("【NOTICE_DEBUG】USER类型 target_user 不匹配数量 =", mismatchUserTargets.length)
        console.log("【NOTICE_DEBUG】USER类型不匹配样本 =", mismatchUserTargets.slice(0, 5).map(item => ({
          id: item?.id,
          title: item?.title,
          targetType: item?.targetType ?? item?.target_type,
          targetUserId: getTargetUserId(item)
        })))

        const feeLike = records.filter(item => {
          const text = `${item?.title || ''}${item?.content || ''}${item?.type || ''}${item?.category || ''}`
          return /缴费|账单|物业费|水费|电费|燃气费|停车费/i.test(text)
        })
        console.log("【NOTICE_DEBUG】疑似缴费提醒数量 =", feeLike.length)
        console.log("【NOTICE_DEBUG】疑似缴费提醒样本 =", feeLike.slice(0, 5).map(item => ({
          id: item?.id,
          title: item?.title,
          targetType: item?.targetType ?? item?.target_type,
          targetUserId: getTargetUserId(item)
        })))

        this.notices = records.map(item => {
          const id = item?.id
          const readFlag = readCacheSet.has(String(id))
            ? 1
            : Number(item?.readFlag ?? item?.read_flag ?? 0)
          return {
            id,
            title: item.title,
            content: item.content,
            publishTime: item.publishTime,
            readFlag,
            time: this.formatTime(item.publishTime),
            tag: this.getTag(item.targetType)
          }
        })

        console.log("【DEBUG】全部公告 =", this.notices)

      } catch (err) {
        console.error("加载全部公告失败", err)
      }
    },

    async openNoticeDetail(item) {
      if (item.readFlag === 0) {
        try {
          const user = uni.getStorageSync('userInfo')
          const userId = user?.id || user?.userId
          await request({
            url: `/api/notice/${item.id}/read`,
            method: 'POST',
            params: userId ? { userId } : {}
          })
          const raw = uni.getStorageSync('noticeReadIds')
          const arr = Array.isArray(raw) ? raw.map(v => String(v)) : []
          const sid = String(item.id)
          if (!arr.includes(sid)) {
            arr.push(sid)
            uni.setStorageSync('noticeReadIds', arr)
          }
          item.readFlag = 1
          this.notices = [...this.notices]
        } catch (err) {
          console.error("标记已读失败", err)
        }
      }

      uni.navigateTo({
        url: `/owner/pages/notice/detail?notice=${encodeURIComponent(
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
        case "USER": return "提醒"
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
