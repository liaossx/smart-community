<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="公告管理"
    currentPage="/admin/pages/admin/notice-manage"
  >
    <view class="manage-container">

      <!-- 筛选栏 -->
      <view class="filter-bar">
        <input 
          class="search-input" 
          v-model="filters.title" 
          placeholder="搜索标题" 
          confirm-type="search"
          @confirm="handleSearch"
        />
        
        <picker 
          mode="selector" 
          :range="statusOptions" 
          range-key="label" 
          @change="handleStatusChange"
        >
          <view class="picker-item">
            {{ getStatusLabel(filters.publishStatus) || '全部状态' }}
            <text class="icon">▼</text>
          </view>
        </picker>

        <picker 
          mode="selector" 
          :range="topOptions" 
          range-key="label" 
          @change="handleTopChange"
        >
          <view class="picker-item">
            {{ getTopLabel(filters.topFlag) || '全部置顶' }}
            <text class="icon">▼</text>
          </view>
        </picker>

        <button class="search-btn" @click="handleSearch">搜索</button>
      </view>

      <!-- 工具栏 -->
      <view class="tool-bar">
        <view class="tool-left">
          <!-- 全选 (仅列表有数据时显示) -->
          <view v-if="noticeList.length > 0" class="check-wrap" @click="testSelectAll">
            <checkbox 
              :checked="isAllSelected" 
              color="#2D81FF" 
              style="transform:scale(0.8)" 
              @tap.stop="testSelectAll"
            />
            <text class="check-text">全选</text>
          </view>
          
          <!-- 选中统计 -->
          <text v-if="selectedIds.length > 0" class="selected-hint">
            已选 {{ selectedIds.length }}
          </text>
        </view>

        <!-- 批量操作 (仅选中时显示) -->
        <view class="tool-actions" v-if="selectedIds.length > 0">
          <view class="action-item delete" @click="handleBatchDelete">
            <text>删除</text>
          </view>
          <view class="action-item offline" @click="handleBatchOffline">
            <text>下架</text>
          </view>
        </view>

        <!-- 发布按钮 -->
        <view class="tool-right">
          <button class="create-btn" @click="handleAddNotice">发布公告</button>
        </view>
      </view>

      <!-- 加载 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 列表 -->
      <view v-else-if="noticeList.length" class="notice-list">
        <view class="list-header">
          <text class="total-count">共 {{ total }} 条公告</text>
        </view>
        <view
          v-for="notice in noticeList"
          :key="notice.id"
          class="notice-item"
        >
          <view class="notice-header">
            <view class="header-left" @tap="toggleSelect(notice.id)">
              <checkbox 
                :checked="selectedIds.includes(notice.id)"
                color="#2D81FF" 
                style="transform:scale(0.8)"
                @tap.stop="toggleSelect(notice.id)"
              />
            </view>
            <view class="tags">
              <text v-if="notice.topFlag" class="tag top">置顶</text>
              <text class="tag status" :class="notice.publishStatus.toLowerCase()">
                {{ getStatusText(notice.publishStatus) }}
              </text>
            </view>
          </view>

          <view class="notice-info">
            <text class="notice-title">{{ notice.title }}</text>
            <text class="notice-content">{{ notice.content }}</text>
            <view class="meta-row">
              <text class="notice-time">发布于: {{ notice.publishTime || '未发布' }}</text>
              <text class="read-count" @click="handleReadStat(notice.id)">查看数据 📊</text>
            </view>
          </view>

          <view class="notice-actions">
            <button class="action-btn edit" @click="handleEditNotice(notice.id)">编辑</button>
            
            <button 
              v-if="notice.publishStatus !== 'PUBLISHED'" 
              class="action-btn publish" 
              @click="handlePublish(notice.id)"
            >
              发布
            </button>
            
            <button 
              v-if="notice.publishStatus === 'PUBLISHED'" 
              class="action-btn offline" 
              @click="handleOffline(notice.id)"
            >
              下架
            </button>
            
            <button class="action-btn delete" @click="handleDeleteNotice(notice.id)">删除</button>
          </view>
        </view>
      </view>

      <!-- 空 -->
      <view v-else class="empty-state">
        <text>暂无公告数据</text>
      </view>

      <!-- 分页 -->
      <view v-if="total > 0" class="pagination-container">
        <text class="page-info">共 {{ total }} 条，当前第 {{ currentPage }}/{{ totalPage }} 页</text>
        <view class="pagination-btns">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1" 
            @click="prevPage"
          >
            上一页
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === totalPage"
            @click="nextPage"
          >
            下一页
          </button>
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
      noticeList: [],
      loading: false,
      currentPage: 1,
      pageSize: 10,
      total: 0,
      selectAll: false,
      
      // 筛选条件
      filters: {
        title: '',
        publishStatus: '',
        topFlag: ''
      },
      
      // 批量选择
      selectedIds: [],

      // 选项数据
      statusOptions: [
        { label: '全部状态', value: '' },
        { label: '已发布', value: 'PUBLISHED' },
        { label: '草稿', value: 'DRAFT' },
        { label: '已下架', value: 'OFFLINE' } // 假设有OFFLINE状态，或者未发布即DRAFT
      ],
      topOptions: [
        { label: '全部置顶', value: '' },
        { label: '置顶', value: 'true' },
        { label: '不置顶', value: 'false' }
      ]
    }
  },

  computed: {
    totalPage() {
      return Math.ceil(this.total / this.pageSize) || 1
    },
    isAllSelected() {
      return this.noticeList.length > 0 && this.selectedIds.length === this.noticeList.length
    }
  },

  onLoad() {
    this.checkAdminRole()
  },

  onShow() {
    this.loadNoticeList()
  },

  methods: {
    checkAdminRole() {
      const userInfo = uni.getStorageSync('userInfo')
      if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'super_admin')) {
        uni.showToast({ title: '无权限访问', icon: 'none' })
        uni.redirectTo({ url: '/owner/pages/login/login' })
      }
    },

    // 加载列表（使用新接口）
    async loadNoticeList() {
      this.loading = true
      this.selectedIds = [] // 刷新时清空选择
      try {
        const params = {
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          // 优先置顶，其次按发布时间
          orderByColumn: 'top_flag desc, publish_time', 
          isAsc: 'desc',
          ...this.filters
        }
        
        // 过滤空参数
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === null) delete params[key]
        })

        const res = await request(
          '/api/notice/admin/list',
          { params },
          'GET'
        )

        this.noticeList = res.records || []
        this.total = res.total || 0
      } catch (e) {
        console.error(e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    // 搜索处理
    handleSearch() {
      this.currentPage = 1
      this.loadNoticeList()
    },

    handleStatusChange(e) {
      this.filters.publishStatus = this.statusOptions[e.detail.value].value
      this.handleSearch()
    },

    handleTopChange(e) {
      this.filters.topFlag = this.topOptions[e.detail.value].value
      this.handleSearch()
    },

    getStatusLabel(val) {
      const opt = this.statusOptions.find(o => o.value === val)
      return opt ? opt.label : ''
    },

    getTopLabel(val) {
      const opt = this.topOptions.find(o => o.value === val)
      return opt ? opt.label : ''
    },

    getStatusText(status) {
      const map = {
        'PUBLISHED': '已发布',
        'DRAFT': '草稿',
        'OFFLINE': '已下架'
      }
      return map[status] || status
    },

    // 页面跳转
    handleAddNotice() {
      uni.navigateTo({ url: '/admin/pages/admin/notice-edit' })
    },

    handleEditNotice(id) {
      uni.navigateTo({
        url: `/admin/pages/admin/notice-edit?noticeId=${id}`
      })
    },

    // 单个操作：发布
    async handlePublish(id) {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        console.log('准备发布公告', { id, adminId: userInfo && userInfo.id })
        await request(
          `/api/notice/${id}/publish`,
          { params: { adminId: userInfo.id } },
          'PUT'
        )
        console.log('发布成功', { id })
        uni.showToast({ title: '发布成功' })
        this.loadNoticeList()
      } catch (e) {
        console.error('发布失败详情', e && e.message ? e.message : e, e && e.stack ? e.stack : '')
        uni.showToast({ title: '发布失败', icon: 'none' })
      }
    },

    // 单个操作：下架
    async handleOffline(id) {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        console.log('准备下架公告', { id, adminId: userInfo && userInfo.id })
        await request(
          `/api/notice/${id}/offline`,
          { params: { adminId: userInfo.id } },
          'PUT'
        )
        console.log('下架成功', { id })
        uni.showToast({ title: '下架成功' })
        this.loadNoticeList()
      } catch (e) {
        console.error('下架失败详情', e && e.message ? e.message : e, e && e.stack ? e.stack : '')
        uni.showToast({ title: '下架失败', icon: 'none' })
      }
    },

    // 单个操作：删除
    async handleDeleteNotice(id) {
      const userInfo = uni.getStorageSync('userInfo')
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条公告吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await request(
                `/api/notice/${id}`,
                { params: { adminId: userInfo.id } },
                'DELETE'
              )
              uni.showToast({ title: '删除成功' })
              this.loadNoticeList()
            } catch (e) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },

    // 批量操作：删除
    async handleBatchDelete() {
      if (!this.selectedIds.length) return
      
      const userInfo = uni.getStorageSync('userInfo')
      uni.showModal({
        title: '批量删除',
        content: `确定要删除选中的 ${this.selectedIds.length} 条公告吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await request(
                '/api/notice/batch/delete',
                { 
                  data: { noticeIds: this.selectedIds },
                  params: { adminId: userInfo.id }
                },
                'POST'
              )
              uni.showToast({ title: '批量删除成功' })
              this.loadNoticeList()
            } catch (e) {
              uni.showToast({ title: '批量删除失败', icon: 'none' })
            }
          }
        }
      })
    },

    // 批量操作：下架
    async handleBatchOffline() {
      if (!this.selectedIds.length) return
      
      const userInfo = uni.getStorageSync('userInfo')
      uni.showModal({
        title: '批量下架',
        content: `确定要下架选中的 ${this.selectedIds.length} 条公告吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await request(
                '/api/notice/batch/offline',
                { 
                  data: { noticeIds: this.selectedIds },
                  params: { adminId: userInfo.id }
                },
                'POST'
              )
              uni.showToast({ title: '批量下架成功' })
              this.loadNoticeList()
            } catch (e) {
              uni.showToast({ title: '批量下架失败', icon: 'none' })
            }
          }
        }
      })
    },

    // 查看统计
    async handleReadStat(id) {
      try {
        const res = await request(
          `/api/notice/${id}/read-stat`,
          {},
          'GET'
        )
        // 假设返回结构 { readCount: 100, likeCount: 10, ... }
        // 根据实际接口返回调整
        const content = `阅读量：${res.readCount || 0}\n点赞数：${res.likeCount || 0}\n收藏数：${res.collectCount || 0}` // 示例字段
        
        uni.showModal({
          title: '公告数据统计',
          content: content,
          showCancel: false
        })
      } catch (e) {
        uni.showToast({ title: '获取统计失败', icon: 'none' })
      }
    },

    // 选择相关
    toggleSelect(id) {
      const index = this.selectedIds.indexOf(id)
      if (index > -1) {
        this.selectedIds.splice(index, 1)
      } else {
        this.selectedIds.push(id)
      }
      // 强制更新引用，确保视图响应
      this.selectedIds = [...this.selectedIds]
    },

    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedIds = []
      } else {
        this.selectedIds = this.noticeList.map(item => item.id)
      }
    },

    // 参考 repair-manage 的全选逻辑，确保视图更新
    testSelectAll() {
      const shouldSelectAll = !this.selectAll
      this.selectAll = shouldSelectAll
      if (shouldSelectAll) {
        this.selectedIds = [...this.noticeList.map(item => item.id)]
      } else {
        this.selectedIds = []
      }
      this.$forceUpdate()
      setTimeout(() => {
        this.selectedIds = [...this.selectedIds]
      }, 10)
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        this.loadNoticeList()
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPage) {
        this.currentPage++
        this.loadNoticeList()
      }
    }
  }
}
</script>

<style scoped>
.manage-container {
  padding: 120rpx 30rpx 30rpx;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.search-input {
  flex: 2;
  font-size: 28rpx;
  border: 1px solid #eee;
  padding: 10rpx 20rpx;
  border-radius: 8rpx;
}

.picker-item {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  color: #666;
  border: 1px solid #eee;
  padding: 10rpx 20rpx;
  border-radius: 8rpx;
  height: 100%;
}

.search-btn {
  background: #2D81FF;
  color: white;
  font-size: 26rpx;
  padding: 0 30rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 8rpx;
}

/* 工具栏 */
.tool-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 20rpx 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
  margin-bottom: 30rpx;
  min-height: 88rpx;
}

.tool-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.check-wrap {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #333;
}

.check-text {
  margin-left: 8rpx;
}

.selected-hint {
  font-size: 24rpx;
  color: #2D81FF;
  background: #f0f5ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.tool-actions {
  display: flex;
  gap: 20rpx;
}

.action-item {
  font-size: 26rpx;
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  line-height: 1.5;
}

.action-item.delete {
  background: #fff0f0;
  color: #ff4757;
  border: 1px solid rgba(255, 71, 87, 0.2);
}

.action-item.offline {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid rgba(82, 196, 26, 0.2);
}

.create-btn {
  margin: 0;
  background: #2D81FF;
  color: #fff;
  font-size: 28rpx;
  padding: 0 32rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(45, 129, 255, 0.3);
}

/* 列表样式 */
.notice-list {
  margin-bottom: 40rpx;
}

.list-header {
  margin-bottom: 20rpx;
  padding: 0 10rpx;
}

.total-count {
  font-size: 26rpx;
  color: #666;
}

.notice-item {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.header-left {
  display: flex;
  align-items: center;
}

.tags {
  display: flex;
  gap: 10rpx;
}

.tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.tag.top {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.tag.status.published {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.tag.status.draft {
  background: #fffbe6;
  color: #faad14;
  border: 1px solid #ffe58f;
}

.tag.status.offline {
  background: #f5f5f5;
  color: #999;
  border: 1px solid #d9d9d9;
}

.notice-info {
  margin-bottom: 20rpx;
  padding-left: 50rpx; /* 对齐checkbox后的内容 */
}

.notice-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.notice-content {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notice-time {
  font-size: 24rpx;
  color: #999;
}

.read-count {
  font-size: 24rpx;
  color: #2D81FF;
  text-decoration: underline;
}

.notice-actions {
  display: flex;
  justify-content: flex-end;
  gap: 20rpx;
  padding-top: 20rpx;
  border-top: 1px solid #f5f5f5;
}

.action-btn {
  margin: 0;
  font-size: 24rpx;
  padding: 10rpx 24rpx;
  border-radius: 8rpx;
  line-height: 1.5;
}

.action-btn.edit {
  background: #f0f5ff;
  color: #2D81FF;
}

.action-btn.publish {
  background: #f6ffed;
  color: #52c41a;
}

.action-btn.offline {
  background: #fff7e6;
  color: #faad14;
}

.action-btn.delete {
  background: #fff0f0;
  color: #ff4757;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 60rpx;
  color: #999;
  font-size: 28rpx;
}

/* 分页组件样式 */
.pagination-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  margin-top: 40rpx;
  padding: 30rpx 0;
  background-color: #fff;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.page-info {
  font-size: 26rpx;
  color: #666;
}

.pagination-btns {
  display: flex;
  gap: 30rpx;
}

.page-btn {
  padding: 0 40rpx;
  height: 70rpx;
  line-height: 70rpx;
  background-color: #fff;
  color: #333;
  border: 1rpx solid #e4e7ed;
  border-radius: 35rpx;
  font-size: 28rpx;
  min-width: 160rpx;
  margin: 0;
}

.page-btn[disabled] {
  background-color: #f5f7fa;
  color: #c0c4cc;
  border-color: #ebeef5;
}

</style>
