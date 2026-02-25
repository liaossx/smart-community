<template>
  <view class="container">
    <view class="activity-list">
      <view class="activity-item" v-for="item in activities" :key="item.id">
        <image :src="item.cover" mode="aspectFill" class="cover-img"></image>
        <view class="content">
          <text class="title">{{ item.title }}</text>
          <text class="time">{{ item.time }}</text>
          <text class="location">{{ item.location }}</text>
          <text class="status-tag" :class="item.status">{{ item.statusText }}</text>
        </view>
        <button class="join-btn" @click="handleJoin(item)">立即报名</button>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      activities: []
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        const res = await request('/api/activity/list', 'GET')
        const list = res || []
        this.activities = list.map(item => ({
          id: item.id,
          title: item.title,
          time: item.startTime,
          location: item.location,
          status: this.getStatus(item),
          statusText: this.getStatusText(item),
          cover: item.cover || '/static/default-cover.png'
        }))
      } catch (e) {
        console.error('获取活动列表失败', e)
      }
    },
    getStatus(item) {
      const now = new Date()
      const start = new Date(item.startTime)
      if (now < start) return 'upcoming'
      if (item.status === 'ended') return 'ended' // 假设后端有status字段
      return 'active'
    },
    getStatusText(item) {
      const status = this.getStatus(item)
      const map = {
        'upcoming': '即将开始',
        'active': '报名中',
        'ended': '已结束'
      }
      return map[status]
    },
    handleJoin(item) {
      uni.showModal({
        title: '确认报名',
        content: `确认报名参加 ${item.title} 吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              uni.showLoading({ title: '报名中...' })
              const userInfo = uni.getStorageSync('userInfo')
              
              await request('/api/activity/join', {
                userId: userInfo?.id || userInfo?.userId,
                activityId: item.id
              }, 'POST')
              
              uni.hideLoading()
              uni.showToast({ title: '报名成功', icon: 'success' })
              this.loadData()
            } catch (e) {
              uni.hideLoading()
              uni.showToast({ title: '报名失败', icon: 'none' })
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.container {
  padding: 30rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}
.activity-item {
  background: white;
  border-radius: 15rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}
.cover-img {
  width: 100%;
  height: 300rpx;
  background: #eee;
}
.content {
  padding: 20rpx;
  position: relative;
}
.title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}
.time, .location {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 6rpx;
}
.status-tag {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.status-tag.active {
  background: #e6f7ff;
  color: #1890ff;
}
.status-tag.upcoming {
  background: #f6ffed;
  color: #52c41a;
}
.join-btn {
  margin: 20rpx;
  background: #2D81FF;
  color: white;
  border-radius: 40rpx;
  font-size: 28rpx;
}
</style>