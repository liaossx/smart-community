<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="费用管理"
    currentPage="/admin/pages/admin/fee-manage"
    pageBreadcrumb="管理后台 / 费用管理"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">费用账单列表</text>
          <text class="overview-subtitle">统一成后台数据表格页，保留生成账单、单条催缴、批量催缴与金额统计。</text>
        </view>

        <view class="overview-actions">
          <button class="ghost-action-btn" @click="handleBatchRemind">一键催缴</button>
          <button class="primary-action-btn" @click="openGenerateModal">生成账单</button>
        </view>
      </view>

      <view class="status-summary-bar">
        <view class="status-summary-card" :class="{ active: typeFilter === 'all' }" @click="handleStatsClick('all')">
          <text class="summary-label">总账单数</text>
          <text class="summary-value">{{ countStats.total }}</text>
        </view>
        <view class="status-summary-card unpaid" :class="{ active: typeFilter === 'unpaid' }" @click="handleStatsClick('unpaid')">
          <text class="summary-label">待缴费</text>
          <text class="summary-value">{{ countStats.unpaid }}</text>
        </view>
        <view class="status-summary-card paid" :class="{ active: typeFilter === 'paid' }" @click="handleStatsClick('paid')">
          <text class="summary-label">已缴费</text>
          <text class="summary-value">{{ countStats.paid }}</text>
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
              placeholder="搜索房号、业主姓名"
              confirm-type="search"
              @confirm="onSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">费用状态</text>
            <picker mode="selector" :range="filterTabs" range-key="label" :value="tabPickerIndex" @change="handleTabPickerChange">
              <view class="query-picker">
                <text class="query-picker-text">{{ currentTabLabel }}</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="query-actions">
          <button class="query-btn primary" @click="onSearch">查询</button>
          <button class="query-btn secondary" @click="handleResetFilters">重置</button>
        </view>
      </view>

      <view class="table-toolbar">
        <view class="toolbar-left-group">
          <text class="toolbar-meta">共 {{ total }} 条</text>
          <text class="toolbar-meta">本月应收 ¥{{ stats.totalAmount }}</text>
          <text class="toolbar-meta active">已收 ¥{{ stats.paidAmount }}</text>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">缴费率 {{ stats.rate }}%</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="table-head">
          <text class="table-col col-name">账单名称</text>
          <text class="table-col col-owner">业主</text>
          <text class="table-col col-house">房号</text>
          <text class="table-col col-period">账单周期</text>
          <text class="table-col col-deadline">截止日期</text>
          <text class="table-col col-amount">金额</text>
          <text class="table-col col-remind">催缴次数</text>
          <text class="table-col col-status">状态</text>
          <text class="table-col col-actions">操作</text>
        </view>

        <view
          v-for="(item, index) in feeList"
          :key="item.id"
          class="table-row"
          :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
        >
          <view class="table-col col-name">
            <text class="primary-text">{{ item.feeName }}</text>
          </view>

          <view class="table-col col-owner">
            <text class="plain-text">{{ item.ownerName || '-' }}</text>
          </view>

          <view class="table-col col-house">
            <text class="plain-text">{{ formatHouse(item) }}</text>
          </view>

          <view class="table-col col-period">
            <text class="minor-text">{{ item.period || '-' }}</text>
          </view>

          <view class="table-col col-deadline">
            <text class="minor-text">{{ item.deadline || '-' }}</text>
          </view>

          <view class="table-col col-amount">
            <text class="amount-text">¥{{ formatAmount(item.amount) }}</text>
          </view>

          <view class="table-col col-remind">
            <text class="minor-text">{{ item.remindCount || 0 }} 次</text>
          </view>

          <view class="table-col col-status">
            <text class="status-pill" :class="item.status">
              {{ item.status === 'paid' ? '已缴费' : '待缴费' }}
            </text>
          </view>

          <view class="table-col col-actions row-actions">
            <button v-if="item.status === 'unpaid'" class="row-btn danger" @click="handleRemind(item)">催缴</button>
            <text v-else class="row-note">无需催缴</text>
          </view>
        </view>

        <view v-if="feeList.length === 0" class="empty-state">
          <text>暂无账单记录</text>
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

      <view class="stats-footer">
        <view class="footer-stat-item">
          <text class="footer-label">本月应收</text>
          <text class="footer-value">¥{{ stats.totalAmount }}</text>
        </view>
        <view class="footer-stat-item">
          <text class="footer-label">已收金额</text>
          <text class="footer-value highlight">¥{{ stats.paidAmount }}</text>
        </view>
        <view class="footer-stat-item">
          <text class="footer-label">缴费率</text>
          <text class="footer-value">{{ stats.rate }}%</text>
        </view>
      </view>

      <view class="detail-modal" v-if="showGenerateModal" @click="closeGenerateModal">
        <view class="detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">生成本期账单</text>
            <button class="close-btn" @click="closeGenerateModal">关闭</button>
          </view>

          <view class="detail-body">
            <view class="detail-item">
              <text class="detail-label">账单月份:</text>
              <view class="detail-picker-wrap">
                <picker mode="date" fields="month" :value="generateForm.month" @change="onMonthChange">
                  <view class="detail-picker">
                    <text class="detail-picker-text">{{ generateForm.month || '请选择月份' }}</text>
                  </view>
                </picker>
              </view>
            </view>

            <view class="detail-item">
              <text class="detail-label">费用类型:</text>
              <view class="detail-picker-wrap">
                <picker :range="feeTypes" range-key="label" @change="onFeeTypeChange">
                  <view class="detail-picker">
                    <text class="detail-picker-text">{{ generateForm.feeTypeLabel || '请选择类型' }}</text>
                  </view>
                </picker>
              </view>
            </view>

            <view class="detail-item">
              <text class="detail-label">截止日期:</text>
              <view class="detail-picker-wrap">
                <picker mode="date" :value="generateForm.deadline" @change="onDeadlineChange">
                  <view class="detail-picker">
                    <text class="detail-picker-text">{{ generateForm.deadline || '请选择日期' }}</text>
                  </view>
                </picker>
              </view>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="closeGenerateModal">取消</button>
              <button class="detail-btn primary" @click="submitGenerateBill">确认生成</button>
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
      typeFilter: 'all',
      loading: false,
      feeList: [],
      filterTabs: [
        { label: '全部', value: 'all' },
        { label: '待缴费', value: 'unpaid' },
        { label: '已缴费', value: 'paid' }
      ],
      stats: {
        totalAmount: 0,
        paidAmount: 0,
        rate: 0
      },
      countStats: {
        total: 0,
        unpaid: 0,
        paid: 0
      },
      showGenerateModal: false,
      generateForm: {
        month: '',
        feeType: 'wuye',
        feeTypeLabel: '物业费',
        deadline: ''
      },
      feeTypes: [
        { label: '物业费', value: 'wuye' },
        { label: '停车费', value: 'parking' },
        { label: '水费', value: 'water' },
        { label: '电费', value: 'electric' }
      ],
      currentPage: 1,
      pageSize: 10,
      total: 0
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
    tabPickerIndex() {
      return Math.max(0, this.filterTabs.findIndex(item => item.value === this.typeFilter))
    },
    currentTabLabel() {
      const current = this.filterTabs.find(item => item.value === this.typeFilter)
      return current ? current.label : '全部'
    }
  },
  onLoad() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    this.generateForm.month = `${year}-${month}`
  },
  onShow() {
    this.loadData()
    this.loadCountStats()
  },
  methods: {
    normalizeFeeResponse(data) {
      if (Array.isArray(data)) return { records: data, total: data.length }
      if (Array.isArray(data.records)) return { records: data.records, total: data.total || data.records.length }
      if (data.data && Array.isArray(data.data.records)) return { records: data.data.records, total: data.data.total || data.data.records.length }
      return { records: [], total: 0 }
    },
    handleStatsClick(status) {
      this.typeFilter = status
      this.currentPage = 1
      this.loadData()
    },
    handleTabPickerChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.typeFilter = this.filterTabs[index]?.value || 'all'
      this.currentPage = 1
      this.loadData()
    },
    async loadCountStats() {
      try {
        const totalReq = request('/api/fee/list', { pageNum: 1, pageSize: 1 }, 'GET')
        const unpaidReq = request('/api/fee/list', { pageNum: 1, pageSize: 1, status: 'UNPAID' }, 'GET')
        const paidReq = request('/api/fee/list', { pageNum: 1, pageSize: 1, status: 'PAID' }, 'GET')
        const [totalRes, unpaidRes, paidRes] = await Promise.all([totalReq, unpaidReq, paidReq])
        this.countStats = {
          total: totalRes?.total || totalRes?.data?.total || 0,
          unpaid: unpaidRes?.total || unpaidRes?.data?.total || 0,
          paid: paidRes?.total || paidRes?.data?.total || 0
        }
      } catch (error) {
        console.error('加载统计数据失败', error)
      }
    },
    onSearch() {
      this.currentPage = 1
      this.loadData()
    },
    handleResetFilters() {
      this.searchQuery = ''
      this.typeFilter = 'all'
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
    async loadData() {
      this.loading = true
      try {
        const isStatusFilter = ['unpaid', 'paid'].includes(this.typeFilter)
        const params = {
          keyword: this.searchQuery || undefined,
          status: isStatusFilter ? (this.typeFilter === 'unpaid' ? 'UNPAID' : 'PAID') : undefined,
          pageNum: this.currentPage,
          pageSize: this.pageSize
        }

        const data = await request('/api/fee/list', params, 'GET')
        const normalized = this.normalizeFeeResponse(data)
        const records = normalized.records
        this.total = Number(normalized.total || 0)

        this.feeList = records.map(item => {
          const feeCycle = item.feeCycle || ''
          const [year, month] = feeCycle.split('-')
          return {
            id: item.id,
            feeName: item.feeName || (year && month ? `${year}年${month}月费用` : `${feeCycle} 费用`),
            amount: item.amount,
            buildingNo: item.buildingNo,
            houseNo: item.houseNo,
            ownerName: item.ownerName,
            period: feeCycle,
            deadline: item.deadline || '月底',
            remindCount: item.remindCount || 0,
            status: (item.status === 'PAID' || item.status === 'paid' || item.status === 1) ? 'paid' : 'unpaid'
          }
        })

        const totalAmount = this.feeList.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        const paidAmount = this.feeList
          .filter(item => item.status === 'paid')
          .reduce((sum, item) => sum + Number(item.amount || 0), 0)

        this.stats = {
          totalAmount: totalAmount.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          rate: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0
        }
      } catch (error) {
        console.error(error)
        this.feeList = []
        this.total = 0
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    formatHouse(item) {
      const buildingNo = item.buildingNo || '-'
      const houseNo = item.houseNo || '-'
      return `${buildingNo}栋${houseNo}室`
    },
    formatAmount(value) {
      const num = Number(value || 0)
      return num.toFixed(2)
    },
    openGenerateModal() {
      this.showGenerateModal = true
    },
    closeGenerateModal() {
      this.showGenerateModal = false
    },
    onMonthChange(e) {
      this.generateForm.month = e.detail.value
    },
    onFeeTypeChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.generateForm.feeType = this.feeTypes[index].value
      this.generateForm.feeTypeLabel = this.feeTypes[index].label
    },
    onDeadlineChange(e) {
      this.generateForm.deadline = e.detail.value
    },
    async submitGenerateBill() {
      if (!this.generateForm.month) return uni.showToast({ title: '请选择月份', icon: 'none' })
      if (!this.generateForm.deadline) return uni.showToast({ title: '请选择截止日期', icon: 'none' })
      try {
        uni.showLoading({ title: '生成中...' })
        const userInfo = uni.getStorageSync('userInfo') || {}
        const payload = {
          communityName: '',
          buildingNo: '',
          feeCycle: this.generateForm.month,
          dueDate: this.generateForm.deadline,
          unitPrice: 2.5
        }
        const adminId = userInfo.id || userInfo.userId || 1
        const url = `/api/fee/generate?adminId=${adminId}`
        await request(url, payload, 'POST')
        uni.hideLoading()
        uni.showToast({ title: '生成成功', icon: 'success' })
        this.closeGenerateModal()
        this.loadData()
        this.loadCountStats()
      } catch (error) {
        uni.hideLoading()
        console.error('生成账单失败:', error)
        uni.showToast({ title: '生成失败: ' + (error.message || '接口错误'), icon: 'none' })
      }
    },
    async handleBatchRemind() {
      try {
        uni.showLoading({ title: '发送中...' })
        const unpaidIds = this.feeList.filter(item => item.status === 'unpaid').map(item => item.id)
        if (!unpaidIds.length) {
          uni.hideLoading()
          return uni.showToast({ title: '无待缴账单', icon: 'none' })
        }
        await request('/api/fee/remind/batch', { ids: unpaidIds }, 'POST')
        uni.hideLoading()
        this.feeList = this.feeList.map(item => {
          if (item.status !== 'unpaid') return item
          return { ...item, remindCount: (Number(item.remindCount) || 0) + 1 }
        })
        uni.showToast({ title: '催缴发送成功', icon: 'success' })
      } catch (error) {
        uni.hideLoading()
      }
    },
    handleRemind(item) {
      uni.showModal({
        title: '催缴通知',
        content: `确认向 ${item.ownerName} 发送 ${item.feeName} 的催缴通知吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await request(`/api/fee/remind/${item.id}`, null, 'POST')
            const index = this.feeList.findIndex(current => current.id === item.id)
            if (index !== -1) {
              const current = this.feeList[index]
              const nextCount = (Number(current.remindCount) || 0) + 1
              this.feeList.splice(index, 1, { ...current, remindCount: nextCount })
            }
            uni.showToast({ title: '发送成功', icon: 'success' })
          } catch (error) {
            console.error('催缴失败', error)
            uni.showToast({ title: error.msg || '发送失败，请检查后端日志', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.manage-container {
  --fee-primary: #2e7cf6;
  --fee-primary-strong: #1f5fd0;
  --fee-line: #e7edf5;
  --fee-text: #24384e;
  --fee-muted: #8797aa;
  min-height: 100%;
  color: var(--fee-text);
  background:
    radial-gradient(circle at 0 0, rgba(46, 124, 246, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%);
  animation: pageFadeIn 260ms ease-out both;
}

.overview-panel,
.query-panel,
.table-toolbar,
.table-panel,
.pagination,
.stats-footer {
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid var(--fee-line);
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
  color: var(--fee-muted);
}

.overview-actions {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.primary-action-btn,
.ghost-action-btn,
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

.primary-action-btn,
.query-btn.primary,
.detail-btn.primary {
  background: linear-gradient(135deg, var(--fee-primary) 0%, #58a3ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
}

.ghost-action-btn,
.query-btn.secondary,
.page-btn,
.close-btn,
.detail-btn.secondary {
  background: #f5f8fc;
  color: var(--fee-text);
  border: 1rpx solid #dce6f2;
}

.primary-action-btn,
.ghost-action-btn {
  min-height: 72rpx;
  line-height: 72rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
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
  border: 1rpx solid var(--fee-line);
  box-shadow: 0 10rpx 24rpx rgba(20, 50, 80, 0.05);
  animation: cardRise 320ms ease-out both;
}

.status-summary-card.active {
  border-color: rgba(46, 124, 246, 0.36);
  box-shadow: 0 16rpx 28rpx rgba(46, 124, 246, 0.12);
}

.status-summary-card.unpaid {
  background: linear-gradient(180deg, #fff 0%, #fff4f6 100%);
}

.status-summary-card.paid {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--fee-muted);
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
  grid-template-columns: 1.4fr 1fr;
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
.detail-picker {
  height: 76rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce6f2;
  background: #fbfdff;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: var(--fee-text);
  display: flex;
  align-items: center;
}

.query-picker-text,
.detail-picker-text {
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
  color: var(--fee-muted);
}

.toolbar-meta.active {
  color: var(--fee-primary-strong);
  font-weight: 600;
}

.table-panel {
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 260rpx 160rpx 180rpx 160rpx 180rpx 140rpx 150rpx 140rpx 180rpx;
  align-items: center;
}

.table-head {
  min-height: 86rpx;
  padding: 0 18rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-bottom: 1rpx solid var(--fee-line);
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
  color: var(--fee-muted);
}

.primary-text,
.plain-text,
.minor-text,
.amount-text {
  display: block;
  font-size: 24rpx;
}

.primary-text,
.plain-text {
  color: var(--fee-text);
}

.primary-text {
  font-weight: 600;
}

.minor-text {
  color: #7e8fa2;
}

.amount-text {
  color: #d15363;
  font-weight: 700;
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

.status-pill.paid {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.unpaid {
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

.row-btn.danger {
  background: #ee6374;
  color: #fff;
}

.row-note {
  font-size: 22rpx;
  color: #7e8fa2;
}

.loading-state,
.empty-state {
  padding: 80rpx 20rpx;
  text-align: center;
}

.loading-text,
.empty-state text {
  font-size: 28rpx;
  color: var(--fee-muted);
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
  color: var(--fee-muted);
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
  color: var(--fee-muted);
}

.page-size-text {
  display: inline-flex;
  align-items: center;
  min-height: 58rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #dce6f2;
  background: #f8fbff;
  color: var(--fee-text);
}

.stats-footer {
  margin-top: 18rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.footer-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.footer-label {
  font-size: 22rpx;
  color: var(--fee-muted);
}

.footer-value {
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--fee-text);
}

.footer-value.highlight {
  color: var(--fee-primary-strong);
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
  border-bottom: 1rpx solid var(--fee-line);
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

.detail-picker-wrap {
  flex: 1;
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

.primary-action-btn:active,
.ghost-action-btn:active,
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
  .overview-panel,
  .stats-footer {
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
