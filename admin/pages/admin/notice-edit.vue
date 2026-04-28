<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    :pageTitle="isEdit ? '编辑公告' : '发布公告'"
    currentPage="/admin/pages/admin/notice-manage"
    :pageBreadcrumb="isEdit ? '管理后台 / 公告管理 / 编辑公告' : '管理后台 / 公告管理 / 发布公告'"
    :showPageBanner="false"
  >
    <view class="edit-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">{{ isEdit ? '公告编辑' : '公告发布' }}</text>
          <text class="overview-subtitle">统一使用后台表单页结构，保留草稿保存、正式发布、过期时间和超管社区投放能力。</text>
        </view>

        <view class="overview-chip">
          <text class="overview-chip-label">当前状态</text>
          <text class="overview-chip-value">{{ isEdit ? '编辑中' : '新建中' }}</text>
        </view>
      </view>

      <view class="form-card">
        <view class="form-grid">
          <view class="form-field form-field-wide">
            <text class="form-label required">公告标题</text>
            <input
              v-model="form.title"
              class="form-input"
              type="text"
              placeholder="请输入公告标题"
            />
          </view>

          <view class="form-field form-field-wide">
            <text class="form-label required">公告内容</text>
            <textarea
              v-model="form.content"
              class="form-textarea notice-textarea"
              maxlength="-1"
              placeholder="请输入公告详细内容"
            ></textarea>
          </view>

          <view class="form-field">
            <text class="form-label">过期日期</text>
            <picker mode="date" :start="startDate" @change="handleDateChange">
              <view class="picker-box" :class="{ 'has-val': !!form.expireDate }">
                <text>{{ form.expireDate || '请选择日期' }}</text>
                <text class="picker-icon">></text>
              </view>
            </picker>
            <text class="field-tip">设置过期后，业主端将不再显示此公告。</text>
          </view>

          <view class="form-field">
            <text class="form-label">过期时间</text>
            <picker mode="time" :disabled="!form.expireDate" @change="handleTimeChange">
              <view class="picker-box" :class="{ 'has-val': !!form.expireDate }">
                <text>{{ form.expireTimeVal }}</text>
                <text class="picker-icon">></text>
              </view>
            </picker>
            <text class="field-tip">{{ form.expireDate ? '默认精确到分钟。' : '请先选择过期日期。' }}</text>
          </view>

          <view v-if="isSuperAdmin" class="form-field">
            <text class="form-label required">发布社区</text>
            <picker mode="selector" :range="communityList" range-key="name" @change="handleCommunityChange">
              <view class="picker-box" :class="{ 'has-val': !!selectedCommunityName }">
                <text>{{ selectedCommunityName || '请选择发布社区' }}</text>
                <text class="picker-icon">></text>
              </view>
            </picker>
          </view>

          <view v-else class="form-field">
            <text class="form-label">发布范围</text>
            <view class="picker-box has-val">
              <text>当前社区</text>
            </view>
          </view>

          <view class="form-field switch-row">
            <text class="field-label">置顶公告</text>
            <switch
              :checked="form.topFlag"
              color="#2D81FF"
              style="transform:scale(0.82)"
              @change="form.topFlag = $event.detail.value"
            />
          </view>
        </view>
      </view>

      <view class="action-bar-card">
        <button class="ghost-btn" @click="handleCancel">取消</button>
        <button class="warn-btn" @click="handleSaveDraft">存为草稿</button>
        <button class="primary-btn" @click="handlePublish">{{ isEdit ? '保存并发布' : '立即发布' }}</button>
      </view>
    </view>
  </admin-sidebar>
</template>

<script>
import request from '@/utils/request'
import adminSidebar from '@/admin/components/admin-sidebar/admin-sidebar'

export default {
  components: { adminSidebar },
  data() {
    return {
      showSidebar: false,
      isEdit: false,
      noticeId: null,
      isSuperAdmin: false,
      communityList: [],
      selectedCommunityId: '',
      selectedCommunityName: '',
      form: {
        title: '',
        content: '',
        topFlag: false,
        expireDate: '',
        expireTimeVal: '23:59',
        publishStatus: 'DRAFT'
      },
      initialSnapshot: ''
    }
  },
  computed: {
    startDate() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  },
  onLoad(options) {
    if (options.noticeId) {
      this.isEdit = true
      this.noticeId = options.noticeId
      this.loadNoticeDetail()
    } else {
      this.initialSnapshot = this.getFormSnapshot()
    }
    const userInfo = uni.getStorageSync('userInfo')
    this.isSuperAdmin = !!(userInfo && userInfo.role === 'super_admin')
    if (this.isSuperAdmin) {
      this.loadCommunityList()
    }
  },
  methods: {
    async loadCommunityList() {
      try {
        const data = await request('/api/house/community/all', {}, 'GET')
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : [])
        this.communityList = list
      } catch (error) {
        console.error('社区列表加载失败', error)
        this.communityList = []
      }
    },
    handleCommunityChange(e) {
      const index = Number(e.detail.value)
      const item = this.communityList[index]
      if (item) {
        this.selectedCommunityId = item.id
        this.selectedCommunityName = item.name
      }
    },
    async loadNoticeDetail() {
      try {
        uni.showLoading({ title: '加载中...' })
        const res = await request(`/api/notice/${this.noticeId}`, {}, 'GET')
        this.form.title = res.title || ''
        this.form.content = res.content || ''
        this.form.topFlag = !!res.topFlag
        this.form.publishStatus = res.publishStatus || 'DRAFT'
        if (res.expireTime) {
          const normalized = String(res.expireTime).replace(' ', 'T')
          const [datePart, timePart = '23:59:00'] = normalized.split('T')
          this.form.expireDate = datePart
          this.form.expireTimeVal = timePart.slice(0, 5)
        }
        if (res.communityId && res.communityName) {
          this.selectedCommunityId = res.communityId
          this.selectedCommunityName = res.communityName
        }
      } catch (error) {
        console.error('公告详情加载失败', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        uni.hideLoading()
        this.initialSnapshot = this.getFormSnapshot()
      }
    },
    handleDateChange(e) {
      this.form.expireDate = e.detail.value
    },
    handleTimeChange(e) {
      this.form.expireTimeVal = e.detail.value
    },
    handleCancel() {
      if (!this.hasUnsavedChanges()) {
        uni.navigateBack()
        return
      }
      uni.showModal({
        title: '保存为草稿',
        content: '是否保存为草稿并退出？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await this.handleSaveDraft()
            } finally {
              uni.navigateBack()
            }
          } else {
            uni.navigateBack()
          }
        }
      })
    },
    getFormSnapshot() {
      const { title, content, topFlag, expireDate, expireTimeVal } = this.form
      return JSON.stringify({ title, content, topFlag, expireDate, expireTimeVal })
    },
    hasUnsavedChanges() {
      return this.initialSnapshot !== this.getFormSnapshot()
    },
    async handleSubmit(status = 'PUBLISHED') {
      if (!this.form.title.trim()) {
        uni.showToast({ title: '请输入标题', icon: 'none' })
        return
      }
      if (!this.form.content.trim()) {
        uni.showToast({ title: '请输入内容', icon: 'none' })
        return
      }
      if (this.isSuperAdmin && !this.selectedCommunityId) {
        uni.showToast({ title: '请选择发布社区', icon: 'none' })
        return
      }
      const userInfo = uni.getStorageSync('userInfo')
      uni.showLoading({ title: '提交中...', mask: true })
      try {
        const dto = {
          title: this.form.title,
          content: this.form.content,
          topFlag: this.form.topFlag,
          targetType: 'COMMUNITY',
          communityId: this.isSuperAdmin ? Number(this.selectedCommunityId) : undefined,
          publishStatus: status,
          expireTime: this.form.expireDate ? `${this.form.expireDate}T${this.form.expireTimeVal}:00` : null
        }
        const userId = userInfo && (userInfo.id || userInfo.userId)
        let targetId = this.noticeId
        if (this.isEdit) {
          try {
            await request(`/api/notice/${this.noticeId}`, {
              data: dto,
              params: { userId }
            }, 'PUT')
          } catch (updateError) {
            console.error('更新公告失败', updateError)
          }
        } else {
          try {
            const res = await request('/api/notice', {
              data: dto,
              params: { userId }
            }, 'POST')
            targetId = (res && typeof res === 'object' && (res.id || res.noticeId)) ? (res.id || res.noticeId) : res
          } catch (createError) {
            console.error('创建公告失败', createError)
          }
        }
        if (status === 'PUBLISHED' && this.isEdit && targetId) {
          try {
            const expireDto = {
              noticeIds: [Number(targetId)],
              expireType: this.form.expireDate ? 'CUSTOM' : 'NEVER',
              customExpireTime: this.form.expireDate ? `${this.form.expireDate}T${this.form.expireTimeVal}:00` : null,
              days: null
            }
            await request('/api/notice/expire/batch', {
              data: expireDto,
              params: { userId }
            }, 'POST')
          } catch (expireError) {
            console.error('设置过期时间失败', expireError)
            if (this.form.expireDate) {
              uni.showToast({
                title: '公告已更新，但过期时间设置失败',
                icon: 'none',
                duration: 2000
              })
            }
          }
        }
        uni.showToast({ title: '操作成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      } catch (error) {
        console.error('提交失败', error)
        uni.showToast({ title: error.message || '操作失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    async handleSaveDraft() {
      this.form.publishStatus = 'DRAFT'
      await this.handleSubmit('DRAFT')
    },
    async handlePublish() {
      this.form.publishStatus = 'PUBLISHED'
      await this.handleSubmit('PUBLISHED')
    }
  }
}
</script>

<style scoped src="../../styles/admin-form-page.css"></style>
<style scoped>
.notice-textarea {
  min-height: 300rpx;
}
</style>
