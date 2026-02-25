<template>
  <view class="container">
    <view class="form-item">
      <text class="label">投诉类型</text>
      <picker @change="bindTypeChange" :range="types">
        <view class="picker">{{ form.type || '请选择类型' }}</view>
      </picker>
    </view>
    
    <view class="form-item">
      <text class="label">投诉内容</text>
      <textarea class="textarea" v-model="form.content" placeholder="请详细描述您的问题..." />
    </view>
    
    <view class="form-item">
      <text class="label">上传图片 (选填)</text>
      <view class="upload-area" @click="chooseImage">
        <text v-if="!form.image">点击上传</text>
        <image v-else :src="form.image" mode="aspectFill" class="preview-img"></image>
      </view>
    </view>
    
    <button class="submit-btn" @click="handleSubmit">提交反馈</button>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      types: ['噪音扰民', '环境卫生', '物业服务', '设施损坏', '其他'],
      form: {
        type: '',
        content: '',
        image: ''
      }
    }
  },
  methods: {
    bindTypeChange(e) {
      this.form.type = this.types[e.detail.value]
    },
    chooseImage() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          // 这里应该上传图片到服务器，获取URL
          // 暂时使用本地路径
          this.form.image = res.tempFilePaths[0]
        }
      })
    },
    async handleSubmit() {
      if (!this.form.type || !this.form.content) {
        uni.showToast({ title: '请填写投诉类型和内容', icon: 'none' })
        return
      }
      
      try {
        uni.showLoading({ title: '提交中...' })
        const userInfo = uni.getStorageSync('userInfo')
        
        await request('/api/complaint/submit', {
          userId: userInfo?.id || userInfo?.userId,
          type: this.form.type,
          content: this.form.content,
          images: this.form.image // 真实场景应该是上传后的URL
        }, 'POST')
        
        uni.hideLoading()
        uni.showModal({
          title: '提交成功',
          content: '我们已收到您的反馈，将尽快处理并联系您。',
          showCancel: false,
          success: () => {
            uni.navigateBack()
          }
        })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '提交失败，请重试', icon: 'none' })
        console.error('投诉提交失败', e)
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
.form-item {
  margin-bottom: 30rpx;
  background: white;
  padding: 20rpx;
  border-radius: 10rpx;
}
.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 15rpx;
}
.picker {
  height: 80rpx;
  line-height: 80rpx;
  border-bottom: 1rpx solid #eee;
  font-size: 30rpx;
}
.textarea {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 10rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.upload-area {
  width: 160rpx;
  height: 160rpx;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 24rpx;
  border-radius: 10rpx;
}
.preview-img {
  width: 100%;
  height: 100%;
  border-radius: 10rpx;
}
.submit-btn {
  margin-top: 50rpx;
  background: #ff4757;
  color: white;
  border-radius: 40rpx;
}
</style>