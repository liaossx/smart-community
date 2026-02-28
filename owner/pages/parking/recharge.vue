<template>
  <view class="page">

    <!-- 余额卡片 -->
    <view class="balance-card">
      <text class="title">账户余额</text>
      <text class="amount">{{ balance }} 元</text>
    </view>

    <!-- 快捷充值 -->
    <view class="section">
      <text class="section-title">快捷充值</text>

      <view class="amount-list">
        <view
          v-for="item in presetAmounts"
          :key="item"
          class="amount-item"
          :class="{ active: selectedAmount === item }"
          @click="selectAmount(item)"
        >
          {{ item }} 元
        </view>
      </view>
    </view>

    <!-- 自定义金额 -->
    <view class="section">
      <text class="section-title">自定义金额</text>
      <input
        type="number"
        v-model="customAmount"
        placeholder="请输入充值金额"
        class="amount-input"
      />
    </view>

    <!-- 充值按钮 -->
    <button class="btn primary" @click="doRecharge">
      立即充值
    </button>

  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      balance: 0,
      presetAmounts: [100, 200, 500],
      selectedAmount: null,
      customAmount: ''
    }
  },

  onLoad(options) {
    if (options.balance) {
      this.balance = Number(options.balance)
    }
    this.loadBalance()
  },

  methods: {
    selectAmount(amount) {
      this.selectedAmount = amount
      this.customAmount = ''
    },
    
    // 监听输入框
    onInput(e) {
      this.selectedAmount = null
    },

    // 查询余额
    async loadBalance() {
      try {
        const res = await request.get('/api/parking/account/balance')
        // 兼容处理：可能返回数字或对象
        if (typeof res === 'number') {
          this.balance = res
        } else if (res && typeof res.data === 'number') {
          this.balance = res.data
        }
      } catch (e) {
        console.error('获取余额失败', e)
      }
    },

    // 充值
    async doRecharge() {
      let amount = this.selectedAmount
      if (!amount && this.customAmount) {
        amount = Number(this.customAmount)
      }

      if (!amount || amount <= 0) {
        uni.showToast({ title: '请输入正确金额', icon: 'none' })
        return
      }

      try {
        uni.showLoading({ title: '充值中...' })
        // 调用充值接口
        await request('/api/parking/account/recharge', { 
          amount,
          userId: uni.getStorageSync('userInfo').id || uni.getStorageSync('userInfo').userId
        }, 'POST')

        uni.hideLoading()
        // 充值成功提示
        uni.showToast({ title: '充值成功', icon: 'success' })

        // 重置选择
        this.selectedAmount = null
        this.customAmount = ''

        // 立即刷新余额
        this.loadBalance()

      } catch (e) {
        uni.hideLoading()
        console.error('充值失败:', e)
        uni.showToast({ title: '充值失败', icon: 'none' })
      }
    }
  }
}
</script>

<style>
.page {
  padding: 20rpx;
}

.balance-card {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  border-radius: 20rpx;
  padding: 40rpx;
  color: #fff;
  margin-bottom: 30rpx;
}

.balance-card .title {
  font-size: 26rpx;
  opacity: 0.9;
}

.balance-card .amount {
  font-size: 48rpx;
  font-weight: bold;
  margin-top: 10rpx;
}

.section {
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 28rpx;
  margin-bottom: 16rpx;
  display: block;
}

.amount-list {
  display: flex;
  gap: 20rpx;
}

.amount-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
  border: 1px solid #ddd;
  font-size: 28rpx;
}

.amount-item.active {
  background-color: #4facfe;
  color: #fff;
  border-color: #4facfe;
}

.amount-input {
  border: 1px solid #ddd;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
}

.btn.primary {
  background-color: #4facfe;
  color: #fff;
  margin-top: 40rpx;
}
</style>