<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    :pageTitle="activityId ? '编辑活动' : '发布活动'"
    currentPage="/admin/pages/admin/activity-manage"
    :pageBreadcrumb="activityId ? '管理后台 / 社区活动 / 编辑活动' : '管理后台 / 社区活动 / 发布活动'"
    :showPageBanner="false"
  >
    <view class="edit-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">{{ activityId ? '活动编辑' : '活动发布' }}</text>
          <text class="overview-subtitle">统一使用后台表单页结构，保留草稿保存和正式发布流程。</text>
        </view>

        <view class="overview-chip">
          <text class="overview-chip-label">当前模式</text>
          <text class="overview-chip-value">{{ activityId ? '编辑中' : '新建中' }}</text>
        </view>
      </view>

      <view class="form-card">
        <view class="form-grid">
          <view class="form-field form-field-wide">
            <text class="form-label required">活动标题</text>
            <input class="form-input" v-model="form.title" placeholder="请输入活动标题" />
          </view>

          <view class="form-field">
            <text class="form-label required">活动日期</text>
            <picker mode="date" @change="bindDateChange">
              <view class="picker-box" :class="{ 'has-val': !!form.date }">
                <text>{{ form.date || '请选择日期' }}</text>
                <text class="picker-icon">></text>
              </view>
            </picker>
          </view>

          <view class="form-field">
            <text class="form-label">活动时间</text>
            <picker mode="time" @change="bindTimeChange">
              <view class="picker-box" :class="{ 'has-val': !!form.time }">
                <text>{{ form.time || '请选择时间' }}</text>
                <text class="picker-icon">></text>
              </view>
            </picker>
          </view>

          <view class="form-field">
            <text class="form-label required">活动地点</text>
            <input class="form-input" v-model="form.location" placeholder="请输入活动地点" />
          </view>

          <view class="form-field">
            <text class="form-label">最大报名人数</text>
            <input class="form-input" type="number" v-model="form.maxCount" placeholder="0 表示不限" />
          </view>

          <view class="form-field form-field-wide">
            <text class="form-label">活动详情</text>
            <textarea class="form-textarea" v-model="form.content" placeholder="请输入活动详情描述"></textarea>
            <text class="field-tip">发布时间将按后端返回状态进行管理，编辑时沿用当前活动 ID。</text>
          </view>
        </view>
      </view>

      <view class="action-bar-card">
        <button class="warn-btn" @click="handleDraft">存为草稿</button>
        <button class="primary-btn" @click="handlePublishCheck">{{ activityId ? '保存并发布' : '立即发布' }}</button>
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
      showSidebar: false,
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
    }
  },
  methods: {
    async loadActivityData(id) {
      try {
        uni.showLoading({ title: '加载中...' })
        const res = await request(`/api/activity/${id}`, {}, 'GET')
        if (res) {
          const source = String(res.startTime || '').replace(' ', 'T')
          const [date, time] = source.split('T')
          this.form = {
            title: res.title || '',
            content: res.content || '',
            date: date || '',
            time: (time || '').slice(0, 5),
            location: res.location || '',
            maxCount: res.maxCount != null ? String(res.maxCount) : ''
          }
        }
      } catch (error) {
        console.error('加载活动失败', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        uni.hideLoading()
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
    buildStartTime() {
      let rawTime = this.form.time || '00:00'
      if (rawTime.length > 5) {
        rawTime = rawTime.substring(0, 5)
      }
      const cleanTime = `${rawTime}:00`
      const cleanDate = this.form.date.includes(' ') ? this.form.date.split(' ')[0] : this.form.date
      return `${cleanDate} ${cleanTime}`
    },
    async submitData(status) {
      try {
        uni.showLoading({ title: '提交中...' })
        const data = {
          id: this.activityId ? parseInt(this.activityId, 10) : undefined,
          title: this.form.title,
          content: this.form.content,
          startTime: this.buildStartTime(),
          location: this.form.location,
          maxCount: this.form.maxCount ? parseInt(this.form.maxCount, 10) : null,
          status,
          coverUrl: ''
        }

        if (this.activityId) {
          await request('/api/activity', data, 'PUT')
        } else {
          await request('/api/activity/publish', data, 'POST')
        }

        uni.showToast({
          title: status === 'DRAFT' ? '已存草稿' : '发布成功',
          icon: 'success'
        })

        setTimeout(() => {
          uni.navigateBack()
        }, 1200)
      } catch (error) {
        console.error('活动提交失败', error)
        uni.showToast({ title: '提交失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped src="../../styles/admin-form-page.css"></style>
