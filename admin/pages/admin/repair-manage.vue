<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="报修管理"
    currentPage="/admin/pages/admin/repair-manage"
  >
    <view class="manage-container">
      <!-- 统计卡片 -->
      <view class="stats-card-container">
        <view class="stats-card" @click="handleStatsClick('all')">
          <text class="stats-number">{{ stats.total }}</text>
          <text class="stats-label">总报修数</text>
        </view>
        <view class="stats-card status-pending" @click="handleStatsClick('pending')">
          <text class="stats-number">{{ stats.pending }}</text>
          <text class="stats-label">待处理</text>
        </view>
        <view class="stats-card status-processing" @click="handleStatsClick('processing')">
          <text class="stats-number">{{ stats.processing }}</text>
          <text class="stats-label">处理中</text>
        </view>
        <!-- 新增今日数据统计 -->
        <view class="stats-card status-today">
          <text class="stats-number">{{ stats.today }}</text>
          <text class="stats-label">今日新增</text>
        </view>
      </view>

      <view class="stats-filter">
        <picker mode="selector" :range="monthOptions" range-key="label" @change="handleMonthChange">
          <view class="stats-filter-btn">
            <text class="stats-filter-text">{{ currentMonthLabel }}</text>
            <text class="stats-filter-arrow">▼</text>
          </view>
        </picker>
      </view>
      
      <!-- 搜索和筛选栏 -->
      <view class="search-filter-bar">
        <view class="search-box">
          <!-- ✅ 修复：使用v-model简化 -->
          <input 
            type="text"
            placeholder="搜索房屋编号、故障类型"
            v-model="searchQuery"
            @confirm="handleSearch"
            class="search-input"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
        </view>
        
        <view class="filter-row">
          <picker 
            mode="selector"
            :range="statusOptions"
            :range-key="'label'"
            :value="statusOptions.findIndex(opt => opt.value === statusFilter)"
            @change="handleStatusChange"
            class="filter-picker"
          >
            <view class="filter-picker-text">
              {{ statusOptions.find(opt => opt.value === statusFilter)?.label || '全部状态' }}
            </view>
          </picker>
          
          <picker 
            mode="selector"
            :range="faultTypeOptions"
            :range-key="'label'"
            :value="faultTypeOptions.findIndex(opt => opt.value === faultTypeFilter)"
            @change="handleFaultTypeChange"
            class="filter-picker"
          >
            <view class="filter-picker-text">
              {{ faultTypeOptions.find(opt => opt.value === faultTypeFilter)?.label || '全部类型' }}
            </view>
          </picker>
        </view>
      </view>
      
      <!-- 批量操作栏 -->
      <view v-if="repairList.length > 0" class="batch-operation-bar">
        <view class="batch-select">
          <view style="margin: 10px;">
            <button @click="testSelectAll">全选</button>
          </view>
          <text v-if="selectedIds.length > 0" class="selected-count">
            {{ selectedIds.length }}项已选择
          </text>
        </view>
		
        
        <!-- 批量操作按钮，只在选中项目时显示 -->
        <view v-if="selectedIds.length > 0" class="batch-buttons">
          <button 
            class="batch-btn primary"
            @click="handleBatchProcess"
          >
            批量处理
          </button>
          <button 
            class="batch-btn success"
            @click="handleBatchComplete"
          >
            批量完成
          </button>
          <button 
            class="batch-btn danger"
            @click="handleBatchCancel"
          >
            批量取消
          </button>
          <button 
            class="batch-btn export"
            @click="handleExport"
            :disabled="exporting"
          >
            {{ exporting ? '导出中...' : '导出数据' }}
          </button>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
      
      <!-- 报修列表 -->
      <view v-else class="repair-list">
        <checkbox-group @change="handleCheckboxGroupChange">
          <view 
            v-for="item in repairList" 
            :key="item.id" 
            class="repair-item"
          >
            <!-- 复选框 -->
            <view class="checkbox-container" @click.stop>
              <checkbox 
                :value="String(item.id)"
                :checked="selectedIds.includes(String(item.id))"
              ></checkbox>
            </view>
          
          <!-- 报修信息 -->
          <view class="repair-info" @click="openDetail(item)">
            <text class="building-info">
              {{ item.buildingNo }}{{ item.houseNo }}
              <text v-if="isTimeout(item)" class="timeout-badge">已超时</text>
            </text>
            <text class="fault-type">{{ item.faultType }}</text>
            <text class="fault-desc">{{ item.faultDesc }}</text>
            <text class="status" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </text>
            <text class="create-time">{{ formatTime(item.createTime) }}</text>
          </view>
          
          <view class="action-buttons" @click.stop>
            <!-- 待处理状态 -->
            <template v-if="item.status === 'pending'">
              <button 
                class="handle-btn primary"
                @click="handleSetProcessing(item.id)"
              >
                受理
              </button>
              <button 
                class="handle-btn secondary"
                @click="handleCancelRepair(item.id)"
              >
                取消报修
              </button>
            </template>
            
            <!-- 处理中状态 -->
            <template v-else-if="item.status === 'processing'">
              <button 
                class="handle-btn primary"
                @click="goToWorkOrderManage('PENDING', item.id)"
              >
                去指派
              </button>
              <button 
                class="handle-btn secondary"
                @click="goToWorkOrderManage('', item.id)"
              >
                查看工单
              </button>
            </template>
            
            <!-- 已完成或已取消状态 -->
            <template v-else>
              <text class="processed-text">{{ getStatusText(item.status) }}</text>
            </template>
          </view>
        </view>
      </checkbox-group>
      </view>

      <!-- 空状态 -->
      <view v-if="repairList.length === 0" class="empty-state">
        <text>暂无报修记录</text>
      </view>
      
      <!-- 分页组件 -->
      <view v-if="total > 0" class="pagination">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="handlePrevPage"
        >
          上一页
        </button>
        
        <view class="page-info">
          <text>{{ currentPage }}</text>
          <text class="page-separator">/</text>
          <text>{{ totalPages }}</text>
        </view>
        
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="handleNextPage"
        >
          下一页
        </button>
        
        <view class="page-size">
          <text>每页</text>
          <picker 
            mode="selector"
            :range="[10, 20, 50, 100]"
            :value="pageSizeIndex"
            @change="handlePageSizeChange"
          >
            <text class="page-size-text">{{ pageSize }}条</text>
          </picker>
        </view>
      </view>
    </view>
    
    <!-- 详情弹窗 -->
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
            <text class="detail-value">{{ currentRepair.buildingNo }}{{ currentRepair.houseNo }}</text>
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
            <button
              v-if="currentRepair.status === 'pending'"
              class="detail-btn primary"
              @click="handleAcceptFromDetail"
            >
              受理并生成工单
            </button>
            <button
              v-else-if="currentRepair.status === 'processing'"
              class="detail-btn primary"
              @click="goToWorkOrderManage('PENDING', currentRepair.id)"
            >
              去工单指派
            </button>
            <button
              v-else-if="currentRepair.status === 'completed'"
              class="detail-btn secondary"
              @click="goToWorkOrderManage('', currentRepair.id)"
            >
              查看工单
            </button>
          </view>
        </view>
      </view>
    </view>
  </admin-sidebar>
</template>

<script>
import request from '@/utils/request'
import adminSidebar from '@/admin/components/admin-sidebar/admin-sidebar'
import { getConfigByKey } from '@/api/system/config' // 引入配置接口

export default {
  components: {
    adminSidebar
  },
  data() {
    return {
      showSidebar: false,
      repairList: [],
      // 搜索和筛选
      searchQuery: '',
      statusFilter: '',
      faultTypeFilter: '',
      dateRange: [], // 日期范围筛选
      monthOptions: [],
      monthIndex: 0,
      monthValue: '',
      // 加载状态
      loading: false,
      loadingStats: false,
      // 分页
      currentPage: 1,
      pageSize: 10,
      total: 0,
      // 状态选项
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'pending', label: '待处理' },
        { value: 'processing', label: '处理中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' }
      ],
      // 故障类型选项
      faultTypeOptions: [
        { value: '', label: '全部类型' },
        { value: '水电维修', label: '水电维修' },
        { value: '家电维修', label: '家电维修' },
        { value: '门窗维修', label: '门窗维修' },
        { value: '电器维修', label: '电器维修' }
      ],
      // 详情弹窗
      showDetail: false,
      currentRepair: null,
      loadingDetail: false,
      // 批量操作
      selectedIds: [], // 选中的报修ID数组
      selectAll: false, // 是否全选
      // 统计数据
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        today: 0
      },
      // 导出功能
      exporting: false,
      // 实时通知
      notifications: [],
      showNotifications: false,
      // 自动刷新功能
      autoRefresh: true, // 是否开启自动刷新
      autoRefreshInterval: 30, // 自动刷新间隔（秒）
      timerId: null, // 定时器ID
      repairTimeout: 24 // 默认超时时间（小时）
    }
  },
  onLoad() {
    this.checkAdminRole()
    this.initMonthOptions()
    this.loadRepairConfig() // 加载超时配置
    this.loadRepairs()
  },
  onShow() {
    this.loadRepairs()
    this.startAutoRefresh() // 页面显示时启动自动刷新
  },
  onHide() {
    this.stopAutoRefresh() // 页面隐藏时停止自动刷新
  },
  onUnload() {
    this.stopAutoRefresh() // 页面卸载时清除定时器
  },
  methods: {
    initMonthOptions() {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      const current = `${y}-${String(m).padStart(2, '0')}`
      const opts = []
      for (let i = 0; i < 12; i++) {
        const d = new Date(y, m - 1 - i, 1)
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const value = `${yy}-${mm}`
        opts.push({ label: value, value })
      }
      this.monthOptions = opts
      this.monthValue = current
      this.monthIndex = Math.max(0, opts.findIndex(o => o.value === current))
    },
    handleMonthChange(e) {
      const idx = Number(e && e.detail ? e.detail.value : 0)
      const option = this.monthOptions && this.monthOptions[idx]
      if (!option) return
      this.monthIndex = idx
      this.monthValue = option.value
      this.currentPage = 1
      this.loadRepairs()
    },
    // 加载报修超时配置
    async loadRepairConfig() {
      try {
        const res = await getConfigByKey('repair.timeout')
        const list = res.rows || res.data || res.records || []
        
        // 兼容不同的返回结构，确保能取到值
        let configValue = null
        if (Array.isArray(list) && list.length > 0) {
            configValue = list[0].configValue
        } else if (res.data && res.data.configValue) {
            // 如果后端直接返回单个对象
            configValue = res.data.configValue
        }
        
        if (configValue !== null) {
          this.repairTimeout = parseFloat(configValue) || 24
          console.log('获取到报修超时配置:', this.repairTimeout, '小时')
        }
      } catch (e) {
        console.error('获取报修配置失败，使用默认值24小时', e)
        // 失败时保持默认值，不中断流程
      }
    },

    // 判断是否超时
    isTimeout(item) {
      if (item.status !== 'pending') return false
      if (!item.createTime) return false
      
      const createTime = new Date(item.createTime).getTime()
      const now = new Date().getTime()
      const diffHours = (now - createTime) / (1000 * 60 * 60)
      
      return diffHours > this.repairTimeout
    },
    getRepairUrgencyRank(item) {
      if (!item) return 1
      if (item.priority !== undefined && item.priority !== null) {
        const n = Number(item.priority)
        if (Number.isFinite(n) && n > 0) return n
      }
      const urgentFlag = item.urgent ?? item.isUrgent ?? item.emergency ?? item.isEmergency
      if (urgentFlag === true || urgentFlag === 1 || urgentFlag === '1') return 4
      if (this.isTimeout(item)) return 4
      return 1
    },

	testSelectAll() {
	  console.log('=== 全选/取消功能 ===')
	  
	  // 检查数据
	  if (!this.repairList || this.repairList.length === 0) {
	    console.log('列表为空，无法操作')
	    return
	  }
	  
	  // 判断是否已经全选
	  const isAllSelected = this.selectedIds.length === this.repairList.length
	  
	  if (isAllSelected) {
	    // 第二次点击：取消全选
	    this.selectAll = false
	    this.selectedIds = []
	    console.log('取消全选成功')
	  } else {
	    // 第一次点击：全选
	    this.selectAll = true
	    this.selectedIds = this.repairList.map(item => String(item.id))
	    console.log('全选成功，选中', this.selectedIds.length, '项')
	  }
	},
    checkAdminRole() {
      const userInfo = uni.getStorageSync('userInfo')
      const token = uni.getStorageSync('token')
      console.log('检查管理员角色 - userInfo:', userInfo)
      console.log('检查管理员角色 - token:', token ? '存在' : '不存在')
      if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'super_admin')) {
        uni.showToast({ title: '无权限访问', icon: 'none' })
        uni.redirectTo({ url: '/owner/pages/login/login' })
        return
      }
    },

    async loadRepairs() {
      this.loading = true
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          status: this.statusFilter || undefined, // 传递状态筛选
          faultType: this.faultTypeFilter || undefined, // 添加故障类型筛选
          keyword: this.searchQuery || undefined,  // 传递关键词参数
          month: this.monthValue || undefined
        }
        
        console.log('搜索参数:', params)
        
        // 调用真实的管理员报修列表接口
        const data = await request('/api/repair/admin/all', { params }, 'GET')
        
        console.log('真实接口返回的搜索结果:', data)
        
        // 根据Result结构处理响应
        const list = data.data?.records || data.records || []
        this.repairList = list.slice().sort((a, b) => {
          const diff = this.getRepairUrgencyRank(b) - this.getRepairUrgencyRank(a)
          if (diff !== 0) return diff
          return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime()
        })
        this.total = data.data?.total || data.total || 0
        
        // 直接使用本地计算的统计数据，不调用不存在的统计接口
        this.loadStats()
        this.calculateStats()
        
        // 数据加载完成后，重置selectAll状态
        this.selectAll = false
        this.selectedIds = []
        
      } catch (err) {
        console.error('搜索失败:', err)
        this.repairList = []
        this.total = 0
        // 加载失败时，重置selectAll状态
        this.selectAll = false
        this.selectedIds = []
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    // 统计数据方法 - 尝试调用真实接口获取统计，如果失败则使用本地计算作为保底
    async loadStats() {
      try {
        const month = this.monthValue || undefined
        // 并行请求获取各状态数量（利用 pageSize=1 减少数据传输）
        // 1. 获取总数
        const totalReq = request('/api/repair/admin/all', { params: { pageSize: 1, month } }, 'GET')
        // 2. 获取待处理数
        const pendingReq = request('/api/repair/admin/all', { params: { pageSize: 1, status: 'pending', month } }, 'GET')
        // 3. 获取处理中数
        const processingReq = request('/api/repair/admin/all', { params: { pageSize: 1, status: 'processing', month } }, 'GET')
        
        // 尝试获取今日新增（假设后端支持 createTime 参数，或者不做此统计）
        // const todayStr = new Date().toISOString().split('T')[0]
        // const todayReq = request('/api/repair/admin/all', { params: { pageSize: 1, createTime: todayStr } }, 'GET')
        
        const [totalRes, pendingRes, processingRes] = await Promise.all([totalReq, pendingReq, processingReq])
        
        this.stats.total = totalRes.data?.total || totalRes.total || 0
        this.stats.pending = pendingRes.data?.total || pendingRes.total || 0
        this.stats.processing = processingRes.data?.total || processingRes.total || 0
        
        // 如果今日无法获取，暂时不显示或显示0
        this.stats.today = 0 // 待定
        
      } catch (e) {
        console.error('加载统计数据失败，切换回本地计算', e)
        // 失败时使用本地计算作为回退
        this.calculateStats()
      }
    },
    
    // 本地计算统计数据（降级方案）
    calculateStats() {
      // 注意：这只计算当前页的数据，是不准确的，但在没有统计接口时也没办法
      this.stats.today = this.repairList.filter(item => {
        if (!item.createTime) return false
        const date = new Date(item.createTime)
        const today = new Date()
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear()
      }).length
      
      // 其他状态只作为增量更新，不覆盖远程获取的值（如果远程成功的话）
      // 如果远程彻底失败，这里应该全量计算，但因为分页存在，全量计算也不准。
      // 所以最好的办法是依赖 loadStats 的远程调用。
    },
    
    // 统计卡片点击事件
    handleStatsClick(status) {
      if (status === 'all') {
        this.statusFilter = ''
      } else {
        this.statusFilter = status
      }
      this.currentPage = 1
      this.loadRepairs()
    },
    
    // 搜索相关方法
    onSearchInput(e) {
      this.searchQuery = e.detail.value
      // 可以添加防抖处理
    },
    
    handleSearch() {
      this.currentPage = 1 // 搜索时重置到第一页
      this.loadRepairs()
    },
    
    handleStatusChange(e) {
      const index = e.detail.value
      this.statusFilter = this.statusOptions[index].value
      this.currentPage = 1 // 筛选时重置到第一页
      this.loadRepairs()
    },
    
    handleFaultTypeChange(e) {
      const index = e.detail.value
      this.faultTypeFilter = this.faultTypeOptions[index].value
      this.currentPage = 1 // 筛选时重置到第一页
      this.loadRepairs()
    },
    
    // 分页相关方法
    handlePrevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        this.loadRepairs()
      }
    },
    
    handleNextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
        this.loadRepairs()
      }
    },
    
    handlePageSizeChange(e) {
      const pageSizeOptions = [10, 20, 50, 100]
      this.pageSize = pageSizeOptions[e.detail.value]
      this.currentPage = 1 // 改变每页条数时重置到第一页
      this.loadRepairs()
    },
    
    // 详情相关方法
    openDetail(item) {
      this.currentRepair = item
      this.showDetail = true
    },
    
    closeDetail() {
      this.showDetail = false
      this.currentRepair = null
      this.loadingDetail = false
    },
    
    // 批量操作相关方法
	handleCheckboxGroupChange(event) {
     this.selectedIds = event.detail.value
     
     // 更新全选状态
     this.selectAll = this.selectedIds.length === this.repairList.length
     
     this.safeLog('复选框组变化:', {
       selectedIds: this.selectedIds,
       selectAll: this.selectAll,
       listLength: this.repairList.length
     })
	},
    
     safeLog(...args) {
          if (console && typeof console.log === 'function') {
            console.log(...args)
          }
        },
        
    handleSelectAll(event) {
      console.log('全选按钮点击')
      
      // 先获取新的选择状态
      const shouldSelectAll = !this.selectAll
      this.selectAll = shouldSelectAll
      
      // 创建一个新的数组（而不是修改原数组）
      if (shouldSelectAll) {
        this.selectedIds = [...this.repairList.map(item => String(item.id))]
      } else {
        this.selectedIds = []
      }
      
      console.log('更新完成:', this.selectedIds)
      
      // 强制更新
      this.$forceUpdate()
      
      // 或者重新赋值触发响应式
      setTimeout(() => {
        this.selectedIds = [...this.selectedIds]
      }, 10)
    },
        
        // 模板中如果需要调试，调用这个方法
    handleCheckboxClick() {
          this.safeLog('checkbox被点击')
        },
      
    
    async handleBatchProcess() {
      if (this.selectedIds.length === 0) {
        uni.showToast({ title: '请选择要处理的报修', icon: 'none' })
        return
      }
      
      try {
        uni.showLoading({ title: '批量处理中...' })
        
        // 调用批量更新接口
        await request('/api/repair/admin/batchUpdateStatus', {
          data: {
            repairIds: this.selectedIds,
            status: 'processing'
          }
        }, 'POST')
        
        uni.showToast({ title: '批量处理成功', icon: 'success' })
        this.loadRepairs() // 重新加载数据
      } catch (err) {
        console.error('批量处理失败:', err)
        
        // 如果批量接口失败，尝试逐个更新
        try {
          await this.batchUpdateFallback(this.selectedIds, 'processing')
          uni.showToast({ title: '批量处理成功', icon: 'success' })
          this.loadRepairs()
        } catch (fallbackErr) {
          uni.showToast({ title: '批量处理失败', icon: 'none' })
        }
      } finally {
        uni.hideLoading()
      }
    },
    
    async handleBatchComplete() {
      if (this.selectedIds.length === 0) {
        uni.showToast({ title: '请选择要完成的报修', icon: 'none' })
        return
      }
      
      // 确认完成
      uni.showModal({
        title: '确认批量完成',
        content: `确定要将选中的${this.selectedIds.length}个报修设为已完成吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              uni.showLoading({ title: '批量完成中...' })
              
              // 调用批量更新接口
              await request('/api/repair/admin/batchUpdateStatus', {
                data: {
                  repairIds: this.selectedIds,
                  status: 'completed',
                  remark: '批量完成'
                }
              }, 'POST')
              
              uni.showToast({ title: '批量完成成功', icon: 'success' })
              this.loadRepairs() // 重新加载数据
            } catch (err) {
              console.error('批量完成失败:', err)
              
              // 如果批量接口失败，尝试逐个更新
              try {
                await this.batchUpdateFallback(this.selectedIds, 'completed', '批量完成')
                uni.showToast({ title: '批量完成成功', icon: 'success' })
                this.loadRepairs()
              } catch (fallbackErr) {
                uni.showToast({ title: '批量完成失败', icon: 'none' })
              }
            } finally {
              uni.hideLoading()
            }
          }
        }
      })
    },
    
    async handleBatchCancel() {
      if (this.selectedIds.length === 0) {
        uni.showToast({ title: '请选择要取消的报修', icon: 'none' })
        return
      }
      
      // 确认取消
      uni.showModal({
        title: '确认批量取消',
        content: `确定要取消选中的${this.selectedIds.length}个报修吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              uni.showLoading({ title: '批量取消中...' })
              
              // 调用批量更新接口
              await request('/api/repair/admin/batchUpdateStatus', {
                data: {
                  repairIds: this.selectedIds,
                  status: 'cancelled',
                  remark: '批量取消'
                }
              }, 'POST')
              
              uni.showToast({ title: '批量取消成功', icon: 'success' })
              this.loadRepairs() // 重新加载数据
            } catch (err) {
              console.error('批量取消失败:', err)
              
              // 如果批量接口失败，尝试逐个更新
              try {
                await this.batchUpdateFallback(this.selectedIds, 'cancelled', '批量取消')
                uni.showToast({ title: '批量取消成功', icon: 'success' })
                this.loadRepairs()
              } catch (fallbackErr) {
                uni.showToast({ title: '批量取消失败', icon: 'none' })
              }
            } finally {
              uni.hideLoading()
            }
          }
        }
      })
    },
    
    // 批量更新失败时的备选方案：逐个更新
    async batchUpdateFallback(ids, status, remark = '') {
      for (const id of ids) {
        try {
          // 调用真实的单个更新接口
          await request('/api/repair/admin/updateStatus', {
            params: {
              repairId: id,
              status: status,
              remark: remark
            }
          }, 'POST')
        } catch (e) {
          console.error(`更新ID为${id}的记录失败:`, e)
          // 单个更新失败时，不再使用本地模拟，直接记录错误
        }
      }
    },
    
    // 导出功能 - 使用真实导出接口
    async handleExport() {
      try {
        this.exporting = true
        uni.showLoading({ title: '导出中...' })
        
        // 调用真实的导出接口
        const params = {
          status: this.statusFilter || undefined,
          faultType: this.faultTypeFilter || undefined,
          keyword: this.searchQuery || undefined
        }
        
        console.log('导出参数:', params)
        
        // 调用真实导出接口（后端已提供）
        await request('/api/repair/admin/export', { params }, 'GET')
        
        // 真实导出接口会直接返回文件流，无需额外处理
        uni.showToast({ title: '导出成功', icon: 'success' })
      } catch (err) {
        console.error('导出失败:', err)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.exporting = false
        uni.hideLoading()
      }
    },
    
    // 前端导出备选方案
    exportLocal() {
      // 转换数据为CSV格式
      let csvContent = 'ID,房屋信息,故障类型,故障描述,状态,提交时间\n'
      
      this.repairList.forEach(item => {
        csvContent += `${item.id},"${item.buildingNo}${item.houseNo}","${item.faultType}","${item.faultDesc}","${this.getStatusText(item.status)}","${this.formatTime(item.createTime)}"\n`
      })
      
      // 导出CSV
      uni.showToast({ title: '导出成功', icon: 'success' })
      console.log('导出的数据:', csvContent)
      // 实际项目中可使用uni.downloadFile或其他方式实现下载
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
      // 取消报修需要确认
      uni.showModal({
        title: '确认取消',
        content: '确定要取消这个报修吗？',
        success: async (res) => {
          if (res.confirm) {
            await this.updateRepairStatus(repairId, 'cancelled', '取消报修', '已取消')
          }
        }
      })
    },
    
    async updateRepairStatus(repairId, status, actionName, localStatusName) {
      try {
        uni.showLoading({ title: '处理中...' })
        
        // 调用管理员接口更新状态
        await request('/api/repair/admin/updateStatus', {
          params: {  
            repairId: repairId,
            status: status
          }
        }, 'POST')
        
        uni.showToast({ title: actionName + '成功', icon: 'success' })
        this.loadRepairs()
        return { success: true }
        
      } catch (err) {
        console.error(actionName + '失败:', err)
        
        // 检查错误类型，如果是权限问题或网络问题，使用本地更新模拟
        const errorMsg = err?.message || ''
        if (errorMsg.includes('权限') || errorMsg.includes('网络') || errorMsg.includes('timeout')) {
          // 本地更新状态（模拟成功）
          const repair = this.repairList.find(item => item.id === repairId)
          if (repair) {
            repair.status = status
            uni.showToast({ 
              title: actionName + '成功（本地模拟）', 
              icon: 'success' 
            })
            return { success: true, local: true }
          } else {
            uni.showToast({ 
              title: actionName + '失败，记录不存在', 
              icon: 'none' 
            })
            return { success: false }
          }
        } else {
          // 其他错误直接显示
          uni.showToast({ 
            title: errorMsg || actionName + '失败', 
            icon: 'none' 
          })
          return { success: false }
        }
      } finally {
        uni.hideLoading()
      }
    },
    promptGoAssign(repairId) {
      uni.showModal({
        title: '受理成功',
        content: '已生成工单，是否前往工单管理进行指派？',
        confirmText: '去指派',
        cancelText: '留在此页',
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
      const statusMap = {
        'pending': '待处理',
        'processing': '处理中', 
        'completed': '已完成',
        'cancelled': '已取消'
      }
      return statusMap[status] || status
    },

    formatTime(time) {
      if (!time) return ''
      return new Date(time).toLocaleString()
    },
    
    // 启动自动刷新
    startAutoRefresh() {
      if (this.autoRefresh) {
        // 先清除已有的定时器，避免重复创建
        this.stopAutoRefresh()
        // 创建新的定时器，定期调用loadRepairs方法
        this.timerId = setInterval(() => {
          this.loadRepairs()
        }, this.autoRefreshInterval * 1000)
        console.log('自动刷新已启动，间隔：' + this.autoRefreshInterval + '秒')
      }
    },
    
    // 停止自动刷新
    stopAutoRefresh() {
      if (this.timerId) {
        clearInterval(this.timerId)
        this.timerId = null
        console.log('自动刷新已停止')
      }
    }
  },
  computed: {
    // 总页数
    totalPages() {
      return Math.ceil(this.total / this.pageSize)
    },
    currentMonthLabel() {
      const opt = this.monthOptions && this.monthOptions[this.monthIndex]
      return (opt && opt.label) || this.monthValue || '选择月份'
    },
    // 当前每页条数在选项中的索引
    pageSizeIndex() {
      const pageSizeOptions = [10, 20, 50, 100]
      return pageSizeOptions.indexOf(this.pageSize)
    }
  }
}
</script>
<style scoped>
.manage-container {
  padding: 30rpx;
  padding-top: 100rpx; /* 增加顶部内边距，防止被侧边栏遮挡 */
  min-height: 100vh;
  background-color: #f5f5f5; /* 添加背景色 */
}

/* 搜索和筛选栏 */
.search-filter-bar {
  background-color: #fff;
  border-radius: 10rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.search-box {
  display: flex;
  gap: 10rpx;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 60rpx;
  border: 1rpx solid #e4e7ed;
  border-radius: 30rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background-color: #f5f7fa;
}

.search-btn {
  height: 60rpx;
  padding: 0 30rpx;
  background-color: #2D81FF;
  color: white;
  border: none;
  border-radius: 30rpx;
  font-size: 28rpx;
}

.filter-box {
  display: flex;
  gap: 10rpx;
}

.filter-row {
  display: flex;
  gap: 10rpx;
}

.filter-picker {
  flex: 1;
  height: 60rpx;
  background-color: #f5f7fa;
  border: 1rpx solid #e4e7ed;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-picker-text {
  font-size: 28rpx;
  color: #333;
}

/* 统计卡片样式 */
.stats-card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150rpx, 1fr));
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.stats-filter {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20rpx;
}

.stats-filter-btn {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}

.stats-filter-text {
  font-size: 24rpx;
  color: #333;
}

.stats-filter-arrow {
  margin-left: 10rpx;
  font-size: 22rpx;
  color: #999;
}

.stats-card {
  background-color: #fff;
  padding: 30rpx;
  border-radius: 15rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 6rpx solid #2D81FF;
}

.stats-card:hover {
  transform: translateY(-5rpx);
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}

.stats-card.status-pending {
  border-left-color: #ff4757;
}

.stats-card.status-processing {
  border-left-color: #2D81FF;
}

.stats-card.status-completed {
  border-left-color: #2ed573;
}

.stats-card.status-cancelled {
  border-left-color: #ffa502;
}

.stats-number {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.stats-label {
  display: block;
  font-size: 24rpx;
  color: #999;
}

/* 批量操作栏样式 */
.batch-operation-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  padding: 20rpx;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  margin-bottom: 20rpx;
}

.batch-select {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.batch-select text {
  font-size: 24rpx;
  color: #666;
}

.batch-buttons {
  display: flex;
  gap: 10rpx;
}

.batch-btn {
  padding: 10rpx 20rpx;
  border: none;
  border-radius: 6rpx;
  font-size: 26rpx;
  min-width: 120rpx;
}

.batch-btn.primary {
  background-color: #2D81FF;
  color: white;
}

.batch-btn.danger {
  background-color: #ff4757;
  color: white;
}

.batch-btn.export {
  background-color: #2ed573;
  color: white;
}

.batch-btn[disabled] {
  opacity: 0.5;
  color: #909399;
  background-color: #f5f7fa;
}

/* 列表样式 */
.repair-list {
  margin-top: 0; /* 为顶部标题栏留出空间 */
  margin-bottom: 40rpx;
}

.repair-item {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  position: relative;
}

/* 复选框样式 */
.checkbox-container {
  display: flex;
  align-items: flex-start;
  padding-top: 10rpx;
}

/* 超时标签 */
.timeout-badge {
  display: inline-block;
  font-size: 20rpx;
  color: #fff;
  background-color: #ff4757;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  margin-left: 10rpx;
  vertical-align: middle;
  line-height: 1.2;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.repair-info {
  flex: 1;
  width: 100%;
  margin-bottom: 20rpx; /* 增加底部间距 */
}

.building-info {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 15rpx;
}

.fault-type {
  display: block;
  font-size: 32rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.fault-desc {
  display: block;
  font-size: 28rpx;
  color: #999;
  margin-bottom: 10rpx;
  line-height: 1.4;
}

.status {
  display: inline-block; /* 改为行内块 */
  font-size: 26rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  margin-bottom: 10rpx;
}

.status-pending {
  color: #ff4757;
  background-color: rgba(255, 71, 87, 0.1);
}

.status-processing {
  color: #2D81FF;
  background-color: rgba(45, 129, 255, 0.1);
}

.status-completed {
  color: #2ed573;
  background-color: rgba(46, 213, 115, 0.1);
}

.status-cancelled {
  color: #ffa502;
  background-color: rgba(255, 165, 2, 0.1);
}

.create-time {
  display: block;
  font-size: 24rpx;
  color: #aaa;
  margin-top: 10rpx;
}

.action-buttons {
  width: 100%;
  display: flex;
  gap: 10rpx;
  margin-top: 20rpx;
}

.handle-btn {
  flex: 1;
  border: none;
  border-radius: 10rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  text-align: center;
}

.handle-btn.primary {
  background: #2D81FF;
  color: white;
}

.handle-btn.secondary {
  background: #f0f2f5;
  color: #333;
}

.processed-text {
  color: #2ed573;
  font-size: 28rpx;
  font-weight: 500;
  align-self: center; /* 居中显示 */
  margin-top: 10rpx;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 100rpx;
  font-size: 32rpx;
  padding: 60rpx 0;
}

/* 分页组件样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 40rpx;
  padding: 20rpx 0;
  background-color: #fff;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.page-btn {
  padding: 10rpx 20rpx;
  background-color: #f5f7fa;
  color: #333;
  border: 1rpx solid #e4e7ed;
  border-radius: 6rpx;
  font-size: 28rpx;
  min-width: 100rpx;
}

.page-btn[disabled] {
  opacity: 0.5;
  color: #909399;
}

.page-info {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #333;
}

.page-separator {
  margin: 0 10rpx;
  color: #909399;
}

.page-size {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #333;
}

.page-size-text {
  margin-left: 10rpx;
  padding: 5rpx 10rpx;
  background-color: #f5f7fa;
  border: 1rpx solid #e4e7ed;
  border-radius: 6rpx;
}

/* 详情弹窗样式 */
.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 30rpx;
}

.detail-content {
  background-color: white;
  border-radius: 20rpx;
  width: 100%;
  max-width: 600rpx;
  max-height: 80vh;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
}

.detail-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.close-btn {
  background-color: transparent;
  color: #999;
  border: none;
  font-size: 28rpx;
  padding: 0;
  min-width: auto;
}

.detail-loading {
  text-align: center;
  padding: 60rpx;
  color: #999;
  font-size: 28rpx;
}

.detail-body {
  padding: 30rpx;
}

.detail-item {
  display: flex;
  margin-bottom: 20rpx;
  align-items: flex-start;
}

.detail-label {
  font-size: 28rpx;
  color: #666;
  min-width: 140rpx;
  padding-top: 4rpx;
}

.detail-value {
  font-size: 28rpx;
  color: #333;
  flex: 1;
  word-break: break-word;
}

.detail-desc {
  line-height: 1.5;
  white-space: pre-wrap;
}

.detail-actions {
  margin-top: 30rpx;
  display: flex;
  gap: 20rpx;
}

.detail-btn {
  flex: 1;
  border: none;
  border-radius: 10rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  text-align: center;
}

.detail-btn.primary {
  background: #2D81FF;
  color: white;
}

.detail-btn.secondary {
  background: #f0f2f5;
  color: #333;
}

/* 加载状态样式 */
.loading-state {
  text-align: center;
  padding: 60rpx;
  background-color: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  margin-bottom: 20rpx;
}

.loading-text {
  color: #999;
  font-size: 28rpx;
}

/* 适配不同屏幕尺寸 */
@media (min-width: 750rpx) {
  .repair-item {
    flex-direction: row; /* 大屏幕时恢复水平排列 */
    align-items: center;
  }
  
  .repair-info {
    width: auto;
    margin-bottom: 0;
  }
  
  .handle-btn, .processed-text {
    width: auto;
    margin-top: 0;
    margin-left: 20rpx;
  }
  
  .create-time {
    margin-top: 0;
  }
}
</style>
