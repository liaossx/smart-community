# 注册审核通过时绑定负责社区接口文档

本文档用于配合管理后台 `注册审核` 页面中的“通过申请”弹窗升级。

目标：

- 当审批角色为 `admin` 时，必须指定该管理员负责的社区。
- 建议当审批角色为 `worker` 时，也允许或要求指定所属社区，方便后续任务派发。
- 审批通过后，登录返回结果中应带出 `communityId`，供前端后续页面按社区取数。

当前前端页面位置：

- `admin/pages/admin/register-review.vue`

## 1. 前端交互说明

在“通过申请”弹窗中，前端会要求管理员做两步确认：

1. 选择审批通过后的角色 `role`
2. 如果角色是 `admin` 或 `worker`，则继续选择 `communityId`

当前前端约定：

- `owner`：不要求选择社区
- `super_admin`：不要求选择社区
- `admin`：要求选择负责社区
- `worker`：建议选择所属社区

如果你们后端只想对 `admin` 强制绑定社区，也可以；前端可以继续兼容这个规则。

## 2. 所需接口一览

### 2.1 查询社区列表

前端优先复用现有接口：

- **GET** `/api/house/community/list`

用途：

- 在“通过申请”弹窗中加载社区下拉列表。

返回示例：

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "智慧社区A区",
      "address": "北京市朝阳区智慧路1号"
    },
    {
      "id": 2,
      "name": "幸福家园B区",
      "address": "北京市海淀区幸福路8号"
    }
  ]
}
```

兼容说明：

- 前端也兼容直接返回数组
- 前端也兼容分页风格 `data.records`

最少需要字段：

- `id`
- `name`

推荐字段：

- `address`

### 2.2 审批通过注册申请

- **PUT** `/api/admin/user/register-requests/{id}/approve`

这里的 `{id}` 指注册申请 ID。

#### 请求体建议

```json
{
  "role": "admin",
  "communityId": 1
}
```

字段说明：

- `role`：最终审批通过的角色
  - 可选值：`owner | worker | admin | super_admin`
- `communityId`：负责社区 ID
  - 当 `role = admin` 时建议必填
  - 当 `role = worker` 时建议必填
  - 当 `role = owner` 或 `super_admin` 时可为空

#### 后端处理规则建议

1. 校验注册申请存在且状态为 `PENDING`
2. 校验 `role` 是否在允许范围内
3. 当 `role = admin` 时：
   - `communityId` 不能为空
   - 校验社区存在
4. 当 `role = worker` 时：
   - 建议同样校验 `communityId`
5. 审批通过后写入正式用户表：
   - `role`
   - `status = ACTIVE`
   - `community_id = communityId`
   - `approve_time`
   - `approve_by`

#### 返回示例

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "userId": 101,
    "role": "admin",
    "communityId": 1,
    "communityName": "智慧社区A区",
    "status": "ACTIVE"
  }
}
```

## 3. 注册申请列表接口建议补充字段

当前前端使用：

- **GET** `/api/admin/user/register-requests`

建议列表项增加以下字段，便于后续展示和回填：

```json
{
  "id": 123,
  "username": "lwj",
  "phone": "18003072699",
  "realName": "刘文杰",
  "role": "admin",
  "status": "PENDING",
  "applyTime": "2026-04-28 23:01:00",
  "rejectReason": null,
  "communityId": 1,
  "communityName": "智慧社区A区"
}
```

新增字段说明：

- `communityId`：申请时或审批时已绑定的社区 ID
- `communityName`：社区名称

这两个字段不是审批功能的硬依赖，但建议补上，后续可以在表格里直接展示“负责社区”。

## 4. 注册申请详情接口建议补充字段

- **GET** `/api/admin/user/register-requests/{id}`

建议返回：

```json
{
  "code": 200,
  "data": {
    "id": 123,
    "username": "lwj",
    "phone": "18003072699",
    "realName": "刘文杰",
    "role": "admin",
    "status": "PENDING",
    "applyTime": "2026-04-28 23:01:00",
    "communityId": 1,
    "communityName": "智慧社区A区"
  }
}
```

## 5. 登录接口返回建议

前端目前在登录后会存储 `communityId`：

- `owner/pages/login/login.vue`

所以建议登录接口在管理员或工作人员登录成功时，返回：

```json
{
  "code": 200,
  "data": {
    "userId": 101,
    "username": "admin01",
    "token": "xxx.yyy.zzz",
    "communityId": 1,
    "communityName": "智慧社区A区"
  }
}
```

至少建议保证：

- `communityId`

推荐同时返回：

- `communityName`

## 6. 如果现有后端没有这些能力，最低实现要求

如果后端目前没有完整“社区绑定审批”的设计，前端要跑通至少需要下面两项：

### 必需

1. 社区列表接口可用
   - `GET /api/house/community/list`
2. 审批通过接口支持 `communityId`
   - `PUT /api/admin/user/register-requests/{id}/approve`

### 强烈建议

3. 登录接口返回 `communityId`
4. 注册申请列表/详情接口补充 `communityId`、`communityName`

## 7. 推荐后端校验文案

当缺少社区时，建议返回明确业务提示：

- `管理员账号必须选择负责社区`
- `工作人员账号必须选择所属社区`
- `所选社区不存在或已停用`

这样前端会直接把错误弹给审批人，交互会比较清晰。
