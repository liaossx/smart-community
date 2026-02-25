# 管理员端开发指南

## 1. 架构设计

### 1.1 实现方式
- ✅ 在同一app中实现管理员端，通过权限管理机制隔离
- ✅ 共用同一个登录入口，根据用户角色跳转到对应首页
- ✅ 管理员页面使用独立的侧边栏导航

### 1.2 权限管理机制
- 使用 `owner/utils/permission.js` 进行权限控制
- 角色分为：普通用户(user)和管理员(admin)
- 通过全局导航守卫检查页面访问权限

## 2. 目录结构

```
smart-community/
├── owner/                      # 管理员端模块
│   ├── pages/admin/            # 管理员页面目录
│   │   ├── repair-manage.vue   # 报修管理
│   │   ├── user-manage.vue     # 用户管理
│   │   ├── notice-manage.vue   # 公告管理
│   │   ├── parking-manage.vue  # 停车管理
│   │   ├── community-manage.vue # 社区管理
│   │   └── notice-edit.vue     # 公告编辑
│   ├── components/
│   │   └── admin-sidebar/      # 管理员侧边栏组件
│   └── utils/
│       └── permission.js       # 权限管理工具
├── pages/                      # 用户端页面目录
├── components/                 # 公共组件
├── utils/                      # 公共工具
└── pages.json                  # 页面配置
```

## 3. 实现步骤

### 3.1 1. 权限管理实现

**创建权限管理工具**
```javascript
// owner/utils/permission.js
const rolePermissions = {
  user: {
    pages: [...普通用户可访问页面]
  },
  admin: {
    pages: [...管理员可访问页面]
  }
}
```

**更新全局导航守卫**
```javascript
// main.js
import { checkPagePermission, goToHomeByRole } from './owner/utils/permission'

uni.addInterceptor('navigateTo', {
  invoke(e) {
    // 检查登录状态
    // 检查页面访问权限
    if (!checkPagePermission(pagePath, userInfo?.role)) {
      uni.showToast({ title: '无权限访问', icon: 'none' })
      goToHomeByRole()
      return false
    }
  }
})
```

### 3.2 2. 管理员侧边栏实现

**创建侧边栏组件**
```vue
<!-- owner/components/admin-sidebar/admin-sidebar.vue -->
<template>
  <view class="sidebar-container">
    <!-- 侧边栏遮罩 -->
    <view class="sidebar-mask" v-if="showSidebar" @click="closeSidebar"></view>
    
    <!-- 侧边栏主体 -->
    <view class="sidebar" :class="{ 'sidebar-open': showSidebar }">
      <!-- 管理员信息 -->
      <view class="admin-info">...</view>
      
      <!-- 导航菜单 -->
      <view class="menu-list">...</view>
      
      <!-- 退出登录 -->
      <view class="logout-section">...</view>
    </view>
    
    <!-- 顶部导航栏 -->
    <view class="top-nav">...</view>
    
    <!-- 页面内容区域 -->
    <slot></slot>
  </view>
</template>
```

### 3.3 3. 管理员页面实现

**创建管理员页面**
```vue
<!-- owner/pages/admin/repair-manage.vue -->
<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="报修管理"
    currentPage="/owner/pages/admin/repair-manage"
  >
    <view class="manage-container">
      <!-- 页面内容 -->
    </view>
  </admin-sidebar>
</template>

<script>
import adminSidebar from '@/owner/components/admin-sidebar/admin-sidebar'

export default {
  components: {
    adminSidebar
  },
  data() {
    return {
      showSidebar: false
    }
  }
}
</script>
```

### 3.4 4. 页面配置

**在pages.json中注册管理员页面**
```json
{
  "path": "owner/pages/admin/repair-manage",
  "style": {
    "navigationBarTitleText": "报修管理",
    "navigationStyle": "custom"  // 使用自定义导航栏
  }
}
```

## 4. 开发规范

### 4.1 页面开发规范
1. 所有管理员页面必须使用 `<admin-sidebar>` 组件包裹
2. 页面标题通过 `pageTitle` 属性传递
3. 当前页面路径通过 `currentPage` 属性传递，用于高亮当前菜单
4. 页面样式使用 `navigationStyle: "custom"` 去除默认导航栏

### 4.2 权限控制规范
1. 新增页面时，必须在 `owner/utils/permission.js` 中添加相应权限
2. 敏感操作必须在前端和后端都进行权限验证
3. 管理员页面必须在 `onLoad` 中检查管理员权限

### 4.3 命名规范
1. 管理员页面统一放在 `owner/pages/admin/` 目录下
2. 页面命名使用 `xxx-manage.vue` 或 `xxx-edit.vue` 格式
3. 组件命名使用 `admin-xxx.vue` 格式

## 5. 功能模块

| 模块名称 | 页面路径 | 功能描述 |
|---------|----------|----------|
| 报修管理 | /owner/pages/admin/repair-manage | 查看和处理报修请求 |
| 用户管理 | /owner/pages/admin/user-manage | 管理社区用户信息 |
| 公告管理 | /owner/pages/admin/notice-manage | 发布和管理公告 |
| 停车管理 | /owner/pages/admin/parking-manage | 管理停车位和收费 |
| 社区管理 | /owner/pages/admin/community-manage | 管理社区基本信息 |

## 6. 登录流程

1. 用户在登录页输入账号密码
2. 后端验证并返回用户信息，包含 `role` 字段
3. 前端存储 `token` 和 `userInfo` 到本地存储
4. 根据 `userInfo.role` 跳转到对应首页：
   - 普通用户：跳转到用户首页 (`/pages/index/index`)
   - 管理员：跳转到管理员首页 (`/owner/pages/admin/repair-manage`)

## 7. 开发建议

1. **权限验证**：所有管理员接口必须在后端进行权限验证
2. **数据安全**：管理员操作必须记录日志
3. **用户体验**：管理员页面设计简洁，突出核心功能
4. **代码复用**：将通用组件和工具函数抽取出来
5. **测试**：充分测试权限控制和异常情况

## 8. 后续优化

1. 添加管理员角色细分（如超级管理员、普通管理员）
2. 实现基于功能的细粒度权限控制
3. 添加操作日志记录和查询功能
4. 实现管理员权限动态配置
5. 添加管理员登录审计功能
