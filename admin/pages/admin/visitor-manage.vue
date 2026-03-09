<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="访客审核"
    currentPage="/admin/pages/admin/visitor-manage"
  >
    <view class="manage-container">
      <!-- 统计卡片 -->
      <view class="stats-card-container">
        <view class="stats-card" @click="handleStatsClick('')">
          <text class="stats-number">{{ stats.total }}</text>
          <text class="stats-label">总访问数</text>
        </view>
        <view class="stats-card status-pending" @click="handleStatsClick('PENDING')">
          <text class="stats-number">{{ stats.pending }}</text>
          <text class="stats-label">待审核</text>
        </view>
        <view class="stats-card status-approved" @click="handleStatsClick('APPROVED')">
          <text class="stats-number">{{ stats.approved }}</text>
          <text class="stats-label">已通过</text>
        </view>
      </view>

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
              <view class="header-left">
                <text class="item-title">{{ item.visitorName }}</text>
                <text class="phone-text" @click="makeCall(item.visitorPhone)">{{ item.visitorPhone }}</text>
              </view>
              <text class="status-tag" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
            </view>
            <view class="item-body">
              <view class="info-grid">
                <view class="info-item">
                  <text class="label">访问对象</text>
                  <text class="value">{{ item.ownerName }}</text>
                </view>
                <view class="info-item">
                  <text class="label">房号</text>
                  <text class="value">{{ item.buildingNo }}栋{{ item.houseNo }}室</text>
                </view>
                <view class="info-item full">
                  <text class="label">访问时间</text>
                  <text class="value highlight">{{ formatTime(item.visitTime) }}</text>
                </view>
                <view class="info-item">
                  <text class="label">访问事由</text>
                  <text class="value">{{ item.reason }}</text>
                </view>
                <view class="info-item">
                  <text class="label">车牌号</text>
                  <text class="value">{{ item.carNo || '无' }}</text>
                </view>
              </view>
            </view>
            
            <view class="item-footer">
               <button class="action-btn call" @click="makeCall(item.visitorPhone)">联系访客</button>
               <view class="audit-btns" v-if="item.status === 'PENDING'">
                  <button class="action-btn reject" @click="handleReject(item)">拒绝</button>
                  <button class="action-btn approve" @click="handleApprove(item)">通过</button>
               </view>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text>暂无访客申请记录</text>
        </view>

        <!-- 分页组件 -->
        <view v-if="total > 0" class="pagination">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1"
            @click="handlePrevPage"
          >
            上一页
          </button>
          
          <view class="page-info">
            <text>{{ currentPage }}</text>
            <text class="page-separator">/</text>
            <text>{{ totalPages }}</text>
          </view>
          
          <button 
            class="page-btn" 
            :disabled="currentPage === totalPages"
            @click="handleNextPage"
          >
            下一页
          </button>
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
        { value: 'PENDING', label: '待审核' },
        { value: 'APPROVED', label: '已通过' },
        { value: 'REJECTED', label: '已拒绝' },
        { value: 'EXPIRED', label: '已过期' }
      ],
      visitorList: [],
      
      // 分页相关
      currentPage: 1,
      pageSize: 10,
      total: 0,
      
      // 统计数据
      stats: {
        total: 0,
        pending: 0,
        approved: 0
      }
    }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.pageSize) || 1
    }
  },
  onLoad() {
    this.loadData()
    this.loadStats()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const params = {
          keyword: this.searchQuery || undefined,
          status: this.statusFilter || undefined,
          pageNum: this.currentPage,
          pageSize: this.pageSize
        }
        
        const data = await request('/api/visitor/list', { params }, 'GET')
        
        const records = data.records || data.data?.records || []
        this.total = data.total || data.data?.total || 0
        
        this.visitorList = records.map(item => ({
          id: item.id,
          visitorName: item.visitorName,
          visitorPhone: item.visitorPhone,
          ownerName: item.ownerName,
          buildingNo: item.buildingNo,
          houseNo: item.houseNo,
          visitTime: item.visitTime,
          reason: item.reason,
          carNo: item.carNo,
          status: item.status // PENDING/APPROVED/REJECTED/EXPIRED
        }))
      } catch (e) {
        console.error('加载访客列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.visitorList = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    
    // 加载统计数据
    async loadStats() {
      try {
        const totalReq = request('/api/visitor/list', { params: { pageSize: 1 } }, 'GET')
        const pendingReq = request('/api/visitor/list', { params: { pageSize: 1, status: 'PENDING' } }, 'GET')
        const approvedReq = request('/api/visitor/list', { params: { pageSize: 1, status: 'APPROVED' } }, 'GET')
        
        const [totalRes, pendingRes, approvedRes] = await Promise.all([totalReq, pendingReq, approvedReq])
        
        this.stats = {
          total: totalRes.total || totalRes.data?.total || 0,
          pending: pendingRes.total || pendingRes.data?.total || 0,
          approved: approvedRes.total || approvedRes.data?.total || 0
        }
      } catch (e) {
        console.error('加载统计数据失败', e)
      }
    },
    
    handleStatsClick(status) {
      this.statusFilter = status
      this.searchQuery = ''
      this.currentPage = 1
      this.loadData()
    },
    
    handleSearch() {
      this.currentPage = 1
      this.loadData()
    },
    
    handleStatusChange(e) {
      this.statusFilter = this.statusOptions[e.detail.value].value
      this.currentPage = 1
      this.loadData()
    },
    
    handlePrevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        this.loadData()
      }
    },
    
    handleNextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
        this.loadData()
      }
    },
    
    handleApprove(item) {
      uni.showModal({
        title: '通过审核',
        content: `确认允许 ${item.visitorName} 访问吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              // 后端接口: @PutMapping("/audit")
              // 参数: @RequestParam("id") Long id, @RequestParam("status") String status
              // 注意: @RequestParam 需要 Query Parameters (URL参数) 或 Form Data
              const url = `/api/visitor/audit?id=${item.id}&status=APPROVED`
              await request(url, {}, 'PUT')
              
              item.status = 'APPROVED'
              uni.showToast({ title: '审核通过', icon: 'success' })
              this.loadStats() // 刷新统计
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
              // 后端接口: @PutMapping("/audit")
              // 参数: @RequestParam("id") Long id, @RequestParam("status") String status
              const url = `/api/visitor/audit?id=${item.id}&status=REJECTED`
              await request(url, {}, 'PUT')
              
              item.status = 'REJECTED'
              uni.showToast({ title: '已拒绝', icon: 'none' })
              this.loadStats() // 刷新统计
            } catch (e) {
              uni.showToast({ title: '操作失败', icon: 'none' })
            }
          }
        }
      })
    },
    
    makeCall(phone) {
      if (!phone) return
      uni.makePhoneCall({ phoneNumber: phone })
    },
    
    getStatusClass(status) {
      return {
        'status-pending': status === 'PENDING',
        'status-approved': status === 'APPROVED',
        'status-rejected': status === 'REJECTED',
        'status-expired': status === 'EXPIRED'
      }
    },
    
    getStatusText(status) {
      const map = {
        'PENDING': '待审核',
        'APPROVED': '已通过',
        'REJECTED': '已拒绝',
        'EXPIRED': '已过期'
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
  padding-top: 100rpx;
}

/* 统计卡片样式 */
.stats-card-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.stats-card {
  background-color: #fff;
  padding: 30rpx;
  border-radius: 15rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  text-align: center;
  cursor: pointer;
  border-left: 6rpx solid #2D81FF;
}

.stats-card.status-pending {
  border-left-color: #ffa502;
}

.stats-card.status-approved {
  border-left-color: #2ed573;
}

.stats-number {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.stats-label {
  display: block;
  font-size: 24rpx;
  color: #999;
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
  margin-bottom: 25rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 6rpx;
}

.phone-text {
  font-size: 26rpx;
  color: #666;
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

.status-tag.status-expired {
  background: rgba(144, 147, 153, 0.1);
  color: #909399;
}

.stats-card.status-pending {
  border-left-color: #ffa502;
}

.stats-card.status-approved {
  border-left-color: #2ed573;
}

.item-body {
  margin-bottom: 20rpx;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.info-item {
  width: 48%; /* 两列布局 */
  background: #f9f9f9;
  padding: 15rpx;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.info-item.full {
  width: 100%;
  background: #e6f7ff;
}

.info-item .label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 6rpx;
}

.info-item .value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
}

.info-item .highlight {
  color: #1890ff;
  font-weight: bold;
}

.item-footer {
  display: flex;
  justify-content: space-between; /* 两端对齐 */
  align-items: center;
  padding-top: 10rpx;
}

.audit-btns {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  font-size: 26rpx;
  padding: 0 30rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
  margin: 0;
}

.action-btn.call {
  background: white;
  color: #666;
  border: 1rpx solid #ddd;
}

.action-btn.approve {
  background: #2D81FF;
  color: white;
}

.action-btn.reject {
  background: #f5f7fa;
  color: #666;
}

/* 分页组件样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 40rpx;
  padding: 20rpx 0;
  background-color: #fff;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.page-btn {
  padding: 10rpx 20rpx;
  background-color: #f5f7fa;
  color: #333;
  border: 1rpx solid #e4e7ed;
  border-radius: 6rpx;
  font-size: 28rpx;
  min-width: 100rpx;
}

.page-btn[disabled] {
  opacity: 0.5;
  color: #909399;
}

.page-info {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #333;
}

.page-separator {
  margin: 0 10rpx;
  color: #909399;
}
</style>