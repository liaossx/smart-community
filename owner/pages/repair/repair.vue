<template>
  <view class="repair-container">
    <!-- 标题 -->
    <view class="repair-title">提交报修</view>

    <!-- 楼栋号输入框 -->
    <view class="input-item">
      <text class="input-icon">🏢</text>
      <input 
        v-model="form.buildingNo" 
        placeholder="请输入楼栋号（如：1栋）" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 房屋号输入框 -->
    <view class="input-item">
      <text class="input-icon">🏠</text>
      <input 
        v-model="form.houseNo" 
        placeholder="请输入房屋号（如：101）" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 故障类型输入框 -->
    <view class="input-item">
      <text class="input-icon">⚠️</text>
      <input 
        v-model="form.faultType" 
        placeholder="请输入故障类型（如：水管、电路）" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 故障描述输入框（多行） -->
    <view class="input-item input-textarea">
      <text class="input-icon">📝</text>
      <textarea 
        v-model="form.faultDesc" 
        placeholder="请描述故障情况（可选）" 
        placeholder-class="placeholder-style"
        auto-height
      ></textarea>
    </view>

    <!-- 图片上传 -->
    <view class="input-item">
      <text class="input-icon">🖼️</text>
      <view class="upload-section">
        <text class="upload-label">上传故障图片</text>
        <view class="image-preview">
          <view 
            v-for="(img, index) in form.faultImgs" 
            :key="index" 
            class="preview-item"
          >
            <image :src="img" class="preview-image" />
            <text class="delete-btn" @click="removeImage(index)">×</text>
          </view>
          <view class="upload-btn" @click="chooseImage">
            <text class="upload-icon">+</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <button 
      class="submit-btn" 
      :disabled="!isFormValid"
      @click="handleSubmit"
    >
      提交报修
    </button>

    <!-- 返回登录页按钮 -->
    <button 
      class="back-btn" 
      plain 
      @click="handleBackLogin"
    >
      返回登录页
    </button>
  </view>
</template>

<script>
// 引入通用请求工具
import request from '@/utils/request'

export default {
  data() {
    return {
      form: {
        buildingNo: '',      // 楼栋号
        houseNo: '',         // 房屋号（纯房号）
        faultType: '',
        faultDesc: '',
        faultImgs: [],       // 图片URL数组
        userId: ''
      }
    }
  },
  computed: {
    isFormValid() {
      return this.form.buildingNo && 
             this.form.houseNo && 
             this.form.faultType
    }
  },
  onLoad() {
    const userInfo = uni.getStorageSync('userInfo')
    console.log('用户信息:', userInfo)
    if (userInfo && userInfo.userId) {
      this.form.userId = userInfo.userId
    } else {
      uni.redirectTo({ url: '/pages/login/login' })
    }
  },
  methods: {
    async handleSubmit() {
      try {
        // 准备提交数据
        const submitData = {
          ...this.form,
          faultImgs: this.form.faultImgs.join(','), // 数组转逗号分隔字符串
        }
        
        console.log('提交报修数据:', submitData)
        
        // 使用修复后的request调用
        await request({
          url: '/api/repair/submit',
          method: 'POST',
          data: submitData
        })

        uni.showToast({ title: '报修提交成功', icon: 'success' })
        
        // 重置表单
        this.resetForm()
        
      } catch (err) {
        console.error('提交报修失败：', err)
        uni.showToast({ title: err.message || '提交失败', icon: 'none' })
      }
    },

    // 选择图片
    async chooseImage() {
      try {
        const res = await uni.chooseImage({
          count: 3, // 最多3张
          sizeType: ['compressed'],
          sourceType: ['album', 'camera']
        })

        if (res.tempFilePaths.length > 0) {
          // 这里简化处理，直接使用临时路径
          // 实际项目中需要上传到服务器获取真实URL
          for (let tempPath of res.tempFilePaths) {
            this.form.faultImgs.push(tempPath)
          }
          uni.showToast({ title: '图片已添加', icon: 'success' })
        }
      } catch (err) {
        console.error('选择图片失败:', err)
        uni.showToast({ title: '选择图片失败', icon: 'none' })
      }
    },

    // 删除图片
    removeImage(index) {
      this.form.faultImgs.splice(index, 1)
    },

    // 重置表单
    resetForm() {
      this.form.buildingNo = ''
      this.form.houseNo = ''
      this.form.faultType = ''
      this.form.faultDesc = ''
      this.form.faultImgs = []
      // 保留userId
    },

    handleBackLogin() {
      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
      uni.redirectTo({ url: '/pages/login/login' })
    }
  }
}
</script>

<style scoped>
.repair-container {
  padding: 40rpx;
}

.repair-title {
  font-size: 48rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 60rpx;
  color: #333;
}

.input-item {
  display: flex;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #eee;
}

.input-textarea {
  align-items: flex-start;
}

.input-icon {
  color: #2D81FF;
  margin-right: 20rpx;
  font-size: 32rpx;
  min-width: 40rpx;
}

input, textarea {
  flex: 1;
  font-size: 32rpx;
  color: #333;
}

.placeholder-style {
  color: #999;
}

.upload-section {
  flex: 1;
}

.upload-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: block;
}

.image-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.preview-item {
  position: relative;
  width: 120rpx;
  height: 120rpx;
}

.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 10rpx;
}

.delete-btn {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 40rpx;
  height: 40rpx;
  background: #ff4757;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.upload-btn {
  width: 120rpx;
  height: 120rpx;
  border: 2rpx dashed #ccc;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 48rpx;
  color: #999;
}

.submit-btn {
  background: #2D81FF;
  color: white;
  border-radius: 50rpx;
  margin: 60rpx 0 30rpx;
  height: 90rpx;
  line-height: 90rpx;
}

.submit-btn:disabled {
  background: #ccc;
}

.back-btn {
  border: 1rpx solid #2D81FF;
  color: #2D81FF;
  border-radius: 50rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: white;
}
</style>