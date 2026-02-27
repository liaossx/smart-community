<template>
  <view class="page" v-if="notice">
    <view class="card">
      <view class="header">
        <text class="title">{{ notice.title }}</text>

        <view class="meta">
          <text class="time">{{ notice.publishTime }}</text>
          <text class="tag">{{ notice.tag }}</text>
        </view>
      </view>

      <view class="content">
        <text class="text">{{ notice.content }}</text>
        
        <!-- 缴费快捷入口 -->
        <view class="action-area" v-if="isFeeNotice">
          <button class="pay-btn" @tap="gotoPay">立即缴费</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      notice: {}
    }
  },

  computed: {
    isFeeNotice() {
      if (!this.notice) return false
      const title = this.notice.title || ''
      const content = this.notice.content || ''
      // 判断逻辑：标题包含"缴费"或"催缴"，或者内容包含"物业费"
      return title.includes('缴费') || title.includes('催缴') || content.includes('物业费')
    }
  },

  onLoad(options) {
    if (options.notice) {
      try {
        this.notice = JSON.parse(decodeURIComponent(options.notice))
        console.log("【DEBUG】公告详情 =", this.notice)
      } catch (e) {
        console.error("解析公告失败", e)
      }
    }
  },

  methods: {
    gotoPay() {
      uni.navigateTo({
        url: '/owner/pages/communityService/pay-fee'
      })
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  padding: 32rpx 28rpx 120rpx;
  background: #f5f6fa;
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
}

/* 标题区 */
.header {
  margin-bottom: 28rpx;
  border-bottom: 1rpx solid #f0f0f0;
  padding-bottom: 20rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1f2430;
  line-height: 1.4;
  display: block;
  margin-bottom: 16rpx;
}

/* 时间 + 标签 */
.meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.time {
  font-size: 24rpx;
  color: #a0a4ac;
}

.tag {
  font-size: 22rpx;
  color: #2d81ff;
  background: rgba(45, 129, 255, 0.12);
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

/* 内容 */
.content {
  margin-top: 24rpx;
}

.text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
  display: block;
}

.action-area {
  margin-top: 60rpx;
  display: flex;
  justify-content: center;
}

.pay-btn {
  background: #2D81FF;
  color: white;
  font-size: 30rpx;
  padding: 0 60rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  box-shadow: 0 8rpx 20rpx rgba(45, 129, 255, 0.3);
}
</style>