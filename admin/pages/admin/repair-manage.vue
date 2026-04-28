<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="报修管理"
    currentPage="/admin/pages/admin/repair-manage"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">报修工单列表</text>
          <text class="overview-subtitle">采用标准后台数据页的筛选、表头、数据行与操作列结构。</text>
        </view>

        <picker mode="selector" :range="monthOptions" range-key="label" @change="handleMonthChange">
          <view class="month-filter-chip">
            <text class="month-filter-label">统计月份</text>
            <text class="month-filter-value">{{ currentMonthLabel }}</text>
          </view>
        </picker>
      </view>

      <view class="status-summary-bar">
        <view class="status-summary-card" :class="{ active: statusFilter === '' }" @click="handleStatsClick('all')">
          <text class="summary-label">全部</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card pending" :class="{ active: statusFilter === 'pending' }" @click="handleStatsClick('pending')">
          <text class="summary-label">待处理</text>
          <text class="summary-value">{{ stats.pending }}</text>
        </view>
        <view class="status-summary-card processing" :class="{ active: statusFilter === 'processing' }" @click="handleStatsClick('processing')">
          <text class="summary-label">处理中</text>
          <text class="summary-value">{{ stats.processing }}</text>
        </view>
        <view class="status-summary-card today">
          <text class="summary-label">今日新增</text>
          <text class="summary-value">{{ stats.today }}</text>
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
              placeholder="搜索房屋编号、故障类型、描述"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">状态</text>
            <picker
              mode="selector"
              :range="statusOptions"
              range-key="label"
              :value="statusOptions.findIndex(opt => opt.value === statusFilter)"
              @change="handleStatusChange"
            >
              <view class="query-picker">
                <text class="query-picker-text">{{ currentStatusLabel }}</text>
              </view>
            </picker>
          </view>

          <view class="query-field">
            <text class="query-label">类型</text>
            <picker
              mode="selector"
              :range="faultTypeOptions"
              range-key="label"
              :value="faultTypeOptions.findIndex(opt => opt.value === faultTypeFilter)"
              @change="handleFaultTypeChange"
            >
              <view class="query-picker">
                <text class="query-picker-text">{{ currentFaultTypeLabel }}</text>
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
            {{ selectedIds.length === repairList.length && repairList.length ? '取消全选' : '全选当前页' }}
          </button>
          <text class="toolbar-meta">共 {{ total }} 条</text>
          <text v-if="selectedIds.length > 0" class="toolbar-meta active">已选 {{ selectedIds.length }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <button v-if="selectedIds.length > 0" class="toolbar-action primary" @click="handleBatchProcess">批量处理</button>
          <button v-if="selectedIds.length > 0" class="toolbar-action success" @click="handleBatchComplete">批量完成</button>
          <button v-if="selectedIds.length > 0" class="toolbar-action danger" @click="handleBatchCancel">批量取消</button>
          <button class="toolbar-action ghost" :disabled="exporting" @click="handleExport">
            {{ exporting ? '导出中...' : '导出数据' }}
          </button>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="table-head">
          <text class="table-col col-check">选择</text>
          <text class="table-col col-id">编号</text>
          <text class="table-col col-house">房屋信息</text>
          <text class="table-col col-type">故障类型</text>
          <text class="table-col col-desc">故障描述</text>
          <text class="table-col col-status">状态</text>
          <text class="table-col col-time">提交时间</text>
          <text class="table-col col-timeout">响应</text>
          <text class="table-col col-actions">操作</text>
        </view>

        <checkbox-group v-if="repairList.length > 0" @change="handleCheckboxGroupChange">
          <view
            v-for="(item, index) in repairList"
            :key="item.id"
            class="table-row"
            :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
            @click="openDetail(item)"
          >
            <view class="table-col col-check row-check" @click.stop>
              <checkbox :value="String(item.id)" :checked="selectedIds.includes(String(item.id))"></checkbox>
            </view>

            <view class="table-col col-id">
              <text class="primary-text">#{{ item.id }}</text>
            </view>

            <view class="table-col col-house">
              <text class="primary-text">{{ formatHouse(item) }}</text>
              <text v-if="isTimeout(item)" class="row-inline-tag warning">已超时</text>
            </view>

            <view class="table-col col-type">
              <text class="plain-text">{{ item.faultType || '-' }}</text>
            </view>

            <view class="table-col col-desc">
              <text class="desc-text">{{ item.faultDesc || '暂无描述' }}</text>
            </view>

            <view class="table-col col-status">
              <text class="status-pill" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
            </view>

            <view class="table-col col-time">
              <text class="minor-text">{{ formatTime(item.createTime) }}</text>
            </view>

            <view class="table-col col-timeout">
              <text class="minor-text">{{ getTimeoutText(item) }}</text>
            </view>

            <view class="table-col col-actions row-actions" @click.stop>
              <button class="row-btn ghost" @click="openDetail(item)">详情</button>
              <button v-if="item.status === 'pending'" class="row-btn primary" @click="handleSetProcessing(item.id)">受理</button>
              <button v-if="item.status === 'pending'" class="row-btn danger" @click="handleCancelRepair(item.id)">取消</button>
              <button v-else-if="item.status === 'processing'" class="row-btn primary" @click="goToWorkOrderManage('PENDING', item.id)">指派</button>
              <button v-if="item.status === 'processing' || item.status === 'completed'" class="row-btn ghost" @click="goToWorkOrderManage('', item.id)">工单</button>
            </view>
          </view>
        </checkbox-group>

        <view v-else class="empty-state">
          <text>暂无报修记录</text>
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

    <view v-if="showDetail" class="detail-modal" @click="closeDetail">
      <view class="detail-content" @click.stop>
        <view class="detail-header">
          <text class="detail-title">报修详情</text>
          <button class="close-btn" @click="closeDetail">关闭</button>
        </view>

        <view v-if="loadingDetail" class="detail-loading">
          <text>加载中...</text>
        </view>

        <view v-else-if="currentRepair" class="detail-body">
          <view class="detail-item">
            <text class="detail-label">报修编号:</text>
            <text class="detail-value">{{ currentRepair.id }}</text>
          </view>

          <view class="detail-item">
            <text class="detail-label">房屋信息:</text>
            <text class="detail-value">{{ formatHouse(currentRepair) }}</text>
          </view>

          <view class="detail-item">
            <text class="detail-label">故障类型:</text>
            <text class="detail-value">{{ currentRepair.faultType }}</text>
          </view>

          <view class="detail-item">
            <text class="detail-label">故障描述:</text>
            <text class="detail-value detail-desc">{{ currentRepair.faultDesc }}</text>
          </view>

          <view class="detail-item">
            <text class="detail-label">当前状态:</text>
            <text class="detail-value" :class="getStatusClass(currentRepair.status)">
              {{ getStatusText(currentRepair.status) }}
            </text>
          </view>

          <view class="detail-item">
            <text class="detail-label">提交时间:</text>
            <text class="detail-value">{{ formatTime(currentRepair.createTime) }}</text>
          </view>

          <view v-if="currentRepair.processTime" class="detail-item">
            <text class="detail-label">处理时间:</text>
            <text class="detail-value">{{ formatTime(currentRepair.processTime) }}</text>
          </view>

          <view v-if="currentRepair.completeTime" class="detail-item">
            <text class="detail-label">完成时间:</text>
            <text class="detail-value">{{ formatTime(currentRepair.completeTime) }}</text>
          </view>

          <view v-if="currentRepair.remark" class="detail-item">
            <text class="detail-label">处理备注:</text>
            <text class="detail-value detail-desc">{{ currentRepair.remark }}</text>
          </view>

          <view class="detail-actions">
            <button v-if="currentRepair.status === 'pending'" class="detail-btn primary" @click="handleAcceptFromDetail">受理并生成工单</button>
            <button v-else-if="currentRepair.status === 'processing'" class="detail-btn primary" @click="goToWorkOrderManage('PENDING', currentRepair.id)">去工单指派</button>
            <button v-else-if="currentRepair.status === 'completed'" class="detail-btn secondary" @click="goToWorkOrderManage('', currentRepair.id)">查看工单</button>
          </view>
        </view>
      </view>
    </view>
  </admin-sidebar>
</template>

<script>
import request from '@/utils/request'
import adminSidebar from '@/admin/components/admin-sidebar/admin-sidebar'
import { getConfigByKey } from '@/api/system/config'

export default {
  components: {
    adminSidebar
  },
  data() {
    return {
      showSidebar: false,
      repairList: [],
      searchQuery: '',
      statusFilter: '',
      faultTypeFilter: '',
      monthOptions: [],
      monthIndex: 0,
      monthValue: '',
      loading: false,
      loadingDetail: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      showDetail: false,
      currentRepair: null,
      selectedIds: [],
      selectAll: false,
      exporting: false,
      autoRefresh: true,
      autoRefreshInterval: 30,
      timerId: null,
      repairTimeout: 24,
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        today: 0
      },
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'pending', label: '待处理' },
        { value: 'processing', label: '处理中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' }
      ],
      faultTypeOptions: [
        { value: '', label: '全部类型' },
        { value: '水电维修', label: '水电维修' },
        { value: '家电维修', label: '家电维修' },
        { value: '门窗维修', label: '门窗维修' },
        { value: '电器维修', label: '电器维修' }
      ]
    }
  },
  onLoad() {
    this.checkAdminRole()
    this.initMonthOptions()
    this.loadRepairConfig()
    this.loadRepairs()
  },
  onShow() {
    this.loadRepairs()
    this.startAutoRefresh()
  },
  onHide() {
    this.stopAutoRefresh()
  },
  onUnload() {
    this.stopAutoRefresh()
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
      const option = this.statusOptions.find(opt => opt.value === this.statusFilter)
      return option ? option.label : '全部状态'
    },
    currentFaultTypeLabel() {
      const option = this.faultTypeOptions.find(opt => opt.value === this.faultTypeFilter)
      return option ? option.label : '全部类型'
    }
  },
  methods: {
    initMonthOptions() {
      const now = new Date()
      const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const options = []

      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        options.push({ label: value, value })
      }

      this.monthOptions = options
      this.monthValue = current
      this.monthIndex = Math.max(0, options.findIndex(item => item.value === current))
    },
    handleMonthChange(e) {
      const nextIndex = Number(e?.detail?.value || 0)
      const nextOption = this.monthOptions[nextIndex]
      if (!nextOption) return
      this.monthIndex = nextIndex
      this.monthValue = nextOption.value
      this.currentPage = 1
      this.loadRepairs()
    },
    handleStatsClick(status) {
      this.statusFilter = status === 'all' ? '' : status
      this.currentPage = 1
      this.loadRepairs()
    },
    handleSearch() {
      this.currentPage = 1
      this.loadRepairs()
    },
    handleResetFilters() {
      this.searchQuery = ''
      this.statusFilter = ''
      this.faultTypeFilter = ''
      this.currentPage = 1
      this.loadRepairs()
    },
    handleStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.statusFilter = this.statusOptions[index]?.value || ''
      this.currentPage = 1
      this.loadRepairs()
    },
    handleFaultTypeChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.faultTypeFilter = this.faultTypeOptions[index]?.value || ''
      this.currentPage = 1
      this.loadRepairs()
    },
    handlePrevPage() {
      if (this.currentPage <= 1) return
      this.currentPage -= 1
      this.loadRepairs()
    },
    handleNextPage() {
      if (this.currentPage >= this.totalPages) return
      this.currentPage += 1
      this.loadRepairs()
    },
    handlePageSizeChange(e) {
      const options = [10, 20, 50, 100]
      const index = Number(e?.detail?.value || 0)
      this.pageSize = options[index] || 10
      this.currentPage = 1
      this.loadRepairs()
    },
    checkAdminRole() {
      const userInfo = uni.getStorageSync('userInfo')
      if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'super_admin')) {
        uni.showToast({ title: '无权限访问', icon: 'none' })
        uni.redirectTo({ url: '/owner/pages/login/login' })
      }
    },
    async loadRepairConfig() {
      try {
        const res = await getConfigByKey('repair.timeout')
        const list = res.rows || res.data || res.records || []
        let configValue = null

        if (Array.isArray(list) && list.length > 0) {
          configValue = list[0].configValue
        } else if (res.data && res.data.configValue) {
          configValue = res.data.configValue
        }

        if (configValue !== null && configValue !== undefined) {
          this.repairTimeout = parseFloat(configValue) || 24
        }
      } catch (error) {
        console.error('获取报修超时配置失败:', error)
      }
    },
    async loadRepairs() {
      this.loading = true
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          status: this.statusFilter || undefined,
          faultType: this.faultTypeFilter || undefined,
          keyword: this.searchQuery || undefined,
          month: this.monthValue || undefined
        }

        const data = await request('/api/repair/admin/all', { params }, 'GET')
        const list = data.data?.records || data.records || []

        this.repairList = list.slice().sort((a, b) => {
          const urgencyDiff = this.getRepairUrgencyRank(b) - this.getRepairUrgencyRank(a)
          if (urgencyDiff !== 0) return urgencyDiff
          return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime()
        })
        this.total = Number(data.data?.total || data.total || this.repairList.length || 0)
        this.selectAll = false
        this.selectedIds = []
        this.calculateStats()
      } catch (error) {
        console.error('加载报修列表失败:', error)
        this.repairList = []
        this.total = 0
        this.selectAll = false
        this.selectedIds = []
        this.calculateStats()
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    calculateStats() {
      const counters = {
        total: this.total || this.repairList.length,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        today: 0
      }

      const today = new Date()
      const y = today.getFullYear()
      const m = today.getMonth()
      const d = today.getDate()

      this.repairList.forEach(item => {
        if (item.status && counters[item.status] !== undefined) {
          counters[item.status] += 1
        }

        if (item.createTime) {
          const createdAt = new Date(item.createTime)
          if (
            createdAt.getFullYear() === y &&
            createdAt.getMonth() === m &&
            createdAt.getDate() === d
          ) {
            counters.today += 1
          }
        }
      })

      this.stats = counters
    },
    isTimeout(item) {
      if (!item || item.status !== 'pending' || !item.createTime) return false
      const createTime = new Date(item.createTime).getTime()
      const now = Date.now()
      return (now - createTime) / (1000 * 60 * 60) > this.repairTimeout
    },
    getRepairUrgencyRank(item) {
      if (!item) return 1
      const urgentFlag = item.urgent ?? item.isUrgent ?? item.emergency ?? item.isEmergency
      if (urgentFlag === true || urgentFlag === 1 || urgentFlag === '1') return 4
      if (this.isTimeout(item)) return 4
      const priority = Number(item.priority)
      if (Number.isFinite(priority) && priority > 0) return priority
      return 1
    },
    formatHouse(item) {
      if (!item) return '-'
      return `${item.buildingNo || ''}${item.houseNo || ''}` || '-'
    },
    getTimeoutText(item) {
      return this.isTimeout(item) ? '超时待处理' : '正常'
    },
    openDetail(item) {
      this.currentRepair = item
      this.loadingDetail = false
      this.showDetail = true
    },
    closeDetail() {
      this.showDetail = false
      this.currentRepair = null
      this.loadingDetail = false
    },
    handleCheckboxGroupChange(event) {
      this.selectedIds = event.detail.value || []
      this.selectAll = this.selectedIds.length === this.repairList.length
    },
    testSelectAll() {
      if (!this.repairList.length) return
      const isAllSelected = this.selectedIds.length === this.repairList.length
      this.selectAll = !isAllSelected
      this.selectedIds = isAllSelected ? [] : this.repairList.map(item => String(item.id))
      this.$forceUpdate()
    },
    async batchUpdateFallback(ids, status, remark = '') {
      for (const id of ids) {
        await request('/api/repair/admin/updateStatus', {
          params: {
            repairId: id,
            status,
            remark
          }
        }, 'POST')
      }
    },
    async handleBatchProcess() {
      if (!this.selectedIds.length) {
        uni.showToast({ title: '请选择要处理的报修', icon: 'none' })
        return
      }

      try {
        uni.showLoading({ title: '批量处理中...' })
        await request('/api/repair/admin/batchUpdateStatus', {
          data: {
            repairIds: this.selectedIds,
            status: 'processing'
          }
        }, 'POST')
        uni.showToast({ title: '批量处理成功', icon: 'success' })
        this.loadRepairs()
      } catch (error) {
        try {
          await this.batchUpdateFallback(this.selectedIds, 'processing')
          uni.showToast({ title: '批量处理成功', icon: 'success' })
          this.loadRepairs()
        } catch (fallbackError) {
          console.error('批量处理失败:', fallbackError)
          uni.showToast({ title: '批量处理失败', icon: 'none' })
        }
      } finally {
        uni.hideLoading()
      }
    },
    async handleBatchComplete() {
      if (!this.selectedIds.length) {
        uni.showToast({ title: '请选择要完成的报修', icon: 'none' })
        return
      }

      uni.showModal({
        title: '确认批量完成',
        content: `确定要将选中的${this.selectedIds.length}个报修设为已完成吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            uni.showLoading({ title: '批量完成中...' })
            await request('/api/repair/admin/batchUpdateStatus', {
              data: {
                repairIds: this.selectedIds,
                status: 'completed',
                remark: '批量完成'
              }
            }, 'POST')
            uni.showToast({ title: '批量完成成功', icon: 'success' })
            this.loadRepairs()
          } catch (error) {
            try {
              await this.batchUpdateFallback(this.selectedIds, 'completed', '批量完成')
              uni.showToast({ title: '批量完成成功', icon: 'success' })
              this.loadRepairs()
            } catch (fallbackError) {
              console.error('批量完成失败:', fallbackError)
              uni.showToast({ title: '批量完成失败', icon: 'none' })
            }
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    async handleBatchCancel() {
      if (!this.selectedIds.length) {
        uni.showToast({ title: '请选择要取消的报修', icon: 'none' })
        return
      }

      uni.showModal({
        title: '确认批量取消',
        content: `确定要取消选中的${this.selectedIds.length}个报修吗？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            uni.showLoading({ title: '批量取消中...' })
            await request('/api/repair/admin/batchUpdateStatus', {
              data: {
                repairIds: this.selectedIds,
                status: 'cancelled',
                remark: '批量取消'
              }
            }, 'POST')
            uni.showToast({ title: '批量取消成功', icon: 'success' })
            this.loadRepairs()
          } catch (error) {
            try {
              await this.batchUpdateFallback(this.selectedIds, 'cancelled', '批量取消')
              uni.showToast({ title: '批量取消成功', icon: 'success' })
              this.loadRepairs()
            } catch (fallbackError) {
              console.error('批量取消失败:', fallbackError)
              uni.showToast({ title: '批量取消失败', icon: 'none' })
            }
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    async handleExport() {
      try {
        this.exporting = true
        uni.showLoading({ title: '导出中...' })
        await request('/api/repair/admin/export', {
          params: {
            status: this.statusFilter || undefined,
            faultType: this.faultTypeFilter || undefined,
            keyword: this.searchQuery || undefined
          }
        }, 'GET')
        uni.showToast({ title: '导出成功', icon: 'success' })
      } catch (error) {
        console.error('导出失败:', error)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.exporting = false
        uni.hideLoading()
      }
    },
    async handleSetProcessing(repairId) {
      const result = await this.updateRepairStatus(repairId, 'processing', '受理')
      if (result && result.success) {
        this.promptGoAssign(repairId)
      }
    },
    async handleAcceptFromDetail() {
      if (!this.currentRepair || !this.currentRepair.id) return
      const repairId = this.currentRepair.id
      const result = await this.updateRepairStatus(repairId, 'processing', '受理')
      if (result && result.success) {
        this.closeDetail()
        this.promptGoAssign(repairId)
      }
    },
    async handleCancelRepair(repairId) {
      uni.showModal({
        title: '确认取消',
        content: '确定要取消这条报修吗？',
        success: async (res) => {
          if (res.confirm) {
            await this.updateRepairStatus(repairId, 'cancelled', '取消报修')
          }
        }
      })
    },
    async updateRepairStatus(repairId, status, actionName) {
      try {
        uni.showLoading({ title: '处理中...' })
        await request('/api/repair/admin/updateStatus', {
          params: {
            repairId,
            status
          }
        }, 'POST')
        uni.showToast({ title: `${actionName}成功`, icon: 'success' })
        this.loadRepairs()
        return { success: true }
      } catch (error) {
        console.error(`${actionName}失败:`, error)
        uni.showToast({ title: `${actionName}失败`, icon: 'none' })
        return { success: false }
      } finally {
        uni.hideLoading()
      }
    },
    promptGoAssign(repairId) {
      uni.showModal({
        title: '受理成功',
        content: '已生成工单，是否前往工单管理进行指派？',
        confirmText: '去指派',
        cancelText: '留在本页',
        success: (res) => {
          if (res.confirm) {
            this.goToWorkOrderManage('PENDING', repairId)
          }
        }
      })
    },
    goToWorkOrderManage(status, repairId) {
      const query = []
      if (status) query.push(`status=${encodeURIComponent(status)}`)
      if (repairId) query.push(`repairId=${encodeURIComponent(repairId)}`)
      const url = `/admin/pages/admin/work-order-manage${query.length ? `?${query.join('&')}` : ''}`
      uni.navigateTo({ url })
    },
    getStatusClass(status) {
      return {
        'status-pending': status === 'pending',
        'status-processing': status === 'processing',
        'status-completed': status === 'completed',
        'status-cancelled': status === 'cancelled'
      }
    },
    getStatusText(status) {
      const map = {
        pending: '待处理',
        processing: '处理中',
        completed: '已完成',
        cancelled: '已取消'
      }
      return map[status] || status || '-'
    },
    formatTime(time) {
      if (!time) return '-'
      return new Date(time).toLocaleString()
    },
    startAutoRefresh() {
      if (!this.autoRefresh) return
      this.stopAutoRefresh()
      this.timerId = setInterval(() => {
        this.loadRepairs()
      }, this.autoRefreshInterval * 1000)
    },
    stopAutoRefresh() {
      if (!this.timerId) return
      clearInterval(this.timerId)
      this.timerId = null
    }
  }
}
</script>

<style scoped>
.manage-container {
  --repair-primary: #2e7cf6;
  --repair-primary-strong: #1f5fd0;
  --repair-bg: #f5f8fc;
  --repair-panel: #ffffff;
  --repair-line: #e7edf5;
  --repair-text: #24384e;
  --repair-muted: #8797aa;
  --repair-danger: #e95b6b;
  --repair-danger-soft: #fff1f3;
  --repair-success: #3ca56b;
  --repair-success-soft: #edf9f1;
  --repair-warning: #f59e0b;
  --repair-warning-soft: #fff6e5;
  min-height: 100%;
  color: var(--repair-text);
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
  border: 1rpx solid var(--repair-line);
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
  color: var(--repair-muted);
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
  color: var(--repair-muted);
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
  border: 1rpx solid var(--repair-line);
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

.status-summary-card.processing {
  background: linear-gradient(180deg, #fff 0%, #f2f7ff 100%);
}

.status-summary-card.today {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: var(--repair-muted);
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
  grid-template-columns: 2fr 1fr 1fr;
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
.query-picker {
  height: 76rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce6f2;
  background: #fbfdff;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: var(--repair-text);
  display: flex;
  align-items: center;
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
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
.toolbar-chip,
.toolbar-action,
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
.toolbar-action.primary,
.row-btn.primary,
.detail-btn.primary {
  background: linear-gradient(135deg, var(--repair-primary) 0%, #58a3ff 100%);
  color: #fff;
  box-shadow: 0 12rpx 24rpx rgba(46, 124, 246, 0.2);
}

.query-btn.secondary,
.toolbar-action.ghost,
.row-btn.ghost,
.detail-btn.secondary,
.close-btn,
.page-btn,
.toolbar-chip {
  background: #f5f8fc;
  color: var(--repair-text);
  border: 1rpx solid #dce6f2;
}

.toolbar-action.success {
  background: #37a66c;
  color: #fff;
}

.toolbar-action.danger,
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
.toolbar-right-group,
.page-controls {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.toolbar-chip,
.toolbar-action {
  min-height: 60rpx;
  line-height: 60rpx;
  padding: 0 22rpx;
  font-size: 24rpx;
}

.toolbar-meta {
  font-size: 22rpx;
  color: var(--repair-muted);
}

.toolbar-meta.active {
  color: var(--repair-primary-strong);
  font-weight: 600;
}

.table-panel {
  overflow: hidden;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 90rpx 140rpx 230rpx 180rpx minmax(260rpx, 1.2fr) 150rpx 220rpx 150rpx 290rpx;
  align-items: center;
}

.table-head {
  min-height: 86rpx;
  padding: 0 18rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
  border-bottom: 1rpx solid var(--repair-line);
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
  color: var(--repair-muted);
}

.primary-text,
.plain-text,
.desc-text,
.minor-text {
  display: block;
  font-size: 24rpx;
}

.primary-text,
.plain-text {
  color: var(--repair-text);
}

.primary-text {
  font-weight: 600;
}

.desc-text {
  color: #66788b;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.minor-text {
  color: #7e8fa2;
}

.row-inline-tag,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.row-inline-tag.warning {
  margin-top: 10rpx;
  background: var(--repair-warning-soft);
  color: #b97708;
}

.status-pill.status-pending {
  background: var(--repair-danger-soft);
  color: #c44859;
}

.status-pill.status-processing {
  background: #edf5ff;
  color: var(--repair-primary-strong);
}

.status-pill.status-completed {
  background: var(--repair-success-soft);
  color: #2d8c59;
}

.status-pill.status-cancelled {
  background: #f5f6f8;
  color: #6f7f90;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
  justify-content: flex-start;
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
  color: var(--repair-muted);
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
  color: var(--repair-muted);
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
  color: var(--repair-muted);
}

.page-size-text {
  display: inline-flex;
  align-items: center;
  min-height: 58rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  border: 1rpx solid #dce6f2;
  background: #f8fbff;
  color: var(--repair-text);
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
  max-width: 700rpx;
  max-height: 82vh;
  overflow-y: auto;
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
  border-bottom: 1rpx solid var(--repair-line);
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

.detail-loading {
  padding: 70rpx 20rpx;
  text-align: center;
  color: var(--repair-muted);
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
  color: var(--repair-text);
  word-break: break-word;
}

.detail-desc {
  white-space: pre-wrap;
  line-height: 1.55;
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
.toolbar-chip:active,
.toolbar-action:active,
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
  .query-picker:hover {
    border-color: #c7d7ea;
    background: #fff;
  }

  .query-btn.primary:hover,
  .toolbar-action.primary:hover,
  .row-btn.primary:hover {
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
    min-width: 1780rpx;
  }
}
</style>
