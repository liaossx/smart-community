# 用户注册审核（管理员）接口文档（建议稿）

本文档用于在“用户注册”基础上增加“管理员审核注册申请”的闭环能力，适用于需要控制工作人员/管理员账号发放，或需要对业主账号进行人工审核的场景。

## 1. 设计目标

- 注册请求进入系统后不立即具备可用登录态（可配置），避免恶意注册/越权注册。
- 管理员可在后台查看注册申请列表，对申请进行通过/驳回。
- 通过后用户可正常登录；驳回后用户不可登录且可看到驳回原因。

## 2. 数据模型（推荐改库方案）

以 `sys_user`（或你项目实际用户表）为例，新增/约定字段：

- `status`：账号状态
  - `PENDING`（待审核）
  - `ACTIVE`（可用）
  - `REJECTED`（已驳回）
  - `DISABLED`（禁用，原本就有则沿用）
- `apply_time`：申请时间
- `approve_time`：审核通过时间（可空）
- `approve_by`：审核人ID（可空）
- `reject_reason`：驳回原因（可空）

示例 SQL（字段名按需调整）：

```sql
ALTER TABLE sys_user
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '账号状态(PENDING/ACTIVE/REJECTED/DISABLED)',
  ADD COLUMN apply_time DATETIME NULL COMMENT '申请时间',
  ADD COLUMN approve_time DATETIME NULL COMMENT '审核时间',
  ADD COLUMN approve_by BIGINT NULL COMMENT '审核人ID',
  ADD COLUMN reject_reason VARCHAR(255) NULL COMMENT '驳回原因';
```

## 3. 账号登录约束（必须做）

登录接口在校验账号密码成功后，增加状态判断：

- `status != ACTIVE`：拒绝登录
  - `PENDING`：提示“账号审核中”
  - `REJECTED`：提示“账号审核未通过：{reason}”
  - `DISABLED`：提示“账号已禁用”

## 4. 注册接口（调整建议）

### 4.1 用户注册

- **POST** `/api/user/register`
- Body（示例）：

```json
{
  "username": "lwj",
  "password": "123456",
  "phone": "18003072699",
  "realName": "刘文杰",
  "role": "owner"
}
```

处理规则建议：

- `role` 仅允许：`owner | admin | super_admin | worker`（你后端已有校验）
- 默认写入：`apply_time = now()`，`status = PENDING`
- 返回建议：
  - 成功：`{ code:200, data:{ id: 123, status: "PENDING" } }`
  - 也可以只返回 `id`

可选策略（按需二选一）：

- **策略 A（更安全）**：所有注册都 `PENDING`，必须审核
- **策略 B（更实用）**：`owner` 自动通过（`ACTIVE`），`admin/worker/super_admin` 必须审核

## 5. 管理员审核接口（新增）

以下接口建议放在管理端前缀下，例如 `/api/admin/user/...`，并要求 `admin/super_admin` 权限。

### 5.1 获取注册申请列表（分页）

- **GET** `/api/admin/user/register-requests`
- Query：
  - `pageNum`（默认 1）
  - `pageSize`（默认 10）
  - `keyword`（可选，查 username/phone/realName）
  - `status`（可选：PENDING/ACTIVE/REJECTED）
  - `role`（可选：owner/admin/worker/super_admin）
- Response（示例）：

```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": 123,
        "username": "lwj",
        "phone": "18003072699",
        "realName": "刘文杰",
        "role": "owner",
        "status": "PENDING",
        "applyTime": "2026-04-09T14:40:00"
      }
    ],
    "total": 1
  }
}
```

### 5.2 获取注册申请详情

- **GET** `/api/admin/user/register-requests/{id}`

### 5.3 审核通过

- **PUT** `/api/admin/user/register-requests/{id}/approve`
- Body（可选，允许管理员最终确认角色）：

```json
{
  "role": "owner"
}
```

处理逻辑：

- 校验申请存在且 `status == PENDING`
- 更新：`status = ACTIVE`，`approve_time = now()`，`approve_by = 当前管理员ID`
- 返回：`{ code:200, data:true }`

### 5.4 驳回

- **PUT** `/api/admin/user/register-requests/{id}/reject`
- Body：

```json
{
  "reason": "手机号不一致"
}
```

处理逻辑：

- 校验申请存在且 `status == PENDING`
- 更新：`status = REJECTED`，`reject_reason = reason`，`approve_time = now()`，`approve_by = 当前管理员ID`

## 6. 前端联动建议（可选）

- 注册成功后提示“已提交审核”，并跳回登录页。
- 管理端新增“注册审核”菜单页，展示待审核列表，提供通过/驳回按钮。
- 登录时如果收到“账号审核中/未通过”，提示清晰原因。

