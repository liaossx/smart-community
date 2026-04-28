<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="任务中心"
    currentPage="/admin/pages/admin/worker-tasks"
    pageBreadcrumb="管理后台 / 任务中心"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">维修任务中心</text>
          <text class="overview-subtitle">统一按后台任务表格页呈现待处理、处理中和已完成工单，并保留处理结果提交流程。</text>
        </view>

        <view class="overview-chip">
          <text class="overview-chip-label">当前阶段</text>
          <text class="overview-chip-value">{{ currentTabLabel }}</text>
        </view>
      </view>

      <view class="status-summary-bar worker-status-bar">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="status-summary-card"
          :class="[tab.statusClass, { active: currentTab === tab.value }]"
          @click="switchTab(tab.value)"
        >
          <text class="summary-label">{{ tab.label }}</text>
          <text class="summary-value">{{ currentTab === tab.value ? taskList.length : '-' }}</text>
        </view>
      </view>

      <view class="table-toolbar">
        <view class="toolbar-left-group">
          <text class="toolbar-meta">当前阶段：{{ currentTabLabel }}</text>
          <text class="toolbar-meta active">任务数 {{ taskList.length }} 条</text>
        </view>

        <view class="toolbar-right-group">
          <button class="row-btn ghost" @click="loadTasks">刷新列表</button>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="scroll-table">
          <view class="table-head worker-table">
            <text class="table-col col-order">工单号</text>
            <text class="table-col col-type">报修类型</text>
            <text class="table-col col-desc">报修内容</text>
            <text class="table-col col-phone">手机号</text>
            <text class="table-col col-address">报修地点</text>
            <text class="table-col col-priority">优先级</text>
            <text class="table-col col-time">创建时间</text>
            <text class="table-col col-actions">操作</text>
          </view>

          <view
            v-for="(item, index) in taskList"
            :key="item.id || index"
            class="table-row worker-table"
            :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
          >
            <view class="table-col col-order">
              <text class="primary-text">{{ item.orderNo || item.id || '-' }}</text>
            </view>

            <view class="table-col col-type">
              <text class="plain-text">{{ getRepairType(item) }}</text>
            </view>

            <view class="table-col col-desc">
              <text class="desc-text">{{ getRepairDesc(item) || '暂无描述' }}</text>
            </view>

            <view class="table-col col-phone">
              <text class="plain-text">{{ getOwnerPhone(item) }}</text>
            </view>

            <view class="table-col col-address">
              <text class="desc-text">{{ getRepairAddress(item) }}</text>
            </view>

            <view class="table-col col-priority">
              <text class="status-pill" :class="getPriorityClass(item.priority)">
                {{ getPriorityText(item.priority) }}
              </text>
            </view>

            <view class="table-col col-time">
              <text class="minor-text">{{ formatTime(item.createTime) }}</text>
            </view>

            <view class="table-col col-actions row-actions">
              <button
                v-if="item.status === 'ASSIGNED'"
                class="row-btn primary"
                @click="handleStart(item.id)"
              >
                开始处理
              </button>
              <button
                v-else-if="item.status === 'PROCESSING'"
                class="row-btn secondary-warn"
                @click="openCompleteForm(item)"
              >
                提交完成
              </button>
              <text v-else class="minor-text">已完成</text>
            </view>
          </view>
        </view>

        <view v-if="taskList.length === 0" class="empty-state">
          <text>暂无{{ currentTabLabel }}的任务</text>
        </view>
      </view>

      <view v-if="showCompleteForm" class="detail-modal" @click="closeCompleteForm">
        <view class="detail-content worker-detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">提交处理结果</text>
            <button class="close-btn" @click="closeCompleteForm">关闭</button>
          </view>

          <view class="detail-body">
            <view class="detail-item">
              <text class="detail-label">工单号:</text>
              <text class="detail-value">{{ currentTask ? (currentTask.orderNo || currentTask.id) : '-' }}</text>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">处理结果:</text>
              <textarea
                v-model="completeForm.result"
                class="modal-textarea"
                maxlength="500"
                placeholder="请输入处理过程及结果描述"
              ></textarea>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">现场图片:</text>
              <view class="upload-grid">
                <view
                  v-for="(img, index) in completeForm.images"
                  :key="index"
                  class="upload-card"
                >
                  <image :src="img" class="upload-img" mode="aspectFill"></image>
                  <text class="upload-remove" @click="removeImage(index)">×</text>
                </view>
                <view v-if="completeForm.images.length < 3" class="upload-card upload-card-add" @click="chooseImage">
                  <text class="upload-plus">+</text>
                  <text class="upload-tip">添加图片</text>
                </view>
              </view>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="closeCompleteForm">取消</button>
              <button class="detail-btn primary" :disabled="submitting" @click="handleCompleteSubmit">提交完成</button>
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
      currentTab: 'ASSIGNED',
      submitting: false,
      taskList: [],
      tabs: [
        { label: '待处理', value: 'ASSIGNED', statusClass: 'tab-assigned' },
        { label: '进行中', value: 'PROCESSING', statusClass: 'tab-processing' },
        { label: '已完成', value: 'COMPLETED', statusClass: 'tab-completed' }
      ],
      showCompleteForm: false,
      currentTask: null,
      completeForm: {
        result: '',
        images: []
      }
    }
  },
  computed: {
    currentTabLabel() {
      const tab = this.tabs.find(item => item.value === this.currentTab)
      return tab ? tab.label : ''
    }
  },
  onLoad() {
    this.loadTasks()
  },
  onShow() {
    this.loadTasks()
  },
  methods: {
    async loadTasks() {
      this.loading = true
      try {
        const res = await request('/api/workorder/list', {
          params: {
            status: this.currentTab
          }
        }, 'GET')
        const data = res.data || res
        const list = data.records || data || []
        this.taskList = Array.isArray(list)
          ? list.slice().sort((a, b) => {
              const diff = this.getPriorityRank(b.priority) - this.getPriorityRank(a.priority)
              if (diff !== 0) return diff
              return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime()
            })
          : []
      } catch (error) {
        console.error('加载任务失败', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    switchTab(tab) {
      if (this.currentTab === tab) return
      this.currentTab = tab
      this.loadTasks()
    },
    getPriorityText(priority) {
      const map = {
        LOW: '低',
        MEDIUM: '中',
        HIGH: '高',
        URGENT: '紧急',
        '1': '低',
        '2': '中',
        '3': '高',
        '4': '紧急'
      }
      return map[String(priority).toUpperCase()] || priority || '低'
    },
    getPriorityClass(priority) {
      if (!priority) return 'priority-low'
      const map = {
        LOW: 'priority-low',
        '1': 'priority-low',
        MEDIUM: 'priority-medium',
        '2': 'priority-medium',
        HIGH: 'priority-high',
        '3': 'priority-high',
        URGENT: 'priority-urgent',
        '4': 'priority-urgent'
      }
      return map[String(priority).toUpperCase()] || 'priority-low'
    },
    getPriorityRank(priority) {
      const map = {
        LOW: 1,
        '1': 1,
        MEDIUM: 2,
        '2': 2,
        HIGH: 3,
        '3': 3,
        URGENT: 4,
        '4': 4
      }
      return map[String(priority).toUpperCase()] || 1
    },
    getRepairDesc(item) {
      if (!item) return ''
      const desc = (item.repairInfo && item.repairInfo.faultDesc) ||
        item.faultDesc ||
        item.repairFaultDesc ||
        item.repairDesc ||
        (item.repair && item.repair.faultDesc)
      if (desc) return desc
      if (item.repairId) return `报修ID: ${item.repairId}`
      return ''
    },
    getRepairType(item) {
      if (!item) return '未知'
      return (item.repairInfo && item.repairInfo.faultType) ||
        item.faultType ||
        item.repairFaultType ||
        item.repairType ||
        (item.repair && item.repair.faultType) ||
        '未知'
    },
    getOwnerPhone(item) {
      if (!item) return '未知'
      return (item.repairInfo && item.repairInfo.ownerPhone) ||
        item.ownerPhone ||
        item.userPhone ||
        item.phone ||
        item.repairUserPhone ||
        (item.repair && (item.repair.ownerPhone || item.repair.userPhone || item.repair.phone)) ||
        '未知'
    },
    getRepairAddress(item) {
      if (!item) return '地点未知'
      return (item.repairInfo && item.repairInfo.address) ||
        item.address ||
        item.repairAddress ||
        (item.repair && item.repair.address) ||
        item.location ||
        '社区内'
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
      return `${year}-${month}-${day} ${hour}:${minute}`
    },
    async handleStart(orderId) {
      try {
        await request(`/api/workorder/worker/start?orderId=${orderId}`, {}, 'POST')
        uni.showToast({ title: '已开始处理', icon: 'success' })
        this.loadTasks()
      } catch (error) {
        console.error('开始处理失败', error)
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    openCompleteForm(task) {
      this.currentTask = task
      this.completeForm = {
        result: '',
        images: []
      }
      this.showCompleteForm = true
    },
    closeCompleteForm() {
      this.showCompleteForm = false
      this.currentTask = null
    },
    chooseImage() {
      uni.chooseImage({
        count: 3 - this.completeForm.images.length,
        success: (res) => {
          this.completeForm.images = this.completeForm.images.concat(res.tempFilePaths || []).slice(0, 3)
        }
      })
    },
    removeImage(index) {
      this.completeForm.images.splice(index, 1)
    },
    async handleCompleteSubmit() {
      if (!this.completeForm.result.trim()) {
        uni.showToast({ title: '请输入处理结果', icon: 'none' })
        return
      }
      if (!this.currentTask || !this.currentTask.id) {
        uni.showToast({ title: '未找到任务信息', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await request('/api/workorder/worker/complete', {
          data: {
            orderId: this.currentTask.id,
            result: this.completeForm.result,
            images: this.completeForm.images.join(',')
          }
        }, 'POST')
        uni.showToast({ title: '提交成功', icon: 'success' })
        this.closeCompleteForm()
        this.loadTasks()
      } catch (error) {
        console.error('提交失败', error)
        uni.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped src="../../styles/admin-table-page.css"></style>
<style scoped>
.worker-status-bar {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.status-summary-card.tab-assigned {
  background: linear-gradient(180deg, #fff 0%, #eef5ff 100%);
}

.status-summary-card.tab-processing {
  background: linear-gradient(180deg, #fff 0%, #fff8e6 100%);
}

.status-summary-card.tab-completed {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.worker-table {
  grid-template-columns: 220rpx 180rpx 260rpx 180rpx 260rpx 140rpx 200rpx 180rpx;
  min-width: 1900rpx;
}

.status-pill.priority-low {
  background: #edf9f1;
  color: #2d8c59;
}

.status-pill.priority-medium {
  background: #fff8e6;
  color: #cd8b1d;
}

.status-pill.priority-high {
  background: #fff1f3;
  color: #c44859;
}

.status-pill.priority-urgent {
  background: #e95a6c;
  color: #fff;
}

.worker-detail-content {
  max-width: 900rpx;
}

.upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
}

.upload-card {
  position: relative;
  width: 168rpx;
  height: 168rpx;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid #dce6f2;
  background: #f7faff;
}

.upload-card-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.upload-img {
  width: 100%;
  height: 100%;
}

.upload-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 34rpx;
  border-radius: 50%;
  background: rgba(18, 34, 53, 0.6);
  color: #fff;
  text-align: center;
  font-size: 28rpx;
}

.upload-plus {
  font-size: 44rpx;
  color: #6582a0;
}

.upload-tip {
  font-size: 22rpx;
  color: #8797aa;
}
</style>
