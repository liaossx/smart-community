<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="注册审核"
    currentPage="/admin/pages/admin/register-review"
  >
    <view class="manage-container">
      <view class="search-filter-bar">
        <view class="search-box">
          <input
            type="text"
            placeholder="搜索用户名/姓名/手机号"
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
            range-key="label"
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
            :range="roleOptions"
            range-key="label"
            :value="roleOptions.findIndex(opt => opt.value === roleFilter)"
            @change="handleRoleChange"
            class="filter-picker"
          >
            <view class="filter-picker-text">
              {{ roleOptions.find(opt => opt.value === roleFilter)?.label || '全部角色' }}
            </view>
          </picker>
        </view>
      </view>

      <view class="list-container">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>

        <view v-else-if="requestList.length > 0" class="request-list">
          <view v-for="item in requestList" :key="item.id" class="request-item">
            <view class="item-header">
              <view class="header-left">
                <text class="item-title">{{ item.realName || '-' }}</text>
                <text class="sub-title">{{ item.username }}</text>
              </view>
              <text class="status-tag" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </text>
            </view>

            <view class="item-body">
              <view class="info-grid">
                <view class="info-item">
                  <text class="label">手机号</text>
                  <text class="value">{{ item.phone || '-' }}</text>
                </view>
                <view class="info-item">
                  <text class="label">申请角色</text>
                  <text class="value">{{ getRoleText(item.role) }}</text>
                </view>
                <view class="info-item full">
                  <text class="label">申请时间</text>
                  <text class="value highlight">{{ formatTime(item.applyTime) }}</text>
                </view>
                <view v-if="item.status === 'REJECTED' && item.rejectReason" class="info-item full">
                  <text class="label">驳回原因</text>
                  <text class="value">{{ item.rejectReason }}</text>
                </view>
              </view>
            </view>

            <view class="item-footer">
              <view class="btn-row" v-if="item.status === 'PENDING'">
                <button class="action-btn reject" @click="openReject(item)">驳回</button>
                <button class="action-btn approve" @click="openApprove(item)">通过</button>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty-state">
          <text>暂无注册申请</text>
        </view>

        <view v-if="total > 0" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="handlePrevPage">上一页</button>
          <view class="page-info">
            <text>{{ currentPage }}</text>
            <text class="page-separator">/</text>
            <text>{{ totalPages }}</text>
          </view>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="handleNextPage">下一页</button>
        </view>
      </view>
    </view>

    <view v-if="showRejectModal" class="modal-mask" @click="closeReject"></view>
    <view v-if="showRejectModal" class="modal-container">
      <view class="modal">
        <view class="modal-header">
          <text class="modal-title">驳回申请</text>
        </view>
        <view class="modal-body">
          <textarea
            class="modal-textarea"
            v-model="rejectReason"
            placeholder="请输入驳回原因"
            maxlength="200"
          ></textarea>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @click="closeReject">取消</button>
          <button class="modal-btn confirm-btn" @click="confirmReject">确定</button>
        </view>
      </view>
    </view>

    <view v-if="showApproveModal" class="modal-mask" @click="closeApprove"></view>
    <view v-if="showApproveModal" class="modal-container">
      <view class="modal">
        <view class="modal-header">
          <text class="modal-title">通过申请</text>
        </view>
        <view class="modal-body">
          <view class="modal-row">
            <text class="modal-label">确认角色</text>
            <picker
              mode="selector"
              :range="approveRoleOptions"
              range-key="label"
              :value="approveRoleOptions.findIndex(opt => opt.value === approveRole)"
              @change="handleApproveRoleChange"
            >
              <view class="modal-picker">
                <text class="modal-picker-text">{{ approveRoleOptions.find(opt => opt.value === approveRole)?.label }}</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @click="closeApprove">取消</button>
          <button class="modal-btn confirm-btn" @click="confirmApprove">确定</button>
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

      showRejectModal: false,
      rejectReason: '',
      currentItem: null,

      showApproveModal: false,
      approveRole: 'owner',
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
      return Math.ceil(this.total / this.pageSize) || 1
    }
  },
  onShow() {
    this.loadData()
  },
  methods: {
    handleSearch() {
      this.currentPage = 1
      this.loadData()
    },
    handleStatusChange(e) {
      const idx = Number(e && e.detail ? e.detail.value : 0)
      const option = this.statusOptions[idx]
      this.statusFilter = option ? option.value : ''
      this.currentPage = 1
      this.loadData()
    },
    handleRoleChange(e) {
      const idx = Number(e && e.detail ? e.detail.value : 0)
      const option = this.roleOptions[idx]
      this.roleFilter = option ? option.value : ''
      this.currentPage = 1
      this.loadData()
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
        const page = res?.records || res?.data?.records ? res : (res?.data || res)
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
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.requestList = []
        this.total = 0
      } finally {
        this.loading = false
      }
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
      } catch (e) {
        uni.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    openApprove(item) {
      this.currentItem = item
      this.approveRole = item?.role || 'owner'
      this.showApproveModal = true
    },
    closeApprove() {
      this.showApproveModal = false
      this.currentItem = null
    },
    handleApproveRoleChange(e) {
      const idx = Number(e && e.detail ? e.detail.value : 0)
      const opt = this.approveRoleOptions[idx]
      this.approveRole = opt ? opt.value : 'owner'
    },
    async confirmApprove() {
      if (!this.currentItem?.id) return
      uni.showLoading({ title: '提交中...' })
      try {
        await request(
          `/api/admin/user/register-requests/${this.currentItem.id}/approve`,
          { data: { role: this.approveRole } },
          'PUT'
        )
        uni.showToast({ title: '已通过', icon: 'success' })
        this.closeApprove()
        this.loadData()
      } catch (e) {
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
        default: return ''
      }
    },
    getRoleText(role) {
      const found = this.roleOptions.find(v => v.value === role)
      return found ? found.label : (role || '-')
    },
    formatTime(str) {
      if (!str) return '-'
      const d = new Date(String(str).replace(' ', 'T'))
      if (isNaN(d.getTime())) return String(str)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${mm}-${dd} ${hh}:${mi}`
    }
  }
}
</script>

<style scoped>
.manage-container {
  padding: 30rpx;
  padding-top: 100rpx;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.search-filter-bar {
  background-color: #fff;
  border-radius: 15rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
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
  height: 70rpx;
  border-radius: 35rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
  background-color: #f5f7fa;
}

.search-btn {
  height: 70rpx;
  line-height: 70rpx;
  padding: 0 40rpx;
  background-color: #2D81FF;
  color: #fff;
  border: none;
  border-radius: 35rpx;
  font-size: 28rpx;
  margin: 0;
}

.filter-row {
  display: flex;
  gap: 10rpx;
}

.filter-picker {
  flex: 1;
  height: 70rpx;
  background-color: #f5f7fa;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-picker-text {
  font-size: 28rpx;
  color: #666;
}

.list-container {
  padding-bottom: 30rpx;
}

.loading-state {
  padding: 60rpx 0;
  text-align: center;
  color: #999;
}

.request-item {
  background: #fff;
  border-radius: 15rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.item-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.sub-title {
  font-size: 24rpx;
  color: #999;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
}

.status-pending {
  color: #ff4757;
  background-color: rgba(255, 71, 87, 0.1);
}

.status-approved {
  color: #2ed573;
  background-color: rgba(46, 213, 115, 0.1);
}

.status-rejected {
  color: #ffa502;
  background-color: rgba(255, 165, 2, 0.1);
}

.status-disabled {
  color: #888;
  background-color: rgba(0, 0, 0, 0.06);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
}

.info-item.full {
  grid-column: 1 / -1;
}

.label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
  display: block;
}

.value {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.value.highlight {
  color: #2D81FF;
}

.item-footer {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;
}

.btn-row {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  height: 60rpx;
  line-height: 60rpx;
  padding: 0 30rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
  margin: 0;
}

.action-btn.approve {
  background: #2D81FF;
  color: #fff;
  border: none;
}

.action-btn.reject {
  background: #e6f7ff;
  color: #1890ff;
  border: 1rpx solid #91d5ff;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 80rpx;
  font-size: 30rpx;
  padding: 60rpx 0;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 30rpx;
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
  color: #666;
}

.page-separator {
  margin: 0 10rpx;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 999;
}

.modal-container {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 86%;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  padding: 26rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.modal-body {
  padding: 24rpx;
}

.modal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.modal-label {
  font-size: 28rpx;
  color: #666;
}

.modal-picker {
  height: 70rpx;
  border-radius: 35rpx;
  padding: 0 26rpx;
  background: #f5f7fa;
  display: flex;
  align-items: center;
}

.modal-picker-text {
  font-size: 28rpx;
  color: #333;
}

.modal-textarea {
  width: 100%;
  min-height: 180rpx;
  border-radius: 12rpx;
  background: #f5f7fa;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
}

.modal-footer {
  padding: 20rpx 24rpx 26rpx;
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}

.modal-btn {
  height: 70rpx;
  line-height: 70rpx;
  padding: 0 36rpx;
  border-radius: 35rpx;
  font-size: 28rpx;
  margin: 0;
}

.confirm-btn {
  background: #2D81FF;
  color: #fff;
  border: none;
}

.cancel-btn {
  background: #f5f7fa;
  color: #333;
  border: 1rpx solid #e4e7ed;
}
</style>

