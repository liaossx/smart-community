<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="用户管理"
    currentPage="/admin/pages/admin/user-manage"
  >
    <view class="manage-container">
      <!-- 统计卡片 -->
      <view class="stats-card-container">
        <view class="stats-card" @click="handleStatsClick('')">
          <text class="stats-number">{{ stats.total }}</text>
          <text class="stats-label">总用户数</text>
        </view>
        <view class="stats-card status-admin" @click="handleStatsClick('admin')">
          <text class="stats-number">{{ stats.admin }}</text>
          <text class="stats-label">管理员</text>
        </view>
        <view class="stats-card status-owner" @click="handleStatsClick('owner')">
          <text class="stats-number">{{ stats.owner }}</text>
          <text class="stats-label">业主</text>
        </view>
      </view>

      <view class="search-section">
        <view class="search-left">
          <input 
            class="search-input" 
            placeholder="搜索用户姓名或手机号" 
            v-model="searchKey"
            @input="handleSearch"
          />
        </view>
        <view class="search-right">
          <picker 
            mode="selector" 
            :range="roleOptions" 
            range-key="label" 
            @change="handleRoleChange"
          >
            <view class="role-picker">
              <text class="role-picker-text">{{ getRoleFilterLabel() }}</text>
            </view>
          </picker>
        </view>
      </view>
      
      <!-- 用户列表 / 状态 -->
      <view v-if="loading" class="empty-state">
        <text>加载中...</text>
      </view>

      <view v-else-if="userList.length" class="user-list">
        <view 
          v-for="user in userList" 
          :key="user.id || user.userId" 
          class="user-item"
        >
          <view class="user-info">
            <view class="user-avatar">
              <text class="avatar-text">
                {{ (user.realName || user.username || '用').slice(0,1) }}
              </text>
            </view>
            <view class="user-main">
              <text class="user-name">
                {{ user.realName || user.username || '未填写姓名' }}
              </text>
              <view class="user-meta">
                <text class="user-line">
                  账号：{{ user.username || '-' }}
                </text>
                <text class="user-line">
                  手机：{{ user.phone || '-' }}
                </text>
              </view>
              <view class="user-tags">
                <text class="user-role">
                  {{ getRoleLabel(user.role) }}
                </text>
                <text v-if="user.status !== undefined" class="user-status" :class="user.status === 1 ? 'active' : 'disabled'">
                  {{ user.status === 1 ? '正常' : '已禁用' }}
                </text>
              </view>
            </view>
          </view>
          
          <view class="user-actions">
            <button 
              class="edit-btn"
              @click="handleEditUser(user)"
            >
              编辑
            </button>
            <button 
              v-if="user.status !== undefined" 
              class="status-btn" 
              :class="user.status === 1 ? 'to-disable' : 'to-enable'"
              @click="handleToggleStatus(user)"
            >
              {{ user.status === 1 ? '禁用' : '启用' }}
            </button>
          </view>
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
        </view>
      </view>

      <view v-else class="empty-state">
        <text>暂无用户数据</text>
      </view>

      <!-- 编辑弹层 -->
      <view v-if="showEditPanel" class="edit-mask">
        <view class="edit-panel">
          <view class="edit-title">编辑用户</view>

          <view class="edit-field">
            <text class="field-label">姓名</text>
            <input 
              class="field-input"
              v-model="editForm.realName"
              placeholder="请输入姓名"
            />
          </view>

          <view class="edit-field">
            <text class="field-label">手机号</text>
            <input 
              class="field-input"
              v-model="editForm.phone"
              placeholder="请输入手机号"
            />
          </view>

          <view class="edit-field">
            <text class="field-label">角色</text>
            <text class="field-value">{{ getRoleLabel(editForm.role) }}</text>
          </view>

          <view class="edit-actions">
            <button class="edit-cancel" @click="closeEditPanel">取消</button>
            <button class="edit-save" :disabled="saving" @click="submitEdit">
              保存
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
      showEditPanel: false,
      editingUser: null,
      editForm: {
        userId: null,
        realName: '',
        phone: '',
        role: ''
      },
      saving: false,
      
      // 分页相关
      currentPage: 1,
      pageSize: 10,
      total: 0,
      
      // 统计数据
      stats: {
        total: 0,
        admin: 0,
        owner: 0
      }
    }
  },
  computed: {
    roleFilterValue() {
      return this.roleFilter || ''
    },
    totalPages() {
      return Math.ceil(this.total / this.pageSize) || 1
    }
  },
  onLoad() {
    this.loadUserList()
    this.loadStats()
  },
  methods: {
    getRoleLabel(role) {
      const val = role == null ? '' : String(role).toLowerCase()
      if (val === 'admin') {
        return '管理员'
      }
      return '普通用户'
    },

    getRoleFilterLabel() {
      const current = this.roleOptions.find(item => item.value === this.roleFilter)
      return current ? current.label : '全部角色'
    },

    handleRoleChange(e) {
      const index = Number(e.detail.value)
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
          keyword: this.searchKey 
        }
        if (this.roleFilterValue) {
          params.role = this.roleFilterValue
        }
        const res = await request(
          '/api/admin/user/list',
          { params },
          'GET'
        )
        const records = res?.records || res?.data?.records || []
        this.userList = Array.isArray(records) ? records : []
        this.total = res?.total || res?.data?.total || 0
      } catch (err) {
        console.error('加载用户列表失败:', err)
        uni.showToast({ title: '加载失败', icon: 'none' })
        this.userList = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    
    // 加载统计数据
    async loadStats() {
      try {
        const totalReq = request('/api/admin/user/list', { params: { pageSize: 1 } }, 'GET')
        const adminReq = request('/api/admin/user/list', { params: { pageSize: 1, role: 'admin' } }, 'GET')
        const ownerReq = request('/api/admin/user/list', { params: { pageSize: 1, role: 'owner' } }, 'GET')
        
        const [totalRes, adminRes, ownerRes] = await Promise.all([totalReq, adminReq, ownerReq])
        
        this.stats = {
          total: totalRes.total || totalRes.data?.total || 0,
          admin: adminRes.total || adminRes.data?.total || 0,
          owner: ownerRes.total || ownerRes.data?.total || 0
        }
      } catch (e) {
        console.error('加载统计数据失败', e)
      }
    },
    
    handleSearch() {
      this.currentPage = 1
      this.loadUserList()
    },
    
    handlePrevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        this.loadUserList()
      }
    },
    
    handleNextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
        this.loadUserList()
      }
    },
    
    handleEditUser(user) {
      const userId = user.id || user.userId
      this.editingUser = user
      this.editForm = {
        userId,
        realName: user.realName || '',
        phone: user.phone || '',
        role: user.role || ''
      }
      this.showEditPanel = true
    },

    async handleToggleStatus(user) {
      const userId = user.id || user.userId
      if (!userId) {
        uni.showToast({ title: '缺少用户ID', icon: 'none' })
        return
      }
      const currentStatus = user.status
      const targetStatus = currentStatus === 1 ? 0 : 1
      const title = targetStatus === 0 ? '禁用用户' : '启用用户'
      const content = targetStatus === 0 ? '确定要禁用该用户吗？' : '确定要启用该用户吗？'

      uni.showModal({
        title,
        content,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await request(
              `/api/admin/user/${userId}/status`,
              { params: { status: targetStatus } },
              'PUT'
            )
            uni.showToast({ title: '操作成功', icon: 'success' })
            this.loadUserList()
          } catch (err) {
            console.error('修改用户状态失败:', err)
            uni.showToast({ title: err?.message || '操作失败', icon: 'none' })
          }
        }
      })
    },

    closeEditPanel() {
      if (this.saving) return
      this.showEditPanel = false
      this.editingUser = null
      this.editForm = {
        userId: null,
        realName: '',
        phone: '',
        role: ''
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

      this.saving = true
      try {
        await request(
          '/api/admin/user/update',
          {
            data: {
              userId: this.editForm.userId,
              realName: this.editForm.realName,
              phone: this.editForm.phone,
              role: this.editForm.role
            }
          },
          'PUT'
        )
        uni.showToast({ title: '保存成功', icon: 'success' })
        this.closeEditPanel()
        this.loadUserList()
      } catch (err) {
        console.error('保存用户信息失败:', err)
        uni.showToast({ title: err?.message || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.manage-container {
  padding: 30rpx;
  background-color: #f5f6fa;
  min-height: 100vh;
  padding-top: 100rpx;
}

/* 统计卡片样式 */
.stats-card-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.stats-card {
  background-color: #fff;
  padding: 30rpx;
  border-radius: 15rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
  text-align: center;
  cursor: pointer;
  border-left: 6rpx solid #2D81FF;
}

.stats-card.status-admin {
  border-left-color: #722ed1;
}

.stats-card.status-owner {
  border-left-color: #faad14;
}

.stats-number {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.stats-label {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.search-section {
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  height: 80rpx;
  background: white;
  border-radius: 40rpx;
  padding: 0 40rpx;
  font-size: 28rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.1);
}

.search-left {
  flex: 1;
}

.search-right {
  margin-left: 20rpx;
}

.user-list {
  margin-bottom: 40rpx;
}

.user-item {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  flex: 1;
  display: flex;
  align-items: center;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #2D81FF, #4c9dff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-text {
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
}

.user-main {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.user-line {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 4rpx;
}

.user-tags {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.user-role {
  font-size: 24rpx;
  color: #2D81FF;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  background: #f0f5ff;
}

.user-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.user-status.active {
  background: #f6ffed;
  color: #52c41a;
}

.user-status.disabled {
  background: #fff2f0;
  color: #ff4d4f;
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-left: 20rpx;
}

.edit-btn {
  background: #2D81FF;
  color: white;
  border: none;
  border-radius: 10rpx;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  min-width: 140rpx;
}

.status-btn {
  border-radius: 10rpx;
  padding: 12rpx 20rpx;
  font-size: 24rpx;
  min-width: 140rpx;
}

.status-btn.to-disable {
  background: #fff2f0;
  color: #ff4d4f;
}

.status-btn.to-enable {
  background: #f6ffed;
  color: #52c41a;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 100rpx;
  font-size: 32rpx;
}

.edit-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.edit-panel {
  width: 80%;
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx 30rpx 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.edit-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  text-align: center;
}

.edit-field {
  margin-bottom: 20rpx;
}

.field-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.field-input {
  width: 100%;
  height: 72rpx;
  border-radius: 10rpx;
  background-color: #f5f7fa;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.field-value {
  font-size: 28rpx;
  color: #333;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10rpx;
  gap: 20rpx;
}

.edit-cancel,
.edit-save {
  min-width: 140rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  border-radius: 36rpx;
  padding: 0 20rpx;
}

.edit-cancel {
  background-color: #f5f7fa;
  color: #606266;
}

.edit-save {
  background-color: #2D81FF;
  color: #fff;
}

.role-picker {
  margin-left: 20rpx;
  padding: 0 24rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.role-picker-text {
  font-size: 26rpx;
  color: #333;
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
</style>