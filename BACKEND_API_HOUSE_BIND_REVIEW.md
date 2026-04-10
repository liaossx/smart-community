# 房屋绑定审核（管理员）接口文档（建议稿）

本文档用于在“业主端绑定房屋”基础上，补齐“管理员审核绑定申请”的闭环能力，适用于需要物业确认房屋归属与身份类型（业主/家属/租户）的场景。

## 1. 业务目标

- 业主提交绑定申请后，不立即获得房屋相关权限（待审核）。
- 管理员在后台查看绑定申请列表，对申请进行通过/驳回。
- 审核通过后，用户与房屋建立绑定关系；驳回后用户可查看原因并重新提交。

## 2. 数据模型（推荐）

建议新增一张绑定申请表（名称可按你项目规范调整）：

- 表名：`sys_house_bind_request`
- 字段建议：
  - `id` bigint PK
  - `user_id` bigint 申请人
  - `house_id` bigint 申请房屋
  - `identity_type` varchar(16) 身份类型：`OWNER|FAMILY|TENANT`
  - `status` varchar(16)：`PENDING|APPROVED|REJECTED`
  - `apply_time` datetime
  - `approve_time` datetime
  - `approve_by` bigint
  - `reject_reason` varchar(255)

示例 SQL（字段名按需调整）：

```sql
CREATE TABLE sys_house_bind_request (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  house_id BIGINT NOT NULL,
  identity_type VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  apply_time DATETIME NULL,
  approve_time DATETIME NULL,
  approve_by BIGINT NULL,
  reject_reason VARCHAR(255) NULL,
  UNIQUE KEY uk_user_house_pending (user_id, house_id, status)
);
```

## 3. 业主端接口（已有/建议对齐）

### 3.1 查询房屋ID（按楼栋/房号）

- **GET** `/api/house/info`
- Query：`buildingNo`、`houseNo`
- 返回：`HouseDTO`（至少包含 `id`）

### 3.2 提交绑定申请（创建 PENDING 申请）

- **POST** `/api/house/bind`
- Query：`userId`、`houseId`、`type`（`OWNER|FAMILY|TENANT`）
- 处理：
  - 写入 `sys_house_bind_request`（`status=PENDING`）
  - 若已存在同房屋的 PENDING 申请，返回业务错误提示“请勿重复提交”

## 4. 管理端审核接口（新增）

建议放在 house-service（或 house 相关服务）的 AdminController 下，统一走管理端前缀：

### 4.1 获取房屋绑定申请列表（分页）

- **GET** `/api/admin/house/bind-requests`
- Query：
  - `pageNum`（默认 1）
  - `pageSize`（默认 10）
  - `keyword`（可选：用户名/姓名/手机号/房号等模糊查询）
  - `status`（可选：`PENDING|APPROVED|REJECTED`）
  - `communityId`（可选：超管跨社区筛选）
- 返回（建议）：`Page<HouseBindRequestDTO>`
  - 字段建议：`id,userId,username,realName,phone,communityName,buildingNo,houseNo,identityType,status,applyTime,rejectReason`

### 4.2 获取申请详情

- **GET** `/api/admin/house/bind-requests/{id}`
- 返回：`HouseBindRequestDetailDTO`（不返回敏感字段）

### 4.3 审核通过

- **PUT** `/api/admin/house/bind-requests/{id}/approve`
- Body（可选）：`{ "identityType": "OWNER" }`
- 处理：
  - 校验申请存在且 `status=PENDING`
  - 更新申请：`status=APPROVED, approve_time=now(), approve_by=当前管理员ID`
  - 写入/更新用户房屋绑定关系表（例如 `sys_user_house` 或项目既有绑定表）
  - 可选：将该房屋的其他 PENDING 申请标记为 REJECTED（避免多人抢同一房屋）

### 4.4 驳回

- **PUT** `/api/admin/house/bind-requests/{id}/reject`
- Body：`{ "reason": "房号不匹配" }`
- 处理：
  - 校验申请存在且 `status=PENDING`
  - 更新：`status=REJECTED, reject_reason=reason, approve_time=now(), approve_by=当前管理员ID`

## 5. 权限建议

- `/api/admin/house/*` 仅允许 `admin/super_admin` 访问
- 若普通管理员只能审核本社区申请：在列表查询与 approve/reject 时按 `communityId` 做限制

