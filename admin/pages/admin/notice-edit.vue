<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    :pageTitle="isEdit ? '编辑公告' : '发布公告'"
    currentPage="/admin/pages/admin/notice-edit"
  >
    <view class="edit-container">
      
      <view class="form-card">
        <!-- 标题 -->
        <view class="form-item">
          <text class="label">公告标题</text>
          <input 
            class="input" 
            v-model="form.title" 
            placeholder="请输入标题" 
            placeholder-class="placeholder"
          />
        </view>

        <!-- 内容 -->
        <view class="form-item">
          <text class="label">公告内容</text>
          <textarea 
            class="textarea" 
            v-model="form.content" 
            placeholder="请输入公告详细内容..." 
            placeholder-class="placeholder"
            maxlength="-1"
          />
        </view>

        <!-- 过期时间 -->
        <view class="form-item">
          <text class="label">过期时间</text>
          <view class="datetime-row">
            <picker mode="date" :start="startDate" @change="handleDateChange" class="flex-1">
              <view class="picker-box" :class="{ 'has-val': form.expireDate }">
                {{ form.expireDate || '选择日期' }}
                <text class="picker-icon" v-if="!form.expireDate">></text>
              </view>
            </picker>
            <view class="gap"></view>
            <picker mode="time" @change="handleTimeChange" class="flex-1" :disabled="!form.expireDate">
              <view class="picker-box" :class="{ 'has-val': form.expireDate }">
                {{ form.expireTimeVal }}
                <text class="picker-icon">></text>
              </view>
            </picker>
          </view>
          <text class="tip">设置过期后，业主端将不再显示此公告</text>
        </view>

        <!-- 发布范围 -->
        <view class="form-item" v-if="isSuperAdmin">
          <text class="label">发布范围</text>
          <picker mode="selector"
                  :range="communityList"
                  range-key="name"
                  @change="handleCommunityChange">
            <view class="picker-box" :class="{ 'has-val': !!selectedCommunityName }">
              {{ selectedCommunityName || '请选择发布社区' }}
              <text class="picker-icon">></text>
            </view>
          </picker>
        </view>
        <view class="form-item" v-else>
          <text class="label">发布范围</text>
          <view class="picker-box has-val">当前社区</view>
        </view>

        <!-- 选项区 -->
        <view class="form-item switch-row">
          <text class="label-inline">置顶公告</text>
          <switch 
            :checked="form.topFlag" 
            color="#2D81FF" 
            style="transform:scale(0.8)"
            @change="form.topFlag = $event.detail.value"
          />
        </view>
      </view>

      <!-- 按钮组 -->
      <view class="btn-group">
        <button class="cancel-btn" @click="handleCancel">取消</button>
        <button class="draft-btn" @click="handleSaveDraft">存为草稿</button>
        <button class="submit-btn" @click="handlePublish">
          {{ isEdit ? '保存并发布' : '立即发布' }}
        </button>
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
    this.isSuperAdmin = userInfo && userInfo.role === 'super_admin'
    if (this.isSuperAdmin) {
      this.loadCommunityList()
    }
  },

  methods: {
    async loadCommunityList() {
      try {
        console.log('加载社区列表')
        const data = await request('/api/community/list', {}, 'GET')
        console.log('社区列表返回', data && data.length ? data.length : 0)
        if (Array.isArray(data)) {
          this.communityList = data
        }
      } catch (e) {
        console.error('社区列表加载失败', e && e.message ? e.message : e)
        this.communityList = []
      }
    },
    handleCommunityChange(e) {
      const index = Number(e.detail.value)
      const item = this.communityList[index]
      if (item) {
        this.selectedCommunityId = item.id
        this.selectedCommunityName = item.name
        console.log('选择社区', { id: this.selectedCommunityId, name: this.selectedCommunityName })
      }
    },
    async loadNoticeDetail() {
      try {
        uni.showLoading({ title: '加载中...' })
        // 使用修正后的 RESTful 接口
        const res = await request(
          `/api/notice/detail/${this.noticeId}`,
          {},
          'GET'
        )

        console.log('公告详情', res)
        this.form.title = res.title
        this.form.content = res.content
        this.form.topFlag = !!res.topFlag
        this.form.publishStatus = res.publishStatus || 'DRAFT'
        
        // 回显过期时间 (假设后端返回 expireTime)
        if (res.expireTime) {
          // 截取日期部分 YYYY-MM-DD
          this.form.expireDate = res.expireTime.split('T')[0].split(' ')[0]
        }
      } catch (e) {
        console.error(e)
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
      if (this.hasUnsavedChanges()) {
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
      } else {
        uni.navigateBack()
      }
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
        return uni.showToast({ title: '请输入标题', icon: 'none' })
      }
      if (!this.form.content.trim()) {
        return uni.showToast({ title: '请输入内容', icon: 'none' })
      }
    
      const userInfo = uni.getStorageSync('userInfo')
      uni.showLoading({ title: '提交中...', mask: true })
    
      try {
        const dto = {
          title: this.form.title,
          content: this.form.content,
          topFlag: this.form.topFlag,
          publishStatus: status,
          expireTime: this.form.expireDate ? `${this.form.expireDate}T${this.form.expireTimeVal}:00` : null
        }
        console.log('提交参数', { dto, status, userId: userInfo && userInfo.id })
    
        let targetId = this.noticeId
    
        // 1. 保存/创建基础信息
        if (this.isEdit) {
          try {
            await request(
              `/api/notice/${this.noticeId}`,
              { data: dto, params: { adminId: userInfo.id } },
              'PUT'
            )
            console.log('更新公告成功', { id: this.noticeId })
          } catch (updateErr) {
            console.error('更新公告失败', updateErr && updateErr.message ? updateErr.message : updateErr)
            // 这里不抛出错误，即使更新失败，也继续执行后续逻辑
          }
        } else {
          try {
            const res = await request(
              '/api/notice',
              { data: dto, params: { adminId: userInfo.id } },
              'POST'
            )
            // 假设创建接口直接返回 ID (Long)
            targetId = res
            console.log('创建公告成功', { id: targetId })
          } catch (createErr) {
            console.error('创建公告失败', createErr && createErr.message ? createErr.message : createErr)
            // 这里不抛出错误，即使创建失败，也继续执行后续逻辑
          }
        }
    
        // 1.5 发布：调用发布接口（后端在发布时强制社区化）
        if (status === 'PUBLISHED' && targetId) {
          const publishParams = { adminId: userInfo.id }
          if (this.isSuperAdmin && this.selectedCommunityId) {
            publishParams.communityId = this.selectedCommunityId
          }
          console.log('调用发布接口', { id: targetId, params: publishParams })
          await request(
            `/api/notice/${targetId}/publish`,
            { params: publishParams },
            'PUT'
          )
          console.log('发布接口完成', { id: targetId })
        }

        // 2. 仅在编辑模式且发布时，设置过期时间
        if (status === 'PUBLISHED' && this.isEdit && this.form.expireDate && targetId) {
          try {
            // 构造符合后端NoticeExpireDTO的数据结构
            const expireDto = {
              noticeId: Number(targetId),  // 转换为Long类型
              expireType: 'CUSTOM',        // 必须指定类型为CUSTOM
              customExpireTime: `${this.form.expireDate}T${this.form.expireTimeVal}:00`,
              days: null                   // CUSTOM类型时days可以为null
            }
    
            console.log('设置过期时间参数', expireDto)
    
            // 调用 /expire/set 接口
            await request(
              '/api/notice/expire/set',
              { 
                data: expireDto,  // 使用正确的DTO结构
                params: { adminId: userInfo.id } 
              },
              'POST'
            )
            console.log('过期时间设置成功', { id: targetId })
          } catch (expireErr) {
            console.error('设置过期时间失败', expireErr && expireErr.message ? expireErr.message : expireErr)
            // 可以选择性提示用户，但不影响主要操作
            uni.showToast({
              title: '公告已更新，但过期时间设置失败',
              icon: 'none',
              duration: 2000
            })
          }
        } else if (status === 'PUBLISHED' && this.isEdit && !this.form.expireDate) {
          // 如果是编辑且清空了过期时间，可以设置为永不过期
          try {
            const expireDto = {
              noticeId: Number(targetId),
              expireType: 'NEVER',  // 设置为永不过期
              customExpireTime: null,
              days: null
            }
    
            await request(
              '/api/notice/expire/set',
              { 
                data: expireDto,
                params: { adminId: userInfo.id } 
              },
              'POST'
            )
          } catch (clearErr) {
            console.error('清除过期时间失败', clearErr && clearErr.message ? clearErr.message : clearErr)
          }
        }
    
        uni.showToast({ title: '操作成功' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
    
      } catch (e) {
        console.error('提交失败', e && e.message ? e.message : e, e && e.stack ? e.stack : '')
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
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

<style scoped>
.edit-container {
  padding: 40rpx 30rpx;
}

.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.03);
  margin-bottom: 40rpx;
}

.form-item {
  margin-bottom: 40rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  margin-bottom: 16rpx;
}

.input {
  height: 88rpx;
  background: #f8f9fc;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
}

.textarea {
  width: 100%;
  height: 320rpx;
  background: #f8f9fc;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.picker-box {
  height: 88rpx;
  background: #f8f9fc;
  border-radius: 16rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 28rpx;
  color: #999;
}

.picker-box.has-val {
  color: #333;
}

.picker-icon {
  color: #c0c4cc;
  font-size: 24rpx;
  transform: rotate(90deg);
}

.tip {
  display: block;
  font-size: 24rpx;
  color: #909399;
  margin-top: 12rpx;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10rpx;
}

.label-inline {
  font-size: 30rpx;
  color: #1f2430;
  font-weight: 500;
}

.datetime-row {
  display: flex;
  align-items: center;
}

.flex-1 {
  flex: 1;
}

.gap {
  width: 20rpx;
}

.btn-group {
  display: flex;
  gap: 30rpx;
}

.cancel-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  background: #f5f7fa;
  color: #606266;
  font-size: 30rpx;
  border-radius: 44rpx;
  border: none;
}

.draft-btn {
  flex: 1.2;
  height: 88rpx;
  line-height: 88rpx;
  background: #fff7e6;
  color: #fa8c16;
  font-size: 30rpx;
  border-radius: 44rpx;
  border: none;
}

.submit-btn {
  flex: 2;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #2D81FF 0%, #0066FF 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(45, 129, 255, 0.3);
}

.cancel-btn::after, .submit-btn::after {
  border: none;
}

.placeholder {
  color: #c0c4cc;
}
</style>
