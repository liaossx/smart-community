<template>
  <view class="container">
    <view class="form-item">
      <text class="label">访客姓名</text>
      <input class="input" v-model="form.visitorName" placeholder="请输入访客姓名" />
    </view>
    
    <view class="form-item">
      <text class="label">访客电话</text>
      <input class="input" type="number" v-model="form.visitorPhone" placeholder="请输入访客电话" />
    </view>
    
    <view class="form-item">
      <text class="label">访问事由</text>
      <picker @change="bindReasonChange" :range="reasons">
        <view class="picker">{{ form.reason || '请选择访问事由' }}</view>
      </picker>
    </view>
    
    <view class="form-item">
      <text class="label">访问时间</text>
      <picker mode="date" @change="bindDateChange">
        <view class="picker">{{ form.visitDate || '请选择日期' }}</view>
      </picker>
      <picker mode="time" @change="bindTimeChange">
        <view class="picker">{{ form.visitTime || '请选择时间' }}</view>
      </picker>
    </view>
    
    <view class="form-item">
      <text class="label">车牌号 (选填)</text>
      <input class="input" v-model="form.carNo" placeholder="如有车辆请输入车牌号" />
    </view>
    
    <button class="submit-btn" @click="handleSubmit">生成通行凭证</button>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      reasons: ['亲友来访', '快递送货', '装修服务', '其他'],
      form: {
        visitorName: '',
        visitorPhone: '',
        reason: '',
        visitDate: '',
        visitTime: '',
        carNo: ''
      }
    }
  },
  methods: {
    bindReasonChange(e) {
      this.form.reason = this.reasons[e.detail.value]
    },
    bindDateChange(e) {
      this.form.visitDate = e.detail.value
    },
    bindTimeChange(e) {
      this.form.visitTime = e.detail.value
    },
    async handleSubmit() {
      if (!this.form.visitorName || !this.form.visitorPhone || !this.form.reason || !this.form.visitDate) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' })
        return
      }
      
      try {
        uni.showLoading({ title: '提交中...' })
        const userInfo = uni.getStorageSync('userInfo')
        
        await request('/api/visitor/apply', {
          userId: userInfo?.id || userInfo?.userId,
          visitorName: this.form.visitorName,
          visitorPhone: this.form.visitorPhone,
          reason: this.form.reason,
          visitTime: `${this.form.visitDate} ${this.form.visitTime || '00:00'}`,
          carNo: this.form.carNo
        }, 'POST')
        
        uni.hideLoading()
        uni.showModal({
          title: '申请成功',
          content: '您的访客预约已提交，通行码将通过短信发送给访客。',
          showCancel: false,
          success: () => {
            uni.navigateBack()
          }
        })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '申请失败，请重试', icon: 'none' })
        console.error('访客申请失败', e)
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
.input, .picker {
  height: 80rpx;
  line-height: 80rpx;
  border-bottom: 1rpx solid #eee;
  font-size: 30rpx;
}
.submit-btn {
  margin-top: 50rpx;
  background: #2D81FF;
  color: white;
  border-radius: 40rpx;
}
</style>