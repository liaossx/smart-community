<template>
  <view class="container">
    <view class="header">
      <view class="avatar-box" @click="changeAvatar">
        <image :src="userInfo.avatar || '/static/default-avatar.png'" mode="aspectFill" class="avatar"></image>
        <text class="edit-tip">点击修改头像</text>
      </view>
    </view>
    
    <view class="form-group">
      <view class="form-item">
        <text class="label">姓名</text>
        <input class="input" v-model="userInfo.name" placeholder="请输入姓名" />
      </view>
      <view class="form-item">
        <text class="label">手机号</text>
        <input class="input" v-model="userInfo.phone" disabled />
      </view>
      <view class="form-item">
        <text class="label">身份证号</text>
        <input class="input" v-model="userInfo.idCard" placeholder="请输入身份证号" />
      </view>
      <view class="form-item">
        <text class="label">性别</text>
        <picker @change="bindGenderChange" :range="genders">
          <view class="picker">{{ userInfo.gender || '请选择性别' }}</view>
        </picker>
      </view>
    </view>
    
    <button class="save-btn" @click="handleSave">保存修改</button>
    
    <view class="action-group">
      <view class="action-item" @click="handleChangePassword">
        <text>修改密码</text>
        <text class="arrow">></text>
      </view>
      <view class="action-item" @click="handleLogout">
        <text class="danger">退出登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      userInfo: {
        avatar: '',
        name: '',
        phone: '',
        idCard: '',
        gender: ''
      },
      genders: ['男', '女']
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    async loadData() {
      // 优先从接口获取最新信息
      try {
        const res = await request({
          url: '/api/user/info',
          method: 'GET'
        })
        this.userInfo = {
          ...this.userInfo,
          ...res,
          name: res.name || res.username,
          // gender: res.gender === '1' ? '男' : '女' // 假设后端返回字典值
        }
        // 更新本地缓存
        uni.setStorageSync('userInfo', { ...uni.getStorageSync('userInfo'), ...this.userInfo })
      } catch (e) {
        // 接口失败降级读取本地
        const user = uni.getStorageSync('userInfo') || {}
        this.userInfo = { ...this.userInfo, ...user }
      }
    },
    changeAvatar() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          // 这里应该调用上传接口
          this.userInfo.avatar = res.tempFilePaths[0]
        }
      })
    },
    bindGenderChange(e) {
      this.userInfo.gender = this.genders[e.detail.value]
    },
    async handleSave() {
      try {
        uni.showLoading({ title: '保存中...' })
        const userInfo = uni.getStorageSync('userInfo')
        
        await request('/api/user/profile', {
          userId: userInfo?.id || userInfo?.userId,
          name: this.userInfo.name,
          idCard: this.userInfo.idCard,
          gender: this.userInfo.gender,
          avatar: this.userInfo.avatar
        }, 'PUT')
        
        // 更新本地缓存
        const newUserInfo = { ...userInfo, ...this.userInfo }
        uni.setStorageSync('userInfo', newUserInfo)
        
        uni.hideLoading()
        uni.showToast({ title: '保存成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '保存失败', icon: 'none' })
        console.error('保存用户信息失败', e)
      }
    },
    handleChangePassword() {
      uni.showToast({ title: '修改密码功能开发中', icon: 'none' })
    },
    handleLogout() {
      uni.showModal({
        title: '确认退出',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            // 清除所有本地缓存
            uni.clearStorageSync()
            // 跳转到登录页
            uni.reLaunch({ url: '/owner/pages/login/login' })
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
.header {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
  background: white;
  margin-bottom: 20rpx;
  border-radius: 15rpx;
}
.avatar-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  background: #eee;
  margin-bottom: 15rpx;
}
.edit-tip {
  font-size: 24rpx;
  color: #999;
}
.form-group {
  background: white;
  border-radius: 15rpx;
  padding: 0 30rpx;
  margin-bottom: 30rpx;
}
.form-item {
  display: flex;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.form-item:last-child {
  border-bottom: none;
}
.label {
  width: 160rpx;
  font-size: 30rpx;
  color: #333;
}
.input, .picker {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}
.save-btn {
  background: #2D81FF;
  color: white;
  border-radius: 40rpx;
  margin-bottom: 40rpx;
}
.action-group {
  background: white;
  border-radius: 15rpx;
  padding: 0 30rpx;
}
.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 30rpx;
}
.action-item:last-child {
  border-bottom: none;
}
.arrow {
  color: #ccc;
}
.danger {
  color: #ff4757;
}
</style>
