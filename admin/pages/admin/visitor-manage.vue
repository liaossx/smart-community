<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="访客审核"
    currentPage="/admin/pages/admin/visitor-manage"
    pageBreadcrumb="管理后台 / 访客审核"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">访客申请列表</text>
          <text class="overview-subtitle">统一为后台审核列表页，保留通过、拒绝和联系访客三类操作。</text>
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
          <text class="summary-label">总访问数</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card pending" :class="{ active: statusFilter === 'PENDING' }" @click="handleStatsClick('PENDING')">
          <text class="summary-label">待审核</text>
          <text class="summary-value">{{ stats.pending }}</text>
        </view>
        <view class="status-summary-card approved" :class="{ active: statusFilter === 'APPROVED' }" @click="handleStatsClick('APPROVED')">
          <text class="summary-label">已通过</text>
          <text class="summary-value">{{ stats.approved }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid">
          <view class="query-field query-field-wide">
            <text class="query-label">关键词</text>
            <input
              v-model="searchQuery"
              class="query-input"
              type="text"
              placeholder="搜索访客姓名、业主姓名"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">审核状态</text>
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
          <text class="toolbar-meta active">待审核 {{ stats.pending }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">已通过 {{ stats.approved }} 条</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="table-head">
          <text class="table-col col-visitor">访客</text>
          <text class="table-col col-phone">联系电话</text>
          <text class="table-col col-owner">访问对象</text>
          <text class="table-col col-house">房号</text>
          <text class="table-col col-time">访问时间</text>
          <text class="table-col col-reason">访问事由</text>
          <text class="table-col col-car">车牌号</text>
          <text class="table-col col-status">状态</text>
          <text class="table-col col-actions">操作</text>
        </view>

        <view
          v-for="(item, index) in visitorList"
          :key="item.id"
          class="table-row"
          :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
        >
          <view class="table-col col-visitor">
            <text class="primary-text">{{ item.visitorName || '-' }}</text>
          </view>

          <view class="table-col col-phone">
            <text class="minor-link" @click="makeCall(item.visitorPhone)">{{ item.visitorPhone || '-' }}</text>
          </view>

          <view class="table-col col-owner">
            <text class="plain-text">{{ item.ownerName || '-' }}</text>
          </view>

          <view class="table-col col-house">
            <text class="plain-text">{{ formatHouse(item) }}</text>
          </view>

          <view class="table-col col-time">
            <text class="minor-text">{{ formatTime(item.visitTime) }}</text>
          </view>

          <view class="table-col col-reason">
            <text class="desc-text">{{ item.reason || '暂无说明' }}</text>
          </view>

          <view class="table-col col-car">
            <text class="minor-text">{{ item.carNo || '无' }}</text>
          </view>

          <view class="table-col col-status">
            <text class="status-pill" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </text>
          </view>

          <view class="table-col col-actions row-actions">
            <button class="row-btn ghost" @click="makeCall(item.visitorPhone)">联系访客</button>
            <button v-if="item.status === 'PENDING'" class="row-btn secondary-warn" @click="handleReject(item)">拒绝</button>
            <button v-if="item.status === 'PENDING'" class="row-btn primary" @click="handleApprove(item)">通过</button>
          </view>
        </view>

        <view v-if="visitorList.length === 0" class="empty-state">
          <text>暂无访客申请记录</text>
        </view>
      </view>

      <view v-if="total > 0" class="pagination">
        <view class="page-meta">
          <text>第 {{ currentPage }} / {{ totalPages }} 页</text>
        </view>

        <view class="page-controls">
          <button class="page-btn" :disabled="currentPage === 1" @click="handlePrevPage">上一页</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="handleNextPage">下一页</button>
          <view class="page-size">
            <text>每页</text>
            <picker mode="selector" :range="[10, 20, 50, 100]" :value="pageSizeIndex" @change="handlePageSizeChange">
              <text class="page-size-text">{{ pageSize }} 条</text>
            </picker>
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
        { value: 'PENDING', label: '待审核' },
        { value: 'APPROVED', label: '已通过' },
        { value: 'REJECTED', label: '已拒绝' },
        { value: 'EXPIRED', label: '已过期' }
      ],
      visitorList: [],
      currentPage: 1,
      pageSize: 10,
      total: 0,
      stats: {
        total: 0,
        pending: 0,
        approved: 0
      },
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
    statusPickerIndex() {
      return Math.max(0, this.statusOptions.findIndex(item => item.value === this.statusFilter))
    },
    currentStatusLabel() {
      const current = this.statusOptions.find(item => item.value === this.statusFilter)
      return current ? current.label : '全部状态'
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
    normalizeVisitorResponse(data) {
      if (Array.isArray(data)) return { records: data, total: data.length }
      if (Array.isArray(data.records)) return { records: data.records, total: data.total || data.records.length }
      if (data.data && Array.isArray(data.data.records)) return { records: data.data.records, total: data.data.total || data.data.records.length }
      return { records: [], total: 0 }
    },
    extractTotal(data) {
      if (typeof data?.total === 'number') return data.total
      if (typeof data?.data?.total === 'number') return data.data.total
      if (Array.isArray(data?.records)) return data.records.length
      if (Array.isArray(data?.data?.records)) return data.data.records.length
      if (Array.isArray(data)) return data.length
      return 0
    },
    handleMonthChange(e) {
      const index = Number(e?.detail?.value || 0)
      const option = this.monthOptions[index]
      if (!option) return
      this.monthIndex = index
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
        const data = await request('/api/visitor/list', { params }, 'GET')
        const normalized = this.normalizeVisitorResponse(data)
        this.total = Number(normalized.total || 0)
        this.visitorList = normalized.records.map(item => ({
          id: item.id,
          visitorName: item.visitorName,
          visitorPhone: item.visitorPhone,
          ownerName: item.ownerName,
          buildingNo: item.buildingNo,
          houseNo: item.houseNo,
          visitTime: item.visitTime,
          reason: item.reason,
          carNo: item.carNo,
          status: item.status
        }))
      } catch (error) {
        console.error('加载访客列表失败', error)
        this.visitorList = []
        this.total = 0
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        const month = this.monthValue || undefined
        const [totalRes, pendingRes, approvedRes] = await Promise.all([
          request('/api/visitor/list', { params: { pageSize: 1, month } }, 'GET'),
          request('/api/visitor/list', { params: { pageSize: 1, status: 'PENDING', month } }, 'GET'),
          request('/api/visitor/list', { params: { pageSize: 1, status: 'APPROVED', month } }, 'GET')
        ])
        this.stats = {
          total: this.extractTotal(totalRes),
          pending: this.extractTotal(pendingRes),
          approved: this.extractTotal(approvedRes)
        }
      } catch (error) {
        console.error('加载统计数据失败', error)
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
    handleResetFilters() {
      this.searchQuery = ''
      this.statusFilter = ''
      this.currentPage = 1
      this.loadData()
    },
    handleStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.statusFilter = this.statusOptions[index]?.value || ''
      this.currentPage = 1
      this.loadData()
    },
    handlePrevPage() {
      if (this.currentPage <= 1) return
      this.currentPage -= 1
      this.loadData()
    },
    handleNextPage() {
      if (this.currentPage >= this.totalPages) return
      this.currentPage += 1
      this.loadData()
    },
    handlePageSizeChange(e) {
      const options = [10, 20, 50, 100]
      const index = Number(e?.detail?.value || 0)
      this.pageSize = options[index] || 10
      this.currentPage = 1
      this.loadData()
    },
    handleApprove(item) {
      uni.showModal({
        title: '通过审核',
        content: `确认允许 ${item.visitorName} 访问吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            const url = `/api/visitor/audit?id=${item.id}&status=APPROVED`
            await request(url, {}, 'PUT')
            uni.showToast({ title: '审核通过', icon: 'success' })
            this.loadData()
            this.loadStats()
          } catch (error) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },
    handleReject(item) {
      uni.showModal({
        title: '拒绝申请',
        content: `确认拒绝 ${item.visitorName} 的访问申请吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            const url = `/api/visitor/audit?id=${item.id}&status=REJECTED`
            await request(url, {}, 'PUT')
            uni.showToast({ title: '已拒绝', icon: 'none' })
            this.loadData()
            this.loadStats()
          } catch (error) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },
    makeCall(phone) {
      if (!phone) return
      uni.makePhoneCall({ phoneNumber: phone })
    },
    getStatusClass(status) {
      const map = {
        PENDING: 'status-pending',
        APPROVED: 'status-approved',
        REJECTED: 'status-rejected',
        EXPIRED: 'status-expired'
      }
      return map[status] || 'status-expired'
    },
    getStatusText(status) {
      const map = {
        PENDING: '待审核',
        APPROVED: '已通过',
        REJECTED: '已拒绝',
        EXPIRED: '已过期'
      }
      return map[status] || status || '-'
    },
    formatHouse(item) {
      if (item.buildingNo && item.houseNo) {
        return `${item.buildingNo}栋${item.houseNo}室`
      }
      return '-'
    },
    formatTime(time) {
      if (!time) return '-'
      const date = new Date(String(time).replace(' ', 'T'))
      if (Number.isNaN(date.getTime())) return String(time)
      return date.toLocaleString()
    }
  }
}
</script>

<style scoped>
.manage-container {
  --visitor-primary: #2e7cf6;
  --visitor-primary-strong: #1f5fd0;
  --visitor-line: #e7edf5;
  --visitor-text: #24384e;
  --visitor-muted: #8797aa;
  min-height: 100%;
  color: var(--visitor-text);
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
  border: 1rpx solid var(--visitor-line);
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
  color: var(--visitor-muted);
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
  color: var(--visitor-muted);
}

.month-filter-value {
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #183f68;
}

.status-summary-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.status-summary-card {
  padding: 24rpx 26rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.88);
  border: 1rpx solid var(--visitor-line);
  box-shadow: 0 10rpx 24rpx rgba(20, 50, 80, 0.05);
  animation: cardRise 320ms ease-out both;
}

.status-summary-card.active {
  border-color: rgba(46, 124, 246, 0.36);
  box-shadow: 0 16rpx 28rpx rgba(46, 124, 246, 0.12);
}

.status-summary-card.pending {
  background: linear-gradient(180deg, #fff 0%, #fff8e8 100%);
}

.status-summary-card.approved {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--visitor-muted);
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
  grid-template-columns: 1.6fr 1fr;
  gap: 18rpx;
}

.query-field,
.query-field-wide {
  min-width: 0;
}

.query-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  color: #64778c;
}

.query-input,
.query-picker {
  height: 76rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce6f2;
  background: #fbfdff;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: var(--visitor-text);
  display: flex;
  align-items: center;
}

.query-picker-text {
  font-size: 26rpx;
  color: #607387;
}

.query-actions {
  display: flex;
  gap: 12rpx;
}

.query-btn,
.row-btn,
.page-btn {
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
.row-btn.primary {
  background: linear-gradient(135deg, var(--visitor-primary) 0%, #58a3ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
}

.query-btn.secondary,
.row-btn.ghost,
.page-btn {
  background: #f5f8fc;
  color: var(--visitor-text);
  border: 1rpx solid #dce6f2;
}

.row-btn.secondary-warn {
  background: #fff3de;
  color: #cb8622;
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
  color: var(--visitor-muted);
}

.toolbar-meta.active {
  color: var(--visitor-primary-strong);
  font-weight: 600;
}

.table-panel {
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 180rpx 180rpx 180rpx 160rpx 220rpx minmax(220rpx, 1fr) 140rpx 140rpx 280rpx;
  align-items: center;
}

.table-head {
  min-height: 86rpx;
  padding: 0 18rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-bottom: 1rpx solid var(--visitor-line);
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
  color: var(--visitor-muted);
}

.primary-text,
.plain-text,
.minor-text,
.desc-text,
.minor-link {
  display: block;
  font-size: 24rpx;
}

.primary-text,
.plain-text {
  color: var(--visitor-text);
}

.primary-text {
  font-weight: 600;
}

.minor-text {
  color: #7e8fa2;
}

.minor-link {
  color: #2d74e5;
}

.desc-text {
  color: #66788b;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.status-pill.status-pending {
  background: #fff8e6;
  color: #cd8b1d;
}

.status-pill.status-approved {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.status-rejected {
  background: #fff1f3;
  color: #c44859;
}

.status-pill.status-expired {
  background: #f3f5f8;
  color: #6f7f90;
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
  color: var(--visitor-muted);
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
  color: var(--visitor-muted);
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
  color: var(--visitor-muted);
}

.page-size-text {
  display: inline-flex;
  align-items: center;
  min-height: 58rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #dce6f2;
  background: #f8fbff;
  color: var(--visitor-text);
}

.query-btn:active,
.row-btn:active,
.page-btn:active,
.status-summary-card:active {
  transform: scale(0.985);
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

@media (max-width: 1360rpx) {
  .query-panel,
  .pagination,
  .table-toolbar,
  .overview-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .status-summary-bar,
  .query-grid {
    grid-template-columns: 1fr;
  }

  .table-panel {
    overflow-x: auto;
  }

  .table-head,
  .table-row {
    min-width: 1850rpx;
  }
}
</style>
