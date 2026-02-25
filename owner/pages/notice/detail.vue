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
        <text>{{ notice.content }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      notice: null
    }
  },

  onLoad(options) {
    if (options.notice) {
      this.notice = JSON.parse(decodeURIComponent(options.notice))
      console.log("【DEBUG】公告详情 =", this.notice)
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
}

.title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1f2430;
  line-height: 1.4;
}

/* 时间 + 标签 */
.meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 12rpx;
}

.time {
  font-size: 24rpx;
  color: #a0a4ac;
}

.tag {
  font-size: 22rpx;
  color: #2d81ff;
  background: rgba(45, 129, 255, 0.12);
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
}

/* 内容 */
.content {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap; /* 关键：支持换行 */
}
</style>