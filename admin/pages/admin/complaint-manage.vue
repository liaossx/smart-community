<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="投诉处理"
    currentPage="/admin/pages/admin/complaint-manage"
  >
    <view class="manage-container">
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
              <text class="item-title">{{ item.type }}</text>
              <text class="status-tag" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
            </view>
            <view class="item-content">
              <text class="content-text">{{ item.content }}</text>
            </view>
            <view class="item-info">
              <view class="info-row">
                <text class="label">投诉人：</text>
                <text class="value">{{ item.ownerName }} ({{ item.buildingNo }}{{ item.houseNo }})</text>
              </view>
              <view class="info-row">
                <text class="label">时间：</text>
                <text class="value">{{ formatTime(item.createTime) }}</text>
              </view>
            </view>
            
            <view class="item-footer">
              <button 
                v-if="item.status === 'pending'" 
                class="action-btn handle" 
                @click="openHandleModal(item)"
              >
                立即处理
              </button>
              <button 
                v-else 
                class="action-btn detail" 
                @click="viewDetail(item)"
              >
                查看详情
              </button>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text>暂无投诉记录</text>
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
        { value: 'pending', label: '待处理' },
        { value: 'processed', label: '已处理' }
      ],
      complaintList: [],
      
      // 处理弹窗
      showHandleModal: false,
      currentComplaint: null,
      handleResult: ''
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
        const data = await request('/api/complaint/list', { params }, 'GET')
        
        this.complaintList = (data.records || []).map(item => ({
          id: item.id,
          type: item.type,
          content: item.content,
          ownerName: item.ownerName,
          buildingNo: item.buildingNo,
          houseNo: item.houseNo,
          createTime: item.createTime,
          status: item.status, // pending/processed
          result: item.result
        }))
      } catch (e) {
        console.error('加载投诉列表失败', e)
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
    
    openHandleModal(item) {
      this.currentComplaint = item
      this.handleResult = ''
      this.showHandleModal = true
    },
    
    closeHandleModal() {
      this.showHandleModal = false
      this.currentComplaint = null
    },
    
    viewDetail(item) {
      uni.showModal({
        title: '投诉详情',
        content: `投诉内容：${item.content}\n\n处理结果：${item.result || '暂无'}`,
        showCancel: false
      })
    },
    
    async submitHandle() {
      if (!this.handleResult) {
        uni.showToast({ title: '请输入处理结果', icon: 'none' })
        return
      }
      
      uni.showLoading({ title: '提交中...' })
      try {
        // 调用处理接口
        await request('/api/complaint/handle', {
          id: this.currentComplaint.id,
          result: this.handleResult
        }, 'PUT')
        
        // 本地更新状态
        const item = this.complaintList.find(i => i.id === this.currentComplaint.id)
        if (item) {
          item.status = 'processed'
          item.result = this.handleResult
        }
        
        uni.showToast({ title: '处理成功', icon: 'success' })
        this.closeHandleModal()
      } catch (e) {
        console.error('处理投诉失败', e)
        uni.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    
    getStatusClass(status) {
      return {
        'status-pending': status === 'pending',
        'status-processed': status === 'processed'
      }
    },
    
    getStatusText(status) {
      const map = {
        'pending': '待处理',
        'processed': '已处理'
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
  align-items: center;
  margin-bottom: 20rpx;
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
}

.item-info {
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 10rpx;
  font-size: 26rpx;
  color: #999;
}

.info-row .label {
  width: 120rpx;
}

.item-footer {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 20rpx;
  text-align: right;
}

.action-btn {
  display: inline-block;
  font-size: 26rpx;
  padding: 10rpx 30rpx;
  border-radius: 30rpx;
  margin-left: 20rpx;
}

.action-btn.handle {
  background: #2D81FF;
  color: white;
}

.action-btn.detail {
  background: #f0f2f5;
  color: #666;
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