<template>
  <view class="page">

    <!-- 顶部余额卡片 -->
    <view class="balance-card">
      <view>
        <text class="balance-title">停车账户余额</text>
        <text class="balance-amount">
          余额：
          <text class="highlight">{{ summary.balance }} 元</text>
        </text>
      </view>
      <button class="btn primary small-btn" @click="goRecharge">
        去充值
      </button>
    </view>

    <!-- 我的车位 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">我的车位</text>
      </view>

      <view
        v-for="car in cars"
        :key="car.id"
        class="car-card"
        @click="goSpaceDetail(car)"
      >
        <view class="car-card-header">
          <text class="plate">{{ car.slot }}</text>
          <text
            class="car-status"
            :class="car.active ? 'status-on' : 'status-off'"
          >
            {{ car.statusText }}
          </text>
        </view>

        <view class="car-card-body">
          <view class="row">
            <text class="label">车位类型</text>
            <text class="value">
              {{ car.leaseType === 'MONTHLY' ? '月卡' :
                 car.leaseType === 'YEARLY' ? '年卡' : '永久' }}
            </text>
          </view>

          <view class="row">
            <text class="label">有效期</text>
            <text class="value">{{ car.expire }}</text>
          </view>

          <view class="row">
            <text class="label">所属小区</text>
            <text class="value">{{ car.communityName }}</text>
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
      summary: {
        balance: 0
      },
      cars: [],
      userInfo: {}
    }
  },

  onLoad() {
    this.loadUser()
    this.loadCars()
  },
  onShow() {
    this.loadBalance()
  },

  methods: {
    loadUser() {
      const user = uni.getStorageSync('userInfo')
      if (!user || !user.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      this.userInfo = user
    },

    // 查询我的车位
    async loadCars() {
      try {
        const list = await request.get('/api/parking/space/my')

        const format = (t) => {
          if (!t) return '长期有效'
          const d = new Date(t)
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }

        this.cars = list.map(item => ({
          id: item.id,
          slot: item.slot,
          communityName: item.communityName,
        
          leaseType: item.leaseType,
          leaseStartTime: item.leaseStartTime,
          leaseEndTime: item.leaseEndTime,
        
          expire: item.leaseEndTime
            ? `${format(item.leaseStartTime)} ~ ${format(item.leaseEndTime)}`
            : `${format(item.leaseStartTime)} 起（永久）`,
        
          active: item.leaseStatus === 'ACTIVE',
          statusText: item.statusText,
        
          // 🔹 新增车牌字段
          plateNo: item.plateNo || ''
        }))
      } catch (e) {
        console.error(e)
        uni.showToast({ title: '获取车位失败', icon: 'none' })
      }
    },

    // 查询余额
    async loadBalance() {
      try {
        const balance = await request.get('/api/parking/account/balance')
        this.summary.balance = balance
      } catch (e) {
        uni.showToast({ title: '获取余额失败', icon: 'none' })
      }
    },

    // 跳转充值页面
    goRecharge() {
      uni.navigateTo({
        url: '/pages/parking/recharge'
      })
    },

    // 跳转车位详情页
    goSpaceDetail(car) {
      uni.navigateTo({
        url: '/pages/parking/space-detail',
        success(res) {
          // 🔴 关键：把 car 传给详情页
          res.eventChannel.emit('carDetail', car)
        }
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 32rpx 28rpx 120rpx;
  background: #f5f6fa;
}

/* 顶部余额卡片 */
.balance-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #5ba8ff, #386bff);
  color: #fff;
  margin-bottom: 32rpx;
}
.balance-title { font-size: 30rpx; font-weight: 600; }
.balance-amount { font-size: 28rpx; margin-top: 8rpx; }
.highlight { color: #ffbf00; font-weight: 600; }

.btn.primary.small-btn {
  background-color: #fff;
  color: #386bff;
  padding: 8rpx 24rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
}

/* 我的车辆 */
.section { background: #fff; border-radius: 24rpx; padding: 28rpx; margin-bottom: 24rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #1f2430; }
.section-link { font-size: 26rpx; color: #2d81ff; }

.car-card { background: #f6f8ff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 20rpx; }
.car-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.plate { font-size: 28rpx; font-weight: 600; }
.car-status.status-on { color: #00c851; font-weight: 600; }
.car-status.status-off { color: #ff4444; font-weight: 600; }
.car-card-body .row { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.label { color: #7a7e8a; font-size: 24rpx; }
.value { font-size: 26rpx; color: #1f2430; }
.car-card-footer { display: flex; gap: 24rpx; }
.btn.ghost { background: #fff; border: 1rpx solid #386bff; color: #386bff; border-radius: 16rpx; padding: 12rpx 32rpx; }
.btn.primary { background-color: #386bff; color: #fff; padding: 12rpx 32rpx; border-radius: 16rpx; }
</style>