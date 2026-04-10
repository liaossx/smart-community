<template>
  <view class="page">
    <!-- 顶部标题和发帖按钮 -->
    <view class="section-header">
      <text class="section-title">热门话题</text>
      <text class="section-link" @tap="openPostModal">发帖</text>
    </view>

    <!-- 话题列表 -->
    <view v-for="topic in topics" :key="topic.id" class="topic-card">
      <view class="card-header" @tap="goDetail(topic.id)">
        <view>
          <text class="topic-title">{{ topic.title }}</text>
          <view class="topic-meta">
            {{ topic.author }} · {{ topic.time }}
          </view>
        </view>
        <text class="badge">{{ topic.category || '话题' }}</text>
      </view>

      <!-- 内容摘要/全文切换 -->
      <view class="topic-content" @tap.stop="toggleFullContent(topic)">
        <text :style="{ whiteSpace: 'pre-wrap' }">
          {{ topic.showFull ? topic.content : (topic.content.length > 200 ? topic.content.slice(0,200)+'...' : topic.content) }}
        </text>
        <text v-if="topic.content.length > 200" class="toggle-btn">
          {{ topic.showFull ? '收起' : '展开全文' }}
        </text>
      </view>

      <view class="topic-actions">
        <text 
          :class="likedTopics.includes(topic.id) ? 'liked' : 'like-btn'" 
          @tap.stop="likeTopic(topic)"
        >
          👍 {{ topic.likes }}
        </text>
        <text @tap.stop="toggleCommentInput(topic)">💬 {{ topic.comments }}</text>
      </view>

      <!-- 评论输入框 -->
      <view v-if="topic.showCommentInput" class="comment-box">
        <input v-model="topic.commentContent" placeholder="写评论..." />
        <button @tap="commentTopic(topic)">提交</button>
      </view>
    </view>

    <!-- 发帖弹窗 -->
    <view v-if="showPostModal" class="mask">
      <view class="dialog">
        <view class="dialog-title">发布话题</view>
    
        <!-- 可滚动内容区 -->
        <scroll-view class="dialog-body" scroll-y>
          <view class="form-item">
            <text class="label">标题</text>
            <input v-model="newTopic.title" placeholder="请输入标题" />
          </view>
    
          <view class="form-item">
            <text class="label">内容</text>
            <textarea
              v-model="newTopic.content"
              placeholder="请输入内容"
              maxlength="20000"
              auto-height
              class="content-textarea"
            />
          </view>
        </scroll-view>
    
        <!-- 固定在底部的按钮 -->
        <view class="dialog-actions">
          <button class="btn ghost" @tap="showPostModal = false">取消</button>
          <button class="btn primary" @tap="postTopic">发布</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js'

export default {
  data() {
    return {
      topics: [],
      likedTopics: [],   // 已点赞列表
      showPostModal: false,
      newTopic: { title: '', content: '', imageUrls: [] },
      userInfo: null
    }
  },
  onLoad() {
    // onLoad中移除调用，避免与onShow重复
  },
  onShow() {
    this.userInfo = uni.getStorageSync('userInfo') || {}
    if (!this.userInfo.id && this.userInfo.userId) {
      this.userInfo.id = this.userInfo.userId
    }
    this.loadTopics()
  },
  methods: {
    async loadTopics() {
      try {
        const user = uni.getStorageSync('userInfo') || {}
        if (!user?.communityId) {
          uni.showModal({
            title: '提示',
            content: '请先绑定房屋以查看本小区话题',
            showCancel: false,
            success: () => {
              uni.navigateTo({ url: '/owner/pages/mine/house-bind' })
            }
          })
          return
        }
        const data = await request({
          url: '/api/topic/list',
          method: 'GET',
          params: { pageNum: 1, pageSize: 10, status: 'APPROVED', communityId: user.communityId }
        })
        if (data?.records) {
          this.topics = data.records.map(t => ({
            id: t.id,
            title: t.title,
            author: t.authorName || '匿名',
            time: t.createTime ? new Date(t.createTime).toLocaleString() : '',
            content: t.content,
            likes: t.likeCount || 0,
            comments: t.commentCount || 0,
            showCommentInput: false,
            commentContent: '',
            showFull: false // 控制是否显示全文
          }))
        }
      } catch (e) {
        console.error('加载话题失败', e)
      }
    },

    likeTopic(topic) {
      if (!this.userInfo?.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (this.likedTopics.includes(topic.id)) {
        uni.showToast({ title: '您已点赞', icon: 'none' })
        return
      }
      request({
        url: `/api/topic/${topic.id}/like`,
        method: 'PUT',
        params: { userId: this.userInfo.id }
      }).then(res => {
        if (res === true) {
          topic.likes += 1
          this.likedTopics.push(topic.id)
        }
      }).catch(() => uni.showToast({ title: '点赞失败', icon: 'none' }))
    },

    toggleCommentInput(topic) {
      topic.showCommentInput = !topic.showCommentInput
    },

    commentTopic(topic) {
      if (!this.userInfo?.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (!topic.commentContent) {
        uni.showToast({ title: '请输入评论内容', icon: 'none' })
        return
      }
      request({
        url: `/api/topic/${topic.id}/comment`,
        method: 'POST',
        data: { userId: this.userInfo.id, content: topic.commentContent }
      }).then(res => {
        if (res) {
          topic.comments += 1
          topic.commentContent = ''
          topic.showCommentInput = false
          uni.showToast({ title: '评论成功', icon: 'success' })
        }
      }).catch(() => uni.showToast({ title: '评论失败', icon: 'none' }))
    },

    openPostModal() {
      this.newTopic = { title: '', content: '', imageUrls: [] }
      this.showPostModal = true
    },

    postTopic() {
      if (!this.userInfo?.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      const { title, content, imageUrls } = this.newTopic
      if (!title || !content) {
        uni.showToast({ title: '请填写标题和内容', icon: 'none' })
        return
      }
      request({
        url: '/api/topic',
        method: 'POST',
        data: { userId: this.userInfo.id, title, content, imageUrls }
      }).then(res => {
        if (res) {
          uni.showToast({ title: '发布成功，等待审核', icon: 'success' })
          this.showPostModal = false
          this.loadTopics()
        }
      }).catch(() => uni.showToast({ title: '发布失败', icon: 'none' }))
    },

    toggleFullContent(topic) {
      topic.showFull = !topic.showFull
    },

    goDetail(topicId) {
      uni.navigateTo({
        url: `/owner/pages/topic/detail?id=${topicId}`
      })
    }
  }
}
</script>

<style scoped>
.mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.dialog {
  width: 90%;
  max-height: 80vh;        /* 弹窗最大高度 */
  background: #fff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.dialog-title {
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}

.dialog-body {
  flex: 1;                 /* 占据中间空间 */
  padding: 16px;
  overflow: hidden;
}

.form-item {
  margin-bottom: 16px;
}

.label {
  display: block;
  margin-bottom: 6px;
  color: #555;
}

.content-textarea {
  width: 100%;
  min-height: 120px;
  max-height: 300px;       /* 🔴 限制 textarea 最大高度 */
  box-sizing: border-box;
}

.dialog-actions {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #eee;
}
.topic-content {
	  line-height: 1.6;
	  color: #555;
	  margin: 8px 0;
	}
	
.toggle-btn {
	  color: #409eff;
	  font-size: 12px;
	  margin-left: 5px;
	}
	
.topic-card {
	  padding: 12px;
	  border-bottom: 1px solid #eee;
	}
	
.topic-actions {
	  display: flex;
	  gap: 15px;
	  margin-top: 6px;
	}
	
.liked {
	  color: #409eff;
	}

.page {
  padding: 20rpx;
  background: #f5f6fa;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.section-title { font-size: 32rpx; font-weight: bold; }
.section-link { color: #2d81ff; font-size: 28rpx; }

.topic-card {
  background: #fff;
  padding: 20rpx;
  margin-bottom: 20rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
}
.card-header { display: flex; justify-content: space-between; align-items: center; }
.topic-title { font-size: 30rpx; font-weight: 600; }
.topic-meta { font-size: 24rpx; color: #7a7e8a; margin-top: 6rpx; }
.badge { font-size: 24rpx; color: #ff7a45; background: rgba(255,122,69,0.16); padding: 4rpx 12rpx; border-radius: 999rpx; }

.topic-content { margin-top: 16rpx; font-size: 28rpx; color: #44495a; line-height: 1.6; }
.topic-actions { margin-top: 16rpx; display: flex; gap: 24rpx; font-size: 26rpx; color: #7a7e8a; }
.like-btn { cursor: pointer; color: #2d81ff; }
.liked { cursor: default; color: #999; }

.comment-box { margin-top: 10rpx; display: flex; gap: 10rpx; }
.comment-box input { flex: 1; padding: 6rpx; border: 1rpx solid #ccc; border-radius: 8rpx; }
.comment-box button { padding: 6rpx 12rpx; background: #2d81ff; color: #fff; border-radius: 8rpx; }

.mask {
  position: fixed; top:0; left:0; width:100%; height:100%;
  background: rgba(0,0,0,0.5); display: flex; justify-content:center; align-items:center;
}
.dialog {
  width: 90%; background: #fff; border-radius: 20rpx; padding: 20rpx;
}
.dialog-title { font-size: 32rpx; font-weight: 600; margin-bottom: 20rpx; }
.form-item { margin-bottom: 16rpx; }
.label { font-size: 26rpx; margin-bottom: 6rpx; display:block; }
input, textarea { width: 100%; padding: 10rpx; border: 1rpx solid #ccc; border-radius: 12rpx; }
textarea { min-height: 100rpx; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 12rpx; }
.btn { padding: 10rpx 20rpx; border-radius: 12rpx; font-size: 28rpx; }
.btn.primary { background: #2d81ff; color: #fff; }
.btn.ghost { background: #fff; color: #2d81ff; border: 1rpx solid #2d81ff; }
</style>
