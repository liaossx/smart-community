<template>
  <view class="page">
    <!-- 车位信息卡片 -->
    <view class="car-info-card" v-if="car && car.id">
      <view class="row">
        <text class="label">车位号：</text>
        <text class="value">{{ car.slot }}</text>
      </view>

      <view class="row">
        <text class="label">车位类型：</text>
        <text class="value">
          {{ car.leaseType === 'MONTHLY'
            ? '月卡'
            : car.leaseType === 'YEARLY'
            ? '年卡'
            : '永久'
          }}
        </text>
      </view>

      <view class="row">
        <text class="label">有效期：</text>
        <text class="value">{{ car.expire }}</text>
      </view>

      <view class="row">
        <text class="label">所属小区：</text>
        <text class="value">{{ car.communityName }}</text>
      </view>

      <view class="row">
        <text class="label">状态：</text>
        <text
          class="value"
          :class="car.active ? 'status-on' : 'status-off'"
        >
          {{ car.statusText }}
        </text>
      </view>

      <view class="row">
        <text class="label">车牌号：</text>
        <text class="value">{{ car.plateNo || '未绑定' }}</text>
      </view>
    </view>

    <!-- 没拿到数据时 -->
    <view v-else class="empty">
      <text>❌ 未获取到车位数据</text>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="btn primary" @click="renew">续费</button>
      <button class="btn success" @click="openGate">开闸</button>
      <button
        class="btn warning"
        @click="bindPlate"
      >绑定车牌</button>
      <button
        class="btn danger"
        @click="unbindPlate"
      >解绑车牌</button>
      <button class="btn default" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      car: {},
      userInfo: {}
    }
  },

  onLoad() {
    const user = uni.getStorageSync('userInfo')
    this.userInfo = user

    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('carDetail', (car) => {
      this.car = car
    })
  },

  methods: {
    async renew() {
      if (!this.car.id) {
        uni.showToast({ title: '车位数据为空', icon: 'none' })
        return
      }

      try {
        const orderId = await request.post(
          '/api/parking/lease/order/create',
          {
            userId: this.userInfo.id,
            spaceId: this.car.id,
            leaseType: this.car.leaseType
          }
        )

        await request.post('/api/parking/lease/order/pay', {
          orderId,
          payChannel: 'BALANCE'
        })

        // 前端更新有效期
        this.car.expire = this.calcNewExpire(this.car)

        if (this.car.leaseEndTime) {
          const newEnd = new Date(this.car.leaseEndTime)
          if (this.car.leaseType === 'MONTHLY') {
            newEnd.setMonth(newEnd.getMonth() + 1)
          } else if (this.car.leaseType === 'YEARLY') {
            newEnd.setFullYear(newEnd.getFullYear() + 1)
          }
          this.car.leaseEndTime = newEnd.toISOString()
        }

        uni.showToast({ title: '续费成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '续费失败', icon: 'none' })
      }
    },

    async openGate() {
      if (!this.car.plateNo) {
        uni.showToast({ title: '未绑定车牌', icon: 'none' })
        return
      }

      try {
        await request.post('/api/parking/gate/enter', {
          plateNo: this.car.plateNo
        })
        uni.showToast({ title: '开闸成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '开闸失败', icon: 'none' })
      }
    },

    calcNewExpire(car) {
      if (!car.leaseEndTime) return car.expire

      const end = new Date(car.leaseEndTime)
      if (car.leaseType === 'MONTHLY') end.setMonth(end.getMonth() + 1)
      if (car.leaseType === 'YEARLY') end.setFullYear(end.getFullYear() + 1)

      const format = (d) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }

      return `${format(new Date(car.leaseStartTime))} ~ ${format(end)}`
    },

    async bindPlate() {
      console.log('🔹 点击绑定车牌按钮', this.car, this.userInfo)
    
      if (!this.car || !this.car.id) {
        uni.showToast({ title: '车位数据为空', icon: 'none' })
        console.error('❌ car 对象为空或 car.id 未获取')
        return
      }
    
      // 用小程序兼容方式
      uni.showModal({
        title: '绑定车牌',
        content: '请输入车牌号',
        placeholderText: '例如 京A12345', // H5/小程序可以自定义弹窗组件实现
        editable: true, // 可编辑输入框
        success: async (res) => {
          console.log('🚀 showModal 返回：', res)
          if (res.confirm && res.content) {
            const plateNo = res.content.trim()
            if (!plateNo) {
              uni.showToast({ title: '车牌号不能为空', icon: 'none' })
              console.warn('❌ 用户未输入车牌号')
              return
            }
    
            console.log('绑定车牌号：', plateNo)
            try {
              const result = await request.post('/api/parking/plate/bind', {
                spaceId: this.car.id,
                plateNo
              })
              console.log('接口返回：', result)
              this.car.plateNo = plateNo
              uni.showToast({ title: '绑定成功', icon: 'success' })
            } catch (e) {
              console.error('❌ 绑定接口报错：', e)
              uni.showToast({ title: e.message || '绑定失败', icon: 'none' })
            }
          } else {
            console.log('用户取消输入')
          }
        }
      })
    },

    async unbindPlate() {
      if (!this.car.plateNo) {
        uni.showToast({ title: '当前未绑定车牌', icon: 'none' })
        return
      }

      try {
        await request.post('/api/parking/plate/unbind', {
          userId: this.userInfo.id,
          spaceId: this.car.id,
          plateNo: this.car.plateNo
        })
        this.car.plateNo = ''
        uni.showToast({ title: '解绑成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '解绑失败', icon: 'none' })
      }
    },

    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style>
.page {
  padding: 16px;
  background-color: #f5f5f5;
}
.car-info-card {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}
.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.label {
  font-weight: bold;
}
.status-on {
  color: green;
}
.status-off {
  color: red;
}
.action-buttons {
  display: flex;
  justify-content: space-around;
}
.btn {
  padding: 10px 20px;
  border-radius: 6px;
  color: #fff;
}
.btn.primary {
  background-color: #409eff;
}
.btn.success {
  background-color: #67c23a;
}
.btn.default {
  background-color: #909399;
}
.page { padding: 16px; background-color: #f5f5f5; }
.car-info-card { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
.row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.label { font-weight: bold; }
.status-on { color: green; }
.status-off { color: red; }
.action-buttons { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-around; }
.btn { padding: 10px 20px; border-radius: 6px; color: #fff; }
.btn.primary { background-color: #409eff; }
.btn.success { background-color: #67c23a; }
.btn.warning { background-color: #e6a23c; }
.btn.danger { background-color: #f56c6c; }
.btn.default { background-color: #909399; }
</style>