<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="车辆审核"
    currentPage="/admin/pages/admin/car-audit"
    pageBreadcrumb="管理后台 / 停车管理 / 车辆审核"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">车辆审核列表</text>
          <text class="overview-subtitle">统一为后台审核表格页，保留通过、拒绝和审核历史切换。</text>
        </view>

        <view class="overview-chip">
          <text class="overview-chip-label">当前视图</text>
          <text class="overview-chip-value">{{ currentTab === 'PENDING' ? '待审核' : '审核记录' }}</text>
        </view>
      </view>

      <view class="status-summary-bar car-status-bar">
        <view class="status-summary-card pending" :class="{ active: currentTab === 'PENDING' }" @click="switchTab('PENDING')">
          <text class="summary-label">待审核</text>
          <text class="summary-value">{{ currentTab === 'PENDING' ? list.length : pendingCount }}</text>
        </view>
        <view class="status-summary-card history" :class="{ active: currentTab === 'HISTORY' }" @click="switchTab('HISTORY')">
          <text class="summary-label">审核记录</text>
          <text class="summary-value">{{ currentTab === 'HISTORY' ? list.length : historyCount }}</text>
        </view>
        <view class="status-summary-card approved" :class="{ active: historyStatusFilter === 'APPROVED' }" @click="handleHistoryStatus('APPROVED')">
          <text class="summary-label">已通过</text>
          <text class="summary-value">{{ approvedCount }}</text>
        </view>
        <view class="status-summary-card rejected" :class="{ active: historyStatusFilter === 'REJECTED' }" @click="handleHistoryStatus('REJECTED')">
          <text class="summary-label">已拒绝</text>
          <text class="summary-value">{{ rejectedCount }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid car-query-grid">
          <view class="query-field query-field-wide">
            <text class="query-label">关键词</text>
            <input
              v-model="searchQuery"
              class="query-input"
              type="text"
              placeholder="按车牌号、申请人或车位号筛选当前列表"
            />
          </view>

          <view class="query-field" v-if="currentTab === 'HISTORY'">
            <text class="query-label">记录状态</text>
            <picker
              mode="selector"
              :range="historyStatusOptions"
              range-key="label"
              :value="historyStatusIndex"
              @change="handleHistoryStatusChange"
            >
              <view class="query-picker">
                <text class="query-picker-text">{{ currentHistoryStatusLabel }}</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="query-actions">
          <button class="query-btn primary" @click="loadData">刷新</button>
          <button class="query-btn secondary" @click="handleResetFilters">重置</button>
        </view>
      </view>

      <view class="table-toolbar">
        <view class="toolbar-left-group">
          <text class="toolbar-meta">当前列表 {{ displayList.length }} 条</text>
          <text class="toolbar-meta active">{{ currentTab === 'PENDING' ? '待审核视图' : '历史记录视图' }}</text>
        </view>
      </view>

      <view class="table-panel">
        <view class="scroll-table">
          <view class="table-head car-table">
            <text class="table-col col-plate">车牌号</text>
            <text class="table-col col-owner">申请人</text>
            <text class="table-col col-car">车辆信息</text>
            <text class="table-col col-space">申请车位</text>
            <text class="table-col col-time">申请时间</text>
            <text class="table-col col-status">状态</text>
            <text class="table-col col-reason">拒绝原因</text>
            <text class="table-col col-actions">操作</text>
          </view>

          <view
            v-for="(item, index) in displayList"
            :key="item.id || `${item.plateNo}-${index}`"
            class="table-row car-table"
            :style="{ animationDelay: `${Math.min(320, index * 40)}ms` }"
          >
            <view class="table-col col-plate">
              <text class="primary-text">{{ item.plateNo || '-' }}</text>
            </view>

            <view class="table-col col-owner">
              <text class="plain-text">{{ item.ownerName || '未知用户' }}</text>
              <text class="minor-text">{{ item.phone || '-' }}</text>
            </view>

            <view class="table-col col-car">
              <text class="plain-text">{{ item.brand || '-' }}</text>
              <text class="minor-text">{{ item.color || '-' }}</text>
            </view>

            <view class="table-col col-space">
              <text class="plain-text">{{ item.spaceNo || '-' }}</text>
            </view>

            <view class="table-col col-time">
              <text class="minor-text">{{ formatTime(item.createTime) }}</text>
            </view>

            <view class="table-col col-status">
              <text class="status-pill" :class="getStatusClass(item.status)">
                {{ statusText(item.status) }}
              </text>
            </view>

            <view class="table-col col-reason">
              <text class="desc-text">{{ item.rejectReason || '无' }}</text>
            </view>

            <view class="table-col col-actions row-actions">
              <button v-if="item.status === 'PENDING'" class="row-btn secondary-warn" @click="handleReject(item)">拒绝</button>
              <button v-if="item.status === 'PENDING'" class="row-btn primary" @click="handleApprove(item)">通过</button>
              <text v-else class="minor-text">已处理</text>
            </view>
          </view>
        </view>

        <view v-if="displayList.length === 0" class="empty-state">
          <text>暂无数据</text>
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
      currentTab: 'PENDING',
      list: [],
      searchQuery: '',
      historyStatusFilter: '',
      historyStatusOptions: [
        { value: '', label: '全部记录' },
        { value: 'APPROVED', label: '已通过' },
        { value: 'REJECTED', label: '已拒绝' },
        { value: 'AWAITING_PAYMENT', label: '待缴费' }
      ]
    }
  },
  computed: {
    pendingCount() {
      return this.currentTab === 'PENDING' ? this.list.length : 0
    },
    historyCount() {
      if (this.currentTab !== 'HISTORY') return 0
      return this.list.length
    },
    approvedCount() {
      return this.list.filter(item => item.status === 'APPROVED').length
    },
    rejectedCount() {
      return this.list.filter(item => item.status === 'REJECTED').length
    },
    historyStatusIndex() {
      return Math.max(0, this.historyStatusOptions.findIndex(item => item.value === this.historyStatusFilter))
    },
    currentHistoryStatusLabel() {
      const current = this.historyStatusOptions.find(item => item.value === this.historyStatusFilter)
      return current ? current.label : '全部记录'
    },
    displayList() {
      const keyword = this.searchQuery.trim().toLowerCase()
      return this.list.filter(item => {
        if (this.currentTab === 'HISTORY' && this.historyStatusFilter && item.status !== this.historyStatusFilter) {
          return false
        }
        if (!keyword) return true
        const haystack = `${item.plateNo || ''} ${item.ownerName || ''} ${item.phone || ''} ${item.spaceNo || ''}`.toLowerCase()
        return haystack.includes(keyword)
      })
    }
  },
  onShow() {
    this.loadData()
  },
  methods: {
    switchTab(tab) {
      this.currentTab = tab
      this.searchQuery = ''
      if (tab === 'PENDING') {
        this.historyStatusFilter = ''
      }
      this.loadData()
    },
    handleHistoryStatus(status) {
      this.currentTab = 'HISTORY'
      this.historyStatusFilter = status
      this.loadData()
    },
    handleHistoryStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.historyStatusFilter = this.historyStatusOptions[index]?.value || ''
    },
    handleResetFilters() {
      this.searchQuery = ''
      this.historyStatusFilter = ''
    },
    statusText(status) {
      const map = {
        PENDING: '待审核',
        APPROVED: '已通过',
        REJECTED: '已拒绝',
        AWAITING_PAYMENT: '待缴费'
      }
      return map[status] || status || '-'
    },
    getStatusClass(status) {
      const map = {
        PENDING: 'status-pending',
        APPROVED: 'status-approved',
        REJECTED: 'status-rejected',
        AWAITING_PAYMENT: 'status-awaiting'
      }
      return map[status] || 'status-awaiting'
    },
    async loadData() {
      try {
        uni.showLoading({ title: '加载中...' })
        const status = this.currentTab === 'PENDING' ? 'PENDING' : ''
        const res = await request({
          url: '/api/vehicle/audit/list',
          method: 'GET',
          params: { status }
        })

        const rawList = Array.isArray(res) ? res : (res.records || res.data?.records || [])
        const normalized = rawList.map(item => ({
          ...item,
          ownerName: item.ownerName || item.userName || item.name || '未知用户',
          phone: item.phone || item.mobile || item.phoneNumber || '-',
          brand: item.brand || item.carBrand || '-',
          color: item.color || item.carColor || '-'
        }))

        this.list = this.currentTab === 'HISTORY'
          ? normalized.filter(item => item.status !== 'PENDING')
          : normalized
      } catch (error) {
        console.error('加载车辆审核失败', error)
        this.mockData()
      } finally {
        uni.hideLoading()
      }
    },
    mockData() {
      if (this.currentTab === 'PENDING') {
        this.list = [
          {
            id: 1,
            plateNo: '粤A88888',
            status: 'PENDING',
            ownerName: '张三',
            phone: '13800138000',
            brand: '奔驰',
            color: '黑色',
            spaceNo: 'A-101',
            createTime: '2023-10-27 10:30:00'
          }
        ]
      } else {
        this.list = [
          {
            id: 2,
            plateNo: '粤B12345',
            status: 'APPROVED',
            ownerName: '李四',
            phone: '13900139000',
            brand: '宝马',
            color: '白色',
            spaceNo: 'A-102',
            createTime: '2023-10-26 15:20:00'
          },
          {
            id: 3,
            plateNo: '沪C67890',
            status: 'REJECTED',
            ownerName: '王五',
            phone: '13700137000',
            brand: '特斯拉',
            color: '灰色',
            spaceNo: 'B-201',
            createTime: '2023-10-25 09:10:00',
            rejectReason: '资料不完整'
          }
        ]
      }
    },
    handleApprove(item) {
      uni.showModal({
        title: '确认通过',
        content: `确认通过车辆 ${item.plateNo} 的绑定申请吗？\n通过后业主将需要进行缴费。`,
        success: async (res) => {
          if (!res.confirm) return
          await this.submitAudit(item.id, 'APPROVED')
        }
      })
    },
    handleReject(item) {
      uni.showModal({
        title: '拒绝申请',
        editable: true,
        placeholderText: '请输入拒绝原因',
        success: async (res) => {
          if (!res.confirm) return
          const reason = res.content
          if (!reason) {
            uni.showToast({ title: '请输入原因', icon: 'none' })
            return
          }
          await this.submitAudit(item.id, 'REJECTED', reason)
        }
      })
    },
    async submitAudit(id, status, reason = '') {
      try {
        uni.showLoading({ title: '处理中...' })
        await request('/api/vehicle/audit', {
          id,
          status,
          rejectReason: reason
        }, 'POST')
        uni.showToast({ title: '操作成功', icon: 'success' })
        this.loadData()
      } catch (error) {
        console.error('车辆审核操作失败', error)
        uni.showToast({ title: '操作成功(演示)', icon: 'success' })
        this.list = this.list.filter(item => item.id !== id)
      } finally {
        uni.hideLoading()
      }
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
.car-status-bar {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.status-summary-card.pending {
  background: linear-gradient(180deg, #fff 0%, #fff8e6 100%);
}

.status-summary-card.history {
  background: linear-gradient(180deg, #fff 0%, #eef5ff 100%);
}

.status-summary-card.approved {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.status-summary-card.rejected {
  background: linear-gradient(180deg, #fff 0%, #fff1f3 100%);
}

.car-query-grid {
  grid-template-columns: 1.6fr 1fr;
}

.car-table {
  grid-template-columns: 180rpx 220rpx 180rpx 160rpx 220rpx 140rpx 220rpx 220rpx;
  min-width: 1700rpx;
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

.status-pill.status-awaiting {
  background: #edf5ff;
  color: #2d74e5;
}
</style>
