<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="操作日志"
    currentPage="/admin/pages/admin/oper-log"
  >
    <view class="manage-container">
      <!-- 搜索和筛选栏 -->
      <view class="search-filter-bar">
        <view class="search-row">
          <input 
            type="text"
            placeholder="请输入模块标题"
            v-model="queryParams.title"
            class="search-input"
          />
          <input 
            type="text"
            placeholder="请输入操作人员"
            v-model="queryParams.operName"
            class="search-input"
          />
        </view>
        <view class="search-row">
          <picker 
            mode="selector"
            :range="statusOptions"
            :range-key="'label'"
            :value="statusOptions.findIndex(opt => opt.value === queryParams.status)"
            @change="handleStatusChange"
            class="filter-picker"
          >
            <view class="filter-picker-text">
              {{ statusOptions.find(opt => opt.value === queryParams.status)?.label || '全部状态' }}
            </view>
          </picker>
          <view class="btn-group">
            <button class="action-btn search" @click="handleSearch">搜索</button>
            <button class="action-btn reset" @click="handleReset">重置</button>
          </view>
        </view>
      </view>

      <!-- 操作栏 -->
      <view class="action-bar">
        <button class="action-btn clean" @click="handleClean">清空日志</button>
      </view>

      <!-- 日志列表 -->
      <view class="list-container">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-else-if="logList.length > 0" class="log-list">
          <!-- 表头 (仅在大屏或模拟表格时显示，这里用卡片布局更适合移动端，但尝试模拟表格头部) -->
          <view class="list-header">
            <text class="col id">日志编号</text>
            <text class="col title">系统模块</text>
            <text class="col type">业务类型</text>
            <text class="col user">操作人员</text>
            <text class="col status">状态</text>
            <text class="col time">操作日期</text>
            <text class="col action">操作</text>
          </view>

          <view v-for="item in logList" :key="item.id" class="log-item">
            <text class="col id">{{ item.id }}</text>
            <text class="col title">{{ item.title }}</text>
            <text class="col type">{{ getBusinessType(item.businessType) }}</text>
            <text class="col user">{{ item.operName }}</text>
            <view class="col status">
              <text :class="['status-tag', item.status === 0 ? 'success' : 'fail']">
                {{ item.status === 0 ? '正常' : '失败' }}
              </text>
            </view>
            <text class="col time">{{ formatTime(item.operTime) }}</text>
            <view class="col action">
              <button class="detail-btn" @click="handleDetail(item)">详细</button>
            </view>
          </view>
        </view>
        
        <view v-else class="empty-state">
          <text>暂无操作日志</text>
        </view>

        <!-- 分页组件 -->
        <view v-if="total > 0" class="pagination">
          <button 
            class="page-btn" 
            :disabled="queryParams.pageNum === 1"
            @click="handlePrevPage"
          >
            上一页
          </button>
          
          <view class="page-info">
            <text>{{ queryParams.pageNum }}</text>
            <text class="page-separator">/</text>
            <text>{{ totalPages }}</text>
          </view>
          
          <button 
            class="page-btn" 
            :disabled="queryParams.pageNum === totalPages"
            @click="handleNextPage"
          >
            下一页
          </button>
        </view>
      </view>

      <!-- 详情弹窗 -->
      <view class="modal-mask" v-if="showDetailModal" @click="closeDetailModal">
        <view class="modal-content" @click.stop>
          <view class="modal-header">
            <text class="modal-title">操作日志详情</text>
            <text class="close-btn" @click="closeDetailModal">×</text>
          </view>
          <scroll-view scroll-y class="modal-body">
            <view class="detail-item">
              <text class="label">操作模块：</text>
              <text class="value">{{ currentLog.title }} / {{ getBusinessType(currentLog.businessType) }}</text>
            </view>
            <view class="detail-item">
              <text class="label">请求地址：</text>
              <text class="value">{{ currentLog.operUrl }}</text>
            </view>
            <view class="detail-item">
              <text class="label">请求方式：</text>
              <text class="value">{{ currentLog.requestMethod }}</text>
            </view>
            <view class="detail-item">
              <text class="label">操作方法：</text>
              <text class="value code">{{ currentLog.method }}</text>
            </view>
            <view class="detail-item">
              <text class="label">请求参数：</text>
              <text class="value code">{{ currentLog.operParam }}</text>
            </view>
            <view class="detail-item">
              <text class="label">返回结果：</text>
              <text class="value code">{{ currentLog.jsonResult }}</text>
            </view>
            <view class="detail-item" v-if="currentLog.status === 1">
              <text class="label error">错误信息：</text>
              <text class="value error">{{ currentLog.errorMsg }}</text>
            </view>
          </scroll-view>
          <view class="modal-footer">
            <button class="modal-btn" @click="closeDetailModal">关闭</button>
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
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        title: '',
        operName: '',
        status: '' // 0正常 1异常
      },
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 0, label: '正常' },
        { value: 1, label: '异常' }
      ],
      logList: [],
      total: 0,
      
      // 详情弹窗
      showDetailModal: false,
      currentLog: {}
    }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.queryParams.pageSize) || 1
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const params = {
          ...this.queryParams,
          status: this.queryParams.status === '' ? undefined : this.queryParams.status
        }
        const res = await request('/api/monitor/operlog/list', { params }, 'GET')
        
        // 兼容不同的返回结构
        const records = res.records || res.data?.records || []
        this.total = res.total || res.data?.total || 0
        this.logList = records
      } catch (e) {
        console.error('加载日志失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    
    handleSearch() {
      this.queryParams.pageNum = 1
      this.loadData()
    },
    
    handleReset() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        title: '',
        operName: '',
        status: ''
      }
      this.loadData()
    },
    
    handleStatusChange(e) {
      this.queryParams.status = this.statusOptions[e.detail.value].value
    },
    
    handleClean() {
      uni.showModal({
        title: '警告',
        content: '确定要清空所有操作日志吗？此操作不可恢复！',
        confirmColor: '#ff4757',
        success: async (res) => {
          if (res.confirm) {
            try {
              await request('/api/monitor/operlog/clean', {}, 'DELETE')
              uni.showToast({ title: '清空成功', icon: 'success' })
              this.handleReset()
            } catch (e) {
              uni.showToast({ title: '清空失败', icon: 'none' })
            }
          }
        }
      })
    },
    
    handleDetail(item) {
      this.currentLog = item
      this.showDetailModal = true
    },
    
    closeDetailModal() {
      this.showDetailModal = false
    },
    
    handlePrevPage() {
      if (this.queryParams.pageNum > 1) {
        this.queryParams.pageNum--
        this.loadData()
      }
    },
    
    handleNextPage() {
      if (this.queryParams.pageNum < this.totalPages) {
        this.queryParams.pageNum++
        this.loadData()
      }
    },
    
    getBusinessType(type) {
      const map = {
        0: '其它',
        1: '新增',
        2: '修改',
        3: '删除',
        4: '授权',
        5: '导出',
        6: '导入',
        7: '强退',
        8: '生成代码',
        9: '清空数据'
      }
      return map[type] || type
    },
    
    formatTime(time) {
      if (!time) return ''
      return new Date(time).toLocaleString()
    }
  }
}
</script>

<style scoped>
.manage-container {
  padding: 30rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
  padding-top: 100rpx;
}

/* 搜索栏 */
.search-filter-bar {
  background: white;
  padding: 20rpx;
  border-radius: 15rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.search-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.search-input {
  flex: 1;
  background: #f5f7fa;
  height: 70rpx;
  border-radius: 35rpx;
  padding: 0 30rpx;
  font-size: 26rpx;
}

.filter-picker {
  flex: 1;
  background: #f5f7fa;
  height: 70rpx;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-picker-text {
  font-size: 26rpx;
  color: #666;
}

.btn-group {
  display: flex;
  gap: 15rpx;
}

.action-btn {
  font-size: 24rpx;
  padding: 0 30rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
  margin: 0;
}

.action-btn.search {
  background: #2D81FF;
  color: white;
}

.action-btn.reset {
  background: #f5f7fa;
  color: #666;
  border: 1rpx solid #ddd;
}

.action-btn.clean {
  background: #ff4757;
  color: white;
  margin-bottom: 20rpx;
}

/* 列表样式 */
.log-list {
  background: white;
  border-radius: 15rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.list-header {
  display: flex;
  background: #f5f7fa;
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
  font-weight: bold;
  font-size: 24rpx;
  color: #333;
}

.log-item {
  display: flex;
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  align-items: center;
  font-size: 24rpx;
  color: #666;
}

.col {
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 5rpx;
}

.col.id { flex: 0.5; }
.col.title { flex: 1.5; }
.col.time { flex: 1.5; font-size: 22rpx; }
.col.action { flex: 0.8; }

.status-tag {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
}

.status-tag.success {
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.status-tag.fail {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.detail-btn {
  font-size: 22rpx;
  padding: 0 15rpx;
  height: 40rpx;
  line-height: 40rpx;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 6rpx;
  margin: 0 auto;
  display: inline-block;
}

/* 分页组件样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 30rpx;
  padding-bottom: 30rpx;
}

.page-btn {
  padding: 5rpx 20rpx;
  background-color: #fff;
  color: #333;
  border: 1rpx solid #e4e7ed;
  border-radius: 6rpx;
  font-size: 24rpx;
  margin: 0;
}

.page-btn[disabled] {
  opacity: 0.5;
  color: #909399;
}

.page-info {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #333;
}

/* 详情弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 85%;
  max-height: 80vh;
  background: white;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
}

.close-btn {
  font-size: 40rpx;
  color: #999;
  padding: 0 10rpx;
}

.modal-body {
  padding: 30rpx;
  max-height: 60vh;
  box-sizing: border-box;
}

.detail-item {
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
}

.detail-item .label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.detail-item .value {
  font-size: 26rpx;
  color: #333;
  word-break: break-all;
}

.detail-item .value.code {
  background: #f5f7fa;
  padding: 15rpx;
  border-radius: 8rpx;
  font-family: monospace;
}

.detail-item .value.error {
  color: #ff4757;
}

.modal-footer {
  padding: 20rpx;
  border-top: 1rpx solid #eee;
}

.modal-btn {
  background: #2D81FF;
  color: white;
  font-size: 28rpx;
  border-radius: 35rpx;
}
</style>