<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="工单管理"
    currentPage="/admin/pages/admin/work-order-manage"
    pageBreadcrumb="管理后台 / 工单管理"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">工单数据列表</text>
          <text class="overview-subtitle">延续统一后台表格页结构，聚焦指派、状态流转与维修人员信息。</text>
        </view>

        <picker mode="selector" :range="monthOptions" range-key="label" @change="handleMonthChange">
          <view class="month-filter-chip">
            <text class="month-filter-label">统计月份</text>
            <text class="month-filter-value">{{ currentMonthLabel }}</text>
          </view>
        </picker>
      </view>

      <view class="status-summary-bar">
        <view class="status-summary-card" :class="{ active: statusFilter === '' }" @click="handleStatsClick('')">
          <text class="summary-label">全部工单</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card pending" :class="{ active: statusFilter === 'PENDING' }" @click="handleStatsClick('PENDING')">
          <text class="summary-label">待指派</text>
          <text class="summary-value">{{ stats.pending }}</text>
        </view>
        <view class="status-summary-card assigned" :class="{ active: statusFilter === 'ASSIGNED' }" @click="handleStatsClick('ASSIGNED')">
          <text class="summary-label">已指派</text>
          <text class="summary-value">{{ stats.assigned }}</text>
        </view>
        <view class="status-summary-card processing" :class="{ active: statusFilter === 'PROCESSING' }" @click="handleStatsClick('PROCESSING')">
          <text class="summary-label">处理中</text>
          <text class="summary-value">{{ stats.processing }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid">
          <view class="query-field">
            <text class="query-label">关联报修ID</text>
            <input
              v-model="repairIdFilter"
              class="query-input"
              type="text"
              placeholder="输入 repairId 进行筛选"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">工单状态</text>
            <picker
              mode="selector"
              :range="statusOptions"
              range-key="label"
              :value="statusPickerIndex"
              @change="handleStatusChange"
            >
              <view class="query-picker">
                <text class="query-picker-text">{{ currentStatusLabel }}</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="query-actions">
          <button class="query-btn primary" @click="handleSearch">查询</button>
          <button class="query-btn secondary" @click="handleResetFilters">重置</button>
        </view>
      </view>

      <view class="table-toolbar">
        <view class="toolbar-left-group">
          <text class="toolbar-meta">共 {{ total }} 条</text>
          <text v-if="repairIdFilter" class="toolbar-meta active">当前报修ID: {{ repairIdFilter }}</text>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">待指派 {{ stats.pending }} 条</text>
          <text class="toolbar-meta">已完成 {{ stats.completed }} 条</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="table-head">
          <text class="table-col col-order">工单号</text>
          <text class="table-col col-repair">关联报修</text>
          <text class="table-col col-priority">优先级</text>
          <text class="table-col col-status">状态</text>
          <text class="table-col col-worker">维修人员</text>
          <text class="table-col col-phone">联系电话</text>
          <text class="table-col col-create">创建时间</text>
          <text class="table-col col-update">最近时间</text>
          <text class="table-col col-actions">操作</text>
        </view>

        <view
          v-for="(item, index) in workOrderList"
          :key="item.id"
          class="table-row"
          :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
        >
          <view class="table-col col-order">
            <text class="primary-text">{{ item.orderNo || item.id || '-' }}</text>
          </view>

          <view class="table-col col-repair">
            <text class="plain-text">#{{ item.repairId || '-' }}</text>
          </view>

          <view class="table-col col-priority">
            <text class="priority-pill" :class="getPriorityClass(item.priority)">
              {{ getPriorityText(item.priority) }}
            </text>
          </view>

          <view class="table-col col-status">
            <text class="status-pill" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </text>
          </view>

          <view class="table-col col-worker">
            <text class="plain-text">{{ getWorkerName(item) }}</text>
          </view>

          <view class="table-col col-phone">
            <text class="minor-text">{{ getWorkerPhone(item) }}</text>
          </view>

          <view class="table-col col-create">
            <text class="minor-text">{{ formatTime(item.createTime) }}</text>
          </view>

          <view class="table-col col-update">
            <text class="minor-text">{{ formatTime(getLatestTime(item)) }}</text>
          </view>

          <view class="table-col col-actions row-actions">
            <button v-if="item.status === 'PENDING'" class="row-btn primary" @click="openAssignDialog(item)">指派维修员</button>
            <button v-else class="row-btn ghost" @click="reuseRepairFilter(item.repairId)">查看同报修</button>
          </view>
        </view>

        <view v-if="workOrderList.length === 0" class="empty-state">
          <text>暂无工单数据</text>
        </view>
      </view>

      <view v-if="total > 0" class="pagination">
        <view class="page-meta">
          <text>第 {{ currentPage }} / {{ totalPages }} 页</text>
        </view>

        <view class="page-controls">
          <button class="page-btn" :disabled="currentPage === 1" @click="handlePageChange(-1)">上一页</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="handlePageChange(1)">下一页</button>
          <view class="page-size">
            <text>每页</text>
            <picker mode="selector" :range="[10, 20, 50, 100]" :value="pageSizeIndex" @change="handlePageSizeChange">
              <text class="page-size-text">{{ pageSize }} 条</text>
            </picker>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showAssignDialog" class="detail-modal" @click="closeAssignDialog">
      <view class="detail-content" @click.stop>
        <view class="detail-header">
          <text class="detail-title">指派维修任务</text>
          <button class="close-btn" @click="closeAssignDialog">关闭</button>
        </view>

        <view class="detail-body">
          <view class="detail-item">
            <text class="detail-label">工单号:</text>
            <text class="detail-value">{{ currentOrder ? (currentOrder.orderNo || currentOrder.id) : '-' }}</text>
          </view>

          <view class="detail-item">
            <text class="detail-label">关联报修:</text>
            <text class="detail-value">#{{ currentOrder && currentOrder.repairId ? currentOrder.repairId : '-' }}</text>
          </view>

          <view class="detail-item">
            <text class="detail-label">维修人员:</text>
            <view class="detail-picker-wrap">
              <picker mode="selector" :range="workerList" range-key="displayName" @change="handleWorkerSelect">
                <view class="detail-picker">
                  <text v-if="selectedWorker" class="detail-picker-text">
                    {{ selectedWorker.displayName }}
                  </text>
                  <text v-else class="detail-picker-placeholder">请选择维修员</text>
                </view>
              </picker>
            </view>
          </view>

          <view class="detail-item">
            <text class="detail-label">优先级:</text>
            <view class="detail-picker-wrap">
              <picker
                mode="selector"
                :range="priorityOptions"
                range-key="label"
                :value="priorityPickerIndex"
                @change="handlePrioritySelect"
              >
                <view class="detail-picker">
                  <text class="detail-picker-text">{{ getPriorityText(assignPriority) }}</text>
                </view>
              </picker>
            </view>
          </view>

          <view v-if="!workerList.length" class="form-tip">
            <text>暂无可用维修人员数据</text>
          </view>

          <view class="detail-actions">
            <button class="detail-btn secondary" @click="closeAssignDialog">取消</button>
            <button class="detail-btn primary" @click="handleAssignSubmit" :loading="assigning" :disabled="!selectedWorker">
              确认指派
            </button>
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
      loading: false,
      assigning: false,
      workOrderList: [],
      workerList: [],
      repairIdFilter: '',
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
      return Math.max(1, Math.ceil(this.total / this.pageSize))
    },
    pageSizeIndex() {
      const options = [10, 20, 50, 100]
      return Math.max(0, options.indexOf(this.pageSize))
    },
    currentMonthLabel() {
      const option = this.monthOptions[this.monthIndex]
      return option ? option.label : (this.monthValue || '选择月份')
    },
    currentStatusLabel() {
      const option = this.statusOptions.find(item => item.value === this.statusFilter)
      return option ? option.label : '全部状态'
    },
    statusPickerIndex() {
      return Math.max(0, this.statusOptions.findIndex(item => item.value === this.statusFilter))
    },
    priorityPickerIndex() {
      return Math.max(0, this.priorityOptions.findIndex(item => item.value === this.assignPriority))
    }
  },
  onLoad(options) {
    this.checkAdminRole()
    this.initMonthOptions()
    this.applyRouteFilters(options)
    this.loadWorkers()
    this.refreshPage()
  },
  methods: {
    checkAdminRole() {
      const userInfo = uni.getStorageSync('userInfo')
      if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'super_admin')) {
        uni.showToast({ title: '无权限访问', icon: 'none' })
        uni.redirectTo({ url: '/owner/pages/login/login' })
      }
    },
    applyRouteFilters(options) {
      if (!options) return

      if (options.status) {
        const status = String(options.status).toUpperCase()
        if (this.statusOptions.some(item => item.value === status)) {
          this.statusFilter = status
        }
      }

      if (options.repairId !== undefined && options.repairId !== null) {
        this.repairIdFilter = String(options.repairId)
      }
    },
    initMonthOptions() {
      const now = new Date()
      const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const options = []

      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        options.push({ label: value, value })
      }

      this.monthOptions = options
      this.monthValue = current
      this.monthIndex = Math.max(0, options.findIndex(item => item.value === current))
    },
    refreshPage() {
      this.loadWorkOrders()
      this.loadStats()
    },
    handleMonthChange(e) {
      const index = Number(e?.detail?.value || 0)
      const option = this.monthOptions[index]
      if (!option) return

      this.monthIndex = index
      this.monthValue = option.value
      this.currentPage = 1
      this.refreshPage()
    },
    handleSearch() {
      this.currentPage = 1
      this.refreshPage()
    },
    handleResetFilters() {
      this.repairIdFilter = ''
      this.statusFilter = ''
      this.currentPage = 1
      this.refreshPage()
    },
    handleStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.statusFilter = this.statusOptions[index]?.value || ''
      this.currentPage = 1
      this.loadWorkOrders()
    },
    handleStatsClick(status) {
      this.statusFilter = status
      this.currentPage = 1
      this.loadWorkOrders()
    },
    handlePageChange(delta) {
      const nextPage = this.currentPage + delta
      if (nextPage < 1 || nextPage > this.totalPages) return
      this.currentPage = nextPage
      this.loadWorkOrders()
    },
    handlePageSizeChange(e) {
      const options = [10, 20, 50, 100]
      const index = Number(e?.detail?.value || 0)
      this.pageSize = options[index] || 10
      this.currentPage = 1
      this.loadWorkOrders()
    },
    getListParams(extra = {}) {
      return {
        pageNum: extra.pageNum || this.currentPage,
        pageSize: extra.pageSize || this.pageSize,
        month: this.monthValue || undefined,
        status: extra.status !== undefined ? extra.status : (this.statusFilter || undefined),
        repairId: this.repairIdFilter || undefined
      }
    },
    async loadWorkOrders() {
      this.loading = true
      try {
        const res = await request('/api/workorder/list', {
          params: this.getListParams()
        }, 'GET')

        const data = res?.data || res || {}
        const list = data.records || data.data?.records || []
        this.workOrderList = list.slice().sort((a, b) => {
          const priorityDiff = this.getPriorityRank(b.priority) - this.getPriorityRank(a.priority)
          if (priorityDiff !== 0) return priorityDiff
          return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime()
        })
        this.total = Number(data.total || data.data?.total || this.workOrderList.length || 0)
      } catch (error) {
        console.error('加载工单失败', error)
        this.workOrderList = []
        this.total = 0
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

        const rawList = res?.data || res || []
        const list = Array.isArray(rawList) ? rawList : (rawList.records || rawList.data || [])
        this.workerList = list.map(item => ({
          ...item,
          displayName: `${item.name || item.username || '未命名'}${item.phone ? ` (${item.phone})` : ''}`
        }))
      } catch (error) {
        console.error('加载维修员失败', error)
        this.workerList = []
      }
    },
    async loadStats() {
      const extractTotal = (res) => {
        const data = res?.data || res || {}
        return Number(data.total || data.data?.total || 0)
      }

      const buildParams = (status) => ({
        pageNum: 1,
        pageSize: 1,
        month: this.monthValue || undefined,
        status: status || undefined,
        repairId: this.repairIdFilter || undefined
      })

      try {
        const [totalRes, pendingRes, assignedRes, processingRes, completedRes] = await Promise.all([
          request('/api/workorder/list', { params: buildParams('') }, 'GET'),
          request('/api/workorder/list', { params: buildParams('PENDING') }, 'GET'),
          request('/api/workorder/list', { params: buildParams('ASSIGNED') }, 'GET'),
          request('/api/workorder/list', { params: buildParams('PROCESSING') }, 'GET'),
          request('/api/workorder/list', { params: buildParams('COMPLETED') }, 'GET')
        ])

        this.stats.total = extractTotal(totalRes)
        this.stats.pending = extractTotal(pendingRes)
        this.stats.assigned = extractTotal(assignedRes)
        this.stats.processing = extractTotal(processingRes)
        this.stats.completed = extractTotal(completedRes)
      } catch (error) {
        console.error('加载工单统计失败', error)
      }
    },
    getStatusText(status) {
      const map = {
        PENDING: '待指派',
        ASSIGNED: '已指派',
        PROCESSING: '处理中',
        COMPLETED: '已完成'
      }
      return map[status] || status || '-'
    },
    getStatusClass(status) {
      const map = {
        PENDING: 'status-pending',
        ASSIGNED: 'status-assigned',
        PROCESSING: 'status-processing',
        COMPLETED: 'status-completed'
      }
      return map[status] || ''
    },
    getPriorityText(priority) {
      const map = {
        LOW: '低',
        MEDIUM: '中',
        HIGH: '高',
        URGENT: '紧急',
        1: '低',
        2: '中',
        3: '高',
        4: '紧急'
      }
      return map[String(priority).toUpperCase()] || map[Number(priority)] || priority || '低'
    },
    getPriorityRank(priority) {
      const map = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        URGENT: 4,
        1: 1,
        2: 2,
        3: 3,
        4: 4
      }
      return map[String(priority).toUpperCase()] || map[Number(priority)] || 1
    },
    getPriorityClass(priority) {
      const map = {
        LOW: 'priority-low',
        MEDIUM: 'priority-medium',
        HIGH: 'priority-high',
        URGENT: 'priority-urgent',
        1: 'priority-low',
        2: 'priority-medium',
        3: 'priority-high',
        4: 'priority-urgent'
      }
      return map[String(priority).toUpperCase()] || map[Number(priority)] || 'priority-low'
    },
    getWorkerName(item) {
      return item.workerName || item.assigneeName || '-'
    },
    getWorkerPhone(item) {
      return item.workerPhone || item.assigneePhone || '-'
    },
    getLatestTime(item) {
      return item.updateTime || item.completeTime || item.finishTime || item.processTime || item.assignTime || item.startTime || item.createTime || ''
    },
    formatTime(time) {
      if (!time) return '-'
      return new Date(time).toLocaleString()
    },
    reuseRepairFilter(repairId) {
      this.repairIdFilter = repairId ? String(repairId) : ''
      this.currentPage = 1
      this.refreshPage()
    },
    openAssignDialog(order) {
      this.currentOrder = order
      this.selectedWorker = null
      this.assignPriority = Number(order?.priority || 1) || 1
      this.showAssignDialog = true
    },
    closeAssignDialog() {
      this.showAssignDialog = false
      this.currentOrder = null
      this.selectedWorker = null
      this.assignPriority = 1
    },
    handleWorkerSelect(e) {
      const index = Number(e?.detail?.value || 0)
      this.selectedWorker = this.workerList[index] || null
    },
    handlePrioritySelect(e) {
      const index = Number(e?.detail?.value || 0)
      this.assignPriority = this.priorityOptions[index]?.value || 1
    },
    async handleAssignSubmit() {
      if (!this.currentOrder) return
      if (!this.selectedWorker) {
        uni.showToast({ title: '请选择维修员', icon: 'none' })
        return
      }

      this.assigning = true
      try {
        await request('/api/workorder/admin/assign', {
          data: {
            orderId: this.currentOrder.id,
            workerId: this.selectedWorker.userId || this.selectedWorker.id,
            workerName: this.selectedWorker.name || this.selectedWorker.username,
            workerPhone: this.selectedWorker.phone,
            priority: this.assignPriority
          }
        }, 'POST')

        uni.showToast({ title: '指派成功', icon: 'success' })
        this.closeAssignDialog()
        this.refreshPage()
      } catch (error) {
        console.error('指派失败:', error)
        uni.showToast({ title: '指派失败', icon: 'none' })
      } finally {
        this.assigning = false
      }
    }
  }
}
</script>

<style scoped>
.manage-container {
  --work-primary: #2e7cf6;
  --work-primary-strong: #1f5fd0;
  --work-line: #e7edf5;
  --work-text: #24384e;
  --work-muted: #8797aa;
  --work-danger-soft: #fff1f3;
  --work-warning-soft: #fff6e9;
  --work-success-soft: #edf9f1;
  --work-info-soft: #edf5ff;
  min-height: 100%;
  color: var(--work-text);
  background:
    radial-gradient(circle at 0 0, rgba(46, 124, 246, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%);
  animation: pageFadeIn 260ms ease-out both;
}

.overview-panel,
.query-panel,
.table-toolbar,
.table-panel,
.pagination {
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid var(--work-line);
  border-radius: 22rpx;
  box-shadow: 0 16rpx 40rpx rgba(20, 50, 80, 0.06);
}

.overview-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 28rpx 30rpx;
  margin-bottom: 20rpx;
}

.overview-title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #17324a;
}

.overview-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--work-muted);
}

.month-filter-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 180rpx;
  padding: 18rpx 24rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #f7fbff 0%, #eef5ff 100%);
  border: 1rpx solid #d8e5fb;
}

.month-filter-label {
  font-size: 20rpx;
  color: var(--work-muted);
}

.month-filter-value {
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #183f68;
}

.status-summary-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.status-summary-card {
  padding: 24rpx 26rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.88);
  border: 1rpx solid var(--work-line);
  box-shadow: 0 10rpx 24rpx rgba(20, 50, 80, 0.05);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  animation: cardRise 320ms ease-out both;
}

.status-summary-card.active {
  border-color: rgba(46, 124, 246, 0.36);
  box-shadow: 0 16rpx 28rpx rgba(46, 124, 246, 0.12);
  transform: translateY(-2rpx);
}

.status-summary-card.pending {
  background: linear-gradient(180deg, #fff 0%, #fff4f6 100%);
}

.status-summary-card.assigned {
  background: linear-gradient(180deg, #fff 0%, #fff8ef 100%);
}

.status-summary-card.processing {
  background: linear-gradient(180deg, #fff 0%, #f2f7ff 100%);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--work-muted);
}

.summary-value {
  display: block;
  margin-top: 12rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #1b3248;
}

.query-panel {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
}

.query-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 18rpx;
}

.query-field {
  min-width: 0;
}

.query-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  color: #64778c;
}

.query-input,
.query-picker,
.detail-picker {
  height: 76rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce6f2;
  background: #fbfdff;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: var(--work-text);
  display: flex;
  align-items: center;
}

.query-picker-text,
.detail-picker-text {
  font-size: 26rpx;
  color: #607387;
}

.detail-picker-placeholder {
  font-size: 26rpx;
  color: #98a4af;
}

.query-actions {
  display: flex;
  gap: 12rpx;
}

.query-btn,
.row-btn,
.page-btn,
.detail-btn,
.close-btn {
  margin: 0;
  border: none;
  border-radius: 12rpx;
  transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
}

.query-btn {
  height: 76rpx;
  line-height: 76rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
}

.query-btn.primary,
.row-btn.primary,
.detail-btn.primary {
  background: linear-gradient(135deg, var(--work-primary) 0%, #58a3ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
}

.query-btn.secondary,
.row-btn.ghost,
.detail-btn.secondary,
.close-btn,
.page-btn {
  background: #f5f8fc;
  color: var(--work-text);
  border: 1rpx solid #dce6f2;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 18rpx;
}

.toolbar-left-group,
.toolbar-right-group,
.page-controls {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.toolbar-meta {
  font-size: 22rpx;
  color: var(--work-muted);
}

.toolbar-meta.active {
  color: var(--work-primary-strong);
  font-weight: 600;
}

.table-panel {
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 220rpx 160rpx 140rpx 160rpx 180rpx 180rpx 220rpx 220rpx 220rpx;
  align-items: center;
}

.table-head {
  min-height: 86rpx;
  padding: 0 18rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-bottom: 1rpx solid var(--work-line);
}

.table-row {
  min-height: 120rpx;
  padding: 0 18rpx;
  border-bottom: 1rpx solid #edf2f7;
  background: rgba(255, 255, 255, 0.95);
  animation: rowSlideIn 320ms ease-out both;
}

.table-col {
  padding: 18rpx 12rpx;
  font-size: 24rpx;
  color: var(--work-muted);
}

.primary-text,
.plain-text,
.minor-text {
  display: block;
  font-size: 24rpx;
}

.primary-text,
.plain-text {
  color: var(--work-text);
}

.primary-text {
  font-weight: 600;
}

.minor-text {
  color: #7e8fa2;
}

.status-pill,
.priority-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.status-pill.status-pending {
  background: var(--work-danger-soft);
  color: #c44859;
}

.status-pill.status-assigned {
  background: var(--work-warning-soft);
  color: #c28312;
}

.status-pill.status-processing {
  background: var(--work-info-soft);
  color: #235fb8;
}

.status-pill.status-completed {
  background: var(--work-success-soft);
  color: #2d8c59;
}

.priority-pill.priority-low {
  background: #eef7ef;
  color: #4b9b63;
}

.priority-pill.priority-medium {
  background: #fff7ea;
  color: #d18a1f;
}

.priority-pill.priority-high {
  background: #fff1f3;
  color: #d15268;
}

.priority-pill.priority-urgent {
  background: #ef5e6d;
  color: #fff;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.row-btn {
  min-height: 52rpx;
  line-height: 52rpx;
  padding: 0 18rpx;
  font-size: 22rpx;
}

.loading-state,
.empty-state {
  padding: 80rpx 20rpx;
  text-align: center;
}

.loading-text,
.empty-state text {
  font-size: 28rpx;
  color: var(--work-muted);
}

.pagination {
  margin-top: 18rpx;
  padding: 18rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.page-meta {
  font-size: 22rpx;
  color: var(--work-muted);
}

.page-btn {
  min-height: 58rpx;
  line-height: 58rpx;
  padding: 0 20rpx;
  font-size: 24rpx;
}

.page-size {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 22rpx;
  color: var(--work-muted);
}

.page-size-text {
  display: inline-flex;
  align-items: center;
  min-height: 58rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #dce6f2;
  background: #f8fbff;
  color: var(--work-text);
}

.detail-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  background: rgba(18, 34, 53, 0.52);
  animation: pageFadeIn 180ms ease-out both;
}

.detail-content {
  width: 100%;
  max-width: 760rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 28rpx 80rpx rgba(15, 35, 56, 0.22);
  animation: modalScaleIn 220ms ease-out both;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid var(--work-line);
}

.detail-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #163149;
}

.close-btn {
  min-width: 120rpx;
  min-height: 56rpx;
  line-height: 56rpx;
  font-size: 22rpx;
}

.detail-body {
  padding: 28rpx 30rpx 32rpx;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.detail-label {
  width: 150rpx;
  font-size: 25rpx;
  color: #6f8092;
}

.detail-value {
  flex: 1;
  font-size: 25rpx;
  color: var(--work-text);
  word-break: break-word;
}

.detail-picker-wrap {
  flex: 1;
}

.form-tip {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #d05768;
}

.detail-actions {
  display: flex;
  gap: 14rpx;
  margin-top: 28rpx;
}

.detail-btn {
  flex: 1;
  min-height: 68rpx;
  line-height: 68rpx;
  font-size: 24rpx;
}

.query-btn:active,
.row-btn:active,
.page-btn:active,
.detail-btn:active,
.close-btn:active,
.status-summary-card:active {
  transform: scale(0.985);
}

@media (hover: hover) {
  .status-summary-card:hover,
  .table-row:hover {
    transform: translateY(-2rpx);
    box-shadow: 0 14rpx 26rpx rgba(20, 50, 80, 0.08);
  }

  .query-input:hover,
  .query-picker:hover,
  .detail-picker:hover {
    border-color: #c7d7ea;
    background: #fff;
  }

  .query-btn.primary:hover,
  .row-btn.primary:hover,
  .detail-btn.primary:hover {
    box-shadow: 0 16rpx 28rpx rgba(46, 124, 246, 0.22);
    transform: translateY(-1rpx);
  }
}

@keyframes pageFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cardRise {
  from {
    opacity: 0;
    transform: translateY(18rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(16rpx);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes modalScaleIn {
  from {
    opacity: 0;
    transform: translateY(20rpx) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 1360rpx) {
  .query-panel,
  .pagination,
  .table-toolbar,
  .overview-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .query-grid {
    grid-template-columns: 1fr;
  }

  .table-panel {
    overflow-x: auto;
  }

  .table-head,
  .table-row {
    min-width: 1700rpx;
  }
}
</style>
