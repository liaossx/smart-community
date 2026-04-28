<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="社区活动"
    currentPage="/admin/pages/admin/activity-manage"
    pageBreadcrumb="管理后台 / 社区活动"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">社区活动列表</text>
          <text class="overview-subtitle">统一为后台活动管理表格页，保留发布、编辑、报名管理与删除操作。</text>
        </view>

        <button class="primary-action-btn" @click="handleCreate">发布新活动</button>
      </view>

      <view class="status-summary-bar">
        <view class="status-summary-card" :class="{ active: statusFilter === '' }" @click="applyQuickStatus('')">
          <text class="summary-label">全部活动</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card published" :class="{ active: statusFilter === 'PUBLISHED' }" @click="applyQuickStatus('PUBLISHED')">
          <text class="summary-label">已发布</text>
          <text class="summary-value">{{ stats.published }}</text>
        </view>
        <view class="status-summary-card online" :class="{ active: statusFilter === 'ONLINE' }" @click="applyQuickStatus('ONLINE')">
          <text class="summary-label">报名中</text>
          <text class="summary-value">{{ stats.online }}</text>
        </view>
        <view class="status-summary-card draft" :class="{ active: statusFilter === 'DRAFT' }" @click="applyQuickStatus('DRAFT')">
          <text class="summary-label">草稿</text>
          <text class="summary-value">{{ stats.draft }}</text>
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
              placeholder="搜索活动标题、地点"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">活动状态</text>
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
          <text class="toolbar-meta active">报名中 {{ stats.online }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">草稿 {{ stats.draft }} 条</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="table-head">
          <text class="table-col col-title">活动标题</text>
          <text class="table-col col-cover">封面</text>
          <text class="table-col col-time">开始时间</text>
          <text class="table-col col-location">地点</text>
          <text class="table-col col-signup">报名人数</text>
          <text class="table-col col-status">状态</text>
          <text class="table-col col-actions">操作</text>
        </view>

        <view
          v-for="(item, index) in activityList"
          :key="item.id"
          class="table-row"
          :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
        >
          <view class="table-col col-title">
            <text class="primary-text">{{ item.title || '-' }}</text>
          </view>

          <view class="table-col col-cover">
            <image :src="item.cover || '/static/default-cover.png'" mode="aspectFill" class="cover-thumb"></image>
          </view>

          <view class="table-col col-time">
            <text class="minor-text">{{ formatTime(item.startTime) }}</text>
          </view>

          <view class="table-col col-location">
            <text class="plain-text">{{ item.location || '-' }}</text>
          </view>

          <view class="table-col col-signup">
            <text class="plain-text">{{ item.signupCount }}/{{ item.maxCount || '不限' }}</text>
          </view>

          <view class="table-col col-status">
            <text class="status-pill" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </text>
          </view>

          <view class="table-col col-actions row-actions">
            <button class="row-btn ghost" @click="handleEdit(item)">编辑</button>
            <button class="row-btn primary" @click="handleViewSignups(item)">报名管理</button>
            <button class="row-btn danger" @click="handleDelete(item)">删除</button>
          </view>
        </view>

        <view v-if="activityList.length === 0" class="empty-state">
          <text>暂无活动</text>
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
      searchQuery: '',
      statusFilter: '',
      rawActivityList: [],
      activityList: [],
      total: 0,
      stats: {
        total: 0,
        published: 0,
        online: 0,
        draft: 0
      },
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'PUBLISHED', label: '已发布' },
        { value: 'ONLINE', label: '报名中' },
        { value: 'DRAFT', label: '草稿' },
        { value: 'ENDED', label: '已结束' }
      ]
    }
  },
  computed: {
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
  },
  methods: {
    normalizeActivityResponse(data) {
      if (Array.isArray(data)) return data
      if (Array.isArray(data.records)) return data.records
      if (data.data && Array.isArray(data.data.records)) return data.data.records
      if (data.data && Array.isArray(data.data)) return data.data
      return []
    },
    calculateStats(list = this.rawActivityList) {
      const stats = {
        total: list.length,
        published: 0,
        online: 0,
        draft: 0
      }
      list.forEach(item => {
        if (item.status === 'PUBLISHED') stats.published += 1
        if (item.status === 'ONLINE') stats.online += 1
        if (item.status === 'DRAFT') stats.draft += 1
      })
      this.stats = stats
    },
    applyStatusFilter() {
      const filtered = this.statusFilter
        ? this.rawActivityList.filter(item => item.status === this.statusFilter)
        : this.rawActivityList.slice()
      this.activityList = filtered
      this.total = filtered.length
    },
    async loadData() {
      this.loading = true
      try {
        const params = {
          keyword: this.searchQuery || undefined
        }
        const data = await request('/api/activity/list', { params }, 'GET')
        const list = this.normalizeActivityResponse(data)
        this.rawActivityList = list.map(item => ({
          id: item.id,
          title: item.title,
          startTime: item.startTime,
          location: item.location,
          signupCount: item.signupCount || 0,
          maxCount: item.maxCount,
          status: item.status,
          cover: item.cover || '/static/default-cover.png'
        }))
        this.calculateStats()
        this.applyStatusFilter()
      } catch (error) {
        console.error('加载活动列表失败', error)
        this.rawActivityList = []
        this.activityList = []
        this.total = 0
        this.calculateStats()
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.loadData()
    },
    handleResetFilters() {
      this.searchQuery = ''
      this.statusFilter = ''
      this.loadData()
    },
    applyQuickStatus(status) {
      this.statusFilter = status
      this.applyStatusFilter()
    },
    handleStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.statusFilter = this.statusOptions[index]?.value || ''
      this.applyStatusFilter()
    },
    handleCreate() {
      uni.navigateTo({ url: '/admin/pages/admin/activity-edit' })
    },
    handleEdit(item) {
      uni.navigateTo({ url: `/admin/pages/admin/activity-edit?id=${item.id}` })
    },
    handleViewSignups(item) {
      uni.navigateTo({ url: `/admin/pages/admin/activity-signups?id=${item.id}` })
    },
    handleDelete(item) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除该活动吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await request(`/api/activity/${item.id}`, {}, 'DELETE')
            uni.showToast({ title: '删除成功', icon: 'success' })
            this.loadData()
          } catch (error) {
            uni.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      })
    },
    getStatusClass(status) {
      const map = {
        PUBLISHED: 'status-published',
        DRAFT: 'status-draft',
        ONLINE: 'status-online',
        ENDED: 'status-ended'
      }
      return map[status] || 'status-default'
    },
    getStatusText(status) {
      const map = {
        PUBLISHED: '已发布',
        DRAFT: '草稿',
        ONLINE: '报名中',
        ENDED: '已结束'
      }
      return map[status] || status || '-'
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
  --activity-primary: #2e7cf6;
  --activity-primary-strong: #1f5fd0;
  --activity-line: #e7edf5;
  --activity-text: #24384e;
  --activity-muted: #8797aa;
  min-height: 100%;
  color: var(--activity-text);
  background:
    radial-gradient(circle at 0 0, rgba(46, 124, 246, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%);
  animation: pageFadeIn 260ms ease-out both;
}

.overview-panel,
.query-panel,
.table-toolbar,
.table-panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid var(--activity-line);
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
  color: var(--activity-muted);
}

.primary-action-btn,
.query-btn,
.row-btn {
  margin: 0;
  border: none;
  border-radius: 12rpx;
  transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
}

.primary-action-btn,
.query-btn.primary,
.row-btn.primary {
  background: linear-gradient(135deg, var(--activity-primary) 0%, #58a3ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
}

.primary-action-btn {
  min-height: 72rpx;
  line-height: 72rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
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
  border: 1rpx solid var(--activity-line);
  box-shadow: 0 10rpx 24rpx rgba(20, 50, 80, 0.05);
  animation: cardRise 320ms ease-out both;
}

.status-summary-card.active {
  border-color: rgba(46, 124, 246, 0.36);
  box-shadow: 0 16rpx 28rpx rgba(46, 124, 246, 0.12);
}

.status-summary-card.published {
  background: linear-gradient(180deg, #fff 0%, #eef5ff 100%);
}

.status-summary-card.online {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.status-summary-card.draft {
  background: linear-gradient(180deg, #fff 0%, #fff8e8 100%);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--activity-muted);
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
  color: var(--activity-text);
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

.query-btn.secondary,
.row-btn.ghost {
  background: #f5f8fc;
  color: var(--activity-text);
  border: 1rpx solid #dce6f2;
}

.row-btn.danger {
  background: #ee6374;
  color: #fff;
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
.toolbar-right-group {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.toolbar-meta {
  font-size: 22rpx;
  color: var(--activity-muted);
}

.toolbar-meta.active {
  color: var(--activity-primary-strong);
  font-weight: 600;
}

.table-panel {
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 260rpx 160rpx 220rpx 220rpx 170rpx 140rpx 320rpx;
  align-items: center;
}

.table-head {
  min-height: 86rpx;
  padding: 0 18rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-bottom: 1rpx solid var(--activity-line);
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
  color: var(--activity-muted);
}

.primary-text,
.plain-text,
.minor-text {
  display: block;
  font-size: 24rpx;
}

.primary-text,
.plain-text {
  color: var(--activity-text);
}

.primary-text {
  font-weight: 600;
}

.minor-text {
  color: #7e8fa2;
}

.cover-thumb {
  width: 110rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: #eef2f7;
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

.status-pill.status-published {
  background: #edf5ff;
  color: #2d74e5;
}

.status-pill.status-online {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.status-draft {
  background: #fff8e6;
  color: #cd8b1d;
}

.status-pill.status-ended,
.status-pill.status-default {
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
  color: var(--activity-muted);
}

.primary-action-btn:active,
.query-btn:active,
.row-btn:active,
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
    min-width: 1600rpx;
  }
}
</style>
