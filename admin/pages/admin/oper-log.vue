<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="操作日志"
    currentPage="/admin/pages/admin/oper-log"
    pageBreadcrumb="管理后台 / 操作日志"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">系统操作日志</text>
          <text class="overview-subtitle">统一使用后台表格页展示系统模块操作记录，保留条件筛选、分页和日志详情查看。</text>
        </view>

        <view class="overview-chip">
          <text class="overview-chip-label">当前页码</text>
          <text class="overview-chip-value">{{ queryParams.pageNum }}</text>
        </view>
      </view>

      <view class="status-summary-bar oper-status-bar">
        <view class="status-summary-card" :class="{ active: queryParams.status === '' }" @click="applyQuickStatus('')">
          <text class="summary-label">当前页总数</text>
          <text class="summary-value">{{ pageStats.total }}</text>
        </view>
        <view class="status-summary-card success" :class="{ active: queryParams.status === 0 }" @click="applyQuickStatus(0)">
          <text class="summary-label">正常日志</text>
          <text class="summary-value">{{ pageStats.normal }}</text>
        </view>
        <view class="status-summary-card fail" :class="{ active: queryParams.status === 1 }" @click="applyQuickStatus(1)">
          <text class="summary-label">异常日志</text>
          <text class="summary-value">{{ pageStats.fail }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid oper-query-grid">
          <view class="query-field">
            <text class="query-label">模块标题</text>
            <input
              v-model="queryParams.title"
              class="query-input"
              type="text"
              placeholder="请输入模块标题"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">操作人员</text>
            <input
              v-model="queryParams.operName"
              class="query-input"
              type="text"
              placeholder="请输入操作人员"
              @confirm="handleSearch"
            />
          </view>

          <view class="query-field">
            <text class="query-label">执行状态</text>
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
        </view>

        <view class="query-actions">
          <button class="query-btn primary" @click="handleSearch">查询</button>
          <button class="query-btn secondary" @click="handleReset">重置</button>
        </view>
      </view>

      <view class="table-toolbar">
        <view class="toolbar-left-group">
          <text class="toolbar-meta">日志总量 {{ total }} 条</text>
          <text class="toolbar-meta active">当前页 {{ logList.length }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <button class="row-btn danger" @click="handleClean">清空日志</button>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="scroll-table">
          <view class="table-head oper-table">
            <text class="table-col col-id">日志编号</text>
            <text class="table-col col-title">系统模块</text>
            <text class="table-col col-type">业务类型</text>
            <text class="table-col col-user">操作人员</text>
            <text class="table-col col-status">状态</text>
            <text class="table-col col-time">操作时间</text>
            <text class="table-col col-actions">操作</text>
          </view>

          <view
            v-for="(item, index) in logList"
            :key="item.id || index"
            class="table-row oper-table"
            :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
          >
            <view class="table-col col-id">
              <text class="minor-text">#{{ item.id }}</text>
            </view>

            <view class="table-col col-title">
              <text class="primary-text">{{ item.title || '-' }}</text>
            </view>

            <view class="table-col col-type">
              <text class="plain-text">{{ getBusinessType(item.businessType) }}</text>
            </view>

            <view class="table-col col-user">
              <text class="plain-text">{{ item.operName || '-' }}</text>
            </view>

            <view class="table-col col-status">
              <text class="status-pill" :class="getStatusClass(item.status)">
                {{ item.status === 0 ? '正常' : '失败' }}
              </text>
            </view>

            <view class="table-col col-time">
              <text class="minor-text">{{ formatTime(item.operTime) }}</text>
            </view>

            <view class="table-col col-actions row-actions">
              <button class="row-btn ghost" @click="handleDetail(item)">查看详情</button>
            </view>
          </view>
        </view>

        <view v-if="logList.length === 0" class="empty-state">
          <text>暂无操作日志</text>
        </view>
      </view>

      <view v-if="total > 0" class="pagination">
        <view class="page-meta">
          <text>第 {{ queryParams.pageNum }} / {{ totalPages }} 页</text>
        </view>

        <view class="page-controls">
          <button class="page-btn" :disabled="queryParams.pageNum <= 1" @click="handlePrevPage">上一页</button>
          <button class="page-btn" :disabled="queryParams.pageNum >= totalPages" @click="handleNextPage">下一页</button>
          <view class="page-size">
            <text>每页</text>
            <picker mode="selector" :range="pageSizeOptions" :value="pageSizeIndex" @change="handlePageSizeChange">
              <text class="page-size-text">{{ queryParams.pageSize }} 条</text>
            </picker>
          </view>
        </view>
      </view>

      <view v-if="showDetailModal" class="detail-modal" @click="closeDetailModal">
        <view class="detail-content log-detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">操作日志详情</text>
            <button class="close-btn" @click="closeDetailModal">关闭</button>
          </view>

          <scroll-view scroll-y class="log-detail-scroll">
            <view class="detail-body">
              <view class="detail-item">
                <text class="detail-label">操作模块:</text>
                <text class="detail-value">{{ currentLog.title || '-' }} / {{ getBusinessType(currentLog.businessType) }}</text>
              </view>

              <view class="detail-item">
                <text class="detail-label">请求地址:</text>
                <text class="detail-value">{{ currentLog.operUrl || '-' }}</text>
              </view>

              <view class="detail-item">
                <text class="detail-label">请求方式:</text>
                <text class="detail-value">{{ currentLog.requestMethod || '-' }}</text>
              </view>

              <view class="detail-item detail-item-block">
                <text class="detail-label">操作方法:</text>
                <text class="detail-value log-code">{{ currentLog.method || '-' }}</text>
              </view>

              <view class="detail-item detail-item-block">
                <text class="detail-label">请求参数:</text>
                <text class="detail-value log-code">{{ currentLog.operParam || '-' }}</text>
              </view>

              <view class="detail-item detail-item-block">
                <text class="detail-label">返回结果:</text>
                <text class="detail-value log-code">{{ currentLog.jsonResult || '-' }}</text>
              </view>

              <view v-if="currentLog.status === 1" class="detail-item detail-item-block">
                <text class="detail-label">错误信息:</text>
                <text class="detail-value log-error">{{ currentLog.errorMsg || '-' }}</text>
              </view>
            </view>
          </scroll-view>
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
      pageSizeOptions: [10, 20, 50],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        title: '',
        operName: '',
        status: ''
      },
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: 0, label: '正常' },
        { value: 1, label: '异常' }
      ],
      logList: [],
      total: 0,
      showDetailModal: false,
      currentLog: {}
    }
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.total / this.queryParams.pageSize))
    },
    pageSizeIndex() {
      return Math.max(0, this.pageSizeOptions.indexOf(this.queryParams.pageSize))
    },
    statusPickerIndex() {
      return Math.max(0, this.statusOptions.findIndex(item => item.value === this.queryParams.status))
    },
    currentStatusLabel() {
      const current = this.statusOptions.find(item => item.value === this.queryParams.status)
      return current ? current.label : '全部状态'
    },
    pageStats() {
      return this.logList.reduce((stats, item) => {
        stats.total += 1
        if (Number(item.status) === 0) {
          stats.normal += 1
        } else {
          stats.fail += 1
        }
        return stats
      }, {
        total: 0,
        normal: 0,
        fail: 0
      })
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
        const records = res.records || res.data?.records || []
        this.total = res.total || res.data?.total || 0
        this.logList = Array.isArray(records) ? records : []
      } catch (error) {
        console.error('加载日志失败', error)
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
      const index = Number(e.detail.value)
      this.queryParams.status = this.statusOptions[index].value
    },
    applyQuickStatus(status) {
      this.queryParams.status = status
      this.queryParams.pageNum = 1
      this.loadData()
    },
    handlePageSizeChange(e) {
      const index = Number(e.detail.value)
      const pageSize = this.pageSizeOptions[index]
      if (pageSize) {
        this.queryParams.pageSize = pageSize
        this.queryParams.pageNum = 1
        this.loadData()
      }
    },
    handlePrevPage() {
      if (this.queryParams.pageNum > 1) {
        this.queryParams.pageNum -= 1
        this.loadData()
      }
    },
    handleNextPage() {
      if (this.queryParams.pageNum < this.totalPages) {
        this.queryParams.pageNum += 1
        this.loadData()
      }
    },
    handleClean() {
      uni.showModal({
        title: '清空日志',
        content: '确定要清空所有操作日志吗？该操作不可恢复。',
        confirmColor: '#ee6374',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await request('/api/monitor/operlog/clean', {}, 'DELETE')
            uni.showToast({ title: '清空成功', icon: 'success' })
            this.handleReset()
          } catch (error) {
            console.error('清空日志失败', error)
            uni.showToast({ title: '清空失败', icon: 'none' })
          }
        }
      })
    },
    handleDetail(item) {
      this.currentLog = item || {}
      this.showDetailModal = true
    },
    closeDetailModal() {
      this.showDetailModal = false
      this.currentLog = {}
    },
    getStatusClass(status) {
      return Number(status) === 0 ? 'status-normal' : 'status-fail'
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
      return map[type] || type || '-'
    },
    formatTime(time) {
      if (!time) return '-'
      const date = new Date(time)
      if (Number.isNaN(date.getTime())) return time
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const second = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    }
  }
}
</script>

<style scoped src="../../styles/admin-table-page.css"></style>
<style scoped>
.oper-status-bar {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.status-summary-card.success {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.status-summary-card.fail {
  background: linear-gradient(180deg, #fff 0%, #fff1f3 100%);
}

.oper-query-grid {
  grid-template-columns: 1fr 1fr 1fr;
}

.oper-table {
  grid-template-columns: 160rpx 320rpx 180rpx 180rpx 140rpx 240rpx 180rpx;
  min-width: 1600rpx;
}

.status-pill.status-normal {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.status-fail {
  background: #fff1f3;
  color: #c44859;
}

.log-detail-content {
  max-width: 920rpx;
}

.log-detail-scroll {
  max-height: 62vh;
}

.log-code {
  display: block;
  margin-top: 12rpx;
  border-radius: 14rpx;
  background: #f7faff;
  border: 1rpx solid #e4ebf5;
  padding: 18rpx 20rpx;
  line-height: 1.5;
  font-family: Consolas, Monaco, monospace;
  word-break: break-all;
}

.log-error {
  color: #c44859;
  line-height: 1.5;
}
</style>
