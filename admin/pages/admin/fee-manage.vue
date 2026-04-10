<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="费用管理"
    currentPage="/admin/pages/admin/fee-manage"
  >
  <view class="container">
    <!-- 顶部搜索栏 -->
    <view class="header">
      <view class="search-box">
        <input 
          class="search-input" 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索房号、业主姓名" 
          confirm-type="search"
          @confirm="onSearch"
        />
        <button class="search-btn" @click="onSearch">搜索</button>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-card-container">
      <view class="stats-card" @click="handleStatsClick('all')">
        <text class="stats-number">{{ countStats.total }}</text>
        <text class="stats-label">总账单数</text>
      </view>
      <view class="stats-card status-unpaid" @click="handleStatsClick('unpaid')">
        <text class="stats-number">{{ countStats.unpaid }}</text>
        <text class="stats-label">待缴费</text>
      </view>
      <view class="stats-card status-paid" @click="handleStatsClick('paid')">
        <text class="stats-number">{{ countStats.paid }}</text>
        <text class="stats-label">已缴费</text>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-tabs">
        <view 
          v-for="tab in filterTabs" 
          :key="tab.value"
          class="filter-tab"
          :class="{ active: typeFilter === tab.value }"
          @click="switchTab(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>
      <!-- 修改为打开弹窗 -->
      <view class="action-buttons">
        <button class="action-btn generate" @click="openGenerateModal">生成账单</button>
        <button class="action-btn remind" @click="handleBatchRemind">一键催缴</button>
      </view>
    </view>

    <!-- 账单列表 -->
    <view class="list-container">
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="feeList.length > 0" class="fee-list">
        <view v-for="item in feeList" :key="item.id" class="fee-item">
          <view class="item-header">
            <text class="item-title">{{ item.feeName }}</text>
            <text class="amount">¥{{ item.amount }}</text>
          </view>
          
          <view class="item-info">
            <view class="info-row">
              <text class="label">业主：</text>
              <text class="value">{{ item.ownerName }}</text>
            </view>
            <view class="info-row">
              <text class="label">房号：</text>
              <text class="value">{{ item.buildingNo }}栋{{ item.houseNo }}室</text>
            </view>
            <view class="info-row">
              <text class="label">账单周期：</text>
              <text class="value">{{ item.period }}</text>
            </view>
            <view class="info-row">
              <text class="label">截止日期：</text>
              <text class="value">{{ item.deadline }}</text>
            </view>
            <view class="info-row" v-if="item.status === 'unpaid'">
              <text class="label">催缴次数：</text>
              <text class="value" style="color: #ff9f43">{{ item.remindCount || 0 }}次</text>
            </view>
          </view>
          
          <view class="item-footer">
            <text class="status-tag" :class="item.status">
              {{ item.status === 'paid' ? '已缴费' : '待缴费' }}
            </text>
            <button 
              v-if="item.status === 'unpaid'" 
              class="remind-btn" 
              @click="handleRemind(item)"
            >
              催缴
            </button>
          </view>
        </view>
      </view>
      
      <view v-else class="empty-state">
        <image src="/static/empty.png" mode="aspectFit" class="empty-img"></image>
        <text class="empty-text">暂无账单记录</text>
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
    
    <!-- 底部统计 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="label">本月应收</text>
        <text class="value">¥{{ stats.totalAmount }}</text>
      </view>
      <view class="stat-item">
        <text class="label">已收金额</text>
        <text class="value highlight">¥{{ stats.paidAmount }}</text>
      </view>
      <view class="stat-item">
        <text class="label">缴费率</text>
        <text class="value">{{ stats.rate }}%</text>
      </view>
    </view>

    <!-- 生成账单弹窗 -->
    <view class="modal-mask" v-if="showGenerateModal" @click="closeGenerateModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">生成本期账单</text>
          <text class="close-icon" @click="closeGenerateModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="label">账单月份</text>
            <picker mode="date" fields="month" :value="generateForm.month" @change="onMonthChange">
              <view class="picker-value">{{ generateForm.month || '请选择月份' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="label">费用类型</text>
            <picker :range="feeTypes" range-key="label" @change="onFeeTypeChange">
              <view class="picker-value">{{ generateForm.feeTypeLabel || '请选择类型' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="label">截止日期</text>
            <picker mode="date" :value="generateForm.deadline" @change="onDeadlineChange">
              <view class="picker-value">{{ generateForm.deadline || '请选择日期' }}</view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel" @click="closeGenerateModal">取消</button>
          <button class="modal-btn confirm" @click="submitGenerateBill">确认生成</button>
        </view>
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
      typeFilter: 'all', // all, unpaid, paid
      loading: false,
      feeList: [],
      filterTabs: [
        { label: '全部', value: 'all' },
        { label: '待缴费', value: 'unpaid' },
        { label: '已缴费', value: 'paid' }
      ],
      stats: {
        totalAmount: 0,
        paidAmount: 0,
        rate: 0
      },
      countStats: {
        total: 0,
        unpaid: 0,
        paid: 0
      },
      
      // 生成账单相关
      showGenerateModal: false,
      generateForm: {
        month: '',
        feeType: 'wuye',
        feeTypeLabel: '物业费',
        deadline: ''
      },
      feeTypes: [
        { label: '物业费', value: 'wuye' },
        { label: '停车费', value: 'parking' },
        { label: '水费', value: 'water' },
        { label: '电费', value: 'electric' }
      ],
      
      // 分页
      currentPage: 1,
      pageSize: 10,
      total: 0
    }
  },
  
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.pageSize) || 1
    }
  },
  
  onLoad() {
    // 初始化默认月份为当前月
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    this.generateForm.month = `${year}-${month}`;
    
    // onLoad 不自动加载，交给 onShow
  },

  onShow() {
    this.loadData()
    this.loadCountStats()
  },

  methods: {
    handleStatsClick(status) {
      this.typeFilter = status
      this.loadData()
    },

    async loadCountStats() {
      try {
        const totalReq = request('/api/fee/list', { pageNum: 1, pageSize: 1 }, 'GET')
        const unpaidReq = request('/api/fee/list', { pageNum: 1, pageSize: 1, status: 'UNPAID' }, 'GET')
        const paidReq = request('/api/fee/list', { pageNum: 1, pageSize: 1, status: 'PAID' }, 'GET')
        
        const [totalRes, unpaidRes, paidRes] = await Promise.all([totalReq, unpaidReq, paidReq])
        
        this.countStats = {
          total: totalRes?.total || 0,
          unpaid: unpaidRes?.total || 0,
          paid: paidRes?.total || 0
        }
      } catch (e) {
        console.error('加载统计数据失败', e)
      }
    },

    onSearch() {
      this.currentPage = 1
      this.loadData()
    },

    switchTab(tabValue) {
      this.typeFilter = tabValue
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

    async loadData() {
      this.loading = true
      try {
        const isStatusFilter = ['unpaid', 'paid'].includes(this.typeFilter)
        const params = {
          keyword: this.searchQuery || undefined,
          status: isStatusFilter ? (this.typeFilter === 'unpaid' ? 'UNPAID' : 'PAID') : undefined,
          pageNum: this.currentPage,
          pageSize: this.pageSize
        }
        
        const data = await request('/api/fee/list', params, 'GET')
        
        // 处理分页数据
        const records = data.records || []
        this.total = typeof data.total === 'number' ? data.total : (data.data?.total || records.length || 0)
        
        this.feeList = records.map(item => {
          const feeCycle = item.feeCycle || '';
          const [year, month] = feeCycle.split('-');
          
          return {
            id: item.id,
            feeName: item.feeName || (year && month ? `${year}年${month}月费用` : `${feeCycle} 费用`), 
            amount: item.amount,
            buildingNo: item.buildingNo,
            houseNo: item.houseNo,
            ownerName: item.ownerName,
            period: feeCycle,
            deadline: item.deadline || '月底',
            remindCount: item.remindCount || 0, // 新增：催缴次数
            status: (item.status === 'PAID' || item.status === 'paid' || item.status === 1) ? 'paid' : 'unpaid'
          }
        })
        
        // 简单统计逻辑 (仅当前页，实际应由后端返回)
        const total = this.feeList.reduce((sum, item) => sum + Number(item.amount), 0);
        const paid = this.feeList
          .filter(item => item.status === 'paid')
          .reduce((sum, item) => sum + Number(item.amount), 0);
          
        this.stats = {
          totalAmount: total.toFixed(2),
          paidAmount: paid.toFixed(2),
          rate: total > 0 ? ((paid / total) * 100).toFixed(1) : 0
        }
        
      } catch (e) {
        console.error(e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    // 打开生成账单弹窗
    openGenerateModal() {
      this.showGenerateModal = true;
    },
    
    closeGenerateModal() {
      this.showGenerateModal = false;
    },
    
    onMonthChange(e) {
      this.generateForm.month = e.detail.value;
    },
    
    onFeeTypeChange(e) {
      const index = e.detail.value;
      this.generateForm.feeType = this.feeTypes[index].value;
      this.generateForm.feeTypeLabel = this.feeTypes[index].label;
    },
    
    onDeadlineChange(e) {
      this.generateForm.deadline = e.detail.value;
    },
    
    // 提交生成账单
    async submitGenerateBill() {
      if (!this.generateForm.month) return uni.showToast({ title: '请选择月份', icon: 'none' });
      if (!this.generateForm.deadline) return uni.showToast({ title: '请选择截止日期', icon: 'none' });
      
      try {
        uni.showLoading({ title: '生成中...' })
        
        // 获取当前管理员信息
        const userInfo = uni.getStorageSync('userInfo') || {}
        
        // 构造符合 GenerateFeeDTO 的参数
        // 接口：POST /api/fee/generate?adminId={adminId}
        // Body: communityName, buildingNo, feeCycle, dueDate, unitPrice
        const payload = {
          communityName: '', // 默认全小区，或者从 userInfo.communityName 获取
          buildingNo: '',    // 默认全楼栋
          feeCycle: this.generateForm.month, // 对应 feeCycle (2026-02)
          dueDate: this.generateForm.deadline, // 对应 dueDate
          unitPrice: 2.5 // 暂时硬编码或从配置获取，或者在弹窗增加输入框
        };
        
        // 注意：adminId 是 @RequestParam，必须拼在 URL 上
        const adminId = userInfo.id || userInfo.userId || 1;
        const url = `/api/fee/generate?adminId=${adminId}`;
        
        await request(url, payload, 'POST')
        
        uni.hideLoading()
        uni.showToast({ title: '生成成功', icon: 'success' })
        this.closeGenerateModal()
        this.loadData() // 刷新列表
      } catch (e) {
        uni.hideLoading()
        console.error('生成账单失败:', e)
        uni.showToast({ title: '生成失败: ' + (e.message || '接口错误'), icon: 'none' })
      }
    },

    async handleBatchRemind() {
      try {
        uni.showLoading({ title: '发送中...' })
        const unpaidIds = this.feeList.filter(i => i.status === 'unpaid').map(i => i.id)
        if (unpaidIds.length === 0) {
          uni.hideLoading()
          return uni.showToast({ title: '无待缴账单', icon: 'none' })
        }
        
        await request('/api/fee/remind/batch', { ids: unpaidIds }, 'POST')
        
        uni.hideLoading()
        this.feeList = this.feeList.map(i => {
          if (i.status !== 'unpaid') return i
          const nextCount = (Number(i.remindCount) || 0) + 1
          return { ...i, remindCount: nextCount }
        })
        uni.showToast({ title: '催缴发送成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
      }
    },

    handleRemind(item) {
      uni.showModal({
        title: '催缴通知',
        content: `确认向 ${item.ownerName} 发送 ${item.feeName} 的催缴通知吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              // 这里的 id 是 path variable，且后端没有 @RequestBody，所以 data 传 null 或空对象均可
              // 修改为 null 明确表示没有 Body
              await request(`/api/fee/remind/${item.id}`, null, 'POST')
              const index = this.feeList.findIndex(v => v.id === item.id)
              if (index !== -1) {
                const current = this.feeList[index]
                const nextCount = (Number(current.remindCount) || 0) + 1
                this.feeList.splice(index, 1, { ...current, remindCount: nextCount })
              }
              uni.showToast({ title: '发送成功', icon: 'success' })
            } catch (e) {
              console.error('催缴失败', e)
              uni.showToast({ title: e.msg || '发送失败，请检查后端日志', icon: 'none' })
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
/* 页面布局 */
.container {
  padding: 30rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
  padding-bottom: 120rpx; /* 为底部统计栏留出空间 */
}

/* 顶部搜索 */
.header {
  margin-bottom: 20rpx;
}

/* 统计卡片样式 */
.stats-card-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 30rpx;
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

.stats-card.status-unpaid {
  border-left-color: #ff4757;
}

.stats-card.status-paid {
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

.search-box {
  display: flex;
  gap: 20rpx;
  background: white;
  padding: 20rpx;
  border-radius: 15rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.03);
}

.search-input {
  flex: 1;
  background: #f5f7fa;
  height: 72rpx;
  border-radius: 36rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
}

.search-btn {
  height: 72rpx;
  line-height: 72rpx;
  background: #2D81FF;
  color: white;
  font-size: 28rpx;
  border-radius: 36rpx;
  padding: 0 40rpx;
  margin: 0;
}

/* 筛选与操作栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  flex-wrap: wrap; /* 小屏幕允许换行 */
  gap: 20rpx;
}

.filter-tabs {
  display: flex;
  background: white;
  padding: 8rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}

.filter-tab {
  padding: 12rpx 30rpx;
  font-size: 26rpx;
  color: #666;
  border-radius: 8rpx;
  transition: all 0.3s;
}

.filter-tab.active {
  background: #e6f7ff;
  color: #2D81FF;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 15rpx;
}

.action-btn {
  font-size: 24rpx;
  padding: 0 24rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
  margin: 0;
}

.action-btn.generate {
  background: white;
  color: #2D81FF;
  border: 1rpx solid #2D81FF;
}

.action-btn.remind {
  background: #2D81FF;
  color: white;
}

/* 列表样式 */
.list-container {
  min-height: 400rpx;
}

.fee-item {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx dashed #f0f0f0;
}

.item-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.amount {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff4757;
}

.item-info {
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
}

.info-row .label {
  color: #999;
  width: 140rpx;
  flex-shrink: 0;
}

.info-row .value {
  color: #333;
  flex: 1;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10rpx;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
}

.status-tag.paid {
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.status-tag.unpaid {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.remind-btn {
  font-size: 24rpx;
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 24rpx;
  background: #ff4757;
  color: white;
  border-radius: 26rpx;
  margin: 0;
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
  margin: 0;
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

/* 底部统计栏 */
.stats-bar {
  position: fixed;
  bottom: 0;
  left: 200rpx; /* admin-sidebar width */
  right: 0;
  height: 100rpx;
  background: white;
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item .label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 4rpx;
}

.stat-item .value {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.stat-item .value.highlight {
  color: #2D81FF;
}

/* 适配小屏幕：侧边栏可能隐藏 */
@media screen and (max-width: 768px) {
  .stats-bar {
    left: 0;
  }
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 600rpx;
  background: white;
  border-radius: 20rpx;
  overflow: hidden;
}

.modal-header {
  padding: 30rpx;
  text-align: center;
  position: relative;
  border-bottom: 1rpx solid #eee;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
}

.close-icon {
  position: absolute;
  right: 30rpx;
  top: 30rpx;
  font-size: 40rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  padding: 40rpx 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-item .label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 15rpx;
}

.picker-value {
  height: 80rpx;
  line-height: 80rpx;
  background: #f5f7fa;
  border-radius: 10rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #eee;
}

.modal-btn {
  flex: 1;
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  font-size: 30rpx;
  margin: 0;
  border-radius: 0;
  background: white;
}

.modal-btn.cancel {
  color: #666;
  border-right: 1rpx solid #eee;
}

.modal-btn.confirm {
  color: #2D81FF;
  font-weight: bold;
}
</style>
