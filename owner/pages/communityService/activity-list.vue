<template>
  <view class="container">
    <view class="activity-list">
      <view class="activity-item" v-for="item in activities" :key="item.id">
        <image :src="item.cover" mode="aspectFill" class="cover-img"></image>
        <view class="content">
          <text class="title">{{ item.title }}</text>
          <text class="time">时间：{{ formatTime(item.time) }}</text>
          <text class="location">地点：{{ item.location }}</text>
          <text class="signup-count">报名：{{ item.signupCount }}/{{ item.maxCount || '不限' }}</text>
          <text class="status-tag" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</text>
        </view>
        <button class="join-btn" @click="handleJoin(item)" :disabled="item.status !== 'ONLINE' && item.status !== 'PUBLISHED'">
          {{ getBtnText(item.status) }}
        </button>
      </view>
      
      <view v-if="activities.length === 0" class="empty-state">
        <text>暂无社区活动</text>
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
  onShow() {
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        // 使用 POST + 查询参数获取列表 (与管理端保持一致或使用业主端专属接口)
        // 假设业主端接口也复用 /api/activity/list 或者 /api/activity/my
        // 这里尝试使用 /api/activity/list，并加上 status=PUBLISHED (只看已发布的)
        // 如果后端接口是公开的，GET /api/activity/list 应该没问题
        const res = await request('/api/activity/list', { status: 'PUBLISHED' }, 'GET')
        const list = res.records || res || []
        
        this.activities = list.map(item => ({
          id: item.id,
          title: item.title,
          time: item.startTime,
          location: item.location,
          status: item.status, // PUBLISHED/ONLINE/ENDED
          signupCount: item.signupCount || 0,
          maxCount: item.maxCount,
          cover: item.cover || '/static/default-cover.png'
        }))
      } catch (e) {
        console.error('获取活动列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    
    getStatusClass(status) {
      const map = {
        'PUBLISHED': 'status-published',
        'ONLINE': 'status-online',
        'ENDED': 'status-ended'
      }
      return map[status] || 'status-default'
    },
    
    getStatusText(status) {
      const map = {
        'PUBLISHED': '报名中',
        'ONLINE': '进行中',
        'ENDED': '已结束'
      }
      return map[status] || status
    },
    
    getBtnText(status) {
      if (status === 'ENDED') return '活动已结束'
      if (status === 'ONLINE') return '立即报名'
      if (status === 'PUBLISHED') return '立即报名'
      return '查看详情'
    },
    
    formatTime(time) {
      if (!time) return ''
      return time.replace('T', ' ')
    },
    
    handleJoin(item) {
      if (item.status === 'ENDED') return
      
      uni.showModal({
        title: '确认报名',
        content: `确认报名参加 ${item.title} 吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              uni.showLoading({ title: '报名中...' })
              const userInfo = uni.getStorageSync('userInfo')
              console.log('当前用户信息:', userInfo)
              console.log('准备报名活动:', item)
              
              // 调用报名接口
              // 后端要求：POST /join，参数必须拼接在URL上（Query Param）
              // 例如：/api/activity/join?activityId=22&userId=5
              // 注意：request工具的第二个参数如果是对象，默认会放入Body（对于POST），
              // 所以我们需要手动拼接URL，或者让request工具支持Query Param
              
              const targetUrl = `/api/activity/join?activityId=${item.id}&userId=${userInfo.id || userInfo.userId}`;
              
              await request(targetUrl, {}, 'POST')
              
              uni.hideLoading()
              uni.showToast({ title: '报名成功', icon: 'success' })
              this.loadData() // 刷新列表
            } catch (e) {
              uni.hideLoading()
              uni.showToast({ title: e.message || '报名失败', icon: 'none' })
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
.time, .location, .signup-count {
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
.status-published { background: #e6f7ff; color: #1890ff; }
.status-online { background: #f6ffed; color: #52c41a; }
.status-ended { background: #f5f5f5; color: #999; }

.join-btn {
  margin: 20rpx;
  background: #2D81FF;
  color: white;
  border-radius: 40rpx;
  font-size: 28rpx;
}
.join-btn[disabled] {
  background: #ccc;
  color: #fff;
}
.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}
</style>
