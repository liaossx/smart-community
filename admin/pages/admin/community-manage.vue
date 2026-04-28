<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="社区管理"
    currentPage="/admin/pages/admin/community-manage"
    pageBreadcrumb="管理后台 / 社区管理"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">{{ isSuperAdmin && !currentCommunityId ? '社区列表' : '社区详情' }}</text>
          <text class="overview-subtitle">统一为后台信息页结构，支持超级管理员切换社区，普通管理员直接查看当前社区。</text>
        </view>

        <button v-if="isSuperAdmin && currentCommunityId" class="back-btn" @click="backToList">返回列表</button>
        <button v-else-if="isSuperAdmin" class="primary-action-btn" @click="handleAddCommunity">新增社区</button>
        <view v-else class="overview-chip">
          <text class="overview-chip-label">当前身份</text>
          <text class="overview-chip-value">社区管理员</text>
        </view>
      </view>

      <template v-if="isSuperAdmin && !currentCommunityId">
        <view class="query-panel">
          <view class="query-grid community-query-grid">
            <view class="query-field query-field-wide">
              <text class="query-label">关键词</text>
              <input
                v-model="searchQuery"
                class="query-input"
                type="text"
                placeholder="按社区名称或地址筛选"
              />
            </view>
          </view>

          <view class="query-actions">
            <button class="query-btn primary" @click="loadCommunityList">刷新</button>
            <button class="query-btn secondary" @click="searchQuery = ''">清空</button>
          </view>
        </view>

        <view class="table-toolbar">
          <view class="toolbar-left-group">
            <text class="toolbar-meta">共 {{ filteredCommunityList.length }} 个社区</text>
          </view>
        </view>

        <view class="table-panel">
          <view class="table-head community-table">
            <text class="table-col col-name">社区名称</text>
            <text class="table-col col-address">社区地址</text>
            <text class="table-col col-actions">操作</text>
          </view>

          <view
            v-for="(item, index) in filteredCommunityList"
            :key="item.id || index"
            class="table-row community-table"
            :style="{ animationDelay: `${Math.min(320, index * 40)}ms` }"
          >
            <view class="table-col col-name">
              <text class="primary-text">{{ item.name }}</text>
            </view>

            <view class="table-col col-address">
              <text class="desc-text">{{ item.address || '-' }}</text>
            </view>

            <view class="table-col col-actions row-actions">
              <button class="row-btn primary" @click="selectCommunity(item)">查看详情</button>
            </view>
          </view>

          <view v-if="filteredCommunityList.length === 0" class="empty-state">
            <text>暂无社区数据</text>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="status-summary-bar community-summary-bar">
          <view class="status-summary-card summary-blue">
            <text class="summary-label">总户数</text>
            <text class="summary-value">{{ communityInfo.totalHouses || 0 }}</text>
          </view>
          <view class="status-summary-card summary-green">
            <text class="summary-label">绿化率</text>
            <text class="summary-value">{{ communityInfo.greenRate || 0 }}%</text>
          </view>
          <view class="status-summary-card summary-orange">
            <text class="summary-label">停车位</text>
            <text class="summary-value">{{ communityInfo.totalParkings || 0 }}</text>
          </view>
          <view class="status-summary-card summary-purple">
            <text class="summary-label">物业费</text>
            <text class="summary-value">¥{{ communityInfo.propertyFee || 0 }}</text>
          </view>
        </view>

        <view class="form-card detail-card">
          <view class="detail-grid">
            <view class="detail-entry">
              <text class="detail-key">社区名称</text>
              <text class="detail-text">{{ communityInfo.name || '-' }}</text>
            </view>
            <view class="detail-entry">
              <text class="detail-key">社区地址</text>
              <text class="detail-text">{{ communityInfo.address || '-' }}</text>
            </view>
            <view class="detail-entry">
              <text class="detail-key">总户数</text>
              <text class="detail-text">{{ communityInfo.totalHouses || 0 }}</text>
            </view>
            <view class="detail-entry">
              <text class="detail-key">绿化率</text>
              <text class="detail-text">{{ communityInfo.greenRate || 0 }}%</text>
            </view>
            <view class="detail-entry">
              <text class="detail-key">停车位总数</text>
              <text class="detail-text">{{ communityInfo.totalParkings || 0 }}</text>
            </view>
            <view class="detail-entry">
              <text class="detail-key">物业管理费</text>
              <text class="detail-text">¥{{ communityInfo.propertyFee || 0 }}/月</text>
            </view>
          </view>
        </view>

        <view class="action-bar-card">
          <button class="primary-btn" @click="handleEditCommunity">编辑社区信息</button>
        </view>
      </template>
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
      showSidebar: false,
      isSuperAdmin: false,
      searchQuery: '',
      communityInfo: {
        name: '智慧社区',
        address: '北京市朝阳区智慧路1号',
        totalHouses: 500,
        greenRate: 35,
        totalParkings: 800,
        propertyFee: 3.5
      },
      communityList: [],
      currentCommunityId: null
    }
  },
  computed: {
    filteredCommunityList() {
      const keyword = this.searchQuery.trim().toLowerCase()
      if (!keyword) return this.communityList
      return this.communityList.filter(item => {
        const haystack = `${item.name || ''} ${item.address || ''}`.toLowerCase()
        return haystack.includes(keyword)
      })
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
        const data = await request('/api/house/community/list', {}, 'GET')
        if (Array.isArray(data)) {
          this.communityList = data
          return
        }
        if (Array.isArray(data?.records)) {
          this.communityList = data.records
          return
        }
        throw new Error('社区列表结构异常')
      } catch (error) {
        console.log('加载社区列表失败，回退到演示数据', error)
        this.communityList = [
          { id: 1, name: '智慧社区A区', address: '北京市朝阳区智慧路1号' },
          { id: 2, name: '幸福家园B区', address: '北京市海淀区幸福路8号' },
          { id: 3, name: '阳光花园C区', address: '上海市浦东新区阳光大道99号' }
        ]
      }
    },
    async loadCommunityInfo(id) {
      try {
        let url = '/api/community/info'
        if (this.isSuperAdmin && id) {
          url = `/api/community/${id}`
        }
        const data = await request(url, {}, 'GET')
        if (data) {
          this.communityInfo = {
            ...this.communityInfo,
            ...data
          }
          return
        }
        throw new Error('社区详情为空')
      } catch (error) {
        console.error('加载社区信息失败:', error)
        if (this.isSuperAdmin && id) {
          const selected = this.communityList.find(item => item.id === id)
          if (selected) {
            this.communityInfo = {
              ...this.communityInfo,
              ...selected,
              totalHouses: selected.totalHouses || 0,
              greenRate: selected.greenRate || 0,
              totalParkings: selected.totalParkings || 0,
              propertyFee: selected.propertyFee || 0
            }
          }
        } else {
          uni.showToast({
            title: error?.message || '加载失败',
            icon: 'none'
          })
        }
      }
    },
    selectCommunity(item) {
      this.currentCommunityId = item.id
      this.loadCommunityInfo(item.id)
    },
    backToList() {
      this.currentCommunityId = null
      this.communityInfo = {}
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

<style scoped src="../../styles/admin-table-page.css"></style>
<style scoped src="../../styles/admin-form-page.css"></style>
<style scoped>
.community-query-grid {
  grid-template-columns: 1fr;
}

.community-table {
  grid-template-columns: 240rpx 1fr 180rpx;
}

.community-summary-bar {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-blue {
  background: linear-gradient(180deg, #fff 0%, #eef5ff 100%);
}

.summary-green {
  background: linear-gradient(180deg, #fff 0%, #eefaf4 100%);
}

.summary-orange {
  background: linear-gradient(180deg, #fff 0%, #fff8e8 100%);
}

.summary-purple {
  background: linear-gradient(180deg, #fff 0%, #f7f1ff 100%);
}

.detail-card {
  margin-bottom: 20rpx;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.detail-entry {
  border-radius: 16rpx;
  border: 1rpx solid #e8eef6;
  background: #fbfdff;
  padding: 22rpx 24rpx;
}

.detail-key {
  display: block;
  font-size: 22rpx;
  color: #7f90a2;
}

.detail-text {
  display: block;
  margin-top: 10rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #24384e;
}
</style>
