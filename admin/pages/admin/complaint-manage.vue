<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="投诉处理"
    currentPage="/admin/pages/admin/complaint-manage"
    pageBreadcrumb="管理后台 / 投诉处理"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">投诉工单列表</text>
          <text class="overview-subtitle">统一按后台表格页方式呈现，保留回复处理、联系业主和图片查看。</text>
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
          <text class="summary-label">总投诉数</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card pending" :class="{ active: statusFilter === 'PENDING' }" @click="handleStatsClick('PENDING')">
          <text class="summary-label">待处理</text>
          <text class="summary-value">{{ stats.pending }}</text>
        </view>
        <view class="status-summary-card processed" :class="{ active: statusFilter === 'DONE' }" @click="handleStatsClick('DONE')">
          <text class="summary-label">已处理</text>
          <text class="summary-value">{{ stats.processed }}</text>
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
              placeholder="搜索投诉内容、业主姓名"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">处理状态</text>
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
          <text class="toolbar-meta active">待处理 {{ stats.pending }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">已处理 {{ stats.processed }} 条</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="table-head">
          <text class="table-col col-type">投诉类型</text>
          <text class="table-col col-content">投诉内容</text>
          <text class="table-col col-owner">投诉人</text>
          <text class="table-col col-house">房号</text>
          <text class="table-col col-time">提交时间</text>
          <text class="table-col col-status">状态</text>
          <text class="table-col col-image">图片</text>
          <text class="table-col col-result">处理结果</text>
          <text class="table-col col-actions">操作</text>
        </view>

        <view
          v-for="(item, index) in complaintList"
          :key="item.id"
          class="table-row"
          :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
        >
          <view class="table-col col-type">
            <text class="primary-text">{{ item.type || '-' }}</text>
          </view>

          <view class="table-col col-content">
            <text class="desc-text">{{ item.content || '暂无内容' }}</text>
          </view>

          <view class="table-col col-owner">
            <text class="plain-text">{{ getOwnerText(item) }}</text>
            <text v-if="item.phone" class="minor-link" @click="makeCall(item.phone)">{{ item.phone }}</text>
          </view>

          <view class="table-col col-house">
            <text class="plain-text">{{ formatHouse(item) }}</text>
          </view>

          <view class="table-col col-time">
            <text class="minor-text">{{ formatTime(item.createTime) }}</text>
          </view>

          <view class="table-col col-status">
            <text class="status-pill" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </text>
          </view>

          <view class="table-col col-image">
            <text class="minor-text">{{ getImageCount(item.images) }} 张</text>
          </view>

          <view class="table-col col-result">
            <text class="desc-text">{{ item.result || '待回复' }}</text>
          </view>

          <view class="table-col col-actions row-actions">
            <button v-if="getImageCount(item.images) > 0" class="row-btn ghost" @click="previewImage(item.images, 0)">图片</button>
            <button class="row-btn primary" @click="openHandleModal(item)">
              {{ String(item.status) === 'PENDING' ? '处理' : '重处理' }}
            </button>
            <button v-if="item.phone" class="row-btn ghost" @click="makeCall(item.phone)">联系</button>
          </view>
        </view>

        <view v-if="complaintList.length === 0" class="empty-state">
          <text>暂无投诉记录</text>
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

      <view v-if="showHandleModal" class="detail-modal" @click="closeHandleModal">
        <view class="detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">处理投诉</text>
            <button class="close-btn" @click="closeHandleModal">关闭</button>
          </view>

          <view class="detail-body">
            <view class="detail-item">
              <text class="detail-label">投诉类型:</text>
              <text class="detail-value">{{ currentComplaint ? currentComplaint.type : '-' }}</text>
            </view>

            <view class="detail-item">
              <text class="detail-label">投诉人:</text>
              <text class="detail-value">{{ currentComplaint ? getOwnerText(currentComplaint) : '-' }}</text>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">回复内容:</text>
              <textarea
                v-model="handleResult"
                placeholder="请输入处理结果/回复内容"
                class="handle-textarea"
              ></textarea>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="closeHandleModal">取消</button>
              <button class="detail-btn primary" @click="submitHandle">确认回复</button>
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
      currentPage: 1,
      pageSize: 10,
      total: 0,
      stats: {
        total: 0,
        pending: 0,
        processed: 0
      },
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
    normalizeComplaintResponse(data) {
      if (Array.isArray(data)) return { records: data, total: data.length }
      if (Array.isArray(data.records)) return { records: data.records, total: data.total || data.records.length }
      if (data.data && Array.isArray(data.data.records)) return { records: data.data.records, total: data.data.total || data.data.records.length }
      if (Array.isArray(data.rows)) return { records: data.rows, total: data.total || data.rows.length }
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
        const data = await request('/api/complaint/list', { params }, 'GET')
        const normalized = this.normalizeComplaintResponse(data)
        this.total = Number(normalized.total || 0)
        this.complaintList = normalized.records.map(item => ({
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
          status: item.status,
          result: item.result
        }))
      } catch (error) {
        console.error('加载投诉列表失败', error)
        this.complaintList = []
        this.total = 0
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        const month = this.monthValue || undefined
        const [totalRes, pendingRes, processedRes] = await Promise.all([
          request('/api/complaint/list', { params: { pageNum: 1, pageSize: 1, month } }, 'GET'),
          request('/api/complaint/list', { params: { pageNum: 1, pageSize: 1, status: 'PENDING', month } }, 'GET'),
          request('/api/complaint/list', { params: { pageNum: 1, pageSize: 1, status: 'DONE', month } }, 'GET')
        ])
        this.stats = {
          total: this.extractTotal(totalRes),
          pending: this.extractTotal(pendingRes),
          processed: this.extractTotal(processedRes)
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
    openHandleModal(item) {
      this.currentComplaint = item
      this.handleResult = item?.result || ''
      this.showHandleModal = true
    },
    closeHandleModal() {
      this.showHandleModal = false
      this.currentComplaint = null
      this.handleResult = ''
    },
    async submitHandle() {
      if (!this.handleResult.trim()) {
        uni.showToast({ title: '请输入处理结果', icon: 'none' })
        return
      }
      uni.showLoading({ title: '提交中...' })
      try {
        const url = `/api/complaint/handle?id=${this.currentComplaint.id}&result=${encodeURIComponent(this.handleResult)}`
        await request(url, {}, 'PUT')
        uni.showToast({ title: '处理成功', icon: 'success' })
        this.closeHandleModal()
        this.loadData()
        this.loadStats()
      } catch (error) {
        console.error('处理投诉失败', error)
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
      const urls = String(images).split(',').filter(Boolean)
      if (!urls.length) return
      uni.previewImage({
        current: urls[index] || urls[0],
        urls
      })
    },
    getImageCount(images) {
      if (!images) return 0
      return String(images).split(',').filter(Boolean).length
    },
    getOwnerText(item) {
      return item.ownerName || item.userName || '匿名'
    },
    getStatusClass(status) {
      return status === 'DONE' ? 'status-processed' : 'status-pending'
    },
    getStatusText(status) {
      const map = {
        PENDING: '待处理',
        DONE: '已处理'
      }
      return map[status] || status || '-'
    },
    formatHouse(item) {
      if (item.buildingNo && item.houseNo) {
        return `${item.buildingNo}栋${item.houseNo}室`
      }
      return '未绑定房屋'
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
  --complaint-primary: #2e7cf6;
  --complaint-primary-strong: #1f5fd0;
  --complaint-line: #e7edf5;
  --complaint-text: #24384e;
  --complaint-muted: #8797aa;
  min-height: 100%;
  color: var(--complaint-text);
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
  border: 1rpx solid var(--complaint-line);
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
  color: var(--complaint-muted);
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
  color: var(--complaint-muted);
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
  border: 1rpx solid var(--complaint-line);
  box-shadow: 0 10rpx 24rpx rgba(20, 50, 80, 0.05);
  animation: cardRise 320ms ease-out both;
}

.status-summary-card.active {
  border-color: rgba(46, 124, 246, 0.36);
  box-shadow: 0 16rpx 28rpx rgba(46, 124, 246, 0.12);
}

.status-summary-card.pending {
  background: linear-gradient(180deg, #fff 0%, #fff4f6 100%);
}

.status-summary-card.processed {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--complaint-muted);
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
.handle-textarea {
  border-radius: 14rpx;
  border: 1rpx solid #dce6f2;
  background: #fbfdff;
  font-size: 26rpx;
  color: var(--complaint-text);
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
  background: linear-gradient(135deg, var(--complaint-primary) 0%, #58a3ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
}

.query-btn.secondary,
.row-btn.ghost,
.page-btn,
.detail-btn.secondary,
.close-btn {
  background: #f5f8fc;
  color: var(--complaint-text);
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
  color: var(--complaint-muted);
}

.toolbar-meta.active {
  color: var(--complaint-primary-strong);
  font-weight: 600;
}

.table-panel {
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 170rpx minmax(260rpx, 1.2fr) 220rpx 170rpx 220rpx 140rpx 120rpx minmax(220rpx, 1fr) 260rpx;
  align-items: center;
}

.table-head {
  min-height: 86rpx;
  padding: 0 18rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-bottom: 1rpx solid var(--complaint-line);
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
  color: var(--complaint-muted);
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
  color: var(--complaint-text);
}

.primary-text {
  font-weight: 600;
}

.minor-text {
  color: #7e8fa2;
}

.minor-link {
  margin-top: 6rpx;
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
  background: #fff1f3;
  color: #c44859;
}

.status-pill.status-processed {
  background: #edf9f1;
  color: #2d8c59;
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
  color: var(--complaint-muted);
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
  color: var(--complaint-muted);
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
  color: var(--complaint-muted);
}

.page-size-text {
  display: inline-flex;
  align-items: center;
  min-height: 58rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #dce6f2;
  background: #f8fbff;
  color: var(--complaint-text);
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
  border-bottom: 1rpx solid var(--complaint-line);
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
  color: var(--complaint-text);
}

.handle-textarea {
  width: 100%;
  min-height: 220rpx;
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
    min-width: 1950rpx;
  }
}
</style>
