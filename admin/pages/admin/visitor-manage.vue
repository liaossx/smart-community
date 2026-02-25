<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="访客审核"
    currentPage="/admin/pages/admin/visitor-manage"
  >
    <view class="manage-container">
      <!-- 搜索和筛选栏 -->
      <view class="search-filter-bar">
        <view class="search-box">
          <input 
            type="text"
            placeholder="搜索访客姓名、业主姓名"
            v-model="searchQuery"
            @confirm="handleSearch"
            class="search-input"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
        </view>
        
        <view class="filter-row">
          <picker 
            mode="selector"
            :range="statusOptions"
            :range-key="'label'"
            :value="statusOptions.findIndex(opt => opt.value === statusFilter)"
            @change="handleStatusChange"
            class="filter-picker"
          >
            <view class="filter-picker-text">
              {{ statusOptions.find(opt => opt.value === statusFilter)?.label || '全部状态' }}
            </view>
          </picker>
        </view>
      </view>

      <!-- 访客列表 -->
      <view class="list-container">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-else-if="visitorList.length > 0" class="visitor-list">
          <view v-for="item in visitorList" :key="item.id" class="visitor-item">
            <view class="item-header">
              <text class="item-title">{{ item.visitorName }} ({{ item.visitorPhone }})</text>
              <text class="status-tag" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
            </view>
            <view class="item-body">
              <view class="info-row">
                <text class="label">访问对象：</text>
                <text class="value">{{ item.ownerName }} ({{ item.buildingNo }}{{ item.houseNo }})</text>
              </view>
              <view class="info-row">
                <text class="label">访问时间：</text>
                <text class="value">{{ formatTime(item.visitTime) }}</text>
              </view>
              <view class="info-row">
                <text class="label">访问事由：</text>
                <text class="value">{{ item.reason }}</text>
              </view>
              <view class="info-row">
                <text class="label">车牌号：</text>
                <text class="value">{{ item.carNo || '无' }}</text>
              </view>
            </view>
            
            <view class="item-footer" v-if="item.status === 'pending'">
              <button class="action-btn reject" @click="handleReject(item)">拒绝</button>
              <button class="action-btn approve" @click="handleApprove(item)">通过</button>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text>暂无访客申请记录</text>
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
      searchQuery: '',
      statusFilter: '',
      loading: false,
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'pending', label: '待审核' },
        { value: 'approved', label: '已通过' },
        { value: 'rejected', label: '已拒绝' }
      ],
      visitorList: []
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const params = {
          keyword: this.searchQuery || undefined,
          status: this.statusFilter || undefined
        }
        
        // 调用后端接口
        const data = await request('/api/visitor/list', { params }, 'GET')
        
        this.visitorList = (data.records || []).map(item => ({
          id: item.id,
          visitorName: item.visitorName,
          visitorPhone: item.visitorPhone,
          ownerName: item.ownerName,
          buildingNo: item.buildingNo,
          houseNo: item.houseNo,
          visitTime: item.visitTime,
          reason: item.reason,
          carNo: item.carNo,
          status: item.status // pending/approved/rejected
        }))
      } catch (e) {
        console.error('加载访客列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    handleSearch() {
      this.loadData()
    },
    
    handleStatusChange(e) {
      this.statusFilter = this.statusOptions[e.detail.value].value
      this.loadData()
    },
    
    handleApprove(item) {
      uni.showModal({
        title: '通过审核',
        content: `确认允许 ${item.visitorName} 访问吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await request('/api/visitor/audit', {
                id: item.id,
                status: 'approved'
              }, 'PUT')
              item.status = 'approved'
              uni.showToast({ title: '审核通过', icon: 'success' })
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    
    handleReject(item) {
      uni.showModal({
        title: '拒绝申请',
        content: `确认拒绝 ${item.visitorName} 的访问申请吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await request('/api/visitor/audit', {
                id: item.id,
                status: 'rejected'
              }, 'PUT')
              item.status = 'rejected'
              uni.showToast({ title: '已拒绝', icon: 'none' })
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    
    getStatusClass(status) {
      return {
        'status-pending': status === 'pending',
        'status-approved': status === 'approved',
        'status-rejected': status === 'rejected'
      }
    },
    
    getStatusText(status) {
      const map = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
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

/* 搜索栏 */
.search-filter-bar {
  background: white;
  padding: 20rpx;
  border-radius: 15rpx;
  margin-bottom: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.search-box {
  display: flex;
  gap: 20rpx;
}

.search-input {
  flex: 1;
  background: #f5f7fa;
  height: 70rpx;
  border-radius: 35rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
}

.search-btn {
  height: 70rpx;
  line-height: 70rpx;
  background: #2D81FF;
  color: white;
  font-size: 28rpx;
  border-radius: 35rpx;
  padding: 0 40rpx;
}

.filter-picker {
  background: #f5f7fa;
  height: 70rpx;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-picker-text {
  font-size: 28rpx;
  color: #666;
}

/* 列表 */
.visitor-item {
  background: white;
  border-radius: 15rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.item-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
}

.status-tag.status-pending {
  background: rgba(255, 165, 2, 0.1);
  color: #ffa502;
}

.status-tag.status-approved {
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.status-tag.status-rejected {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.item-body {
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 15rpx;
  font-size: 28rpx;
}

.info-row .label {
  color: #999;
  width: 160rpx;
}

.info-row .value {
  color: #333;
  flex: 1;
}

.item-footer {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.action-btn {
  font-size: 26rpx;
  padding: 10rpx 30rpx;
  border-radius: 30rpx;
  margin: 0;
}

.action-btn.approve {
  background: #2D81FF;
  color: white;
}

.action-btn.reject {
  background: #f5f7fa;
  color: #666;
}
</style>