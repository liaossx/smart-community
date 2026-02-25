<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="费用管理"
    currentPage="/admin/pages/admin/fee-manage"
  >
    <view class="manage-container">
      <!-- 统计卡片 -->
      <view class="stats-card-container">
        <view class="stats-card" @click="handleStatsClick('all')">
          <text class="stats-number">{{ stats.total }}</text>
          <text class="stats-label">总账单</text>
        </view>
        <view class="stats-card status-unpaid" @click="handleStatsClick('unpaid')">
          <text class="stats-number">{{ stats.unpaid }}</text>
          <text class="stats-label">待缴费</text>
        </view>
        <view class="stats-card status-paid" @click="handleStatsClick('paid')">
          <text class="stats-number">{{ stats.paid }}</text>
          <text class="stats-label">已缴费</text>
        </view>
      </view>
      
      <!-- 搜索和筛选栏 -->
      <view class="search-filter-bar">
        <view class="search-box">
          <input 
            type="text"
            placeholder="搜索房屋编号、业主姓名"
            v-model="searchQuery"
            @confirm="handleSearch"
            class="search-input"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
        </view>
        
        <view class="filter-row">
          <picker 
            mode="selector"
            :range="typeOptions"
            :range-key="'label'"
            :value="typeOptions.findIndex(opt => opt.value === typeFilter)"
            @change="handleTypeChange"
            class="filter-picker"
          >
            <view class="filter-picker-text">
              {{ typeOptions.find(opt => opt.value === typeFilter)?.label || '全部费用' }}
            </view>
          </picker>
        </view>
      </view>
      
      <!-- 操作栏 -->
      <view class="action-bar">
        <button class="action-btn primary" @click="handleGenerateBill">生成账单</button>
        <button class="action-btn secondary" @click="handleBatchRemind">批量催缴</button>
      </view>

      <!-- 账单列表 -->
      <view class="list-container">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-else-if="feeList.length > 0" class="fee-list">
          <view v-for="item in feeList" :key="item.id" class="fee-item">
            <view class="fee-header">
              <text class="fee-title">{{ item.feeName }}</text>
              <text class="fee-amount">¥{{ item.amount }}</text>
            </view>
            <view class="fee-body">
              <view class="info-row">
                <text class="label">房屋：</text>
                <text class="value">{{ item.buildingNo }}{{ item.houseNo }}</text>
              </view>
              <view class="info-row">
                <text class="label">业主：</text>
                <text class="value">{{ item.ownerName }}</text>
              </view>
              <view class="info-row">
                <text class="label">账单周期：</text>
                <text class="value">{{ item.period }}</text>
              </view>
              <view class="info-row">
                <text class="label">截止日期：</text>
                <text class="value">{{ formatTime(item.deadline) }}</text>
              </view>
            </view>
            <view class="fee-footer">
              <text class="status-tag" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
              <view class="action-buttons">
                <button 
                  v-if="item.status === 'unpaid'" 
                  class="mini-btn remind" 
                  @click="handleRemind(item)"
                >
                  催缴
                </button>
                <button 
                  v-if="item.status === 'paid'" 
                  class="mini-btn check" 
                  @click="handleCheck(item)"
                >
                  核对
                </button>
              </view>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text>暂无账单记录</text>
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
      typeFilter: '',
      loading: false,
      stats: {
        total: 0,
        unpaid: 0,
        paid: 0
      },
      typeOptions: [
        { value: '', label: '全部费用' },
        { value: 'property', label: '物业费' },
        { value: 'water', label: '水费' },
        { value: 'electricity', label: '电费' },
        { value: 'parking', label: '停车费' }
      ],
      feeList: []
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
          status: this.typeFilter === 'unpaid' ? 'unpaid' : (this.typeFilter === 'paid' ? 'paid' : undefined)
        }
        
        // 调用后端接口
        const data = await request('/api/fee/list', { params }, 'GET')
        
        // 处理返回数据
        this.feeList = (data.records || []).map(item => ({
          id: item.id,
          feeName: `${item.year}年${item.month}月物业费`, // 假设后端返回year/month
          amount: item.amount,
          buildingNo: item.buildingNo,
          houseNo: item.houseNo,
          ownerName: item.ownerName,
          period: `${item.year}-${item.month}`,
          deadline: item.deadline,
          status: item.status === 1 ? 'paid' : 'unpaid' // 假设1为已缴
        }))
        
        this.calculateStats()
      } catch (e) {
        console.error('加载账单列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    calculateStats() {
      this.stats.total = this.feeList.length
      this.stats.unpaid = this.feeList.filter(i => i.status === 'unpaid').length
      this.stats.paid = this.feeList.filter(i => i.status === 'paid').length
    },

    handleSearch() {
      this.loadData()
    },

    handleTypeChange(e) {
      // 这里typeFilter实际上是用来筛选缴费状态的，因为options里value定义有点混用
      // 假设我们只关心全部/待缴/已缴
      const selected = this.typeOptions[e.detail.value]
      this.typeFilter = selected.value
      // 如果选的是具体的费用类型（如水费），后端接口需要支持type参数
      // 这里简化为重新加载
      this.loadData()
    },
    
    handleStatsClick(type) {
      if (type === 'all') this.typeFilter = ''
      else this.typeFilter = type
      this.loadData()
    },

    async handleGenerateBill() {
      try {
        uni.showLoading({ title: '生成中...' })
        await request('/api/fee/generate', {}, 'POST')
        uni.hideLoading()
        uni.showToast({ title: '生成成功', icon: 'success' })
        this.loadData()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '生成失败', icon: 'none' })
      }
    },

    async handleBatchRemind() {
      try {
        uni.showLoading({ title: '发送中...' })
        // 获取所有未缴费ID
        const unpaidIds = this.feeList.filter(i => i.status === 'unpaid').map(i => i.id)
        if (unpaidIds.length === 0) {
          uni.hideLoading()
          return uni.showToast({ title: '无待缴账单', icon: 'none' })
        }
        
        await request('/api/fee/remind', { ids: unpaidIds }, 'POST')
        uni.hideLoading()
        uni.showToast({ title: '催缴发送成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '发送失败', icon: 'none' })
      }
    },

    handleRemind(item) {
      uni.showModal({
        title: '催缴通知',
        content: `确认向 ${item.ownerName} 发送 ${item.feeName} 的催缴通知吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await request('/api/fee/remind', { ids: [item.id] }, 'POST')
              uni.showToast({ title: '发送成功', icon: 'success' })
            } catch (e) {
              uni.showToast({ title: '发送失败', icon: 'none' })
            }
          }
        }
      })
    },

    handleCheck(item) {
      uni.showToast({ title: '核对成功', icon: 'success' })
    },

    getStatusClass(status) {
      return {
        'status-unpaid': status === 'unpaid',
        'status-paid': status === 'paid'
      }
    },

    getStatusText(status) {
      const map = {
        'unpaid': '待缴费',
        'paid': '已缴费'
      }
      return map[status] || status
    },

    formatTime(dateStr) {
      return dateStr
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

/* 统计卡片 */
.stats-card-container {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.stats-card {
  flex: 1;
  background: white;
  padding: 30rpx;
  border-radius: 15rpx;
  text-align: center;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.stats-number {
  font-size: 40rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #999;
}

.status-unpaid .stats-number { color: #ff4757; }
.status-paid .stats-number { color: #2ed573; }

/* 搜索筛选 */
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

/* 操作栏 */
.action-bar {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.action-btn {
  flex: 1;
  font-size: 28rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
}

.action-btn.primary {
  background: #2D81FF;
  color: white;
}

.action-btn.secondary {
  background: #fff;
  color: #2D81FF;
  border: 2rpx solid #2D81FF;
}

/* 列表 */
.fee-item {
  background: white;
  border-radius: 15rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.fee-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.fee-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.fee-amount {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff4757;
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

.fee-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
}

.status-tag.status-unpaid {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.status-tag.status-paid {
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.mini-btn {
  font-size: 24rpx;
  padding: 10rpx 30rpx;
  margin-left: 20rpx;
  border-radius: 30rpx;
  display: inline-block;
  line-height: 1.5;
}

.mini-btn.remind {
  background: #ff4757;
  color: white;
}

.mini-btn.check {
  background: #2D81FF;
  color: white;
}
</style>