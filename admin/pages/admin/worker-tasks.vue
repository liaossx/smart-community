<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="任务中心"
    currentPage="/admin/pages/admin/worker-tasks"
  >
    <view class="worker-container">
      <!-- 顶部状态切换 -->
      <view class="tab-bar">
        <view 
          v-for="tab in tabs" 
          :key="tab.value" 
          class="tab-item" 
          :class="{ active: currentTab === tab.value }"
          @click="switchTab(tab.value)"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <view class="tab-line" v-if="currentTab === tab.value"></view>
        </view>
      </view>

      <!-- 任务列表 -->
      <scroll-view scroll-y class="list-container">
        <view v-for="item in taskList" :key="item.id" class="task-card">
          <view class="task-header">
          <text class="task-id">工单号: {{ item.orderNo || item.id }}</text>
          <text :class="['priority-badge', getPriorityClass(item.priority)]">
            {{ getPriorityText(item.priority) }}
          </text>
        </view>
          <view class="task-body">
            <view class="info-item">
              <text class="label">报修类型:</text>
              <text class="value">{{ getRepairType(item) }}</text>
            </view>
            <view class="info-item" v-if="getRepairDesc(item)">
              <text class="label">报修内容:</text>
              <text class="value">{{ getRepairDesc(item) }}</text>
            </view>
            <view class="info-item">
              <text class="label">用户手机:</text>
              <text class="value">{{ getOwnerPhone(item) }}</text>
            </view>
            <view class="info-item">
              <text class="label">报修地点:</text>
              <text class="value">{{ getRepairAddress(item) }}</text>
            </view>
            <view class="info-item">
              <text class="label">创建时间:</text>
              <text class="value">{{ formatTime(item.createTime) }}</text>
            </view>
          </view>
          
          <!-- 操作按钮 -->
          <view class="task-footer">
            <button 
              v-if="item.status === 'ASSIGNED'" 
              class="btn-start" 
              @click="handleStart(item.id)"
            >开始处理</button>
            
            <button 
              v-if="item.status === 'PROCESSING'" 
              class="btn-complete" 
              @click="openCompleteForm(item)"
            >提交完成</button>
            
            <text v-if="item.status === 'COMPLETED'" class="completed-text">已完成</text>
          </view>
        </view>
        
        <view v-if="taskList.length === 0" class="empty-state">
          <image src="/static/logo.png" class="empty-img"></image>
          <text>暂无{{ currentTabLabel }}的任务</text>
        </view>
      </scroll-view>

      <!-- 完成表单弹窗 -->
      <view v-if="showCompleteForm" class="form-mask" @click="closeCompleteForm">
        <view class="form-container" @click.stop>
          <view class="form-header">
            <text class="form-title">提交处理结果</text>
            <text class="form-close" @click="closeCompleteForm">×</text>
          </view>
          <view class="form-body">
            <view class="form-item">
              <text class="form-label">处理结果描述</text>
              <textarea 
                v-model="completeForm.result" 
                placeholder="请输入处理过程及结果描述..." 
                class="form-textarea"
              />
            </view>
            <view class="form-item">
              <text class="form-label">现场图片</text>
              <view class="upload-container">
                <view v-for="(img, index) in completeForm.images" :key="index" class="upload-item">
                  <image :src="img" class="upload-img" mode="aspectFill"></image>
                  <text class="img-remove" @click="removeImage(index)">×</text>
                </view>
                <view v-if="completeForm.images.length < 3" class="upload-btn" @click="chooseImage">
                  <text class="upload-icon">+</text>
                </view>
              </view>
            </view>
          </view>
          <view class="form-footer">
            <button class="btn-submit" @click="handleCompleteSubmit" :loading="submitting">提交完成</button>
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
      currentTab: 'ASSIGNED',
      submitting: false,
      taskList: [],
      tabs: [
        { label: '待处理', value: 'ASSIGNED' },
        { label: '进行中', value: 'PROCESSING' },
        { label: '已完成', value: 'COMPLETED' }
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
      const tab = this.tabs.find(t => t.value === this.currentTab)
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
      console.log('--- 开始加载任务 ---')
      console.log('当前标签:', this.currentTab)
      const userInfo = uni.getStorageSync('userInfo')
      console.log('当前登录用户信息:', userInfo)
      
      try {
        const res = await request('/api/workorder/list', {
          params: {
            status: this.currentTab
          }
        }, 'GET')
        
        console.log('API 请求 URL: /api/workorder/list')
        console.log('API 响应原始数据:', res)
        
        const data = res.data || res
        console.log('解析后的数据对象:', data)
        
        const list = data.records || data || []
        this.taskList = list.slice().sort((a, b) => {
          const diff = this.getPriorityRank(b.priority) - this.getPriorityRank(a.priority)
          if (diff !== 0) return diff
          return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime()
        })
        console.log('最终渲染的列表长度:', this.taskList.length)
        console.log('--- 加载任务结束 ---')
      } catch (e) {
        console.error('加载任务失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    switchTab(tab) {
      this.currentTab = tab
      this.loadTasks()
    },
    getPriorityText(p) {
      const map = { 
        'LOW': '低', 
        'MEDIUM': '中', 
        'HIGH': '高', 
        'URGENT': '紧急',
        '1': '低',
        '2': '中',
        '3': '高',
        '4': '紧急'
      }
      return map[String(p)] || p || '低'
    },
    getPriorityClass(p) {
      if (!p) return 'priority-low'
      const pStr = String(p).toUpperCase()
      const classMap = {
        'LOW': 'priority-low',
        '1': 'priority-low',
        'MEDIUM': 'priority-medium',
        '2': 'priority-medium',
        'HIGH': 'priority-high',
        '3': 'priority-high',
        'URGENT': 'priority-urgent',
        '4': 'priority-urgent'
      }
      return classMap[pStr] || ('priority-' + pStr.toLowerCase())
    },
    getPriorityRank(p) {
      const pStr = String(p).toUpperCase()
      const map = {
        'LOW': 1,
        '1': 1,
        'MEDIUM': 2,
        '2': 2,
        'HIGH': 3,
        '3': 3,
        'URGENT': 4,
        '4': 4
      }
      return map[pStr] || 1
    },
    getRepairDesc(item) {
      if (!item) return ''
      const desc =
        (item.repairInfo && item.repairInfo.faultDesc) ||
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
      const type =
        (item.repairInfo && item.repairInfo.faultType) ||
        item.faultType ||
        item.repairFaultType ||
        item.repairType ||
        (item.repair && item.repair.faultType)
      if (type) return type
      return '未知'
    },
    getOwnerPhone(item) {
      if (!item) return '未知'
      const phone =
        (item.repairInfo && item.repairInfo.ownerPhone) ||
        item.ownerPhone ||
        item.userPhone ||
        item.phone ||
        item.repairUserPhone ||
        (item.repair && (item.repair.ownerPhone || item.repair.userPhone || item.repair.phone))
      if (phone) return phone
      return '未知'
    },
    getRepairAddress(item) {
      if (!item) return '地点未知'
      const address =
        (item.repairInfo && item.repairInfo.address) ||
        item.address ||
        item.repairAddress ||
        (item.repair && item.repair.address) ||
        item.location
      if (address) return address
      return '社区内'
    },
    formatTime(t) {
      if (!t) return '-'
      const date = new Date(t)
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
    },
    async handleStart(orderId) {
      try {
        await request(`/api/workorder/worker/start?orderId=${orderId}`, {}, 'POST')
        uni.showToast({ title: '已开始处理', icon: 'success' })
        this.loadTasks()
      } catch (e) {
        console.error('操作失败', e)
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    openCompleteForm(task) {
      this.currentTask = task
      this.completeForm.result = ''
      this.completeForm.images = []
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
          this.completeForm.images = [...this.completeForm.images, ...res.tempFilePaths]
        }
      })
    },
    removeImage(index) {
      this.completeForm.images.splice(index, 1)
    },
    async handleCompleteSubmit() {
      if (!this.completeForm.result) {
        uni.showToast({ title: '请输入处理结果', icon: 'none' })
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
      } catch (e) {
        console.error('提交失败', e)
        uni.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.worker-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.tab-bar {
  display: flex;
  background: #fff;
  height: 90rpx;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tab-text {
  font-size: 30rpx;
  color: #666;
}

.tab-item.active .tab-text {
  color: #2D81FF;
  font-weight: bold;
}

.tab-line {
  position: absolute;
  bottom: 0;
  width: 60rpx;
  height: 6rpx;
  background: #2D81FF;
  border-radius: 3rpx;
}

.list-container {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.task-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.05);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.task-id {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.priority-badge {
  font-size: 22rpx;
  padding: 2rpx 12rpx;
  border-radius: 4rpx;
}

.priority-low { background: #e8f5e9; color: #4caf50; }
.priority-medium { background: #fff3e0; color: #ff9800; }
.priority-high { background: #ffebee; color: #f44336; }
.priority-urgent { background: #f44336; color: #fff; }

.task-body {
  padding: 10rpx 0;
}

.info-item {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 26rpx;
}

.label {
  color: #999;
  width: 140rpx;
}

.value {
  color: #444;
  flex: 1;
}

.task-footer {
  margin-top: 30rpx;
  display: flex;
  justify-content: flex-end;
  border-top: 1rpx solid #f0f0f0;
  padding-top: 20rpx;
}

.btn-start, .btn-complete {
  margin: 0;
  height: 70rpx;
  line-height: 70rpx;
  padding: 0 40rpx;
  font-size: 28rpx;
  border-radius: 35rpx;
  color: #fff;
}

.btn-start { background: #2D81FF; }
.btn-complete { background: #4caf50; }

.completed-text {
  font-size: 26rpx;
  color: #999;
}

.empty-state {
  padding-top: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #999;
}

.empty-img {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 20rpx;
  opacity: 0.5;
}

/* Form Styles */
.form-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.form-container {
  background: #fff;
  width: 100%;
  border-radius: 30rpx 30rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.form-header {
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #eee;
}

.form-title {
  font-size: 32rpx;
  font-weight: bold;
}

.form-close {
  font-size: 44rpx;
  color: #999;
}

.form-body {
  padding: 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.form-textarea {
  width: 100%;
  height: 200rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
}

.upload-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.upload-item, .upload-btn {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  position: relative;
}

.upload-img {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
}

.img-remove {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border-radius: 50%;
  text-align: center;
  line-height: 32rpx;
  font-size: 30rpx;
}

.upload-btn {
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx dashed #ccc;
}

.upload-icon {
  font-size: 60rpx;
  color: #999;
}

.form-footer {
  padding: 30rpx;
}

.btn-submit {
  background: #2D81FF;
  color: #fff;
  height: 90rpx;
  line-height: 90rpx;
  border-radius: 45rpx;
  font-size: 32rpx;
}
</style>
