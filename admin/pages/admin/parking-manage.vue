<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="停车管理"
    currentPage="/admin/pages/admin/parking-manage"
  >
    <view class="manage-container">
      <!-- 顶部标签栏 -->
      <view class="tabs">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'order' }"
          @click="switchTab('order')"
        >
          <text>停车订单</text>
          <view class="tab-line" v-if="currentTab === 'order'"></view>
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 'space' }"
          @click="switchTab('space')"
        >
          <text>车位管理</text>
          <view class="tab-line" v-if="currentTab === 'space'"></view>
        </view>
        <!-- 新增车辆审核入口 -->
        <view 
          class="tab-item" 
          @click="goCarAudit"
        >
          <text>车辆审核</text>
        </view>
      </view>

      <!-- 停车订单列表 -->
      <view v-if="currentTab === 'order'">
        <!-- 搜索筛选区 -->
        <view class="filter-section">
          <view class="filter-row">
            <input 
              class="search-input" 
              v-model="queryParams.plateNo" 
              placeholder="请输入车牌号" 
              confirm-type="search"
              @confirm="handleSearch"
            />
            <picker 
              class="status-picker" 
              mode="selector" 
              :range="statusOptions" 
              range-key="label" 
              @change="handleStatusChange"
            >
              <view class="picker-value">
                {{ getStatusLabel(queryParams.status) || '全部状态' }}
                <text class="iconfont">▼</text>
              </view>
            </picker>
          </view>
          <button class="search-btn" @click="handleSearch">查询</button>
        </view>

        <!-- 统计卡片 -->
        <view class="stats-card">
          <view class="stat-item">
            <text class="stat-num">{{ total }}</text>
            <text class="stat-label">总订单数</text>
          </view>
          <!-- 可以根据API返回添加更多统计 -->
        </view>

        <view class="parking-list">
        <view 
          v-for="parking in parkingList" 
          :key="parking.orderId" 
          class="parking-item"
        >
          <view class="parking-info">
            <text class="parking-number">订单号：{{ parking.orderNo }}</text>
            <text class="car-number">车牌号：{{ parking.plateNo || '-' }}</text>
            <text class="owner-name">
              车位号：{{ parking.spaceNo || '-' }}  业主：{{ parking.ownerName || '-' }}
            </text>
            <text class="owner-name">
              类型：{{ parking.orderType === 'TEMP' ? '临时停车' : '固定车位' }}，金额：{{ parking.amount }} 元
            </text>
            <text class="status" :class="getStatusClass(parking.status)">
              {{ getStatusText(parking.status) }}
            </text>
            <text class="expire-time">
              时段：{{ formatTime(parking.startTime) }} ~ {{ formatTime(parking.endTime) }}
            </text>
            <text class="expire-time">
              支付方式：{{ formatPayChannel(parking.payChannel) }}
              <text v-if="parking.payTime">，支付时间：{{ formatTime(parking.payTime) }}</text>
            </text>
          </view>
          
          <button 
            v-if="isUnpaid(parking.status)"
            class="renew-btn"
            @click="handleRenew(parking.orderId)"
          >
            去支付
          </button>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="parkingList.length === 0 && !loading" class="empty-state">
        <text>暂无停车记录</text>
      </view>

      <!-- 分页控制 -->
        <view class="pagination" v-if="total > 0">
          <button 
            class="page-btn" 
            :disabled="currentPage <= 1" 
            @click="changePage(-1)"
          >上一页</button>
          <text class="page-info">{{ currentPage }} / {{ Math.ceil(total / pageSize) || 1 }}</text>
          <button 
            class="page-btn" 
            :disabled="currentPage >= Math.ceil(total / pageSize)" 
            @click="changePage(1)"
          >下一页</button>
        </view>
      </view>

      <!-- 车位管理列表 -->
      <view v-if="currentTab === 'space'">
        <view class="stats-card">
          <view class="stat-item">
            <text class="stat-num">{{ spaceStats.total }}</text>
            <text class="stat-label">总车位数</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ spaceStats.available }}</text>
            <text class="stat-label">空闲可用</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ spaceStats.occupied }}</text>
            <text class="stat-label">已占用</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ spaceStats.reserved }}</text>
            <text class="stat-label">已预订</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ spaceStats.disabled }}</text>
            <text class="stat-label">已禁用</text>
          </view>
        </view>

        <!-- 车位筛选 -->
        <view class="filter-section">
          <view class="filter-row">
            <input 
              class="search-input" 
              v-model="spaceQueryParams.spaceNo" 
              placeholder="请输入车位号" 
              confirm-type="search"
              @confirm="handleSpaceSearch"
            />
            <picker 
              class="status-picker" 
              mode="selector" 
              :range="spaceStatusOptions" 
              range-key="label" 
              @change="handleSpaceStatusChange"
            >
              <view class="picker-value">
                {{ getSpaceStatusLabel(spaceQueryParams.status) || '全部状态' }}
                <text class="iconfont">▼</text>
              </view>
            </picker>
          </view>
          <button class="search-btn" @click="handleSpaceSearch">查询</button>
        </view>

        <view class="parking-list">
          <view 
            v-for="(space, index) in spaceList" 
            :key="space.id ? `${space.id}-${index}` : index" 
            class="parking-item"
          >
            <view class="parking-info">
              <view class="parking-number">
                <text>{{ space.spaceNo }}</text>
                <text class="status" :class="getSpaceStatusClass(space.status)">
                  {{ getSpaceStatusText(space.status) }}
                </text>
              </view>
              <view class="car-number" v-if="space.ownerName">
                业主：{{ space.ownerName }} ({{ space.plateNo || '无车牌' }})
              </view>
              <view class="owner-name" v-else>
                暂无业主信息
              </view>
              <view class="expire-time" v-if="space.expireTime">
                到期：{{ formatTime(space.expireTime) }}
                <text 
                  v-if="isSpaceNearExpire(space.expireTime)" 
                  class="expire-badge"
                >
                  即将到期
                </text>
              </view>
            </view>
            
            <button 
              class="renew-btn"
              @click="handleOpenLease(space)"
            >
              办理月卡
            </button>
            <button 
              v-if="isSpaceReservable(space)"
              class="renew-btn"
              @click="handleReserve(space)"
            >
              预订车位
            </button>
          </view>
        </view>
        
        <!-- 车位为空状态 -->
        <view v-if="spaceList.length === 0 && !loading" class="empty-state">
          <text>暂无车位信息</text>
        </view>

        <!-- 车位分页 -->
        <view class="pagination" v-if="spaceTotal > 0">
          <button 
            class="page-btn" 
            :disabled="spacePageNum <= 1" 
            @click="changeSpacePage(-1)"
          >上一页</button>
          <text class="page-info">{{ spacePageNum }} / {{ Math.ceil(spaceTotal / spacePageSize) || 1 }}</text>
          <button 
            class="page-btn" 
            :disabled="spacePageNum >= Math.ceil(spaceTotal / spacePageSize)" 
            @click="changeSpacePage(1)"
          >下一页</button>
        </view>
      </view>
    </view>
  </admin-sidebar>

  <view v-if="showLeaseDialog" class="dialog-mask">
    <view class="dialog-panel">
      <view class="dialog-title">办理月卡/年卡</view>
      <view class="dialog-body">
        <view class="dialog-row">
          <text class="dialog-label">车位号</text>
          <text class="dialog-value">{{ leaseDialogSpace && leaseDialogSpace.spaceNo }}</text>
        </view>
        <view class="dialog-row">
          <text class="dialog-label">用户ID</text>
          <input 
            class="dialog-input" 
            v-model="leaseForm.userId" 
            placeholder="请输入用户ID" 
            type="number"
          />
        </view>
        <view class="dialog-row">
          <text class="dialog-label">车牌号</text>
          <input 
            class="dialog-input" 
            v-model="leaseForm.plateNo" 
            placeholder="请输入车牌号 (必填)" 
          />
        </view>
        <view class="dialog-row">
          <text class="dialog-label">卡类型</text>
          <picker 
            class="dialog-picker"
            mode="selector" 
            :range="leaseTypeOptions" 
            range-key="label" 
            @change="handleLeaseTypeChange"
          >
            <view class="dialog-picker-value">
              {{ getLeaseTypeLabel(leaseForm.leaseType) }}
              <text class="iconfont">▼</text>
            </view>
          </picker>
        </view>
        <view class="dialog-row">
          <text class="dialog-label">时长(月)</text>
          <input 
            class="dialog-input" 
            v-model="leaseForm.durationMonths" 
            placeholder="默认1个月" 
            type="number"
          />
        </view>
        <view class="dialog-row">
          <text class="dialog-label">支付方式</text>
          <picker 
            class="dialog-picker"
            mode="selector" 
            :range="payChannelOptions" 
            range-key="label" 
            @change="handlePayChannelChange"
          >
            <view class="dialog-picker-value">
              {{ getPayChannelLabel(leaseForm.payChannel) }}
              <text class="iconfont">▼</text>
            </view>
          </picker>
        </view>
        <view class="dialog-row">
          <text class="dialog-label">备注</text>
        </view>
        <textarea 
          class="dialog-textarea" 
          v-model="leaseForm.remark" 
          placeholder="可填写办理说明"
        />
        <view class="dialog-footer">
          <button class="dialog-btn cancel" @click="closeLeaseDialog">取消</button>
          <button class="dialog-btn confirm" @click="confirmLease">确认办理</button>
        </view>
      </view>
    </view>
  </view>
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
      parkingList: [],
      showSidebar: false,
      loading: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      currentTab: 'order',
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
      // 车位数据
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
  onLoad() {
    this.checkAdminRole()
    this.loadParkingList()
  },
  onShow() {
    this.loadParkingList()
  },
    
  methods: {
    checkAdminRole() {
      const userInfo = uni.getStorageSync('userInfo')
      if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'super_admin')) {
        uni.showToast({ title: '无权限访问', icon: 'none' })
        uni.redirectTo({ url: '/owner/pages/login/login' })
        return
      }
    },

    switchTab(tab) {
      if (this.currentTab === tab) return
      this.currentTab = tab
      
      if (tab === 'order') {
        if (this.parkingList.length === 0) {
          this.loadParkingList()
        }
      } else if (tab === 'space') {
        // 切换到车位管理时，重置页码并加载数据
        this.spacePageNum = 1
        this.loadSpaceList()
      }
    },

    // 跳转车辆审核页面
    goCarAudit() {
      uni.navigateTo({
        url: '/admin/pages/admin/car-audit'
      })
    },

    handleSearch() {
      this.currentPage = 1
      this.loadParkingList()
    },

    handleStatusChange(e) {
      const index = e.detail.value
      this.queryParams.status = this.statusOptions[index].value
      this.handleSearch()
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

        const res = await request('/api/parking/order/admin/list', {
          params
        }, 'GET')

        const records = Array.isArray(res && res.records) ? res.records : []
        const statusFilter = (this.queryParams.status || '').toString().toUpperCase()
        const filteredRecords = statusFilter
          ? records.filter(item => {
              const val = (item.status || '').toString().toUpperCase()
              if (statusFilter === 'CANCELLED') return val === 'CANCELLED' || val === 'CANCEL'
              return val === statusFilter
            })
          : records
        const backendTotal = typeof (res && res.total) === 'number' ? res.total : 0
        const backendPageNum = Number(res && res.pageNum ? res.pageNum : this.currentPage)
        const backendPageSize = Number(res && res.pageSize ? res.pageSize : this.pageSize)
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
        
      } catch (err) {
        console.error('加载停车列表失败:', err)
        uni.showToast({ 
          title: err?.message || '加载失败', 
          icon: 'none' 
        })
      } finally {
        this.loading = false
      }
    },

    async handleRenew(orderId) {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        if (!userInfo || !userInfo.id) {
          uni.showToast({ title: '请先登录', icon: 'none' })
          return
        }
        uni.showLoading({ title: '处理中...' })
        
        await request(`/api/parking/order/${orderId}/pay`, {
          data: {
            userId: userInfo.id,
            payChannel: 'WECHAT',
            payRemark: '管理员端支付'
          }
        }, 'PUT')
        
        uni.showToast({ title: '支付成功', icon: 'success' })
        this.loadParkingList()
        
      } catch (err) {
        console.error('支付失败:', err)
        uni.showToast({ 
          title: err?.message || '支付失败', 
          icon: 'none' 
        })
      } finally {
        uni.hideLoading()
      }
    },

    getStatusClass(status) {
      const val = (status || '').toString().toUpperCase()
      return {
        'status-active': val === 'PAID' || val === 'SUCCESS' || val === 'ACTIVE',
        'status-expired': val === 'UNPAID' || val === 'WAITING_PAY' || val === 'EXPIRED'
      }
    },

    getStatusText(status) {
      const val = (status || '').toString().toUpperCase()
      const statusMap = {
        'UNPAID': '待支付',
        'WAITING_PAY': '待支付',
        'PAID': '已支付',
        'SUCCESS': '已支付',
        'ACTIVE': '正常',
        'EXPIRED': '已过期',
        'CANCELLED': '已取消',
        'CANCEL': '已取消'
      }
      return statusMap[val] || status || ''
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
      return channel || '-'
    },

    formatTime(time) {
      if (!time) return ''
      return new Date(time).toLocaleString()
    },

    getStatusLabel(value) {
      const option = this.statusOptions && this.statusOptions.find(opt => opt.value === value)
      return option ? option.label : ''
    },

    // --- 车位管理相关方法 ---
    handleSpaceSearch() {
      this.spacePageNum = 1
      this.loadSpaceList()
    },

    handleSpaceStatusChange(e) {
      const index = e.detail.value
      this.spaceQueryParams.status = this.spaceStatusOptions[index].value
      this.handleSpaceSearch()
    },

    getSpaceStatusLabel(value) {
      const option = this.spaceStatusOptions.find(opt => opt.value === value)
      return option ? option.label : ''
    },

    getLeaseTypeLabel(value) {
      const option = this.leaseTypeOptions.find(opt => opt.value === value)
      return option ? option.label : '请选择类型'
    },

    getPayChannelLabel(value) {
      const option = this.payChannelOptions.find(opt => opt.value === value)
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
      const now = Date.now()
      const diff = expire - now
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      return diff > 0 && diff <= sevenDays
    },

    getSpaceStatusText(status) {
      const val = (status || '').toString().toUpperCase()
      const statusMap = {
        'AVAILABLE': '空闲可用',
        'FREE': '空闲可用',
        'OCCUPIED': '已占用',
        'RESERVED': '已预订',
        'DISABLED': '已禁用'
      }
      return statusMap[val] || status || ''
    },

    getSpaceStatusClass(status) {
      const val = (status || '').toString().toUpperCase()
      if (val === 'AVAILABLE' || val === 'FREE') {
        return 'status-available'
      }
      if (val === 'OCCUPIED') {
        return 'status-occupied'
      }
      if (val === 'RESERVED') {
        return 'status-reserved'
      }
      if (val === 'DISABLED') {
        return 'status-disabled'
      }
      return ''
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

        const res = await request('/api/parking/space/admin/list', {
          params
        }, 'GET')

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
        const backendTotal = typeof (res && res.total) === 'number' ? res.total : 0
        const backendPageNum = Number(res && res.pageNum ? res.pageNum : this.spacePageNum)
        const backendPageSize = Number(res && res.pageSize ? res.pageSize : this.spacePageSize)
        const shouldSlice = filteredRecords.length > backendPageSize && (backendTotal === 0 || backendTotal === filteredRecords.length)
        const effectivePageNum = shouldSlice ? this.spacePageNum : backendPageNum
        const effectivePageSize = shouldSlice ? this.spacePageSize : backendPageSize

        this.spaceTotal = backendTotal > 0 ? backendTotal : filteredRecords.length
        if (!shouldSlice) {
          this.spacePageNum = backendPageNum
          this.spacePageSize = backendPageSize
        }

        const uniqueRecords = []
        const spaceIds = new Set()
        
        filteredRecords.forEach(item => {
          if (!spaceIds.has(item.id)) {
            spaceIds.add(item.id)
            uniqueRecords.push(item)
          }
        })

        const finalList = shouldSlice
          ? uniqueRecords.slice((effectivePageNum - 1) * effectivePageSize, effectivePageNum * effectivePageSize)
          : uniqueRecords
        this.spaceList = finalList

        const stats = {
          total: uniqueRecords.length,
          available: 0,
          occupied: 0,
          reserved: 0,
          disabled: 0
        }
        uniqueRecords.forEach(item => {
          const val = (item.status || '').toString().toUpperCase()
          if (val === 'AVAILABLE' || val === 'FREE') stats.available += 1
          else if (val === 'OCCUPIED') stats.occupied += 1
          else if (val === 'RESERVED') stats.reserved += 1
          else if (val === 'DISABLED') stats.disabled += 1
        })
        this.spaceStats = stats
      } catch (err) {
        console.error('加载车位列表失败:', err)
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
                userId: userId,
                spaceId: space.id,
                reserveTime: reserveTime
              }
            }, 'POST')
            uni.showToast({ title: '预订成功', icon: 'success' })
            this.loadSpaceList()
          } catch (e) {
            console.error('预订失败:', e)
            uni.showToast({ title: e?.message || '预订失败', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        }
      })
    },

    handleOpenLease(space) {
      this.leaseDialogSpace = space
      // 自动填充
      this.leaseForm.userId = space.userId || space.ownerId || ''
      this.leaseForm.plateNo = space.plateNo || ''
      
      this.leaseForm.leaseType = 'MONTHLY'
      this.leaseForm.durationMonths = 1
      this.leaseForm.payChannel = 'CASH'
      this.leaseForm.remark = ''
      this.showLeaseDialog = true
    },

    closeLeaseDialog() {
      this.showLeaseDialog = false
    },

    handleLeaseTypeChange(e) {
      const index = e.detail.value
      const option = this.leaseTypeOptions[index]
      if (option) {
        this.leaseForm.leaseType = option.value
      }
    },

    handlePayChannelChange(e) {
      const index = e.detail.value
      const option = this.payChannelOptions[index]
      if (option) {
        this.leaseForm.payChannel = option.value
      }
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
      if (!duration || duration <= 0) {
        duration = 1
      }
      try {
        uni.showLoading({ title: '创建订单中...' })
        const orderId = await request('/api/parking/lease/order/create', {
          data: {
            userId: userId,
            spaceId: this.leaseDialogSpace.id,
            plateNo: plateNo, // 传递车牌号
            leaseType: this.leaseForm.leaseType,
            durationMonths: duration,
            remark: this.leaseForm.remark
          }
        }, 'POST')

        await request('/api/parking/lease/order/pay', {
          data: {
            orderId: orderId,
            payChannel: this.leaseForm.payChannel,
            payRemark: this.leaseForm.remark || '管理员后台办理'
          }
        }, 'POST')

        uni.showToast({ title: '办理成功', icon: 'success' })
        this.showLeaseDialog = false
        this.loadSpaceList()
      } catch (err) {
        console.error('办理失败:', err)
        uni.showToast({ title: err?.message || '办理失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    // -----------------------

    changePage(delta) {
      this.currentPage += delta
      this.loadParkingList()
    },

    changeSpacePage(delta) {
      this.spacePageNum += delta
      if (this.spacePageNum < 1) this.spacePageNum = 1
      this.loadSpaceList()
    }
  }
}
</script>

<style scoped>
/* 页面容器 */
.manage-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 40rpx;
}

/* Tab 切换栏 */
.tabs {
  display: flex;
  background: #fff;
  padding: 20rpx 30rpx 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
}

.tab-item {
  position: relative;
  margin-right: 60rpx;
  padding-bottom: 20rpx;
  font-size: 30rpx;
  color: #666;
  transition: all 0.3s;
}

.tab-item.active {
  color: #2979ff;
  font-weight: 600;
  font-size: 32rpx;
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 6rpx;
  background: #2979ff;
  border-radius: 6rpx;
}

/* 筛选区 */
.filter-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.filter-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  gap: 20rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 36rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
  color: #333;
}

.status-picker {
  width: 200rpx;
}

.picker-value {
  height: 72rpx;
  background: #f5f7fa;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  font-size: 28rpx;
  color: #666;
}

.iconfont {
  font-size: 24rpx;
  color: #999;
  margin-left: 10rpx;
}

.search-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: linear-gradient(90deg, #2979ff, #4dabf7);
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
  border: none;
  box-shadow: 0 8rpx 16rpx rgba(41, 121, 255, 0.2);
}

.search-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

/* 统计卡片 */
.stats-card {
  margin: 0 30rpx 30rpx;
  background: linear-gradient(135deg, #2979ff 0%, #659dfb 100%);
  border-radius: 20rpx;
  padding: 40rpx;
  color: #fff;
  box-shadow: 0 10rpx 30rpx rgba(41, 121, 255, 0.3);
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.stat-label {
  font-size: 26rpx;
  opacity: 0.9;
}

/* 列表样式 */
.parking-list {
  padding: 0 30rpx;
}

.parking-item {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: all 0.3s;
}

.parking-item:active {
  transform: scale(0.99);
}

.parking-info {
  flex: 1;
  margin-right: 20rpx;
}

.parking-number {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
}

.car-number {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.owner-name, .expire-time {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 8rpx;
  line-height: 1.4;
}

.expire-badge {
  margin-left: 12rpx;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

/* 状态标签 */
.status {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  margin-left: 16rpx;
  vertical-align: middle;
}

.status-active {
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.status-expired {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.status-available {
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.status-occupied {
  background: rgba(255, 159, 67, 0.1);
  color: #ff9f43;
}

.status-reserved {
  background: rgba(56, 103, 214, 0.1);
  color: #3867d6;
}

.status-disabled {
  background: rgba(156, 136, 255, 0.1);
  color: #9c88ff;
}

/* 按钮样式 */
.renew-btn {
  background: #2979ff;
  color: white;
  border: none;
  border-radius: 34rpx;
  padding: 0 32rpx;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 26rpx;
  min-width: 140rpx;
  margin: 0;
  box-shadow: 0 6rpx 12rpx rgba(41, 121, 255, 0.2);
}

.renew-btn:active {
  background: #2565d6;
}

/* 空状态 */
.empty-state {
  padding: 100rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.empty-state image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 20rpx;
  filter: grayscale(1);
  opacity: 0.5;
}

/* 弹窗样式 */
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-panel {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  animation: popIn 0.3s ease-out;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.dialog-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 40rpx;
  color: #333;
}

.dialog-row {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.dialog-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #666;
}

.dialog-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.dialog-input {
  flex: 1;
  height: 80rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
}

.dialog-picker-value {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
}

.dialog-picker {
  flex: 1;
}

.dialog-textarea {
  width: 100%;
  height: 160rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  margin-bottom: 40rpx;
}

.dialog-footer {
  display: flex;
  gap: 30rpx;
}

.dialog-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 44rpx;
  font-size: 32rpx;
  margin: 0;
}

.dialog-btn.cancel {
  background: #f5f7fa;
  color: #666;
}

.dialog-btn.confirm {
  background: #2979ff;
  color: #fff;
  box-shadow: 0 8rpx 16rpx rgba(41, 121, 255, 0.2);
}

.dialog-btn:active {
  transform: scale(0.98);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30rpx 0;
  gap: 30rpx;
}

.page-btn {
  margin: 0;
  font-size: 26rpx;
  background: #fff;
  padding: 0 40rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 36rpx;
  border: 1rpx solid #eee;
  color: #666;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.02);
}

.page-btn[disabled] {
  background: #f5f7fa;
  color: #ccc;
  border-color: transparent;
  box-shadow: none;
}

.page-info {
  font-size: 28rpx;
  color: #999;
  font-family: Arial, sans-serif;
}
</style>
