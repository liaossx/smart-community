import App from './App'
// 导入权限管理工具
import { checkPagePermission, goToHomeByRole } from './utils/permission'

// 全局导航守卫 - 检查登录状态和权限
uni.addInterceptor('navigateTo', {
  invoke(e) {
    const token = uni.getStorageSync('token')
    const userInfo = uni.getStorageSync('userInfo')
    
    // 检查登录状态
    if (!e.url.includes('/pages/login/login')) {
      if (!token) {
        console.log('未登录，跳转到登录页')
        uni.redirectTo({ url: '/pages/login/login' })
        return false
      }
      
      // 检查页面访问权限
      const pagePath = e.url.split('?')[0] // 去除参数
      if (!checkPagePermission(pagePath, userInfo?.role)) {
        console.log('无权限访问该页面')
        uni.showToast({ title: '无权限访问', icon: 'none' })
        goToHomeByRole()
        return false
      }
    }
    return true
  }
})

// 全局导航守卫 - 检查tabBar页面访问权限
uni.addInterceptor('switchTab', {
  invoke(e) {
    const token = uni.getStorageSync('token')
    const userInfo = uni.getStorageSync('userInfo')
    
    if (!token) {
      console.log('未登录，跳转到登录页')
      uni.redirectTo({ url: '/pages/login/login' })
      return false
    }
    
    // 管理员禁止访问普通用户的tabBar
    if (userInfo?.role === 'admin' || userInfo?.role === 'super_admin') {
      console.log('管理员禁止访问普通用户tabBar')
      uni.showToast({ title: '管理员请使用专属管理页面', icon: 'none' })
      goToHomeByRole()
      return false
    }
    
    return true
  }
})

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif