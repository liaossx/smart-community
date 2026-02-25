<template>
  <view class="edit-container">
    <view class="form-item">
      <text class="label">活动标题</text>
      <input class="input" v-model="form.title" placeholder="请输入活动标题" />
    </view>
    
    <view class="form-item">
      <text class="label">活动时间</text>
      <picker mode="date" @change="bindDateChange">
        <view class="picker">{{ form.date || '请选择日期' }}</view>
      </picker>
      <picker mode="time" @change="bindTimeChange">
        <view class="picker">{{ form.time || '请选择时间' }}</view>
      </picker>
    </view>
    
    <view class="form-item">
      <text class="label">活动地点</text>
      <input class="input" v-model="form.location" placeholder="请输入活动地点" />
    </view>
    
    <view class="form-item">
      <text class="label">最大报名人数</text>
      <input class="input" type="number" v-model="form.maxCount" placeholder="0表示不限" />
    </view>
    
    <view class="form-item">
      <text class="label">活动详情</text>
      <textarea class="textarea" v-model="form.content" placeholder="请输入活动详情描述" />
    </view>
    
    <button class="submit-btn" @click="handleSubmit">发布活动</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      form: {
        title: '',
        date: '',
        time: '',
        location: '',
        maxCount: '',
        content: ''
      }
    }
  },
  methods: {
    bindDateChange(e) {
      this.form.date = e.detail.value
    },
    bindTimeChange(e) {
      this.form.time = e.detail.value
    },
    handleSubmit() {
      if (!this.form.title || !this.form.date || !this.form.location) {
        uni.showToast({ title: '请完善信息', icon: 'none' })
        return
      }
      // 模拟提交
      uni.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  }
}
</script>

<style scoped>
.edit-container {
  padding: 30rpx;
}
.form-item {
  margin-bottom: 30rpx;
}
.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 15rpx;
}
.input, .picker {
  border: 1rpx solid #eee;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 20rpx;
  border-radius: 10rpx;
  font-size: 28rpx;
  background: #f9f9f9;
}
.textarea {
  border: 1rpx solid #eee;
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  border-radius: 10rpx;
  font-size: 28rpx;
  background: #f9f9f9;
  box-sizing: border-box;
}
.submit-btn {
  background: #2D81FF;
  color: white;
  border-radius: 40rpx;
  margin-top: 50rpx;
}
</style>