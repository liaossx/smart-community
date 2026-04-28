<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="注册审核"
    currentPage="/admin/pages/admin/register-review"
    pageBreadcrumb="管理后台 / 注册审核"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">注册申请列表</text>
          <text class="overview-subtitle">统一为后台审核表格页，保留通过、驳回和角色确认流程。</text>
        </view>

        <view class="overview-chip">
          <text class="overview-chip-label">审批动作</text>
          <text class="overview-chip-value">用户开通</text>
        </view>
      </view>

      <view class="status-summary-bar register-status-bar">
        <view class="status-summary-card" :class="{ active: statusFilter === '' }" @click="applyQuickStatus('')">
          <text class="summary-label">全部申请</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card pending" :class="{ active: statusFilter === 'PENDING' }" @click="applyQuickStatus('PENDING')">
          <text class="summary-label">待审核</text>
          <text class="summary-value">{{ stats.pending }}</text>
        </view>
        <view class="status-summary-card approved" :class="{ active: statusFilter === 'ACTIVE' }" @click="applyQuickStatus('ACTIVE')">
          <text class="summary-label">已通过</text>
          <text class="summary-value">{{ stats.approved }}</text>
        </view>
        <view class="status-summary-card rejected" :class="{ active: statusFilter === 'REJECTED' }" @click="applyQuickStatus('REJECTED')">
          <text class="summary-label">已驳回</text>
          <text class="summary-value">{{ stats.rejected }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid register-query-grid">
          <view class="query-field query-field-wide">
            <text class="query-label">关键词</text>
            <input
              v-model="searchQuery"
              class="query-input"
              type="text"
              placeholder="搜索用户名、姓名或手机号"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">审核状态</text>
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

          <view class="query-field">
            <text class="query-label">申请角色</text>
            <picker
              mode="selector"
              :range="roleOptions"
              range-key="label"
              :value="rolePickerIndex"
              @change="handleRoleChange"
            >
              <view class="query-picker">
                <text class="query-picker-text">{{ currentRoleLabel }}</text>
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
          <text class="toolbar-meta active">待审核 {{ stats.pending }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">当前角色筛选：{{ currentRoleLabel }}</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="scroll-table">
          <view class="table-head register-table">
            <text class="table-col col-name">申请人</text>
            <text class="table-col col-username">用户名</text>
            <text class="table-col col-phone">手机号</text>
            <text class="table-col col-role">申请角色</text>
            <text class="table-col col-time">申请时间</text>
            <text class="table-col col-status">状态</text>
            <text class="table-col col-reason">驳回原因</text>
            <text class="table-col col-actions">操作</text>
          </view>

          <view
            v-for="(item, index) in requestList"
            :key="item.id"
            class="table-row register-table"
            :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
          >
            <view class="table-col col-name">
              <text class="primary-text">{{ item.realName || '-' }}</text>
            </view>

            <view class="table-col col-username">
              <text class="plain-text">{{ item.username || '-' }}</text>
            </view>

            <view class="table-col col-phone">
              <text class="plain-text">{{ item.phone || '-' }}</text>
            </view>

            <view class="table-col col-role">
              <text class="plain-text">{{ getRoleText(item.role) }}</text>
            </view>

            <view class="table-col col-time">
              <text class="minor-text">{{ formatTime(item.applyTime) }}</text>
            </view>

            <view class="table-col col-status">
              <text class="status-pill" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
            </view>

            <view class="table-col col-reason">
              <text class="desc-text">{{ item.rejectReason || '无' }}</text>
            </view>

            <view class="table-col col-actions row-actions">
              <button v-if="item.status === 'PENDING'" class="row-btn secondary-warn" @click="openReject(item)">驳回</button>
              <button v-if="item.status === 'PENDING'" class="row-btn primary" @click="openApprove(item)">通过</button>
            </view>
          </view>
        </view>

        <view v-if="requestList.length === 0" class="empty-state">
          <text>暂无注册申请</text>
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

      <view v-if="showRejectModal" class="detail-modal" @click="closeReject">
        <view class="detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">驳回申请</text>
            <button class="close-btn" @click="closeReject">关闭</button>
          </view>

          <view class="detail-body">
            <view class="detail-item">
              <text class="detail-label">申请人:</text>
              <text class="detail-value">{{ currentItem ? currentItem.realName : '-' }}</text>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">驳回原因:</text>
              <textarea
                class="modal-textarea"
                v-model="rejectReason"
                placeholder="请输入驳回原因"
                maxlength="200"
              ></textarea>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="closeReject">取消</button>
              <button class="detail-btn primary" @click="confirmReject">确定</button>
            </view>
          </view>
        </view>
      </view>

      <view v-if="showApproveModal" class="detail-modal" @click="closeApprove">
        <view class="detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">通过申请</text>
            <button class="close-btn" @click="closeApprove">关闭</button>
          </view>

          <view class="detail-body">
            <view class="detail-item">
              <text class="detail-label">申请人:</text>
              <text class="detail-value">{{ currentItem ? currentItem.realName : '-' }}</text>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">确认角色:</text>
              <picker
                mode="selector"
                :range="approveRoleOptions"
                range-key="label"
                :value="approveRoleIndex"
                @change="handleApproveRoleChange"
              >
                <view class="modal-picker">
                  <text class="modal-picker-text">{{ approveRoleLabel }}</text>
                  <text class="modal-picker-arrow">></text>
                </view>
              </picker>
            </view>

            <view v-if="needsCommunityAssignment" class="detail-item detail-item-block">
              <text class="detail-label">负责社区:</text>
              <picker
                mode="selector"
                :range="communityList"
                range-key="name"
                :value="approveCommunityIndex"
                :disabled="communityListLoading || communityList.length === 0"
                @change="handleApproveCommunityChange"
              >
                <view class="modal-picker" :class="{ placeholder: !approveCommunityLabel }">
                  <text class="modal-picker-text">{{ approveCommunityDisplayText }}</text>
                  <text class="modal-picker-arrow">></text>
                </view>
              </picker>
              <text class="detail-tip">{{ approveCommunityTip }}</text>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="closeApprove">取消</button>
              <button class="detail-btn primary" @click="confirmApprove">确定</button>
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
      searchQuery: '',
      statusFilter: '',
      roleFilter: '',
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 'PENDING', label: '待审核' },
        { value: 'ACTIVE', label: '已通过' },
        { value: 'REJECTED', label: '已驳回' },
        { value: 'DISABLED', label: '已禁用' }
      ],
      roleOptions: [
        { value: '', label: '全部角色' },
        { value: 'owner', label: '业主(owner)' },
        { value: 'worker', label: '工作人员(worker)' },
        { value: 'admin', label: '管理员(admin)' },
        { value: 'super_admin', label: '超级管理员(super_admin)' }
      ],
      requestList: [],
      currentPage: 1,
      pageSize: 10,
      total: 0,
      stats: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      },
      showRejectModal: false,
      rejectReason: '',
      currentItem: null,
      showApproveModal: false,
      communityList: [],
      communityListLoading: false,
      communityLoadError: '',
      approveRole: 'owner',
      approveCommunityId: '',
      approveRoleOptions: [
        { value: 'owner', label: '业主(owner)' },
        { value: 'worker', label: '工作人员(worker)' },
        { value: 'admin', label: '管理员(admin)' },
        { value: 'super_admin', label: '超级管理员(super_admin)' }
      ]
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
    statusPickerIndex() {
      return Math.max(0, this.statusOptions.findIndex(item => item.value === this.statusFilter))
    },
    rolePickerIndex() {
      return Math.max(0, this.roleOptions.findIndex(item => item.value === this.roleFilter))
    },
    currentStatusLabel() {
      const current = this.statusOptions.find(item => item.value === this.statusFilter)
      return current ? current.label : '全部状态'
    },
    currentRoleLabel() {
      const current = this.roleOptions.find(item => item.value === this.roleFilter)
      return current ? current.label : '全部角色'
    },
    approveRoleIndex() {
      return Math.max(0, this.approveRoleOptions.findIndex(item => item.value === this.approveRole))
    },
    approveRoleLabel() {
      const current = this.approveRoleOptions.find(item => item.value === this.approveRole)
      return current ? current.label : '业主(owner)'
    },
    needsCommunityAssignment() {
      return this.approveRole === 'admin' || this.approveRole === 'worker'
    },
    approveCommunityIndex() {
      const index = this.communityList.findIndex(item => String(item.id) === String(this.approveCommunityId))
      return index >= 0 ? index : 0
    },
    approveCommunityLabel() {
      const current = this.communityList.find(item => String(item.id) === String(this.approveCommunityId))
      return current ? current.name : ''
    },
    approveCommunityDisplayText() {
      if (this.communityListLoading) return '社区列表加载中...'
      if (this.approveCommunityLabel) return this.approveCommunityLabel
      if (this.communityLoadError) return '社区列表加载失败'
      if (!this.communityList.length) return '暂无可选社区'
      return this.approveRole === 'admin' ? '请选择负责社区' : '请选择所属社区'
    },
    approveCommunityTip() {
      if (this.communityListLoading) return '正在加载社区列表，请稍候。'
      if (this.communityLoadError) return this.communityLoadError
      if (!this.communityList.length) return '当前未获取到社区数据，无法完成该角色审批。'
      return this.approveRole === 'admin'
        ? '管理员账号通过后将绑定到所选社区，便于后续按社区管理数据。'
        : '工作人员账号通过后将绑定到所选社区，便于后续按社区接收任务。'
    }
  },
  onShow() {
    this.loadData()
    this.loadStats()
  },
  methods: {
    extractTotal(data) {
      if (typeof data?.total === 'number') return data.total
      if (typeof data?.data?.total === 'number') return data.data.total
      if (Array.isArray(data?.records)) return data.records.length
      if (Array.isArray(data?.data?.records)) return data.data.records.length
      if (Array.isArray(data)) return data.length
      return 0
    },
    async loadStats() {
      try {
        const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
          request('/api/admin/user/register-requests', { params: { pageNum: 1, pageSize: 1, role: this.roleFilter || undefined } }, 'GET'),
          request('/api/admin/user/register-requests', { params: { pageNum: 1, pageSize: 1, role: this.roleFilter || undefined, status: 'PENDING' } }, 'GET'),
          request('/api/admin/user/register-requests', { params: { pageNum: 1, pageSize: 1, role: this.roleFilter || undefined, status: 'ACTIVE' } }, 'GET'),
          request('/api/admin/user/register-requests', { params: { pageNum: 1, pageSize: 1, role: this.roleFilter || undefined, status: 'REJECTED' } }, 'GET')
        ])
        this.stats = {
          total: this.extractTotal(totalRes),
          pending: this.extractTotal(pendingRes),
          approved: this.extractTotal(approvedRes),
          rejected: this.extractTotal(rejectedRes)
        }
      } catch (error) {
        console.error('加载注册审核统计失败', error)
      }
    },
    async loadData() {
      this.loading = true
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          keyword: this.searchQuery || undefined,
          status: this.statusFilter || undefined,
          role: this.roleFilter || undefined
        }
        const res = await request('/api/admin/user/register-requests', { params }, 'GET')
        const page = Array.isArray(res?.records) || Array.isArray(res?.data?.records) ? (res?.data?.records ? res.data : res) : (res?.data || res)
        const records = Array.isArray(page?.records) ? page.records : (Array.isArray(res) ? res : [])
        const total = page?.total ?? res?.total ?? records.length ?? 0

        this.requestList = records.map(item => ({
          id: item?.id,
          username: item?.username,
          phone: item?.phone,
          realName: item?.realName,
          role: item?.role,
          status: item?.status,
          applyTime: item?.applyTime,
          rejectReason: item?.rejectReason
        }))
        this.total = Number(total) || 0
      } catch (error) {
        console.error('加载注册申请失败', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.requestList = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.currentPage = 1
      this.loadData()
      this.loadStats()
    },
    handleResetFilters() {
      this.searchQuery = ''
      this.statusFilter = ''
      this.roleFilter = ''
      this.currentPage = 1
      this.loadData()
      this.loadStats()
    },
    applyQuickStatus(status) {
      this.statusFilter = status
      this.currentPage = 1
      this.loadData()
    },
    handleStatusChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.statusFilter = this.statusOptions[index]?.value || ''
      this.currentPage = 1
      this.loadData()
    },
    handleRoleChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.roleFilter = this.roleOptions[index]?.value || ''
      this.currentPage = 1
      this.loadData()
      this.loadStats()
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
    openReject(item) {
      this.currentItem = item
      this.rejectReason = ''
      this.showRejectModal = true
    },
    closeReject() {
      this.showRejectModal = false
      this.currentItem = null
      this.rejectReason = ''
    },
    async confirmReject() {
      if (!this.currentItem?.id) return
      if (!this.rejectReason.trim()) {
        uni.showToast({ title: '请输入驳回原因', icon: 'none' })
        return
      }
      uni.showLoading({ title: '提交中...' })
      try {
        await request(`/api/admin/user/register-requests/${this.currentItem.id}/reject`, { data: { reason: this.rejectReason } }, 'PUT')
        uni.showToast({ title: '已驳回', icon: 'success' })
        this.closeReject()
        this.loadData()
        this.loadStats()
      } catch (error) {
        console.error('驳回注册申请失败', error)
        uni.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    async ensureCommunityList() {
      if (this.communityListLoading || this.communityList.length > 0) return
      this.communityListLoading = true
      this.communityLoadError = ''
      try {
        const data = await request('/api/house/community/list', {}, 'GET')
        const list = Array.isArray(data)
          ? data
          : (Array.isArray(data?.records) ? data.records : [])
        this.communityList = list.map(item => ({
          id: item?.id,
          name: item?.name || item?.communityName || `社区${item?.id || ''}`
        })).filter(item => item.id != null)
        if (!this.communityList.length) {
          this.communityLoadError = '社区列表为空，请先确认社区数据是否已配置。'
        }
      } catch (error) {
        console.error('加载社区列表失败', error)
        this.communityList = []
        this.communityLoadError = error?.message || '社区列表加载失败，请检查社区查询接口。'
      } finally {
        this.communityListLoading = false
      }
    },
    async openApprove(item) {
      this.currentItem = item
      this.approveRole = item?.role || 'owner'
      this.approveCommunityId = item?.communityId ? String(item.communityId) : ''
      this.showApproveModal = true
      if (this.needsCommunityAssignment) {
        await this.ensureCommunityList()
      }
    },
    closeApprove() {
      this.showApproveModal = false
      this.currentItem = null
      this.approveRole = 'owner'
      this.approveCommunityId = ''
    },
    handleApproveRoleChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.approveRole = this.approveRoleOptions[index]?.value || 'owner'
      if (!this.needsCommunityAssignment) {
        this.approveCommunityId = ''
        return
      }
      this.ensureCommunityList()
    },
    handleApproveCommunityChange(e) {
      const index = Number(e?.detail?.value || 0)
      const selected = this.communityList[index]
      this.approveCommunityId = selected?.id != null ? String(selected.id) : ''
    },
    async confirmApprove() {
      if (!this.currentItem?.id) return
      if (this.needsCommunityAssignment && !this.approveCommunityId) {
        uni.showToast({
          title: this.approveRole === 'admin' ? '请选择负责社区' : '请选择所属社区',
          icon: 'none'
        })
        return
      }
      uni.showLoading({ title: '提交中...' })
      try {
        const payload = {
          role: this.approveRole
        }
        if (this.needsCommunityAssignment) {
          payload.communityId = Number(this.approveCommunityId)
        }
        await request(
          `/api/admin/user/register-requests/${this.currentItem.id}/approve`,
          { data: payload },
          'PUT'
        )
        uni.showToast({ title: '已通过', icon: 'success' })
        this.closeApprove()
        this.loadData()
        this.loadStats()
      } catch (error) {
        console.error('通过注册申请失败', error)
        uni.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    getStatusText(status) {
      switch (status) {
        case 'PENDING': return '待审核'
        case 'ACTIVE': return '已通过'
        case 'REJECTED': return '已驳回'
        case 'DISABLED': return '已禁用'
        default: return status || '-'
      }
    },
    getStatusClass(status) {
      switch (status) {
        case 'PENDING': return 'status-pending'
        case 'ACTIVE': return 'status-approved'
        case 'REJECTED': return 'status-rejected'
        case 'DISABLED': return 'status-disabled'
        default: return 'status-disabled'
      }
    },
    getRoleText(role) {
      const found = this.roleOptions.find(item => item.value === role)
      return found ? found.label : (role || '-')
    },
    formatTime(str) {
      if (!str) return '-'
      const date = new Date(String(str).replace(' ', 'T'))
      if (Number.isNaN(date.getTime())) return String(str)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

<style scoped src="../../styles/admin-table-page.css"></style>
<style scoped>
.register-status-bar {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.status-summary-card.pending {
  background: linear-gradient(180deg, #fff 0%, #fff8e6 100%);
}

.status-summary-card.approved {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.status-summary-card.rejected {
  background: linear-gradient(180deg, #fff 0%, #fff1f3 100%);
}

.register-query-grid {
  grid-template-columns: 1.5fr 1fr 1fr;
}

.register-table {
  grid-template-columns: 180rpx 200rpx 180rpx 220rpx 180rpx 140rpx 220rpx 220rpx;
  min-width: 1800rpx;
}

.status-pill.status-pending {
  background: #fff8e6;
  color: #cd8b1d;
}

.status-pill.status-approved {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.status-rejected,
.status-pill.status-disabled {
  background: #fff1f3;
  color: #c44859;
}

.modal-picker {
  justify-content: space-between;
}

.modal-picker.placeholder .modal-picker-text {
  color: #9aa9b8;
}

.modal-picker-arrow {
  color: #c0c9d4;
  font-size: 24rpx;
}

.detail-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #8797aa;
  line-height: 1.6;
}
</style>
