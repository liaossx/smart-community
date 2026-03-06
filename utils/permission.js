// 权限管理工具

// 角色权限映射表
const rolePermissions = {
  // 普通用户权限
  owner: { // 增加 owner 别名，与 user 保持一致
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
      '/pages/parking/space-detail',
      '/owner/pages/communityService/pay-fee',
      '/owner/pages/communityService/visitor-apply',
      '/owner/pages/communityService/complaint',
      '/owner/pages/communityService/activity-list',
      '/owner/pages/mine/profile'
    ]
  },
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
      '/pages/parking/space-detail',
      '/owner/pages/communityService/pay-fee',
      '/owner/pages/communityService/visitor-apply',
      '/owner/pages/communityService/complaint',
      '/owner/pages/communityService/activity-list',
      '/owner/pages/mine/profile'
    ]
  },
  // 管理员权限
  admin: {
    pages: [
      // 管理员专属页面
      '/admin/pages/admin/repair-manage',
      '/admin/pages/admin/user-manage',
      '/admin/pages/admin/notice-manage',
      '/admin/pages/admin/parking-manage',
      '/admin/pages/admin/community-manage',
      '/admin/pages/admin/notice-edit',
      '/admin/pages/admin/fee-manage',
      '/admin/pages/admin/complaint-manage',
      '/admin/pages/admin/visitor-manage',
      '/admin/pages/admin/activity-manage',
      '/admin/pages/admin/activity-edit',
      '/admin/pages/admin/activity-signups',
      // 可以访问的公共页面
      '/owner/pages/login/login'
    ]
  },
  // 超级管理员权限
  super_admin: {
    pages: [
      // 超级管理员拥有管理员所有页面
      '/admin/pages/admin/repair-manage',
      '/admin/pages/admin/user-manage',
      '/admin/pages/admin/notice-manage',
      '/admin/pages/admin/parking-manage',
      '/admin/pages/admin/community-manage',
      '/admin/pages/admin/notice-edit',
      '/admin/pages/admin/fee-manage',
      '/admin/pages/admin/complaint-manage',
      '/admin/pages/admin/visitor-manage',
      '/admin/pages/admin/activity-manage',
      '/admin/pages/admin/activity-edit',
      '/admin/pages/admin/activity-signups',
      // 可以访问的公共页面
      '/owner/pages/login/login'
    ]
  }
}

// 检查用户是否有页面访问权限
export function checkPagePermission(pagePath, role) {
  console.log('[Permission Check] Path:', pagePath, 'Role:', role)
  
  // 登录页无需权限
  if (pagePath === '/owner/pages/login/login' || pagePath === '/pages/login/login') {
    return true
  }
  
  // 简化权限检查逻辑：如果是管理员，只要是 admin/ 开头的页面都放行
  if ((role === 'admin' || role === 'super_admin')) {
    // 允许管理员访问管理端页面 (/admin/) 和业主端页面 (/owner/)，方便测试
    if (pagePath.startsWith('/admin/') || pagePath.startsWith('/owner/')) {
      return true
    }
  }
  
  // 如果没有角色信息，默认拒绝（除了登录页）
  if (!role) {
    console.warn('[Permission Denied] No role info')
    return false
  }

  const permissions = rolePermissions[role]
  // 如果角色未定义，或者页面不在白名单中
  if (!permissions || !permissions.pages.includes(pagePath)) {
     // 再次兜底：如果是普通用户（user或owner）访问 owner/ 开头页面，也放行
     if ((role === 'user' || role === 'owner') && pagePath.startsWith('/owner/')) {
       return true
     }
     console.warn('[Permission Denied] Page not in whitelist:', pagePath)
     return false
  }
  
  return true
}

// 检查是否为管理员
export function isAdmin() {
  const userInfo = uni.getStorageSync('userInfo')
  return userInfo && (userInfo.role === 'admin' || userInfo.role === 'super_admin')
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
    uni.redirectTo({ url: '/owner/pages/login/login' })
    return
  }
  
  if (userInfo.role === 'admin' || userInfo.role === 'super_admin') {
    // 管理员首页
    uni.redirectTo({ url: '/admin/pages/admin/dashboard/index' })
  } else {
    // 普通用户首页
    uni.switchTab({ url: '/owner/pages/index/index' })
  }
}
