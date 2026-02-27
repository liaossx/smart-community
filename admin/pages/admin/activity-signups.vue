<template>
  <view class="container">
    <view class="header">
      <view class="title">报名列表</view>
      <view class="subtitle">共 {{ total }} 人报名</view>
    </view>
    
    <view class="list-container">
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="list.length > 0" class="signup-list">
        <view v-for="(item, index) in list" :key="item.id" class="signup-item">
          <view class="item-left">
            <text class="index">{{ index + 1 }}</text>
            <view class="user-info">
              <text class="name">{{ item.userName || '未知用户' }}</text>
              <text class="phone">{{ item.userPhone || '暂无电话' }}</text>
            </view>
          </view>
          <view class="item-right">
            <text class="time">{{ formatTime(item.signupTime) }}</text>
            <text class="status">{{ item.status === 'CANCELLED' ? '已取消' : '已报名' }}</text>
          </view>
        </view>
      </view>
      
      <view v-else class="empty-state">
        <text>暂无报名记录</text>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      activityId: null,
      list: [],
      total: 0,
      loading: false,
      pageNum: 1,
      pageSize: 20,
      hasMore: true
    }
  },
  onLoad(options) {
    if (options.id) {
      this.activityId = options.id
      this.loadData()
    }
  },
  onPullDownRefresh() {
    this.pageNum = 1
    this.hasMore = true
    this.loadData().then(() => {
      uni.stopPullDownRefresh()
    })
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.pageNum++
      this.loadData()
    }
  },
  methods: {
    async loadData() {
      if (this.loading) return
      this.loading = true
      
      try {
        const res = await request('/api/activity/signup/list', {
          params: {
            activityId: this.activityId,
            pageNum: this.pageNum,
            pageSize: this.pageSize
          }
        }, 'GET')
        
        const records = res.records || []
        this.total = res.total || 0
        
        if (this.pageNum === 1) {
          this.list = records
        } else {
          this.list = [...this.list, ...records]
        }
        
        this.hasMore = records.length === this.pageSize
      } catch (e) {
        console.error('加载报名列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    formatTime(time) {
      if (!time) return ''
      return time.replace('T', ' ')
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 30rpx;
}

.header {
  margin-bottom: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.subtitle {
  font-size: 24rpx;
  color: #666;
}

.signup-item {
  background: white;
  padding: 30rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.index {
  font-size: 28rpx;
  color: #999;
  width: 40rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.phone {
  font-size: 24rpx;
  color: #666;
}

.item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.status {
  font-size: 24rpx;
  color: #52c41a;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.loading-state {
  text-align: center;
  padding: 30rpx;
  color: #999;
}
</style>