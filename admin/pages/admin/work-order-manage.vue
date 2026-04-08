<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="工单管理"
    currentPage="/admin/pages/admin/work-order-manage"
  >
    <view class="manage-container">
      <!-- 统计卡片 -->
      <view class="stats-card-container">
        <view class="stats-card" @click="handleStatsClick('')">
          <text class="stats-number">{{ stats.total }}</text>
          <text class="stats-label">总工单数</text>
        </view>
        <view class="stats-card status-pending" @click="handleStatsClick('PENDING')">
          <text class="stats-number">{{ stats.pending }}</text>
          <text class="stats-label">待指派</text>
        </view>
        <view class="stats-card status-assigned" @click="handleStatsClick('ASSIGNED')">
          <text class="stats-number">{{ stats.assigned }}</text>
          <text class="stats-label">已指派</text>
        </view>
        <view class="stats-card status-processing" @click="handleStatsClick('PROCESSING')">
          <text class="stats-number">{{ stats.processing }}</text>
          <text class="stats-label">处理中</text>
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

      <!-- 筛选栏 -->
      <view class="search-filter-bar">
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

      <!-- 工单列表 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="list-container">
        <view v-for="item in workOrderList" :key="item.id" class="order-item">
          <view class="order-header">
            <text class="order-no">工单号: {{ item.orderNo || item.id }}</text>
            <text :class="['status-badge', getStatusClass(item.status)]">
              {{ getStatusText(item.status) }}
            </text>
          </view>
          <view class="order-body">
            <view class="info-row">
              <text class="label">关联报修ID:</text>
              <text class="value">{{ item.repairId }}</text>
            </view>
            <view class="info-row">
              <text class="label">优先级:</text>
              <text :class="['value', getPriorityClass(item.priority)]">
                {{ getPriorityText(item.priority) }}
              </text>
            </view>
            <view class="info-row" v-if="item.workerName">
              <text class="label">维修员:</text>
              <text class="value">{{ item.workerName }} ({{ item.workerPhone }})</text>
            </view>
            <view class="info-row">
              <text class="label">创建时间:</text>
              <text class="value">{{ formatTime(item.createTime) }}</text>
            </view>
          </view>
          <view class="order-footer" v-if="item.status === 'PENDING'">
            <button class="btn-assign" @click="openAssignDialog(item)">指派维修员</button>
          </view>
        </view>

        <view v-if="workOrderList.length === 0" class="empty-state">
          <text>暂无工单数据</text>
        </view>
      </view>

      <!-- 分页 -->
      <view v-if="total > 0" class="pagination">
        <button class="page-btn" :disabled="currentPage === 1" @click="handlePageChange(-1)">上一页</button>
        <text class="page-info">{{ currentPage }} / {{ totalPages }}</text>
        <button class="page-btn" :disabled="currentPage === totalPages" @click="handlePageChange(1)">下一页</button>
      </view>
    </view>

    <!-- 指派维修员弹窗 -->
    <view v-if="showAssignDialog" class="modal-mask" @click="closeAssignDialog">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">指派维修任务</text>
          <text class="modal-close" @click="closeAssignDialog">×</text>
        </view>
        <view class="modal-body">
          <view class="order-brief">
            <text class="brief-label">待指派工单：</text>
            <text class="brief-value">{{ currentOrder ? (currentOrder.orderNo || currentOrder.id) : '-' }}</text>
          </view>
          <view class="form-item">
            <text class="form-label">选择维修人员</text>
            <picker 
              mode="selector" 
              :range="workerList" 
              :range-key="'name'" 
              @change="handleWorkerSelect"
              class="form-picker"
            >
              <view class="picker-content">
                <text v-if="selectedWorker" class="picker-value">
                  {{ selectedWorker.name }} ({{ selectedWorker.phone }})
                </text>
                <text v-else class="picker-placeholder">请点击选择维修员</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>

          <view class="form-item">
            <text class="form-label">设置优先级</text>
            <picker
              mode="selector"
              :range="priorityOptions"
              :range-key="'label'"
              :value="priorityOptions.findIndex(opt => opt.value === assignPriority)"
              @change="handlePrioritySelect"
              class="form-picker"
            >
              <view class="picker-content">
                <text class="picker-value">{{ getPriorityText(assignPriority) }}</text>
                <text class="picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="form-tip" v-if="!workerList.length">
            <text>暂无可用维修人员数据</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeAssignDialog">取消</button>
          <button class="btn-confirm" @click="handleAssignSubmit" :loading="assigning" :disabled="!selectedWorker">
            确认指派
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
      loading: false,
      assigning: false,
      workOrderList: [],
      workerList: [],
      statusFilter: '',
      currentPage: 1,
      pageSize: 10,
      total: 0,
      stats: {
        total: 0,
        pending: 0,
        assigned: 0,
        processing: 0,
        completed: 0
      },
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'PENDING', label: '待指派' },
        { value: 'ASSIGNED', label: '已指派' },
        { value: 'PROCESSING', label: '处理中' },
        { value: 'COMPLETED', label: '已完成' }
      ],
      priorityOptions: [
        { value: 1, label: '低' },
        { value: 2, label: '中' },
        { value: 3, label: '高' },
        { value: 4, label: '紧急' }
      ],
      showAssignDialog: false,
      currentOrder: null,
      selectedWorker: null,
      assignPriority: 1,
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
  onLoad(options) {
    this.initMonthOptions()
    if (options && options.status) {
      const status = String(options.status).toUpperCase()
      const exists = this.statusOptions.some(opt => opt.value === status)
      if (exists) {
        this.statusFilter = status
      }
    }
    this.loadWorkOrders()
    this.loadStats()
    this.loadWorkers()
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
      this.loadWorkOrders()
      this.loadStats()
    },
    async loadWorkOrders() {
      this.loading = true
      try {
        const res = await request('/api/workorder/list', {
          params: {
            pageNum: this.currentPage,
            pageSize: this.pageSize,
            month: this.monthValue || undefined,
            status: this.statusFilter || undefined
          }
        }, 'GET')
        
        const data = res.data || res
        const list = data.records || []
        this.workOrderList = list.slice().sort((a, b) => {
          const diff = this.getPriorityRank(b.priority) - this.getPriorityRank(a.priority)
          if (diff !== 0) return diff
          return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime()
        })
        this.total = data.total || 0
      } catch (e) {
        console.error('加载工单失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadWorkers() {
      try {
        const res = await request('/api/user/inner/list/role', {
          params: { role: 'worker' }
        }, 'GET')
        this.workerList = res.data || res || []
      } catch (e) {
        console.error('加载维修员失败', e)
      }
    },
    async loadStats() {
      const getTotalFromRes = (res) => {
        const d = res && (res.data || res)
        return (d && (d.total ?? d.data?.total)) || 0
      }
      try {
        const month = this.monthValue || undefined
        const totalReq = request('/api/workorder/list', { params: { pageNum: 1, pageSize: 1, month } }, 'GET')
        const pendingReq = request('/api/workorder/list', { params: { pageNum: 1, pageSize: 1, status: 'PENDING', month } }, 'GET')
        const assignedReq = request('/api/workorder/list', { params: { pageNum: 1, pageSize: 1, status: 'ASSIGNED', month } }, 'GET')
        const processingReq = request('/api/workorder/list', { params: { pageNum: 1, pageSize: 1, status: 'PROCESSING', month } }, 'GET')
        const completedReq = request('/api/workorder/list', { params: { pageNum: 1, pageSize: 1, status: 'COMPLETED', month } }, 'GET')

        const [totalRes, pendingRes, assignedRes, processingRes, completedRes] = await Promise.all([
          totalReq,
          pendingReq,
          assignedReq,
          processingReq,
          completedReq
        ])

        this.stats.total = getTotalFromRes(totalRes)
        this.stats.pending = getTotalFromRes(pendingRes)
        this.stats.assigned = getTotalFromRes(assignedRes)
        this.stats.processing = getTotalFromRes(processingRes)
        this.stats.completed = getTotalFromRes(completedRes)
      } catch (e) {
        console.error('加载工单统计失败', e)
        this.stats.total = this.total || this.stats.total || 0
      }
    },
    handleStatusChange(e) {
      this.statusFilter = this.statusOptions[e.detail.value].value
      this.currentPage = 1
      this.loadWorkOrders()
    },
    handleStatsClick(status) {
      this.statusFilter = status
      this.currentPage = 1
      this.loadWorkOrders()
    },
    handlePageChange(delta) {
      this.currentPage += delta
      this.loadWorkOrders()
    },
    getStatusText(status) {
      const map = {
        'PENDING': '待指派',
        'ASSIGNED': '已指派',
        'PROCESSING': '处理中',
        'COMPLETED': '已完成'
      }
      return map[status] || status
    },
    getStatusClass(status) {
      if (!status) return ''
      return 'status-' + String(status).toLowerCase()
    },
    getPriorityText(priority) {
      const map = {
        'LOW': '低',
        'MEDIUM': '中',
        'HIGH': '高',
        'URGENT': '紧急',
        '1': '低',
        '2': '中',
        '3': '高',
        '4': '紧急'
      }
      return map[String(priority)] || priority
    },
    getPriorityRank(priority) {
      const str = String(priority).toUpperCase()
      const map = {
        'LOW': 1,
        '1': 1,
        'MEDIUM': 2,
        '2': 2,
        'HIGH': 3,
        '3': 3,
        'URGENT': 4,
        '4': 4
      }
      return map[str] || 1
    },
    getPriorityClass(priority) {
      if (!priority) return ''
      const priorityStr = String(priority).toUpperCase()
      const classMap = {
        'LOW': 'priority-low',
        '1': 'priority-low',
        'MEDIUM': 'priority-medium',
        '2': 'priority-medium',
        'HIGH': 'priority-high',
        '3': 'priority-high',
        'URGENT': 'priority-urgent',
        '4': 'priority-urgent'
      }
      return classMap[priorityStr] || ('priority-' + priorityStr.toLowerCase())
    },
    formatTime(time) {
      if (!time) return '-'
      return new Date(time).toLocaleString()
    },
    openAssignDialog(order) {
      this.currentOrder = order
      this.selectedWorker = null
      this.assignPriority = Number(order && order.priority ? order.priority : 1)
      this.showAssignDialog = true
    },
    closeAssignDialog() {
      this.showAssignDialog = false
      this.currentOrder = null
      this.selectedWorker = null
      this.assignPriority = 1
    },
    handleWorkerSelect(e) {
      this.selectedWorker = this.workerList[e.detail.value]
    },
    handlePrioritySelect(e) {
      const selected = this.priorityOptions[e.detail.value]
      if (selected) this.assignPriority = selected.value
    },
    async handleAssignSubmit() {
      if (!this.selectedWorker) {
        uni.showToast({ title: '请选择维修员', icon: 'none' })
        return
      }
      
      this.assigning = true
      const assignData = {
        orderId: this.currentOrder.id,
        workerId: this.selectedWorker.userId || this.selectedWorker.id, // 优先取 userId
        workerName: this.selectedWorker.name || this.selectedWorker.username,
        workerPhone: this.selectedWorker.phone,
        priority: this.assignPriority
      }
      console.log('--- 开始指派工单 ---')
      console.log('指派参数:', assignData)

      try {
        const res = await request('/api/workorder/admin/assign', {
          data: assignData
        }, 'POST')
        
        console.log('指派响应结果:', res)
        uni.showToast({ title: '指派成功', icon: 'success' })
        this.closeAssignDialog()
        this.loadWorkOrders()
        this.loadStats()
      } catch (e) {
        console.error('指派失败:', e)
        uni.showToast({ title: '指派失败', icon: 'none' })
      } finally {
        this.assigning = false
        console.log('--- 指派操作结束 ---')
      }
    }
  }
}
</script>

<style scoped>
.manage-container {
  padding: 30rpx;
  padding-top: 100rpx;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.stats-card-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  margin-bottom: 30rpx;
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
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  text-align: center;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  border-top: 6rpx solid #2D81FF;
}

.status-pending { border-top-color: #ff4757; }
.status-assigned { border-top-color: #ffa502; }
.status-processing { border-top-color: #2D81FF; }

.stats-number {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.stats-label {
  font-size: 24rpx;
  color: #999;
}

.search-filter-bar {
  margin-bottom: 20rpx;
}

.filter-picker {
  background: #fff;
  padding: 15rpx 30rpx;
  border-radius: 30rpx;
  display: inline-block;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.filter-picker-text {
  font-size: 28rpx;
  color: #666;
}

.list-container {
  margin-bottom: 30rpx;
}

.order-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.05);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.order-no {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.status-badge {
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.status-pending { background: #fff1f0; color: #ff4d4f; }
.status-assigned { background: #fff7e6; color: #faad14; }
.status-processing { background: #e6f7ff; color: #1890ff; }
.status-completed { background: #f6ffed; color: #52c41a; }

.order-body {
  padding: 10rpx 0;
}

.info-row {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}

.label {
  color: #999;
  width: 160rpx;
}

.value {
  color: #333;
  flex: 1;
}

.priority-high, .priority-urgent { color: #ff4d4f; font-weight: bold; }

.order-footer {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;
}

.btn-assign {
  background: #2D81FF;
  color: #fff;
  font-size: 26rpx;
  padding: 0 30rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
  margin: 0;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30rpx;
  padding: 30rpx 0;
}

.page-btn {
  font-size: 26rpx;
  height: 60rpx;
  line-height: 60rpx;
  margin: 0;
}

.page-info {
  font-size: 28rpx;
  color: #666;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4rpx);
}

.modal-content {
  background: #fff;
  width: 85%;
  max-width: 600rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.15);
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from { opacity: 0; transform: translateY(20rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  padding: 40rpx 30rpx 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 44rpx;
  color: #999;
  line-height: 1;
  padding: 10rpx;
}

.modal-body {
  padding: 30rpx 40rpx 50rpx;
}

.order-brief {
  background: #f0f7ff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 40rpx;
  display: flex;
  align-items: center;
}

.brief-label {
  font-size: 26rpx;
  color: #666;
}

.brief-value {
  font-size: 26rpx;
  font-weight: bold;
  color: #2D81FF;
}

.form-item {
  margin-bottom: 20rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.form-picker {
  border: 2rpx solid #eee;
  padding: 0 24rpx;
  border-radius: 12rpx;
  background: #fafafa;
  height: 90rpx;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.form-picker:active {
  background: #f0f0f0;
  border-color: #ddd;
}

.picker-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-value {
  font-size: 28rpx;
  color: #333;
}

.picker-placeholder {
  font-size: 28rpx;
  color: #999;
}

.picker-arrow {
  font-size: 20rpx;
  color: #ccc;
}

.form-tip {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #ff4d4f;
  text-align: center;
}

.modal-footer {
  display: flex;
  padding: 20rpx 30rpx 40rpx;
  gap: 20rpx;
}

.modal-footer button {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border: none;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #2D81FF;
  color: #fff;
}

.btn-confirm[disabled] {
  background: #a0cfff;
  opacity: 0.7;
}
</style>
