<template>
  <view class="login-container">
    <!-- 标题 -->
    <view class="login-title">智慧社区登录</view>

    <!-- 用户名输入框 -->
    <view class="input-item">
      <text class="input-icon">👤</text>
      <input 
        v-model="form.username" 
        placeholder="请输入用户名" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 密码输入框 -->
    <view class="input-item">
      <text class="input-icon">🔒</text>
      <input 
        v-model="form.password" 
        type="password" 
        placeholder="请输入密码" 
        placeholder-class="placeholder-style"
      />
    </view>

    <!-- 登录按钮 -->
    <button 
      class="login-btn" 
      @click="handleLogin"
      :disabled="!form.username || !form.password"
    >
      登录
    </button>

    <!-- 注册链接 -->
    <view class="register-link" @click="goToRegister">
      没有账号？去注册
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
        password: ''
      }
    }
  },
  methods: {
    goToRegister() {
      uni.navigateTo({
        url: '/owner/pages/register/register'
      })
    },
    async handleLogin() {
      try {
        // 表单验证
        if (!this.form.username || !this.form.password) {
          uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
          return
        }
        
        // 调用登录接口
        const result = await request({
          url: '/api/user/login',
          method: 'POST',
          data: this.form,
          header: {
            'Content-Type': 'application/json'
          }
        })

        // 从 Token 中解析角色信息
        let role = ''; // 默认角色
        let fullRole = ''; // 保存完整角色名
        if (result.token) {
           try {
             const payload = JSON.parse(atob(result.token.split('.')[1]))
             console.log('Token 中的信息:', payload)
             // 如果 Token 中有角色信息，使用真实角色
             if (payload.role) {
               // 保存完整角色名（如ROLE_ADMIN）
               fullRole = payload.role;
               // 转换角色格式：ROLE_ADMIN → admin，ROLE_OWNER → owner
               role = payload.role.replace('ROLE_', '').toLowerCase()
             }
           } catch (e) {
             console.log('Token 解码失败:', e)
           }
         }
         
         // 保存用户信息
         const userInfo = {
           id: result.userId,           // ⭐ 新增 id 字段（关键！）
           userId: result.userId,
           username: result.username,
           role: role,  // 使用从 Token 中解析的真实角色
           fullRole: fullRole, // 保存完整角色名（如ROLE_ADMIN）
           communityId: result.communityId, // ✅ 关键修复：从登录返回结果中保存 communityId
           token: result.token
         }
         uni.setStorageSync('userInfo', userInfo)
         uni.setStorageSync('token', result.token)
 	 	 console.log('登录返回的完整数据:', result)
 	 	 console.log('保存的用户信息:', userInfo)

        // 登录成功跳转
         uni.showToast({ title: '登录成功', icon: 'success', duration: 1500 })
         setTimeout(() => {
           // 根据角色跳转到对应首页
          if (userInfo.role === 'admin' || userInfo.role === 'super_admin') {
            // 管理员跳转到仪表盘页面
            uni.redirectTo({ url: '/admin/pages/admin/dashboard/index' })
          } else if (userInfo.role === 'worker') {
            // 维修员跳转到任务中心
            uni.redirectTo({ url: '/admin/pages/admin/worker-tasks' })
          } else {
            // 业主跳转到用户首页
            uni.switchTab({ url: '/owner/pages/index/index' })
          }
         }, 1500)
        
      } catch (err) {
        uni.hideLoading()
        console.error('登录错误:', err)
        const errorMessage = err?.message || '登录失败，请重试'
        uni.showToast({ title: errorMessage, icon: 'none' })
      }
    }
  }  
}
</script>

<style scoped>
.login-container {
  padding: 50rpx 30rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.login-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin: 80rpx 0;
}

.input-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 10rpx;
  padding: 0 20rpx;
  margin-bottom: 20rpx;
  height: 80rpx;
  box-shadow: 0 2rpx 5rpx rgba(0,0,0,0.05);
}

.input-icon {
  color: #2D81FF;
  margin-right: 20rpx;
  font-size: 30rpx;
}

.placeholder-style {
  color: #ccc;
  font-size: 28rpx;
}

/* 角色选择样式优化 - 已移除，保留类名防止报错或后续恢复 */
.role-group {
  display: none;
}

.radio-group {
  display: flex;
  gap: 60rpx;
  font-size: 28rpx;
  color: #333;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.login-btn {
  background-color: #2D81FF;
  color: #fff;
  font-size: 30rpx;
  height: 90rpx;
  border-radius: 45rpx;
  margin-top: 40rpx;
}

.login-btn[disabled] {
  background-color: #89bfff;
  opacity: 0.8;
}

.register-link {
  text-align: center;
  margin-top: 30rpx;
  color: #2D81FF;
  font-size: 28rpx;
}
</style>