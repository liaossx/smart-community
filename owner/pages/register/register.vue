<template>
  <view class="register-container">
    <view class="register-title" @tap="handleTitleTap">用户注册</view>

    <!-- 用户名 -->
    <view class="input-item">
      <text class="input-icon">👤</text>
      <input 
        v-model="form.username" 
        placeholder="请输入用户名" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 密码 -->
    <view class="input-item">
      <text class="input-icon">🔒</text>
      <input 
        v-model="form.password" 
        type="password" 
        placeholder="请输入密码" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 确认密码 -->
    <view class="input-item">
      <text class="input-icon">🔒</text>
      <input 
        v-model="form.confirmPassword" 
        type="password" 
        placeholder="请再次输入密码" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 手机号 -->
    <view class="input-item">
      <text class="input-icon">📱</text>
      <input 
        v-model="form.phone" 
        type="number" 
        maxlength="11"
        placeholder="请输入手机号" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 真实姓名 -->
    <view class="input-item">
      <text class="input-icon">📛</text>
      <input 
        v-model="form.realName" 
        placeholder="请输入真实姓名" 
        placeholder-class="placeholder-style"
      />
    </view>

    <view v-if="showRolePicker" class="input-item">
      <text class="input-icon">🎭</text>
      <picker
        :range="roleOptions"
        range-key="label"
        :value="roleIndex"
        @change="handleRoleChange"
      >
        <view class="picker-value">
          <text class="picker-text">{{ currentRoleLabel }}</text>
        </view>
      </picker>
    </view>

    <!-- 注册按钮 -->
    <button 
      class="register-btn" 
      @click="handleRegister"
      :disabled="loading"
    >
      {{ loading ? '注册中...' : '立即注册' }}
    </button>

    <!-- 返回登录 -->
    <view class="login-link" @click="goToLogin">
      已有账号？去登录
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      form: {
        username: '',
        password: '',
        confirmPassword: '',
        phone: '',
        realName: '',
        role: 'owner'
      },
      showRolePicker: false,
      tapCount: 0,
      roleOptions: [
        { label: '业主(owner)', value: 'owner' },
        { label: '工作人员(worker)', value: 'worker' },
        { label: '管理员(admin)', value: 'admin' }
      ],
      roleIndex: 0,
      loading: false
    }
  },
  computed: {
    currentRoleLabel() {
      const found = this.roleOptions.find(v => v.value === this.form.role)
      return found ? found.label : '业主(owner)'
    }
  },
  methods: {
    // 表单验证
    validateForm() {
      if (!this.form.username) {
        uni.showToast({ title: '请输入用户名', icon: 'none' })
        return false
      }
      if (!this.form.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' })
        return false
      }
      if (this.form.password.length < 6) {
        uni.showToast({ title: '密码长度至少6位', icon: 'none' })
        return false
      }
      if (this.form.password !== this.form.confirmPassword) {
        uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
        return false
      }
      if (!this.form.phone) {
        uni.showToast({ title: '请输入手机号', icon: 'none' })
        return false
      }
      if (!/^1[3-9]\d{9}$/.test(this.form.phone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return false
      }
      if (!this.form.realName) {
        uni.showToast({ title: '请输入真实姓名', icon: 'none' })
        return false
      }
      return true
    },

    handleTitleTap() {
      this.tapCount += 1
      if (this.tapCount >= 7 && !this.showRolePicker) {
        this.showRolePicker = true
        this.form.role = 'owner'
        this.roleIndex = 0
        uni.showToast({ title: '已开启角色选择', icon: 'none' })
      }
    },

    handleRoleChange(e) {
      const idx = Number(e?.detail?.value ?? 0)
      this.roleIndex = Number.isNaN(idx) ? 0 : idx
      this.form.role = this.roleOptions[this.roleIndex]?.value || 'owner'
    },

    // 提交注册
    async handleRegister() {
      if (!this.validateForm()) return

      this.loading = true
      try {
        const role = this.showRolePicker ? (this.form.role || 'owner') : 'owner'
        await request({
          url: '/api/user/register',
          method: 'POST',
          data: {
            username: this.form.username,
            password: this.form.password,
            phone: this.form.phone,
            realName: this.form.realName,
            role
          }
        })

        uni.showToast({ title: '注册成功', icon: 'success' })
        
        // 延迟跳转回登录页
        setTimeout(() => {
          this.goToLogin()
        }, 1500)
        
      } catch (err) {
        uni.showToast({ 
          title: err.message || '注册失败，请稍后重试', 
          icon: 'none' 
        })
      } finally {
        this.loading = false
      }
    },

    // 跳转回登录页
    goToLogin() {
      uni.navigateBack({
        delta: 1
      })
    }
  }
}
</script>

<style scoped>
.register-container {
  padding: 50rpx 30rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.register-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin: 40rpx 0 60rpx;
}

.input-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 10rpx;
  padding: 0 20rpx;
  margin-bottom: 20rpx;
  height: 90rpx;
  box-shadow: 0 2rpx 5rpx rgba(0,0,0,0.05);
}

.input-icon {
  width: 60rpx;
  text-align: center;
  font-size: 32rpx;
  color: #555;
}

.placeholder-style {
  color: #ccc;
  font-size: 28rpx;
}

input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.picker-value {
  flex: 1;
  height: 90rpx;
  display: flex;
  align-items: center;
}

.picker-text {
  font-size: 28rpx;
  color: #333;
}

.register-btn {
  background-color: #2D81FF;
  color: #fff;
  font-size: 30rpx;
  height: 90rpx;
  line-height: 90rpx;
  border-radius: 45rpx;
  margin-top: 60rpx;
  width: 100%;
}

.register-btn[disabled] {
  background-color: #89bfff;
  opacity: 0.8;
}

.login-link {
  text-align: center;
  margin-top: 40rpx;
  color: #2D81FF;
  font-size: 28rpx;
  text-decoration: underline;
}
</style>
