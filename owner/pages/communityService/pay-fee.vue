<template>
  <view class="container">
    <!-- 待缴账单 -->
    <view class="section">
      <view class="section-title">待缴费用</view>
      <view v-if="unpaidBills.length === 0" class="empty-tip">暂无待缴费用</view>
      <view class="bill-list">
        <view class="bill-item" v-for="item in unpaidBills" :key="item.id">
          <view class="bill-header">
            <text class="bill-name">{{ item.feeName }}</text>
            <text class="bill-amount">¥{{ item.amount }}</text>
          </view>
          <view class="bill-info">
            <text>计费周期：{{ item.period }}</text>
            <text>截止日期：{{ item.deadline }}</text>
          </view>
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
            <text class="bill-name">{{ item.feeName }}</text>
            <text class="bill-amount">¥{{ item.amount }}</text>
          </view>
          <view class="bill-info">
            <text>缴费时间：{{ item.payTime }}</text>
            <text>支付方式：{{ item.payMethod }}</text>
          </view>
          <text class="status-tag">已缴费</text>
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
        const res = await request.get('/api/fee/unpaid')
        this.unpaidBills = res || []
      } catch (e) {
        console.error('获取待缴账单失败', e)
      }
    },
    async fetchHistoryBills() {
      try {
        const res = await request.get('/api/fee/history')
        this.historyBills = res || []
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
            await request('/api/fee/pay', {
              id: item.id,
              payMethod: payMethod
            }, 'POST')
            
            uni.hideLoading()
            uni.showToast({ title: '支付成功', icon: 'success' })
            // 刷新数据
            this.loadData()
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
.status-tag {
  position: absolute;
  top: 30rpx;
  right: 30rpx;
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
