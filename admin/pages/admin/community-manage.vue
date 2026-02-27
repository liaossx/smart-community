<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="社区管理"
    currentPage="/admin/pages/admin/community-manage"
  >
    <view class="manage-container">
      <!-- 超级管理员：社区列表 -->
      <view v-if="isSuperAdmin && !currentCommunityId" class="community-list">
        <view class="list-header">
          <text class="list-title">社区列表</text>
          <button class="add-btn" @click="handleAddCommunity">新增社区</button>
        </view>
        
        <view class="community-item" v-for="(item, index) in communityList" :key="index" @click="selectCommunity(item)">
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-address">{{ item.address }}</text>
          </view>
          <text class="arrow">></text>
        </view>
        
        <view v-if="communityList.length === 0" class="empty-tip">
          暂无社区数据
        </view>
      </view>

      <!-- 社区详情 (普通管理员直接显示，超级管理员选中后显示) -->
      <view v-else class="community-detail">
        <view v-if="isSuperAdmin" class="back-bar" @click="backToList">
          <text class="back-icon">←</text>
          <text>返回社区列表</text>
        </view>

        <view class="community-info">
          <view class="info-item">
            <text class="info-label">社区名称：</text>
            <text class="info-value">{{ communityInfo.name }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">社区地址：</text>
            <text class="info-value">{{ communityInfo.address }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">总户数：</text>
            <text class="info-value">{{ communityInfo.totalHouses }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">绿化率：</text>
            <text class="info-value">{{ communityInfo.greenRate }}%</text>
          </view>
          <view class="info-item">
            <text class="info-label">停车位总数：</text>
            <text class="info-value">{{ communityInfo.totalParkings }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">物业管理费：</text>
            <text class="info-value">¥{{ communityInfo.propertyFee }}/月</text>
          </view>
        </view>
        
        <!-- 操作按钮 -->
        <view class="action-section">
          <button class="edit-btn" @click="handleEditCommunity">
            编辑社区信息
          </button>
        </view>
      </view>
    </view>
  </admin-sidebar>
</template>

<script>
import request from '@/utils/request'
import adminSidebar from '@/admin/components/admin-sidebar/admin-sidebar'

export default {
  components: {
    adminSidebar
  },
  data() {
    return {
      communityInfo: {
        name: '智慧社区',
        address: '北京市朝阳区智慧路1号',
        totalHouses: 500,
        greenRate: 35,
        totalParkings: 800,
        propertyFee: 3.5
      },
      showSidebar: false,
      isSuperAdmin: false,
      communityList: [],
      currentCommunityId: null
    }
  },
  onLoad() {
    this.checkAdminRole()
    this.initData()
  },
    
  methods: {
    checkAdminRole() {
      const userInfo = uni.getStorageSync('userInfo')
      if (!userInfo || (userInfo.role !== 'admin' && userInfo.role !== 'super_admin')) {
        uni.showToast({ title: '无权限访问', icon: 'none' })
        uni.redirectTo({ url: '/owner/pages/login/login' })
        return
      }
      this.isSuperAdmin = userInfo.role === 'super_admin'
    },

    async initData() {
      if (this.isSuperAdmin) {
        await this.loadCommunityList()
      } else {
        await this.loadCommunityInfo()
      }
    },

    async loadCommunityList() {
      try {
        // 尝试调用列表接口，如果不存在则使用模拟数据
        try {
           const data = await request('/api/community/list', {}, 'GET')
           if (data && Array.isArray(data)) {
             this.communityList = data
             return
           }
        } catch (e) {
          console.log('API /api/community/list 可能不存在，使用模拟数据')
        }

        // 模拟数据
        this.communityList = [
          { id: 1, name: '智慧社区A区', address: '北京市朝阳区智慧路1号' },
          { id: 2, name: '幸福家园B区', address: '北京市海淀区幸福路8号' },
          { id: 3, name: '阳光花园C区', address: '上海市浦东新区阳光大道99号' }
        ]
      } catch (err) {
        uni.showToast({ title: '加载社区列表失败', icon: 'none' })
      }
    },

    async loadCommunityInfo(id) {
      try {
        // 如果是超级管理员，查看指定社区详情时，调用 /api/community/{id}
        // 如果是普通管理员，调用 /api/community/info 获取当前登录管理员所属社区
        
        let url = '/api/community/info'
        if (this.isSuperAdmin && id) {
          url = `/api/community/${id}`
        }
        
        const data = await request(url, {}, 'GET')
        if (data) {
          this.communityInfo = data
        } else if (this.isSuperAdmin && id) {
           // 如果是超级管理员且API未返回数据（可能是因为接口未适配id参数），从列表中查找并填充基本信息
           const selected = this.communityList.find(c => c.id === id)
           if (selected) {
             this.communityInfo = {
               ...this.communityInfo, // 保留默认值
               ...selected,
               totalHouses: 0, // 默认值
               greenRate: 0,
               totalParkings: 0,
               propertyFee: 0
             }
           }
        }
      } catch (err) {
        console.error('加载社区信息失败:', err)
        uni.showToast({ 
          title: err?.message || '加载失败', 
          icon: 'none' 
        })
      }
    },

    selectCommunity(item) {
      this.currentCommunityId = item.id
      this.loadCommunityInfo(item.id)
    },

    backToList() {
      this.currentCommunityId = null
      this.communityInfo = {} // 清空
    },

    handleAddCommunity() {
      uni.showToast({ title: '新增功能开发中', icon: 'none' })
    },

    handleEditCommunity() {
      uni.showToast({ title: '编辑功能开发中', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.manage-container {
  padding: 30rpx;
}

.community-info {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.1);
}

.info-item {
  display: flex;
  margin-bottom: 20rpx;
  align-items: center;
}

.info-label {
  font-size: 30rpx;
  color: #666;
  width: 150rpx;
  font-weight: bold;
}

.info-value {
  font-size: 30rpx;
  color: #333;
  flex: 1;
}

.action-section {
  text-align: center;
}

.edit-btn {
  background: #2D81FF;
  color: white;
  border: none;
  border-radius: 20rpx;
  padding: 20rpx 40rpx;
  font-size: 30rpx;
  min-width: 200rpx;
}

/* 列表样式 */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.list-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.add-btn {
  background: #2D81FF;
  color: white;
  font-size: 24rpx;
  padding: 10rpx 20rpx;
  border-radius: 10rpx;
  margin: 0;
}

.community-item {
  background: white;
  padding: 30rpx;
  border-radius: 15rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.item-address {
  font-size: 24rpx;
  color: #999;
}

.arrow {
  color: #ccc;
}

.back-bar {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
  color: #2D81FF;
  font-size: 28rpx;
}

.back-icon {
  margin-right: 10rpx;
  font-size: 36rpx;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 50rpx;
}
</style>
