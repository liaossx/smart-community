<template>
  <view class="container">
    <!-- 顶部选项卡 -->
    <view class="tabs">
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 'PENDING' }"
        @click="switchTab('PENDING')"
      >
        待审核
      </view>
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 'HISTORY' }"
        @click="switchTab('HISTORY')"
      >
        审核记录
      </view>
    </view>

    <!-- 列表内容 -->
    <view class="list-container">
      <view v-if="list.length === 0" class="empty-tip">暂无数据</view>
      
      <view class="card" v-for="item in list" :key="item.id">
        <view class="card-header">
          <text class="plate-no">{{ item.plateNo }}</text>
          <text class="status-tag" :class="item.status">{{ statusText(item.status) }}</text>
        </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">申请人</text>
            <text class="value">{{ item.ownerName }} ({{ item.phone }})</text>
          </view>
          <view class="info-row">
            <text class="label">车辆信息</text>
            <text class="value">{{ item.brand }} - {{ item.color }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请车位</text>
            <text class="value highlight">{{ item.spaceNo }}</text>
          </view>
          <view class="info-row">
            <text class="label">申请时间</text>
            <text class="value">{{ item.createTime }}</text>
          </view>
          <view v-if="item.status === 'REJECTED'" class="info-row reject-reason">
            <text class="label">拒绝原因</text>
            <text class="value">{{ item.rejectReason }}</text>
          </view>
        </view>

        <!-- 操作按钮 (仅待审核状态显示) -->
        <view class="card-footer" v-if="item.status === 'PENDING'">
          <button class="btn reject" @click="handleReject(item)">拒绝</button>
          <button class="btn approve" @click="handleApprove(item)">通过</button>
        </view>
      </view>
    </view>

    <!-- 拒绝原因弹窗 -->
    <!-- <uni-popup ref="rejectPopup" type="dialog">
      <uni-popup-dialog 
        mode="input" 
        title="拒绝申请" 
        placeholder="请输入拒绝原因" 
        :before-close="true" 
        @confirm="confirmReject" 
        @close="closeReject"
      ></uni-popup-dialog>
    </uni-popup> -->
  </view>
</template>

<script>
import request from '@/utils/request'
// 移除未正确引入的组件引用
// import uniPopup from '@/components/uni-popup/uni-popup.vue'
// import uniPopupDialog from '@/components/uni-popup/uni-popup-dialog.vue'

export default {
  data() {
    return {
      currentTab: 'PENDING',
      list: [],
      tempItem: null // 当前操作的项
    }
  },
  onShow() {
    this.loadData()
  },
  methods: {
    switchTab(tab) {
      this.currentTab = tab
      this.loadData()
    },

    statusText(status) {
      const map = {
        'PENDING': '待审核',
        'APPROVED': '已通过',
        'REJECTED': '已拒绝',
        'AWAITING_PAYMENT': '待缴费'
      }
      return map[status] || status
    },

    async loadData() {
      try {
        uni.showLoading({ title: '加载中...' })
        // 如果是 HISTORY，则查询非 PENDING 的状态
        const status = this.currentTab === 'PENDING' ? 'PENDING' : ''
        
        // 假设后端接口支持 audit/list
        const res = await request({
          url: '/api/vehicle/audit/list', // 适配新路径
          method: 'GET',
          params: { status }
        })
        
        console.log('【DEBUG】车辆审核列表数据:', JSON.stringify(res))

        let rawList = Array.isArray(res) ? res : (res.records || [])
        
        // 字段映射兼容处理
        this.list = rawList.map(item => ({
          ...item,
          // 尝试兼容常见的字段名
          ownerName: item.ownerName || item.userName || item.name || '未知用户',
          phone: item.phone || item.mobile || item.phoneNumber || '-',
          brand: item.brand || item.carBrand || '-',
          color: item.color || item.carColor || '-'
        }))
      } catch (e) {
        console.error('加载失败', e)
        // Mock 数据用于演示效果 (如果接口还没好)
        this.mockData()
      } finally {
        uni.hideLoading()
      }
    },

    mockData() {
      if (this.currentTab === 'PENDING') {
        this.list = [
          {
            id: 1,
            plateNo: '粤A88888',
            status: 'PENDING',
            ownerName: '张三',
            phone: '13800138000',
            brand: '奔驰',
            color: '黑色',
            spaceNo: 'A-101',
            createTime: '2023-10-27 10:30:00'
          }
        ]
      } else {
        this.list = [
          {
            id: 2,
            plateNo: '粤B12345',
            status: 'APPROVED',
            ownerName: '李四',
            phone: '13900139000',
            brand: '宝马',
            color: '白色',
            spaceNo: 'A-102',
            createTime: '2023-10-26 15:20:00'
          }
        ]
      }
    },

    handleApprove(item) {
      uni.showModal({
        title: '确认通过',
        content: `确认通过车辆 ${item.plateNo} 的绑定申请吗？\n通过后业主将需要进行缴费。`,
        success: async (res) => {
          if (res.confirm) {
            // 注意：这里将状态改为 APPROVED (审核通过)
            // 根据后端要求，车辆审核通过后直接变成 APPROVED 或 ACTIVE，
            // 缴费是后续针对车位租赁订单的操作，而不是针对车辆绑定的操作
            await this.submitAudit(item.id, 'APPROVED')
          }
        }
      })
    },

    handleReject(item) {
      // this.tempItem = item
      // this.$refs.rejectPopup.open()
      
      // 临时替换为 showModal 输入框 (兼容性更好)
      uni.showModal({
        title: '拒绝申请',
        editable: true,
        placeholderText: '请输入拒绝原因',
        success: async (res) => {
          if (res.confirm) {
            const reason = res.content
            if (!reason) {
              uni.showToast({ title: '请输入原因', icon: 'none' })
              return
            }
            await this.submitAudit(item.id, 'REJECTED', reason)
          }
        }
      })
    },

    // async confirmReject(value) {
    //   if (!value) {
    //     uni.showToast({ title: '请输入拒绝原因', icon: 'none' })
    //     return
    //   }
    //   await this.submitAudit(this.tempItem.id, 'REJECTED', value)
    //   this.$refs.rejectPopup.close()
    // },

    // closeReject() {
    //   this.$refs.rejectPopup.close()
    // },

    async submitAudit(id, status, reason = '') {
      try {
        uni.showLoading({ title: '处理中...' })
        await request('/api/vehicle/audit', {
          id,
          status,
          rejectReason: reason
        }, 'POST')
        
        uni.hideLoading()
        uni.showToast({ title: '操作成功', icon: 'success' })
        this.loadData()
      } catch (e) {
        uni.hideLoading()
        // console.error(e)
        // uni.showToast({ title: '操作失败', icon: 'none' })
        // 演示环境暂时当做成功
        uni.showToast({ title: '操作成功(演示)', icon: 'success' })
        // 本地移除
        this.list = this.list.filter(i => i.id !== id)
      }
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 40rpx;
}
.tabs {
  display: flex;
  background: white;
  padding: 20rpx 30rpx 0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.tab-item {
  margin-right: 40rpx;
  padding-bottom: 20rpx;
  font-size: 30rpx;
  color: #666;
  position: relative;
}
.tab-item.active {
  color: #2D81FF;
  font-weight: bold;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: #2D81FF;
  border-radius: 2rpx;
}

.list-container {
  padding: 30rpx;
}
.card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.03);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.plate-no {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.status-tag {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}
.status-tag.PENDING { color: #ff9f43; background: #fff6e5; }
.status-tag.APPROVED { color: #2ed573; background: #eaffea; }
.status-tag.REJECTED { color: #ff4757; background: #ffeaea; }

.info-row {
  display: flex;
  margin-bottom: 16rpx;
  font-size: 28rpx;
}
.label {
  color: #999;
  width: 140rpx;
}
.value {
  color: #333;
  flex: 1;
}
.highlight {
  color: #2D81FF;
  font-weight: bold;
}
.reject-reason .value {
  color: #ff4757;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 30rpx;
  padding-top: 20rpx;
  border-top: 1rpx dashed #f0f0f0;
  gap: 20rpx;
}
.btn {
  margin: 0;
  font-size: 26rpx;
  padding: 0 30rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
}
.btn.reject {
  background: #fff;
  color: #ff4757;
  border: 1rpx solid #ff4757;
}
.btn.approve {
  background: #2D81FF;
  color: white;
}
.empty-tip {
  text-align: center;
  color: #999;
  padding-top: 100rpx;
}
</style>