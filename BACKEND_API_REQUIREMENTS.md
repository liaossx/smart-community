# 后端接口修改规范建议书

## 1. 核心问题描述
目前前端管理端页面（投诉管理、访客管理、报修管理、用户管理）在展示列表和统计数据时，遇到了以下问题：
1. **分页信息缺失**：接口未返回 `total`（总记录数），导致前端分页控件无法计算总页数，始终显示“1/1页”。
2. **统计数据获取困难**：前端无法高效获取各状态（如待处理、已处理）的记录总数，目前只能通过请求列表接口间接获取，效率低且数据可能不准确。
3. **数据结构不统一**：部分接口直接返回数组，部分返回对象，增加了前端适配难度。

## 2. 统一响应结构规范 (Result)
所有列表查询接口，建议统一返回如下 JSON 结构。这是标准的 MyBatis-Plus `IPage` 或 PageHelper 分页结构。

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "records": [ ... ],  // 数据列表（数组）
    "total": 100,        // 符合查询条件的总记录数（必须返回！）
    "size": 10,          // 每页显示条数
    "current": 1,        // 当前页码
    "pages": 10          // 总页数
  }
}
```

> **关键点**：`total` 字段是前端分页和顶部统计卡片（如“待处理: 5”）的核心依赖。

## 3. 具体接口修改建议

### 3.1 投诉管理 (Complaint)
*   **接口地址**：`/api/complaint/list`
*   **当前问题**：返回可能缺失 `total` 字段，或未正确处理 `status` 筛选。
*   **修改要求**：
    *   确保支持 `pageNum` 和 `pageSize` 参数。
    *   确保支持 `status` (pending/processed) 和 `keyword` 参数筛选。
    *   **必须返回 `total` 字段**。
    *   **管理员权限**：管理员调用此接口时，应能看到**所有住户**的投诉，而不仅仅是自己的。建议后端根据角色（Role）判断，如果是 Admin 则忽略 `userId` 过滤条件。

### 3.2 访客管理 (Visitor)
*   **接口地址**：`/api/visitor/list`
*   **修改要求**：
    *   同上，支持分页和 `total` 返回。
    *   支持 `status` (pending/approved/rejected) 筛选。
    *   **管理员权限**：管理员应能看到所有访客申请记录。

### 3.3 报修管理 (Repair)
*   **接口地址**：`/api/repair/admin/all` (或复用 `/api/repair/list`)
*   **修改要求**：
    *   建议提供一个专门供管理员使用的接口（如 `/api/repair/admin/list`），该接口不应有 `userId` 过滤限制。
    *   支持 `status` (pending/processing/completed/cancelled) 和 `faultType` 筛选。
    *   返回结构需包含 `total`。

### 3.4 用户管理 (User)
*   **接口地址**：`/api/admin/user/list`
*   **修改要求**：
    *   支持 `role` (admin/owner) 筛选。
    *   支持 `keyword` (用户名/手机号) 模糊搜索。
    *   返回结构需包含 `total`。

## 4. 后端代码修改示例 (Java/MyBatis-Plus)

如果使用的是 MyBatis-Plus，Controller 层代码示例如下：

```java
// 示例：投诉列表接口
@GetMapping("/list")
public Result<IPage<Complaint>> list(
    @RequestParam(defaultValue = "1") Integer pageNum,
    @RequestParam(defaultValue = "10") Integer pageSize,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String keyword
) {
    // 1. 构建分页对象
    Page<Complaint> page = new Page<>(pageNum, pageSize);
    
    // 2. 构建查询条件
    LambdaQueryWrapper<Complaint> wrapper = new LambdaQueryWrapper<>();
    // 如果有状态筛选
    wrapper.eq(StringUtils.isNotBlank(status), Complaint::getStatus, status);
    // 如果有关键词搜索（假设搜内容或业主名）
    wrapper.and(StringUtils.isNotBlank(keyword), w -> 
        w.like(Complaint::getContent, keyword).or().like(Complaint::getOwnerName, keyword)
    );
    // 按创建时间倒序
    wrapper.orderByDesc(Complaint::getCreateTime);
    
    // 3. 执行查询（MyBatis-Plus 会自动查询总数并填入 total）
    IPage<Complaint> result = complaintService.page(page, wrapper);
    
    return Result.success(result);
}
```

## 5. 特别提醒：统计接口优化（可选）
为了提高首页统计卡片（如“待处理: 5”）的加载速度，建议新增一个聚合统计接口，一次性返回所有状态的计数，避免前端并发调用 3-4 次列表接口。

**建议新增接口**：`/api/admin/stats/overview`
**返回示例**：
```json
{
  "code": 200,
  "data": {
    "complaint": { "total": 50, "pending": 5, "processed": 45 },
    "repair": { "total": 20, "pending": 2, "processing": 3 },
    "visitor": { "total": 100, "pending": 10 },
    "user": { "total": 500, "owner": 490, "admin": 10 }
  }
}
```
这样前端只需调用一次即可渲染所有统计卡片，体验更佳。
