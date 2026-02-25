<template>
  <view class="page">
    <!-- 顶部标题和发帖按钮 -->
    <view class="section-header">
      <text class="section-title">热门话题</text>
      <text class="section-link" @tap="openPostModal">发帖</text>
    </view>

    <!-- 话题列表 -->
    <view v-for="topic in topics" :key="topic.id" class="topic-card" @tap="goDetail(topic.id)">
      <view class="card-header">
        <view>
          <text class="topic-title">{{ topic.title }}</text>
          <view class="topic-meta">
            {{ topic.author }} · {{ topic.time }}
          </view>
        </view>
        <text class="badge">{{ topic.category || '话题' }}</text>
      </view>

      <!-- 摘要 -->
      <view class="topic-content">
        {{ topic.content }}
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
        <button @tap.stop="commentTopic(topic)">提交</button>
      </view>
    </view>

    <!-- 发帖弹窗 -->
    <view v-if="showPostModal" class="mask">
      <view class="dialog">
        <view class="dialog-title">发布话题</view>
        <view class="form-item">
          <text class="label">标题</text>
          <input v-model="newTopic.title" placeholder="请输入标题" />
        </view>
        <view class="form-item">
          <text class="label">内容</text>
          <textarea v-model="newTopic.content" placeholder="请输入内容" auto-height maxlength="-1" class="post-textarea"></textarea>
        </view>
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
      likedTopics: [],
      showPostModal: false,
      newTopic: { title: '', content: '', imageUrls: [] },
      userInfo: null
    }
  },
  onLoad() {
    this.loadTopics()
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
        const res = await request({
          url: '/api/topic/list',
          method: 'GET',
          params: { pageNum: 1, pageSize: 20, status: 'APPROVED' }
        })
        if (res?.records) {
          this.topics = res.records.map(t => ({
            id: t.id,
            title: t.title,
            author: t.authorName || '匿名',
            time: t.createTime ? new Date(t.createTime).toLocaleString() : '',
            content: t.content,
            likes: t.likeCount || 0,
            comments: t.commentCount || 0,
            showCommentInput: false,
            commentContent: ''
          }))
        }
      } catch (e) {
        console.error('加载话题失败', e)
      }
    },

    goDetail(id) {
      uni.navigateTo({
        url: `/pages/topic/detail?id=${id}`
      })
    },

    likeTopic(topic) {
      if (!this.userInfo?.id) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (this.likedTopics.includes(topic.id)) return
      request({
        url: `/api/topic/${topic.id}/like`,
        method: 'PUT',
        params: { userId: this.userInfo.id }
      }).then(res => {
        if (res === true) {
          topic.likes += 1
          this.likedTopics.push(topic.id)
        }
      })
    },

    toggleCommentInput(topic) {
      topic.showCommentInput = !topic.showCommentInput
    },

    commentTopic(topic) {
      if (!topic.commentContent) return
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
      })
    },

    openPostModal() {
      this.newTopic = { title: '', content: '', imageUrls: [] }
      this.showPostModal = true
    },

    postTopic() {
      if (!this.userInfo?.id) return
      const { title, content, imageUrls } = this.newTopic
      request({
        url: '/api/topic',
        method: 'POST',
        data: { userId: this.userInfo.id, title, content, imageUrls }
      }).then(res => {
        if (res) {
          uni.showToast({ title: '发布成功', icon: 'success' })
          this.showPostModal = false
          this.loadTopics()
        }
      })
    }
  }
}
</script>

<style>
.topic-content {
  display: -webkit-box;
  -webkit-line-clamp: 3; 
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.6;
  color: #555;
  margin: 12rpx 0;
}
.post-textarea {
  min-height: 300rpx;
  padding: 20rpx;
  line-height: 1.7;
  font-size: 28rpx;
  box-sizing: border-box;
}
</style>
