<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="停车管理"
    currentPage="/admin/pages/admin/parking-manage"
    pageBreadcrumb="管理后台 / 停车管理"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">停车业务中心</text>
          <text class="overview-subtitle">统一管理停车订单和车位资源，并保留车辆审核、订单支付、车位预订和月卡办理流程。</text>
        </view>

        <view class="overview-actions">
          <view class="overview-chip">
            <text class="overview-chip-label">当前模块</text>
            <text class="overview-chip-value">{{ currentTabLabel }}</text>
          </view>
          <button class="primary-action-btn" @click="goCarAudit">车辆审核</button>
        </view>
      </view>

      <view class="tab-switch-bar">
        <button
          class="tab-switch-btn"
          :class="{ active: currentTab === 'order' }"
          @click="switchTab('order')"
        >
          停车订单
        </button>
        <button
          class="tab-switch-btn"
          :class="{ active: currentTab === 'space' }"
          @click="switchTab('space')"
        >
          车位管理
        </button>
      </view>

      <template v-if="currentTab === 'order'">
        <view class="status-summary-bar parking-order-bar">
          <view class="status-summary-card" :class="{ active: queryParams.status === '' }" @click="applyQuickOrderStatus('')">
            <text class="summary-label">全部订单</text>
            <text class="summary-value">{{ orderStats.total }}</text>
          </view>
          <view class="status-summary-card unpaid" :class="{ active: queryParams.status === 'UNPAID' }" @click="applyQuickOrderStatus('UNPAID')">
            <text class="summary-label">待支付</text>
            <text class="summary-value">{{ orderStats.unpaid }}</text>
          </view>
          <view class="status-summary-card paid" :class="{ active: queryParams.status === 'PAID' }" @click="applyQuickOrderStatus('PAID')">
            <text class="summary-label">已支付</text>
            <text class="summary-value">{{ orderStats.paid }}</text>
          </view>
          <view class="status-summary-card cancelled" :class="{ active: queryParams.status === 'CANCELLED' }" @click="applyQuickOrderStatus('CANCELLED')">
            <text class="summary-label">已取消</text>
            <text class="summary-value">{{ orderStats.cancelled }}</text>
          </view>
        </view>

        <view class="query-panel">
          <view class="query-grid parking-query-grid">
            <view class="query-field">
              <text class="query-label">车牌号</text>
              <input
                v-model="queryParams.plateNo"
                class="query-input"
                type="text"
                placeholder="请输入车牌号"
                @confirm="handleSearch"
              />
            </view>

            <view class="query-field">
              <text class="query-label">订单状态</text>
              <picker
                mode="selector"
                :range="statusOptions"
                range-key="label"
                :value="orderStatusPickerIndex"
                @change="handleStatusChange"
              >
                <view class="query-picker">
                  <text class="query-picker-text">{{ currentOrderStatusLabel }}</text>
                </view>
              </picker>
            </view>
          </view>

          <view class="query-actions">
            <button class="query-btn primary" @click="handleSearch">查询</button>
            <button class="query-btn secondary" @click="resetOrderQuery">重置</button>
          </view>
        </view>

        <view class="table-toolbar">
          <view class="toolbar-left-group">
            <text class="toolbar-meta">共 {{ total }} 条订单</text>
            <text class="toolbar-meta active">当前状态：{{ currentOrderStatusLabel }}</text>
          </view>

          <view class="toolbar-right-group">
            <text class="toolbar-meta">当前页 {{ parkingList.length }} 条</text>
          </view>
        </view>

        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>

        <view v-else class="table-panel">
          <view class="scroll-table">
            <view class="table-head parking-order-table">
              <text class="table-col col-order">订单号</text>
              <text class="table-col col-plate">车牌号</text>
              <text class="table-col col-space">车位 / 业主</text>
              <text class="table-col col-type">类型 / 金额</text>
              <text class="table-col col-status">状态</text>
              <text class="table-col col-time">停车时段</text>
              <text class="table-col col-pay">支付信息</text>
              <text class="table-col col-actions">操作</text>
            </view>

            <view
              v-for="(parking, index) in parkingList"
              :key="parking.orderId || index"
              class="table-row parking-order-table"
              :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
            >
              <view class="table-col col-order">
                <text class="primary-text">{{ parking.orderNo || '-' }}</text>
              </view>

              <view class="table-col col-plate">
                <text class="plain-text">{{ parking.plateNo || '-' }}</text>
              </view>

              <view class="table-col col-space">
                <text class="primary-text">{{ parking.spaceNo || '-' }}</text>
                <text class="minor-text">{{ parking.ownerName || '暂无业主' }}</text>
              </view>

              <view class="table-col col-type">
                <text class="plain-text">{{ getOrderTypeText(parking.orderType) }}</text>
                <text class="minor-text">{{ parking.amount != null ? `${parking.amount} 元` : '-' }}</text>
              </view>

              <view class="table-col col-status">
                <text class="status-pill" :class="getOrderStatusClass(parking.status)">
                  {{ getOrderStatusText(parking.status) }}
                </text>
              </view>

              <view class="table-col col-time">
                <text class="desc-text">{{ formatTime(parking.startTime) }} ~ {{ formatTime(parking.endTime) }}</text>
              </view>

              <view class="table-col col-pay">
                <text class="plain-text">{{ formatPayChannel(parking.payChannel) }}</text>
                <text class="minor-text">{{ parking.payTime ? formatTime(parking.payTime) : '未支付' }}</text>
              </view>

              <view class="table-col col-actions row-actions">
                <button v-if="isUnpaid(parking.status)" class="row-btn primary" @click="handleRenew(parking.orderId)">去支付</button>
                <text v-else class="minor-text">无需处理</text>
              </view>
            </view>
          </view>

          <view v-if="parkingList.length === 0" class="empty-state">
            <text>暂无停车订单</text>
          </view>
        </view>

        <view v-if="total > 0" class="pagination">
          <view class="page-meta">
            <text>第 {{ currentPage }} / {{ orderTotalPages }} 页</text>
          </view>

          <view class="page-controls">
            <button class="page-btn" :disabled="currentPage <= 1" @click="changePage(-1)">上一页</button>
            <button class="page-btn" :disabled="currentPage >= orderTotalPages" @click="changePage(1)">下一页</button>
            <view class="page-size">
              <text>每页</text>
              <picker mode="selector" :range="pageSizeOptions" :value="orderPageSizeIndex" @change="handleOrderPageSizeChange">
                <text class="page-size-text">{{ pageSize }} 条</text>
              </picker>
            </view>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="status-summary-bar parking-space-bar">
          <view class="status-summary-card" :class="{ active: spaceQueryParams.status === '' }" @click="applyQuickSpaceStatus('')">
            <text class="summary-label">全部车位</text>
            <text class="summary-value">{{ spaceStats.total }}</text>
          </view>
          <view class="status-summary-card available" :class="{ active: spaceQueryParams.status === 'AVAILABLE' }" @click="applyQuickSpaceStatus('AVAILABLE')">
            <text class="summary-label">空闲可用</text>
            <text class="summary-value">{{ spaceStats.available }}</text>
          </view>
          <view class="status-summary-card occupied" :class="{ active: spaceQueryParams.status === 'OCCUPIED' }" @click="applyQuickSpaceStatus('OCCUPIED')">
            <text class="summary-label">已占用</text>
            <text class="summary-value">{{ spaceStats.occupied }}</text>
          </view>
          <view class="status-summary-card reserved" :class="{ active: spaceQueryParams.status === 'RESERVED' }" @click="applyQuickSpaceStatus('RESERVED')">
            <text class="summary-label">已预订</text>
            <text class="summary-value">{{ spaceStats.reserved }}</text>
          </view>
          <view class="status-summary-card disabled" :class="{ active: spaceQueryParams.status === 'DISABLED' }" @click="applyQuickSpaceStatus('DISABLED')">
            <text class="summary-label">已禁用</text>
            <text class="summary-value">{{ spaceStats.disabled }}</text>
          </view>
        </view>

        <view class="query-panel">
          <view class="query-grid parking-query-grid">
            <view class="query-field">
              <text class="query-label">车位号</text>
              <input
                v-model="spaceQueryParams.spaceNo"
                class="query-input"
                type="text"
                placeholder="请输入车位号"
                @confirm="handleSpaceSearch"
              />
            </view>

            <view class="query-field">
              <text class="query-label">车位状态</text>
              <picker
                mode="selector"
                :range="spaceStatusOptions"
                range-key="label"
                :value="spaceStatusPickerIndex"
                @change="handleSpaceStatusChange"
              >
                <view class="query-picker">
                  <text class="query-picker-text">{{ currentSpaceStatusLabel }}</text>
                </view>
              </picker>
            </view>
          </view>

          <view class="query-actions">
            <button class="query-btn primary" @click="handleSpaceSearch">查询</button>
            <button class="query-btn secondary" @click="resetSpaceQuery">重置</button>
          </view>
        </view>

        <view class="table-toolbar">
          <view class="toolbar-left-group">
            <text class="toolbar-meta">共 {{ spaceTotal }} 个车位</text>
            <text class="toolbar-meta active">当前状态：{{ currentSpaceStatusLabel }}</text>
          </view>

          <view class="toolbar-right-group">
            <text class="toolbar-meta">当前页 {{ spaceList.length }} 条</text>
          </view>
        </view>

        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>

        <view v-else class="table-panel">
          <view class="scroll-table">
            <view class="table-head parking-space-table">
              <text class="table-col col-space-no">车位号</text>
              <text class="table-col col-space-status">状态</text>
              <text class="table-col col-owner">业主</text>
              <text class="table-col col-plate">车牌号</text>
              <text class="table-col col-expire">到期时间</text>
              <text class="table-col col-remind">续期提醒</text>
              <text class="table-col col-actions">操作</text>
            </view>

            <view
              v-for="(space, index) in spaceList"
              :key="space.id ? `${space.id}-${index}` : `${space.spaceNo}-${index}`"
              class="table-row parking-space-table"
              :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
            >
              <view class="table-col col-space-no">
                <text class="primary-text">{{ space.spaceNo || '-' }}</text>
              </view>

              <view class="table-col col-space-status">
                <text class="status-pill" :class="getSpaceStatusClass(space.status)">
                  {{ getSpaceStatusText(space.status) }}
                </text>
              </view>

              <view class="table-col col-owner">
                <text class="plain-text">{{ space.ownerName || '暂无业主' }}</text>
              </view>

              <view class="table-col col-plate">
                <text class="plain-text">{{ space.plateNo || '-' }}</text>
              </view>

              <view class="table-col col-expire">
                <text class="minor-text">{{ formatTime(space.expireTime) || '未设置' }}</text>
              </view>

              <view class="table-col col-remind">
                <text class="minor-text">{{ isSpaceNearExpire(space.expireTime) ? '即将到期' : '正常' }}</text>
              </view>

              <view class="table-col col-actions row-actions">
                <button class="row-btn primary" @click="handleOpenLease(space)">办理月卡</button>
                <button v-if="isSpaceReservable(space)" class="row-btn secondary-warn" @click="handleReserve(space)">预订车位</button>
              </view>
            </view>
          </view>

          <view v-if="spaceList.length === 0" class="empty-state">
            <text>暂无车位信息</text>
          </view>
        </view>

        <view v-if="spaceTotal > 0" class="pagination">
          <view class="page-meta">
            <text>第 {{ spacePageNum }} / {{ spaceTotalPages }} 页</text>
          </view>

          <view class="page-controls">
            <button class="page-btn" :disabled="spacePageNum <= 1" @click="changeSpacePage(-1)">上一页</button>
            <button class="page-btn" :disabled="spacePageNum >= spaceTotalPages" @click="changeSpacePage(1)">下一页</button>
            <view class="page-size">
              <text>每页</text>
              <picker mode="selector" :range="pageSizeOptions" :value="spacePageSizeIndex" @change="handleSpacePageSizeChange">
                <text class="page-size-text">{{ spacePageSize }} 条</text>
              </picker>
            </view>
          </view>
        </view>
      </template>

      <view v-if="showLeaseDialog" class="detail-modal" @click="closeLeaseDialog">
        <view class="detail-content lease-detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">办理月卡 / 年卡</text>
            <button class="close-btn" @click="closeLeaseDialog">关闭</button>
          </view>

          <view class="detail-body">
            <view class="lease-grid">
              <view class="detail-item detail-item-block">
                <text class="detail-label">车位号:</text>
                <text class="detail-value lease-static-value">{{ leaseDialogSpace && leaseDialogSpace.spaceNo }}</text>
              </view>

              <view class="detail-item detail-item-block">
                <text class="detail-label">用户ID:</text>
                <input class="form-input-inline" v-model="leaseForm.userId" type="number" placeholder="请输入用户ID" />
              </view>

              <view class="detail-item detail-item-block">
                <text class="detail-label">车牌号:</text>
                <input class="form-input-inline" v-model="leaseForm.plateNo" placeholder="请输入车牌号" />
              </view>

              <view class="detail-item detail-item-block">
                <text class="detail-label">时长(月):</text>
                <input class="form-input-inline" v-model="leaseForm.durationMonths" type="number" placeholder="默认 1 个月" />
              </view>

              <view class="detail-item detail-item-block">
                <text class="detail-label">卡类型:</text>
                <picker mode="selector" :range="leaseTypeOptions" range-key="label" @change="handleLeaseTypeChange">
                  <view class="modal-picker">
                    <text class="modal-picker-text">{{ getLeaseTypeLabel(leaseForm.leaseType) }}</text>
                  </view>
                </picker>
              </view>

              <view class="detail-item detail-item-block">
                <text class="detail-label">支付方式:</text>
                <picker mode="selector" :range="payChannelOptions" range-key="label" @change="handlePayChannelChange">
                  <view class="modal-picker">
                    <text class="modal-picker-text">{{ getPayChannelLabel(leaseForm.payChannel) }}</text>
                  </view>
                </picker>
              </view>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">备注:</text>
              <textarea class="modal-textarea" v-model="leaseForm.remark" maxlength="300" placeholder="可填写办理说明"></textarea>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="closeLeaseDialog">取消</button>
              <button class="detail-btn primary" @click="confirmLease">确认办理</button>
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
      loading: false,
      currentTab: 'order',
      pageSizeOptions: [10, 20, 50],
      parkingList: [],
      currentPage: 1,
      pageSize: 10,
      total: 0,
      orderStats: {
        total: 0,
        unpaid: 0,
        paid: 0,
        cancelled: 0
      },
      queryParams: {
        plateNo: '',
        status: ''
      },
      statusOptions: [
        { label: '全部状态', value: '' },
        { label: '待支付', value: 'UNPAID' },
        { label: '已支付', value: 'PAID' },
        { label: '已取消', value: 'CANCELLED' }
      ],
      spaceList: [],
      spacePageNum: 1,
      spacePageSize: 10,
      spaceTotal: 0,
      spaceStats: {
        total: 0,
        available: 0,
        occupied: 0,
        reserved: 0,
        disabled: 0
      },
      spaceQueryParams: {
        spaceNo: '',
        status: ''
      },
      spaceStatusOptions: [
        { label: '全部状态', value: '' },
        { label: '空闲可用', value: 'AVAILABLE' },
        { label: '已占用', value: 'OCCUPIED' },
        { label: '已预订', value: 'RESERVED' },
        { label: '已禁用', value: 'DISABLED' }
      ],
      showLeaseDialog: false,
      leaseDialogSpace: null,
      leaseForm: {
        userId: '',
        plateNo: '',
        leaseType: 'MONTHLY',
        durationMonths: 1,
        payChannel: 'CASH',
        remark: ''
      },
      leaseTypeOptions: [
        { label: '月卡', value: 'MONTHLY' },
        { label: '年卡', value: 'YEARLY' },
        { label: '永久', value: 'PERPETUAL' }
      ],
      payChannelOptions: [
        { label: '现金', value: 'CASH' },
        { label: '微信', value: 'WECHAT' },
        { label: '支付宝', value: 'ALIPAY' },
        { label: '余额', value: 'BALANCE' }
      ]
    }
  },
  computed: {
    currentTabLabel() {
      return this.currentTab === 'space' ? '车位管理' : '停车订单'
    },
    currentOrderStatusLabel() {
      const option = this.statusOptions.find(item => item.value === this.queryParams.status)
      return option ? option.label : '全部状态'
    },
    currentSpaceStatusLabel() {
      const option = this.spaceStatusOptions.find(item => item.value === this.spaceQueryParams.status)
      return option ? option.label : '全部状态'
    },
    orderStatusPickerIndex() {
      return Math.max(0, this.statusOptions.findIndex(item => item.value === this.queryParams.status))
    },
    spaceStatusPickerIndex() {
      return Math.max(0, this.spaceStatusOptions.findIndex(item => item.value === this.spaceQueryParams.status))
    },
    orderPageSizeIndex() {
      return Math.max(0, this.pageSizeOptions.indexOf(this.pageSize))
    },
    spacePageSizeIndex() {
      return Math.max(0, this.pageSizeOptions.indexOf(this.spacePageSize))
    },
    orderTotalPages() {
      return Math.max(1, Math.ceil(this.total / this.pageSize))
    },
    spaceTotalPages() {
      return Math.max(1, Math.ceil(this.spaceTotal / this.spacePageSize))
    }
  },
  onLoad() {
    if (!this.checkAdminRole()) return
    this.refreshCurrentTab()
  },
  onShow() {
    if (!this.checkAdminRole()) return
    this.refreshCurrentTab()
  },
  methods: {
    checkAdminRole() {
      const userInfo = uni.getStorageSync('userInfo')
      if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'super_admin')) {
        uni.showToast({ title: '无权限访问', icon: 'none' })
        uni.redirectTo({ url: '/owner/pages/login/login' })
        return false
      }
      return true
    },
    refreshCurrentTab() {
      if (this.currentTab === 'space') {
        this.loadSpaceStats()
        this.loadSpaceList()
      } else {
        this.loadOrderStats()
        this.loadParkingList()
      }
    },
    switchTab(tab) {
      if (this.currentTab === tab) return
      this.currentTab = tab
      this.refreshCurrentTab()
    },
    goCarAudit() {
      uni.navigateTo({
        url: '/admin/pages/admin/car-audit'
      })
    },
    async fetchOrderTotal(status) {
      const params = {
        pageNum: 1,
        pageSize: 1
      }
      if (this.queryParams.plateNo) params.plateNo = this.queryParams.plateNo
      if (status) params.status = status
      const res = await request('/api/parking/order/admin/list', { params }, 'GET')
      return typeof res?.total === 'number' ? res.total : 0
    },
    async loadOrderStats() {
      try {
        const [total, unpaid, paid, cancelled] = await Promise.all([
          this.fetchOrderTotal(''),
          this.fetchOrderTotal('UNPAID'),
          this.fetchOrderTotal('PAID'),
          this.fetchOrderTotal('CANCELLED')
        ])
        this.orderStats = { total, unpaid, paid, cancelled }
      } catch (error) {
        console.error('加载订单统计失败:', error)
      }
    },
    handleSearch() {
      this.currentPage = 1
      this.loadOrderStats()
      this.loadParkingList()
    },
    resetOrderQuery() {
      this.queryParams = {
        plateNo: '',
        status: ''
      }
      this.currentPage = 1
      this.pageSize = 10
      this.loadOrderStats()
      this.loadParkingList()
    },
    handleStatusChange(e) {
      const index = Number(e.detail.value)
      const option = this.statusOptions[index]
      this.queryParams.status = option ? option.value : ''
    },
    applyQuickOrderStatus(status) {
      this.queryParams.status = status
      this.currentPage = 1
      this.loadOrderStats()
      this.loadParkingList()
    },
    handleOrderPageSizeChange(e) {
      const index = Number(e.detail.value)
      const pageSize = this.pageSizeOptions[index]
      if (pageSize) {
        this.pageSize = pageSize
        this.currentPage = 1
        this.loadParkingList()
      }
    },
    async loadParkingList() {
      this.loading = true
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize
        }
        if (this.queryParams.plateNo) params.plateNo = this.queryParams.plateNo
        if (this.queryParams.status) params.status = this.queryParams.status
        const res = await request('/api/parking/order/admin/list', { params }, 'GET')
        const records = Array.isArray(res && res.records) ? res.records : []
        const statusFilter = (this.queryParams.status || '').toString().toUpperCase()
        const filteredRecords = statusFilter
          ? records.filter(item => {
              const val = (item.status || '').toString().toUpperCase()
              if (statusFilter === 'CANCELLED') return val === 'CANCELLED' || val === 'CANCEL'
              return val === statusFilter
            })
          : records
        const backendTotal = typeof res?.total === 'number' ? res.total : 0
        const backendPageNum = Number(res?.pageNum ? res.pageNum : this.currentPage)
        const backendPageSize = Number(res?.pageSize ? res.pageSize : this.pageSize)
        const shouldSlice = filteredRecords.length > backendPageSize && (backendTotal === 0 || backendTotal === filteredRecords.length)
        const effectivePageNum = shouldSlice ? this.currentPage : backendPageNum
        const effectivePageSize = shouldSlice ? this.pageSize : backendPageSize
        this.total = backendTotal > 0 ? backendTotal : filteredRecords.length
        if (!shouldSlice) {
          this.currentPage = backendPageNum
          this.pageSize = backendPageSize
        }
        const pagedRecords = shouldSlice
          ? filteredRecords.slice((effectivePageNum - 1) * effectivePageSize, effectivePageNum * effectivePageSize)
          : filteredRecords
        this.parkingList = pagedRecords.map(item => ({
          orderId: item.orderId,
          orderNo: item.orderNo,
          plateNo: item.plateNo,
          spaceNo: item.spaceNo,
          ownerName: item.ownerName,
          amount: item.amount,
          status: item.status,
          orderType: item.orderType,
          startTime: item.startTime,
          endTime: item.endTime,
          payTime: item.payTime,
          payChannel: item.payChannel
        }))
      } catch (error) {
        console.error('加载停车列表失败:', error)
        uni.showToast({
          title: error?.message || '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    async handleRenew(orderId) {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        const userId = userInfo && (userInfo.id || userInfo.userId)
        if (!userId) {
          uni.showToast({ title: '请先登录', icon: 'none' })
          return
        }
        uni.showLoading({ title: '处理中...' })
        await request(`/api/parking/order/${orderId}/pay`, {
          data: {
            userId,
            payChannel: 'WECHAT',
            payRemark: '管理员端支付'
          }
        }, 'PUT')
        uni.showToast({ title: '支付成功', icon: 'success' })
        this.loadOrderStats()
        this.loadParkingList()
      } catch (error) {
        console.error('支付失败:', error)
        uni.showToast({
          title: error?.message || '支付失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },
    getOrderStatusClass(status) {
      const val = (status || '').toString().toUpperCase()
      if (val === 'PAID' || val === 'SUCCESS' || val === 'ACTIVE') return 'order-paid'
      if (val === 'UNPAID' || val === 'WAITING_PAY') return 'order-unpaid'
      if (val === 'CANCELLED' || val === 'CANCEL') return 'order-cancelled'
      return 'order-expired'
    },
    getOrderStatusText(status) {
      const val = (status || '').toString().toUpperCase()
      const statusMap = {
        UNPAID: '待支付',
        WAITING_PAY: '待支付',
        PAID: '已支付',
        SUCCESS: '已支付',
        ACTIVE: '正常',
        EXPIRED: '已过期',
        CANCELLED: '已取消',
        CANCEL: '已取消'
      }
      return statusMap[val] || status || ''
    },
    getOrderTypeText(type) {
      return String(type).toUpperCase() === 'TEMP' ? '临时停车' : '固定车位'
    },
    isUnpaid(status) {
      const val = (status || '').toString().toUpperCase()
      return val === 'UNPAID' || val === 'WAITING_PAY'
    },
    formatPayChannel(channel) {
      const val = (channel || '').toString().toUpperCase()
      if (val === 'WECHAT') return '微信'
      if (val === 'ALIPAY') return '支付宝'
      if (val === 'CASH') return '现金'
      if (val === 'BALANCE') return '余额'
      return channel || '-'
    },
    async fetchSpaceTotal(status) {
      const params = {
        pageNum: 1,
        pageSize: 1
      }
      if (this.spaceQueryParams.spaceNo) params.spaceNo = this.spaceQueryParams.spaceNo
      if (status) params.status = status
      const res = await request('/api/parking/space/admin/list', { params }, 'GET')
      return typeof res?.total === 'number' ? res.total : 0
    },
    async loadSpaceStats() {
      try {
        const [total, available, occupied, reserved, disabled] = await Promise.all([
          this.fetchSpaceTotal(''),
          this.fetchSpaceTotal('AVAILABLE'),
          this.fetchSpaceTotal('OCCUPIED'),
          this.fetchSpaceTotal('RESERVED'),
          this.fetchSpaceTotal('DISABLED')
        ])
        this.spaceStats = { total, available, occupied, reserved, disabled }
      } catch (error) {
        console.error('加载车位统计失败:', error)
      }
    },
    handleSpaceSearch() {
      this.spacePageNum = 1
      this.loadSpaceStats()
      this.loadSpaceList()
    },
    resetSpaceQuery() {
      this.spaceQueryParams = {
        spaceNo: '',
        status: ''
      }
      this.spacePageNum = 1
      this.spacePageSize = 10
      this.loadSpaceStats()
      this.loadSpaceList()
    },
    handleSpaceStatusChange(e) {
      const index = Number(e.detail.value)
      const option = this.spaceStatusOptions[index]
      this.spaceQueryParams.status = option ? option.value : ''
    },
    applyQuickSpaceStatus(status) {
      this.spaceQueryParams.status = status
      this.spacePageNum = 1
      this.loadSpaceStats()
      this.loadSpaceList()
    },
    handleSpacePageSizeChange(e) {
      const index = Number(e.detail.value)
      const pageSize = this.pageSizeOptions[index]
      if (pageSize) {
        this.spacePageSize = pageSize
        this.spacePageNum = 1
        this.loadSpaceList()
      }
    },
    getLeaseTypeLabel(value) {
      const option = this.leaseTypeOptions.find(item => item.value === value)
      return option ? option.label : '请选择类型'
    },
    getPayChannelLabel(value) {
      const option = this.payChannelOptions.find(item => item.value === value)
      return option ? option.label : '请选择支付方式'
    },
    isSpaceReservable(space) {
      const val = (space && space.status ? space.status : '').toString().toUpperCase()
      return val === 'AVAILABLE' || val === 'FREE'
    },
    isSpaceNearExpire(time) {
      if (!time) return false
      const expire = new Date(time).getTime()
      if (!expire || Number.isNaN(expire)) return false
      const diff = expire - Date.now()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      return diff > 0 && diff <= sevenDays
    },
    getSpaceStatusText(status) {
      const val = (status || '').toString().toUpperCase()
      const statusMap = {
        AVAILABLE: '空闲可用',
        FREE: '空闲可用',
        OCCUPIED: '已占用',
        RESERVED: '已预订',
        DISABLED: '已禁用'
      }
      return statusMap[val] || status || ''
    },
    getSpaceStatusClass(status) {
      const val = (status || '').toString().toUpperCase()
      if (val === 'AVAILABLE' || val === 'FREE') return 'space-available'
      if (val === 'OCCUPIED') return 'space-occupied'
      if (val === 'RESERVED') return 'space-reserved'
      if (val === 'DISABLED') return 'space-disabled'
      return 'space-disabled'
    },
    async loadSpaceList() {
      this.loading = true
      try {
        const params = {
          pageNum: this.spacePageNum,
          pageSize: this.spacePageSize
        }
        if (this.spaceQueryParams.spaceNo) params.spaceNo = this.spaceQueryParams.spaceNo
        if (this.spaceQueryParams.status) params.status = this.spaceQueryParams.status
        const res = await request('/api/parking/space/admin/list', { params }, 'GET')
        const records = Array.isArray(res && res.records) ? res.records : []
        const spaceStatusFilter = (this.spaceQueryParams.status || '').toString().toUpperCase()
        const filteredRecords = spaceStatusFilter
          ? records.filter(item => {
              const val = (item.status || '').toString().toUpperCase()
              if (spaceStatusFilter === 'AVAILABLE') {
                return val === 'AVAILABLE' || val === 'FREE'
              }
              return val === spaceStatusFilter
            })
          : records
        const backendTotal = typeof res?.total === 'number' ? res.total : 0
        const backendPageNum = Number(res?.pageNum ? res.pageNum : this.spacePageNum)
        const backendPageSize = Number(res?.pageSize ? res.pageSize : this.spacePageSize)
        const shouldSlice = filteredRecords.length > backendPageSize && (backendTotal === 0 || backendTotal === filteredRecords.length)
        const effectivePageNum = shouldSlice ? this.spacePageNum : backendPageNum
        const effectivePageSize = shouldSlice ? this.spacePageSize : backendPageSize
        this.spaceTotal = backendTotal > 0 ? backendTotal : filteredRecords.length
        if (!shouldSlice) {
          this.spacePageNum = backendPageNum
          this.spacePageSize = backendPageSize
        }
        const uniqueRecords = []
        const seenKeys = new Set()
        filteredRecords.forEach(item => {
          const key = item.id || item.spaceNo
          if (!seenKeys.has(key)) {
            seenKeys.add(key)
            uniqueRecords.push(item)
          }
        })
        this.spaceList = shouldSlice
          ? uniqueRecords.slice((effectivePageNum - 1) * effectivePageSize, effectivePageNum * effectivePageSize)
          : uniqueRecords
      } catch (error) {
        console.error('加载车位列表失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async handleReserve(space) {
      if (!space || !space.id) {
        uni.showToast({ title: '车位信息不存在', icon: 'none' })
        return
      }
      uni.showModal({
        title: '预订车位',
        editable: true,
        placeholderText: '请输入用户ID',
        success: async (res) => {
          if (!res.confirm || !res.content) return
          const userId = res.content
          try {
            uni.showLoading({ title: '提交中...' })
            const reserveTime = new Date().toISOString()
            await request('/api/parking/reserve', {
              data: {
                userId,
                spaceId: space.id,
                reserveTime
              }
            }, 'POST')
            uni.showToast({ title: '预订成功', icon: 'success' })
            this.loadSpaceStats()
            this.loadSpaceList()
          } catch (error) {
            console.error('预订失败:', error)
            uni.showToast({ title: error?.message || '预订失败', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        }
      })
    },
    handleOpenLease(space) {
      this.leaseDialogSpace = space
      this.leaseForm = {
        userId: space.userId || space.ownerId || '',
        plateNo: space.plateNo || '',
        leaseType: 'MONTHLY',
        durationMonths: 1,
        payChannel: 'CASH',
        remark: ''
      }
      this.showLeaseDialog = true
    },
    closeLeaseDialog() {
      this.showLeaseDialog = false
      this.leaseDialogSpace = null
    },
    handleLeaseTypeChange(e) {
      const index = Number(e.detail.value)
      const option = this.leaseTypeOptions[index]
      if (option) this.leaseForm.leaseType = option.value
    },
    handlePayChannelChange(e) {
      const index = Number(e.detail.value)
      const option = this.payChannelOptions[index]
      if (option) this.leaseForm.payChannel = option.value
    },
    async confirmLease() {
      if (!this.leaseDialogSpace || !this.leaseDialogSpace.id) {
        uni.showToast({ title: '车位信息错误', icon: 'none' })
        return
      }
      const userId = (this.leaseForm.userId || '').toString().trim()
      if (!userId) {
        uni.showToast({ title: '请输入用户ID', icon: 'none' })
        return
      }
      const plateNo = (this.leaseForm.plateNo || '').toString().trim()
      if (!plateNo) {
        uni.showToast({ title: '请输入车牌号', icon: 'none' })
        return
      }
      let duration = Number(this.leaseForm.durationMonths)
      if (!duration || duration <= 0) duration = 1
      try {
        uni.showLoading({ title: '创建订单中...' })
        const orderId = await request('/api/parking/lease/order/create', {
          data: {
            userId,
            spaceId: this.leaseDialogSpace.id,
            plateNo,
            leaseType: this.leaseForm.leaseType,
            durationMonths: duration,
            remark: this.leaseForm.remark
          }
        }, 'POST')
        await request('/api/parking/lease/order/pay', {
          data: {
            orderId,
            payChannel: this.leaseForm.payChannel,
            payRemark: this.leaseForm.remark || '管理员后台办理'
          }
        }, 'POST')
        uni.showToast({ title: '办理成功', icon: 'success' })
        this.closeLeaseDialog()
        this.loadSpaceStats()
        this.loadSpaceList()
      } catch (error) {
        console.error('办理失败:', error)
        uni.showToast({ title: error?.message || '办理失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    changePage(delta) {
      const next = this.currentPage + delta
      if (next < 1 || next > this.orderTotalPages) return
      this.currentPage = next
      this.loadParkingList()
    },
    changeSpacePage(delta) {
      const next = this.spacePageNum + delta
      if (next < 1 || next > this.spaceTotalPages) return
      this.spacePageNum = next
      this.loadSpaceList()
    },
    formatTime(time) {
      if (!time) return ''
      const date = new Date(time)
      if (Number.isNaN(date.getTime())) return time
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

<style scoped src="../../styles/admin-table-page.css"></style>
<style scoped>
.overview-actions {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.tab-switch-bar {
  display: flex;
  gap: 14rpx;
  margin-bottom: 20rpx;
}

.tab-switch-btn {
  flex: 1;
  min-height: 78rpx;
  line-height: 78rpx;
  border-radius: 18rpx;
  margin: 0;
  border: 1rpx solid #dce6f2;
  background: rgba(255, 255, 255, 0.9);
  color: #4d6177;
  font-size: 26rpx;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.tab-switch-btn.active {
  background: linear-gradient(135deg, #2e7cf6 0%, #58a3ff 100%);
  color: #fff;
  border-color: rgba(46, 124, 246, 0.32);
  box-shadow: 0 14rpx 28rpx rgba(46, 124, 246, 0.18);
}

.parking-order-bar {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.parking-space-bar {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.status-summary-card.unpaid,
.status-summary-card.builtin,
.status-summary-card.reserved {
  background: linear-gradient(180deg, #fff 0%, #fff8e6 100%);
}

.status-summary-card.paid,
.status-summary-card.available {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.status-summary-card.cancelled,
.status-summary-card.disabled {
  background: linear-gradient(180deg, #fff 0%, #fff1f3 100%);
}

.status-summary-card.occupied {
  background: linear-gradient(180deg, #fff 0%, #fff5eb 100%);
}

.parking-query-grid {
  grid-template-columns: 1.4fr 1fr;
}

.parking-order-table {
  grid-template-columns: 220rpx 180rpx 240rpx 220rpx 150rpx 280rpx 220rpx 170rpx;
  min-width: 1880rpx;
}

.parking-space-table {
  grid-template-columns: 160rpx 160rpx 220rpx 180rpx 220rpx 160rpx 260rpx;
  min-width: 1620rpx;
}

.status-pill.order-paid,
.status-pill.space-available {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.order-unpaid,
.status-pill.space-reserved {
  background: #fff8e6;
  color: #cd8b1d;
}

.status-pill.order-cancelled,
.status-pill.space-disabled {
  background: #fff1f3;
  color: #c44859;
}

.status-pill.order-expired,
.status-pill.space-occupied {
  background: #fff5eb;
  color: #c97822;
}

.lease-detail-content {
  max-width: 960rpx;
}

.lease-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.detail-item-block .detail-label {
  width: auto;
  display: block;
  margin-bottom: 10rpx;
}

.lease-static-value {
  display: block;
  min-height: 76rpx;
  line-height: 76rpx;
  padding: 0 24rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce6f2;
  background: #f7faff;
  box-sizing: border-box;
}

.tab-switch-btn:active,
.primary-action-btn:active {
  transform: scale(0.985);
}
</style>
