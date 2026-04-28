<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="公告管理"
    currentPage="/admin/pages/admin/notice-manage"
    pageBreadcrumb="管理后台 / 公告管理"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">公告发布列表</text>
          <text class="overview-subtitle">统一使用后台列表页结构，保留搜索、批量操作、发布、下架与数据统计。</text>
        </view>

        <button class="primary-action-btn" @click="handleAddNotice">发布公告</button>
      </view>

      <view class="status-summary-bar">
        <view class="status-summary-card" @click="applyQuickFilter('', '')">
          <text class="summary-label">当前列表</text>
          <text class="summary-value">{{ total }}</text>
        </view>
        <view class="status-summary-card published" @click="applyQuickFilter('PUBLISHED', '')">
          <text class="summary-label">已发布</text>
          <text class="summary-value">{{ statusStats.published }}</text>
        </view>
        <view class="status-summary-card draft" @click="applyQuickFilter('DRAFT', '')">
          <text class="summary-label">草稿</text>
          <text class="summary-value">{{ statusStats.draft }}</text>
        </view>
        <view class="status-summary-card offline" @click="applyQuickFilter('OFFLINE', '')">
          <text class="summary-label">已下架</text>
          <text class="summary-value">{{ statusStats.offline }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid">
          <view class="query-field query-field-wide">
            <text class="query-label">标题关键词</text>
            <input
              v-model="filters.title"
              class="query-input"
              placeholder="搜索公告标题"
              confirm-type="search"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">发布状态</text>
            <picker mode="selector" :range="statusOptions" range-key="label" :value="statusPickerIndex" @change="handleStatusChange">
              <view class="query-picker">
                <text class="query-picker-text">{{ currentStatusLabel }}</text>
              </view>
            </picker>
          </view>

          <view class="query-field">
            <text class="query-label">置顶状态</text>
            <picker mode="selector" :range="topOptions" range-key="label" :value="topPickerIndex" @change="handleTopChange">
              <view class="query-picker">
                <text class="query-picker-text">{{ currentTopLabel }}</text>
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
          <button class="toolbar-chip" @click="testSelectAll">
            {{ isAllSelected ? '取消全选' : '全选当前页' }}
          </button>
          <text class="toolbar-meta">共 {{ total }} 条</text>
          <text v-if="selectedIds.length > 0" class="toolbar-meta active">已选 {{ selectedIds.length }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <button v-if="selectedIds.length > 0" class="toolbar-action danger" @click="handleBatchDelete">批量删除</button>
          <button v-if="selectedIds.length > 0" class="toolbar-action ghost" @click="handleBatchOffline">批量下架</button>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="table-head">
          <text class="table-col col-check">选择</text>
          <text class="table-col col-title">标题</text>
          <text class="table-col col-content">内容摘要</text>
          <text class="table-col col-top">置顶</text>
          <text class="table-col col-status">状态</text>
          <text class="table-col col-time">发布时间</text>
          <text class="table-col col-read">数据</text>
          <text class="table-col col-actions">操作</text>
        </view>

        <view
          v-for="(notice, index) in noticeList"
          :key="notice.id"
          class="table-row"
          :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
        >
          <view class="table-col col-check row-check" @click.stop="toggleSelect(notice.id)">
            <checkbox :checked="selectedIds.includes(notice.id)" color="#2D81FF" style="transform:scale(0.8)" />
          </view>

          <view class="table-col col-title">
            <text class="primary-text">{{ notice.title || '-' }}</text>
          </view>

          <view class="table-col col-content">
            <text class="desc-text">{{ notice.content || '暂无内容' }}</text>
          </view>

          <view class="table-col col-top">
            <text class="badge-pill" :class="notice.topFlag ? 'badge-top' : 'badge-plain'">
              {{ notice.topFlag ? '置顶' : '普通' }}
            </text>
          </view>

          <view class="table-col col-status">
            <text class="status-pill" :class="getStatusClass(notice.publishStatus)">
              {{ getStatusText(notice.publishStatus) }}
            </text>
          </view>

          <view class="table-col col-time">
            <text class="minor-text">{{ notice.publishTime || '未发布' }}</text>
          </view>

          <view class="table-col col-read">
            <button class="row-btn ghost" @click="handleReadStat(notice.id)">查看数据</button>
          </view>

          <view class="table-col col-actions row-actions">
            <button class="row-btn ghost" @click="handleEditNotice(notice.id)">编辑</button>
            <button v-if="notice.publishStatus !== 'PUBLISHED'" class="row-btn primary" @click="handlePublish(notice.id)">发布</button>
            <button v-if="notice.publishStatus === 'PUBLISHED'" class="row-btn secondary-warn" @click="handleOffline(notice.id)">下架</button>
            <button class="row-btn danger" @click="handleDeleteNotice(notice.id)">删除</button>
          </view>
        </view>

        <view v-if="noticeList.length === 0" class="empty-state">
          <text>暂无公告数据</text>
        </view>
      </view>

      <view v-if="total > 0" class="pagination">
        <view class="page-meta">
          <text>第 {{ currentPage }} / {{ totalPage }} 页</text>
        </view>

        <view class="page-controls">
          <button class="page-btn" :disabled="currentPage === 1" @click="prevPage">上一页</button>
          <button class="page-btn" :disabled="currentPage === totalPage" @click="nextPage">下一页</button>
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
  components: { adminSidebar },
  data() {
    return {
      showSidebar: false,
      noticeList: [],
      loading: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      selectAll: false,
      filters: {
        title: '',
        publishStatus: '',
        topFlag: ''
      },
      selectedIds: [],
      statusStats: {
        published: 0,
        draft: 0,
        offline: 0
      },
      statusOptions: [
        { label: '全部状态', value: '' },
        { label: '已发布', value: 'PUBLISHED' },
        { label: '草稿', value: 'DRAFT' },
        { label: '已下架', value: 'OFFLINE' }
      ],
      topOptions: [
        { label: '全部置顶', value: '' },
        { label: '置顶', value: 'true' },
        { label: '不置顶', value: 'false' }
      ]
    }
  },
  computed: {
    totalPage() {
      return Math.max(1, Math.ceil(this.total / this.pageSize))
    },
    pageSizeIndex() {
      const options = [10, 20, 50, 100]
      return Math.max(0, options.indexOf(this.pageSize))
    },
    isAllSelected() {
      return this.noticeList.length > 0 && this.selectedIds.length === this.noticeList.length
    },
    statusPickerIndex() {
      return Math.max(0, this.statusOptions.findIndex(item => item.value === this.filters.publishStatus))
    },
    topPickerIndex() {
      return Math.max(0, this.topOptions.findIndex(item => item.value === this.filters.topFlag))
    },
    currentStatusLabel() {
      return this.getStatusLabel(this.filters.publishStatus) || '全部状态'
    },
    currentTopLabel() {
      return this.getTopLabel(this.filters.topFlag) || '全部置顶'
    }
  },
  onLoad() {
    this.checkAdminRole()
  },
  onShow() {
    this.loadNoticeList()
  },
  methods: {
    checkAdminRole() {
      const userInfo = uni.getStorageSync('userInfo')
      if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'super_admin')) {
        uni.showToast({ title: '无权限访问', icon: 'none' })
        uni.redirectTo({ url: '/owner/pages/login/login' })
      }
    },
    normalizeNoticeList(res) {
      if (Array.isArray(res)) return { records: res, total: res.length }
      if (Array.isArray(res.records)) return { records: res.records, total: res.total || res.records.length }
      if (res.data && Array.isArray(res.data.records)) return { records: res.data.records, total: res.data.total || res.data.records.length }
      if (res.data && Array.isArray(res.data)) return { records: res.data, total: res.total || res.data.length }
      return { records: [], total: 0 }
    },
    calculateStatusStats() {
      const stats = {
        published: 0,
        draft: 0,
        offline: 0
      }
      this.noticeList.forEach(item => {
        const status = String(item.publishStatus || '').toUpperCase()
        if (status === 'PUBLISHED') stats.published += 1
        if (status === 'DRAFT') stats.draft += 1
        if (status === 'OFFLINE') stats.offline += 1
      })
      this.statusStats = stats
    },
    async loadNoticeList() {
      this.loading = true
      this.selectedIds = []
      this.selectAll = false
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          orderByColumn: 'top_flag desc, publish_time',
          isAsc: 'desc',
          ...this.filters
        }
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === null || params[key] === undefined) {
            delete params[key]
          }
        })

        const res = await request('/api/notice/admin/list', { params }, 'GET')
        const normalized = this.normalizeNoticeList(res)
        this.noticeList = normalized.records
        this.total = Number(normalized.total || 0)
        this.calculateStatusStats()
      } catch (error) {
        console.error(error)
        this.noticeList = []
        this.total = 0
        this.calculateStatusStats()
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.currentPage = 1
      this.loadNoticeList()
    },
    handleResetFilters() {
      this.filters = {
        title: '',
        publishStatus: '',
        topFlag: ''
      }
      this.currentPage = 1
      this.loadNoticeList()
    },
    applyQuickFilter(status, topFlag) {
      this.filters.publishStatus = status
      this.filters.topFlag = topFlag
      this.currentPage = 1
      this.loadNoticeList()
    },
    handleStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.filters.publishStatus = this.statusOptions[index]?.value || ''
      this.handleSearch()
    },
    handleTopChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.filters.topFlag = this.topOptions[index]?.value || ''
      this.handleSearch()
    },
    handlePageSizeChange(e) {
      const options = [10, 20, 50, 100]
      const index = Number(e?.detail?.value || 0)
      this.pageSize = options[index] || 10
      this.currentPage = 1
      this.loadNoticeList()
    },
    getStatusLabel(val) {
      const option = this.statusOptions.find(item => item.value === val)
      return option ? option.label : ''
    },
    getTopLabel(val) {
      const option = this.topOptions.find(item => item.value === val)
      return option ? option.label : ''
    },
    getStatusText(status) {
      const map = {
        PUBLISHED: '已发布',
        DRAFT: '草稿',
        OFFLINE: '已下架'
      }
      return map[String(status || '').toUpperCase()] || status || '-'
    },
    getStatusClass(status) {
      const map = {
        PUBLISHED: 'status-published',
        DRAFT: 'status-draft',
        OFFLINE: 'status-offline'
      }
      return map[String(status || '').toUpperCase()] || 'status-offline'
    },
    handleAddNotice() {
      uni.navigateTo({ url: '/admin/pages/admin/notice-edit' })
    },
    handleEditNotice(id) {
      uni.navigateTo({ url: `/admin/pages/admin/notice-edit?noticeId=${id}` })
    },
    async handlePublish(id) {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        await request(`/api/notice/${id}/publish`, { params: { adminId: userInfo.id } }, 'PUT')
        uni.showToast({ title: '发布成功' })
        this.loadNoticeList()
      } catch (error) {
        console.error('发布失败详情', error)
        uni.showToast({ title: '发布失败', icon: 'none' })
      }
    },
    async handleOffline(id) {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        await request(`/api/notice/${id}/offline`, { params: { adminId: userInfo.id } }, 'PUT')
        uni.showToast({ title: '下架成功' })
        this.loadNoticeList()
      } catch (error) {
        console.error('下架失败详情', error)
        uni.showToast({ title: '下架失败', icon: 'none' })
      }
    },
    async handleDeleteNotice(id) {
      const userInfo = uni.getStorageSync('userInfo')
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条公告吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await request(`/api/notice/${id}`, { params: { adminId: userInfo.id } }, 'DELETE')
            uni.showToast({ title: '删除成功' })
            this.loadNoticeList()
          } catch (error) {
            uni.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      })
    },
    async handleBatchDelete() {
      if (!this.selectedIds.length) return
      const userInfo = uni.getStorageSync('userInfo')
      uni.showModal({
        title: '批量删除',
        content: `确定要删除选中的 ${this.selectedIds.length} 条公告吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await request('/api/notice/batch/delete', {
              data: { noticeIds: this.selectedIds },
              params: { adminId: userInfo.id }
            }, 'POST')
            uni.showToast({ title: '批量删除成功' })
            this.loadNoticeList()
          } catch (error) {
            uni.showToast({ title: '批量删除失败', icon: 'none' })
          }
        }
      })
    },
    async handleBatchOffline() {
      if (!this.selectedIds.length) return
      const userInfo = uni.getStorageSync('userInfo')
      uni.showModal({
        title: '批量下架',
        content: `确定要下架选中的 ${this.selectedIds.length} 条公告吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await request('/api/notice/batch/offline', {
              data: { noticeIds: this.selectedIds },
              params: { adminId: userInfo.id }
            }, 'POST')
            uni.showToast({ title: '批量下架成功' })
            this.loadNoticeList()
          } catch (error) {
            uni.showToast({ title: '批量下架失败', icon: 'none' })
          }
        }
      })
    },
    async handleReadStat(id) {
      try {
        const res = await request(`/api/notice/${id}/read-stat`, {}, 'GET')
        const content = `阅读量：${res.readCount || 0}\n点赞数：${res.likeCount || 0}\n收藏数：${res.collectCount || 0}`
        uni.showModal({
          title: '公告数据统计',
          content,
          showCancel: false
        })
      } catch (error) {
        uni.showToast({ title: '获取统计失败', icon: 'none' })
      }
    },
    toggleSelect(id) {
      const index = this.selectedIds.indexOf(id)
      if (index > -1) {
        this.selectedIds.splice(index, 1)
      } else {
        this.selectedIds.push(id)
      }
      this.selectedIds = [...this.selectedIds]
      this.selectAll = this.isAllSelected
    },
    testSelectAll() {
      const shouldSelectAll = !this.isAllSelected
      this.selectAll = shouldSelectAll
      this.selectedIds = shouldSelectAll ? this.noticeList.map(item => item.id) : []
      this.$forceUpdate()
    },
    prevPage() {
      if (this.currentPage <= 1) return
      this.currentPage -= 1
      this.loadNoticeList()
    },
    nextPage() {
      if (this.currentPage >= this.totalPage) return
      this.currentPage += 1
      this.loadNoticeList()
    }
  }
}
</script>

<style scoped>
.manage-container {
  --notice-primary: #2e7cf6;
  --notice-primary-strong: #1f5fd0;
  --notice-line: #e7edf5;
  --notice-text: #24384e;
  --notice-muted: #8797aa;
  min-height: 100%;
  color: var(--notice-text);
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
  border: 1rpx solid var(--notice-line);
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
  color: var(--notice-muted);
}

.primary-action-btn,
.query-btn,
.toolbar-chip,
.toolbar-action,
.row-btn,
.page-btn {
  margin: 0;
  border: none;
  border-radius: 12rpx;
  transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
}

.primary-action-btn {
  min-height: 72rpx;
  line-height: 72rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  color: #fff;
  background: linear-gradient(135deg, var(--notice-primary) 0%, #58a3ff 100%);
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
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
  border: 1rpx solid var(--notice-line);
  box-shadow: 0 10rpx 24rpx rgba(20, 50, 80, 0.05);
  animation: cardRise 320ms ease-out both;
}

.status-summary-card.published {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.status-summary-card.draft {
  background: linear-gradient(180deg, #fff 0%, #fff8e9 100%);
}

.status-summary-card.offline {
  background: linear-gradient(180deg, #fff 0%, #f3f5f8 100%);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--notice-muted);
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
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 18rpx;
}

.query-field {
  min-width: 0;
}

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
  color: var(--notice-text);
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

.query-btn {
  height: 76rpx;
  line-height: 76rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
}

.query-btn.primary {
  background: linear-gradient(135deg, var(--notice-primary) 0%, #58a3ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
}

.query-btn.secondary,
.toolbar-chip,
.toolbar-action.ghost,
.row-btn.ghost,
.page-btn {
  background: #f5f8fc;
  color: var(--notice-text);
  border: 1rpx solid #dce6f2;
}

.toolbar-action.danger,
.row-btn.danger {
  background: #ee6374;
  color: #fff;
}

.row-btn.secondary-warn {
  background: #fff3de;
  color: #cb8622;
}

.toolbar-action,
.toolbar-chip,
.row-btn {
  min-height: 56rpx;
  line-height: 56rpx;
  padding: 0 18rpx;
  font-size: 22rpx;
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
  color: var(--notice-muted);
}

.toolbar-meta.active {
  color: var(--notice-primary-strong);
  font-weight: 600;
}

.table-panel {
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 90rpx 250rpx minmax(260rpx, 1.2fr) 140rpx 140rpx 220rpx 170rpx 340rpx;
  align-items: center;
}

.table-head {
  min-height: 86rpx;
  padding: 0 18rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-bottom: 1rpx solid var(--notice-line);
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
  color: var(--notice-muted);
}

.primary-text,
.minor-text,
.desc-text {
  display: block;
}

.primary-text {
  font-size: 24rpx;
  color: var(--notice-text);
  font-weight: 600;
}

.minor-text {
  font-size: 22rpx;
  color: #7e8fa2;
}

.desc-text {
  font-size: 24rpx;
  color: #66788b;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.badge-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.badge-pill.badge-top {
  background: #edf5ff;
  color: #2d74e5;
}

.badge-pill.badge-plain {
  background: #f5f6f8;
  color: #6f7f90;
}

.status-pill.status-published {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.status-draft {
  background: #fff8e7;
  color: #c58a1f;
}

.status-pill.status-offline {
  background: #f3f5f8;
  color: #6f7f90;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.row-btn.primary {
  background: linear-gradient(135deg, var(--notice-primary) 0%, #58a3ff 100%);
  color: #fff;
}

.loading-state,
.empty-state {
  padding: 80rpx 20rpx;
  text-align: center;
}

.loading-text,
.empty-state text {
  font-size: 28rpx;
  color: var(--notice-muted);
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
  color: var(--notice-muted);
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
  color: var(--notice-muted);
}

.page-size-text {
  display: inline-flex;
  align-items: center;
  min-height: 58rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #dce6f2;
  background: #f8fbff;
  color: var(--notice-text);
}

.primary-action-btn:active,
.query-btn:active,
.toolbar-chip:active,
.toolbar-action:active,
.row-btn:active,
.page-btn:active {
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

  .query-grid {
    grid-template-columns: 1fr;
  }

  .table-panel {
    overflow-x: auto;
  }

  .table-head,
  .table-row {
    min-width: 1650rpx;
  }
}
</style>
