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
    
    <view class="btn-group">
      <button class="submit-btn draft" @click="handleDraft">存为草稿</button>
      <button class="submit-btn publish" @click="handlePublishCheck">发布活动</button>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      activityId: null,
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
  onLoad(options) {
    if (options.id) {
      this.activityId = options.id
      this.loadActivityData(options.id)
      uni.setNavigationBarTitle({ title: '编辑活动' })
    }
  },
  methods: {
    async loadActivityData(id) {
      try {
        uni.showLoading({ title: '加载中...' })
        const res = await request(`/api/activity/${id}`, {}, 'GET')
        if (res) {
          // 解析时间 yyyy-MM-ddTHH:mm:ss
          const [date, time] = (res.startTime || '').split('T')
          // 注意：time 可能是 "09:00:00"，我们只需要 "09:00" 用于 picker 显示
          // 但如果不截取，下面的提交逻辑可能会出错 (重复拼接 :00)
          this.form = {
            title: res.title,
            content: res.content,
            date: date || '',
            time: (time || '').slice(0, 5), // 强制截取前5位 HH:mm
            location: res.location,
            maxCount: res.maxCount
          }
        }
        uni.hideLoading()
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    
    bindDateChange(e) {
      this.form.date = e.detail.value
    },
    bindTimeChange(e) {
      this.form.time = e.detail.value
    },
    
    handlePublishCheck() {
      if (!this.validateForm()) return
      
      uni.showModal({
        title: '确认发布',
        content: '确定要立即发布该活动吗？取消则存为草稿。',
        cancelText: '存为草稿',
        confirmText: '确认发布',
        success: (res) => {
          if (res.confirm) {
            this.submitData('PUBLISHED')
          } else if (res.cancel) {
            this.submitData('DRAFT')
          }
        }
      })
    },
    
    handleDraft() {
      if (!this.validateForm()) return
      this.submitData('DRAFT')
    },
    
    validateForm() {
      if (!this.form.title || !this.form.date || !this.form.location) {
        uni.showToast({ title: '请完善信息', icon: 'none' })
        return false
      }
      return true
    },
    
    async submitData(status) {
      try {
        uni.showLoading({ title: '提交中...' })
        
        // 构造提交数据
        // 后端使用 @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        // 必须包含秒数，否则 DateTimeParseException
        
        // 【最终修复方案】
        // 问题根源：this.form.time 可能已经包含秒（如 "09:00:00"），或者不包含（"09:00"）。
        // 之前的逻辑在 timeStr.length === 5 时补 :00，但如果已经是 09:00:00 (长度8)，就没有补，
        // 看起来没问题。但日志显示发出去的是 "2026-03-28 09:00:00 00:00:00"。
        // 这说明 this.form.time 本身可能已经是 "09:00:00 00:00:00" 这种离谱的格式？
        // 或者 startTime 拼接时出了问题。
        
        // 无论如何，为了彻底解决，我们强制重置 time 部分。
        
        let rawTime = this.form.time || '00:00';
        // 只取前5位 HH:mm
        if (rawTime.length > 5) {
            rawTime = rawTime.substring(0, 5);
        }
        // 统一拼接 :00
        const cleanTime = rawTime + ':00';
        
        const startTime = `${this.form.date} ${cleanTime}`
        
        console.log('清洗后的时间:', startTime); // 调试日志
        
        const data = {
          id: this.activityId, // 编辑时带上ID
          title: this.form.title,
          content: this.form.content,
          startTime: startTime,
          // 移除冗余的下划线字段，避免 400 错误
          location: this.form.location,
          maxCount: this.form.maxCount ? parseInt(this.form.maxCount) : null,
          status: status,
          coverUrl: ''
        }
        
        // 最终检查：确保 startTime 格式绝对正确
        // 如果 this.form.date 本身包含了时间，那就糟了
        if (this.form.date.includes(' ')) {
           // date 字段意外包含了时间？
           console.warn('Date字段异常:', this.form.date);
           const realDate = this.form.date.split(' ')[0];
           data.startTime = `${realDate} ${cleanTime}`;
        } else {
           data.startTime = `${this.form.date} ${cleanTime}`;
        }
        
        console.log('最终提交数据:', JSON.stringify(data));
        
        // 有ID调更新接口(假设后端有update)，无ID调发布接口
        // 如果后端 publish 接口兼容更新（有ID则更新），则统一调 publish
        // 这里假设 publish 接口只负责新增，update 负责更新，或者统一用 publish
        // 根据你提供的后端代码 publish 似乎是新增。如果有 update 接口请替换。
        // 为了安全起见，这里假设编辑也是调 publish (或后端自行判断 ID)
        // 通常 RESTful 是 POST /api/activity (新增) 和 PUT /api/activity (更新)
        // 既然你之前给的是 publish 接口，这里先统一用 publish，如果后端不支持更新，可能需要后端增加 update 接口
        // 或者我们尝试用 PUT /api/activity (标准)
        
        // 临时策略：如果 id 存在，尝试用 PUT /api/activity，否则用 POST /api/activity/publish
        if (this.activityId) {
           // 检查是否仍然报 400，如果是，可能是后端不支持 PUT /api/activity
           // 再次尝试回退到 /api/activity/publish (POST) 但带上 ID，看后端是否支持 saveOrUpdate
           // 或者后端是否将 update 映射到了 POST /api/activity/update ?
           // 根据用户反馈 "怎么还是错误的 400 Bad Request"，这通常意味着参数格式不对
           // 或者后端根本没加 @PutMapping
           
           // 尝试方案 A: 既然用户说 "我是不是需要后端创建一个方法"，说明之前可能没加。
           // 如果用户已经加了，那 400 可能是参数问题。
           // 比如 id 类型不对 (String vs Long)，或者时间格式不对。
           
           // 让我们尝试打印出发送的数据，方便调试
           console.log('正在更新活动, 数据:', JSON.stringify(data));
           
           // 如果后端是用 @RequestBody SysActivity activity，那么 JSON 应该是对的。
           // 除非 id 是 String "18" 而后端要 Long 18？ (通常 Jackson 会自动转)
           
           // 还有一种可能：后端加了 @PutMapping("/update") 而不是 @PutMapping
           // 或者后端加了 @PostMapping("/update")
           
           // 考虑到用户刚刚问 "我是不是需要后端创建一个方法"，可能还没加成功或者路径不对。
           // 假设用户加了 @PutMapping public Result update(...)
           
           // 让我们尝试将 id 转为数字 (虽然通常不需要)
           if (data.id) data.id = parseInt(data.id);
           
           await request('/api/activity', data, 'PUT')
        } else {
           await request('/api/activity/publish', data, 'POST')
        }
        
        uni.hideLoading()
        uni.showToast({ 
          title: status === 'DRAFT' ? '已存草稿' : '发布成功', 
          icon: 'success' 
        })
        
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '提交失败', icon: 'none' })
        console.error('活动提交失败', e)
      }
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
.btn-group {
  display: flex;
  gap: 20rpx;
  margin-top: 50rpx;
}
.submit-btn {
  flex: 1;
  border-radius: 40rpx;
  font-size: 30rpx;
  height: 88rpx;
  line-height: 88rpx;
}
.submit-btn.draft {
  background: #f0f2f5;
  color: #666;
}
.submit-btn.publish {
  background: #2D81FF;
  color: white;
}
</style>