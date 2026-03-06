# 后端接口修改建议文档 - 停车管理模块

## 1. 核心业务流程变更
**变更前**：
1. 业主提交车辆绑定 -> 管理员审核 -> 状态变更为 `APPROVED` (直接生效)

**变更后 (先审后付)**：
1. 业主提交车辆绑定 -> 状态 `PENDING`
2. 管理员审核通过 -> 状态变更为 `AWAITING_PAYMENT` (待缴费，**此时未生效**)
3. 业主支付费用 -> 调用开通接口 -> 状态变更为 `ACTIVE` (正式生效)

---

## 2. 数据库字段枚举变更

**表名**：`vehicle_bind` (或类似的车辆绑定记录表)
**字段**：`status` (审核状态) 或 `lease_status` (租赁状态)

请确保该字段支持以下枚举值：
- `PENDING`: 待审核
- `AWAITING_PAYMENT`: 待缴费 (新增)
- `REJECTED`: 已拒绝
- `ACTIVE`: 使用中/生效 (对应 APPROVED + 已缴费)
- `EXPIRED`: 已过期

---

## 3. 接口变更详情

### 3.1 车辆审核接口
- **URL**: `/api/vehicle/audit`
- **Method**: `POST`
- **变更点**: 
  - 当管理员点击“通过”时，前端会传参 `status: "AWAITING_PAYMENT"`。
  - 后端接收到此状态时，仅更新记录状态，**不应**下发车牌权限到道闸系统。

### 3.2 我的车位/车辆列表接口
- **URL**: `/api/parking/space/my`
- **Method**: `GET`
- **变更点**:
  - 该接口不仅要返回 `ACTIVE` (生效中) 的记录，**必须**同时返回 `PENDING` (审核中) 和 `AWAITING_PAYMENT` (待缴费) 的记录，以便业主在前端看到进度并进行支付。
  - 返回的数据结构中，`leaseStatus` 字段需准确反映上述状态。

### 3.3 车辆/车位首次开通缴费接口 (新增)
- **URL**: `/api/parking/space/open`
- **Method**: `POST`
- **功能**: 用于“待缴费”状态下的首次支付开通。
- **参数**:
  ```json
  {
    "spaceId": 123,       // 车位ID或绑定记录ID
    "durationMonths": 12, // 购买时长(月)
    "payMethod": "BALANCE", // 支付方式
    "amount": 3000,       // 支付金额
    "userId": 456         // 用户ID
  }
  ```
- **后端逻辑**:
  1. 校验余额是否充足。
  2. 扣除余额。
  3. 更新绑定记录状态：从 `AWAITING_PAYMENT` -> `ACTIVE`。
  4. 更新有效期：`leaseEndTime` = 当前时间 + `durationMonths`。
  5. **关键**：调用道闸系统接口，下发车牌权限。

### 3.4 车辆/车位续费接口 (维持原状)
- **URL**: `/api/parking/space/renew`
- **Method**: `POST`
- **功能**: 用于 `ACTIVE` 或 `EXPIRED` 状态下的续费。
- **逻辑**: 仅延长 `leaseEndTime`，不改变状态（如果是 EXPIRED 则改为 ACTIVE）。

---

## 4. 订单记录统一 (重要)
**问题**：目前月卡/年卡的开通和续费没有生成统一的订单记录，导致管理员无法在“停车订单”中查询。

**要求**：
1.  **统一写入**: 无论是 `/api/parking/space/open` (开通) 还是 `/api/parking/space/renew` (续费)，在扣款成功后，**必须**在 `parking_order` 表中插入一条记录。
2.  **字段规范**:
    *   `orderType`: 使用 `LEASE` 或细分为 `MONTHLY`/`YEARLY`。
    *   `amount`: 实际支付金额。
    *   `status`: `PAID`。
    *   `description`: 例如 "车位A-101续费1个月"。
3.  **查询接口**: `/api/parking/order/admin/list` 必须能返回这些租赁类的订单。

---

## 5. 车位管理列表接口补充字段 (新)
**问题**：管理员端的车位列表 `/api/parking/space/admin/list` 目前只返回了车位基本信息，缺失业主信息，导致管理员无法看到车位属于谁，也无法自动填充续费用户ID。

**要求**：
请在返回的列表中增加以下字段：
*   `userId`: 当前绑定/租赁的用户ID (用于续费时自动填充)。
*   `ownerName`: 业主姓名 (用于列表展示)。
*   `plateNo`: 车牌号 (用于列表展示)。
*   `expireTime`: 到期时间 (用于判断是否即将到期)。

---

## 6. 线下支付逻辑修复 (新)
**问题**：管理员端调用 `/api/parking/lease/order/pay` 进行线下支付（`payChannel` 为 `CASH`/`WECHAT`）时，后端依然校验并扣除了用户线上余额，导致报错“余额不足”。

**要求**：
当 `payChannel` 为线下渠道（如 `CASH`）时，**不应**扣除用户余额，应直接将订单状态更新为 `PAID` 并更新车位有效期。
