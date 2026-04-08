<template>
  <view class="container">
    <view class="header">
      <text class="title">绑定房屋</text>
      <text class="sub-title">请填写真实的房屋信息以通过审核</text>
    </view>

    <view class="form-group">
      <view class="form-item">
        <text class="label">所属小区</text>
        <picker @change="onCommunityChange" :range="communities" range-key="name">
          <view class="picker-value" :class="{ placeholder: !form.communityName }">
            {{ form.communityName || '请选择小区' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">楼栋号</text>
        <input 
          class="input" 
          v-model="form.buildingNo" 
          placeholder="例如：1号楼 或 A栋" 
          placeholder-class="placeholder"
        />
      </view>

      <view class="form-item">
        <text class="label">房屋号</text>
        <input 
          class="input" 
          v-model="form.houseNo" 
          placeholder="例如：101室" 
          placeholder-class="placeholder"
        />
      </view>

      <view class="form-item">
        <text class="label">身份类型</text>
        <picker @change="onTypeChange" :range="identityTypes" range-key="label">
          <view class="picker-value" :class="{ placeholder: !form.typeLabel }">
            {{ form.typeLabel || '请选择您的身份' }}
          </view>
        </picker>
      </view>
    </view>

    <button class="submit-btn" @click="handleSubmit">提交绑定申请</button>

    <view class="tips">
      <text class="tips-title">温馨提示：</text>
      <text class="tips-text">1. 提交申请后，物业管理员将在24小时内进行审核。</text>
      <text class="tips-text">2. 审核通过后，您将获得该房屋的相关服务权限。</text>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      communities: [], // 小区列表
      identityTypes: [
        { label: '业主', value: 'OWNER' },
        { label: '家属', value: 'FAMILY' },
        { label: '租户', value: 'TENANT' }
      ],
      form: {
        communityId: '',
        communityName: '',
        buildingNo: '',
        houseNo: '',
        type: '',
        typeLabel: ''
      }
    }
  },
  onLoad() {
    this.loadCommunities()
  },
  methods: {
    async loadCommunities() {
      try {
        const res = await request({
          url: '/api/house/community/list',
          method: 'GET'
        })
        // 兼容返回格式：可能是数组直接返回，也可能是分页对象的records
        this.communities = Array.isArray(res) ? res : (res.records || [])
      } catch (e) {
        console.error('获取小区列表失败', e)
        uni.showToast({ title: '无法获取小区列表', icon: 'none' })
      }
    },

    onCommunityChange(e) {
      const index = e.detail.value
      const selected = this.communities[index]
      this.form.communityId = selected.id
      this.form.communityName = selected.name
    },

    onTypeChange(e) {
      const index = e.detail.value
      const selected = this.identityTypes[index]
      this.form.type = selected.value
      this.form.typeLabel = selected.label
    },

    async handleSubmit() {
      if (!this.form.communityId) return uni.showToast({ title: '请选择小区', icon: 'none' })
      if (!this.form.buildingNo) return uni.showToast({ title: '请填写楼栋号', icon: 'none' })
      if (!this.form.houseNo) return uni.showToast({ title: '请填写房屋号', icon: 'none' })
      if (!this.form.type) return uni.showToast({ title: '请选择身份类型', icon: 'none' })

      try {
        uni.showLoading({ title: '提交中...' })
        const userInfo = uni.getStorageSync('userInfo')
        
        await request('/api/house/bind', {
          userId: userInfo?.id || userInfo?.userId,
          communityId: this.form.communityId,
          buildingNo: this.form.buildingNo,
          houseNo: this.form.houseNo,
          type: this.form.type
        }, 'POST')

        uni.hideLoading()
        uni.showModal({
          title: '提交成功',
          content: '您的绑定申请已提交，请耐心等待管理员审核。',
          showCancel: false,
          success: () => {
            uni.navigateBack()
          }
        })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '提交失败：' + (e.message || '请重试'), icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.container {
  padding: 40rpx;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.header {
  margin-bottom: 50rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.sub-title {
  font-size: 26rpx;
  color: #999;
}

.form-group {
  background: white;
  border-radius: 20rpx;
  padding: 0 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03);
  margin-bottom: 50rpx;
}

.form-item {
  padding: 36rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  display: flex;
  align-items: center;
}

.form-item:last-child {
  border-bottom: none;
}

.label {
  width: 160rpx;
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.input, .picker-value {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.placeholder {
  color: #ccc;
}

.submit-btn {
  background: #2D81FF;
  color: white;
  border-radius: 50rpx;
  height: 90rpx;
  line-height: 90rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 20rpx rgba(45, 129, 255, 0.3);
}

.submit-btn:active {
  transform: scale(0.98);
}

.tips {
  margin-top: 50rpx;
  padding: 30rpx;
}

.tips-title {
  font-size: 26rpx;
  color: #666;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #999;
  display: block;
  line-height: 1.6;
  margin-bottom: 6rpx;
}
</style>
