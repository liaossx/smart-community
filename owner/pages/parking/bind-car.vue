<template>
  <view class="container">
    <view class="form-card">
      <view class="form-title">车辆绑定申请</view>
      
      <view class="form-item">
        <text class="label">车牌号码</text>
        <input 
          class="input" 
          v-model="form.plateNo" 
          placeholder="请输入车牌号 (如: 粤A88888)"
          placeholder-class="placeholder"
        />
      </view>

      <view class="form-item">
        <text class="label">车辆品牌</text>
        <input 
          class="input" 
          v-model="form.brand" 
          placeholder="请输入车辆品牌 (如: 奔驰)"
          placeholder-class="placeholder"
        />
      </view>

      <view class="form-item">
        <text class="label">车辆颜色</text>
        <input 
          class="input" 
          v-model="form.color" 
          placeholder="请输入车辆颜色 (如: 黑色)"
          placeholder-class="placeholder"
        />
      </view>
      
      <view class="form-item">
        <text class="label">关联车位</text>
        <picker 
          mode="selector" 
          :range="mySpaces" 
          range-key="slot" 
          @change="onSpaceChange"
        >
          <view class="picker-value" :class="{ placeholder: !form.spaceId }">
            {{ form.spaceName || '请选择车位' }}
          </view>
        </picker>
      </view>

      <view class="tips">
        <text>说明：</text>
        <text>1. 请填写真实有效的车辆信息。</text>
        <text>2. 提交申请后，物业管理员将核实车辆和车位归属。</text>
        <text>3. 审核通过后，该车辆将获得车牌识别进出权限。</text>
      </view>

      <button class="submit-btn" @click="handleSubmit">提交绑定申请</button>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      form: {
        plateNo: '',
        brand: '',
        color: '',
        spaceId: '',
        spaceName: ''
      },
      mySpaces: []
    }
  },
  onLoad() {
    this.loadMySpaces()
  },
  methods: {
    // 加载我的车位列表供选择
    async loadMySpaces() {
      try {
        const userInfo = uni.getStorageSync('userInfo')
        const userId = userInfo?.id || userInfo?.userId
        if (!userId) {
          uni.showToast({ title: '请先登录', icon: 'none' })
          return
        }
        
        // 使用 /api/parking/space/list 接口，传入 communityId 查询本小区车位
        // 注意：这里需要确保 userInfo 中有 communityId
        const communityId = userInfo.communityId
        if (!communityId) {
          uni.showToast({ title: '未绑定小区', icon: 'none' })
          return
        }

        console.log('【DEBUG】请求车位列表参数:', { communityId })
        const res = await request({
          url: '/api/parking/space/available', // 改为查询可用车位接口
          method: 'GET',
          params: { communityId, pageSize: 100 }
        })
        console.log('【DEBUG】车位列表数据:', JSON.stringify(res))
        
        // 兼容处理：可能返回数组或分页对象
        this.mySpaces = Array.isArray(res) ? res : (res.records || [])
      } catch (e) {
        console.error('获取车位失败', e)
        uni.showToast({ title: '无法获取车位列表', icon: 'none' })
      }
    },

    onSpaceChange(e) {
      const index = e.detail.value
      const space = this.mySpaces[index]
      this.form.spaceId = space.id
      this.form.spaceName = space.slot
    },

    async handleSubmit() {
      if (!this.form.plateNo) return uni.showToast({ title: '请输入车牌号', icon: 'none' })
      if (!this.form.spaceId) return uni.showToast({ title: '请选择关联车位', icon: 'none' })

      // 车牌正则校验 (简单版)
      const plateRegex = /^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6}$/
      if (!plateRegex.test(this.form.plateNo)) {
        return uni.showToast({ title: '车牌号格式不正确', icon: 'none' })
      }

      try {
        uni.showLoading({ title: '提交申请中...' })
        
        // 构造请求参数
        const data = {
          plateNo: this.form.plateNo,
          brand: this.form.brand,
          color: this.form.color,
          spaceId: this.form.spaceId
        }
        
        await request('/api/vehicle/bind', data, 'POST')
        
        uni.hideLoading()
        uni.showModal({
          title: '提交成功',
          content: '您的车辆绑定申请已提交，请耐心等待管理员审核。',
          showCancel: false,
          success: () => {
            uni.navigateBack()
          }
        })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '提交失败: ' + (e.message || '请重试'), icon: 'none' })
      }
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
.form-card {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03);
}
.form-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 40rpx;
  text-align: center;
  color: #333;
}
.form-item {
  margin-bottom: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  padding-bottom: 10rpx;
}
.label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
}
.input, .picker-value {
  font-size: 30rpx;
  color: #333;
  height: 60rpx;
  line-height: 60rpx;
}
.placeholder {
  color: #ccc;
}
.tips {
  margin-top: 40rpx;
  background: #f0f7ff;
  padding: 20rpx;
  border-radius: 10rpx;
}
.tips text {
  display: block;
  font-size: 24rpx;
  color: #2d81ff;
  line-height: 1.6;
}
.submit-btn {
  margin-top: 60rpx;
  background: #2D81FF;
  color: white;
  border-radius: 50rpx;
  font-size: 32rpx;
  height: 88rpx;
  line-height: 88rpx;
}
</style>