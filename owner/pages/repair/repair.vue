<template>
  <view class="repair-container">
    <!-- 标题 -->
    <view class="repair-title">提交报修</view>

    <!-- 房屋选择 -->
    <view class="input-item">
      <text class="input-icon">�</text>
      <picker 
        mode="selector" 
        :range="myHouses" 
        range-key="displayText"
        @change="handleHouseChange"
        :disabled="myHouses.length === 0"
      >
        <view :class="['picker-view', !form.houseId ? 'placeholder-style' : '']">
          {{ form.houseId ? selectedHouseText : (myHouses.length > 0 ? '请选择房屋' : '暂无绑定房屋，请先去绑定') }}
        </view>
      </picker>
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
        houseId: '',         // 房屋ID
        faultType: '',
        faultDesc: '',
        faultImgs: [],       // 图片URL数组
        userId: ''
      },
      myHouses: [], // 用户绑定的房屋列表
      selectedHouseText: ''
    }
  },
  computed: {
    isFormValid() {
      return this.form.houseId && 
             this.form.faultType
    }
  },
  onLoad() {
    const userInfo = uni.getStorageSync('userInfo')
    console.log('用户信息:', userInfo)
    if (userInfo && userInfo.userId) {
      this.form.userId = userInfo.userId
      this.loadMyHouses()
    } else {
      uni.redirectTo({ url: '/pages/login/login' })
    }
  },
  methods: {
    // 加载用户房屋列表
    async loadMyHouses() {
      try {
        const res = await request({
          url: '/api/house/getHouseInfoByUserId',
          method: 'GET',
          // 后端从Token中获取userId，无需传参
        })
        
        // 兼容不同的返回结构
        const list = Array.isArray(res) ? res : (res.data || [])
        
        if (list.length > 0) {
          this.myHouses = list.map(house => ({
            ...house,
            displayText: `${house.buildingNo}栋 ${house.houseNo}室`
          }))
          
          // 如果只有一个房屋，自动选中
          if (this.myHouses.length === 1) {
            this.selectHouse(this.myHouses[0])
          }
        }
      } catch (e) {
        console.error('加载房屋列表失败', e)
        uni.showToast({ title: '加载房屋信息失败', icon: 'none' })
      }
    },
    
    handleHouseChange(e) {
      const index = e.detail.value
      this.selectHouse(this.myHouses[index])
    },
    
    selectHouse(house) {
      this.form.houseId = house.id
      this.form.buildingNo = house.buildingNo
      this.form.houseNo = house.houseNo
      this.selectedHouseText = house.displayText
    },

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
      // 保留房屋信息，因为通常用户只住在一个地方
      // this.form.buildingNo = ''
      // this.form.houseNo = ''
      // this.form.houseId = ''
      // this.selectedHouseText = ''
      
      this.form.faultType = ''
      this.form.faultDesc = ''
      this.form.faultImgs = []
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

.picker-view {
  flex: 1;
  font-size: 32rpx;
  color: #333;
}
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