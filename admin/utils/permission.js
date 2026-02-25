// 权限管理工具

// 角色权限映射表
const rolePermissions = {
  // 普通用户权限
  user: {
    pages: [
      '/pages/index/index',
      '/pages/parking/index',
      '/pages/topic/index',
      '/pages/mine/index',
      '/pages/communityService/index',
      '/pages/login/login',
      '/pages/repair/repair',
      '/pages/notice/list',
      '/pages/notice/detail',
      '/pages/topic/detail',
      '/pages/topic/list',
      '/pages/parking/recharge',
      '/pages/parking/space-detail'
    ]
  },
  // 管理员权限
  admin: {
    pages: [
      // 管理员专属页面
      '/owner/pages/admin/repair-manage',
      '/owner/pages/admin/user-manage',
      '/owner/pages/admin/notice-manage',
      '/owner/pages/admin/parking-manage',
      '/owner/pages/admin/community-manage',
      // 可以访问的公共页面
      '/pages/login/login'
    ]
  }
}

// 检查用户是否有页面访问权限
export function checkPagePermission(pagePath, role) {
  // 登录页无需权限
  if (pagePath === '/pages/login/login') {
    return true
  }
  
  const permissions = rolePermissions[role] || rolePermissions.user
  return permissions.pages.includes(pagePath)
}

// 检查是否为管理员
export function isAdmin() {
  const userInfo = uni.getStorageSync('userInfo')
  return userInfo && userInfo.role === 'admin'
}

// 检查是否为普通用户
export function isUser() {
  const userInfo = uni.getStorageSync('userInfo')
  return userInfo && userInfo.role === 'user'
}

// 跳转到对应角色的首页
export function goToHomeByRole() {
  const userInfo = uni.getStorageSync('userInfo')
  if (!userInfo) {
    uni.redirectTo({ url: '/pages/login/login' })
    return
  }
  
  if (userInfo.role === 'admin') {
    // 管理员首页
    uni.redirectTo({ url: '/owner/pages/admin/repair-manage' })
  } else {
    // 普通用户首页
    uni.switchTab({ url: '/pages/index/index' })
  }
}
