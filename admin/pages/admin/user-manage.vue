<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="用户管理"
    currentPage="/admin/pages/admin/user-manage"
    pageBreadcrumb="管理后台 / 用户管理"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">用户列表</text>
          <text class="overview-subtitle">统一为后台表格页，保留按月份统计、角色筛选、用户编辑与启停用操作。</text>
        </view>

        <picker mode="selector" :range="monthOptions" range-key="label" @change="handleMonthChange">
          <view class="month-filter-chip">
            <text class="month-filter-label">统计月份</text>
            <text class="month-filter-value">{{ currentMonthLabel }}</text>
          </view>
        </picker>
      </view>

      <view class="status-summary-bar user-status-bar">
        <view class="status-summary-card" :class="{ active: roleFilter === '' }" @click="handleStatsClick('')">
          <text class="summary-label">总用户数</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card admin" :class="{ active: roleFilter === 'admin' }" @click="handleStatsClick('admin')">
          <text class="summary-label">管理员</text>
          <text class="summary-value">{{ stats.admin }}</text>
        </view>
        <view class="status-summary-card owner" :class="{ active: roleFilter === 'owner' }" @click="handleStatsClick('owner')">
          <text class="summary-label">业主</text>
          <text class="summary-value">{{ stats.owner }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid user-query-grid">
          <view class="query-field query-field-wide">
            <text class="query-label">关键词</text>
            <input
              v-model="searchKey"
              class="query-input"
              type="text"
              placeholder="搜索姓名、账号或手机号"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">用户角色</text>
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
          <text class="toolbar-meta active">当前筛选：{{ currentRoleLabel }}</text>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">月份：{{ currentMonthLabel }}</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="scroll-table">
          <view class="table-head user-table">
            <text class="table-col col-name">姓名</text>
            <text class="table-col col-username">账号</text>
            <text class="table-col col-phone">手机号</text>
            <text class="table-col col-role">角色</text>
            <text class="table-col col-status">状态</text>
            <text class="table-col col-time">最近时间</text>
            <text class="table-col col-actions">操作</text>
          </view>

          <view
            v-for="(user, index) in userList"
            :key="user.userId"
            class="table-row user-table"
            :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
          >
            <view class="table-col col-name">
              <text class="primary-text">{{ user.realName || user.username || '未填写姓名' }}</text>
            </view>

            <view class="table-col col-username">
              <text class="plain-text">{{ user.username || '-' }}</text>
            </view>

            <view class="table-col col-phone">
              <text class="plain-text">{{ user.phone || '-' }}</text>
            </view>

            <view class="table-col col-role">
              <text class="plain-text">{{ getRoleLabel(user.role) }}</text>
            </view>

            <view class="table-col col-status">
              <text class="status-pill" :class="user.status === 1 ? 'status-active' : 'status-disabled'">
                {{ user.status === 1 ? '正常' : '已禁用' }}
              </text>
            </view>

            <view class="table-col col-time">
              <text class="minor-text">{{ formatTime(user.createTime) }}</text>
            </view>

            <view class="table-col col-actions row-actions">
              <button class="row-btn ghost" @click="handleEditUser(user)">编辑</button>
              <button
                class="row-btn"
                :class="user.status === 1 ? 'secondary-warn' : 'primary'"
                @click="handleToggleStatus(user)"
              >
                {{ user.status === 1 ? '禁用' : '启用' }}
              </button>
            </view>
          </view>
        </view>

        <view v-if="userList.length === 0" class="empty-state">
          <text>暂无用户数据</text>
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

      <view v-if="showEditPanel" class="detail-modal" @click="closeEditPanel">
        <view class="detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">编辑用户</text>
            <button class="close-btn" @click="closeEditPanel">关闭</button>
          </view>

          <view class="detail-body">
            <view class="detail-item detail-item-block">
              <text class="detail-label">角色:</text>
              <picker
                mode="selector"
                :range="editRoleOptions"
                range-key="label"
                :value="editRoleIndex"
                @change="handleEditRoleChange"
              >
                <view class="modal-picker">
                  <text class="modal-picker-text">{{ currentEditRoleLabel }}</text>
                  <text class="modal-picker-arrow">></text>
                </view>
              </picker>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">姓名:</text>
              <input class="form-input-inline" v-model="editForm.realName" placeholder="请输入姓名" />
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">手机号:</text>
              <input class="form-input-inline" v-model="editForm.phone" placeholder="请输入手机号" />
            </view>

            <view v-if="needsEditCommunityAssignment" class="detail-item detail-item-block">
              <text class="detail-label">{{ normalizedEditRole === 'admin' ? '负责社区:' : '所属社区:' }}</text>
              <picker
                mode="selector"
                :range="communityList"
                range-key="name"
                :value="editCommunityIndex"
                :disabled="communityListLoading || communityList.length === 0"
                @change="handleEditCommunityChange"
              >
                <view class="modal-picker" :class="{ placeholder: !editCommunityLabel }">
                  <text class="modal-picker-text">{{ editCommunityDisplayText }}</text>
                  <text class="modal-picker-arrow">></text>
                </view>
              </picker>
              <text class="detail-tip">{{ editCommunityTip }}</text>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="closeEditPanel">取消</button>
              <button class="detail-btn primary" :disabled="saving" @click="submitEdit">保存</button>
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
      userList: [],
      searchKey: '',
      loading: false,
      roleFilter: '',
      roleOptions: [
        { label: '全部角色', value: '' },
        { label: '管理员', value: 'admin' },
        { label: '普通用户', value: 'owner' }
      ],
      editRoleOptions: [
        { label: '业主', value: 'owner' },
        { label: '工作人员', value: 'worker' },
        { label: '管理员', value: 'admin' },
        { label: '超级管理员', value: 'super_admin' }
      ],
      communityList: [],
      communityListLoading: false,
      communityLoadError: '',
      showEditPanel: false,
      editForm: {
        userId: null,
        realName: '',
        phone: '',
        role: '',
        communityId: ''
      },
      saving: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      stats: {
        total: 0,
        admin: 0,
        owner: 0
      },
      monthOptions: [],
      monthIndex: 0,
      monthValue: ''
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
    rolePickerIndex() {
      return Math.max(0, this.roleOptions.findIndex(item => item.value === this.roleFilter))
    },
    currentRoleLabel() {
      const current = this.roleOptions.find(item => item.value === this.roleFilter)
      return current ? current.label : '全部角色'
    },
    currentMonthLabel() {
      const option = this.monthOptions[this.monthIndex]
      return option ? option.label : (this.monthValue || '选择月份')
    },
    normalizedEditRole() {
      return String(this.editForm.role || '').toLowerCase()
    },
    editRoleIndex() {
      return Math.max(0, this.editRoleOptions.findIndex(item => item.value === this.normalizedEditRole))
    },
    currentEditRoleLabel() {
      const current = this.editRoleOptions.find(item => item.value === this.normalizedEditRole)
      return current ? current.label : '业主'
    },
    needsEditCommunityAssignment() {
      return this.normalizedEditRole === 'admin' || this.normalizedEditRole === 'worker'
    },
    editCommunityIndex() {
      const index = this.communityList.findIndex(item => String(item.id) === String(this.editForm.communityId))
      return index >= 0 ? index : 0
    },
    editCommunityLabel() {
      const current = this.communityList.find(item => String(item.id) === String(this.editForm.communityId))
      return current ? current.name : ''
    },
    editCommunityDisplayText() {
      if (this.communityListLoading) return '社区列表加载中...'
      if (this.editCommunityLabel) return this.editCommunityLabel
      if (this.communityLoadError) return '社区列表加载失败'
      if (!this.communityList.length) return '暂无可选社区'
      return this.normalizedEditRole === 'admin' ? '请选择负责社区' : '请选择所属社区'
    },
    editCommunityTip() {
      if (this.communityListLoading) return '正在加载社区列表，请稍候。'
      if (this.communityLoadError) return this.communityLoadError
      if (!this.communityList.length) return '当前未获取到社区数据，无法完成该角色编辑。'
      return this.normalizedEditRole === 'admin'
        ? '管理员账号需要绑定负责社区，便于后续按社区管理业务。'
        : '工作人员账号需要绑定所属社区，便于后续按社区接收任务。'
    }
  },
  onLoad() {
    this.initMonthOptions()
    this.loadUserList()
    this.loadStats()
  },
  methods: {
    initMonthOptions() {
      const now = new Date()
      const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const options = []
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        options.push({ label: value, value })
      }
      this.monthOptions = options
      this.monthValue = current
      this.monthIndex = Math.max(0, options.findIndex(item => item.value === current))
    },
    extractTotal(data) {
      if (typeof data?.total === 'number') return data.total
      if (typeof data?.data?.total === 'number') return data.data.total
      if (Array.isArray(data?.records)) return data.records.length
      if (Array.isArray(data?.data?.records)) return data.data.records.length
      if (Array.isArray(data)) return data.length
      return 0
    },
    handleMonthChange(e) {
      const index = Number(e?.detail?.value || 0)
      const option = this.monthOptions[index]
      if (!option) return
      this.monthIndex = index
      this.monthValue = option.value
      this.currentPage = 1
      this.loadUserList()
      this.loadStats()
    },
    getRoleLabel(role) {
      const val = role == null ? '' : String(role).toLowerCase()
      if (val === 'admin') return '管理员'
      if (val === 'worker') return '工作人员'
      if (val === 'super_admin') return '超级管理员'
      if (val === 'owner') return '业主'
      return role || '未知角色'
    },
    handleRoleChange(e) {
      const index = Number(e?.detail?.value || 0)
      const option = this.roleOptions[index]
      this.roleFilter = option ? option.value : ''
      this.currentPage = 1
      this.loadUserList()
    },
    handleStatsClick(role) {
      this.roleFilter = role
      this.currentPage = 1
      this.loadUserList()
    },
    async loadUserList() {
      this.loading = true
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          keyword: this.searchKey || undefined,
          month: this.monthValue || undefined,
          role: this.roleFilter || undefined
        }
        const res = await request('/api/admin/user/list', { params }, 'GET')
        const records = res?.records || res?.data?.records || []
        this.userList = (Array.isArray(records) ? records : []).map(item => ({
          userId: item.userId || item.id,
          realName: item.realName,
          username: item.username,
          phone: item.phone,
          role: item.role,
          communityId: item.communityId,
          communityName: item.communityName,
          status: item.status,
          createTime: item.createTime || item.registerTime || item.applyTime
        }))
        this.total = Number(res?.total || res?.data?.total || 0)
      } catch (error) {
        console.error('加载用户列表失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.userList = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    async loadStats() {
      try {
        const month = this.monthValue || undefined
        const [totalRes, adminRes, ownerRes] = await Promise.all([
          request('/api/admin/user/list', { params: { pageSize: 1, month } }, 'GET'),
          request('/api/admin/user/list', { params: { pageSize: 1, role: 'admin', month } }, 'GET'),
          request('/api/admin/user/list', { params: { pageSize: 1, role: 'owner', month } }, 'GET')
        ])
        this.stats = {
          total: this.extractTotal(totalRes),
          admin: this.extractTotal(adminRes),
          owner: this.extractTotal(ownerRes)
        }
      } catch (error) {
        console.error('加载用户统计失败', error)
      }
    },
    handleSearch() {
      this.currentPage = 1
      this.loadUserList()
    },
    handleResetFilters() {
      this.searchKey = ''
      this.roleFilter = ''
      this.currentPage = 1
      this.loadUserList()
    },
    handlePrevPage() {
      if (this.currentPage <= 1) return
      this.currentPage -= 1
      this.loadUserList()
    },
    handleNextPage() {
      if (this.currentPage >= this.totalPages) return
      this.currentPage += 1
      this.loadUserList()
    },
    handlePageSizeChange(e) {
      const options = [10, 20, 50, 100]
      const index = Number(e?.detail?.value || 0)
      this.pageSize = options[index] || 10
      this.currentPage = 1
      this.loadUserList()
    },
    async ensureCommunityList() {
      if (this.communityListLoading || this.communityList.length > 0) return
      this.communityListLoading = true
      this.communityLoadError = ''
      try {
        const data = await request('/api/house/community/all', {}, 'GET')
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
        console.error('加载社区列表失败:', error)
        this.communityList = []
        this.communityLoadError = error?.message || '社区列表加载失败，请检查社区查询接口。'
      } finally {
        this.communityListLoading = false
      }
    },
    async handleEditUser(user) {
      this.editForm = {
        userId: user.userId,
        realName: user.realName || '',
        phone: user.phone || '',
        role: String(user.role || '').toLowerCase(),
        communityId: user.communityId != null ? String(user.communityId) : ''
      }
      this.showEditPanel = true
      if (this.needsEditCommunityAssignment) {
        await this.ensureCommunityList()
      }
    },
    handleEditRoleChange(e) {
      const index = Number(e?.detail?.value || 0)
      this.editForm.role = this.editRoleOptions[index]?.value || 'owner'
      if (!this.needsEditCommunityAssignment) {
        this.editForm.communityId = ''
        return
      }
      this.ensureCommunityList()
    },
    handleEditCommunityChange(e) {
      const index = Number(e?.detail?.value || 0)
      const selected = this.communityList[index]
      this.editForm.communityId = selected?.id != null ? String(selected.id) : ''
    },
    async handleToggleStatus(user) {
      const userId = user.userId
      if (!userId) {
        uni.showToast({ title: '缺少用户ID', icon: 'none' })
        return
      }
      const currentStatus = user.status
      const targetStatus = currentStatus === 1 ? 0 : 1
      uni.showModal({
        title: targetStatus === 0 ? '禁用用户' : '启用用户',
        content: targetStatus === 0 ? '确定要禁用该用户吗？' : '确定要启用该用户吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await request(`/api/admin/user/${userId}/status`, { params: { status: targetStatus } }, 'PUT')
            uni.showToast({ title: '操作成功', icon: 'success' })
            this.loadUserList()
          } catch (error) {
            console.error('修改用户状态失败:', error)
            uni.showToast({ title: error?.message || '操作失败', icon: 'none' })
          }
        }
      })
    },
    closeEditPanel() {
      if (this.saving) return
      this.showEditPanel = false
      this.editForm = {
        userId: null,
        realName: '',
        phone: '',
        role: '',
        communityId: ''
      }
    },
    async submitEdit() {
      if (!this.editForm.userId) {
        uni.showToast({ title: '缺少用户ID', icon: 'none' })
        return
      }
      if (!this.editForm.realName) {
        uni.showToast({ title: '请输入姓名', icon: 'none' })
        return
      }
      if (!this.editForm.phone) {
        uni.showToast({ title: '请输入手机号', icon: 'none' })
        return
      }
      if (this.needsEditCommunityAssignment && !this.editForm.communityId) {
        uni.showToast({
          title: this.normalizedEditRole === 'admin' ? '请选择负责社区' : '请选择所属社区',
          icon: 'none'
        })
        return
      }
      this.saving = true
      try {
        const payload = {
          userId: this.editForm.userId,
          realName: this.editForm.realName,
          phone: this.editForm.phone,
          role: this.editForm.role,
          communityId: this.needsEditCommunityAssignment ? Number(this.editForm.communityId) : null
        }
        await request('/api/admin/user/update', {
          data: payload
        }, 'PUT')
        uni.showToast({ title: '保存成功', icon: 'success' })
        this.closeEditPanel()
        this.loadUserList()
      } catch (error) {
        console.error('保存用户信息失败:', error)
        uni.showToast({ title: error?.message || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
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

<style scoped src="../../styles/admin-table-page.css"></style>
<style scoped>
.user-status-bar {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.status-summary-card.admin {
  background: linear-gradient(180deg, #fff 0%, #eef5ff 100%);
}

.status-summary-card.owner {
  background: linear-gradient(180deg, #fff 0%, #fff8e8 100%);
}

.user-query-grid {
  grid-template-columns: 1.6fr 1fr;
}

.user-table {
  grid-template-columns: 180rpx 180rpx 180rpx 160rpx 140rpx 220rpx 220rpx;
  min-width: 1500rpx;
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

.status-pill.status-active {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.status-disabled {
  background: #fff1f3;
  color: #c44859;
}
</style>
