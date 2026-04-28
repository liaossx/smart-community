<template>
  <admin-sidebar
    :showSidebar="showSidebar"
    @update:showSidebar="showSidebar = $event"
    pageTitle="系统参数配置"
    currentPage="/admin/pages/admin/system-config"
    pageBreadcrumb="管理后台 / 系统配置"
    :showPageBanner="false"
  >
    <view class="manage-container">
      <view class="overview-panel">
        <view class="overview-copy">
          <text class="overview-title">系统参数列表</text>
          <text class="overview-subtitle">统一以后台参数表格页管理系统配置，保留新增、编辑、删除和内置参数限制。</text>
        </view>

        <view class="overview-chip">
          <text class="overview-chip-label">配置总数</text>
          <text class="overview-chip-value">{{ total }}</text>
        </view>
      </view>

      <view class="status-summary-bar config-status-bar">
        <view class="status-summary-card" :class="{ active: !queryParams.configType }" @click="applyQuickType(undefined)">
          <text class="summary-label">全部参数</text>
          <text class="summary-value">{{ stats.total }}</text>
        </view>
        <view class="status-summary-card custom" :class="{ active: queryParams.configType === 'N' }" @click="applyQuickType('N')">
          <text class="summary-label">业务参数</text>
          <text class="summary-value">{{ stats.custom }}</text>
        </view>
        <view class="status-summary-card builtin" :class="{ active: queryParams.configType === 'Y' }" @click="applyQuickType('Y')">
          <text class="summary-label">系统内置</text>
          <text class="summary-value">{{ stats.builtin }}</text>
        </view>
      </view>

      <view class="query-panel">
        <view class="query-grid config-query-grid">
          <view class="query-field">
            <text class="query-label">参数名称</text>
            <input
              v-model="queryParams.configName"
              class="query-input"
              type="text"
              placeholder="请输入参数名称"
              @confirm="handleQuery"
            />
          </view>

          <view class="query-field">
            <text class="query-label">参数键名</text>
            <input
              v-model="queryParams.configKey"
              class="query-input"
              type="text"
              placeholder="请输入参数键名"
              @confirm="handleQuery"
            />
          </view>

          <view class="query-field">
            <text class="query-label">系统内置</text>
            <picker
              mode="selector"
              :range="dict.type.sys_yes_no"
              range-key="label"
              :value="configTypePickerIndex"
              @change="handleTypeChange"
            >
              <view class="query-picker">
                <text class="query-picker-text">{{ currentTypeLabel }}</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="query-actions">
          <button class="query-btn primary" @click="handleQuery">查询</button>
          <button class="query-btn secondary" @click="resetQuery">重置</button>
        </view>
      </view>

      <view class="table-toolbar">
        <view class="toolbar-left-group">
          <button class="row-btn primary" @click="handleAdd">新增参数</button>
          <button class="row-btn ghost" :disabled="single" @click="handleUpdate(selectedConfig)">修改</button>
          <button class="row-btn danger" :disabled="multiple" @click="handleDelete()">删除</button>
        </view>

        <view class="toolbar-right-group">
          <text class="toolbar-meta">已选 {{ ids.length }} 项</text>
          <text class="toolbar-meta active">{{ currentTypeLabel }}</text>
        </view>
      </view>

      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else class="table-panel">
        <view class="scroll-table">
          <view class="table-head config-table">
            <text class="table-col col-check">选择</text>
            <text class="table-col col-id">主键</text>
            <text class="table-col col-name">参数名称</text>
            <text class="table-col col-key">参数键名</text>
            <text class="table-col col-value">参数键值</text>
            <text class="table-col col-type">内置</text>
            <text class="table-col col-remark">备注</text>
            <text class="table-col col-time">创建时间</text>
            <text class="table-col col-actions">操作</text>
          </view>

          <checkbox-group @change="handleSelectionChange">
            <view
              v-for="(item, index) in configList"
              :key="item.configId"
              class="table-row config-table"
              :style="{ animationDelay: `${Math.min(360, index * 40)}ms` }"
            >
              <view class="table-col col-check">
                <checkbox :value="String(item.configId)" :checked="ids.includes(String(item.configId))" />
              </view>

              <view class="table-col col-id">
                <text class="minor-text">#{{ item.configId }}</text>
              </view>

              <view class="table-col col-name">
                <text class="primary-text">{{ item.configName || '-' }}</text>
              </view>

              <view class="table-col col-key">
                <text class="plain-text">{{ item.configKey || '-' }}</text>
              </view>

              <view class="table-col col-value">
                <text class="desc-text">{{ item.configValue || '-' }}</text>
              </view>

              <view class="table-col col-type">
                <text class="status-pill" :class="item.configType === 'Y' ? 'type-builtin' : 'type-custom'">
                  {{ item.configType === 'Y' ? '是' : '否' }}
                </text>
              </view>

              <view class="table-col col-remark">
                <text class="desc-text">{{ item.remark || '无' }}</text>
              </view>

              <view class="table-col col-time">
                <text class="minor-text">{{ formatTime(item.createTime) }}</text>
              </view>

              <view class="table-col col-actions row-actions">
                <button class="row-btn ghost" @click="handleUpdate(item)">修改</button>
                <button v-if="item.configType !== 'Y'" class="row-btn danger" @click="handleDelete(item)">删除</button>
              </view>
            </view>
          </checkbox-group>
        </view>

        <view v-if="configList.length === 0" class="empty-state">
          <text>暂无配置参数</text>
        </view>
      </view>

      <view v-if="open" class="detail-modal" @click="cancel">
        <view class="detail-content config-detail-content" @click.stop>
          <view class="detail-header">
            <text class="detail-title">{{ title }}</text>
            <button class="close-btn" @click="cancel">关闭</button>
          </view>

          <view class="detail-body">
            <view class="detail-item detail-item-block">
              <text class="detail-label">参数名称:</text>
              <input class="form-input-inline" v-model="form.configName" placeholder="请输入参数名称" />
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">参数键名:</text>
              <input
                class="form-input-inline"
                v-model="form.configKey"
                :disabled="form.configType === 'Y' && form.configId !== undefined"
                :style="{ backgroundColor: form.configType === 'Y' && form.configId !== undefined ? '#f5f7fa' : '#fbfdff' }"
                placeholder="请输入参数键名"
              />
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">参数键值:</text>
              <input class="form-input-inline" v-model="form.configValue" placeholder="请输入参数键值" />
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">系统内置:</text>
              <radio-group @change="handleFormTypeChange" class="config-radio-group">
                <label class="config-radio-label">
                  <radio value="Y" :checked="form.configType === 'Y'" />
                  <text>是</text>
                </label>
                <label class="config-radio-label">
                  <radio value="N" :checked="form.configType === 'N'" />
                  <text>否</text>
                </label>
              </radio-group>
            </view>

            <view class="detail-item detail-item-block">
              <text class="detail-label">备注:</text>
              <textarea class="modal-textarea" v-model="form.remark" maxlength="300" placeholder="请输入备注"></textarea>
            </view>

            <view class="detail-actions">
              <button class="detail-btn secondary" @click="cancel">取消</button>
              <button class="detail-btn primary" @click="submitForm">保存</button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </admin-sidebar>
</template>

<script>
import adminSidebar from '@/admin/components/admin-sidebar/admin-sidebar'
import { listConfig, getConfig, delConfig, addConfig, updateConfig } from '@/api/system/config'

export default {
  components: { adminSidebar },
  data() {
    return {
      showSidebar: false,
      loading: true,
      ids: [],
      single: true,
      multiple: true,
      total: 0,
      configList: [],
      title: '',
      open: false,
      dict: {
        type: {
          sys_yes_no: [
            { value: 'Y', label: '是' },
            { value: 'N', label: '否' }
          ]
        }
      },
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        configName: undefined,
        configKey: undefined,
        configType: undefined
      },
      form: {},
      selectedConfig: null
    }
  },
  computed: {
    configTypePickerIndex() {
      const current = this.queryParams.configType
      if (current === undefined || current === null) return -1
      return Math.max(0, this.dict.type.sys_yes_no.findIndex(item => item.value === current))
    },
    currentTypeLabel() {
      if (!this.queryParams.configType) return '全部参数'
      return this.queryParams.configType === 'Y' ? '系统内置' : '业务参数'
    },
    stats() {
      return this.configList.reduce((result, item) => {
        result.total += 1
        if (item.configType === 'Y') {
          result.builtin += 1
        } else {
          result.custom += 1
        }
        return result
      }, {
        total: 0,
        builtin: 0,
        custom: 0
      })
    }
  },
  onLoad() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listConfig(this.queryParams).then(response => {
        const list = Array.isArray(response)
          ? response
          : (response.rows || response.data?.records || response.data || response.records || [])
        const raw = Array.isArray(list) ? list : []
        const normalized = raw.map(item => {
          const configId = item?.configId ?? item?.config_id ?? item?.id
          return {
            ...item,
            configId,
            configName: item?.configName ?? item?.config_name ?? item?.name,
            configKey: item?.configKey ?? item?.config_key ?? item?.key,
            configValue: item?.configValue ?? item?.config_value ?? item?.value,
            configType: item?.configType ?? item?.config_type ?? item?.type,
            createTime: item?.createTime ?? item?.create_time,
            remark: item?.remark ?? item?.remarks
          }
        })
        this.configList = normalized.filter(item => item && item.configId !== undefined && item.configId !== null)
        this.total = Array.isArray(response)
          ? this.configList.length
          : (response.total || response.data?.total || this.configList.length || 0)
      }).catch(error => {
        console.error('获取配置列表失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }).finally(() => {
        this.loading = false
      })
    },
    cancel() {
      this.open = false
      this.reset()
    },
    reset() {
      this.form = {
        configId: undefined,
        configName: undefined,
        configKey: undefined,
        configValue: undefined,
        configType: 'N',
        remark: undefined
      }
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        configName: undefined,
        configKey: undefined,
        configType: undefined
      }
      this.handleQuery()
    },
    applyQuickType(type) {
      this.queryParams.configType = type
      this.handleQuery()
    },
    handleSelectionChange(e) {
      this.ids = e.detail.value
      this.single = this.ids.length !== 1
      this.multiple = !this.ids.length
      if (this.ids.length === 1) {
        this.selectedConfig = this.configList.find(item => String(item.configId) === this.ids[0]) || null
      } else {
        this.selectedConfig = null
      }
    },
    handleTypeChange(e) {
      const index = Number(e.detail.value)
      const option = this.dict.type.sys_yes_no[index]
      this.queryParams.configType = option ? option.value : undefined
    },
    handleFormTypeChange(e) {
      this.form.configType = e.detail.value
    },
    handleAdd() {
      this.reset()
      this.title = '添加参数'
      this.open = true
    },
    handleUpdate(row) {
      this.reset()
      const configId = row?.configId ?? row?.config_id ?? row?.id ?? this.ids[0]
      if (configId === undefined || configId === null || configId === '') {
        uni.showToast({ title: '未获取到配置ID', icon: 'none' })
        return
      }
      getConfig(configId).then(response => {
        const data = response.data || response
        this.form = {
          ...data,
          configId: data?.configId ?? data?.config_id ?? data?.id,
          configType: data?.configType ?? data?.config_type ?? data?.type ?? 'N'
        }
        this.title = '修改参数'
        this.open = true
      }).catch(error => {
        console.error('获取配置详情失败:', error)
        uni.showToast({ title: '加载详情失败', icon: 'none' })
      })
    },
    submitForm() {
      if (!this.form.configName || !this.form.configKey || !this.form.configValue) {
        uni.showToast({ title: '必填项不能为空', icon: 'none' })
        return
      }
      const action = this.form.configId !== undefined ? updateConfig(this.form) : addConfig(this.form)
      action.then(() => {
        uni.showToast({
          title: this.form.configId !== undefined ? '修改成功' : '新增成功',
          icon: 'success'
        })
        this.open = false
        this.getList()
      }).catch(error => {
        console.error('保存参数失败:', error)
        uni.showToast({ title: '保存失败', icon: 'none' })
      })
    },
    handleDelete(row) {
      const rowId = row?.configId ?? row?.config_id ?? row?.id
      const configIds = rowId ? [rowId] : this.ids
      const hasBuiltIn = this.configList.some(item => configIds.map(String).includes(String(item.configId)) && item.configType === 'Y')
      if (hasBuiltIn) {
        uni.showToast({ title: '包含系统内置参数，不允许删除', icon: 'none' })
        return
      }
      if (!configIds.length) {
        uni.showToast({ title: '请选择要删除的数据', icon: 'none' })
        return
      }
      uni.showModal({
        title: '删除确认',
        content: '是否确认删除选中参数？',
        success: (res) => {
          if (!res.confirm) return
          const doDelete = async () => {
            for (const id of configIds) {
              await delConfig(id)
            }
          }
          doDelete().then(() => {
            this.ids = []
            this.selectedConfig = null
            this.single = true
            this.multiple = true
            this.getList()
            uni.showToast({ title: '删除成功', icon: 'success' })
          }).catch(error => {
            console.error('删除参数失败:', error)
            uni.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      })
    },
    formatTime(time) {
      if (!time) return '-'
      const date = new Date(time)
      if (Number.isNaN(date.getTime())) return time
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

<style scoped src="../../styles/admin-table-page.css"></style>
<style scoped>
.config-status-bar {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.status-summary-card.custom {
  background: linear-gradient(180deg, #fff 0%, #eef5ff 100%);
}

.status-summary-card.builtin {
  background: linear-gradient(180deg, #fff 0%, #fff8e6 100%);
}

.config-query-grid {
  grid-template-columns: 1fr 1fr 1fr;
}

.config-table {
  grid-template-columns: 100rpx 120rpx 220rpx 240rpx 220rpx 140rpx 260rpx 220rpx 200rpx;
  min-width: 1900rpx;
}

.status-pill.type-builtin {
  background: #fff8e6;
  color: #cd8b1d;
}

.status-pill.type-custom {
  background: #edf9f1;
  color: #2d8c59;
}

.config-detail-content {
  max-width: 860rpx;
}

.config-radio-group {
  display: flex;
  gap: 36rpx;
}

.config-radio-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #4c5f73;
}
</style>
