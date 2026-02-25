<template>
  <view class="page">
    <view class="title">{{ topic.title }}</view>
    <view class="meta">{{ topic.author }} · {{ topic.time }}</view>

    <view class="content">{{ topic.content }}</view>

    <!-- 评论区 -->
    <view class="comment-section">
      <view class="section-title">评论 ({{ comments.length }})</view>
      
      <view class="comment-item" v-for="c in comments" :key="c.id">
        <image class="avatar" :src="c.avatar || '/static/default-avatar.png'" />
        <view class="comment-body">
          <view class="comment-header">
            <text class="comment-author">{{ c.username }}</text>
            <text class="comment-badge" v-if="c.badge">{{ c.badge }}</text>
          </view>
          <text class="comment-content">{{ c.content }}</text>

          <view class="comment-footer">
            <text class="comment-time">{{ c.time }}</text>
            <text class="comment-like" @tap="likeComment(c)">👍 {{ c.likes || 0 }}</text>
            <text class="comment-reply" @tap="showReplyInput(c)">回复</text>
          </view>

          <!-- 回复输入框 -->
          <view v-if="c.showReply" class="reply-input">
            <input v-model="c.replyContent" placeholder="写回复..." />
            <button @tap="submitReply(c)">提交</button>
          </view>

          <!-- 楼中楼 -->
          <view v-if="c.replies && c.replies.length" class="reply-list">
            <view class="reply-item" v-for="r in c.replies" :key="r.id">
              <text class="reply-author">{{ r.username }}:</text>
              <text class="reply-content">{{ r.content }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 一级评论输入框 -->
    <view class="comment-input">
      <input v-model="newComment" placeholder="写评论..." />
      <button @tap="submitComment">提交</button>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request.js'

export default {
  data() {
    return {
      topic: {},
      comments: [],
      newComment: '',
      userInfo: uni.getStorageSync('userInfo') || {}
    }
  },
  onLoad(options) {
    const id = options.id
    this.loadTopic(id)
    this.loadComments(id)
  },
  methods: {
    async loadTopic(id) {
      const res = await request({ url: `/api/topic/${id}`, method: 'GET' })
      this.topic = res
    },

    async loadComments(topicId) {
      const res = await request({ url: `/api/topic/${topicId}/comments`, method: 'GET' })
      // 初始化响应式字段 showReply 和 replyContent
      this.comments = (res || []).map(c => ({
        ...c,
        showReply: false,
        replyContent: '',
        replies: c.replies || []
      }))
    },

    async submitComment() {
      if (!this.newComment) return
      if (!this.userInfo?.id) {
        return uni.showToast({ title: '请先登录', icon: 'none' })
      }
      const res = await request({
        url: `/api/topic/${this.topic.id}/comment`,
        method: 'POST',
        data: { userId: this.userInfo.id, content: this.newComment }
      })
      if (res) {
        uni.showToast({ title: '评论成功', icon: 'success' })
        this.newComment = ''
        this.loadComments(this.topic.id)
      }
    },

    showReplyInput(comment) {
      comment.showReply = !comment.showReply
    },

    async submitReply(comment) {
      if (!comment.replyContent) return
      if (!this.userInfo?.id) {
        return uni.showToast({ title: '请先登录', icon: 'none' })
      }
      const res = await request({
        url: `/api/topic/${this.topic.id}/comment`,
        method: 'POST',
        data: {
          userId: this.userInfo.id,
          content: comment.replyContent,
          parentId: comment.id,
          rootId: comment.rootId || comment.id
        }
      })
      if (res) {
        uni.showToast({ title: '回复成功', icon: 'success' })
        comment.replyContent = ''
        comment.showReply = false
        this.loadComments(this.topic.id)
      }
    },

    async likeComment(comment) {
      if (!this.userInfo?.id) {
        return uni.showToast({ title: '请先登录', icon: 'none' })
      }
      try {
        const res = await request({
          url: `/api/topic/${this.topic.id}/like`,
          method: 'PUT',
          params: { userId: this.userInfo.id }
        })
        if (res) {
          comment.likes = (comment.likes || 0) + 1
          uni.showToast({ title: '点赞成功', icon: 'success' })
        }
      } catch (err) {
        uni.showToast({ title: '点赞失败', icon: 'none' })
      }
    }
  }
}
</script>

<style>
.page { padding: 20rpx; background-color: #f5f6fa; min-height: 100vh; }
.title { font-size: 38rpx; font-weight: 700; color: #222; margin-bottom: 12rpx; }
.meta { font-size: 26rpx; color: #999; margin-bottom: 24rpx; }
.content { white-space: pre-wrap; line-height: 1.8; font-size: 30rpx; color: #333; padding: 20rpx; background: #fff; border-radius: 16rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05); margin-bottom: 30rpx; }

.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }

.comment-item { display: flex; margin-bottom: 20rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; box-shadow: 0 1rpx 4rpx rgba(0,0,0,0.05); }
.avatar { width: 60rpx; height: 60rpx; border-radius: 50%; margin-right: 16rpx; }
.comment-body { flex: 1; }
.comment-header { display: flex; align-items: center; margin-bottom: 6rpx; }
.comment-author { font-weight: 600; color: #007aff; margin-right: 8rpx; }
.comment-badge { font-size: 20rpx; color: #fff; background: #ff7a45; padding: 2rpx 8rpx; border-radius: 12rpx; }
.comment-content { font-size: 28rpx; color: #333; line-height: 1.6; margin-bottom: 6rpx; }
.comment-footer { display: flex; gap: 20rpx; font-size: 24rpx; color: #999; }
.comment-footer text { cursor: pointer; }
.comment-like { color: #2d81ff; }
.comment-reply { color: #409eff; }

.reply-list { margin-left: 76rpx; margin-top: 12rpx; }
.reply-item { background: #f0f4ff; padding: 10rpx 12rpx; border-radius: 12rpx; margin-bottom: 8rpx; }
.reply-author { font-weight: 600; color: #0051cc; margin-right: 4rpx; }
.reply-content { color: #333; font-size: 26rpx; }

.reply-input { display: flex; gap: 10rpx; margin-top: 10rpx; }
.reply-input input { flex: 1; border: 1rpx solid #ccc; border-radius: 12rpx; padding: 10rpx; }
.reply-input button { padding: 10rpx 20rpx; background-color: #2d81ff; color: #fff; border-radius: 12rpx; }

.comment-input { flex-direction: row; display: flex; margin-top: 20rpx; background: #fff; padding: 12rpx; border-radius: 20rpx; box-shadow: 0 1rpx 6rpx rgba(0,0,0,0.08); align-items: center; }
.comment-input input { flex: 1; border: none; padding: 10rpx 14rpx; border-radius: 16rpx; background: #f0f2f5; font-size: 28rpx; color: #333; }
.comment-input button { margin-left: 12rpx; padding: 10rpx 24rpx; background: linear-gradient(90deg, #2d81ff, #4facfe); color: #fff; font-size: 28rpx; border-radius: 16rpx; font-weight: 600; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1); }
</style>
