# 登录与注册审核（做法1）后端接口文档

本文档对应“做法1”：业主(owner)注册无需审核可直接登录；高权限账号(worker/admin/super_admin)必须进入注册审核，由 super_admin 审核通过后才能登录。

## 1. 角色与状态约定

### 1.1 角色（role）

- `owner`：业主（普通用户）
- `worker`：工作人员（维修/处理人员）
- `admin`：社区管理员
- `super_admin`：平台超级管理员

### 1.2 账号状态（status）

推荐统一在 `sys_user.status`（或你项目用户表等价字段）中表达：

- `ACTIVE`：可登录
- `PENDING`：待审核（不可登录）
- `REJECTED`：审核拒绝（不可登录）
- `DISABLED`：禁用（不可登录）

## 2. 数据表（推荐）

### 2.1 用户表（sys_user）

至少需要字段：

- `id`
- `username`（唯一）
- `password`（哈希）
- `real_name`
- `phone`
- `role`
- `status`
- `community_id`（允许为空，owner 在绑定房屋审核通过时可补齐）
- `create_time`

### 2.2 注册申请表（sys_user_register_request）

用于承载高权限账号申请（PENDING）与审核记录。

字段建议：

- `id` bigint PK
- `username` varchar(100) UNIQUE
- `password` varchar(255)（哈希，不返回给前端）
- `real_name` varchar(100)
- `phone` varchar(20)
- `role` varchar(20)
- `status` varchar(16)：`PENDING|APPROVED|REJECTED`
- `apply_time` datetime
- `approve_time` datetime
- `approve_by` bigint
- `reject_reason` varchar(255)

## 3. 公开接口（业主端）

### 3.1 用户注册（owner 直通）

- **POST** `/api/user/register`
- Body：

```json
{
  "username": "lwj",
  "password": "123456",
  "phone": "18003072699",
  "realName": "刘文杰",
  "role": "owner"
}
```

处理规则：

- 若 `role == owner`：
  - 直接创建 `sys_user`，`status=ACTIVE`
  - `community_id` 允许为空（后续房屋绑定审核通过时补齐）
  - 返回成功
- 若 `role in (worker,admin,super_admin)`：
  - 不直接创建 sys_user（或创建为 DISABLED/PENDING 且不可登录）
  - 创建 `sys_user_register_request`，`status=PENDING`
  - 返回成功并提示“已提交审核”

返回（示例）：

```json
{ "code": 200, "msg": "操作成功", "data": { "status": "ACTIVE" } }
```

或（高权限申请）：

```json
{ "code": 200, "msg": "已提交审核", "data": { "status": "PENDING" } }
```

### 3.2 用户登录

- **POST** `/api/user/login`
- Body：

```json
{ "username": "lwj", "password": "123456" }
```

处理规则：

- 账号密码校验通过后，检查 `sys_user.status`
  - `ACTIVE`：签发 Token 返回
  - `PENDING`：返回业务错误 “账号审核中”
  - `REJECTED`：返回业务错误 “审核未通过：{rejectReason}”
  - `DISABLED`：返回业务错误 “账号已禁用”

## 4. 管理端接口（仅 super_admin）

以下接口建议在 `user-service` 的 `AdminUserController` 中实现，并在网关/服务鉴权中限制仅 `super_admin` 可访问。

### 4.1 注册申请列表（分页）

- **GET** `/api/admin/user/register-requests`
- Query：`pageNum`、`pageSize`、`keyword`、`status`、`role`
- 返回：`Page<RegisterRequestDTO>`

DTO 字段建议：

- `id`
- `username`
- `phone`
- `realName`
- `role`
- `status`（PENDING/APPROVED/REJECTED）
- `applyTime`
- `rejectReason`（仅 REJECTED 时可返回）

### 4.2 注册申请详情

- **GET** `/api/admin/user/register-requests/{id}`
- 返回：`RegisterRequestDetailDTO`（不返回密码哈希）

### 4.3 审核通过（创建 sys_user）

- **PUT** `/api/admin/user/register-requests/{id}/approve`
- Body（可选，允许审核时最终确认角色）：

```json
{ "role": "worker" }
```

处理规则：

- 校验申请存在且 `status == PENDING`
- 创建 `sys_user` 记录：
  - `username/phone/realName/passwordHash/role`
  - `status=ACTIVE`
  - `community_id`：对 admin/worker 可选先置空（后续由房屋绑定/或 admin 创建时指定）
- 更新申请：`status=APPROVED`，记录 `approve_by/approve_time`

### 4.4 驳回

- **PUT** `/api/admin/user/register-requests/{id}/reject`
- Body：

```json
{ "reason": "手机号不一致" }
```

处理规则：

- 校验申请存在且 `status == PENDING`
- 更新申请：`status=REJECTED`，`reject_reason=reason`，记录 `approve_by/approve_time`

## 5. 权限要求（关键）

- `/api/admin/user/register-requests/**`：仅允许 `super_admin`
- 普通 `admin` 不允许访问注册审核接口（避免越权发放账号）

## 6. 与房屋绑定的联动建议（可选但推荐）

- owner 注册后 `community_id` 为空
- 房屋绑定审核通过时（按 houseId 反查 communityId），若用户 `community_id` 为空则补齐

