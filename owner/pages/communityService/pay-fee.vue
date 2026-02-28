<template>
  <view class="container">
    <!-- 待缴账单 -->
    <view class="section">
      <view class="section-title">待缴费用</view>
      <view v-if="unpaidBills.length === 0" class="empty-tip">暂无待缴费用</view>
      <view class="bill-list">
        <view class="bill-item" v-for="item in unpaidBills" :key="item.id">
          <view class="bill-header">
            <text class="bill-name">{{ item.feeType || item.feeName || item.fee_name || item.title || '物业费' }}</text>
            <text class="bill-amount">¥{{ item.feeAmount || item.amount || item.payAmount || item.totalAmount || 0 }}</text>
          </view>
          <view class="bill-info">
            <!-- 修复：不再重复显示费用名称，因为表头已经显示了 -->
            <text>计费周期：{{ item.feeCycle || item.fee_cycle || item.period }}</text>
            <text>截止日期：{{ item.dueDate || item.due_date || item.deadline }}</text>
          </view>
          <!-- 调试信息：正式发布请删除 -->
          <!-- <view style="font-size: 10px; color: #999;">ID: {{item.id}}</view> -->
          <button class="pay-btn" @click="handlePay(item)">立即缴费</button>
        </view>
      </view>
    </view>

    <!-- 历史账单 -->
    <view class="section history">
      <view class="section-title">历史账单</view>
      <view class="bill-list">
        <view class="bill-item history-item" v-for="item in historyBills" :key="item.id">
          <view class="bill-header">
            <text class="bill-name">{{ item.feeType || item.feeName || item.fee_name || item.title || '物业费' }}</text>
            <text class="bill-amount">¥{{ item.payAmount || item.amount || item.pay_amount || 0 }}</text>
          </view>
          <view class="bill-info">
          
            <text>缴费时间：{{ item.payTime || item.pay_time }}</text>
            <text>支付方式：{{ item.payType || item.pay_type || item.payMethod }}</text>
            <text>计费周期：{{ item.feeCycle || item.fee_cycle || item.period }}</text>
          </view>
          <view class="status-bar">
            <text class="status-tag">已缴费</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      unpaidBills: [],
      historyBills: []
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    loadData() {
      this.fetchUnpaidBills()
      this.fetchHistoryBills()
    },
    async fetchUnpaidBills() {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        const userId = userInfo?.id || userInfo?.userId
        if (!userId) return

        const res = await request({
          url: '/api/fee/unpaid',
          method: 'GET',
          params: { userId }
        })
        console.log('【DEBUG】待缴账单数据:', JSON.stringify(res)) // 打印日志以便排查
        this.unpaidBills = res || []
      } catch (e) {
        console.error('获取待缴账单失败', e)
      }
    },
    async fetchHistoryBills() {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        const userId = userInfo?.id || userInfo?.userId
        if (!userId) return

        // 不传递 startTime 和 endTime，后端会查所有
        const res = await request({
          url: '/api/fee/history',
          method: 'GET',
          params: { userId }
        })
        // 兼容处理：后端可能返回分页对象或直接返回列表
        this.historyBills = Array.isArray(res) ? res : (res.records || [])
      } catch (e) {
        console.error('获取历史账单失败', e)
      }
    },
    handlePay(item) {
      uni.showActionSheet({
        itemList: ['微信支付', '支付宝支付'],
        success: async (res) => {
          const payMethod = res.tapIndex === 0 ? 'wechat' : 'alipay'
          try {
            uni.showLoading({ title: '支付中...' })
            const userInfo = uni.getStorageSync('userInfo')
            const userId = userInfo?.id || userInfo?.userId
            if (!userId) {
              uni.hideLoading()
              return uni.showToast({ title: '用户未登录', icon: 'none' })
            }

            // 手动拼接 userId 到 URL 上，确保后端能收到 @RequestParam 参数
            await request(`/api/fee/pay?userId=${userId}`, {
              feeId: item.feeId, // 【修复点1】后端返回的是 feeId，不是 id
              payType: payMethod 
            }, 'PUT')
            
            uni.hideLoading()
            uni.showToast({ title: '支付成功', icon: 'success' })
            // 刷新数据，重新获取待缴和历史账单
            // 注意：因为后端可能存在主从延迟或事务提交延迟，稍微延迟一点再刷新
            setTimeout(() => {
              this.loadData()
            }, 500)
          } catch (e) {
            uni.hideLoading()
            uni.showToast({ title: '支付失败', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.container {
  padding: 30rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}
.section {
  margin-bottom: 40rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  padding-left: 10rpx;
  border-left: 8rpx solid #2D81FF;
}
.bill-item {
  background: white;
  border-radius: 15rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}
.bill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.bill-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.bill-amount {
  font-size: 32rpx;
  color: #ff4757;
  font-weight: bold;
}
.bill-info {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}
.bill-info text {
  display: block;
}
.pay-btn {
  margin-top: 20rpx;
  background: #2D81FF;
  color: white;
  font-size: 28rpx;
  border-radius: 40rpx;
}
.history-item {
  position: relative;
  opacity: 0.8;
}
.status-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx dashed #f0f0f0;
}
.status-tag {
  color: #2ed573;
  font-size: 24rpx;
  border: 1rpx solid #2ed573;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.empty-tip {
  text-align: center;
  color: #999;
  padding: 40rpx;
}
</style>
