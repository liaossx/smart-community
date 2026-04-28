<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="活动报名"
    currentPage="/admin/pages/admin/activity-manage"
    pageBreadcrumb="管理后台 / 社区活动 / 报名管理"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">活动报名列表</text>
          <text class="overview-subtitle">统一按后台表格页展示当前活动的报名记录，并支持当前页快速筛选。</text>
        </view>

        <view class="overview-chip">
          <text class="overview-chip-label">活动 ID</text>
          <text class="overview-chip-value">{{ activityId || '-' }}</text>
        </view>
      </view>

      <view class="status-summary-bar signup-status-bar">
        <view class="status-summary-card" :class="{ active: statusFilter === '' }" @click="statusFilter = ''">
          <text class="summary-label">当前页总数</text>
          <text class="summary-value">{{ pageStats.total }}</text>
        </view>
        <view class="status-summary-card signed" :class="{ active: statusFilter === 'SIGNED' }" @click="statusFilter = 'SIGNED'">
          <text class="summary-label">已报名</text>
          <text class="summary-value">{{ pageStats.signed }}</text>
        </view>
        <view class="status-summary-card cancelled" :class="{ active: statusFilter === 'CANCELLED' }" @click="statusFilter = 'CANCELLED'">
          <text class="summary-label">已取消</text>
          <text class="summary-value">{{ pageStats.cancelled }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid signup-query-grid">
          <view class="query-field query-field-wide">
            <text class="query-label">关键词</text>
            <input
              v-model="searchQuery"
              class="query-input"
              type="text"
              placeholder="按姓名或手机号筛选当前页"
            />
          </view>

          <view class="query-field">
            <text class="query-label">报名状态</text>
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
          <button class="query-btn primary" @click="handleRefresh">刷新</button>
          <button class="query-btn secondary" @click="handleResetFilters">重置</button>
        </view>
      </view>

      <view class="table-toolbar">
        <view class="toolbar-left-group">
          <text class="toolbar-meta">活动总报名 {{ total }} 条</text>
          <text class="toolbar-meta active">当前页显示 {{ displayList.length }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">每页 {{ pageSize }} 条</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="scroll-table">
          <view class="table-head signup-table">
            <text class="table-col col-index">序号</text>
            <text class="table-col col-name">报名人</text>
            <text class="table-col col-phone">联系电话</text>
            <text class="table-col col-time">报名时间</text>
            <text class="table-col col-status">状态</text>
          </view>

          <view
            v-for="(item, index) in displayList"
            :key="item.id || `${item.userName}-${index}`"
            class="table-row signup-table"
            :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
          >
            <view class="table-col col-index">
              <text class="minor-text">{{ (pageNum - 1) * pageSize + index + 1 }}</text>
            </view>

            <view class="table-col col-name">
              <text class="primary-text">{{ item.userName || '未知用户' }}</text>
            </view>

            <view class="table-col col-phone">
              <text class="plain-text">{{ item.userPhone || '暂无电话' }}</text>
            </view>

            <view class="table-col col-time">
              <text class="minor-text">{{ formatTime(item.signupTime) }}</text>
            </view>

            <view class="table-col col-status">
              <text class="status-pill" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
            </view>
          </view>
        </view>

        <view v-if="displayList.length === 0" class="empty-state">
          <text>暂无报名记录</text>
        </view>
      </view>

      <view v-if="total > 0" class="pagination">
        <view class="page-meta">
          <text>第 {{ pageNum }} / {{ totalPages }} 页</text>
        </view>

        <view class="page-controls">
          <button class="page-btn" :disabled="pageNum <= 1" @click="handlePrevPage">上一页</button>
          <button class="page-btn" :disabled="pageNum >= totalPages" @click="handleNextPage">下一页</button>
          <view class="page-size">
            <text>每页</text>
            <picker mode="selector" :range="[10, 20, 50]" :value="pageSizeIndex" @change="handlePageSizeChange">
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
      activityId: null,
      list: [],
      total: 0,
      loading: false,
      pageNum: 1,
      pageSize: 20,
      searchQuery: '',
      statusFilter: '',
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'SIGNED', label: '已报名' },
        { value: 'CANCELLED', label: '已取消' }
      ]
    }
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.pageSize))
    },
    pageSizeIndex() {
      const options = [10, 20, 50]
      return Math.max(0, options.indexOf(this.pageSize))
    },
    statusPickerIndex() {
      return Math.max(0, this.statusOptions.findIndex(item => item.value === this.statusFilter))
    },
    currentStatusLabel() {
      const current = this.statusOptions.find(item => item.value === this.statusFilter)
      return current ? current.label : '全部状态'
    },
    pageStats() {
      return this.list.reduce((stats, item) => {
        stats.total += 1
        if (item.status === 'CANCELLED') {
          stats.cancelled += 1
        } else {
          stats.signed += 1
        }
        return stats
      }, {
        total: 0,
        signed: 0,
        cancelled: 0
      })
    },
    displayList() {
      const keyword = this.searchQuery.trim().toLowerCase()
      return this.list.filter(item => {
        const matchesStatus = !this.statusFilter || this.normalizeStatus(item.status) === this.statusFilter
        if (!matchesStatus) return false
        if (!keyword) return true
        const haystack = `${item.userName || ''} ${item.userPhone || ''}`.toLowerCase()
        return haystack.includes(keyword)
      })
    }
  },
  onLoad(options) {
    if (options.id) {
      this.activityId = options.id
      this.loadData()
    }
  },
  methods: {
    normalizeStatus(status) {
      return status === 'CANCELLED' ? 'CANCELLED' : 'SIGNED'
    },
    async loadData() {
      if (!this.activityId || this.loading) return
      this.loading = true
      try {
        const res = await request('/api/activity/signup/list', {
          params: {
            activityId: this.activityId,
            pageNum: this.pageNum,
            pageSize: this.pageSize
          }
        }, 'GET')
        const records = res.records || res.data?.records || res.data || []
        this.list = Array.isArray(records) ? records : []
        this.total = Number(res.total || res.data?.total || this.list.length || 0)
      } catch (error) {
        console.error('加载报名列表失败', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.list = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    handleRefresh() {
      this.loadData()
    },
    handleResetFilters() {
      this.searchQuery = ''
      this.statusFilter = ''
    },
    handleStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.statusFilter = this.statusOptions[index]?.value || ''
    },
    handlePrevPage() {
      if (this.pageNum <= 1) return
      this.pageNum -= 1
      this.loadData()
    },
    handleNextPage() {
      if (this.pageNum >= this.totalPages) return
      this.pageNum += 1
      this.loadData()
    },
    handlePageSizeChange(e) {
      const options = [10, 20, 50]
      const index = Number(e?.detail?.value || 0)
      this.pageSize = options[index] || 20
      this.pageNum = 1
      this.loadData()
    },
    getStatusClass(status) {
      return this.normalizeStatus(status) === 'CANCELLED' ? 'status-cancelled' : 'status-signed'
    },
    getStatusText(status) {
      return this.normalizeStatus(status) === 'CANCELLED' ? '已取消' : '已报名'
    },
    formatTime(time) {
      if (!time) return '-'
      return String(time).replace('T', ' ')
    }
  }
}
</script>

<style scoped src="../../styles/admin-table-page.css"></style>
<style scoped>
.signup-status-bar {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.status-summary-card.signed {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.status-summary-card.cancelled {
  background: linear-gradient(180deg, #fff 0%, #fff1f3 100%);
}

.signup-query-grid {
  grid-template-columns: 1.6fr 1fr;
}

.signup-table {
  grid-template-columns: 120rpx 1.2fr 1fr 1fr 160rpx;
  min-width: 1200rpx;
}

.status-pill.status-signed {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.status-cancelled {
  background: #fff1f3;
  color: #c44859;
}
</style>
