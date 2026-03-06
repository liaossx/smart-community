<template>
  <view class="page">
    <view class="profile-card" @click="navTo('/owner/pages/mine/profile')">
      <view class="avatar">L</view>
      <view class="info">
        <text class="name">{{ user.name }}</text>
        <text class="meta">{{ user.community }} · {{ user.room }}</text>
      </view>
      <view class="service-tag">业主</view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">房屋绑定</text>
        <!-- 绑定跳转事件 -->
        <text class="section-link" @tap="navTo('/owner/pages/mine/house-bind')">去绑定</text>
      </view>
      <view v-for="house in houses" :key="house.id" class="entry-card">
        <view class="entry-left">
          <text class="entry-title">{{ house.address }}</text>
          <text class="entry-desc">{{ house.status }}</text>
        </view>
        <text class="entry-action">{{ house.bind ? '已认证' : '待认证' }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">缴费记录</text>
        <text class="section-link" @tap="navTo('/owner/pages/communityService/pay-fee')">查看全部</text>
      </view>
      <view v-for="bill in bills" :key="bill.id" class="bill-item">
        <view>
          <text class="bill-title">{{ bill.title }}</text>
          <text class="bill-desc">{{ bill.date }}</text>
        </view>
        <text class="bill-amount" :class="bill.status">{{ bill.amount }}</text>
      </view>
    </view>
  </view>
</template>
<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      user: {
        name: '',
        community: '',
        room: '',
        userId: ''
      },
      houses: [],
      bills: []
    }
  },
  onShow() {
    // 每次页面显示时重新获取数据，解决切换账号数据不刷新的问题
    this.fetchUserData()
    this.fetchHouseData()
    this.fetchBillData()
  },
  methods: {
    // 获取用户信息 - 使用 /api/user/info 接口
    async fetchUserData() {
      try {
        uni.showLoading({ title: '加载中...' })
        const result = await request({
          url: '/api/user/info',
          method: 'GET'
          // 不需要传入userId，后端会从Authorization头中获取当前登录用户信息
        })
        // request.js中已只返回data部分，直接使用result
        this.user = {
          name: result.username || result.name || '未知用户',
          community: result.community || '未绑定社区',
          room: result.room || '未绑定房屋',
          userId: result.id || result.userId // 优先使用id
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        uni.showToast({ title: '获取用户信息失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    
    // 获取房屋信息 - 使用 /api/house/getAllHouseInfo 接口
    async fetchHouseData() {
      try {
        const result = await request({
          url: '/api/house/getHouseInfoByUserId',
          method: 'GET'
        })
        // request.js中已只返回data部分，直接使用result
        this.houses = Array.isArray(result) ? result.map(house => ({
          id: house.id, // 接口返回的是id，而非houseId
          address: `${house.communityName} ${house.buildingNo} ${house.houseNo}`, // 字段匹配，可简化
          // 若接口未返回status，可根据bindStatus或isDefault模拟，或留空
          status: house.bindStatus === 1 ? '已绑定' : '未绑定', 
          bind: house.bindStatus === 1 || house.isDefault === 1 // 用bindStatus或isDefault判断绑定状态
        })) : []
      } catch (error) {
        console.error('获取房屋信息失败:', error)
        this.houses = []
      }
    },
    
    // 获取缴费记录 - 使用 /api/fee/history 接口
    async fetchBillData() {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        // 兼容 userId 和 id
        const userId = userInfo?.id || userInfo?.userId || this.user.userId
        
        if (!userId) {
          console.warn('获取缴费记录失败: 未找到userId')
          return
        }

        const result = await request({
          url: '/api/fee/history',
          method: 'GET',
          params: {
            userId: userId,
            startTime: this.getStartDate(3),
            endTime: new Date().toISOString().split('T')[0]
          }
        })
    
        // 🔥 result.records 才是数组！！
        const list = result.records || []
    
        this.bills = list.map(bill => ({
          id: bill.recordId || bill.billId,
          title: bill.feeCycle ? `物业费(${bill.feeCycle})` : '物业费',
          date: bill.payTime ? bill.payTime.split('T')[0] : '待缴',
          amount: bill.status === 'SUCCESS'
                  ? `-¥ ${bill.payAmount.toFixed(2)}`
                  : `¥ ${bill.payAmount.toFixed(2)}`,
          status: bill.status === 'SUCCESS' ? 'done' : 'pending'
        }))
    
      } catch (error) {
        console.error('获取缴费记录失败:', error)
        this.bills = []
      }
    },
    
    // 获取几个月前的日期
    getStartDate(months) {
      const date = new Date()
      date.setMonth(date.getMonth() - months)
      return date.toISOString().split('T')[0]
    },
    
    navTo(url) {
      uni.navigateTo({ url })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 28rpx;
}

.profile-card {
  display: flex;
  align-items: center;
  background: linear-gradient(120deg, #f9d976, #f39f86);
  border-radius: 28rpx;
  padding: 28rpx;
  color: #fff;
  margin-bottom: 24rpx;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-right: 24rpx;
}

.info {
  flex: 1;
}

.name {
  font-size: 34rpx;
  font-weight: 600;
}

.meta {
  font-size: 26rpx;
  opacity: 0.85;
  margin-top: 6rpx;
}

.service-tag {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  font-size: 24rpx;
}

.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
}

.section-link {
  font-size: 26rpx;
  color: #2d81ff;
}

.entry-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f6f8ff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-top: 16rpx;
}

.entry-title {
  font-size: 28rpx;
  color: #1f2430;
}

.entry-desc {
  font-size: 24rpx;
  color: #7a7e8a;
}

.entry-action {
  font-size: 24rpx;
  color: #2d81ff;
}

.bill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f0f1f6;
}

.bill-item:last-child {
  border-bottom: none;
}

.bill-title {
  font-size: 28rpx;
  color: #1f2430;
}

.bill-desc {
  font-size: 24rpx;
  color: #7a7e8a;
  margin-top: 6rpx;
}

.bill-amount {
  font-size: 28rpx;
  font-weight: 600;
}

.bill-amount.done {
  color: #1f2430;
}

.bill-amount.pending {
  color: #ff7a45;
}
</style>

