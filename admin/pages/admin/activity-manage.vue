<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="社区活动"
    currentPage="/admin/pages/admin/activity-manage"
  >
    <view class="manage-container">
      <!-- 操作栏 -->
      <view class="action-bar">
        <button class="create-btn" @click="handleCreate">发布新活动</button>
      </view>

      <!-- 活动列表 -->
      <view class="list-container">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-else-if="activityList.length > 0" class="activity-list">
          <view v-for="item in activityList" :key="item.id" class="activity-item">
            <image :src="item.cover || '/static/default-cover.png'" mode="aspectFill" class="cover-img"></image>
            <view class="item-content">
              <view class="item-header">
                <text class="item-title">{{ item.title }}</text>
                <text class="status-tag" :class="getStatusClass(item.status)">
                  {{ getStatusText(item.status) }}
                </text>
              </view>
              <view class="item-info">
                <text class="time">时间：{{ formatTime(item.startTime) }}</text>
                <text class="location">地点：{{ item.location }}</text>
                <text class="signup-count">报名人数：{{ item.signupCount }}/{{ item.maxCount || '不限' }}</text>
              </view>
              <view class="item-footer">
                <button class="mini-btn" @click="handleEdit(item)">编辑</button>
                <button class="mini-btn" @click="handleViewSignups(item)">报名管理</button>
                <button class="mini-btn delete" @click="handleDelete(item)">删除</button>
              </view>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text>暂无活动</text>
        </view>
      </view>
    </view>
  </admin-sidebar>
</template>

<script>
import request from '@/utils/request'
import adminSidebar from '@/admin/components/admin-sidebar/admin-sidebar'

export default {
  components: {
    adminSidebar
  },
  data() {
    return {
      showSidebar: false,
      loading: false,
      activityList: []
    }
  },
  onShow() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const params = {
          keyword: this.searchQuery || undefined
        }
        
        // 调用后端接口
        const data = await request('/api/activity/list', { params }, 'GET')
        const list = data.records || data || [] // 兼容分页或列表
        
        this.activityList = list.map(item => ({
          id: item.id,
          title: item.title,
          startTime: item.startTime,
          location: item.location,
          signupCount: item.signupCount || 0,
          maxCount: item.maxCount,
          status: item.status, // 直接使用后端返回的 status (PUBLISHED/DRAFT/ONLINE等)
          cover: item.cover || '/static/default-cover.png'
        }))
      } catch (e) {
        console.error('加载活动列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    // 移除 getStatus 方法，直接使用后端 status 字段映射样式和文本
    
    handleCreate() {
      uni.navigateTo({ url: '/admin/pages/admin/activity-edit' })
    },
    
    handleEdit(item) {
      uni.navigateTo({ url: `/admin/pages/admin/activity-edit?id=${item.id}` })
    },
    
    handleViewSignups(item) {
      uni.navigateTo({ url: `/admin/pages/admin/activity-signups?id=${item.id}` })
    },
    
    handleDelete(item) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除该活动吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await request(`/api/activity/${item.id}`, {}, 'DELETE')
              this.activityList = this.activityList.filter(i => i.id !== item.id)
              uni.showToast({ title: '删除成功', icon: 'success' })
            } catch (e) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },
    
    getStatusClass(status) {
      const map = {
        'PUBLISHED': 'status-published',
        'DRAFT': 'status-draft',
        'ONLINE': 'status-online',
        'ENDED': 'status-ended'
      }
      return map[status] || 'status-default'
    },
    
    getStatusText(status) {
      const map = {
        'PUBLISHED': '已发布',
        'DRAFT': '草稿',
        'ONLINE': '报名中', // 或进行中
        'ENDED': '已结束'
      }
      return map[status] || status
    },
    
    formatTime(time) {
      return time
    }
  }
}
</script>

<style scoped>
.manage-container {
  padding: 30rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.action-bar {
  margin-bottom: 30rpx;
}

.create-btn {
  background: #2D81FF;
  color: white;
  border-radius: 40rpx;
  font-size: 30rpx;
}

.activity-item {
  background: white;
  border-radius: 15rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.cover-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 10rpx;
  background: #eee;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.item-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  margin-right: 10rpx;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  white-space: nowrap;
}

.status-published { background: #e6f7ff; color: #1890ff; } /* 蓝色 */
.status-online { background: #f6ffed; color: #52c41a; } /* 绿色 */
.status-draft { background: #fff7e6; color: #fa8c16; } /* 橙色 */
.status-ended { background: #f5f5f5; color: #999; } /* 灰色 */
.status-default { background: #f0f0f0; color: #666; }

.item-info {
  font-size: 24rpx;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  margin: 10rpx 0;
}

.item-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15rpx;
}

.mini-btn {
  font-size: 24rpx;
  padding: 6rpx 20rpx;
  margin: 0;
  background: #f0f2f5;
  color: #666;
  border-radius: 20rpx;
}

.mini-btn.delete {
  color: #ff4757;
  background: #fff0f0;
}
</style>