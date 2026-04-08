<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="投诉处理"
    currentPage="/admin/pages/admin/complaint-manage"
  >
    <view class="manage-container">
      <!-- 统计卡片 -->
      <view class="stats-card-container">
        <view class="stats-card" @click="handleStatsClick('')">
          <text class="stats-number">{{ stats.total }}</text>
          <text class="stats-label">总投诉数</text>
        </view>
        <view class="stats-card status-pending" @click="handleStatsClick('pending')">
          <text class="stats-number">{{ stats.pending }}</text>
          <text class="stats-label">待处理</text>
        </view>
        <view class="stats-card status-processed" @click="handleStatsClick('processed')">
          <text class="stats-number">{{ stats.processed }}</text>
          <text class="stats-label">已处理</text>
        </view>
      </view>

      <view class="stats-filter">
        <picker mode="selector" :range="monthOptions" range-key="label" @change="handleMonthChange">
          <view class="stats-filter-btn">
            <text class="stats-filter-text">{{ currentMonthLabel }}</text>
            <text class="stats-filter-arrow">▼</text>
          </view>
        </picker>
      </view>

      <!-- 搜索和筛选栏 -->
      <view class="search-filter-bar">
        <view class="search-box">
          <input 
            type="text"
            placeholder="搜索投诉内容、业主姓名"
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

      <!-- 投诉列表 -->
      <view class="list-container">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-else-if="complaintList.length > 0" class="complaint-list">
          <view v-for="item in complaintList" :key="item.id" class="complaint-item">
            <view class="item-header">
              <view class="title-row">
                <text class="item-title">{{ item.type }}</text>
                <text class="time-text">{{ formatTime(item.createTime) }}</text>
              </view>
              <text class="status-tag" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
            </view>
            <view class="item-content">
              <text class="content-text">{{ item.content }}</text>
              <view v-if="item.images" class="image-preview">
                 <!-- 假设 images 是逗号分隔的字符串 -->
                 <image 
                   v-for="(img, index) in item.images.split(',')" 
                   :key="index" 
                   :src="img" 
                   mode="aspectFill" 
                   class="complain-img"
                   @click="previewImage(item.images, index)"
                 ></image>
              </view>
            </view>
            <view class="item-info">
                <view class="info-row">
                  <text class="label">投诉人：</text>
                  <text class="value">{{ item.ownerName || item.userName || '匿名' }} <text class="phone" v-if="item.phone" @click="makeCall(item.phone)">{{ item.phone }}</text></text>
                </view>
                <view class="info-row">
                  <text class="label">房号：</text>
                  <text class="value" v-if="item.buildingNo && item.houseNo">{{ item.buildingNo }}栋{{ item.houseNo }}室</text>
                  <text class="value" v-else>未绑定房屋</text>
                </view>
              <view v-if="item.status === 'DONE'" class="result-box">
                <text class="label">处理结果：</text>
                <text class="value">{{ item.result }}</text>
              </view>
            </view>
            
            <view class="item-footer">
              <button 
                class="action-btn handle" 
                @click="openHandleModal(item)"
              >
                {{ String(item.status) === 'PENDING' ? '立即处理' : '重新处理' }}
              </button>
              <button 
                class="action-btn call" 
                v-if="item.phone"
                @click="makeCall(item.phone)"
              >
                联系业主
              </button>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text>暂无投诉记录</text>
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
      
      <!-- 处理弹窗 -->
      <view v-if="showHandleModal" class="modal-mask" @click="closeHandleModal">
        <view class="modal-content" @click.stop>
          <view class="modal-header">
            <text class="modal-title">处理投诉</text>
            <text class="close-icon" @click="closeHandleModal">×</text>
          </view>
          <view class="modal-body">
            <textarea 
              v-model="handleResult" 
              placeholder="请输入处理结果/回复内容" 
              class="handle-textarea"
            ></textarea>
          </view>
          <view class="modal-footer">
            <button class="cancel-btn" @click="closeHandleModal">取消</button>
            <button class="confirm-btn" @click="submitHandle">确认回复</button>
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
      statusFilter: '',
      loading: false,
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'PENDING', label: '待处理' },
        { value: 'DONE', label: '已处理' }
      ],
      complaintList: [],
      
      // 分页相关
      currentPage: 1,
      pageSize: 10,
      total: 0,
      
      // 统计数据
      stats: {
        total: 0,
        pending: 0,
        processed: 0
      },

      // 处理弹窗
      showHandleModal: false,
      currentComplaint: null,
      handleResult: '',
      monthOptions: [],
      monthIndex: 0,
      monthValue: ''
    }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.pageSize) || 1
    },
    currentMonthLabel() {
      const opt = this.monthOptions && this.monthOptions[this.monthIndex]
      return (opt && opt.label) || this.monthValue || '选择月份'
    }
  },
  onLoad() {
    this.initMonthOptions()
    this.loadData()
    this.loadStats()
  },
  methods: {
    initMonthOptions() {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      const current = `${y}-${String(m).padStart(2, '0')}`
      const opts = []
      for (let i = 0; i < 12; i++) {
        const d = new Date(y, m - 1 - i, 1)
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const value = `${yy}-${mm}`
        opts.push({ label: value, value })
      }
      this.monthOptions = opts
      this.monthValue = current
      this.monthIndex = Math.max(0, opts.findIndex(o => o.value === current))
    },
    handleMonthChange(e) {
      const idx = Number(e && e.detail ? e.detail.value : 0)
      const option = this.monthOptions && this.monthOptions[idx]
      if (!option) return
      this.monthIndex = idx
      this.monthValue = option.value
      this.currentPage = 1
      this.loadData()
      this.loadStats()
    },
    async loadData() {
      this.loading = true
      try {
        const params = {
          keyword: this.searchQuery || undefined,
          status: this.statusFilter || undefined,
          month: this.monthValue || undefined,
          pageNum: this.currentPage,
          pageSize: this.pageSize
        }
        
        // 调用后端接口
        const data = await request('/api/complaint/list', { params }, 'GET')
        
        // 兼容处理返回结构
        const records = Array.isArray(data) ? data : (data.records || data.data?.records || data.rows || [])
        this.total = typeof data.total === 'number' ? data.total : (data.data?.total || records.length || 0)
        
        this.complaintList = records.map(item => ({
          id: item.id,
          type: item.type,
          content: item.content,
          images: item.images,
          ownerName: item.ownerName,
          userName: item.userName,
          phone: item.phone,
          buildingNo: item.buildingNo,
          houseNo: item.houseNo,
          createTime: item.createTime,
          status: item.status, // PENDING/DONE
          result: item.result
        }))
      } catch (e) {
        console.error('加载投诉列表失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.complaintList = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    
    // 加载统计数据
    async loadStats() {
      try {
        const month = this.monthValue || undefined
        // 使用 loadData 的逻辑来获取统计数据，确保接口调用一致
        // 1. 获取总数
        const totalReq = request('/api/complaint/list', { params: { pageNum: 1, pageSize: 1, month } }, 'GET')
        // 2. 获取待处理数
        const pendingReq = request('/api/complaint/list', { params: { pageNum: 1, pageSize: 1, status: 'PENDING', month } }, 'GET')
        // 3. 获取已处理数
        const processedReq = request('/api/complaint/list', { params: { pageNum: 1, pageSize: 1, status: 'DONE', month } }, 'GET')
        
        const [totalRes, pendingRes, processedRes] = await Promise.all([totalReq, pendingReq, processedReq])
        
        console.log('Stats Response Data:', { totalRes, pendingRes, processedRes })
        
        this.stats = {
          total: totalRes?.total || 0,
          pending: pendingRes?.total || 0,
          processed: processedRes?.total || 0
        }
      } catch (e) {
        console.error('加载统计数据失败', e)
      }
    },
    
    handleStatsClick(status) {
      this.statusFilter = status
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
    
    openHandleModal(item) {
      this.currentComplaint = item
      this.handleResult = ''
      this.showHandleModal = true
    },
    
    closeHandleModal() {
      this.showHandleModal = false
      this.currentComplaint = null
    },
    
    async submitHandle() {
      if (!this.handleResult) {
        uni.showToast({ title: '请输入处理结果', icon: 'none' })
        return
      }
      
      uni.showLoading({ title: '提交中...' })
      try {
        // 调用处理接口，注意后端接收的是 query param 而不是 json body
        // 这里的 request 封装默认如果是 POST/PUT 且 data 是对象，会序列化为 JSON body
        // 但后端的 @RequestParam 需要的是 query parameters 或者 form-data
        // 所以我们需要手动拼接参数到 URL，或者修改 request 封装（这里选择拼接 URL 最稳妥）
        const url = `/api/complaint/handle?id=${this.currentComplaint.id}&result=${encodeURIComponent(this.handleResult)}`
        
        await request(url, {}, 'PUT')
        
        // 本地更新状态
        const item = this.complaintList.find(i => i.id === this.currentComplaint.id)
        if (item) {
          item.status = 'DONE'
          item.result = this.handleResult
        }
        
        uni.showToast({ title: '处理成功', icon: 'success' })
        this.closeHandleModal()
        this.loadStats() // 重新加载统计
      } catch (e) {
        console.error('处理投诉失败', e)
        uni.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    
    makeCall(phone) {
      if (!phone) return
      uni.makePhoneCall({ phoneNumber: phone })
    },
    
    previewImage(images, index) {
      if (!images) return
      const urls = images.split(',')
      uni.previewImage({
        current: urls[index],
        urls: urls
      })
    },

    getStatusClass(status) {
      return {
        'status-pending': status === 'PENDING',
        'status-processed': status === 'DONE'
      }
    },
    
    getStatusText(status) {
      const map = {
        'PENDING': '待处理',
        'DONE': '已处理'
      }
      return map[status] || status
    },
    
    formatTime(time) {
      if (!time) return ''
      return new Date(time).toLocaleString()
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

.stats-filter {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20rpx;
}

.stats-filter-btn {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.stats-filter-text {
  font-size: 24rpx;
  color: #333;
}

.stats-filter-arrow {
  margin-left: 10rpx;
  font-size: 22rpx;
  color: #999;
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
  border-left-color: #ff4757;
}

.stats-card.status-processed {
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
.complaint-item {
  background: white;
  border-radius: 15rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.title-row {
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 6rpx;
}

.time-text {
  font-size: 24rpx;
  color: #999;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  white-space: nowrap;
}

.status-tag.status-pending {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.status-tag.status-processed {
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.item-content {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 10rpx;
}

.content-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
  display: block;
}

.image-preview {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.complain-img {
  width: 150rpx;
  height: 150rpx;
  border-radius: 8rpx;
  background: #eee;
}

.item-info {
  margin-bottom: 20rpx;
  border-top: 1rpx dashed #eee;
  padding-top: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 10rpx;
  font-size: 26rpx;
  color: #666;
}

.info-row .label {
  width: 140rpx;
  color: #999;
}

.info-row .phone {
  color: #2D81FF;
  margin-left: 10rpx;
}

.result-box {
  margin-top: 15rpx;
  background: #f0f9eb;
  padding: 15rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #67c23a;
  display: flex;
}

.result-box .label {
  font-weight: bold;
  margin-right: 10rpx;
}

.item-footer {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 20rpx;
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
}

.action-btn {
  display: inline-block;
  font-size: 26rpx;
  padding: 0 30rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
  margin: 0;
}

.action-btn.handle {
  background: #2D81FF;
  color: white;
}

.action-btn.call {
  background: #e6f7ff;
  color: #1890ff;
  border: 1rpx solid #91d5ff;
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

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  background: white;
  border-radius: 20rpx;
  overflow: hidden;
}

.modal-header {
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
}

.close-icon {
  font-size: 40rpx;
  color: #999;
  padding: 0 10rpx;
}

.modal-body {
  padding: 30rpx;
}

.handle-textarea {
  width: 100%;
  height: 200rpx;
  background: #f5f7fa;
  border-radius: 10rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.modal-footer {
  padding: 20rpx 30rpx 30rpx;
  display: flex;
  gap: 20rpx;
}

.modal-footer button {
  flex: 1;
  font-size: 28rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
}

.cancel-btn {
  background: #f5f7fa;
  color: #666;
}

.confirm-btn {
  background: #2D81FF;
  color: white;
}
</style>
