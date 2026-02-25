<template>
  <view class="page">
    <!-- 服务网格 -->
    <view class="service-grid">
      <view class="grid-item" @click="navTo('/owner/pages/notice/list')">
        <image src="/static/service/notice.png" class="grid-icon"></image>
        <text class="grid-text">物业公告</text>
      </view>
      <view class="grid-item" @click="navTo('/owner/pages/repair/repair')">
        <image src="/static/service/repair.png" class="grid-icon"></image>
        <text class="grid-text">在线报修</text>
      </view>
      <view class="grid-item" @click="navTo('/owner/pages/communityService/pay-fee')">
        <image src="/static/service/pay.png" class="grid-icon"></image>
        <text class="grid-text">费用缴纳</text>
      </view>
      <view class="grid-item" @click="navTo('/owner/pages/communityService/visitor-apply')">
        <image src="/static/service/visitor.png" class="grid-icon"></image>
        <text class="grid-text">访客登记</text>
      </view>
      <view class="grid-item" @click="navTo('/owner/pages/communityService/complaint')">
        <image src="/static/service/complaint.png" class="grid-icon"></image>
        <text class="grid-text">投诉建议</text>
      </view>
      <view class="grid-item" @click="navTo('/owner/pages/communityService/activity-list')">
        <image src="/static/service/activity.png" class="grid-icon"></image>
        <text class="grid-text">社区活动</text>
      </view>
    </view>

    <!-- 顶部 hero -->
    <view class="hero">
      <text class="hero-title">快递代收</text>
      <text class="hero-sub">支持扫码自提 · 24h 监控</text>
    </view>

    <!-- 今日包裹 -->
    <view class="section">
      <view class="section-title">今日包裹</view>
      <view v-if="packages.length === 0" class="empty">暂无快递记录</view>

      <view v-for="pkg in packages" :key="pkg.id" class="pkg-card">
        <view class="pkg-info">
          <text class="pkg-title">
            {{ pkg.pickCode ? `取件码 ${pkg.pickCode}` : '—' }}
          </text>
          <text class="pkg-desc">
            {{ pkg.company }} · {{ formatTime(pkg.createTime) }}
          </text>
          <text class="pkg-remark" v-if="pkg.remark">
            {{ pkg.remark }}
          </text>
        </view>

        <view class="pkg-actions">
          <text class="pkg-status" :class="pkg.status">
            {{ pkg.statusText }}
          </text>
        
          <!-- 取件 -->
          <button
            v-if="pkg.status === 'ready'"
            class="btn primary"
            @tap="pickExpress(pkg)"
          >
            取件
          </button>
        
          <!-- 授权代取 -->
          <button
            v-if="pkg.status === 'ready'"
            class="btn ghost"
            @tap="openAuthorize(pkg)"
          >
            授权代取
          </button>
        </view>
      </view>
    </view>

    <!-- 授权弹窗 -->
    <view v-if="showAuthorize" class="mask">
      <view class="dialog">
        <view class="dialog-title">授权代取</view>
    
        <view class="form-item">
          <text class="label">被授权人姓名</text>
          <input
            v-model="authorizeForm.name"
            placeholder="请输入姓名"
          />
        </view>
    
        <view class="form-item">
          <text class="label">被授权人手机号</text>
          <input
            v-model="authorizeForm.phone"
            placeholder="请输入手机号"
            type="number"
          />
        </view>
    
        <view class="dialog-actions">
          <button class="btn ghost" @tap="showAuthorize = false">取消</button>
          <button class="btn primary" @tap="confirmAuthorize">确认授权</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request'

export default {
  data() {
    return {
      userInfo: null,
      packages: [],
	  showAuthorize: false,
	      currentPkg: null,
	      authorizeForm: {
	        name: '',
	        phone: '',
	        expireHours: 24
	      }
    }
  },
  onShow() {
    this.userInfo = uni.getStorageSync('userInfo') || {}
    if (!this.userInfo.id && this.userInfo.userId) {
      this.userInfo.id = this.userInfo.userId
    }
    console.log('【DEBUG】userInfo:', this.userInfo)
    this.loadPackages()
  },
  
  methods: {
    navTo(url) {
      uni.navigateTo({ url })
    },
    openAuthorize(pkg) {
	    this.currentPkg = pkg
	    this.authorizeForm = {
	      name: '',
	      phone: '',
	      expireHours: 24
	    }
	    this.showAuthorize = true
	  },
    /** 获取我的快递列表 */
    async loadPackages() {
      if (!this.userInfo?.id) return
      try {
        const res = await request({
          url: '/api/express/my',
          method: 'GET',
          params: {
            userId: this.userInfo.id,
            pageNum: 1,
            pageSize: 20
          }
        })
        console.log('【DEBUG】接口返回:', res)
        const records = res?.records || []
        if (Array.isArray(records)) {
          this.packages = records.map(pkg => ({
            ...pkg,
            pickCode: pkg.pickupCode,
            status: this.mapStatus(pkg.status),
            statusText: this.mapStatusText(pkg.status)
          }))
        } else {
          console.warn('【DEBUG】接口返回异常, records:', res)
        }
      } catch (err) {
        console.error('【DEBUG】快递列表加载失败', err)
      }
    },

    /** 取件 */
    async pickExpress(pkg) {
      uni.showModal({
        title: '确认取件',
        content: `确认取走快递 ${pkg.pickCode}？`,
        success: async (res) => {
          if (!res.confirm) return
    
          const userInfo = uni.getStorageSync('userInfo')
          if (!userInfo?.id) {
            uni.showToast({ title: '用户未登录', icon: 'none' })
            return
          }
    
          try {
            const result = await request({
              url: `/api/express/${pkg.id}/pick`,
              method: 'PUT',
              data: {
                pickupCode: pkg.pickCode.trim(),
                userId: userInfo.id,
                byAuthorized: false,
                operatorName: '',
                operatorPhone: '',
                remark: ''
              }
            })
    
            
            if (result === true) {
              uni.showToast({ title: '取件成功', icon: 'success' })
              this.loadPackages()
            } else {
              uni.showToast({ title: '取件失败', icon: 'none' })
            }
          } catch (e) {
            console.error('【DEBUG】请求异常', e)
            uni.showToast({ title: '取件失败', icon: 'none' })
          }
        }
      })
    },
   /** 授权代取 */
   async authorizeExpress(pkg) {
     uni.showModal({
       title: '授权代取',
       content: '确认授权他人代取该快递？',
       success: async (res) => {
         if (!res.confirm) return
   
         const userInfo = uni.getStorageSync('userInfo')
         if (!userInfo?.id) {
           uni.showToast({ title: '用户未登录', icon: 'none' })
           return
         }
   
         const dto = {
           userId: userInfo.id,              // ✅ 必传
           authorizedName: '张三',            // TODO: 后续改为输入
           authorizedPhone: '13800000000',   // ✅ 必传
           expireTime: new Date().toISOString() // ⚠️ 字段名必须一致
         }
   
         try {
           const result = await request({
             url: `/api/express/${pkg.id}/authorize`,
             method: 'POST',
             data: dto
           })
   
           console.log('【DEBUG】授权返回 result =', result)
   
           // ✅ 适配你现在的 request.js
           if (result === true) {
             uni.showToast({ title: '授权成功', icon: 'success' })
             this.loadPackages()
           } else {
             uni.showToast({ title: '授权失败', icon: 'none' })
           }
         } catch (e) {
           uni.showToast({ title: '授权失败', icon: 'none' })
         }
       }
     })
   },
   
   /** 确认授权 */
    async confirmAuthorize() {
         const { name, phone, expireHours } = this.authorizeForm
   
         if (!name || !phone) {
           uni.showToast({ title: '请填写完整信息', icon: 'none' })
           return
         }
   
         const userInfo = uni.getStorageSync('userInfo')
         if (!userInfo?.id || !this.currentPkg) return
   
         const expireTime = new Date(
           Date.now() + expireHours * 60 * 60 * 1000
         ).toISOString()
   
         try {
           const result = await request({
             url: `/api/express/${this.currentPkg.id}/authorize`,
             method: 'POST',
             data: {
               userId: userInfo.id,
               authorizedName: name,
               authorizedPhone: phone,
               expireTime
             }
           })
   
           console.log('【DEBUG】授权返回 result =', result)
   
           if (result === true) {
             uni.showToast({ title: '授权成功', icon: 'success' })
             this.showAuthorize = false
             this.loadPackages()
           } else {
             uni.showToast({ title: '授权失败', icon: 'none' })
           }
         } catch (e) {
           console.error('【DEBUG】授权异常', e)
           uni.showToast({ title: '授权失败', icon: 'none' })
         }
       },
	
		mapStatus(status) {
		  switch (status) {
			case 'WAITING': return 'ready'
			case 'PICKED': return 'picked'
			case 'AUTHORIZED': return 'authorized'
			default: return 'unknown'
		  }
		},

		mapStatusText(status) {
		  switch (status) {
			case 'WAITING': return '待取件'
			case 'PICKED': return '已取件'
			case 'AUTHORIZED': return '已授权'
			default: return '未知状态'
		  }
		},

		formatTime(str) {
		  if (!str) return ''
		  const d = new Date(str)
		  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')} 入库`
		}
		}}
	
	</script>

<style scoped>
.page { min-height:100vh; background:#f5f6fa; padding:28rpx; }

.service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  background: white;
  padding: 30rpx;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}

.grid-icon {
  width: 64rpx;
  height: 64rpx;
  margin-bottom: 12rpx;
  background: #f0f2f5;
  border-radius: 16rpx;
}

.grid-text {
  font-size: 26rpx;
  color: #333;
}

.hero { background:linear-gradient(120deg,#4facfe,#00f2fe); border-radius:24rpx; padding:32rpx; color:#fff; margin-bottom:20rpx; }
.hero-title { font-size:36rpx; font-weight:600; }
.hero-sub { font-size:28rpx; opacity:0.85; margin-top:8rpx; }

.section { background:#fff; border-radius:24rpx; padding:24rpx; }
.section-title { font-size:32rpx; font-weight:600; margin-bottom:16rpx; }
.empty { text-align:center; color:#999; font-size:28rpx; padding:20rpx 0; }

.pkg-card { display:flex; justify-content:space-between; align-items:center; padding:20rpx 20rpx; margin-bottom:12rpx; border-radius:16rpx; background:#fff; box-shadow:0 2rpx 8rpx rgba(0,0,0,0.05); }
.pkg-card:last-child { margin-bottom:0; }

.pkg-info { flex:1; margin-right:20rpx; }
.pkg-title { font-size:30rpx; color:#1f2430; font-weight:500; }
.pkg-desc { font-size:24rpx; color:#7a7e8a; margin-top:6rpx; }
.pkg-remark { font-size:24rpx; color:#999; margin-top:4rpx; }

.pkg-actions { display:flex; flex-direction:column; align-items:flex-end; }
.pkg-status { font-size:28rpx; font-weight:600; margin-bottom:8rpx; }
.pkg-status.ready { color:#2d81ff; }
.pkg-status.picked { color:#a0a4ac; }
.pkg-status.authorized { color:#f5a623; }

button { background:#4facfe; color:#fff; border-radius:16rpx; padding:10rpx 24rpx; font-size:26rpx; margin-top:6rpx; min-width:120rpx; text-align:center; }
button + button { margin-top:8rpx; }


.mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.dialog {
  width: 80%;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.dialog-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  text-align: center;
}

.form-item {
  margin-bottom: 12px;
}

.label {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
  display: block;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.btn {
  flex: 1;
  height: 36px;
  border-radius: 6px;
  font-size: 14px;
}

.btn.primary {
  background: #409eff;
  color: #fff;
}

.btn.ghost {
  background: #f2f2f2;
  color: #333;
}
</style>

