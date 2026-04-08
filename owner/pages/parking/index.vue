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
        <!-- 车辆绑定入口 -->
        <text class="section-link" @click="goBindCar">绑定车辆</text>
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
            :class="{
              'status-on': car.active,
              'status-off': !car.active && car.leaseStatus !== 'PENDING' && car.leaseStatus !== 'AWAITING_PAYMENT',
              'status-warn': car.leaseStatus === 'PENDING' || car.leaseStatus === 'AWAITING_PAYMENT'
            }"
          >
            {{ getStatusText(car) }}
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

        <!-- 底部续费操作栏 -->
        <view class="car-card-footer" v-if="!car.isPerpetual && car.leaseStatus !== 'PENDING' && car.leaseStatus !== 'REJECTED'">
          <button 
            v-if="car.leaseStatus === 'AWAITING_PAYMENT'" 
            class="btn primary small-btn" 
            @click.stop="handleFirstPay(car)"
          >
            去支付
          </button>
          <button 
            v-else 
            class="btn ghost small-btn" 
            @click.stop="handleRenew(car)"
          >
            办理续费
          </button>
        </view>
      </view>

    </view>

    <!-- 续费弹窗 -->
    <view class="custom-popup" v-if="showRenewPopup">
      <view class="popup-mask" @click="closeRenew"></view>
      <view class="popup-body">
        <view class="renew-panel">
          <view class="panel-header">
            <text class="panel-title">{{ isFirstPay ? '车位开通缴费' : '车位续费' }}</text>
            <text class="close-icon" @click="closeRenew">×</text>
          </view>
          
          <view class="panel-body" v-if="currentCar">
            <view class="info-item">
              <text class="label">车位号</text>
              <text class="value">{{ currentCar.slot }}</text>
            </view>
            
            <view class="option-title">选择时长</view>
            <view class="duration-options">
              <view 
                class="option-item" 
                v-for="opt in renewOptions" 
                :key="opt.months"
                :class="{ active: selectedDuration === opt.months }"
                @click="selectDuration(opt)"
              >
                <text class="opt-name">{{ opt.label }}</text>
                <text class="opt-price">¥{{ opt.price }}</text>
              </view>
            </view>

            <view class="pay-method">
              <view class="method-title">支付方式</view>
              <radio-group @change="onPayMethodChange">
                <label class="radio-label">
                  <radio value="BALANCE" checked color="#2D81FF" style="transform:scale(0.8)"/>
                  <text>余额支付 (剩余: {{ summary.balance }}元)</text>
                </label>
              </radio-group>
            </view>
          </view>

          <view class="panel-footer">
            <view class="total-price">
              总计: <text class="price-num">¥{{ currentPrice }}</text>
            </view>
            <button class="pay-btn" @click="confirmRenew">立即支付</button>
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
      userInfo: {},
      // 续费相关
      showRenewPopup: false,
      currentCar: null,
      selectedDuration: 1,
      currentPrice: 0,
      isFirstPay: false, // 是否为首次支付
      payMethod: 'BALANCE',
      renewOptions: [
        { label: '1个月', months: 1, price: 300 },
        { label: '3个月', months: 3, price: 850 }, // 优惠价
        { label: '1年', months: 12, price: 3000 }  // 优惠价
      ]
    }
  },

  onLoad() {
    this.loadUser()
  },
  onShow() {
    this.loadBalance()
    this.loadCars()
  },
  // 监听下拉刷新
  onPullDownRefresh() {
    Promise.all([this.loadBalance(), this.loadCars()]).finally(() => {
      uni.stopPullDownRefresh()
    })
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
        uni.showLoading({ title: '加载中...' })
        // 使用完整参数调用 request，避免 request.get 可能不存在的问题
        const res = await request({
          url: '/api/parking/space/my',
          method: 'GET'
        })
        
        // 兼容处理：可能直接返回List，也可能是分页对象，或者是 {data: [...]}
        // 如果后端返回空，则使用模拟数据
        let list = Array.isArray(res) ? res : (res.records || res.data || [])
        
        // --- 模拟数据开始 (如果接口没数据) ---
        if (!list || list.length === 0) {
          console.log('【DEBUG】使用模拟车位数据')
          // 这里不再注入模拟数据，因为用户已经确认是真实环境
          // list = [...] 
        }
        // --- 模拟数据结束 ---

        console.log('【DEBUG】我的车位数据:', JSON.stringify(list))

        const format = (t) => {
          if (!t) return '待定'
          const d = new Date(t)
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }

        this.cars = list.map(item => {
           // 如果没有 leaseStatus，尝试从 leaseEndTime 推断
             let status = item.leaseStatus;
             if (!status) {
                if (item.leaseType === 'PERPETUAL') {
                  status = 'ACTIVE';
                } else if (item.leaseEndTime) {
                  status = new Date(item.leaseEndTime) > new Date() ? 'ACTIVE' : 'EXPIRED';
                } else {
                  // 没有过期时间，视为新申请通过但未缴费
                  // 注意：如果后端返回的是 null/undefined，这里会强制转为 AWAITING_PAYMENT
                  // 如果后端确实返回了 PENDING，则保持 PENDING
                  status = 'AWAITING_PAYMENT';
                }
             }

             // 🔴 修复逻辑：如果是 AVAILABLE (可用)，说明还没被租用，其实就是待缴费/待开通
             if (status === 'AVAILABLE') {
                status = 'AWAITING_PAYMENT';
             }
 
           return {
             id: item.id,
             slot: item.slot,
             communityName: item.communityName,
           
             leaseType: item.leaseType,
             leaseStartTime: item.leaseStartTime,
             leaseEndTime: item.leaseEndTime,
           
             expire: item.leaseEndTime
               ? `${format(item.leaseStartTime)} ~ ${format(item.leaseEndTime)}`
               : (status === 'ACTIVE' ? '永久有效' : '待开通'),
           
             active: status === 'ACTIVE',
             statusText: item.statusText,
             leaseStatus: status,
           
             // 🔹 新增车牌字段
             plateNo: item.plateNo || '',
             isPerpetual: item.leaseType === 'PERPETUAL' // 永久车位不可续费
           }
        })
      } catch (e) {
        console.error(e)
        uni.showToast({ title: '获取车位失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    getStatusText(car) {
      if (car.leaseStatus === 'PENDING') return '审核中'
      if (car.leaseStatus === 'AWAITING_PAYMENT') return '待缴费'
      if (car.leaseStatus === 'REJECTED') return '已拒绝'
      if (car.leaseStatus === 'EXPIRED') return '已过期'
      return car.statusText || '使用中'
    },

    // 查询余额
    async loadBalance() {
      try {
        const balance = await request({
          url: '/api/parking/account/balance',
          method: 'GET'
        })
        // 如果 balance 是对象，尝试取 data.data 或 data.balance
        // 根据你之前的日志，balance 可能直接是数字或者 { code: 200, data: 0 }
        if (typeof balance === 'number') {
          this.summary.balance = balance
        } else if (balance && typeof balance.data === 'number') {
          this.summary.balance = balance.data
        } else {
          this.summary.balance = 0
        }
      } catch (e) {
        console.error('获取余额失败', e)
        // 余额获取失败不弹窗，显示 0 即可，避免打扰用户
        this.summary.balance = 0 
      }
    },

    // 跳转充值页面
    goRecharge() {
      uni.navigateTo({
        url: `/owner/pages/parking/recharge?balance=${this.summary.balance || 0}`
      })
    },

    // 跳转绑定车辆页面
    goBindCar() {
      uni.navigateTo({
        url: '/owner/pages/parking/bind-car'
      })
    },

    // 跳转车位详情页
    goSpaceDetail(car) {
      uni.navigateTo({
        url: '/owner/pages/parking/space-detail',
        success: (res) => {
          // 🔴 关键：把 car 传给详情页
          res.eventChannel.emit('carDetail', car)
        }
      })
    },

    // --- 首次支付逻辑 ---
    handleFirstPay(car) {
      this.currentCar = car
      this.selectedDuration = 1 // 默认选中1个月
      this.updatePrice()
      this.showRenewPopup = true
      this.isFirstPay = true // 标记为首次支付
    },

    // --- 续费逻辑 ---
    handleRenew(car) {
      this.currentCar = car
      this.selectedDuration = 1
      this.updatePrice()
      this.showRenewPopup = true
      this.isFirstPay = false // 标记为续费
    },

    closeRenew() {
      this.showRenewPopup = false
    },

    selectDuration(opt) {
      this.selectedDuration = opt.months
      this.updatePrice()
    },

    updatePrice() {
      const opt = this.renewOptions.find(o => o.months === this.selectedDuration)
      this.currentPrice = opt ? opt.price : 0
    },

    onPayMethodChange(e) {
      this.payMethod = e.detail.value
    },

    async confirmRenew() {
      if (this.summary.balance < this.currentPrice) {
        uni.showToast({ title: '余额不足，请先充值', icon: 'none' })
        return
      }

      try {
        uni.showLoading({ title: '支付中...' })
        
        // 区分续费接口和首次开通接口
        // 优先根据 leaseStatus 判断，其次使用 isFirstPay 标记
        const isOpening = this.currentCar.leaseStatus === 'AWAITING_PAYMENT' || this.isFirstPay
        const url = isOpening ? '/api/parking/space/open' : '/api/parking/space/renew'
        
        await request(url, {
          spaceId: this.currentCar.id,
          durationMonths: this.selectedDuration,
          payMethod: this.payMethod,
          amount: this.currentPrice,
          userId: this.userInfo.id
        }, 'POST')

        uni.hideLoading()
        uni.showToast({ title: isOpening ? '开通成功' : '续费成功', icon: 'success' })
        this.closeRenew()
        
        // 刷新余额和车位列表
        this.loadBalance()
        this.loadCars()
        
      } catch (e) {
        uni.hideLoading()
        console.error('支付失败:', e)
        uni.showToast({ title: e.message || '支付失败', icon: 'none' })
      }
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
.car-status.status-warn { color: #ff9f43; font-weight: 600; }
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
.car-card-footer { display: flex; gap: 24rpx; margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx dashed #e0e0e0; justify-content: flex-end; }
.btn.ghost { background: #fff; border: 1rpx solid #386bff; color: #386bff; border-radius: 16rpx; padding: 10rpx 24rpx; font-size: 24rpx; margin: 0; }
.btn.primary { background-color: #386bff; color: #fff; padding: 12rpx 32rpx; border-radius: 16rpx; }

/* 弹窗样式 */
.custom-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}
.popup-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
}
.popup-body {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.renew-panel { background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx; min-height: 600rpx; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40rpx; }
.panel-title { font-size: 32rpx; font-weight: 600; color: #333; }
.close-icon { font-size: 40rpx; color: #999; padding: 10rpx; }
.info-item { display: flex; justify-content: space-between; margin-bottom: 30rpx; font-size: 28rpx; }
.option-title { font-size: 28rpx; font-weight: 600; margin-bottom: 20rpx; color: #333; }
.duration-options { display: flex; gap: 20rpx; margin-bottom: 40rpx; }
.option-item { flex: 1; border: 2rpx solid #eee; border-radius: 16rpx; padding: 20rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.2s; }
.option-item.active { border-color: #386bff; background: #f0f5ff; }
.opt-name { font-size: 26rpx; color: #666; margin-bottom: 8rpx; }
.option-item.active .opt-name { color: #386bff; }
.opt-price { font-size: 30rpx; font-weight: 600; color: #333; }
.option-item.active .opt-price { color: #386bff; }
.pay-method { margin-top: 40rpx; }
.method-title { font-size: 28rpx; font-weight: 600; margin-bottom: 20rpx; }
.radio-label { display: flex; align-items: center; font-size: 28rpx; color: #333; }
.panel-footer { margin-top: 60rpx; display: flex; justify-content: space-between; align-items: center; padding-top: 20rpx; border-top: 1rpx solid #f5f5f5; }
.total-price { font-size: 28rpx; color: #666; }
.price-num { font-size: 36rpx; font-weight: 600; color: #ff4444; margin-left: 10rpx; }
.pay-btn { background: #386bff; color: #fff; border-radius: 40rpx; padding: 0 60rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; margin: 0; }
</style>