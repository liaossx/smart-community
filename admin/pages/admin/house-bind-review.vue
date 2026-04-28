<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="房屋绑定审核"
    currentPage="/admin/pages/admin/house-bind-review"
    pageBreadcrumb="管理后台 / 房屋绑定审核"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">房屋绑定申请列表</text>
          <text class="overview-subtitle">统一为后台审核表格页，保留通过、驳回和驳回原因记录。</text>
        </view>
      </view>

      <view class="status-summary-bar">
        <view class="status-summary-card" :class="{ active: statusFilter === '' }" @click="applyQuickStatus('')">
          <text class="summary-label">全部申请</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card pending" :class="{ active: statusFilter === 'PENDING' }" @click="applyQuickStatus('PENDING')">
          <text class="summary-label">待审核</text>
          <text class="summary-value">{{ stats.pending }}</text>
        </view>
        <view class="status-summary-card approved" :class="{ active: statusFilter === 'APPROVED' }" @click="applyQuickStatus('APPROVED')">
          <text class="summary-label">已通过</text>
          <text class="summary-value">{{ stats.approved }}</text>
        </view>
        <view class="status-summary-card rejected" :class="{ active: statusFilter === 'REJECTED' }" @click="applyQuickStatus('REJECTED')">
          <text class="summary-label">已驳回</text>
          <text class="summary-value">{{ stats.rejected }}</text>
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
              placeholder="搜索姓名/手机号/房号"
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
          <text class="toolbar-meta">已驳回 {{ stats.rejected }} 条</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="table-head">
          <text class="table-col col-name">申请人</text>
          <text class="table-col col-phone">手机号</text>
          <text class="table-col col-house">房屋</text>
          <text class="table-col col-identity">身份</text>
          <text class="table-col col-time">申请时间</text>
          <text class="table-col col-status">状态</text>
          <text class="table-col col-reason">驳回原因</text>
          <text class="table-col col-actions">操作</text>
        </view>

        <view
          v-for="(item, index) in requestList"
          :key="item.id"
          class="table-row"
          :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
        >
          <view class="table-col col-name">
            <text class="primary-text">{{ item.realName || '-' }}</text>
          </view>

          <view class="table-col col-phone">
            <text class="minor-text">{{ item.phone || '-' }}</text>
          </view>

          <view class="table-col col-house">
            <text class="plain-text">{{ formatHouse(item) }}</text>
          </view>

          <view class="table-col col-identity">
            <text class="plain-text">{{ getIdentityText(item.identityType) }}</text>
          </view>

          <view class="table-col col-time">
            <text class="minor-text">{{ formatTime(item.applyTime) }}</text>
          </view>

          <view class="table-col col-status">
            <text class="status-pill" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </text>
          </view>

          <view class="table-col col-reason">
            <text class="desc-text">{{ item.rejectReason || '无' }}</text>
          </view>

          <view class="table-col col-actions row-actions">
            <button v-if="item.status === 'PENDING'" class="row-btn secondary-warn" @click="openReject(item)">驳回</button>
            <button v-if="item.status === 'PENDING'" class="row-btn primary" @click="confirmApprove(item)">通过</button>
          </view>
        </view>

        <view v-if="requestList.length === 0" class="empty-state">
          <text>暂无绑定申请</text>
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

      <view v-if="showRejectModal" class="detail-modal" @click="closeReject">
        <view class="detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">驳回申请</text>
            <button class="close-btn" @click="closeReject">关闭</button>
          </view>

          <view class="detail-body">
            <view class="detail-item">
              <text class="detail-label">申请人:</text>
              <text class="detail-value">{{ currentItem ? currentItem.realName : '-' }}</text>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">驳回原因:</text>
              <textarea
                class="modal-textarea"
                v-model="rejectReason"
                placeholder="请输入驳回原因"
                maxlength="200"
              ></textarea>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="closeReject">取消</button>
              <button class="detail-btn primary" @click="submitReject">确定</button>
            </view>
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
  components: { adminSidebar },
  data() {
    return {
      showSidebar: false,
      loading: false,
      searchQuery: '',
      statusFilter: 'PENDING',
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'PENDING', label: '待审核' },
        { value: 'APPROVED', label: '已通过' },
        { value: 'REJECTED', label: '已驳回' }
      ],
      requestList: [],
      currentPage: 1,
      pageSize: 10,
      total: 0,
      stats: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      },
      showRejectModal: false,
      rejectReason: '',
      currentItem: null
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
    statusPickerIndex() {
      return Math.max(0, this.statusOptions.findIndex(item => item.value === this.statusFilter))
    },
    currentStatusLabel() {
      const current = this.statusOptions.find(item => item.value === this.statusFilter)
      return current ? current.label : '全部状态'
    }
  },
  onShow() {
    this.loadData()
    this.loadStats()
  },
  methods: {
    handleSearch() {
      this.currentPage = 1
      this.loadData()
    },
    handleResetFilters() {
      this.searchQuery = ''
      this.statusFilter = 'PENDING'
      this.currentPage = 1
      this.loadData()
    },
    applyQuickStatus(status) {
      this.statusFilter = status
      this.currentPage = 1
      this.loadData()
    },
    handleStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.statusFilter = this.statusOptions[index]?.value || ''
      this.currentPage = 1
      this.loadData()
    },
    extractTotal(data) {
      if (typeof data?.total === 'number') return data.total
      if (typeof data?.data?.total === 'number') return data.data.total
      if (Array.isArray(data?.records)) return data.records.length
      if (Array.isArray(data?.data?.records)) return data.data.records.length
      if (Array.isArray(data)) return data.length
      return 0
    },
    async loadData() {
      this.loading = true
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          keyword: this.searchQuery || undefined,
          status: this.statusFilter || undefined
        }
        const res = await request('/api/admin/house/bind-requests', { params }, 'GET')
        const page = Array.isArray(res?.records) || Array.isArray(res?.data?.records) ? (res?.data?.records ? res.data : res) : (res?.data || res)
        const records = Array.isArray(page?.records) ? page.records : (Array.isArray(res) ? res : [])
        const total = page?.total ?? res?.total ?? records.length ?? 0

        this.requestList = records.map(item => ({
          id: item?.id,
          userId: item?.userId,
          username: item?.username,
          realName: item?.realName,
          phone: item?.phone,
          communityName: item?.communityName,
          buildingNo: item?.buildingNo,
          houseNo: item?.houseNo,
          identityType: item?.identityType ?? item?.type,
          status: item?.status,
          applyTime: item?.applyTime,
          rejectReason: item?.rejectReason
        }))
        this.total = Number(total) || 0
      } catch (error) {
        console.error('加载绑定申请失败', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.requestList = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
          request('/api/admin/house/bind-requests', { params: { pageNum: 1, pageSize: 1 } }, 'GET'),
          request('/api/admin/house/bind-requests', { params: { pageNum: 1, pageSize: 1, status: 'PENDING' } }, 'GET'),
          request('/api/admin/house/bind-requests', { params: { pageNum: 1, pageSize: 1, status: 'APPROVED' } }, 'GET'),
          request('/api/admin/house/bind-requests', { params: { pageNum: 1, pageSize: 1, status: 'REJECTED' } }, 'GET')
        ])
        this.stats = {
          total: this.extractTotal(totalRes),
          pending: this.extractTotal(pendingRes),
          approved: this.extractTotal(approvedRes),
          rejected: this.extractTotal(rejectedRes)
        }
      } catch (error) {
        console.error('加载绑定统计失败', error)
      }
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
    confirmApprove(item) {
      if (!item?.id) return
      uni.showModal({
        title: '确认通过',
        content: '确认通过该房屋绑定申请吗？',
        success: async (res) => {
          if (!res.confirm) return
          uni.showLoading({ title: '提交中...' })
          try {
            await request(`/api/admin/house/bind-requests/${item.id}/approve`, {}, 'PUT')
            uni.showToast({ title: '已通过', icon: 'success' })
            this.loadData()
            this.loadStats()
          } catch (error) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    openReject(item) {
      this.currentItem = item
      this.rejectReason = ''
      this.showRejectModal = true
    },
    closeReject() {
      this.showRejectModal = false
      this.currentItem = null
      this.rejectReason = ''
    },
    async submitReject() {
      if (!this.currentItem?.id) return
      if (!this.rejectReason.trim()) {
        uni.showToast({ title: '请输入驳回原因', icon: 'none' })
        return
      }
      uni.showLoading({ title: '提交中...' })
      try {
        await request(
          `/api/admin/house/bind-requests/${this.currentItem.id}/reject`,
          { data: { reason: this.rejectReason } },
          'PUT'
        )
        uni.showToast({ title: '已驳回', icon: 'success' })
        this.closeReject()
        this.loadData()
        this.loadStats()
      } catch (error) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    getStatusText(status) {
      switch (status) {
        case 'PENDING': return '待审核'
        case 'APPROVED': return '已通过'
        case 'REJECTED': return '已驳回'
        default: return status || '-'
      }
    },
    getStatusClass(status) {
      switch (status) {
        case 'PENDING': return 'status-pending'
        case 'APPROVED': return 'status-approved'
        case 'REJECTED': return 'status-rejected'
        default: return 'status-rejected'
      }
    },
    getIdentityText(type) {
      switch (type) {
        case 'OWNER': return '业主'
        case 'FAMILY': return '家属'
        case 'TENANT': return '租户'
        default: return type || '-'
      }
    },
    formatHouse(item) {
      const community = item?.communityName ? `${item.communityName} ` : ''
      const building = item?.buildingNo ? `${item.buildingNo}` : ''
      const house = item?.houseNo ? `${item.houseNo}` : ''
      return `${community}${building}${house}`.trim() || '-'
    },
    formatTime(str) {
      if (!str) return '-'
      const date = new Date(String(str).replace(' ', 'T'))
      if (Number.isNaN(date.getTime())) return String(str)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

<style scoped>
.manage-container {
  --bind-primary: #2e7cf6;
  --bind-primary-strong: #1f5fd0;
  --bind-line: #e7edf5;
  --bind-text: #24384e;
  --bind-muted: #8797aa;
  min-height: 100%;
  color: var(--bind-text);
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
  border: 1rpx solid var(--bind-line);
  border-radius: 22rpx;
  box-shadow: 0 16rpx 40rpx rgba(20, 50, 80, 0.06);
}

.overview-panel {
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
  color: var(--bind-muted);
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
  border: 1rpx solid var(--bind-line);
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

.status-summary-card.rejected {
  background: linear-gradient(180deg, #fff 0%, #fff1f3 100%);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--bind-muted);
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
.query-picker,
.modal-textarea {
  border-radius: 14rpx;
  border: 1rpx solid #dce6f2;
  background: #fbfdff;
  font-size: 26rpx;
  color: var(--bind-text);
}

.query-input,
.query-picker {
  height: 76rpx;
  padding: 0 24rpx;
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
  background: linear-gradient(135deg, var(--bind-primary) 0%, #58a3ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
}

.query-btn.secondary,
.page-btn,
.detail-btn.secondary,
.close-btn {
  background: #f5f8fc;
  color: var(--bind-text);
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
  color: var(--bind-muted);
}

.toolbar-meta.active {
  color: var(--bind-primary-strong);
  font-weight: 600;
}

.table-panel {
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 180rpx 160rpx 260rpx 150rpx 180rpx 140rpx minmax(220rpx, 1fr) 220rpx;
  align-items: center;
}

.table-head {
  min-height: 86rpx;
  padding: 0 18rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-bottom: 1rpx solid var(--bind-line);
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
  color: var(--bind-muted);
}

.primary-text,
.plain-text,
.minor-text,
.desc-text {
  display: block;
  font-size: 24rpx;
}

.primary-text,
.plain-text {
  color: var(--bind-text);
}

.primary-text {
  font-weight: 600;
}

.minor-text {
  color: #7e8fa2;
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
  color: var(--bind-muted);
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
  color: var(--bind-muted);
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
  color: var(--bind-muted);
}

.page-size-text {
  display: inline-flex;
  align-items: center;
  min-height: 58rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #dce6f2;
  background: #f8fbff;
  color: var(--bind-text);
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
}

.detail-content {
  width: 100%;
  max-width: 760rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 28rpx 80rpx rgba(15, 35, 56, 0.22);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid var(--bind-line);
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

.detail-item-block {
  display: block;
}

.detail-label {
  width: 150rpx;
  font-size: 25rpx;
  color: #6f8092;
}

.detail-value {
  flex: 1;
  font-size: 25rpx;
  color: var(--bind-text);
}

.modal-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 20rpx;
  box-sizing: border-box;
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
  .table-toolbar {
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
    min-width: 1700rpx;
  }
}
</style>
