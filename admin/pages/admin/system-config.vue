<template>
  <admin-sidebar 
    :showSidebar="showSidebar" 
    @update:showSidebar="showSidebar = $event"
    pageTitle="系统参数配置"
    currentPage="/admin/pages/admin/system-config"
  >
    <view class="config-container">
      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-item">
          <text class="label">参数名称</text>
          <input class="input" v-model="queryParams.configName" placeholder="请输入参数名称" />
        </view>
        <view class="search-item">
          <text class="label">参数键名</text>
          <input class="input" v-model="queryParams.configKey" placeholder="请输入参数键名" />
        </view>
        <view class="search-item">
          <text class="label">系统内置</text>
          <picker 
            mode="selector" 
            :range="dict.type.sys_yes_no" 
            range-key="label" 
            @change="handleTypeChange"
          >
            <view class="picker">
              {{ queryParams.configType ? (queryParams.configType === 'Y' ? '是' : '否') : '请选择' }}
            </view>
          </picker>
        </view>
        <view class="search-btns">
          <button class="btn search-btn" @click="handleQuery">搜索</button>
          <button class="btn reset-btn" @click="resetQuery">重置</button>
        </view>
      </view>

      <!-- 功能按钮区 -->
      <view class="action-bar">
        <button class="btn add-btn" @click="handleAdd">新增</button>
        <button class="btn edit-btn" :disabled="single" @click="handleUpdate(selectedConfig)">修改</button>
        <button class="btn del-btn" :disabled="multiple" @click="handleDelete">删除</button>
      </view>

      <!-- 数据表格 (使用列表模拟) -->
      <view class="data-list">
        <view class="list-header">
          <text class="col col-check">选择</text>
          <text class="col col-id">主键</text>
          <text class="col col-name">参数名称</text>
          <text class="col col-key">参数键名</text>
          <text class="col col-value">参数键值</text>
          <text class="col col-type">内置</text>
          <text class="col col-remark">备注</text>
          <text class="col col-time">创建时间</text>
          <text class="col col-action">操作</text>
        </view>
        
        <checkbox-group @change="handleSelectionChange">
          <view class="list-item" v-for="item in configList" :key="item.configId">
            <view class="col col-check">
              <checkbox :value="String(item.configId)" :checked="ids.includes(String(item.configId))" />
            </view>
            <text class="col col-id">{{ item.configId }}</text>
            <text class="col col-name">{{ item.configName }}</text>
            <text class="col col-key">{{ item.configKey }}</text>
            <text class="col col-value">{{ item.configValue }}</text>
            <view class="col col-type">
              <text :class="['tag', item.configType === 'Y' ? 'tag-danger' : 'tag-success']">
                {{ item.configType === 'Y' ? '是' : '否' }}
              </text>
            </view>
            <text class="col col-remark">{{ item.remark }}</text>
            <text class="col col-time">{{ item.createTime }}</text>
            <view class="col col-action">
              <text class="link-btn" @click="handleUpdate(item)">修改</text>
              <text class="link-btn link-danger" v-if="item.configType !== 'Y'" @click="handleDelete(item)">删除</text>
            </view>
          </view>
        </checkbox-group>
        
        <view v-if="configList.length === 0" class="empty-text">暂无数据</view>
      </view>

      <!-- 新增/修改对话框 -->
      <view v-if="open" class="modal-mask">
        <view class="modal-content">
          <view class="modal-header">
            <text class="modal-title">{{ title }}</text>
            <text class="close-icon" @click="cancel">×</text>
          </view>
          <view class="modal-body">
            <view class="form-item">
              <text class="form-label required">参数名称</text>
              <input class="form-input" v-model="form.configName" placeholder="请输入参数名称" />
            </view>
            <view class="form-item">
              <text class="form-label required">参数键名</text>
              <!-- 内置参数禁止修改键名 -->
              <input 
                class="form-input" 
                v-model="form.configKey" 
                :disabled="form.configType === 'Y' && form.configId !== undefined"
                :style="{ backgroundColor: (form.configType === 'Y' && form.configId !== undefined) ? '#f5f7fa' : '#fff' }"
                placeholder="请输入参数键名" 
              />
            </view>
            <view class="form-item">
              <text class="form-label required">参数键值</text>
              <input class="form-input" v-model="form.configValue" placeholder="请输入参数键值" />
            </view>
            <view class="form-item">
              <text class="form-label">系统内置</text>
              <radio-group @change="e => form.configType = e.detail.value" class="radio-group">
                <label class="radio-label">
                  <radio value="Y" :checked="form.configType === 'Y'" />是
                </label>
                <label class="radio-label">
                  <radio value="N" :checked="form.configType === 'N'" />否
                </label>
              </radio-group>
            </view>
            <view class="form-item">
              <text class="form-label">备注</text>
              <textarea class="form-textarea" v-model="form.remark" placeholder="请输入内容" />
            </view>
          </view>
          <view class="modal-footer">
            <button class="modal-btn confirm-btn" @click="submitForm">确 定</button>
            <button class="modal-btn cancel-btn" @click="cancel">取 消</button>
          </view>
        </view>
      </view>
    </view>
  </admin-sidebar>
</template>

<script>
import adminSidebar from '@/admin/components/admin-sidebar/admin-sidebar'
import { listConfig, getConfig, delConfig, addConfig, updateConfig } from "@/api/system/config";

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
      title: "",
      open: false,
      dict: {
        type: {
          sys_yes_no: [{ value: 'Y', label: '是' }, { value: 'N', label: '否' }]
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
    };
  },
  onLoad() {
    this.getList();
  },
  methods: {
    getList() {
      this.loading = true;
      listConfig(this.queryParams).then(response => {
        const list = Array.isArray(response)
          ? response
          : (response.rows || response.data?.records || response.data || response.records || []);
        const raw = Array.isArray(list) ? list : [];
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
        this.configList = normalized.filter(i => i && i.configId !== undefined && i.configId !== null)
        this.total = Array.isArray(response)
          ? this.configList.length
          : (response.total || response.data?.total || this.configList.length || 0);
        this.loading = false;
      }).catch(err => {
        console.error('获取配置列表失败:', err);
        this.loading = false;
      });
    },
    cancel() {
      this.open = false;
      this.reset();
    },
    reset() {
      this.form = {
        configId: undefined,
        configName: undefined,
        configKey: undefined,
        configValue: undefined,
        configType: "N",
        remark: undefined
      };
    },
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    resetQuery() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        configName: undefined,
        configKey: undefined,
        configType: undefined
      };
      this.handleQuery();
    },
    handleSelectionChange(e) {
      this.ids = e.detail.value;
      this.single = this.ids.length !== 1;
      this.multiple = !this.ids.length;
      
      if (this.ids.length === 1) {
        this.selectedConfig = this.configList.find(item => String(item.configId) === this.ids[0]);
      } else {
        this.selectedConfig = null;
      }
    },
    handleTypeChange(e) {
      this.queryParams.configType = this.dict.type.sys_yes_no[e.detail.value].value;
    },
    handleAdd() {
      this.reset();
      this.open = true;
      this.title = "添加参数";
    },
    handleUpdate(row) {
      this.reset();
      const configId = row?.configId ?? row?.config_id ?? row?.id ?? this.ids[0];
      if (configId === undefined || configId === null || configId === '') {
        uni.showToast({ title: '未获取到配置ID', icon: 'none' });
        return
      }
      getConfig(configId).then(response => {
        const data = response.data || response;
        this.form = {
          ...data,
          configId: data?.configId ?? data?.config_id ?? data?.id
        }
        this.open = true;
        this.title = "修改参数";
      });
    },
    submitForm() {
      if (!this.form.configName || !this.form.configKey || !this.form.configValue) {
        uni.showToast({ title: '必填项不能为空', icon: 'none' });
        return;
      }

      if (this.form.configId != undefined) {
        updateConfig(this.form).then(() => {
          uni.showToast({ title: '修改成功', icon: 'success' });
          this.open = false;
          this.getList();
        });
      } else {
        addConfig(this.form).then(() => {
          uni.showToast({ title: '新增成功', icon: 'success' });
          this.open = false;
          this.getList();
        });
      }
    },
    handleDelete(row) {
      const rowId = row?.configId ?? row?.config_id ?? row?.id
      const configIds = rowId ? [rowId] : this.ids;
      
      // 前端校验：内置参数不允许删除
      const hasBuiltIn = this.configList.some(item => 
        configIds.map(String).includes(String(item.configId)) && item.configType === 'Y'
      );
      
      if (hasBuiltIn) {
        uni.showToast({ title: '包含系统内置参数，不允许删除', icon: 'none' });
        return;
      }

      uni.showModal({
        title: '提示',
        content: '是否确认删除选中数据项？',
        success: (res) => {
          if (res.confirm) {
            const doDelete = async () => {
              for (const id of configIds) {
                await delConfig(id)
              }
            }
            doDelete().then(() => {
              this.getList();
              uni.showToast({ title: '删除成功', icon: 'success' });
              this.ids = [];
            }).catch(() => {
              uni.showToast({ title: '删除失败', icon: 'none' });
            })
          }
        }
      });
    }
  }
};
</script>

<style scoped>
.config-container {
  padding: 30rpx;
  padding-top: 100rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.search-bar {
  background: #fff;
  padding: 20rpx;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  align-items: center;
}

.search-item { display: flex; align-items: center; }
.label { font-size: 28rpx; color: #666; margin-right: 10rpx; }
.input, .picker { border: 1rpx solid #dcdfe6; border-radius: 4rpx; height: 60rpx; padding: 0 15rpx; font-size: 28rpx; width: 200rpx; line-height: 60rpx; }
.search-btns { display: flex; gap: 10rpx; margin-left: auto; }
.btn { font-size: 26rpx; padding: 0 30rpx; height: 60rpx; line-height: 60rpx; border-radius: 4rpx; border: none; }
.search-btn { background: #1890ff; color: #fff; }
.reset-btn { background: #fff; color: #606266; border: 1rpx solid #dcdfe6; }

.action-bar { margin-bottom: 20rpx; display: flex; gap: 15rpx; }
.add-btn { background: #1890ff; color: #fff; }
.edit-btn { background: #13ce66; color: #fff; }
.del-btn { background: #ff4949; color: #fff; }
.btn[disabled] { opacity: 0.6; }

.data-list { background: #fff; border-radius: 10rpx; overflow-x: auto; }
.list-header, .list-item { display: flex; padding: 20rpx 10rpx; border-bottom: 1rpx solid #ebeef5; min-width: 1100rpx; align-items: center; }
.list-header { background: #f8f8f9; font-weight: bold; color: #515a6e; }
.col { font-size: 26rpx; padding: 0 10rpx; word-break: break-all; }
.col-check { width: 80rpx; text-align: center; }
.col-id { width: 80rpx; }
.col-name { width: 200rpx; }
.col-key { width: 200rpx; }
.col-value { width: 150rpx; }
.col-type { width: 100rpx; text-align: center; }
.col-remark { flex: 1; }
.col-time { width: 250rpx; }
.col-action { width: 150rpx; text-align: center; }

.tag { padding: 2rpx 10rpx; border-radius: 4rpx; font-size: 22rpx; }
.tag-danger { background: #fef0f0; color: #f56c6c; border: 1rpx solid #fde2e2; }
.tag-success { background: #f0f9eb; color: #67c23a; border: 1rpx solid #e1f3d8; }

.link-btn { color: #1890ff; margin: 0 5rpx; cursor: pointer; }
.link-danger { color: #f56c6c; }
.empty-text { text-align: center; padding: 40rpx; color: #999; font-size: 28rpx; }

.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal-content { background: #fff; width: 600rpx; border-radius: 10rpx; overflow: hidden; }
.modal-header { padding: 20rpx 30rpx; border-bottom: 1rpx solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-title { font-size: 32rpx; font-weight: bold; }
.close-icon { font-size: 40rpx; color: #999; padding: 0 10rpx; cursor: pointer; }
.modal-body { padding: 30rpx; }
.form-item { margin-bottom: 30rpx; }
.form-label { display: block; font-size: 28rpx; color: #606266; margin-bottom: 15rpx; }
.required::before { content: "*"; color: #f56c6c; margin-right: 5rpx; }
.form-input, .form-textarea { border: 1rpx solid #dcdfe6; border-radius: 4rpx; padding: 15rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; color: #333; height: 70rpx; }
.form-textarea { height: 150rpx; }
.radio-group { display: flex; gap: 40rpx; }
.radio-label { display: flex; align-items: center; font-size: 28rpx; }
.modal-footer { padding: 20rpx 30rpx; border-top: 1rpx solid #eee; display: flex; justify-content: flex-end; gap: 20rpx; }
.modal-btn { font-size: 28rpx; height: 70rpx; line-height: 70rpx; padding: 0 40rpx; border-radius: 4rpx; margin: 0; }
.confirm-btn { background: #1890ff; color: #fff; }
.cancel-btn { background: #fff; color: #606266; border: 1rpx solid #dcdfe6; }
</style>
