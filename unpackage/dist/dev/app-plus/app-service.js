if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  function resolveEasycom(component, easycom) {
    return typeof component === "string" ? easycom : component;
  }
  const baseUrl = "http://192.168.1.65:8081";
  function request(options) {
    let finalOptions = {};
    if (typeof options === "string") {
      const url = options;
      const payload = arguments[1] || {};
      const method = arguments[2] || "POST";
      let params = {};
      let data = {};
      if (payload.params || payload.data) {
        params = payload.params || {};
        data = payload.data || {};
      } else {
        if (method === "GET" || method === "DELETE") {
          params = payload;
        } else {
          data = payload;
        }
      }
      finalOptions = {
        url,
        params,
        data,
        method
      };
    } else {
      finalOptions = {
        url: "",
        params: {},
        data: {},
        method: "POST",
        ...options
      };
    }
    const token = uni.getStorageSync("token");
    const hasToken = !!token;
    try {
      formatAppLog("log", "at utils/request.js:51", "Token存在:", hasToken, hasToken ? `len=${String(token).length}` : "");
    } catch (e) {
    }
    const headers = {
      // GET请求不需要application/json Content-Type
      ...finalOptions.method !== "GET" ? { "Content-Type": "application/json" } : {},
      ...finalOptions.header
    };
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    } else {
      formatAppLog("warn", "at utils/request.js:63", "未注入Authorization头(无token)");
    }
    finalOptions.header = headers;
    let requestUrl = baseUrl + finalOptions.url;
    if (finalOptions.params && Object.keys(finalOptions.params).length > 0) {
      formatAppLog("log", "at utils/request.js:71", "请求参数:", finalOptions.params);
      const paramStr = Object.entries(finalOptions.params).filter(([key, value]) => value !== null && value !== void 0 && value !== "").map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
      if (paramStr) {
        requestUrl += (requestUrl.includes("?") ? "&" : "?") + paramStr;
      }
    }
    uni.showLoading({ title: "加载中...", mask: true });
    return new Promise((resolve, reject) => {
      formatAppLog("log", "at utils/request.js:86", "发送请求:", requestUrl, finalOptions.method, finalOptions.data);
      formatAppLog("log", "at utils/request.js:87", "请求头已带授权:", Boolean(finalOptions.header && finalOptions.header.Authorization));
      const requestTask = uni.request({
        url: requestUrl,
        data: finalOptions.data,
        method: finalOptions.method,
        header: finalOptions.header,
        timeout: 1e4,
        success: (res) => {
          uni.hideLoading();
          const responseData = res.data || {};
          const { code, msg, data } = responseData;
          const bizCode = typeof code === "string" ? parseInt(code, 10) : code;
          formatAppLog("log", "at utils/request.js:102", "响应状态:", res.statusCode, "业务code:", code, "msg:", msg, "url:", requestUrl);
          if (res.statusCode === 200) {
            if (bizCode === 200 || bizCode === 0 || bizCode === void 0 || Number.isNaN(bizCode)) {
              const resolvedData = data !== void 0 ? data : responseData;
              formatAppLog("log", "at utils/request.js:111", "Request resolved with:", JSON.stringify(resolvedData).substring(0, 200) + "...");
              resolve(resolvedData);
            } else {
              if (code === 401) {
                formatAppLog("warn", "at utils/request.js:119", "401未登录拦截:", requestUrl);
                uni.showModal({
                  title: "登录提示",
                  content: msg || "请先登录",
                  showCancel: false,
                  success: () => {
                    uni.redirectTo({ url: "/owner/pages/login/login" });
                  }
                });
                reject(new Error(msg || "未登录"));
              } else if (code === 403) {
                formatAppLog("warn", "at utils/request.js:131", "403无权限拦截:", requestUrl);
                uni.showModal({
                  title: "权限提示",
                  content: msg || "您没有权限执行此操作",
                  showCancel: false
                });
                reject(new Error(msg || "无权限操作"));
              } else {
                uni.showModal({
                  title: "操作失败",
                  content: msg || "操作失败，请重试",
                  showCancel: false
                });
                reject(new Error(msg || "操作失败"));
              }
            }
          } else {
            if (res.statusCode === 401) {
              formatAppLog("warn", "at utils/request.js:154", "HTTP 401 未登录:", requestUrl);
              uni.showModal({
                title: "登录提示",
                content: msg || "请先登录",
                showCancel: false,
                success: () => {
                  uni.redirectTo({ url: "/owner/pages/login/login" });
                }
              });
              reject(new Error(msg || "未登录"));
            } else {
              const errMsg = msg || `请求失败，状态码: ${res.statusCode}`;
              formatAppLog("warn", "at utils/request.js:167", "HTTP错误:", res.statusCode, "url:", requestUrl);
              formatAppLog("warn", "at utils/request.js:168", "错误详情(Body):", JSON.stringify(res.data));
              uni.showModal({
                title: "网络错误",
                content: errMsg,
                showCancel: false
              });
              reject(new Error(errMsg));
            }
          }
        },
        fail: (err) => {
          uni.hideLoading();
          let errMsg = "网络错误，请重试";
          if (err.errMsg.includes("timeout")) {
            errMsg = "请求超时，请检查网络连接";
          } else if (err.errMsg.includes("connect")) {
            errMsg = "无法连接到服务器，请检查服务器是否启动";
          } else if (err.errMsg.includes("abort")) {
            errMsg = "请求被中止，请检查网络设置";
          } else if (err.errMsg.includes("fail")) {
            errMsg = "请求失败，请重试";
          } else {
            errMsg = err.errMsg || errMsg;
          }
          formatAppLog("error", "at utils/request.js:197", "请求失败:", err && err.errMsg, "url:", requestUrl);
          uni.showModal({
            title: "网络错误",
            content: errMsg,
            showCancel: false
          });
          reject(new Error(errMsg));
        },
        complete: () => {
          formatAppLog("log", "at utils/request.js:207", "请求完成:", requestUrl);
        }
      });
      if (finalOptions.returnTask) {
        return requestTask;
      }
    });
  }
  request.get = (url, options = {}) => {
    return request({ url, method: "GET", ...options });
  };
  request.post = (url, data = {}, options = {}) => {
    return request({ url, method: "POST", data, ...options });
  };
  request.put = (url, data = {}, options = {}) => {
    return request({ url, method: "PUT", data, ...options });
  };
  request.delete = (url, options = {}) => {
    return request({ url, method: "DELETE", ...options });
  };
  formatAppLog("log", "at utils/request.js:234", "request.js loaded. Methods attached:", {
    get: typeof request.get,
    post: typeof request.post,
    put: typeof request.put,
    delete: typeof request.delete
  });
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$C = {
    data() {
      return {
        userInfo: null,
        notices: [],
        unreadCount: 0,
        shortcuts: [
          {
            id: 1,
            title: "在线报修",
            desc: "2小时响应",
            icon: "修",
            path: "/owner/pages/repair/repair"
          },
          {
            id: 2,
            title: "快递代收",
            desc: "扫码取件",
            icon: "递",
            path: "/owner/pages/communityService/index"
          },
          {
            id: 3,
            title: "费用缴纳",
            desc: "在线支付",
            icon: "费",
            path: "/owner/pages/communityService/pay-fee"
          },
          {
            id: 4,
            title: "访客登记",
            desc: "通行凭证",
            icon: "访",
            path: "/owner/pages/communityService/visitor-apply"
          },
          {
            id: 5,
            title: "投诉建议",
            desc: "反馈问题",
            icon: "诉",
            path: "/owner/pages/communityService/complaint"
          },
          {
            id: 6,
            title: "社区活动",
            desc: "报名参与",
            icon: "活",
            path: "/owner/pages/communityService/activity-list"
          }
        ]
      };
    },
    onShow() {
      this.loadUser();
      this.loadNotices();
      this.loadUnreadCount();
    },
    methods: {
      async loadUnreadCount() {
        const user = uni.getStorageSync("userInfo");
        if (!(user == null ? void 0 : user.id))
          return;
        try {
          const res = await request({
            url: "/api/notice/unread-count",
            method: "GET",
            params: { userId: user.id }
          });
          formatAppLog("log", "at owner/pages/index/index.vue:155", "未读消息接口返回:", res);
          if (res.code === 200) {
            this.unreadCount = (typeof res.data === "number" ? res.data : res) || 0;
          } else if (typeof res === "number") {
            this.unreadCount = res;
          }
        } catch (err) {
          formatAppLog("error", "at owner/pages/index/index.vue:164", "加载未读数失败", err);
        }
      },
      jump(url) {
        if (url)
          uni.navigateTo({ url });
      },
      gotoNoticeList() {
        uni.navigateTo({
          url: "/owner/pages/notice/list"
        });
      },
      openNoticeDetail(item) {
        uni.navigateTo({
          url: `/owner/pages/notice/detail?notice=${encodeURIComponent(JSON.stringify(item))}`
        });
      },
      /** 统一读取用户信息（使用 id 字段） */
      loadUser() {
        const u = uni.getStorageSync("userInfo");
        if (u && u.userId && !u.id) {
          u.id = u.userId;
        }
        this.userInfo = u;
      },
      /** 请求公告 */
      async loadNotices() {
        const user = uni.getStorageSync("userInfo");
        if (!(user == null ? void 0 : user.id))
          return;
        try {
          const data = await request({
            url: "/api/notice/list",
            method: "GET",
            params: {
              userId: user.id,
              pageNum: 1,
              pageSize: 5
            }
          });
          const records = data.records || [];
          this.notices = records.slice(0, 4).map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            // ✅ 关键
            publishTime: n.publishTime,
            // ✅ 关键
            readFlag: n.readFlag,
            tag: this.getTag(n.targetType)
          }));
        } catch (err) {
          formatAppLog("error", "at owner/pages/index/index.vue:221", "公告加载失败", err);
        }
      },
      async openNoticeDetail(item) {
        if (item.readFlag === 0) {
          try {
            await request({
              url: `/api/notice/${item.id}/read`,
              method: "PUT"
            });
            item.readFlag = 1;
            this.notices = [...this.notices];
          } catch (err) {
            formatAppLog("error", "at owner/pages/index/index.vue:238", "标记已读失败", err);
          }
        }
        uni.navigateTo({
          url: `/owner/pages/notice/detail?notice=${encodeURIComponent(
            JSON.stringify(item)
          )}`
        });
      },
      /** 时间格式化 */
      formatTime(str) {
        if (!str)
          return "";
        if (str.includes(" ") && !str.includes("T")) {
          str = str.replace(" ", "T");
        }
        const date = new Date(str);
        if (isNaN(date.getTime()))
          return "";
        return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
      },
      getTag(type) {
        switch (type) {
          case "ALL":
            return "通知";
          case "COMMUNITY":
            return "小区";
          case "BUILDING":
            return "楼栋";
          case "USER":
            return "提醒";
          default:
            return "公告";
        }
      },
      logout() {
        uni.removeStorageSync("userInfo");
        uni.removeStorageSync("token");
        this.userInfo = null;
        uni.redirectTo({ url: "/owner/pages/login/login" });
      }
    }
  };
  function _sfc_render$B(_ctx, _cache, $props, $setup, $data, $options) {
    var _a;
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 顶部欢迎卡片 "),
      vue.createElementVNode("view", { class: "hero-card" }, [
        vue.createElementVNode("view", { class: "hero-content" }, [
          vue.createElementVNode("view", { class: "hero-text-area" }, [
            vue.createElementVNode(
              "text",
              { class: "hello" },
              "您好，" + vue.toDisplayString(((_a = $data.userInfo) == null ? void 0 : _a.username) || "访客"),
              1
              /* TEXT */
            ),
            vue.createElementVNode("view", { class: "sub" }, "社区服务实时在线"),
            $data.userInfo ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "user-role"
            }, [
              vue.createElementVNode(
                "text",
                null,
                vue.toDisplayString($data.userInfo.role === "admin" || $data.userInfo.role === "super_admin" ? "管理员" : "业主") + "账号",
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createCommentVNode(" 消息提醒 "),
          $data.userInfo ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "notification-area",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.gotoNoticeList && $options.gotoNoticeList(...args))
          }, [
            vue.createElementVNode("view", { class: "bell-icon" }, "🔔"),
            $data.unreadCount > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "badge"
            }, [
              vue.createElementVNode(
                "text",
                null,
                vue.toDisplayString($data.unreadCount > 99 ? "99+" : $data.unreadCount),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true)
          ])) : vue.createCommentVNode("v-if", true)
        ]),
        vue.createElementVNode("view", {
          class: "status-badge",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.logout && $options.logout(...args))
        }, [
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($data.userInfo ? "退出登录" : "登录"),
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createCommentVNode(" 社区公告 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "社区公告"),
          vue.createCommentVNode(" 将 text 改为 view 包裹，确保 @tap 生效 "),
          vue.createElementVNode("view", {
            class: "section-link",
            onClick: _cache[2] || (_cache[2] = (...args) => $options.gotoNoticeList && $options.gotoNoticeList(...args))
          }, [
            vue.createElementVNode("text", null, "查看全部")
          ])
        ]),
        vue.createElementVNode("view", { class: "notice-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.notices, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "notice-item",
                onClick: ($event) => $options.openNoticeDetail(item)
              }, [
                vue.createElementVNode("view", { class: "notice-main" }, [
                  vue.createElementVNode("text", { class: "notice-title" }, [
                    vue.createElementVNode(
                      "text",
                      {
                        style: vue.normalizeStyle({ fontWeight: item.readFlag === 0 ? "600" : "400", color: item.readFlag === 0 ? "#ff4d4f" : "#1f2430" })
                      },
                      vue.toDisplayString(item.title),
                      5
                      /* TEXT, STYLE */
                    )
                  ]),
                  vue.createElementVNode(
                    "text",
                    { class: "notice-time" },
                    vue.toDisplayString(item.time),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode(
                  "text",
                  { class: "notice-tag" },
                  vue.toDisplayString(item.tag),
                  1
                  /* TEXT */
                )
              ], 8, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ]),
      vue.createCommentVNode(" 快捷入口 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "快捷入口")
        ]),
        vue.createElementVNode("view", { class: "entry-grid" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.shortcuts, (entry) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: entry.id,
                class: "entry-item",
                onClick: ($event) => $options.jump(entry.path)
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "entry-icon" },
                  vue.toDisplayString(entry.icon),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "entry-title" },
                  vue.toDisplayString(entry.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "entry-desc" },
                  vue.toDisplayString(entry.desc),
                  1
                  /* TEXT */
                )
              ], 8, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])
    ]);
  }
  const OwnerPagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$C, [["render", _sfc_render$B], ["__scopeId", "data-v-52d495ef"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/index/index.vue"]]);
  const _sfc_main$B = {
    data() {
      return {
        summary: {
          balance: 0
        },
        cars: [],
        userInfo: {},
        // 续费相关
        showRenewPopup: false,
        currentCar: null,
        selectedDuration: 1,
        currentPrice: 0,
        isFirstPay: false,
        // 是否为首次支付
        payMethod: "BALANCE",
        renewOptions: [
          { label: "1个月", months: 1, price: 300 },
          { label: "3个月", months: 3, price: 850 },
          // 优惠价
          { label: "1年", months: 12, price: 3e3 }
          // 优惠价
        ]
      };
    },
    onLoad() {
      this.loadUser();
      this.loadCars();
    },
    onShow() {
      this.loadBalance();
    },
    methods: {
      loadUser() {
        const user = uni.getStorageSync("userInfo");
        if (!user || !user.id) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        this.userInfo = user;
      },
      // 查询我的车位
      async loadCars() {
        try {
          uni.showLoading({ title: "加载中..." });
          const res = await request({
            url: "/api/parking/space/my",
            method: "GET"
          });
          let list = Array.isArray(res) ? res : res.records || res.data || [];
          if (!list || list.length === 0) {
            formatAppLog("log", "at owner/pages/parking/index.vue:200", "【DEBUG】使用模拟车位数据");
          }
          formatAppLog("log", "at owner/pages/parking/index.vue:206", "【DEBUG】我的车位数据:", JSON.stringify(list));
          const format = (t) => {
            if (!t)
              return "待定";
            const d = new Date(t);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          };
          this.cars = list.map((item) => {
            let status = item.leaseStatus;
            if (!status) {
              if (item.leaseType === "PERPETUAL") {
                status = "ACTIVE";
              } else if (item.leaseEndTime) {
                status = new Date(item.leaseEndTime) > /* @__PURE__ */ new Date() ? "ACTIVE" : "EXPIRED";
              } else {
                status = "AWAITING_PAYMENT";
              }
            }
            if (status === "AVAILABLE") {
              status = "AWAITING_PAYMENT";
            }
            return {
              id: item.id,
              slot: item.slot,
              communityName: item.communityName,
              leaseType: item.leaseType,
              leaseStartTime: item.leaseStartTime,
              leaseEndTime: item.leaseEndTime,
              expire: item.leaseEndTime ? `${format(item.leaseStartTime)} ~ ${format(item.leaseEndTime)}` : status === "ACTIVE" ? "永久有效" : "待开通",
              active: status === "ACTIVE",
              statusText: item.statusText,
              leaseStatus: status,
              // 🔹 新增车牌字段
              plateNo: item.plateNo || "",
              isPerpetual: item.leaseType === "PERPETUAL"
              // 永久车位不可续费
            };
          });
        } catch (e) {
          formatAppLog("error", "at owner/pages/parking/index.vue:261", e);
          uni.showToast({ title: "获取车位失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      getStatusText(car) {
        if (car.leaseStatus === "PENDING")
          return "审核中";
        if (car.leaseStatus === "AWAITING_PAYMENT")
          return "待缴费";
        if (car.leaseStatus === "REJECTED")
          return "已拒绝";
        if (car.leaseStatus === "EXPIRED")
          return "已过期";
        return car.statusText || "使用中";
      },
      // 查询余额
      async loadBalance() {
        try {
          const balance = await request({
            url: "/api/parking/account/balance",
            method: "GET"
          });
          if (typeof balance === "number") {
            this.summary.balance = balance;
          } else if (balance && typeof balance.data === "number") {
            this.summary.balance = balance.data;
          } else {
            this.summary.balance = 0;
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/parking/index.vue:293", "获取余额失败", e);
          this.summary.balance = 0;
        }
      },
      // 跳转充值页面
      goRecharge() {
        uni.navigateTo({
          url: `/owner/pages/parking/recharge?balance=${this.summary.balance || 0}`
        });
      },
      // 跳转绑定车辆页面
      goBindCar() {
        uni.navigateTo({
          url: "/owner/pages/parking/bind-car"
        });
      },
      // 跳转车位详情页
      goSpaceDetail(car) {
        uni.navigateTo({
          url: "/owner/pages/parking/space-detail",
          success: (res) => {
            res.eventChannel.emit("carDetail", car);
          }
        });
      },
      // --- 首次支付逻辑 ---
      handleFirstPay(car) {
        this.currentCar = car;
        this.selectedDuration = 1;
        this.updatePrice();
        this.showRenewPopup = true;
        this.isFirstPay = true;
      },
      // --- 续费逻辑 ---
      handleRenew(car) {
        this.currentCar = car;
        this.selectedDuration = 1;
        this.updatePrice();
        this.showRenewPopup = true;
        this.isFirstPay = false;
      },
      closeRenew() {
        this.showRenewPopup = false;
      },
      selectDuration(opt) {
        this.selectedDuration = opt.months;
        this.updatePrice();
      },
      updatePrice() {
        const opt = this.renewOptions.find((o) => o.months === this.selectedDuration);
        this.currentPrice = opt ? opt.price : 0;
      },
      onPayMethodChange(e) {
        this.payMethod = e.detail.value;
      },
      async confirmRenew() {
        if (this.summary.balance < this.currentPrice) {
          uni.showToast({ title: "余额不足，请先充值", icon: "none" });
          return;
        }
        try {
          uni.showLoading({ title: "支付中..." });
          const isOpening = this.currentCar.leaseStatus === "AWAITING_PAYMENT" || this.isFirstPay;
          const url = isOpening ? "/api/parking/space/open" : "/api/parking/space/renew";
          await request(url, {
            spaceId: this.currentCar.id,
            durationMonths: this.selectedDuration,
            payMethod: this.payMethod,
            amount: this.currentPrice,
            userId: this.userInfo.id
          }, "POST");
          uni.hideLoading();
          uni.showToast({ title: isOpening ? "开通成功" : "续费成功", icon: "success" });
          this.closeRenew();
          this.loadBalance();
          this.loadCars();
        } catch (e) {
          uni.hideLoading();
          formatAppLog("error", "at owner/pages/parking/index.vue:392", "支付失败:", e);
          uni.showToast({ title: e.message || "支付失败", icon: "none" });
        }
      }
    }
  };
  function _sfc_render$A(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 顶部余额卡片 "),
      vue.createElementVNode("view", { class: "balance-card" }, [
        vue.createElementVNode("view", null, [
          vue.createElementVNode("text", { class: "balance-title" }, "停车账户余额"),
          vue.createElementVNode("text", { class: "balance-amount" }, [
            vue.createTextVNode(" 余额： "),
            vue.createElementVNode(
              "text",
              { class: "highlight" },
              vue.toDisplayString($data.summary.balance) + " 元",
              1
              /* TEXT */
            )
          ])
        ]),
        vue.createElementVNode("button", {
          class: "btn primary small-btn",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.goRecharge && $options.goRecharge(...args))
        }, " 去充值 ")
      ]),
      vue.createCommentVNode(" 我的车位 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "我的车位"),
          vue.createCommentVNode(" 车辆绑定入口 "),
          vue.createElementVNode("text", {
            class: "section-link",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.goBindCar && $options.goBindCar(...args))
          }, "绑定车辆")
        ]),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.cars, (car) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: car.id,
              class: "car-card",
              onClick: ($event) => $options.goSpaceDetail(car)
            }, [
              vue.createElementVNode("view", { class: "car-card-header" }, [
                vue.createElementVNode(
                  "text",
                  { class: "plate" },
                  vue.toDisplayString(car.slot),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  {
                    class: vue.normalizeClass(["car-status", {
                      "status-on": car.active,
                      "status-off": !car.active && car.leaseStatus !== "PENDING" && car.leaseStatus !== "AWAITING_PAYMENT",
                      "status-warn": car.leaseStatus === "PENDING" || car.leaseStatus === "AWAITING_PAYMENT"
                    }])
                  },
                  vue.toDisplayString($options.getStatusText(car)),
                  3
                  /* TEXT, CLASS */
                )
              ]),
              vue.createElementVNode("view", { class: "car-card-body" }, [
                vue.createElementVNode("view", { class: "row" }, [
                  vue.createElementVNode("text", { class: "label" }, "车位类型"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(car.leaseType === "MONTHLY" ? "月卡" : car.leaseType === "YEARLY" ? "年卡" : "永久"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "row" }, [
                  vue.createElementVNode("text", { class: "label" }, "有效期"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(car.expire),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "row" }, [
                  vue.createElementVNode("text", { class: "label" }, "所属小区"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(car.communityName),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              vue.createCommentVNode(" 底部续费操作栏 "),
              !car.isPerpetual && car.leaseStatus !== "PENDING" && car.leaseStatus !== "REJECTED" ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "car-card-footer"
              }, [
                car.leaseStatus === "AWAITING_PAYMENT" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 0,
                  class: "btn primary small-btn",
                  onClick: vue.withModifiers(($event) => $options.handleFirstPay(car), ["stop"])
                }, " 去支付 ", 8, ["onClick"])) : (vue.openBlock(), vue.createElementBlock("button", {
                  key: 1,
                  class: "btn ghost small-btn",
                  onClick: vue.withModifiers(($event) => $options.handleRenew(car), ["stop"])
                }, " 办理续费 ", 8, ["onClick"]))
              ])) : vue.createCommentVNode("v-if", true)
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createCommentVNode(" 续费弹窗 "),
      $data.showRenewPopup ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "custom-popup"
      }, [
        vue.createElementVNode("view", {
          class: "popup-mask",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.closeRenew && $options.closeRenew(...args))
        }),
        vue.createElementVNode("view", { class: "popup-body" }, [
          vue.createElementVNode("view", { class: "renew-panel" }, [
            vue.createElementVNode("view", { class: "panel-header" }, [
              vue.createElementVNode(
                "text",
                { class: "panel-title" },
                vue.toDisplayString($data.isFirstPay ? "车位开通缴费" : "车位续费"),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", {
                class: "close-icon",
                onClick: _cache[3] || (_cache[3] = (...args) => $options.closeRenew && $options.closeRenew(...args))
              }, "×")
            ]),
            $data.currentCar ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "panel-body"
            }, [
              vue.createElementVNode("view", { class: "info-item" }, [
                vue.createElementVNode("text", { class: "label" }, "车位号"),
                vue.createElementVNode(
                  "text",
                  { class: "value" },
                  vue.toDisplayString($data.currentCar.slot),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "option-title" }, "选择时长"),
              vue.createElementVNode("view", { class: "duration-options" }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.renewOptions, (opt) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      class: vue.normalizeClass(["option-item", { active: $data.selectedDuration === opt.months }]),
                      key: opt.months,
                      onClick: ($event) => $options.selectDuration(opt)
                    }, [
                      vue.createElementVNode(
                        "text",
                        { class: "opt-name" },
                        vue.toDisplayString(opt.label),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "opt-price" },
                        "¥" + vue.toDisplayString(opt.price),
                        1
                        /* TEXT */
                      )
                    ], 10, ["onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ]),
              vue.createElementVNode("view", { class: "pay-method" }, [
                vue.createElementVNode("view", { class: "method-title" }, "支付方式"),
                vue.createElementVNode(
                  "radio-group",
                  {
                    onChange: _cache[4] || (_cache[4] = (...args) => $options.onPayMethodChange && $options.onPayMethodChange(...args))
                  },
                  [
                    vue.createElementVNode("label", { class: "radio-label" }, [
                      vue.createElementVNode("radio", {
                        value: "BALANCE",
                        checked: "",
                        color: "#2D81FF",
                        style: { "transform": "scale(0.8)" }
                      }),
                      vue.createElementVNode(
                        "text",
                        null,
                        "余额支付 (剩余: " + vue.toDisplayString($data.summary.balance) + "元)",
                        1
                        /* TEXT */
                      )
                    ])
                  ],
                  32
                  /* NEED_HYDRATION */
                )
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("view", { class: "panel-footer" }, [
              vue.createElementVNode("view", { class: "total-price" }, [
                vue.createTextVNode(" 总计: "),
                vue.createElementVNode(
                  "text",
                  { class: "price-num" },
                  "¥" + vue.toDisplayString($data.currentPrice),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("button", {
                class: "pay-btn",
                onClick: _cache[5] || (_cache[5] = (...args) => $options.confirmRenew && $options.confirmRenew(...args))
              }, "立即支付")
            ])
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const OwnerPagesParkingIndex = /* @__PURE__ */ _export_sfc(_sfc_main$B, [["render", _sfc_render$A], ["__scopeId", "data-v-b7a6754f"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/parking/index.vue"]]);
  const _sfc_main$A = {
    data() {
      return {
        topics: [],
        likedTopics: [],
        // 已点赞列表
        showPostModal: false,
        newTopic: { title: "", content: "", imageUrls: [] },
        userInfo: null
      };
    },
    onLoad() {
    },
    onShow() {
      this.userInfo = uni.getStorageSync("userInfo") || {};
      if (!this.userInfo.id && this.userInfo.userId) {
        this.userInfo.id = this.userInfo.userId;
      }
      this.loadTopics();
    },
    methods: {
      async loadTopics() {
        try {
          const data = await request({
            url: "/api/topic/list",
            method: "GET",
            params: { pageNum: 1, pageSize: 10, status: "APPROVED" }
          });
          if (data == null ? void 0 : data.records) {
            this.topics = data.records.map((t) => ({
              id: t.id,
              title: t.title,
              author: t.authorName || "匿名",
              time: t.createTime ? new Date(t.createTime).toLocaleString() : "",
              content: t.content,
              likes: t.likeCount || 0,
              comments: t.commentCount || 0,
              showCommentInput: false,
              commentContent: "",
              showFull: false
              // 控制是否显示全文
            }));
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/topic/index.vue:128", "加载话题失败", e);
        }
      },
      likeTopic(topic) {
        var _a;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id)) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        if (this.likedTopics.includes(topic.id)) {
          uni.showToast({ title: "您已点赞", icon: "none" });
          return;
        }
        request({
          url: `/api/topic/${topic.id}/like`,
          method: "PUT",
          params: { userId: this.userInfo.id }
        }).then((res) => {
          if (res === true) {
            topic.likes += 1;
            this.likedTopics.push(topic.id);
          }
        }).catch(() => uni.showToast({ title: "点赞失败", icon: "none" }));
      },
      toggleCommentInput(topic) {
        topic.showCommentInput = !topic.showCommentInput;
      },
      commentTopic(topic) {
        var _a;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id)) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        if (!topic.commentContent) {
          uni.showToast({ title: "请输入评论内容", icon: "none" });
          return;
        }
        request({
          url: `/api/topic/${topic.id}/comment`,
          method: "POST",
          data: { userId: this.userInfo.id, content: topic.commentContent }
        }).then((res) => {
          if (res) {
            topic.comments += 1;
            topic.commentContent = "";
            topic.showCommentInput = false;
            uni.showToast({ title: "评论成功", icon: "success" });
          }
        }).catch(() => uni.showToast({ title: "评论失败", icon: "none" }));
      },
      openPostModal() {
        this.newTopic = { title: "", content: "", imageUrls: [] };
        this.showPostModal = true;
      },
      postTopic() {
        var _a;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id)) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        const { title, content, imageUrls } = this.newTopic;
        if (!title || !content) {
          uni.showToast({ title: "请填写标题和内容", icon: "none" });
          return;
        }
        request({
          url: "/api/topic",
          method: "POST",
          data: { userId: this.userInfo.id, title, content, imageUrls }
        }).then((res) => {
          if (res) {
            uni.showToast({ title: "发布成功，等待审核", icon: "success" });
            this.showPostModal = false;
            this.loadTopics();
          }
        }).catch(() => uni.showToast({ title: "发布失败", icon: "none" }));
      },
      toggleFullContent(topic) {
        topic.showFull = !topic.showFull;
      },
      goDetail(topicId) {
        uni.navigateTo({
          url: `/owner/pages/topic/detail?id=${topicId}`
        });
      }
    }
  };
  function _sfc_render$z(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 顶部标题和发帖按钮 "),
      vue.createElementVNode("view", { class: "section-header" }, [
        vue.createElementVNode("text", { class: "section-title" }, "热门话题"),
        vue.createElementVNode("text", {
          class: "section-link",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.openPostModal && $options.openPostModal(...args))
        }, "发帖")
      ]),
      vue.createCommentVNode(" 话题列表 "),
      (vue.openBlock(true), vue.createElementBlock(
        vue.Fragment,
        null,
        vue.renderList($data.topics, (topic) => {
          return vue.openBlock(), vue.createElementBlock("view", {
            key: topic.id,
            class: "topic-card"
          }, [
            vue.createElementVNode("view", {
              class: "card-header",
              onClick: ($event) => $options.goDetail(topic.id)
            }, [
              vue.createElementVNode("view", null, [
                vue.createElementVNode(
                  "text",
                  { class: "topic-title" },
                  vue.toDisplayString(topic.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "view",
                  { class: "topic-meta" },
                  vue.toDisplayString(topic.author) + " · " + vue.toDisplayString(topic.time),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode(
                "text",
                { class: "badge" },
                vue.toDisplayString(topic.category || "话题"),
                1
                /* TEXT */
              )
            ], 8, ["onClick"]),
            vue.createCommentVNode(" 内容摘要/全文切换 "),
            vue.createElementVNode("view", {
              class: "topic-content",
              onClick: vue.withModifiers(($event) => $options.toggleFullContent(topic), ["stop"])
            }, [
              vue.createElementVNode(
                "text",
                { style: { whiteSpace: "pre-wrap" } },
                vue.toDisplayString(topic.showFull ? topic.content : topic.content.length > 200 ? topic.content.slice(0, 200) + "..." : topic.content),
                1
                /* TEXT */
              ),
              topic.content.length > 200 ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 0,
                  class: "toggle-btn"
                },
                vue.toDisplayString(topic.showFull ? "收起" : "展开全文"),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ], 8, ["onClick"]),
            vue.createElementVNode("view", { class: "topic-actions" }, [
              vue.createElementVNode("text", {
                class: vue.normalizeClass($data.likedTopics.includes(topic.id) ? "liked" : "like-btn"),
                onClick: vue.withModifiers(($event) => $options.likeTopic(topic), ["stop"])
              }, " 👍 " + vue.toDisplayString(topic.likes), 11, ["onClick"]),
              vue.createElementVNode("text", {
                onClick: vue.withModifiers(($event) => $options.toggleCommentInput(topic), ["stop"])
              }, "💬 " + vue.toDisplayString(topic.comments), 9, ["onClick"])
            ]),
            vue.createCommentVNode(" 评论输入框 "),
            topic.showCommentInput ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "comment-box"
            }, [
              vue.withDirectives(vue.createElementVNode("input", {
                "onUpdate:modelValue": ($event) => topic.commentContent = $event,
                placeholder: "写评论..."
              }, null, 8, ["onUpdate:modelValue"]), [
                [vue.vModelText, topic.commentContent]
              ]),
              vue.createElementVNode("button", {
                onClick: ($event) => $options.commentTopic(topic)
              }, "提交", 8, ["onClick"])
            ])) : vue.createCommentVNode("v-if", true)
          ]);
        }),
        128
        /* KEYED_FRAGMENT */
      )),
      vue.createCommentVNode(" 发帖弹窗 "),
      $data.showPostModal ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "mask"
      }, [
        vue.createElementVNode("view", { class: "dialog" }, [
          vue.createElementVNode("view", { class: "dialog-title" }, "发布话题"),
          vue.createCommentVNode(" 可滚动内容区 "),
          vue.createElementVNode("scroll-view", {
            class: "dialog-body",
            "scroll-y": ""
          }, [
            vue.createElementVNode("view", { class: "form-item" }, [
              vue.createElementVNode("text", { class: "label" }, "标题"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.newTopic.title = $event),
                  placeholder: "请输入标题"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.newTopic.title]
              ])
            ]),
            vue.createElementVNode("view", { class: "form-item" }, [
              vue.createElementVNode("text", { class: "label" }, "内容"),
              vue.withDirectives(vue.createElementVNode(
                "textarea",
                {
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.newTopic.content = $event),
                  placeholder: "请输入内容",
                  maxlength: "20000",
                  "auto-height": "",
                  class: "content-textarea"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.newTopic.content]
              ])
            ])
          ]),
          vue.createCommentVNode(" 固定在底部的按钮 "),
          vue.createElementVNode("view", { class: "dialog-actions" }, [
            vue.createElementVNode("button", {
              class: "btn ghost",
              onClick: _cache[3] || (_cache[3] = ($event) => $data.showPostModal = false)
            }, "取消"),
            vue.createElementVNode("button", {
              class: "btn primary",
              onClick: _cache[4] || (_cache[4] = (...args) => $options.postTopic && $options.postTopic(...args))
            }, "发布")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const OwnerPagesTopicIndex = /* @__PURE__ */ _export_sfc(_sfc_main$A, [["render", _sfc_render$z], ["__scopeId", "data-v-8ddf5b97"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/topic/index.vue"]]);
  const _sfc_main$z = {
    data() {
      return {
        user: {
          name: "",
          community: "",
          room: "",
          userId: ""
        },
        houses: [],
        bills: []
      };
    },
    onShow() {
      this.fetchUserData();
      this.fetchHouseData();
      this.fetchBillData();
    },
    methods: {
      // 获取用户信息 - 使用 /api/user/info 接口
      async fetchUserData() {
        try {
          uni.showLoading({ title: "加载中..." });
          const result = await request({
            url: "/api/user/info",
            method: "GET"
            // 不需要传入userId，后端会从Authorization头中获取当前登录用户信息
          });
          this.user = {
            name: result.username || result.name || "未知用户",
            community: result.community || "未绑定社区",
            room: result.room || "未绑定房屋",
            userId: result.id || result.userId
            // 优先使用id
          };
        } catch (error) {
          formatAppLog("error", "at owner/pages/mine/index.vue:82", "获取用户信息失败:", error);
          uni.showToast({ title: "获取用户信息失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      // 获取房屋信息 - 使用 /api/house/getAllHouseInfo 接口
      async fetchHouseData() {
        try {
          const result = await request({
            url: "/api/house/getHouseInfoByUserId",
            method: "GET"
          });
          this.houses = Array.isArray(result) ? result.map((house) => ({
            id: house.id,
            // 接口返回的是id，而非houseId
            address: `${house.communityName} ${house.buildingNo} ${house.houseNo}`,
            // 字段匹配，可简化
            // 若接口未返回status，可根据bindStatus或isDefault模拟，或留空
            status: house.bindStatus === 1 ? "已绑定" : "未绑定",
            bind: house.bindStatus === 1 || house.isDefault === 1
            // 用bindStatus或isDefault判断绑定状态
          })) : [];
        } catch (error) {
          formatAppLog("error", "at owner/pages/mine/index.vue:105", "获取房屋信息失败:", error);
          this.houses = [];
        }
      },
      // 获取缴费记录 - 使用 /api/fee/history 接口
      async fetchBillData() {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          const userId = (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId) || this.user.userId;
          if (!userId) {
            formatAppLog("warn", "at owner/pages/mine/index.vue:118", "获取缴费记录失败: 未找到userId");
            return;
          }
          const result = await request({
            url: "/api/fee/history",
            method: "GET",
            params: {
              userId,
              startTime: this.getStartDate(3),
              endTime: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
            }
          });
          const list = result.records || [];
          this.bills = list.map((bill) => ({
            id: bill.recordId || bill.billId,
            title: bill.feeCycle ? `物业费(${bill.feeCycle})` : "物业费",
            date: bill.payTime ? bill.payTime.split("T")[0] : "待缴",
            amount: bill.status === "SUCCESS" ? `-¥ ${bill.payAmount.toFixed(2)}` : `¥ ${bill.payAmount.toFixed(2)}`,
            status: bill.status === "SUCCESS" ? "done" : "pending"
          }));
        } catch (error) {
          formatAppLog("error", "at owner/pages/mine/index.vue:146", "获取缴费记录失败:", error);
          this.bills = [];
        }
      },
      // 获取几个月前的日期
      getStartDate(months) {
        const date = /* @__PURE__ */ new Date();
        date.setMonth(date.getMonth() - months);
        return date.toISOString().split("T")[0];
      },
      navTo(url) {
        uni.navigateTo({ url });
      }
    }
  };
  function _sfc_render$y(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", {
        class: "profile-card",
        onClick: _cache[0] || (_cache[0] = ($event) => $options.navTo("/owner/pages/mine/profile"))
      }, [
        vue.createElementVNode("view", { class: "avatar" }, "L"),
        vue.createElementVNode("view", { class: "info" }, [
          vue.createElementVNode(
            "text",
            { class: "name" },
            vue.toDisplayString($data.user.name),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "meta" },
            vue.toDisplayString($data.user.community) + " · " + vue.toDisplayString($data.user.room),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "service-tag" }, "业主")
      ]),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "房屋绑定"),
          vue.createCommentVNode(" 绑定跳转事件 "),
          vue.createElementVNode("text", {
            class: "section-link",
            onClick: _cache[1] || (_cache[1] = ($event) => $options.navTo("/owner/pages/mine/house-bind"))
          }, "去绑定")
        ]),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.houses, (house) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: house.id,
              class: "entry-card"
            }, [
              vue.createElementVNode("view", { class: "entry-left" }, [
                vue.createElementVNode(
                  "text",
                  { class: "entry-title" },
                  vue.toDisplayString(house.address),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "entry-desc" },
                  vue.toDisplayString(house.status),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode(
                "text",
                { class: "entry-action" },
                vue.toDisplayString(house.bind ? "已认证" : "待认证"),
                1
                /* TEXT */
              )
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "缴费记录"),
          vue.createElementVNode("text", {
            class: "section-link",
            onClick: _cache[2] || (_cache[2] = ($event) => $options.navTo("/owner/pages/communityService/pay-fee"))
          }, "查看全部")
        ]),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.bills, (bill) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: bill.id,
              class: "bill-item"
            }, [
              vue.createElementVNode("view", null, [
                vue.createElementVNode(
                  "text",
                  { class: "bill-title" },
                  vue.toDisplayString(bill.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "bill-desc" },
                  vue.toDisplayString(bill.date),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode(
                "text",
                {
                  class: vue.normalizeClass(["bill-amount", bill.status])
                },
                vue.toDisplayString(bill.amount),
                3
                /* TEXT, CLASS */
              )
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const OwnerPagesMineIndex = /* @__PURE__ */ _export_sfc(_sfc_main$z, [["render", _sfc_render$y], ["__scopeId", "data-v-d9f42c5e"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/mine/index.vue"]]);
  const _imports_0$1 = "/static/service/notice.png";
  const _imports_1 = "/static/service/repair.png";
  const _imports_2 = "/static/service/pay.png";
  const _imports_3 = "/static/service/visitor.png";
  const _imports_4 = "/static/service/complaint.png";
  const _imports_5 = "/static/service/activity.png";
  const _sfc_main$y = {
    data() {
      return {
        userInfo: null,
        packages: [],
        showAuthorize: false,
        currentPkg: null,
        authorizeForm: {
          name: "",
          phone: "",
          expireHours: 24
        }
      };
    },
    onShow() {
      this.userInfo = uni.getStorageSync("userInfo") || {};
      if (!this.userInfo.id && this.userInfo.userId) {
        this.userInfo.id = this.userInfo.userId;
      }
      formatAppLog("log", "at owner/pages/communityService/index.vue:134", "【DEBUG】userInfo:", this.userInfo);
      this.loadPackages();
    },
    methods: {
      navTo(url) {
        uni.navigateTo({ url });
      },
      openAuthorize(pkg) {
        this.currentPkg = pkg;
        this.authorizeForm = {
          name: "",
          phone: "",
          expireHours: 24
        };
        this.showAuthorize = true;
      },
      /** 获取我的快递列表 */
      async loadPackages() {
        var _a;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id))
          return;
        try {
          const res = await request({
            url: "/api/express/my",
            method: "GET",
            params: {
              userId: this.userInfo.id,
              pageNum: 1,
              pageSize: 20
            }
          });
          formatAppLog("log", "at owner/pages/communityService/index.vue:164", "【DEBUG】接口返回:", res);
          const records = (res == null ? void 0 : res.records) || [];
          if (Array.isArray(records)) {
            this.packages = records.map((pkg) => ({
              ...pkg,
              pickCode: pkg.pickupCode,
              status: this.mapStatus(pkg.status),
              statusText: this.mapStatusText(pkg.status)
            }));
          } else {
            formatAppLog("warn", "at owner/pages/communityService/index.vue:174", "【DEBUG】接口返回异常, records:", res);
          }
        } catch (err) {
          formatAppLog("error", "at owner/pages/communityService/index.vue:177", "【DEBUG】快递列表加载失败", err);
        }
      },
      /** 取件 */
      async pickExpress(pkg) {
        uni.showModal({
          title: "确认取件",
          content: `确认取走快递 ${pkg.pickCode}？`,
          success: async (res) => {
            if (!res.confirm)
              return;
            const userInfo = uni.getStorageSync("userInfo");
            if (!(userInfo == null ? void 0 : userInfo.id)) {
              uni.showToast({ title: "用户未登录", icon: "none" });
              return;
            }
            try {
              const result = await request({
                url: `/api/express/${pkg.id}/pick`,
                method: "PUT",
                data: {
                  pickupCode: pkg.pickCode.trim(),
                  userId: userInfo.id,
                  byAuthorized: false,
                  operatorName: "",
                  operatorPhone: "",
                  remark: ""
                }
              });
              if (result === true) {
                uni.showToast({ title: "取件成功", icon: "success" });
                this.loadPackages();
              } else {
                uni.showToast({ title: "取件失败", icon: "none" });
              }
            } catch (e) {
              formatAppLog("error", "at owner/pages/communityService/index.vue:217", "【DEBUG】请求异常", e);
              uni.showToast({ title: "取件失败", icon: "none" });
            }
          }
        });
      },
      /** 授权代取 */
      async authorizeExpress(pkg) {
        uni.showModal({
          title: "授权代取",
          content: "确认授权他人代取该快递？",
          success: async (res) => {
            if (!res.confirm)
              return;
            const userInfo = uni.getStorageSync("userInfo");
            if (!(userInfo == null ? void 0 : userInfo.id)) {
              uni.showToast({ title: "用户未登录", icon: "none" });
              return;
            }
            const dto = {
              userId: userInfo.id,
              // ✅ 必传
              authorizedName: "张三",
              // TODO: 后续改为输入
              authorizedPhone: "13800000000",
              // ✅ 必传
              expireTime: (/* @__PURE__ */ new Date()).toISOString()
              // ⚠️ 字段名必须一致
            };
            try {
              const result = await request({
                url: `/api/express/${pkg.id}/authorize`,
                method: "POST",
                data: dto
              });
              formatAppLog("log", "at owner/pages/communityService/index.vue:251", "【DEBUG】授权返回 result =", result);
              if (result === true) {
                uni.showToast({ title: "授权成功", icon: "success" });
                this.loadPackages();
              } else {
                uni.showToast({ title: "授权失败", icon: "none" });
              }
            } catch (e) {
              uni.showToast({ title: "授权失败", icon: "none" });
            }
          }
        });
      },
      /** 确认授权 */
      async confirmAuthorize() {
        const { name, phone, expireHours } = this.authorizeForm;
        if (!name || !phone) {
          uni.showToast({ title: "请填写完整信息", icon: "none" });
          return;
        }
        const userInfo = uni.getStorageSync("userInfo");
        if (!(userInfo == null ? void 0 : userInfo.id) || !this.currentPkg)
          return;
        const expireTime = new Date(
          Date.now() + expireHours * 60 * 60 * 1e3
        ).toISOString();
        try {
          const result = await request({
            url: `/api/express/${this.currentPkg.id}/authorize`,
            method: "POST",
            data: {
              userId: userInfo.id,
              authorizedName: name,
              authorizedPhone: phone,
              expireTime
            }
          });
          formatAppLog("log", "at owner/pages/communityService/index.vue:295", "【DEBUG】授权返回 result =", result);
          if (result === true) {
            uni.showToast({ title: "授权成功", icon: "success" });
            this.showAuthorize = false;
            this.loadPackages();
          } else {
            uni.showToast({ title: "授权失败", icon: "none" });
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/communityService/index.vue:305", "【DEBUG】授权异常", e);
          uni.showToast({ title: "授权失败", icon: "none" });
        }
      },
      mapStatus(status) {
        switch (status) {
          case "WAITING":
            return "ready";
          case "PICKED":
            return "picked";
          case "AUTHORIZED":
            return "authorized";
          default:
            return "unknown";
        }
      },
      mapStatusText(status) {
        switch (status) {
          case "WAITING":
            return "待取件";
          case "PICKED":
            return "已取件";
          case "AUTHORIZED":
            return "已授权";
          default:
            return "未知状态";
        }
      },
      formatTime(str) {
        if (!str)
          return "";
        const d = new Date(str);
        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")} 入库`;
      }
    }
  };
  function _sfc_render$x(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 服务网格 "),
      vue.createElementVNode("view", { class: "service-grid" }, [
        vue.createElementVNode("view", {
          class: "grid-item",
          onClick: _cache[0] || (_cache[0] = ($event) => $options.navTo("/owner/pages/notice/list"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_0$1,
            class: "grid-icon"
          }),
          vue.createElementVNode("text", { class: "grid-text" }, "物业公告")
        ]),
        vue.createElementVNode("view", {
          class: "grid-item",
          onClick: _cache[1] || (_cache[1] = ($event) => $options.navTo("/owner/pages/repair/repair"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_1,
            class: "grid-icon"
          }),
          vue.createElementVNode("text", { class: "grid-text" }, "在线报修")
        ]),
        vue.createElementVNode("view", {
          class: "grid-item",
          onClick: _cache[2] || (_cache[2] = ($event) => $options.navTo("/owner/pages/communityService/pay-fee"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_2,
            class: "grid-icon"
          }),
          vue.createElementVNode("text", { class: "grid-text" }, "费用缴纳")
        ]),
        vue.createElementVNode("view", {
          class: "grid-item",
          onClick: _cache[3] || (_cache[3] = ($event) => $options.navTo("/owner/pages/communityService/visitor-apply"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_3,
            class: "grid-icon"
          }),
          vue.createElementVNode("text", { class: "grid-text" }, "访客登记")
        ]),
        vue.createElementVNode("view", {
          class: "grid-item",
          onClick: _cache[4] || (_cache[4] = ($event) => $options.navTo("/owner/pages/communityService/complaint"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_4,
            class: "grid-icon"
          }),
          vue.createElementVNode("text", { class: "grid-text" }, "投诉建议")
        ]),
        vue.createElementVNode("view", {
          class: "grid-item",
          onClick: _cache[5] || (_cache[5] = ($event) => $options.navTo("/owner/pages/communityService/activity-list"))
        }, [
          vue.createElementVNode("image", {
            src: _imports_5,
            class: "grid-icon"
          }),
          vue.createElementVNode("text", { class: "grid-text" }, "社区活动")
        ])
      ]),
      vue.createCommentVNode(" 顶部 hero "),
      vue.createElementVNode("view", { class: "hero" }, [
        vue.createElementVNode("text", { class: "hero-title" }, "快递代收"),
        vue.createElementVNode("text", { class: "hero-sub" }, "支持扫码自提 · 24h 监控")
      ]),
      vue.createCommentVNode(" 今日包裹 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-title" }, "今日包裹"),
        $data.packages.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "empty"
        }, "暂无快递记录")) : vue.createCommentVNode("v-if", true),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.packages, (pkg) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: pkg.id,
              class: "pkg-card"
            }, [
              vue.createElementVNode("view", { class: "pkg-info" }, [
                vue.createElementVNode(
                  "text",
                  { class: "pkg-title" },
                  vue.toDisplayString(pkg.pickCode ? `取件码 ${pkg.pickCode}` : "—"),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "pkg-desc" },
                  vue.toDisplayString(pkg.company) + " · " + vue.toDisplayString($options.formatTime(pkg.createTime)),
                  1
                  /* TEXT */
                ),
                pkg.remark ? (vue.openBlock(), vue.createElementBlock(
                  "text",
                  {
                    key: 0,
                    class: "pkg-remark"
                  },
                  vue.toDisplayString(pkg.remark),
                  1
                  /* TEXT */
                )) : vue.createCommentVNode("v-if", true)
              ]),
              vue.createElementVNode("view", { class: "pkg-actions" }, [
                vue.createElementVNode(
                  "text",
                  {
                    class: vue.normalizeClass(["pkg-status", pkg.status])
                  },
                  vue.toDisplayString(pkg.statusText),
                  3
                  /* TEXT, CLASS */
                ),
                vue.createCommentVNode(" 取件 "),
                pkg.status === "ready" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 0,
                  class: "btn primary",
                  onClick: ($event) => $options.pickExpress(pkg)
                }, " 取件 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                vue.createCommentVNode(" 授权代取 "),
                pkg.status === "ready" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 1,
                  class: "btn ghost",
                  onClick: ($event) => $options.openAuthorize(pkg)
                }, " 授权代取 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createCommentVNode(" 授权弹窗 "),
      $data.showAuthorize ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "mask"
      }, [
        vue.createElementVNode("view", { class: "dialog" }, [
          vue.createElementVNode("view", { class: "dialog-title" }, "授权代取"),
          vue.createElementVNode("view", { class: "form-item" }, [
            vue.createElementVNode("text", { class: "label" }, "被授权人姓名"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $data.authorizeForm.name = $event),
                placeholder: "请输入姓名"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.authorizeForm.name]
            ])
          ]),
          vue.createElementVNode("view", { class: "form-item" }, [
            vue.createElementVNode("text", { class: "label" }, "被授权人手机号"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $data.authorizeForm.phone = $event),
                placeholder: "请输入手机号",
                type: "number"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.authorizeForm.phone]
            ])
          ]),
          vue.createElementVNode("view", { class: "dialog-actions" }, [
            vue.createElementVNode("button", {
              class: "btn ghost",
              onClick: _cache[8] || (_cache[8] = ($event) => $data.showAuthorize = false)
            }, "取消"),
            vue.createElementVNode("button", {
              class: "btn primary",
              onClick: _cache[9] || (_cache[9] = (...args) => $options.confirmAuthorize && $options.confirmAuthorize(...args))
            }, "确认授权")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const OwnerPagesCommunityServiceIndex = /* @__PURE__ */ _export_sfc(_sfc_main$y, [["render", _sfc_render$x], ["__scopeId", "data-v-b9f812f4"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/index.vue"]]);
  const _sfc_main$x = {
    data() {
      return {
        unpaidBills: [],
        historyBills: []
      };
    },
    onLoad() {
      this.loadData();
    },
    methods: {
      loadData() {
        this.fetchUnpaidBills();
        this.fetchHistoryBills();
      },
      async fetchUnpaidBills() {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          const userId = (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId);
          if (!userId)
            return;
          const res = await request({
            url: "/api/fee/unpaid",
            method: "GET",
            params: { userId }
          });
          formatAppLog("log", "at owner/pages/communityService/pay-fee.vue:78", "【DEBUG】待缴账单数据:", JSON.stringify(res));
          this.unpaidBills = res || [];
        } catch (e) {
          formatAppLog("error", "at owner/pages/communityService/pay-fee.vue:81", "获取待缴账单失败", e);
        }
      },
      async fetchHistoryBills() {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          const userId = (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId);
          if (!userId)
            return;
          const res = await request({
            url: "/api/fee/history",
            method: "GET",
            params: { userId }
          });
          this.historyBills = Array.isArray(res) ? res : res.records || [];
        } catch (e) {
          formatAppLog("error", "at owner/pages/communityService/pay-fee.vue:99", "获取历史账单失败", e);
        }
      },
      handlePay(item) {
        uni.showActionSheet({
          itemList: ["微信支付", "支付宝支付"],
          success: async (res) => {
            const payMethod = res.tapIndex === 0 ? "wechat" : "alipay";
            try {
              uni.showLoading({ title: "支付中..." });
              const userInfo = uni.getStorageSync("userInfo");
              const userId = (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId);
              if (!userId) {
                uni.hideLoading();
                return uni.showToast({ title: "用户未登录", icon: "none" });
              }
              await request(`/api/fee/pay?userId=${userId}`, {
                feeId: item.feeId,
                // 【修复点1】后端返回的是 feeId，不是 id
                payType: payMethod
              }, "PUT");
              uni.hideLoading();
              uni.showToast({ title: "支付成功", icon: "success" });
              setTimeout(() => {
                this.loadData();
              }, 500);
            } catch (e) {
              uni.hideLoading();
              uni.showToast({ title: "支付失败", icon: "none" });
            }
          }
        });
      }
    }
  };
  function _sfc_render$w(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 待缴账单 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-title" }, "待缴费用"),
        $data.unpaidBills.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "empty-tip"
        }, "暂无待缴费用")) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("view", { class: "bill-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.unpaidBills, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "bill-item",
                key: item.id
              }, [
                vue.createElementVNode("view", { class: "bill-header" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "bill-name" },
                    vue.toDisplayString(item.feeType || item.feeName || item.fee_name || item.title || "物业费"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "bill-amount" },
                    "¥" + vue.toDisplayString(item.feeAmount || item.amount || item.payAmount || item.totalAmount || 0),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "bill-info" }, [
                  vue.createCommentVNode(" 修复：不再重复显示费用名称，因为表头已经显示了 "),
                  vue.createElementVNode(
                    "text",
                    null,
                    "计费周期：" + vue.toDisplayString(item.feeCycle || item.fee_cycle || item.period),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    null,
                    "截止日期：" + vue.toDisplayString(item.dueDate || item.due_date || item.deadline),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createCommentVNode(" 调试信息：正式发布请删除 "),
                vue.createCommentVNode(' <view style="font-size: 10px; color: #999;">ID: {{item.id}}</view> '),
                vue.createElementVNode("button", {
                  class: "pay-btn",
                  onClick: ($event) => $options.handlePay(item)
                }, "立即缴费", 8, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ]),
      vue.createCommentVNode(" 历史账单 "),
      vue.createElementVNode("view", { class: "section history" }, [
        vue.createElementVNode("view", { class: "section-title" }, "历史账单"),
        vue.createElementVNode("view", { class: "bill-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.historyBills, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "bill-item history-item",
                key: item.id
              }, [
                vue.createElementVNode("view", { class: "bill-header" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "bill-name" },
                    vue.toDisplayString(item.feeType || item.feeName || item.fee_name || item.title || "物业费"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "bill-amount" },
                    "¥" + vue.toDisplayString(item.payAmount || item.amount || item.pay_amount || 0),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "bill-info" }, [
                  vue.createElementVNode(
                    "text",
                    null,
                    "缴费时间：" + vue.toDisplayString(item.payTime || item.pay_time),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    null,
                    "支付方式：" + vue.toDisplayString(item.payType || item.pay_type || item.payMethod),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    null,
                    "计费周期：" + vue.toDisplayString(item.feeCycle || item.fee_cycle || item.period),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "status-bar" }, [
                  vue.createElementVNode("text", { class: "status-tag" }, "已缴费")
                ])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])
    ]);
  }
  const OwnerPagesCommunityServicePayFee = /* @__PURE__ */ _export_sfc(_sfc_main$x, [["render", _sfc_render$w], ["__scopeId", "data-v-e6979b53"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/pay-fee.vue"]]);
  const _sfc_main$w = {
    data() {
      return {
        reasons: ["亲友来访", "快递送货", "装修服务", "其他"],
        form: {
          visitorName: "",
          visitorPhone: "",
          reason: "",
          visitDate: "",
          visitTime: "",
          carNo: ""
        }
      };
    },
    methods: {
      bindReasonChange(e) {
        this.form.reason = this.reasons[e.detail.value];
      },
      bindDateChange(e) {
        this.form.visitDate = e.detail.value;
      },
      bindTimeChange(e) {
        this.form.visitTime = e.detail.value;
      },
      async handleSubmit() {
        if (!this.form.visitorName || !this.form.visitorPhone || !this.form.reason || !this.form.visitDate) {
          uni.showToast({ title: "请填写完整信息", icon: "none" });
          return;
        }
        try {
          uni.showLoading({ title: "提交中..." });
          const userInfo = uni.getStorageSync("userInfo");
          let timeStr = this.form.visitTime || "00:00";
          if (timeStr.length === 5) {
            timeStr += ":00";
          }
          const visitTime = `${this.form.visitDate} ${timeStr}`;
          await request("/api/visitor/apply", {
            userId: (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId),
            visitorName: this.form.visitorName,
            visitorPhone: this.form.visitorPhone,
            reason: this.form.reason,
            // 格式化时间
            // 后端报错：Text '2026-02-28 19:37:00' could not be parsed at index 10
            // index 10 是 ' ' (空格)，这说明后端期望的格式可能是 ISO 标准的 'T' 分隔
            // 即：yyyy-MM-ddTHH:mm:ss
            visitTime: visitTime.replace(" ", "T"),
            carNo: this.form.carNo
          }, "POST");
          uni.hideLoading();
          uni.showModal({
            title: "申请成功",
            content: "您的访客预约已提交，通行码将通过短信发送给访客。",
            showCancel: false,
            success: () => {
              uni.navigateBack();
            }
          });
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: "申请失败，请重试", icon: "none" });
          formatAppLog("error", "at owner/pages/communityService/visitor-apply.vue:107", "访客申请失败", e);
        }
      }
    }
  };
  function _sfc_render$v(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "访客姓名"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.visitorName = $event),
            placeholder: "请输入访客姓名"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.visitorName]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "访客电话"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "number",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.visitorPhone = $event),
            placeholder: "请输入访客电话"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.visitorPhone]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "访问事由"),
        vue.createElementVNode("picker", {
          onChange: _cache[2] || (_cache[2] = (...args) => $options.bindReasonChange && $options.bindReasonChange(...args)),
          range: $data.reasons
        }, [
          vue.createElementVNode(
            "view",
            { class: "picker" },
            vue.toDisplayString($data.form.reason || "请选择访问事由"),
            1
            /* TEXT */
          )
        ], 40, ["range"])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "访问时间"),
        vue.createElementVNode(
          "picker",
          {
            mode: "date",
            onChange: _cache[3] || (_cache[3] = (...args) => $options.bindDateChange && $options.bindDateChange(...args))
          },
          [
            vue.createElementVNode(
              "view",
              { class: "picker" },
              vue.toDisplayString($data.form.visitDate || "请选择日期"),
              1
              /* TEXT */
            )
          ],
          32
          /* NEED_HYDRATION */
        ),
        vue.createElementVNode(
          "picker",
          {
            mode: "time",
            onChange: _cache[4] || (_cache[4] = (...args) => $options.bindTimeChange && $options.bindTimeChange(...args))
          },
          [
            vue.createElementVNode(
              "view",
              { class: "picker" },
              vue.toDisplayString($data.form.visitTime || "请选择时间"),
              1
              /* TEXT */
            )
          ],
          32
          /* NEED_HYDRATION */
        )
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "车牌号 (选填)"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.form.carNo = $event),
            placeholder: "如有车辆请输入车牌号"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.carNo]
        ])
      ]),
      vue.createElementVNode("button", {
        class: "submit-btn",
        onClick: _cache[6] || (_cache[6] = (...args) => $options.handleSubmit && $options.handleSubmit(...args))
      }, "生成通行凭证")
    ]);
  }
  const OwnerPagesCommunityServiceVisitorApply = /* @__PURE__ */ _export_sfc(_sfc_main$w, [["render", _sfc_render$v], ["__scopeId", "data-v-c952a55e"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/visitor-apply.vue"]]);
  const _sfc_main$v = {
    data() {
      return {
        types: ["噪音扰民", "环境卫生", "物业服务", "设施损坏", "其他"],
        form: {
          type: "",
          content: "",
          image: ""
        }
      };
    },
    methods: {
      bindTypeChange(e) {
        this.form.type = this.types[e.detail.value];
      },
      chooseImage() {
        uni.chooseImage({
          count: 1,
          success: (res) => {
            this.form.image = res.tempFilePaths[0];
          }
        });
      },
      async handleSubmit() {
        if (!this.form.type || !this.form.content) {
          uni.showToast({ title: "请填写投诉类型和内容", icon: "none" });
          return;
        }
        try {
          uni.showLoading({ title: "提交中..." });
          const userInfo = uni.getStorageSync("userInfo");
          await request("/api/complaint/submit", {
            userId: (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId),
            type: this.form.type,
            content: this.form.content,
            images: this.form.image
            // 真实场景应该是上传后的URL
          }, "POST");
          uni.hideLoading();
          uni.showModal({
            title: "提交成功",
            content: "我们已收到您的反馈，将尽快处理并联系您。",
            showCancel: false,
            success: () => {
              uni.navigateBack();
            }
          });
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: "提交失败，请重试", icon: "none" });
          formatAppLog("error", "at owner/pages/communityService/complaint.vue:84", "投诉提交失败", e);
        }
      }
    }
  };
  function _sfc_render$u(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "投诉类型"),
        vue.createElementVNode("picker", {
          onChange: _cache[0] || (_cache[0] = (...args) => $options.bindTypeChange && $options.bindTypeChange(...args)),
          range: $data.types
        }, [
          vue.createElementVNode(
            "view",
            { class: "picker" },
            vue.toDisplayString($data.form.type || "请选择类型"),
            1
            /* TEXT */
          )
        ], 40, ["range"])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "投诉内容"),
        vue.withDirectives(vue.createElementVNode(
          "textarea",
          {
            class: "textarea",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.content = $event),
            placeholder: "请详细描述您的问题..."
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.content]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "上传图片 (选填)"),
        vue.createElementVNode("view", {
          class: "upload-area",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.chooseImage && $options.chooseImage(...args))
        }, [
          !$data.form.image ? (vue.openBlock(), vue.createElementBlock("text", { key: 0 }, "点击上传")) : (vue.openBlock(), vue.createElementBlock("image", {
            key: 1,
            src: $data.form.image,
            mode: "aspectFill",
            class: "preview-img"
          }, null, 8, ["src"]))
        ])
      ]),
      vue.createElementVNode("button", {
        class: "submit-btn",
        onClick: _cache[3] || (_cache[3] = (...args) => $options.handleSubmit && $options.handleSubmit(...args))
      }, "提交反馈")
    ]);
  }
  const OwnerPagesCommunityServiceComplaint = /* @__PURE__ */ _export_sfc(_sfc_main$v, [["render", _sfc_render$u], ["__scopeId", "data-v-5b2ad19b"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/complaint.vue"]]);
  const _sfc_main$u = {
    data() {
      return {
        activities: []
      };
    },
    onShow() {
      this.loadData();
    },
    methods: {
      async loadData() {
        try {
          const res = await request("/api/activity/list", { status: "PUBLISHED" }, "GET");
          const list = res.records || res || [];
          this.activities = list.map((item) => ({
            id: item.id,
            title: item.title,
            time: item.startTime,
            location: item.location,
            status: item.status,
            // PUBLISHED/ONLINE/ENDED
            signupCount: item.signupCount || 0,
            maxCount: item.maxCount,
            cover: item.cover || "/static/default-cover.png"
          }));
        } catch (e) {
          formatAppLog("error", "at owner/pages/communityService/activity-list.vue:58", "获取活动列表失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        }
      },
      getStatusClass(status) {
        const map = {
          "PUBLISHED": "status-published",
          "ONLINE": "status-online",
          "ENDED": "status-ended"
        };
        return map[status] || "status-default";
      },
      getStatusText(status) {
        const map = {
          "PUBLISHED": "报名中",
          "ONLINE": "进行中",
          "ENDED": "已结束"
        };
        return map[status] || status;
      },
      getBtnText(status) {
        if (status === "ENDED")
          return "活动已结束";
        if (status === "ONLINE")
          return "立即报名";
        if (status === "PUBLISHED")
          return "立即报名";
        return "查看详情";
      },
      formatTime(time) {
        if (!time)
          return "";
        return time.replace("T", " ");
      },
      handleJoin(item) {
        if (item.status === "ENDED")
          return;
        uni.showModal({
          title: "确认报名",
          content: `确认报名参加 ${item.title} 吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                uni.showLoading({ title: "报名中..." });
                const userInfo = uni.getStorageSync("userInfo");
                formatAppLog("log", "at owner/pages/communityService/activity-list.vue:104", "当前用户信息:", userInfo);
                formatAppLog("log", "at owner/pages/communityService/activity-list.vue:105", "准备报名活动:", item);
                const targetUrl = `/api/activity/join?activityId=${item.id}&userId=${userInfo.id || userInfo.userId}`;
                await request(targetUrl, {}, "POST");
                uni.hideLoading();
                uni.showToast({ title: "报名成功", icon: "success" });
                this.loadData();
              } catch (e) {
                uni.hideLoading();
                const msg = e.message || "";
                if (msg.includes("已报名")) {
                  uni.showToast({ title: "您已报名，无需重复操作", icon: "none" });
                } else {
                  uni.showToast({ title: msg || "报名失败", icon: "none" });
                }
              }
            }
          }
        });
      }
    }
  };
  function _sfc_render$t(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "activity-list" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.activities, (item) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "activity-item",
              key: item.id
            }, [
              vue.createElementVNode("image", {
                src: item.cover,
                mode: "aspectFill",
                class: "cover-img"
              }, null, 8, ["src"]),
              vue.createElementVNode("view", { class: "content" }, [
                vue.createElementVNode(
                  "text",
                  { class: "title" },
                  vue.toDisplayString(item.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "time" },
                  "时间：" + vue.toDisplayString($options.formatTime(item.time)),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "location" },
                  "地点：" + vue.toDisplayString(item.location),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "signup-count" },
                  "报名：" + vue.toDisplayString(item.signupCount) + "/" + vue.toDisplayString(item.maxCount || "不限"),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  {
                    class: vue.normalizeClass(["status-tag", $options.getStatusClass(item.status)])
                  },
                  vue.toDisplayString($options.getStatusText(item.status)),
                  3
                  /* TEXT, CLASS */
                )
              ]),
              vue.createElementVNode("button", {
                class: "join-btn",
                onClick: ($event) => $options.handleJoin(item),
                disabled: item.status !== "ONLINE" && item.status !== "PUBLISHED"
              }, vue.toDisplayString($options.getBtnText(item.status)), 9, ["onClick", "disabled"])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        $data.activities.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "empty-state"
        }, [
          vue.createElementVNode("text", null, "暂无社区活动")
        ])) : vue.createCommentVNode("v-if", true)
      ])
    ]);
  }
  const OwnerPagesCommunityServiceActivityList = /* @__PURE__ */ _export_sfc(_sfc_main$u, [["render", _sfc_render$t], ["__scopeId", "data-v-f96f344e"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/activity-list.vue"]]);
  const _sfc_main$t = {
    data() {
      return {
        userInfo: {
          avatar: "",
          name: "",
          phone: "",
          idCard: "",
          gender: ""
        },
        genders: ["男", "女"]
      };
    },
    onLoad() {
      this.loadData();
    },
    methods: {
      async loadData() {
        try {
          const res = await request({
            url: "/api/user/info",
            method: "GET"
          });
          this.userInfo = {
            ...this.userInfo,
            ...res,
            name: res.name || res.username
            // gender: res.gender === '1' ? '男' : '女' // 假设后端返回字典值
          };
          uni.setStorageSync("userInfo", { ...uni.getStorageSync("userInfo"), ...this.userInfo });
        } catch (e) {
          const user = uni.getStorageSync("userInfo") || {};
          this.userInfo = { ...this.userInfo, ...user };
        }
      },
      changeAvatar() {
        uni.chooseImage({
          count: 1,
          success: (res) => {
            this.userInfo.avatar = res.tempFilePaths[0];
          }
        });
      },
      bindGenderChange(e) {
        this.userInfo.gender = this.genders[e.detail.value];
      },
      async handleSave() {
        try {
          uni.showLoading({ title: "保存中..." });
          const userInfo = uni.getStorageSync("userInfo");
          await request("/api/user/profile", {
            userId: (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId),
            name: this.userInfo.name,
            idCard: this.userInfo.idCard,
            gender: this.userInfo.gender,
            avatar: this.userInfo.avatar
          }, "PUT");
          const newUserInfo = { ...userInfo, ...this.userInfo };
          uni.setStorageSync("userInfo", newUserInfo);
          uni.hideLoading();
          uni.showToast({ title: "保存成功", icon: "success" });
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: "保存失败", icon: "none" });
          formatAppLog("error", "at owner/pages/mine/profile.vue:120", "保存用户信息失败", e);
        }
      },
      handleChangePassword() {
        uni.showToast({ title: "修改密码功能开发中", icon: "none" });
      },
      handleLogout() {
        uni.showModal({
          title: "确认退出",
          content: "确定要退出登录吗？",
          success: (res) => {
            if (res.confirm) {
              uni.clearStorageSync();
              uni.reLaunch({ url: "/owner/pages/login/login" });
            }
          }
        });
      }
    }
  };
  function _sfc_render$s(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", {
          class: "avatar-box",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.changeAvatar && $options.changeAvatar(...args))
        }, [
          vue.createElementVNode("image", {
            src: $data.userInfo.avatar || "/static/default-avatar.png",
            mode: "aspectFill",
            class: "avatar"
          }, null, 8, ["src"]),
          vue.createElementVNode("text", { class: "edit-tip" }, "点击修改头像")
        ])
      ]),
      vue.createElementVNode("view", { class: "form-group" }, [
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "姓名"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.userInfo.name = $event),
              placeholder: "请输入姓名"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.userInfo.name]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "手机号"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.userInfo.phone = $event),
              disabled: ""
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.userInfo.phone]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "身份证号"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.userInfo.idCard = $event),
              placeholder: "请输入身份证号"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.userInfo.idCard]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "性别"),
          vue.createElementVNode("picker", {
            onChange: _cache[4] || (_cache[4] = (...args) => $options.bindGenderChange && $options.bindGenderChange(...args)),
            range: $data.genders
          }, [
            vue.createElementVNode(
              "view",
              { class: "picker" },
              vue.toDisplayString($data.userInfo.gender || "请选择性别"),
              1
              /* TEXT */
            )
          ], 40, ["range"])
        ])
      ]),
      vue.createElementVNode("button", {
        class: "save-btn",
        onClick: _cache[5] || (_cache[5] = (...args) => $options.handleSave && $options.handleSave(...args))
      }, "保存修改"),
      vue.createElementVNode("view", { class: "action-group" }, [
        vue.createElementVNode("view", {
          class: "action-item",
          onClick: _cache[6] || (_cache[6] = (...args) => $options.handleChangePassword && $options.handleChangePassword(...args))
        }, [
          vue.createElementVNode("text", null, "修改密码"),
          vue.createElementVNode("text", { class: "arrow" }, ">")
        ]),
        vue.createElementVNode("view", {
          class: "action-item",
          onClick: _cache[7] || (_cache[7] = (...args) => $options.handleLogout && $options.handleLogout(...args))
        }, [
          vue.createElementVNode("text", { class: "danger" }, "退出登录")
        ])
      ])
    ]);
  }
  const OwnerPagesMineProfile = /* @__PURE__ */ _export_sfc(_sfc_main$t, [["render", _sfc_render$s], ["__scopeId", "data-v-71d300c5"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/mine/profile.vue"]]);
  const _sfc_main$s = {
    data() {
      return {
        form: {
          username: "",
          password: ""
        }
      };
    },
    methods: {
      goToRegister() {
        uni.navigateTo({
          url: "/owner/pages/register/register"
        });
      },
      async handleLogin() {
        try {
          if (!this.form.username || !this.form.password) {
            uni.showToast({ title: "请输入用户名和密码", icon: "none" });
            return;
          }
          const result = await request({
            url: "/api/user/login",
            method: "POST",
            data: this.form,
            header: {
              "Content-Type": "application/json"
            }
          });
          let role = "";
          let fullRole = "";
          if (result.token) {
            try {
              const payload = JSON.parse(atob(result.token.split(".")[1]));
              formatAppLog("log", "at owner/pages/login/login.vue:85", "Token 中的信息:", payload);
              if (payload.role) {
                fullRole = payload.role;
                role = payload.role.replace("ROLE_", "").toLowerCase();
              }
            } catch (e) {
              formatAppLog("log", "at owner/pages/login/login.vue:94", "Token 解码失败:", e);
            }
          }
          const userInfo = {
            id: result.userId,
            // ⭐ 新增 id 字段（关键！）
            userId: result.userId,
            username: result.username,
            role,
            // 使用从 Token 中解析的真实角色
            fullRole,
            // 保存完整角色名（如ROLE_ADMIN）
            communityId: result.communityId,
            // ✅ 关键修复：从登录返回结果中保存 communityId
            token: result.token
          };
          uni.setStorageSync("userInfo", userInfo);
          uni.setStorageSync("token", result.token);
          formatAppLog("log", "at owner/pages/login/login.vue:110", "登录返回的完整数据:", result);
          formatAppLog("log", "at owner/pages/login/login.vue:111", "保存的用户信息:", userInfo);
          uni.showToast({ title: "登录成功", icon: "success", duration: 1500 });
          setTimeout(() => {
            if (userInfo.role === "admin" || userInfo.role === "super_admin") {
              uni.redirectTo({ url: "/admin/pages/admin/dashboard/index" });
            } else {
              uni.switchTab({ url: "/owner/pages/index/index" });
            }
          }, 1500);
        } catch (err) {
          uni.hideLoading();
          formatAppLog("error", "at owner/pages/login/login.vue:128", "登录错误:", err);
          const errorMessage = (err == null ? void 0 : err.message) || "登录失败，请重试";
          uni.showToast({ title: errorMessage, icon: "none" });
        }
      }
    }
  };
  function _sfc_render$r(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "login-container" }, [
      vue.createCommentVNode(" 标题 "),
      vue.createElementVNode("view", { class: "login-title" }, "智慧社区登录"),
      vue.createCommentVNode(" 用户名输入框 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "👤"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.username = $event),
            placeholder: "请输入用户名",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.username]
        ])
      ]),
      vue.createCommentVNode(" 密码输入框 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "🔒"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.password = $event),
            type: "password",
            placeholder: "请输入密码",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.password]
        ])
      ]),
      vue.createCommentVNode(" 登录按钮 "),
      vue.createElementVNode("button", {
        class: "login-btn",
        onClick: _cache[2] || (_cache[2] = (...args) => $options.handleLogin && $options.handleLogin(...args)),
        disabled: !$data.form.username || !$data.form.password
      }, " 登录 ", 8, ["disabled"]),
      vue.createCommentVNode(" 注册链接 "),
      vue.createElementVNode("view", {
        class: "register-link",
        onClick: _cache[3] || (_cache[3] = (...args) => $options.goToRegister && $options.goToRegister(...args))
      }, " 没有账号？去注册 ")
    ]);
  }
  const OwnerPagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$s, [["render", _sfc_render$r], ["__scopeId", "data-v-cebd4568"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/login/login.vue"]]);
  const _sfc_main$r = {
    data() {
      return {
        form: {
          username: "",
          password: "",
          confirmPassword: "",
          phone: "",
          realName: ""
        },
        loading: false
      };
    },
    methods: {
      // 表单验证
      validateForm() {
        if (!this.form.username) {
          uni.showToast({ title: "请输入用户名", icon: "none" });
          return false;
        }
        if (!this.form.password) {
          uni.showToast({ title: "请输入密码", icon: "none" });
          return false;
        }
        if (this.form.password.length < 6) {
          uni.showToast({ title: "密码长度至少6位", icon: "none" });
          return false;
        }
        if (this.form.password !== this.form.confirmPassword) {
          uni.showToast({ title: "两次输入的密码不一致", icon: "none" });
          return false;
        }
        if (!this.form.phone) {
          uni.showToast({ title: "请输入手机号", icon: "none" });
          return false;
        }
        if (!/^1[3-9]\d{9}$/.test(this.form.phone)) {
          uni.showToast({ title: "请输入正确的手机号", icon: "none" });
          return false;
        }
        if (!this.form.realName) {
          uni.showToast({ title: "请输入真实姓名", icon: "none" });
          return false;
        }
        return true;
      },
      // 提交注册
      async handleRegister() {
        if (!this.validateForm())
          return;
        this.loading = true;
        try {
          await request({
            url: "/api/user/register",
            method: "POST",
            data: {
              username: this.form.username,
              password: this.form.password,
              phone: this.form.phone,
              realName: this.form.realName
            }
          });
          uni.showToast({ title: "注册成功", icon: "success" });
          setTimeout(() => {
            this.goToLogin();
          }, 1500);
        } catch (err) {
          uni.showToast({
            title: err.message || "注册失败，请稍后重试",
            icon: "none"
          });
        } finally {
          this.loading = false;
        }
      },
      // 跳转回登录页
      goToLogin() {
        uni.navigateBack({
          delta: 1
        });
      }
    }
  };
  function _sfc_render$q(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "register-container" }, [
      vue.createElementVNode("view", { class: "register-title" }, "用户注册"),
      vue.createCommentVNode(" 用户名 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "👤"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.username = $event),
            placeholder: "请输入用户名",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.username]
        ])
      ]),
      vue.createCommentVNode(" 密码 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "🔒"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.password = $event),
            type: "password",
            placeholder: "请输入密码",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.password]
        ])
      ]),
      vue.createCommentVNode(" 确认密码 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "🔒"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.form.confirmPassword = $event),
            type: "password",
            placeholder: "请再次输入密码",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.confirmPassword]
        ])
      ]),
      vue.createCommentVNode(" 手机号 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "📱"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.form.phone = $event),
            type: "number",
            maxlength: "11",
            placeholder: "请输入手机号",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.phone]
        ])
      ]),
      vue.createCommentVNode(" 真实姓名 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "📛"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.form.realName = $event),
            placeholder: "请输入真实姓名",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.realName]
        ])
      ]),
      vue.createCommentVNode(" 注册按钮 "),
      vue.createElementVNode("button", {
        class: "register-btn",
        onClick: _cache[5] || (_cache[5] = (...args) => $options.handleRegister && $options.handleRegister(...args)),
        disabled: $data.loading
      }, vue.toDisplayString($data.loading ? "注册中..." : "立即注册"), 9, ["disabled"]),
      vue.createCommentVNode(" 返回登录 "),
      vue.createElementVNode("view", {
        class: "login-link",
        onClick: _cache[6] || (_cache[6] = (...args) => $options.goToLogin && $options.goToLogin(...args))
      }, " 已有账号？去登录 ")
    ]);
  }
  const OwnerPagesRegisterRegister = /* @__PURE__ */ _export_sfc(_sfc_main$r, [["render", _sfc_render$q], ["__scopeId", "data-v-e10ddd9f"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/register/register.vue"]]);
  const _sfc_main$q = {
    data() {
      return {
        form: {
          buildingNo: "",
          // 楼栋号
          houseNo: "",
          // 房屋号（纯房号）
          houseId: "",
          // 房屋ID
          faultType: "",
          faultDesc: "",
          faultImgs: [],
          // 图片URL数组
          userId: ""
        },
        myHouses: [],
        // 用户绑定的房屋列表
        selectedHouseText: ""
      };
    },
    computed: {
      isFormValid() {
        return this.form.houseId && this.form.faultType;
      }
    },
    onLoad() {
      const userInfo = uni.getStorageSync("userInfo");
      formatAppLog("log", "at owner/pages/repair/repair.vue:112", "用户信息:", userInfo);
      if (userInfo && userInfo.userId) {
        this.form.userId = userInfo.userId;
        this.loadMyHouses();
      } else {
        uni.redirectTo({ url: "/pages/login/login" });
      }
    },
    methods: {
      // 加载用户房屋列表
      async loadMyHouses() {
        try {
          const res = await request({
            url: "/api/user/house/list",
            method: "GET",
            params: { userId: this.form.userId }
          });
          if (res.code === 200 && res.data) {
            this.myHouses = res.data.map((house) => ({
              ...house,
              displayText: `${house.buildingNo}栋 ${house.houseNo}室`
            }));
            if (this.myHouses.length === 1) {
              this.selectHouse(this.myHouses[0]);
            }
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/repair/repair.vue:142", "加载房屋列表失败", e);
          uni.showToast({ title: "加载房屋信息失败", icon: "none" });
        }
      },
      handleHouseChange(e) {
        const index = e.detail.value;
        this.selectHouse(this.myHouses[index]);
      },
      selectHouse(house) {
        this.form.houseId = house.id;
        this.form.buildingNo = house.buildingNo;
        this.form.houseNo = house.houseNo;
        this.selectedHouseText = house.displayText;
      },
      async handleSubmit() {
        try {
          const submitData = {
            ...this.form,
            faultImgs: this.form.faultImgs.join(",")
            // 数组转逗号分隔字符串
          };
          formatAppLog("log", "at owner/pages/repair/repair.vue:167", "提交报修数据:", submitData);
          await request({
            url: "/api/repair/submit",
            method: "POST",
            data: submitData
          });
          uni.showToast({ title: "报修提交成功", icon: "success" });
          this.resetForm();
        } catch (err) {
          formatAppLog("error", "at owner/pages/repair/repair.vue:182", "提交报修失败：", err);
          uni.showToast({ title: err.message || "提交失败", icon: "none" });
        }
      },
      // 选择图片
      async chooseImage() {
        try {
          const res = await uni.chooseImage({
            count: 3,
            // 最多3张
            sizeType: ["compressed"],
            sourceType: ["album", "camera"]
          });
          if (res.tempFilePaths.length > 0) {
            for (let tempPath of res.tempFilePaths) {
              this.form.faultImgs.push(tempPath);
            }
            uni.showToast({ title: "图片已添加", icon: "success" });
          }
        } catch (err) {
          formatAppLog("error", "at owner/pages/repair/repair.vue:205", "选择图片失败:", err);
          uni.showToast({ title: "选择图片失败", icon: "none" });
        }
      },
      // 删除图片
      removeImage(index) {
        this.form.faultImgs.splice(index, 1);
      },
      // 重置表单
      resetForm() {
        this.form.faultType = "";
        this.form.faultDesc = "";
        this.form.faultImgs = [];
      },
      handleBackLogin() {
        uni.removeStorageSync("token");
        uni.removeStorageSync("userInfo");
        uni.redirectTo({ url: "/pages/login/login" });
      }
    }
  };
  function _sfc_render$p(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "repair-container" }, [
      vue.createCommentVNode(" 标题 "),
      vue.createElementVNode("view", { class: "repair-title" }, "提交报修"),
      vue.createCommentVNode(" 房屋选择 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "�"),
        vue.createElementVNode("picker", {
          mode: "selector",
          range: $data.myHouses,
          "range-key": "displayText",
          onChange: _cache[0] || (_cache[0] = (...args) => $options.handleHouseChange && $options.handleHouseChange(...args)),
          disabled: $data.myHouses.length === 0
        }, [
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["picker-view", !$data.form.houseId ? "placeholder-style" : ""])
            },
            vue.toDisplayString($data.form.houseId ? $data.selectedHouseText : $data.myHouses.length > 0 ? "请选择房屋" : "暂无绑定房屋，请先去绑定"),
            3
            /* TEXT, CLASS */
          )
        ], 40, ["range", "disabled"])
      ]),
      vue.createCommentVNode(" 故障类型输入框 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "⚠️"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.faultType = $event),
            placeholder: "请输入故障类型（如：水管、电路）",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.faultType]
        ])
      ]),
      vue.createCommentVNode(" 故障描述输入框（多行） "),
      vue.createElementVNode("view", { class: "input-item input-textarea" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "📝"),
        vue.withDirectives(vue.createElementVNode(
          "textarea",
          {
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.form.faultDesc = $event),
            placeholder: "请描述故障情况（可选）",
            "placeholder-class": "placeholder-style",
            "auto-height": ""
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.faultDesc]
        ])
      ]),
      vue.createCommentVNode(" 图片上传 "),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "🖼️"),
        vue.createElementVNode("view", { class: "upload-section" }, [
          vue.createElementVNode("text", { class: "upload-label" }, "上传故障图片"),
          vue.createElementVNode("view", { class: "image-preview" }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.form.faultImgs, (img, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: index,
                  class: "preview-item"
                }, [
                  vue.createElementVNode("image", {
                    src: img,
                    class: "preview-image"
                  }, null, 8, ["src"]),
                  vue.createElementVNode("text", {
                    class: "delete-btn",
                    onClick: ($event) => $options.removeImage(index)
                  }, "×", 8, ["onClick"])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            vue.createElementVNode("view", {
              class: "upload-btn",
              onClick: _cache[3] || (_cache[3] = (...args) => $options.chooseImage && $options.chooseImage(...args))
            }, [
              vue.createElementVNode("text", { class: "upload-icon" }, "+")
            ])
          ])
        ])
      ]),
      vue.createCommentVNode(" 提交按钮 "),
      vue.createElementVNode("button", {
        class: "submit-btn",
        disabled: !$options.isFormValid,
        onClick: _cache[4] || (_cache[4] = (...args) => $options.handleSubmit && $options.handleSubmit(...args))
      }, " 提交报修 ", 8, ["disabled"]),
      vue.createCommentVNode(" 返回登录页按钮 "),
      vue.createElementVNode("button", {
        class: "back-btn",
        plain: "",
        onClick: _cache[5] || (_cache[5] = (...args) => $options.handleBackLogin && $options.handleBackLogin(...args))
      }, " 返回登录页 ")
    ]);
  }
  const OwnerPagesRepairRepair = /* @__PURE__ */ _export_sfc(_sfc_main$q, [["render", _sfc_render$p], ["__scopeId", "data-v-62de0cb9"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/repair/repair.vue"]]);
  const _sfc_main$p = {
    props: {
      showSidebar: {
        type: Boolean,
        default: false
      },
      pageTitle: {
        type: String,
        default: "管理员后台"
      },
      currentPage: {
        type: String,
        default: ""
      }
    },
    data() {
      return {
        adminName: "管理员",
        menuList: [
          { text: "报修管理", icon: "🛠️", path: "/pages/admin/repair-manage" },
          { text: "用户管理", icon: "👥", path: "/pages/admin/user-manage" },
          { text: "公告管理", icon: "📢", path: "/pages/admin/notice-manage" },
          { text: "停车管理", icon: "🚗", path: "/pages/admin/parking-manage" },
          { text: "社区管理", icon: "🏘️", path: "/pages/admin/community-manage" }
        ]
      };
    },
    onLoad() {
      const userInfo = uni.getStorageSync("userInfo");
      if (userInfo && userInfo.name) {
        this.adminName = userInfo.name;
      }
    },
    methods: {
      // 切换侧边栏显示
      toggleSidebar() {
        this.$emit("update:showSidebar", !this.showSidebar);
      },
      // 关闭侧边栏
      closeSidebar() {
        this.$emit("update:showSidebar", false);
      },
      // 处理菜单点击
      handleMenuClick(menu) {
        uni.navigateTo({
          url: menu.path,
          success: () => {
            this.closeSidebar();
          }
        });
      },
      // 退出登录
      handleLogout() {
        uni.showModal({
          title: "确认退出",
          content: "确定要退出登录吗？",
          success: (res) => {
            if (res.confirm) {
              uni.removeStorageSync("token");
              uni.removeStorageSync("userInfo");
              uni.redirectTo({ url: "/pages/login/login" });
            }
          }
        });
      }
    }
  };
  function _sfc_render$o(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "sidebar-container" }, [
      vue.createCommentVNode(" 侧边栏遮罩 "),
      $props.showSidebar ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "sidebar-mask",
        onClick: _cache[0] || (_cache[0] = (...args) => $options.closeSidebar && $options.closeSidebar(...args))
      })) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 侧边栏主体 "),
      vue.createElementVNode(
        "view",
        {
          class: vue.normalizeClass(["sidebar", { "sidebar-open": $props.showSidebar }])
        },
        [
          vue.createCommentVNode(" 管理员信息 "),
          vue.createElementVNode("view", { class: "admin-info" }, [
            vue.createElementVNode("view", { class: "avatar" }, [
              vue.createElementVNode(
                "text",
                { class: "avatar-text" },
                vue.toDisplayString($data.adminName),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("text", { class: "admin-role" }, "管理员")
          ]),
          vue.createCommentVNode(" 导航菜单 "),
          vue.createElementVNode("view", { class: "menu-list" }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.menuList, (menu, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: index,
                  class: vue.normalizeClass(["menu-item", { "active": $props.currentPage === menu.path }]),
                  onClick: ($event) => $options.handleMenuClick(menu)
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "menu-icon" },
                    vue.toDisplayString(menu.icon),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "menu-text" },
                    vue.toDisplayString(menu.text),
                    1
                    /* TEXT */
                  )
                ], 10, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ]),
          vue.createCommentVNode(" 退出登录 "),
          vue.createElementVNode("view", { class: "logout-section" }, [
            vue.createElementVNode("button", {
              class: "logout-btn",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.handleLogout && $options.handleLogout(...args))
            }, "退出登录")
          ])
        ],
        2
        /* CLASS */
      ),
      vue.createCommentVNode(" 顶部导航栏 "),
      vue.createElementVNode("view", { class: "top-nav" }, [
        vue.createElementVNode(
          "text",
          { class: "nav-title" },
          vue.toDisplayString($props.pageTitle),
          1
          /* TEXT */
        ),
        vue.createElementVNode("button", {
          class: "menu-btn",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.toggleSidebar && $options.toggleSidebar(...args))
        }, " ☰ ")
      ]),
      vue.createCommentVNode(" 页面内容区域 "),
      vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
    ]);
  }
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$p, [["render", _sfc_render$o], ["__scopeId", "data-v-d54a544d"], ["__file", "D:/HBuilderProjects/smart-community/components/admin-sidebar/admin-sidebar.vue"]]);
  const _sfc_main$o = {
    props: {
      showSidebar: {
        type: Boolean,
        default: false
      },
      pageTitle: {
        type: String,
        default: "管理员后台"
      },
      currentPage: {
        type: String,
        default: ""
      }
    },
    data() {
      return {
        adminName: "管理员",
        roleName: "管理员",
        menuList: [
          { text: "仪表盘", icon: "📊", path: "/admin/pages/admin/dashboard/index" },
          { text: "报修管理", icon: "🛠️", path: "/admin/pages/admin/repair-manage" },
          { text: "公告管理", icon: "📢", path: "/admin/pages/admin/notice-manage" },
          { text: "费用管理", icon: "💰", path: "/admin/pages/admin/fee-manage" },
          { text: "投诉处理", icon: "🗣️", path: "/admin/pages/admin/complaint-manage" },
          { text: "访客审核", icon: "👁️", path: "/admin/pages/admin/visitor-manage" },
          { text: "社区活动", icon: "🎉", path: "/admin/pages/admin/activity-manage" },
          { text: "停车管理", icon: "🚗", path: "/admin/pages/admin/parking-manage" },
          { text: "用户管理", icon: "👥", path: "/admin/pages/admin/user-manage" },
          { text: "社区管理", icon: "🏘️", path: "/admin/pages/admin/community-manage" }
        ]
      };
    },
    mounted() {
      const userInfo = uni.getStorageSync("userInfo");
      if (userInfo && userInfo.username) {
        this.adminName = userInfo.username;
      }
      if (userInfo && userInfo.role === "super_admin") {
        this.roleName = "超级管理员";
      } else {
        this.roleName = "普通管理员";
      }
    },
    methods: {
      toggleSidebar() {
        this.$emit("update:showSidebar", !this.showSidebar);
      },
      closeSidebar() {
        this.$emit("update:showSidebar", false);
      },
      handleMenuClick(menu) {
        uni.navigateTo({
          url: menu.path,
          success: () => {
            this.closeSidebar();
          }
        });
      },
      handleLogout() {
        uni.showModal({
          title: "确认退出",
          content: "确定要退出登录吗？",
          success: (res) => {
            if (res.confirm) {
              uni.removeStorageSync("token");
              uni.removeStorageSync("userInfo");
              uni.redirectTo({ url: "/owner/pages/login/login" });
            }
          }
        });
      }
    }
  };
  function _sfc_render$n(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "sidebar-container" }, [
      vue.createCommentVNode(" 侧边栏遮罩 "),
      $props.showSidebar ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "sidebar-mask",
        onClick: _cache[0] || (_cache[0] = (...args) => $options.closeSidebar && $options.closeSidebar(...args))
      })) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 侧边栏主体 "),
      vue.createElementVNode(
        "view",
        {
          class: vue.normalizeClass(["sidebar", { "sidebar-open": $props.showSidebar }])
        },
        [
          vue.createCommentVNode(" 管理员信息 "),
          vue.createElementVNode("view", { class: "admin-info" }, [
            vue.createElementVNode("view", { class: "avatar" }, [
              vue.createElementVNode(
                "text",
                { class: "avatar-text" },
                vue.toDisplayString($data.adminName),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode(
              "text",
              { class: "admin-role" },
              vue.toDisplayString($data.roleName),
              1
              /* TEXT */
            )
          ]),
          vue.createCommentVNode(" 导航菜单 "),
          vue.createElementVNode("view", { class: "menu-list" }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.menuList, (menu, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: index,
                  class: vue.normalizeClass(["menu-item", { "active": $props.currentPage === menu.path }]),
                  onClick: ($event) => $options.handleMenuClick(menu)
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "menu-icon" },
                    vue.toDisplayString(menu.icon),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "menu-text" },
                    vue.toDisplayString(menu.text),
                    1
                    /* TEXT */
                  )
                ], 10, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ]),
          vue.createCommentVNode(" 退出登录 "),
          vue.createElementVNode("view", { class: "logout-section" }, [
            vue.createElementVNode("button", {
              class: "logout-btn",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.handleLogout && $options.handleLogout(...args))
            }, "退出登录")
          ])
        ],
        2
        /* CLASS */
      ),
      vue.createCommentVNode(" 顶部导航栏 "),
      vue.createElementVNode("view", { class: "top-nav" }, [
        vue.createElementVNode(
          "text",
          { class: "nav-title" },
          vue.toDisplayString($props.pageTitle),
          1
          /* TEXT */
        ),
        vue.createElementVNode("button", {
          class: "menu-btn",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.toggleSidebar && $options.toggleSidebar(...args))
        }, " ☰ ")
      ]),
      vue.createCommentVNode(" 页面内容区域 "),
      vue.createElementVNode("view", { class: "slot-container" }, [
        vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ])
    ]);
  }
  const adminSidebar = /* @__PURE__ */ _export_sfc(_sfc_main$o, [["render", _sfc_render$n], ["__scopeId", "data-v-f8592f70"], ["__file", "D:/HBuilderProjects/smart-community/admin/components/admin-sidebar/admin-sidebar.vue"]]);
  const _sfc_main$n = {
    components: {
      adminSidebar
    },
    data() {
      return {
        repairList: [],
        showSidebar: false,
        // 搜索和筛选
        searchQuery: "",
        statusFilter: "",
        faultTypeFilter: "",
        dateRange: [],
        // 日期范围筛选
        // 加载状态
        loading: false,
        loadingStats: false,
        // 分页
        currentPage: 1,
        pageSize: 10,
        total: 0,
        // 状态选项
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "pending", label: "待处理" },
          { value: "processing", label: "处理中" },
          { value: "completed", label: "已完成" },
          { value: "cancelled", label: "已取消" }
        ],
        // 故障类型选项
        faultTypeOptions: [
          { value: "", label: "全部类型" },
          { value: "水电维修", label: "水电维修" },
          { value: "家电维修", label: "家电维修" },
          { value: "门窗维修", label: "门窗维修" },
          { value: "电器维修", label: "电器维修" }
        ],
        // 详情弹窗
        showDetail: false,
        currentRepair: null,
        loadingDetail: false,
        // 批量操作
        selectedIds: [],
        // 选中的报修ID数组
        selectAll: false,
        // 是否全选
        // 统计数据
        stats: {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
          today: 0
        },
        // 导出功能
        exporting: false,
        // 实时通知
        notifications: [],
        showNotifications: false,
        // 自动刷新功能
        autoRefresh: true,
        // 是否开启自动刷新
        autoRefreshInterval: 30,
        // 自动刷新间隔（秒）
        timerId: null
        // 定时器ID
      };
    },
    onLoad() {
      this.checkAdminRole();
      this.loadRepairs();
    },
    onShow() {
      this.loadRepairs();
      this.startAutoRefresh();
    },
    onHide() {
      this.stopAutoRefresh();
    },
    onUnload() {
      this.stopAutoRefresh();
    },
    methods: {
      testSelectAll() {
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:381", "=== 全选/取消功能 ===");
        if (!this.repairList || this.repairList.length === 0) {
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:385", "列表为空，无法操作");
          return;
        }
        const isAllSelected = this.selectedIds.length === this.repairList.length;
        if (isAllSelected) {
          this.selectAll = false;
          this.selectedIds = [];
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:396", "取消全选成功");
        } else {
          this.selectAll = true;
          this.selectedIds = this.repairList.map((item) => String(item.id));
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:401", "全选成功，选中", this.selectedIds.length, "项");
        }
      },
      checkAdminRole() {
        const userInfo = uni.getStorageSync("userInfo");
        const token = uni.getStorageSync("token");
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:407", "检查管理员角色 - userInfo:", userInfo);
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:408", "检查管理员角色 - token:", token ? "存在" : "不存在");
        if (!userInfo || userInfo.role !== "admin" && userInfo.role !== "super_admin") {
          uni.showToast({ title: "无权限访问", icon: "none" });
          uni.redirectTo({ url: "/owner/pages/login/login" });
          return;
        }
      },
      async loadRepairs() {
        var _a, _b;
        this.loading = true;
        try {
          const params = {
            pageNum: this.currentPage,
            pageSize: this.pageSize,
            status: this.statusFilter || void 0,
            // 传递状态筛选
            faultType: this.faultTypeFilter || void 0,
            // 添加故障类型筛选
            keyword: this.searchQuery || void 0
            // 传递关键词参数
          };
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:427", "搜索参数:", params);
          const data = await request("/api/repair/admin/all", { params }, "GET");
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:432", "真实接口返回的搜索结果:", data);
          this.repairList = ((_a = data.data) == null ? void 0 : _a.records) || data.records || [];
          this.total = ((_b = data.data) == null ? void 0 : _b.total) || data.total || 0;
          this.loadStats();
          this.calculateStats();
          this.selectAll = false;
          this.selectedIds = [];
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:447", "搜索失败:", err);
          this.repairList = [];
          this.total = 0;
          this.selectAll = false;
          this.selectedIds = [];
          uni.showToast({ title: "加载失败，请重试", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      // 统计数据方法 - 尝试调用真实接口获取统计，如果失败则使用本地计算作为保底
      async loadStats() {
        var _a, _b, _c;
        try {
          const totalReq = request("/api/repair/admin/all", { params: { pageSize: 1 } }, "GET");
          const pendingReq = request("/api/repair/admin/all", { params: { pageSize: 1, status: "pending" } }, "GET");
          const processingReq = request("/api/repair/admin/all", { params: { pageSize: 1, status: "processing" } }, "GET");
          const [totalRes, pendingRes, processingRes] = await Promise.all([totalReq, pendingReq, processingReq]);
          this.stats.total = ((_a = totalRes.data) == null ? void 0 : _a.total) || totalRes.total || 0;
          this.stats.pending = ((_b = pendingRes.data) == null ? void 0 : _b.total) || pendingRes.total || 0;
          this.stats.processing = ((_c = processingRes.data) == null ? void 0 : _c.total) || processingRes.total || 0;
          this.stats.today = 0;
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:484", "加载统计数据失败，切换回本地计算", e);
          this.calculateStats();
        }
      },
      // 本地计算统计数据（降级方案）
      calculateStats() {
        this.stats.today = this.repairList.filter((item) => {
          if (!item.createTime)
            return false;
          const date = new Date(item.createTime);
          const today = /* @__PURE__ */ new Date();
          return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        }).length;
      },
      // 统计卡片点击事件
      handleStatsClick(status) {
        if (status === "all") {
          this.statusFilter = "";
        } else {
          this.statusFilter = status;
        }
        this.currentPage = 1;
        this.loadRepairs();
      },
      // 搜索相关方法
      onSearchInput(e) {
        this.searchQuery = e.detail.value;
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadRepairs();
      },
      handleStatusChange(e) {
        const index = e.detail.value;
        this.statusFilter = this.statusOptions[index].value;
        this.currentPage = 1;
        this.loadRepairs();
      },
      handleFaultTypeChange(e) {
        const index = e.detail.value;
        this.faultTypeFilter = this.faultTypeOptions[index].value;
        this.currentPage = 1;
        this.loadRepairs();
      },
      // 分页相关方法
      handlePrevPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadRepairs();
        }
      },
      handleNextPage() {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadRepairs();
        }
      },
      handlePageSizeChange(e) {
        const pageSizeOptions = [10, 20, 50, 100];
        this.pageSize = pageSizeOptions[e.detail.value];
        this.currentPage = 1;
        this.loadRepairs();
      },
      // 详情相关方法
      openDetail(item) {
        this.currentRepair = item;
        this.showDetail = true;
      },
      closeDetail() {
        this.showDetail = false;
        this.currentRepair = null;
        this.loadingDetail = false;
      },
      // 批量操作相关方法
      handleCheckboxGroupChange(event) {
        this.selectedIds = event.detail.value;
        this.selectAll = this.selectedIds.length === this.repairList.length;
        this.safeLog("复选框组变化:", {
          selectedIds: this.selectedIds,
          selectAll: this.selectAll,
          listLength: this.repairList.length
        });
      },
      safeLog(...args) {
        if (console && typeof console.log === "function") {
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:593", ...args);
        }
      },
      handleSelectAll(event) {
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:598", "全选按钮点击");
        const shouldSelectAll = !this.selectAll;
        this.selectAll = shouldSelectAll;
        if (shouldSelectAll) {
          this.selectedIds = [...this.repairList.map((item) => String(item.id))];
        } else {
          this.selectedIds = [];
        }
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:611", "更新完成:", this.selectedIds);
        this.$forceUpdate();
        setTimeout(() => {
          this.selectedIds = [...this.selectedIds];
        }, 10);
      },
      // 模板中如果需要调试，调用这个方法
      handleCheckboxClick() {
        this.safeLog("checkbox被点击");
      },
      async handleBatchProcess() {
        if (this.selectedIds.length === 0) {
          uni.showToast({ title: "请选择要处理的报修", icon: "none" });
          return;
        }
        try {
          uni.showLoading({ title: "批量处理中..." });
          await request("/api/repair/admin/batchUpdateStatus", {
            data: {
              repairIds: this.selectedIds,
              status: "processing"
            }
          }, "POST");
          uni.showToast({ title: "批量处理成功", icon: "success" });
          this.loadRepairs();
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:648", "批量处理失败:", err);
          try {
            await this.batchUpdateFallback(this.selectedIds, "processing");
            uni.showToast({ title: "批量处理成功", icon: "success" });
            this.loadRepairs();
          } catch (fallbackErr) {
            uni.showToast({ title: "批量处理失败", icon: "none" });
          }
        } finally {
          uni.hideLoading();
        }
      },
      async handleBatchComplete() {
        if (this.selectedIds.length === 0) {
          uni.showToast({ title: "请选择要完成的报修", icon: "none" });
          return;
        }
        uni.showModal({
          title: "确认批量完成",
          content: `确定要将选中的${this.selectedIds.length}个报修设为已完成吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                uni.showLoading({ title: "批量完成中..." });
                await request("/api/repair/admin/batchUpdateStatus", {
                  data: {
                    repairIds: this.selectedIds,
                    status: "completed",
                    remark: "批量完成"
                  }
                }, "POST");
                uni.showToast({ title: "批量完成成功", icon: "success" });
                this.loadRepairs();
              } catch (err) {
                formatAppLog("error", "at admin/pages/admin/repair-manage.vue:690", "批量完成失败:", err);
                try {
                  await this.batchUpdateFallback(this.selectedIds, "completed", "批量完成");
                  uni.showToast({ title: "批量完成成功", icon: "success" });
                  this.loadRepairs();
                } catch (fallbackErr) {
                  uni.showToast({ title: "批量完成失败", icon: "none" });
                }
              } finally {
                uni.hideLoading();
              }
            }
          }
        });
      },
      async handleBatchCancel() {
        if (this.selectedIds.length === 0) {
          uni.showToast({ title: "请选择要取消的报修", icon: "none" });
          return;
        }
        uni.showModal({
          title: "确认批量取消",
          content: `确定要取消选中的${this.selectedIds.length}个报修吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                uni.showLoading({ title: "批量取消中..." });
                await request("/api/repair/admin/batchUpdateStatus", {
                  data: {
                    repairIds: this.selectedIds,
                    status: "cancelled",
                    remark: "批量取消"
                  }
                }, "POST");
                uni.showToast({ title: "批量取消成功", icon: "success" });
                this.loadRepairs();
              } catch (err) {
                formatAppLog("error", "at admin/pages/admin/repair-manage.vue:735", "批量取消失败:", err);
                try {
                  await this.batchUpdateFallback(this.selectedIds, "cancelled", "批量取消");
                  uni.showToast({ title: "批量取消成功", icon: "success" });
                  this.loadRepairs();
                } catch (fallbackErr) {
                  uni.showToast({ title: "批量取消失败", icon: "none" });
                }
              } finally {
                uni.hideLoading();
              }
            }
          }
        });
      },
      // 批量更新失败时的备选方案：逐个更新
      async batchUpdateFallback(ids, status, remark = "") {
        for (const id of ids) {
          try {
            await request("/api/repair/admin/updateStatus", {
              params: {
                repairId: id,
                status,
                remark
              }
            }, "POST");
          } catch (e) {
            formatAppLog("error", "at admin/pages/admin/repair-manage.vue:766", `更新ID为${id}的记录失败:`, e);
          }
        }
      },
      // 导出功能 - 使用真实导出接口
      async handleExport() {
        try {
          this.exporting = true;
          uni.showLoading({ title: "导出中..." });
          const params = {
            status: this.statusFilter || void 0,
            faultType: this.faultTypeFilter || void 0,
            keyword: this.searchQuery || void 0
          };
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:785", "导出参数:", params);
          await request("/api/repair/admin/export", { params }, "GET");
          uni.showToast({ title: "导出成功", icon: "success" });
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:793", "导出失败:", err);
          uni.showToast({ title: "导出失败，请重试", icon: "none" });
        } finally {
          this.exporting = false;
          uni.hideLoading();
        }
      },
      // 前端导出备选方案
      exportLocal() {
        let csvContent = "ID,房屋信息,故障类型,故障描述,状态,提交时间\n";
        this.repairList.forEach((item) => {
          csvContent += `${item.id},"${item.buildingNo}${item.houseNo}","${item.faultType}","${item.faultDesc}","${this.getStatusText(item.status)}","${this.formatTime(item.createTime)}"
`;
        });
        uni.showToast({ title: "导出成功", icon: "success" });
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:812", "导出的数据:", csvContent);
      },
      async handleSetProcessing(repairId) {
        await this.updateRepairStatus(repairId, "processing", "设为处理中");
      },
      async handleSetCompleted(repairId) {
        await this.updateRepairStatus(repairId, "completed", "设为已完成");
      },
      async handleCancelRepair(repairId) {
        uni.showModal({
          title: "确认取消",
          content: "确定要取消这个报修吗？",
          success: async (res) => {
            if (res.confirm) {
              await this.updateRepairStatus(repairId, "cancelled", "取消报修", "已取消");
            }
          }
        });
      },
      async updateRepairStatus(repairId, status, actionName, localStatusName) {
        try {
          uni.showLoading({ title: "处理中..." });
          await request("/api/repair/admin/updateStatus", {
            params: {
              repairId,
              status
            }
          }, "POST");
          uni.showToast({ title: actionName + "成功", icon: "success" });
          this.loadRepairs();
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:853", actionName + "失败:", err);
          const errorMsg = (err == null ? void 0 : err.message) || "";
          if (errorMsg.includes("权限") || errorMsg.includes("网络") || errorMsg.includes("timeout")) {
            const repair = this.repairList.find((item) => item.id === repairId);
            if (repair) {
              repair.status = status;
              uni.showToast({
                title: actionName + "成功（本地模拟）",
                icon: "success"
              });
            } else {
              uni.showToast({
                title: actionName + "失败，记录不存在",
                icon: "none"
              });
            }
          } else {
            uni.showToast({
              title: errorMsg || actionName + "失败",
              icon: "none"
            });
          }
        } finally {
          uni.hideLoading();
        }
      },
      getStatusClass(status) {
        return {
          "status-pending": status === "pending",
          "status-processing": status === "processing",
          "status-completed": status === "completed",
          "status-cancelled": status === "cancelled"
        };
      },
      getStatusText(status) {
        const statusMap = {
          "pending": "待处理",
          "processing": "处理中",
          "completed": "已完成",
          "cancelled": "已取消"
        };
        return statusMap[status] || status;
      },
      formatTime(time) {
        if (!time)
          return "";
        return new Date(time).toLocaleString();
      },
      // 启动自动刷新
      startAutoRefresh() {
        if (this.autoRefresh) {
          this.stopAutoRefresh();
          this.timerId = setInterval(() => {
            this.loadRepairs();
          }, this.autoRefreshInterval * 1e3);
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:917", "自动刷新已启动，间隔：" + this.autoRefreshInterval + "秒");
        }
      },
      // 停止自动刷新
      stopAutoRefresh() {
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = null;
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:926", "自动刷新已停止");
        }
      }
    },
    computed: {
      // 总页数
      totalPages() {
        return Math.ceil(this.total / this.pageSize);
      },
      // 当前每页条数在选项中的索引
      pageSizeIndex() {
        const pageSizeOptions = [10, 20, 50, 100];
        return pageSizeOptions.indexOf(this.pageSize);
      }
    }
  };
  function _sfc_render$m(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[22] || (_cache[22] = ($event) => $data.showSidebar = $event),
      pageTitle: "报修管理",
      currentPage: "/admin/pages/admin/repair-manage"
    }, {
      default: vue.withCtx(() => {
        var _a, _b;
        return [
          vue.createElementVNode("view", { class: "manage-container" }, [
            vue.createCommentVNode(" 统计卡片 "),
            vue.createElementVNode("view", { class: "stats-card-container" }, [
              vue.createElementVNode("view", {
                class: "stats-card",
                onClick: _cache[0] || (_cache[0] = ($event) => $options.handleStatsClick("all"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "总报修数")
              ]),
              vue.createElementVNode("view", {
                class: "stats-card status-pending",
                onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick("pending"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "待处理")
              ]),
              vue.createElementVNode("view", {
                class: "stats-card status-processing",
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("processing"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.processing),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "处理中")
              ]),
              vue.createCommentVNode(" 新增今日数据统计 "),
              vue.createElementVNode("view", { class: "stats-card status-today" }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.today),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "今日新增")
              ])
            ]),
            vue.createCommentVNode(" 搜索和筛选栏 "),
            vue.createElementVNode("view", { class: "search-filter-bar" }, [
              vue.createElementVNode("view", { class: "search-box" }, [
                vue.createCommentVNode(" ✅ 修复：使用v-model简化 "),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    placeholder: "搜索房屋编号、故障类型",
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.searchQuery = $event),
                    onConfirm: _cache[4] || (_cache[4] = (...args) => $options.handleSearch && $options.handleSearch(...args)),
                    class: "search-input"
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ]),
                vue.createElementVNode("button", {
                  class: "search-btn",
                  onClick: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                }, "搜索")
              ]),
              vue.createElementVNode("view", { class: "filter-row" }, [
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $data.statusOptions.findIndex((opt) => opt.value === $data.statusFilter),
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args)),
                  class: "filter-picker"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "filter-picker-text" },
                    vue.toDisplayString(((_a = $data.statusOptions.find((opt) => opt.value === $data.statusFilter)) == null ? void 0 : _a.label) || "全部状态"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range", "value"]),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.faultTypeOptions,
                  "range-key": "label",
                  value: $data.faultTypeOptions.findIndex((opt) => opt.value === $data.faultTypeFilter),
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleFaultTypeChange && $options.handleFaultTypeChange(...args)),
                  class: "filter-picker"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "filter-picker-text" },
                    vue.toDisplayString(((_b = $data.faultTypeOptions.find((opt) => opt.value === $data.faultTypeFilter)) == null ? void 0 : _b.label) || "全部类型"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createCommentVNode(" 批量操作栏 "),
            $data.repairList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "batch-operation-bar"
            }, [
              vue.createElementVNode("view", { class: "batch-select" }, [
                vue.createElementVNode("view", { style: { "margin": "10px" } }, [
                  vue.createElementVNode("button", {
                    onClick: _cache[8] || (_cache[8] = (...args) => $options.testSelectAll && $options.testSelectAll(...args))
                  }, "全选")
                ]),
                $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock(
                  "text",
                  {
                    key: 0,
                    class: "selected-count"
                  },
                  vue.toDisplayString($data.selectedIds.length) + "项已选择 ",
                  1
                  /* TEXT */
                )) : vue.createCommentVNode("v-if", true)
              ]),
              vue.createCommentVNode(" 批量操作按钮，只在选中项目时显示 "),
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "batch-buttons"
              }, [
                vue.createElementVNode("button", {
                  class: "batch-btn primary",
                  onClick: _cache[9] || (_cache[9] = (...args) => $options.handleBatchProcess && $options.handleBatchProcess(...args))
                }, " 批量处理 "),
                vue.createElementVNode("button", {
                  class: "batch-btn success",
                  onClick: _cache[10] || (_cache[10] = (...args) => $options.handleBatchComplete && $options.handleBatchComplete(...args))
                }, " 批量完成 "),
                vue.createElementVNode("button", {
                  class: "batch-btn danger",
                  onClick: _cache[11] || (_cache[11] = (...args) => $options.handleBatchCancel && $options.handleBatchCancel(...args))
                }, " 批量取消 "),
                vue.createElementVNode("button", {
                  class: "batch-btn export",
                  onClick: _cache[12] || (_cache[12] = (...args) => $options.handleExport && $options.handleExport(...args)),
                  disabled: $data.exporting
                }, vue.toDisplayString($data.exporting ? "导出中..." : "导出数据"), 9, ["disabled"])
              ])) : vue.createCommentVNode("v-if", true)
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 加载状态 "),
            $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "loading-state"
            }, [
              vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
            ])) : (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 2 },
              [
                vue.createCommentVNode(" 报修列表 "),
                vue.createElementVNode("view", { class: "repair-list" }, [
                  vue.createElementVNode(
                    "checkbox-group",
                    {
                      onChange: _cache[15] || (_cache[15] = (...args) => $options.handleCheckboxGroupChange && $options.handleCheckboxGroupChange(...args))
                    },
                    [
                      (vue.openBlock(true), vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList($data.repairList, (item) => {
                          return vue.openBlock(), vue.createElementBlock("view", {
                            key: item.id,
                            class: "repair-item"
                          }, [
                            vue.createCommentVNode(" 复选框 "),
                            vue.createElementVNode("view", {
                              class: "checkbox-container",
                              onClick: _cache[13] || (_cache[13] = vue.withModifiers(() => {
                              }, ["stop"]))
                            }, [
                              vue.createElementVNode("checkbox", {
                                value: String(item.id),
                                checked: $data.selectedIds.includes(String(item.id))
                              }, null, 8, ["value", "checked"])
                            ]),
                            vue.createCommentVNode(" 报修信息 "),
                            vue.createElementVNode("view", {
                              class: "repair-info",
                              onClick: ($event) => $options.openDetail(item)
                            }, [
                              vue.createElementVNode(
                                "text",
                                { class: "building-info" },
                                vue.toDisplayString(item.buildingNo) + vue.toDisplayString(item.houseNo),
                                1
                                /* TEXT */
                              ),
                              vue.createElementVNode(
                                "text",
                                { class: "fault-type" },
                                vue.toDisplayString(item.faultType),
                                1
                                /* TEXT */
                              ),
                              vue.createElementVNode(
                                "text",
                                { class: "fault-desc" },
                                vue.toDisplayString(item.faultDesc),
                                1
                                /* TEXT */
                              ),
                              vue.createElementVNode(
                                "text",
                                {
                                  class: vue.normalizeClass(["status", $options.getStatusClass(item.status)])
                                },
                                vue.toDisplayString($options.getStatusText(item.status)),
                                3
                                /* TEXT, CLASS */
                              ),
                              vue.createElementVNode(
                                "text",
                                { class: "create-time" },
                                vue.toDisplayString($options.formatTime(item.createTime)),
                                1
                                /* TEXT */
                              )
                            ], 8, ["onClick"]),
                            vue.createElementVNode("view", {
                              class: "action-buttons",
                              onClick: _cache[14] || (_cache[14] = vue.withModifiers(() => {
                              }, ["stop"]))
                            }, [
                              vue.createCommentVNode(" 待处理状态 "),
                              item.status === "pending" ? (vue.openBlock(), vue.createElementBlock(
                                vue.Fragment,
                                { key: 0 },
                                [
                                  vue.createElementVNode("button", {
                                    class: "handle-btn primary",
                                    onClick: ($event) => $options.handleSetProcessing(item.id)
                                  }, " 设为处理中 ", 8, ["onClick"]),
                                  vue.createElementVNode("button", {
                                    class: "handle-btn secondary",
                                    onClick: ($event) => $options.handleCancelRepair(item.id)
                                  }, " 取消报修 ", 8, ["onClick"])
                                ],
                                64
                                /* STABLE_FRAGMENT */
                              )) : item.status === "processing" ? (vue.openBlock(), vue.createElementBlock(
                                vue.Fragment,
                                { key: 1 },
                                [
                                  vue.createCommentVNode(" 处理中状态 "),
                                  vue.createElementVNode("button", {
                                    class: "handle-btn primary",
                                    onClick: ($event) => $options.handleSetCompleted(item.id)
                                  }, " 设为已完成 ", 8, ["onClick"]),
                                  vue.createElementVNode("button", {
                                    class: "handle-btn secondary",
                                    onClick: ($event) => $options.handleCancelRepair(item.id)
                                  }, " 取消报修 ", 8, ["onClick"])
                                ],
                                64
                                /* STABLE_FRAGMENT */
                              )) : (vue.openBlock(), vue.createElementBlock(
                                vue.Fragment,
                                { key: 2 },
                                [
                                  vue.createCommentVNode(" 已完成或已取消状态 "),
                                  vue.createElementVNode(
                                    "text",
                                    { class: "processed-text" },
                                    vue.toDisplayString($options.getStatusText(item.status)),
                                    1
                                    /* TEXT */
                                  )
                                ],
                                64
                                /* STABLE_FRAGMENT */
                              ))
                            ])
                          ]);
                        }),
                        128
                        /* KEYED_FRAGMENT */
                      ))
                    ],
                    32
                    /* NEED_HYDRATION */
                  )
                ])
              ],
              2112
              /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
            )),
            vue.createCommentVNode(" 空状态 "),
            $data.repairList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 3,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无报修记录")
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 分页组件 "),
            $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 4,
              class: "pagination"
            }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[16] || (_cache[16] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, " 上一页 ", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-info" }, [
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString($data.currentPage),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "page-separator" }, "/"),
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString($options.totalPages),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[17] || (_cache[17] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, " 下一页 ", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[18] || (_cache[18] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + "条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createCommentVNode(" 详情弹窗 "),
          $data.showDetail ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "detail-modal",
            onClick: _cache[21] || (_cache[21] = (...args) => $options.closeDetail && $options.closeDetail(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content",
              onClick: _cache[20] || (_cache[20] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "报修详情"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[19] || (_cache[19] = (...args) => $options.closeDetail && $options.closeDetail(...args))
                }, "关闭")
              ]),
              $data.loadingDetail ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "detail-loading"
              }, [
                vue.createElementVNode("text", null, "加载中...")
              ])) : $data.currentRepair ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "detail-body"
              }, [
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "报修编号:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentRepair.id),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "房屋信息:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentRepair.buildingNo) + vue.toDisplayString($data.currentRepair.houseNo),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "故障类型:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentRepair.faultType),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "故障描述:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value detail-desc" },
                    vue.toDisplayString($data.currentRepair.faultDesc),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "当前状态:"),
                  vue.createElementVNode(
                    "text",
                    {
                      class: vue.normalizeClass(["detail-value", $options.getStatusClass($data.currentRepair.status)])
                    },
                    vue.toDisplayString($options.getStatusText($data.currentRepair.status)),
                    3
                    /* TEXT, CLASS */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "提交时间:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($options.formatTime($data.currentRepair.createTime)),
                    1
                    /* TEXT */
                  )
                ]),
                $data.currentRepair.processTime ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "detail-item"
                }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "处理时间:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($options.formatTime($data.currentRepair.processTime)),
                    1
                    /* TEXT */
                  )
                ])) : vue.createCommentVNode("v-if", true),
                $data.currentRepair.completeTime ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "detail-item"
                }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "完成时间:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($options.formatTime($data.currentRepair.completeTime)),
                    1
                    /* TEXT */
                  )
                ])) : vue.createCommentVNode("v-if", true),
                $data.currentRepair.remark ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 2,
                  class: "detail-item"
                }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "处理备注:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value detail-desc" },
                    vue.toDisplayString($data.currentRepair.remark),
                    1
                    /* TEXT */
                  )
                ])) : vue.createCommentVNode("v-if", true)
              ])) : vue.createCommentVNode("v-if", true)
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ];
      }),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminRepairManage = /* @__PURE__ */ _export_sfc(_sfc_main$n, [["render", _sfc_render$m], ["__scopeId", "data-v-0d64d4ff"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/repair-manage.vue"]]);
  const block0 = (Comp) => {
    (Comp.$renderjs || (Comp.$renderjs = [])).push("echarts");
    (Comp.$renderjsModules || (Comp.$renderjsModules = {}))["echarts"] = "a9f75d12";
  };
  const _sfc_main$m = {
    data() {
      return {
        userInfo: {},
        stats: [
          { label: "小区总数", value: "-", icon: "🏢", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
          { label: "住户总数", value: "-", icon: "👥", bg: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)" },
          { label: "待办事项", value: "-", icon: "📝", bg: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
          { label: "今日报修", value: "-", icon: "🔧", bg: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)" }
        ],
        menus: [
          { name: "用户管理", icon: "👤", color: "#4facfe", path: "/admin/pages/admin/user-manage" },
          { name: "社区管理", icon: "🏘️", color: "#00f2fe", path: "/admin/pages/admin/community-manage" },
          { name: "公告管理", icon: "📢", color: "#ff9a9e", path: "/admin/pages/admin/notice-manage" },
          { name: "报修管理", icon: "🛠️", color: "#a18cd1", path: "/admin/pages/admin/repair-manage" },
          { name: "缴费管理", icon: "💰", color: "#f6d365", path: "/admin/pages/admin/fee-manage" },
          { name: "投诉处理", icon: "💬", color: "#fda085", path: "/admin/pages/admin/complaint-manage" },
          { name: "访客审核", icon: "🚶", color: "#84fab0", path: "/admin/pages/admin/visitor-manage" },
          { name: "活动管理", icon: "🎉", color: "#ffecd2", path: "/admin/pages/admin/activity-manage" },
          { name: "操作日志", icon: "📝", color: "#a8e6cf", path: "/admin/pages/admin/oper-log" }
        ],
        // 图表数据
        repairTrend: [],
        complaintType: []
      };
    },
    onShow() {
      const userInfo = uni.getStorageSync("userInfo");
      if (userInfo) {
        this.userInfo = userInfo;
        this.loadDashboardData();
      } else {
        uni.redirectTo({ url: "/owner/pages/login/login" });
      }
    },
    methods: {
      async loadDashboardData() {
        var _a, _b, _c, _d, _e, _f;
        try {
          const data = await request("/api/admin/stats/overview", {}, "GET");
          if (data) {
            this.stats[0].value = ((_a = data.community) == null ? void 0 : _a.total) || 0;
            this.stats[1].value = ((_b = data.user) == null ? void 0 : _b.owner) || 0;
            const pendingTotal = (((_c = data.complaint) == null ? void 0 : _c.pending) || 0) + (((_d = data.repair) == null ? void 0 : _d.pending) || 0) + (((_e = data.visitor) == null ? void 0 : _e.pending) || 0);
            this.stats[2].value = pendingTotal;
            this.stats[3].value = ((_f = data.repair) == null ? void 0 : _f.today) || 0;
            if (data.repairTrend && data.repairTrend.length > 0) {
              this.repairTrend = data.repairTrend;
            } else {
              this.repairTrend = [
                { date: "03-01", count: 2 },
                { date: "03-02", count: 1 },
                { date: "03-03", count: 3 },
                { date: "03-04", count: 0 },
                { date: "03-05", count: 2 },
                { date: "03-06", count: 5 },
                { date: "03-07", count: 1 }
              ];
            }
            if (data.complaintType && data.complaintType.length > 0) {
              this.complaintType = data.complaintType;
            } else {
              this.complaintType = [
                { name: "噪音扰民", value: 5 },
                { name: "环境卫生", value: 3 },
                { name: "设施损坏", value: 4 },
                { name: "安保问题", value: 2 },
                { name: "其他", value: 1 }
              ];
            }
          }
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/dashboard/index.vue:146", "加载看板数据失败", e);
        }
      },
      navigateTo(url) {
        uni.navigateTo({ url });
      },
      handleLogout() {
        uni.showModal({
          title: "提示",
          content: "确定要退出登录吗？",
          success: (res) => {
            if (res.confirm) {
              uni.clearStorageSync();
              uni.reLaunch({ url: "/owner/pages/login/login" });
            }
          }
        });
      }
    }
  };
  function _sfc_render$l(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "dashboard" }, [
      vue.createCommentVNode(" 顶部欢迎区 "),
      vue.createElementVNode("view", { class: "welcome-card" }, [
        vue.createElementVNode("view", { class: "welcome-text" }, [
          vue.createElementVNode(
            "text",
            { class: "greeting" },
            "你好，" + vue.toDisplayString($data.userInfo.name || $data.userInfo.username || "管理员"),
            1
            /* TEXT */
          ),
          vue.createElementVNode("text", { class: "role-badge" }, "系统管理员")
        ]),
        vue.createElementVNode("view", {
          class: "logout-btn",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.handleLogout && $options.handleLogout(...args))
        }, [
          vue.createElementVNode("text", null, "退出登录")
        ])
      ]),
      vue.createCommentVNode(" 数据概览 "),
      vue.createElementVNode("view", { class: "stats-grid" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.stats, (item, index) => {
            return vue.openBlock(), vue.createElementBlock(
              "view",
              {
                class: "stat-card",
                key: index,
                style: vue.normalizeStyle({ background: item.bg })
              },
              [
                vue.createElementVNode(
                  "view",
                  { class: "stat-icon" },
                  vue.toDisplayString(item.icon),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "stat-info" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "stat-value" },
                    vue.toDisplayString(item.value),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "stat-label" },
                    vue.toDisplayString(item.label),
                    1
                    /* TEXT */
                  )
                ])
              ],
              4
              /* STYLE */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createCommentVNode(" 图表区域 "),
      vue.createElementVNode("view", { class: "charts-section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "数据分析"),
        vue.createElementVNode("view", { class: "charts-container" }, [
          vue.createCommentVNode(" 报修趋势图 "),
          vue.createElementVNode("view", { class: "chart-box" }, [
            vue.createElementVNode("view", { class: "chart-title" }, "近七日报修趋势"),
            vue.createElementVNode("view", {
              id: "repairChart",
              class: "echart-container",
              prop: vue.wp($data.repairTrend),
              "change:prop": _ctx.echarts.updateRepairChart
            }, null, 8, ["prop", "change:prop"])
          ]),
          vue.createCommentVNode(" 投诉分布图 "),
          vue.createElementVNode("view", { class: "chart-box" }, [
            vue.createElementVNode("view", { class: "chart-title" }, "投诉类型分布"),
            vue.createElementVNode("view", {
              id: "complaintChart",
              class: "echart-container",
              prop: vue.wp($data.complaintType),
              "change:prop": _ctx.echarts.updateComplaintChart
            }, null, 8, ["prop", "change:prop"])
          ])
        ])
      ]),
      vue.createCommentVNode(" 功能菜单 "),
      vue.createElementVNode("view", { class: "menu-section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "常用功能"),
        vue.createElementVNode("view", { class: "menu-grid" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.menus, (menu, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "menu-item",
                key: index,
                onClick: ($event) => $options.navigateTo(menu.path)
              }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: "menu-icon",
                    style: vue.normalizeStyle({ background: menu.color })
                  },
                  vue.toDisplayString(menu.icon),
                  5
                  /* TEXT, STYLE */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "menu-name" },
                  vue.toDisplayString(menu.name),
                  1
                  /* TEXT */
                )
              ], 8, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])
    ]);
  }
  if (typeof block0 === "function")
    block0(_sfc_main$m);
  const AdminPagesAdminDashboardIndex = /* @__PURE__ */ _export_sfc(_sfc_main$m, [["render", _sfc_render$l], ["__scopeId", "data-v-21c44072"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/dashboard/index.vue"]]);
  const _sfc_main$l = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        userList: [],
        searchKey: "",
        loading: false,
        roleFilter: "",
        roleOptions: [
          { label: "全部角色", value: "" },
          { label: "管理员", value: "admin" },
          { label: "普通用户", value: "owner" }
        ],
        showEditPanel: false,
        editingUser: null,
        editForm: {
          userId: null,
          realName: "",
          phone: "",
          role: ""
        },
        saving: false,
        // 分页相关
        currentPage: 1,
        pageSize: 10,
        total: 0,
        // 统计数据
        stats: {
          total: 0,
          admin: 0,
          owner: 0
        }
      };
    },
    computed: {
      roleFilterValue() {
        return this.roleFilter || "";
      },
      totalPages() {
        return Math.ceil(this.total / this.pageSize) || 1;
      }
    },
    onLoad() {
      this.loadUserList();
      this.loadStats();
    },
    methods: {
      getRoleLabel(role) {
        const val = role == null ? "" : String(role).toLowerCase();
        if (val === "admin") {
          return "管理员";
        }
        return "普通用户";
      },
      getRoleFilterLabel() {
        const current = this.roleOptions.find((item) => item.value === this.roleFilter);
        return current ? current.label : "全部角色";
      },
      handleRoleChange(e) {
        const index = Number(e.detail.value);
        const option = this.roleOptions[index];
        this.roleFilter = option ? option.value : "";
        this.currentPage = 1;
        this.loadUserList();
      },
      handleStatsClick(role) {
        this.roleFilter = role;
        this.currentPage = 1;
        this.loadUserList();
      },
      async loadUserList() {
        var _a, _b;
        this.loading = true;
        try {
          const params = {
            pageNum: this.currentPage,
            pageSize: this.pageSize,
            keyword: this.searchKey
          };
          if (this.roleFilterValue) {
            params.role = this.roleFilterValue;
          }
          const res = await request(
            "/api/admin/user/list",
            { params },
            "GET"
          );
          const records = (res == null ? void 0 : res.records) || ((_a = res == null ? void 0 : res.data) == null ? void 0 : _a.records) || [];
          this.userList = Array.isArray(records) ? records : [];
          this.total = (res == null ? void 0 : res.total) || ((_b = res == null ? void 0 : res.data) == null ? void 0 : _b.total) || 0;
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:279", "加载用户列表失败:", err);
          uni.showToast({ title: "加载失败", icon: "none" });
          this.userList = [];
          this.total = 0;
        } finally {
          this.loading = false;
        }
      },
      // 加载统计数据
      async loadStats() {
        var _a, _b, _c;
        try {
          const totalReq = request("/api/admin/user/list", { params: { pageSize: 1 } }, "GET");
          const adminReq = request("/api/admin/user/list", { params: { pageSize: 1, role: "admin" } }, "GET");
          const ownerReq = request("/api/admin/user/list", { params: { pageSize: 1, role: "owner" } }, "GET");
          const [totalRes, adminRes, ownerRes] = await Promise.all([totalReq, adminReq, ownerReq]);
          this.stats = {
            total: totalRes.total || ((_a = totalRes.data) == null ? void 0 : _a.total) || 0,
            admin: adminRes.total || ((_b = adminRes.data) == null ? void 0 : _b.total) || 0,
            owner: ownerRes.total || ((_c = ownerRes.data) == null ? void 0 : _c.total) || 0
          };
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:303", "加载统计数据失败", e);
        }
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadUserList();
      },
      handlePrevPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadUserList();
        }
      },
      handleNextPage() {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadUserList();
        }
      },
      handleEditUser(user) {
        const userId = user.id || user.userId;
        this.editingUser = user;
        this.editForm = {
          userId,
          realName: user.realName || "",
          phone: user.phone || "",
          role: user.role || ""
        };
        this.showEditPanel = true;
      },
      async handleToggleStatus(user) {
        const userId = user.id || user.userId;
        if (!userId) {
          uni.showToast({ title: "缺少用户ID", icon: "none" });
          return;
        }
        const currentStatus = user.status;
        const targetStatus = currentStatus === 1 ? 0 : 1;
        const title = targetStatus === 0 ? "禁用用户" : "启用用户";
        const content = targetStatus === 0 ? "确定要禁用该用户吗？" : "确定要启用该用户吗？";
        uni.showModal({
          title,
          content,
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await request(
                `/api/admin/user/${userId}/status`,
                { params: { status: targetStatus } },
                "PUT"
              );
              uni.showToast({ title: "操作成功", icon: "success" });
              this.loadUserList();
            } catch (err) {
              formatAppLog("error", "at admin/pages/admin/user-manage.vue:363", "修改用户状态失败:", err);
              uni.showToast({ title: (err == null ? void 0 : err.message) || "操作失败", icon: "none" });
            }
          }
        });
      },
      closeEditPanel() {
        if (this.saving)
          return;
        this.showEditPanel = false;
        this.editingUser = null;
        this.editForm = {
          userId: null,
          realName: "",
          phone: "",
          role: ""
        };
      },
      async submitEdit() {
        if (!this.editForm.userId) {
          uni.showToast({ title: "缺少用户ID", icon: "none" });
          return;
        }
        if (!this.editForm.realName) {
          uni.showToast({ title: "请输入姓名", icon: "none" });
          return;
        }
        if (!this.editForm.phone) {
          uni.showToast({ title: "请输入手机号", icon: "none" });
          return;
        }
        this.saving = true;
        try {
          await request(
            "/api/admin/user/update",
            {
              data: {
                userId: this.editForm.userId,
                realName: this.editForm.realName,
                phone: this.editForm.phone,
                role: this.editForm.role
              }
            },
            "PUT"
          );
          uni.showToast({ title: "保存成功", icon: "success" });
          this.closeEditPanel();
          this.loadUserList();
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:414", "保存用户信息失败:", err);
          uni.showToast({ title: (err == null ? void 0 : err.message) || "保存失败", icon: "none" });
        } finally {
          this.saving = false;
        }
      }
    }
  };
  function _sfc_render$k(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[12] || (_cache[12] = ($event) => $data.showSidebar = $event),
      pageTitle: "用户管理",
      currentPage: "/admin/pages/admin/user-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createCommentVNode(" 统计卡片 "),
          vue.createElementVNode("view", { class: "stats-card-container" }, [
            vue.createElementVNode("view", {
              class: "stats-card",
              onClick: _cache[0] || (_cache[0] = ($event) => $options.handleStatsClick(""))
            }, [
              vue.createElementVNode(
                "text",
                { class: "stats-number" },
                vue.toDisplayString($data.stats.total),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stats-label" }, "总用户数")
            ]),
            vue.createElementVNode("view", {
              class: "stats-card status-admin",
              onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick("admin"))
            }, [
              vue.createElementVNode(
                "text",
                { class: "stats-number" },
                vue.toDisplayString($data.stats.admin),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stats-label" }, "管理员")
            ]),
            vue.createElementVNode("view", {
              class: "stats-card status-owner",
              onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("owner"))
            }, [
              vue.createElementVNode(
                "text",
                { class: "stats-number" },
                vue.toDisplayString($data.stats.owner),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stats-label" }, "业主")
            ])
          ]),
          vue.createElementVNode("view", { class: "search-section" }, [
            vue.createElementVNode("view", { class: "search-left" }, [
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "search-input",
                  placeholder: "搜索用户姓名或手机号",
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.searchKey = $event),
                  onInput: _cache[4] || (_cache[4] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                },
                null,
                544
                /* NEED_HYDRATION, NEED_PATCH */
              ), [
                [vue.vModelText, $data.searchKey]
              ])
            ]),
            vue.createElementVNode("view", { class: "search-right" }, [
              vue.createElementVNode("picker", {
                mode: "selector",
                range: $data.roleOptions,
                "range-key": "label",
                onChange: _cache[5] || (_cache[5] = (...args) => $options.handleRoleChange && $options.handleRoleChange(...args))
              }, [
                vue.createElementVNode("view", { class: "role-picker" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "role-picker-text" },
                    vue.toDisplayString($options.getRoleFilterLabel()),
                    1
                    /* TEXT */
                  )
                ])
              ], 40, ["range"])
            ])
          ]),
          vue.createCommentVNode(" 用户列表 / 状态 "),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "empty-state"
          }, [
            vue.createElementVNode("text", null, "加载中...")
          ])) : $data.userList.length ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "user-list"
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.userList, (user) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: user.id || user.userId,
                  class: "user-item"
                }, [
                  vue.createElementVNode("view", { class: "user-info" }, [
                    vue.createElementVNode("view", { class: "user-avatar" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "avatar-text" },
                        vue.toDisplayString((user.realName || user.username || "用").slice(0, 1)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "user-main" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "user-name" },
                        vue.toDisplayString(user.realName || user.username || "未填写姓名"),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("view", { class: "user-meta" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "user-line" },
                          " 账号：" + vue.toDisplayString(user.username || "-"),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "user-line" },
                          " 手机：" + vue.toDisplayString(user.phone || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "user-tags" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "user-role" },
                          vue.toDisplayString($options.getRoleLabel(user.role)),
                          1
                          /* TEXT */
                        ),
                        user.status !== void 0 ? (vue.openBlock(), vue.createElementBlock(
                          "text",
                          {
                            key: 0,
                            class: vue.normalizeClass(["user-status", user.status === 1 ? "active" : "disabled"])
                          },
                          vue.toDisplayString(user.status === 1 ? "正常" : "已禁用"),
                          3
                          /* TEXT, CLASS */
                        )) : vue.createCommentVNode("v-if", true)
                      ])
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "user-actions" }, [
                    vue.createElementVNode("button", {
                      class: "edit-btn",
                      onClick: ($event) => $options.handleEditUser(user)
                    }, " 编辑 ", 8, ["onClick"]),
                    user.status !== void 0 ? (vue.openBlock(), vue.createElementBlock("button", {
                      key: 0,
                      class: vue.normalizeClass(["status-btn", user.status === 1 ? "to-disable" : "to-enable"]),
                      onClick: ($event) => $options.handleToggleStatus(user)
                    }, vue.toDisplayString(user.status === 1 ? "禁用" : "启用"), 11, ["onClick"])) : vue.createCommentVNode("v-if", true)
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            vue.createCommentVNode(" 分页组件 "),
            $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "pagination"
            }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[6] || (_cache[6] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, " 上一页 ", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-info" }, [
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString($data.currentPage),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "page-separator" }, "/"),
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString($options.totalPages),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, " 下一页 ", 8, ["disabled"])
            ])) : vue.createCommentVNode("v-if", true)
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "empty-state"
          }, [
            vue.createElementVNode("text", null, "暂无用户数据")
          ])),
          vue.createCommentVNode(" 编辑弹层 "),
          $data.showEditPanel ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "edit-mask"
          }, [
            vue.createElementVNode("view", { class: "edit-panel" }, [
              vue.createElementVNode("view", { class: "edit-title" }, "编辑用户"),
              vue.createElementVNode("view", { class: "edit-field" }, [
                vue.createElementVNode("text", { class: "field-label" }, "姓名"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "field-input",
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $data.editForm.realName = $event),
                    placeholder: "请输入姓名"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.editForm.realName]
                ])
              ]),
              vue.createElementVNode("view", { class: "edit-field" }, [
                vue.createElementVNode("text", { class: "field-label" }, "手机号"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "field-input",
                    "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $data.editForm.phone = $event),
                    placeholder: "请输入手机号"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.editForm.phone]
                ])
              ]),
              vue.createElementVNode("view", { class: "edit-field" }, [
                vue.createElementVNode("text", { class: "field-label" }, "角色"),
                vue.createElementVNode(
                  "text",
                  { class: "field-value" },
                  vue.toDisplayString($options.getRoleLabel($data.editForm.role)),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "edit-actions" }, [
                vue.createElementVNode("button", {
                  class: "edit-cancel",
                  onClick: _cache[10] || (_cache[10] = (...args) => $options.closeEditPanel && $options.closeEditPanel(...args))
                }, "取消"),
                vue.createElementVNode("button", {
                  class: "edit-save",
                  disabled: $data.saving,
                  onClick: _cache[11] || (_cache[11] = (...args) => $options.submitEdit && $options.submitEdit(...args))
                }, " 保存 ", 8, ["disabled"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminUserManage = /* @__PURE__ */ _export_sfc(_sfc_main$l, [["render", _sfc_render$k], ["__scopeId", "data-v-aff5800b"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/user-manage.vue"]]);
  const _sfc_main$k = {
    components: { adminSidebar },
    data() {
      return {
        showSidebar: false,
        noticeList: [],
        loading: false,
        currentPage: 1,
        pageSize: 10,
        total: 0,
        selectAll: false,
        // 筛选条件
        filters: {
          title: "",
          publishStatus: "",
          topFlag: ""
        },
        // 批量选择
        selectedIds: [],
        // 选项数据
        statusOptions: [
          { label: "全部状态", value: "" },
          { label: "已发布", value: "PUBLISHED" },
          { label: "草稿", value: "DRAFT" },
          { label: "已下架", value: "OFFLINE" }
          // 假设有OFFLINE状态，或者未发布即DRAFT
        ],
        topOptions: [
          { label: "全部置顶", value: "" },
          { label: "置顶", value: "true" },
          { label: "不置顶", value: "false" }
        ]
      };
    },
    computed: {
      totalPage() {
        return Math.ceil(this.total / this.pageSize) || 1;
      },
      isAllSelected() {
        return this.noticeList.length > 0 && this.selectedIds.length === this.noticeList.length;
      }
    },
    onLoad() {
      this.checkAdminRole();
    },
    onShow() {
      this.loadNoticeList();
    },
    methods: {
      checkAdminRole() {
        const userInfo = uni.getStorageSync("userInfo");
        if (!userInfo || userInfo.role !== "admin" && userInfo.role !== "super_admin") {
          uni.showToast({ title: "无权限访问", icon: "none" });
          uni.redirectTo({ url: "/owner/pages/login/login" });
        }
      },
      // 加载列表（使用新接口）
      async loadNoticeList() {
        this.loading = true;
        this.selectedIds = [];
        try {
          const params = {
            pageNum: this.currentPage,
            pageSize: this.pageSize,
            // 优先置顶，其次按发布时间
            orderByColumn: "top_flag desc, publish_time",
            isAsc: "desc",
            ...this.filters
          };
          Object.keys(params).forEach((key) => {
            if (params[key] === "" || params[key] === null)
              delete params[key];
          });
          const res = await request(
            "/api/notice/admin/list",
            { params },
            "GET"
          );
          this.noticeList = res.records || [];
          this.total = res.total || 0;
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:274", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      // 搜索处理
      handleSearch() {
        this.currentPage = 1;
        this.loadNoticeList();
      },
      handleStatusChange(e) {
        this.filters.publishStatus = this.statusOptions[e.detail.value].value;
        this.handleSearch();
      },
      handleTopChange(e) {
        this.filters.topFlag = this.topOptions[e.detail.value].value;
        this.handleSearch();
      },
      getStatusLabel(val) {
        const opt = this.statusOptions.find((o) => o.value === val);
        return opt ? opt.label : "";
      },
      getTopLabel(val) {
        const opt = this.topOptions.find((o) => o.value === val);
        return opt ? opt.label : "";
      },
      getStatusText(status) {
        const map = {
          "PUBLISHED": "已发布",
          "DRAFT": "草稿",
          "OFFLINE": "已下架"
        };
        return map[status] || status;
      },
      // 页面跳转
      handleAddNotice() {
        uni.navigateTo({ url: "/admin/pages/admin/notice-edit" });
      },
      handleEditNotice(id) {
        uni.navigateTo({
          url: `/admin/pages/admin/notice-edit?noticeId=${id}`
        });
      },
      // 单个操作：发布
      async handlePublish(id) {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          formatAppLog("log", "at admin/pages/admin/notice-manage.vue:331", "准备发布公告", { id, adminId: userInfo && userInfo.id });
          await request(
            `/api/notice/${id}/publish`,
            { params: { adminId: userInfo.id } },
            "PUT"
          );
          formatAppLog("log", "at admin/pages/admin/notice-manage.vue:337", "发布成功", { id });
          uni.showToast({ title: "发布成功" });
          this.loadNoticeList();
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:341", "发布失败详情", e && e.message ? e.message : e, e && e.stack ? e.stack : "");
          uni.showToast({ title: "发布失败", icon: "none" });
        }
      },
      // 单个操作：下架
      async handleOffline(id) {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          formatAppLog("log", "at admin/pages/admin/notice-manage.vue:350", "准备下架公告", { id, adminId: userInfo && userInfo.id });
          await request(
            `/api/notice/${id}/offline`,
            { params: { adminId: userInfo.id } },
            "PUT"
          );
          formatAppLog("log", "at admin/pages/admin/notice-manage.vue:356", "下架成功", { id });
          uni.showToast({ title: "下架成功" });
          this.loadNoticeList();
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:360", "下架失败详情", e && e.message ? e.message : e, e && e.stack ? e.stack : "");
          uni.showToast({ title: "下架失败", icon: "none" });
        }
      },
      // 单个操作：删除
      async handleDeleteNotice(id) {
        const userInfo = uni.getStorageSync("userInfo");
        uni.showModal({
          title: "确认删除",
          content: "确定要删除这条公告吗？",
          success: async (res) => {
            if (res.confirm) {
              try {
                await request(
                  `/api/notice/${id}`,
                  { params: { adminId: userInfo.id } },
                  "DELETE"
                );
                uni.showToast({ title: "删除成功" });
                this.loadNoticeList();
              } catch (e) {
                uni.showToast({ title: "删除失败", icon: "none" });
              }
            }
          }
        });
      },
      // 批量操作：删除
      async handleBatchDelete() {
        if (!this.selectedIds.length)
          return;
        const userInfo = uni.getStorageSync("userInfo");
        uni.showModal({
          title: "批量删除",
          content: `确定要删除选中的 ${this.selectedIds.length} 条公告吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                await request(
                  "/api/notice/batch/delete",
                  {
                    data: { noticeIds: this.selectedIds },
                    params: { adminId: userInfo.id }
                  },
                  "POST"
                );
                uni.showToast({ title: "批量删除成功" });
                this.loadNoticeList();
              } catch (e) {
                uni.showToast({ title: "批量删除失败", icon: "none" });
              }
            }
          }
        });
      },
      // 批量操作：下架
      async handleBatchOffline() {
        if (!this.selectedIds.length)
          return;
        const userInfo = uni.getStorageSync("userInfo");
        uni.showModal({
          title: "批量下架",
          content: `确定要下架选中的 ${this.selectedIds.length} 条公告吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                await request(
                  "/api/notice/batch/offline",
                  {
                    data: { noticeIds: this.selectedIds },
                    params: { adminId: userInfo.id }
                  },
                  "POST"
                );
                uni.showToast({ title: "批量下架成功" });
                this.loadNoticeList();
              } catch (e) {
                uni.showToast({ title: "批量下架失败", icon: "none" });
              }
            }
          }
        });
      },
      // 查看统计
      async handleReadStat(id) {
        try {
          const res = await request(
            `/api/notice/${id}/read-stat`,
            {},
            "GET"
          );
          const content = `阅读量：${res.readCount || 0}
点赞数：${res.likeCount || 0}
收藏数：${res.collectCount || 0}`;
          uni.showModal({
            title: "公告数据统计",
            content,
            showCancel: false
          });
        } catch (e) {
          uni.showToast({ title: "获取统计失败", icon: "none" });
        }
      },
      // 选择相关
      toggleSelect(id) {
        const index = this.selectedIds.indexOf(id);
        if (index > -1) {
          this.selectedIds.splice(index, 1);
        } else {
          this.selectedIds.push(id);
        }
        this.selectedIds = [...this.selectedIds];
      },
      toggleSelectAll() {
        if (this.isAllSelected) {
          this.selectedIds = [];
        } else {
          this.selectedIds = this.noticeList.map((item) => item.id);
        }
      },
      // 参考 repair-manage 的全选逻辑，确保视图更新
      testSelectAll() {
        const shouldSelectAll = !this.selectAll;
        this.selectAll = shouldSelectAll;
        if (shouldSelectAll) {
          this.selectedIds = [...this.noticeList.map((item) => item.id)];
        } else {
          this.selectedIds = [];
        }
        this.$forceUpdate();
        setTimeout(() => {
          this.selectedIds = [...this.selectedIds];
        }, 10);
      },
      prevPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadNoticeList();
        }
      },
      nextPage() {
        if (this.currentPage < this.totalPage) {
          this.currentPage++;
          this.loadNoticeList();
        }
      }
    }
  };
  function _sfc_render$j(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[12] || (_cache[12] = ($event) => $data.showSidebar = $event),
      pageTitle: "公告管理",
      currentPage: "/admin/pages/admin/notice-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createCommentVNode(" 筛选栏 "),
          vue.createElementVNode("view", { class: "filter-bar" }, [
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                class: "search-input",
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.filters.title = $event),
                placeholder: "搜索标题",
                "confirm-type": "search",
                onConfirm: _cache[1] || (_cache[1] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              },
              null,
              544
              /* NEED_HYDRATION, NEED_PATCH */
            ), [
              [vue.vModelText, $data.filters.title]
            ]),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.statusOptions,
              "range-key": "label",
              onChange: _cache[2] || (_cache[2] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
            }, [
              vue.createElementVNode("view", { class: "picker-item" }, [
                vue.createTextVNode(
                  vue.toDisplayString($options.getStatusLabel($data.filters.publishStatus) || "全部状态") + " ",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "icon" }, "▼")
              ])
            ], 40, ["range"]),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.topOptions,
              "range-key": "label",
              onChange: _cache[3] || (_cache[3] = (...args) => $options.handleTopChange && $options.handleTopChange(...args))
            }, [
              vue.createElementVNode("view", { class: "picker-item" }, [
                vue.createTextVNode(
                  vue.toDisplayString($options.getTopLabel($data.filters.topFlag) || "全部置顶") + " ",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "icon" }, "▼")
              ])
            ], 40, ["range"]),
            vue.createElementVNode("button", {
              class: "search-btn",
              onClick: _cache[4] || (_cache[4] = (...args) => $options.handleSearch && $options.handleSearch(...args))
            }, "搜索")
          ]),
          vue.createCommentVNode(" 工具栏 "),
          vue.createElementVNode("view", { class: "tool-bar" }, [
            vue.createElementVNode("view", { class: "tool-left" }, [
              vue.createCommentVNode(" 全选 (仅列表有数据时显示) "),
              $data.noticeList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "check-wrap",
                onClick: _cache[6] || (_cache[6] = (...args) => $options.testSelectAll && $options.testSelectAll(...args))
              }, [
                vue.createElementVNode("checkbox", {
                  checked: $options.isAllSelected,
                  color: "#2D81FF",
                  style: { "transform": "scale(0.8)" },
                  onClick: _cache[5] || (_cache[5] = vue.withModifiers((...args) => $options.testSelectAll && $options.testSelectAll(...args), ["stop"]))
                }, null, 8, ["checked"]),
                vue.createElementVNode("text", { class: "check-text" }, "全选")
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 选中统计 "),
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 1,
                  class: "selected-hint"
                },
                " 已选 " + vue.toDisplayString($data.selectedIds.length),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createCommentVNode(" 批量操作 (仅选中时显示) "),
            $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "tool-actions"
            }, [
              vue.createElementVNode("view", {
                class: "action-item delete",
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handleBatchDelete && $options.handleBatchDelete(...args))
              }, [
                vue.createElementVNode("text", null, "删除")
              ]),
              vue.createElementVNode("view", {
                class: "action-item offline",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleBatchOffline && $options.handleBatchOffline(...args))
              }, [
                vue.createElementVNode("text", null, "下架")
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 发布按钮 "),
            vue.createElementVNode("view", { class: "tool-right" }, [
              vue.createElementVNode("button", {
                class: "create-btn",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleAddNotice && $options.handleAddNotice(...args))
              }, "发布公告")
            ])
          ]),
          vue.createCommentVNode(" 加载 "),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : $data.noticeList.length ? (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 1 },
            [
              vue.createCommentVNode(" 列表 "),
              vue.createElementVNode("view", { class: "notice-list" }, [
                vue.createElementVNode("view", { class: "list-header" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "total-count" },
                    "共 " + vue.toDisplayString($data.total) + " 条公告",
                    1
                    /* TEXT */
                  )
                ]),
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.noticeList, (notice) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: notice.id,
                      class: "notice-item"
                    }, [
                      vue.createElementVNode("view", { class: "notice-header" }, [
                        vue.createElementVNode("view", {
                          class: "header-left",
                          onClick: ($event) => $options.toggleSelect(notice.id)
                        }, [
                          vue.createElementVNode("checkbox", {
                            checked: $data.selectedIds.includes(notice.id),
                            color: "#2D81FF",
                            style: { "transform": "scale(0.8)" },
                            onClick: vue.withModifiers(($event) => $options.toggleSelect(notice.id), ["stop"])
                          }, null, 8, ["checked", "onClick"])
                        ], 8, ["onClick"]),
                        vue.createElementVNode("view", { class: "tags" }, [
                          notice.topFlag ? (vue.openBlock(), vue.createElementBlock("text", {
                            key: 0,
                            class: "tag top"
                          }, "置顶")) : vue.createCommentVNode("v-if", true),
                          vue.createElementVNode(
                            "text",
                            {
                              class: vue.normalizeClass(["tag status", notice.publishStatus.toLowerCase()])
                            },
                            vue.toDisplayString($options.getStatusText(notice.publishStatus)),
                            3
                            /* TEXT, CLASS */
                          )
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "notice-info" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "notice-title" },
                          vue.toDisplayString(notice.title),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "notice-content" },
                          vue.toDisplayString(notice.content),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("view", { class: "meta-row" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "notice-time" },
                            "发布于: " + vue.toDisplayString(notice.publishTime || "未发布"),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("text", {
                            class: "read-count",
                            onClick: ($event) => $options.handleReadStat(notice.id)
                          }, "查看数据 📊", 8, ["onClick"])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "notice-actions" }, [
                        vue.createElementVNode("button", {
                          class: "action-btn edit",
                          onClick: ($event) => $options.handleEditNotice(notice.id)
                        }, "编辑", 8, ["onClick"]),
                        notice.publishStatus !== "PUBLISHED" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "action-btn publish",
                          onClick: ($event) => $options.handlePublish(notice.id)
                        }, " 发布 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                        notice.publishStatus === "PUBLISHED" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 1,
                          class: "action-btn offline",
                          onClick: ($event) => $options.handleOffline(notice.id)
                        }, " 下架 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                        vue.createElementVNode("button", {
                          class: "action-btn delete",
                          onClick: ($event) => $options.handleDeleteNotice(notice.id)
                        }, "删除", 8, ["onClick"])
                      ])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          )) : (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 2 },
            [
              vue.createCommentVNode(" 空 "),
              vue.createElementVNode("view", { class: "empty-state" }, [
                vue.createElementVNode("text", null, "暂无公告数据")
              ])
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          )),
          vue.createCommentVNode(" 分页 "),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "pagination-container"
          }, [
            vue.createElementVNode(
              "text",
              { class: "page-info" },
              "共 " + vue.toDisplayString($data.total) + " 条，当前第 " + vue.toDisplayString($data.currentPage) + "/" + vue.toDisplayString($options.totalPage) + " 页",
              1
              /* TEXT */
            ),
            vue.createElementVNode("view", { class: "pagination-btns" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[10] || (_cache[10] = (...args) => $options.prevPage && $options.prevPage(...args))
              }, " 上一页 ", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPage,
                onClick: _cache[11] || (_cache[11] = (...args) => $options.nextPage && $options.nextPage(...args))
              }, " 下一页 ", 8, ["disabled"])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminNoticeManage = /* @__PURE__ */ _export_sfc(_sfc_main$k, [["render", _sfc_render$j], ["__scopeId", "data-v-e729d483"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/notice-manage.vue"]]);
  const _sfc_main$j = {
    components: {
      adminSidebar
    },
    data() {
      return {
        parkingList: [],
        showSidebar: false,
        loading: false,
        currentPage: 1,
        pageSize: 10,
        total: 0,
        currentTab: "order",
        queryParams: {
          plateNo: "",
          status: ""
        },
        statusOptions: [
          { label: "全部状态", value: "" },
          { label: "待支付", value: "UNPAID" },
          { label: "已支付", value: "PAID" },
          { label: "已取消", value: "CANCELLED" }
        ],
        // 车位数据
        spaceList: [],
        spacePageNum: 1,
        spacePageSize: 10,
        spaceTotal: 0,
        spaceStats: {
          total: 0,
          available: 0,
          occupied: 0,
          reserved: 0,
          disabled: 0
        },
        spaceQueryParams: {
          spaceNo: "",
          status: ""
        },
        spaceStatusOptions: [
          { label: "全部状态", value: "" },
          { label: "空闲可用", value: "AVAILABLE" },
          { label: "已占用", value: "OCCUPIED" },
          { label: "已预订", value: "RESERVED" },
          { label: "已禁用", value: "DISABLED" }
        ],
        showLeaseDialog: false,
        leaseDialogSpace: null,
        leaseForm: {
          userId: "",
          plateNo: "",
          leaseType: "MONTHLY",
          durationMonths: 1,
          payChannel: "CASH",
          remark: ""
        },
        leaseTypeOptions: [
          { label: "月卡", value: "MONTHLY" },
          { label: "年卡", value: "YEARLY" },
          { label: "永久", value: "PERPETUAL" }
        ],
        payChannelOptions: [
          { label: "现金", value: "CASH" },
          { label: "微信", value: "WECHAT" },
          { label: "支付宝", value: "ALIPAY" },
          { label: "余额", value: "BALANCE" }
        ]
      };
    },
    onLoad() {
      this.checkAdminRole();
      this.loadParkingList();
    },
    onShow() {
      this.loadParkingList();
    },
    methods: {
      checkAdminRole() {
        const userInfo = uni.getStorageSync("userInfo");
        if (!userInfo || userInfo.role !== "admin" && userInfo.role !== "super_admin") {
          uni.showToast({ title: "无权限访问", icon: "none" });
          uni.redirectTo({ url: "/owner/pages/login/login" });
          return;
        }
      },
      switchTab(tab) {
        if (this.currentTab === tab)
          return;
        this.currentTab = tab;
        if (tab === "order") {
          if (this.parkingList.length === 0) {
            this.loadParkingList();
          }
        } else if (tab === "space") {
          this.spacePageNum = 1;
          this.loadSpaceList();
        }
      },
      // 跳转车辆审核页面
      goCarAudit() {
        uni.navigateTo({
          url: "/admin/pages/admin/car-audit"
        });
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadParkingList();
      },
      handleStatusChange(e) {
        const index = e.detail.value;
        this.queryParams.status = this.statusOptions[index].value;
        this.handleSearch();
      },
      async loadParkingList() {
        this.loading = true;
        try {
          const params = {
            pageNum: this.currentPage,
            pageSize: this.pageSize
          };
          if (this.queryParams.plateNo)
            params.plateNo = this.queryParams.plateNo;
          if (this.queryParams.status)
            params.status = this.queryParams.status;
          const res = await request("/api/parking/order/admin/list", {
            params
          }, "GET");
          const records = Array.isArray(res && res.records) ? res.records : [];
          const statusFilter = (this.queryParams.status || "").toString().toUpperCase();
          const filteredRecords = statusFilter ? records.filter((item) => {
            const val = (item.status || "").toString().toUpperCase();
            if (statusFilter === "CANCELLED")
              return val === "CANCELLED" || val === "CANCEL";
            return val === statusFilter;
          }) : records;
          const backendTotal = typeof (res && res.total) === "number" ? res.total : 0;
          const backendPageNum = Number(res && res.pageNum ? res.pageNum : this.currentPage);
          const backendPageSize = Number(res && res.pageSize ? res.pageSize : this.pageSize);
          const shouldSlice = filteredRecords.length > backendPageSize && (backendTotal === 0 || backendTotal === filteredRecords.length);
          const effectivePageNum = shouldSlice ? this.currentPage : backendPageNum;
          const effectivePageSize = shouldSlice ? this.pageSize : backendPageSize;
          this.total = backendTotal > 0 ? backendTotal : filteredRecords.length;
          if (!shouldSlice) {
            this.currentPage = backendPageNum;
            this.pageSize = backendPageSize;
          }
          const pagedRecords = shouldSlice ? filteredRecords.slice((effectivePageNum - 1) * effectivePageSize, effectivePageNum * effectivePageSize) : filteredRecords;
          this.parkingList = pagedRecords.map((item) => ({
            orderId: item.orderId,
            orderNo: item.orderNo,
            plateNo: item.plateNo,
            spaceNo: item.spaceNo,
            ownerName: item.ownerName,
            amount: item.amount,
            status: item.status,
            orderType: item.orderType,
            startTime: item.startTime,
            endTime: item.endTime,
            payTime: item.payTime,
            payChannel: item.payChannel
          }));
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:512", "加载停车列表失败:", err);
          uni.showToast({
            title: (err == null ? void 0 : err.message) || "加载失败",
            icon: "none"
          });
        } finally {
          this.loading = false;
        }
      },
      async handleRenew(orderId) {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          if (!userInfo || !userInfo.id) {
            uni.showToast({ title: "请先登录", icon: "none" });
            return;
          }
          uni.showLoading({ title: "处理中..." });
          await request(`/api/parking/order/${orderId}/pay`, {
            data: {
              userId: userInfo.id,
              payChannel: "WECHAT",
              payRemark: "管理员端支付"
            }
          }, "PUT");
          uni.showToast({ title: "支付成功", icon: "success" });
          this.loadParkingList();
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:543", "支付失败:", err);
          uni.showToast({
            title: (err == null ? void 0 : err.message) || "支付失败",
            icon: "none"
          });
        } finally {
          uni.hideLoading();
        }
      },
      getStatusClass(status) {
        const val = (status || "").toString().toUpperCase();
        return {
          "status-active": val === "PAID" || val === "SUCCESS" || val === "ACTIVE",
          "status-expired": val === "UNPAID" || val === "WAITING_PAY" || val === "EXPIRED"
        };
      },
      getStatusText(status) {
        const val = (status || "").toString().toUpperCase();
        const statusMap = {
          "UNPAID": "待支付",
          "WAITING_PAY": "待支付",
          "PAID": "已支付",
          "SUCCESS": "已支付",
          "ACTIVE": "正常",
          "EXPIRED": "已过期",
          "CANCELLED": "已取消",
          "CANCEL": "已取消"
        };
        return statusMap[val] || status || "";
      },
      isUnpaid(status) {
        const val = (status || "").toString().toUpperCase();
        return val === "UNPAID" || val === "WAITING_PAY";
      },
      formatPayChannel(channel) {
        const val = (channel || "").toString().toUpperCase();
        if (val === "WECHAT")
          return "微信";
        if (val === "ALIPAY")
          return "支付宝";
        if (val === "CASH")
          return "现金";
        return channel || "-";
      },
      formatTime(time) {
        if (!time)
          return "";
        return new Date(time).toLocaleString();
      },
      getStatusLabel(value) {
        const option = this.statusOptions && this.statusOptions.find((opt) => opt.value === value);
        return option ? option.label : "";
      },
      // --- 车位管理相关方法 ---
      handleSpaceSearch() {
        this.spacePageNum = 1;
        this.loadSpaceList();
      },
      handleSpaceStatusChange(e) {
        const index = e.detail.value;
        this.spaceQueryParams.status = this.spaceStatusOptions[index].value;
        this.handleSpaceSearch();
      },
      getSpaceStatusLabel(value) {
        const option = this.spaceStatusOptions.find((opt) => opt.value === value);
        return option ? option.label : "";
      },
      getLeaseTypeLabel(value) {
        const option = this.leaseTypeOptions.find((opt) => opt.value === value);
        return option ? option.label : "请选择类型";
      },
      getPayChannelLabel(value) {
        const option = this.payChannelOptions.find((opt) => opt.value === value);
        return option ? option.label : "请选择支付方式";
      },
      isSpaceReservable(space) {
        const val = (space && space.status ? space.status : "").toString().toUpperCase();
        return val === "AVAILABLE" || val === "FREE";
      },
      isSpaceNearExpire(time) {
        if (!time)
          return false;
        const expire = new Date(time).getTime();
        if (!expire || Number.isNaN(expire))
          return false;
        const now = Date.now();
        const diff = expire - now;
        const sevenDays = 7 * 24 * 60 * 60 * 1e3;
        return diff > 0 && diff <= sevenDays;
      },
      getSpaceStatusText(status) {
        const val = (status || "").toString().toUpperCase();
        const statusMap = {
          "AVAILABLE": "空闲可用",
          "FREE": "空闲可用",
          "OCCUPIED": "已占用",
          "RESERVED": "已预订",
          "DISABLED": "已禁用"
        };
        return statusMap[val] || status || "";
      },
      getSpaceStatusClass(status) {
        const val = (status || "").toString().toUpperCase();
        if (val === "AVAILABLE" || val === "FREE") {
          return "status-available";
        }
        if (val === "OCCUPIED") {
          return "status-occupied";
        }
        if (val === "RESERVED") {
          return "status-reserved";
        }
        if (val === "DISABLED") {
          return "status-disabled";
        }
        return "";
      },
      async loadSpaceList() {
        this.loading = true;
        try {
          const params = {
            pageNum: this.spacePageNum,
            pageSize: this.spacePageSize
          };
          if (this.spaceQueryParams.spaceNo)
            params.spaceNo = this.spaceQueryParams.spaceNo;
          if (this.spaceQueryParams.status)
            params.status = this.spaceQueryParams.status;
          const res = await request("/api/parking/space/admin/list", {
            params
          }, "GET");
          const records = Array.isArray(res && res.records) ? res.records : [];
          const spaceStatusFilter = (this.spaceQueryParams.status || "").toString().toUpperCase();
          const filteredRecords = spaceStatusFilter ? records.filter((item) => {
            const val = (item.status || "").toString().toUpperCase();
            if (spaceStatusFilter === "AVAILABLE") {
              return val === "AVAILABLE" || val === "FREE";
            }
            return val === spaceStatusFilter;
          }) : records;
          const backendTotal = typeof (res && res.total) === "number" ? res.total : 0;
          const backendPageNum = Number(res && res.pageNum ? res.pageNum : this.spacePageNum);
          const backendPageSize = Number(res && res.pageSize ? res.pageSize : this.spacePageSize);
          const shouldSlice = filteredRecords.length > backendPageSize && (backendTotal === 0 || backendTotal === filteredRecords.length);
          const effectivePageNum = shouldSlice ? this.spacePageNum : backendPageNum;
          const effectivePageSize = shouldSlice ? this.spacePageSize : backendPageSize;
          this.spaceTotal = backendTotal > 0 ? backendTotal : filteredRecords.length;
          if (!shouldSlice) {
            this.spacePageNum = backendPageNum;
            this.spacePageSize = backendPageSize;
          }
          const uniqueRecords = [];
          const spaceIds = /* @__PURE__ */ new Set();
          filteredRecords.forEach((item) => {
            if (!spaceIds.has(item.id)) {
              spaceIds.add(item.id);
              uniqueRecords.push(item);
            }
          });
          const finalList = shouldSlice ? uniqueRecords.slice((effectivePageNum - 1) * effectivePageSize, effectivePageNum * effectivePageSize) : uniqueRecords;
          this.spaceList = finalList;
          const stats = {
            total: uniqueRecords.length,
            available: 0,
            occupied: 0,
            reserved: 0,
            disabled: 0
          };
          uniqueRecords.forEach((item) => {
            const val = (item.status || "").toString().toUpperCase();
            if (val === "AVAILABLE" || val === "FREE")
              stats.available += 1;
            else if (val === "OCCUPIED")
              stats.occupied += 1;
            else if (val === "RESERVED")
              stats.reserved += 1;
            else if (val === "DISABLED")
              stats.disabled += 1;
          });
          this.spaceStats = stats;
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:739", "加载车位列表失败:", err);
        } finally {
          this.loading = false;
        }
      },
      async handleReserve(space) {
        if (!space || !space.id) {
          uni.showToast({ title: "车位信息不存在", icon: "none" });
          return;
        }
        uni.showModal({
          title: "预订车位",
          editable: true,
          placeholderText: "请输入用户ID",
          success: async (res) => {
            if (!res.confirm || !res.content)
              return;
            const userId = res.content;
            try {
              uni.showLoading({ title: "提交中..." });
              const reserveTime = (/* @__PURE__ */ new Date()).toISOString();
              await request("/api/parking/reserve", {
                data: {
                  userId,
                  spaceId: space.id,
                  reserveTime
                }
              }, "POST");
              uni.showToast({ title: "预订成功", icon: "success" });
              this.loadSpaceList();
            } catch (e) {
              formatAppLog("error", "at admin/pages/admin/parking-manage.vue:770", "预订失败:", e);
              uni.showToast({ title: (e == null ? void 0 : e.message) || "预订失败", icon: "none" });
            } finally {
              uni.hideLoading();
            }
          }
        });
      },
      handleOpenLease(space) {
        this.leaseDialogSpace = space;
        this.leaseForm.userId = space.userId || space.ownerId || "";
        this.leaseForm.plateNo = space.plateNo || "";
        this.leaseForm.leaseType = "MONTHLY";
        this.leaseForm.durationMonths = 1;
        this.leaseForm.payChannel = "CASH";
        this.leaseForm.remark = "";
        this.showLeaseDialog = true;
      },
      closeLeaseDialog() {
        this.showLeaseDialog = false;
      },
      handleLeaseTypeChange(e) {
        const index = e.detail.value;
        const option = this.leaseTypeOptions[index];
        if (option) {
          this.leaseForm.leaseType = option.value;
        }
      },
      handlePayChannelChange(e) {
        const index = e.detail.value;
        const option = this.payChannelOptions[index];
        if (option) {
          this.leaseForm.payChannel = option.value;
        }
      },
      async confirmLease() {
        if (!this.leaseDialogSpace || !this.leaseDialogSpace.id) {
          uni.showToast({ title: "车位信息错误", icon: "none" });
          return;
        }
        const userId = (this.leaseForm.userId || "").toString().trim();
        if (!userId) {
          uni.showToast({ title: "请输入用户ID", icon: "none" });
          return;
        }
        const plateNo = (this.leaseForm.plateNo || "").toString().trim();
        if (!plateNo) {
          uni.showToast({ title: "请输入车牌号", icon: "none" });
          return;
        }
        let duration = Number(this.leaseForm.durationMonths);
        if (!duration || duration <= 0) {
          duration = 1;
        }
        try {
          uni.showLoading({ title: "创建订单中..." });
          const orderId = await request("/api/parking/lease/order/create", {
            data: {
              userId,
              spaceId: this.leaseDialogSpace.id,
              plateNo,
              // 传递车牌号
              leaseType: this.leaseForm.leaseType,
              durationMonths: duration,
              remark: this.leaseForm.remark
            }
          }, "POST");
          await request("/api/parking/lease/order/pay", {
            data: {
              orderId,
              payChannel: this.leaseForm.payChannel,
              payRemark: this.leaseForm.remark || "管理员后台办理"
            }
          }, "POST");
          uni.showToast({ title: "办理成功", icon: "success" });
          this.showLeaseDialog = false;
          this.loadSpaceList();
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:857", "办理失败:", err);
          uni.showToast({ title: (err == null ? void 0 : err.message) || "办理失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      // -----------------------
      changePage(delta) {
        this.currentPage += delta;
        this.loadParkingList();
      },
      changeSpacePage(delta) {
        this.spacePageNum += delta;
        if (this.spacePageNum < 1)
          this.spacePageNum = 1;
        this.loadSpaceList();
      }
    }
  };
  function _sfc_render$i(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createVNode(_component_admin_sidebar, {
          showSidebar: $data.showSidebar,
          "onUpdate:showSidebar": _cache[15] || (_cache[15] = ($event) => $data.showSidebar = $event),
          pageTitle: "停车管理",
          currentPage: "/admin/pages/admin/parking-manage"
        }, {
          default: vue.withCtx(() => [
            vue.createElementVNode("view", { class: "manage-container" }, [
              vue.createCommentVNode(" 顶部标签栏 "),
              vue.createElementVNode("view", { class: "tabs" }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["tab-item", { active: $data.currentTab === "order" }]),
                    onClick: _cache[0] || (_cache[0] = ($event) => $options.switchTab("order"))
                  },
                  [
                    vue.createElementVNode("text", null, "停车订单"),
                    $data.currentTab === "order" ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 0,
                      class: "tab-line"
                    })) : vue.createCommentVNode("v-if", true)
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["tab-item", { active: $data.currentTab === "space" }]),
                    onClick: _cache[1] || (_cache[1] = ($event) => $options.switchTab("space"))
                  },
                  [
                    vue.createElementVNode("text", null, "车位管理"),
                    $data.currentTab === "space" ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 0,
                      class: "tab-line"
                    })) : vue.createCommentVNode("v-if", true)
                  ],
                  2
                  /* CLASS */
                ),
                vue.createCommentVNode(" 新增车辆审核入口 "),
                vue.createElementVNode("view", {
                  class: "tab-item",
                  onClick: _cache[2] || (_cache[2] = (...args) => $options.goCarAudit && $options.goCarAudit(...args))
                }, [
                  vue.createElementVNode("text", null, "车辆审核")
                ])
              ]),
              vue.createCommentVNode(" 停车订单列表 "),
              $data.currentTab === "order" ? (vue.openBlock(), vue.createElementBlock("view", { key: 0 }, [
                vue.createCommentVNode(" 搜索筛选区 "),
                vue.createElementVNode("view", { class: "filter-section" }, [
                  vue.createElementVNode("view", { class: "filter-row" }, [
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        class: "search-input",
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.queryParams.plateNo = $event),
                        placeholder: "请输入车牌号",
                        "confirm-type": "search",
                        onConfirm: _cache[4] || (_cache[4] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                      },
                      null,
                      544
                      /* NEED_HYDRATION, NEED_PATCH */
                    ), [
                      [vue.vModelText, $data.queryParams.plateNo]
                    ]),
                    vue.createElementVNode("picker", {
                      class: "status-picker",
                      mode: "selector",
                      range: $data.statusOptions,
                      "range-key": "label",
                      onChange: _cache[5] || (_cache[5] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "picker-value" }, [
                        vue.createTextVNode(
                          vue.toDisplayString($options.getStatusLabel($data.queryParams.status) || "全部状态") + " ",
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("text", { class: "iconfont" }, "▼")
                      ])
                    ], 40, ["range"])
                  ]),
                  vue.createElementVNode("button", {
                    class: "search-btn",
                    onClick: _cache[6] || (_cache[6] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  }, "查询")
                ]),
                vue.createCommentVNode(" 统计卡片 "),
                vue.createElementVNode("view", { class: "stats-card" }, [
                  vue.createElementVNode("view", { class: "stat-item" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "stat-num" },
                      vue.toDisplayString($data.total),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "stat-label" }, "总订单数")
                  ]),
                  vue.createCommentVNode(" 可以根据API返回添加更多统计 ")
                ]),
                vue.createElementVNode("view", { class: "parking-list" }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList($data.parkingList, (parking) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: parking.orderId,
                        class: "parking-item"
                      }, [
                        vue.createElementVNode("view", { class: "parking-info" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "parking-number" },
                            "订单号：" + vue.toDisplayString(parking.orderNo),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "car-number" },
                            "车牌号：" + vue.toDisplayString(parking.plateNo || "-"),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "owner-name" },
                            " 车位号：" + vue.toDisplayString(parking.spaceNo || "-") + " 业主：" + vue.toDisplayString(parking.ownerName || "-"),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "owner-name" },
                            " 类型：" + vue.toDisplayString(parking.orderType === "TEMP" ? "临时停车" : "固定车位") + "，金额：" + vue.toDisplayString(parking.amount) + " 元 ",
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            {
                              class: vue.normalizeClass(["status", $options.getStatusClass(parking.status)])
                            },
                            vue.toDisplayString($options.getStatusText(parking.status)),
                            3
                            /* TEXT, CLASS */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "expire-time" },
                            " 时段：" + vue.toDisplayString($options.formatTime(parking.startTime)) + " ~ " + vue.toDisplayString($options.formatTime(parking.endTime)),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("text", { class: "expire-time" }, [
                            vue.createTextVNode(
                              " 支付方式：" + vue.toDisplayString($options.formatPayChannel(parking.payChannel)) + " ",
                              1
                              /* TEXT */
                            ),
                            parking.payTime ? (vue.openBlock(), vue.createElementBlock(
                              "text",
                              { key: 0 },
                              "，支付时间：" + vue.toDisplayString($options.formatTime(parking.payTime)),
                              1
                              /* TEXT */
                            )) : vue.createCommentVNode("v-if", true)
                          ])
                        ]),
                        $options.isUnpaid(parking.status) ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "renew-btn",
                          onClick: ($event) => $options.handleRenew(parking.orderId)
                        }, " 去支付 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                vue.createCommentVNode(" 空状态 "),
                $data.parkingList.length === 0 && !$data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "empty-state"
                }, [
                  vue.createElementVNode("text", null, "暂无停车记录")
                ])) : vue.createCommentVNode("v-if", true),
                vue.createCommentVNode(" 分页控制 "),
                $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "pagination"
                }, [
                  vue.createElementVNode("button", {
                    class: "page-btn",
                    disabled: $data.currentPage <= 1,
                    onClick: _cache[7] || (_cache[7] = ($event) => $options.changePage(-1))
                  }, "上一页", 8, ["disabled"]),
                  vue.createElementVNode(
                    "text",
                    { class: "page-info" },
                    vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString(Math.ceil($data.total / $data.pageSize) || 1),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("button", {
                    class: "page-btn",
                    disabled: $data.currentPage >= Math.ceil($data.total / $data.pageSize),
                    onClick: _cache[8] || (_cache[8] = ($event) => $options.changePage(1))
                  }, "下一页", 8, ["disabled"])
                ])) : vue.createCommentVNode("v-if", true)
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 车位管理列表 "),
              $data.currentTab === "space" ? (vue.openBlock(), vue.createElementBlock("view", { key: 1 }, [
                vue.createElementVNode("view", { class: "stats-card" }, [
                  vue.createElementVNode("view", { class: "stat-item" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "stat-num" },
                      vue.toDisplayString($data.spaceStats.total),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "stat-label" }, "总车位数")
                  ]),
                  vue.createElementVNode("view", { class: "stat-item" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "stat-num" },
                      vue.toDisplayString($data.spaceStats.available),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "stat-label" }, "空闲可用")
                  ]),
                  vue.createElementVNode("view", { class: "stat-item" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "stat-num" },
                      vue.toDisplayString($data.spaceStats.occupied),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "stat-label" }, "已占用")
                  ]),
                  vue.createElementVNode("view", { class: "stat-item" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "stat-num" },
                      vue.toDisplayString($data.spaceStats.reserved),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "stat-label" }, "已预订")
                  ]),
                  vue.createElementVNode("view", { class: "stat-item" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "stat-num" },
                      vue.toDisplayString($data.spaceStats.disabled),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "stat-label" }, "已禁用")
                  ])
                ]),
                vue.createCommentVNode(" 车位筛选 "),
                vue.createElementVNode("view", { class: "filter-section" }, [
                  vue.createElementVNode("view", { class: "filter-row" }, [
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        class: "search-input",
                        "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $data.spaceQueryParams.spaceNo = $event),
                        placeholder: "请输入车位号",
                        "confirm-type": "search",
                        onConfirm: _cache[10] || (_cache[10] = (...args) => $options.handleSpaceSearch && $options.handleSpaceSearch(...args))
                      },
                      null,
                      544
                      /* NEED_HYDRATION, NEED_PATCH */
                    ), [
                      [vue.vModelText, $data.spaceQueryParams.spaceNo]
                    ]),
                    vue.createElementVNode("picker", {
                      class: "status-picker",
                      mode: "selector",
                      range: $data.spaceStatusOptions,
                      "range-key": "label",
                      onChange: _cache[11] || (_cache[11] = (...args) => $options.handleSpaceStatusChange && $options.handleSpaceStatusChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "picker-value" }, [
                        vue.createTextVNode(
                          vue.toDisplayString($options.getSpaceStatusLabel($data.spaceQueryParams.status) || "全部状态") + " ",
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("text", { class: "iconfont" }, "▼")
                      ])
                    ], 40, ["range"])
                  ]),
                  vue.createElementVNode("button", {
                    class: "search-btn",
                    onClick: _cache[12] || (_cache[12] = (...args) => $options.handleSpaceSearch && $options.handleSpaceSearch(...args))
                  }, "查询")
                ]),
                vue.createElementVNode("view", { class: "parking-list" }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList($data.spaceList, (space, index) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: space.id ? `${space.id}-${index}` : index,
                        class: "parking-item"
                      }, [
                        vue.createElementVNode("view", { class: "parking-info" }, [
                          vue.createElementVNode("view", { class: "parking-number" }, [
                            vue.createElementVNode(
                              "text",
                              null,
                              vue.toDisplayString(space.spaceNo),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "text",
                              {
                                class: vue.normalizeClass(["status", $options.getSpaceStatusClass(space.status)])
                              },
                              vue.toDisplayString($options.getSpaceStatusText(space.status)),
                              3
                              /* TEXT, CLASS */
                            )
                          ]),
                          space.ownerName ? (vue.openBlock(), vue.createElementBlock(
                            "view",
                            {
                              key: 0,
                              class: "car-number"
                            },
                            " 业主：" + vue.toDisplayString(space.ownerName) + " (" + vue.toDisplayString(space.plateNo || "无车牌") + ") ",
                            1
                            /* TEXT */
                          )) : (vue.openBlock(), vue.createElementBlock("view", {
                            key: 1,
                            class: "owner-name"
                          }, " 暂无业主信息 ")),
                          space.expireTime ? (vue.openBlock(), vue.createElementBlock("view", {
                            key: 2,
                            class: "expire-time"
                          }, [
                            vue.createTextVNode(
                              " 到期：" + vue.toDisplayString($options.formatTime(space.expireTime)) + " ",
                              1
                              /* TEXT */
                            ),
                            $options.isSpaceNearExpire(space.expireTime) ? (vue.openBlock(), vue.createElementBlock("text", {
                              key: 0,
                              class: "expire-badge"
                            }, " 即将到期 ")) : vue.createCommentVNode("v-if", true)
                          ])) : vue.createCommentVNode("v-if", true)
                        ]),
                        vue.createElementVNode("button", {
                          class: "renew-btn",
                          onClick: ($event) => $options.handleOpenLease(space)
                        }, " 办理月卡 ", 8, ["onClick"]),
                        $options.isSpaceReservable(space) ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "renew-btn",
                          onClick: ($event) => $options.handleReserve(space)
                        }, " 预订车位 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                vue.createCommentVNode(" 车位为空状态 "),
                $data.spaceList.length === 0 && !$data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "empty-state"
                }, [
                  vue.createElementVNode("text", null, "暂无车位信息")
                ])) : vue.createCommentVNode("v-if", true),
                vue.createCommentVNode(" 车位分页 "),
                $data.spaceTotal > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "pagination"
                }, [
                  vue.createElementVNode("button", {
                    class: "page-btn",
                    disabled: $data.spacePageNum <= 1,
                    onClick: _cache[13] || (_cache[13] = ($event) => $options.changeSpacePage(-1))
                  }, "上一页", 8, ["disabled"]),
                  vue.createElementVNode(
                    "text",
                    { class: "page-info" },
                    vue.toDisplayString($data.spacePageNum) + " / " + vue.toDisplayString(Math.ceil($data.spaceTotal / $data.spacePageSize) || 1),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("button", {
                    class: "page-btn",
                    disabled: $data.spacePageNum >= Math.ceil($data.spaceTotal / $data.spacePageSize),
                    onClick: _cache[14] || (_cache[14] = ($event) => $options.changeSpacePage(1))
                  }, "下一页", 8, ["disabled"])
                ])) : vue.createCommentVNode("v-if", true)
              ])) : vue.createCommentVNode("v-if", true)
            ])
          ]),
          _: 1
          /* STABLE */
        }, 8, ["showSidebar"]),
        $data.showLeaseDialog ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "dialog-mask"
        }, [
          vue.createElementVNode("view", { class: "dialog-panel" }, [
            vue.createElementVNode("view", { class: "dialog-title" }, "办理月卡/年卡"),
            vue.createElementVNode("view", { class: "dialog-body" }, [
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "车位号"),
                vue.createElementVNode(
                  "text",
                  { class: "dialog-value" },
                  vue.toDisplayString($data.leaseDialogSpace && $data.leaseDialogSpace.spaceNo),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "用户ID"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "dialog-input",
                    "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => $data.leaseForm.userId = $event),
                    placeholder: "请输入用户ID",
                    type: "number"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.leaseForm.userId]
                ])
              ]),
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "车牌号"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "dialog-input",
                    "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => $data.leaseForm.plateNo = $event),
                    placeholder: "请输入车牌号 (必填)"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.leaseForm.plateNo]
                ])
              ]),
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "卡类型"),
                vue.createElementVNode("picker", {
                  class: "dialog-picker",
                  mode: "selector",
                  range: $data.leaseTypeOptions,
                  "range-key": "label",
                  onChange: _cache[18] || (_cache[18] = (...args) => $options.handleLeaseTypeChange && $options.handleLeaseTypeChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "dialog-picker-value" }, [
                    vue.createTextVNode(
                      vue.toDisplayString($options.getLeaseTypeLabel($data.leaseForm.leaseType)) + " ",
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "iconfont" }, "▼")
                  ])
                ], 40, ["range"])
              ]),
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "时长(月)"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "dialog-input",
                    "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => $data.leaseForm.durationMonths = $event),
                    placeholder: "默认1个月",
                    type: "number"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.leaseForm.durationMonths]
                ])
              ]),
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "支付方式"),
                vue.createElementVNode("picker", {
                  class: "dialog-picker",
                  mode: "selector",
                  range: $data.payChannelOptions,
                  "range-key": "label",
                  onChange: _cache[20] || (_cache[20] = (...args) => $options.handlePayChannelChange && $options.handlePayChannelChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "dialog-picker-value" }, [
                    vue.createTextVNode(
                      vue.toDisplayString($options.getPayChannelLabel($data.leaseForm.payChannel)) + " ",
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "iconfont" }, "▼")
                  ])
                ], 40, ["range"])
              ]),
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "备注")
              ]),
              vue.withDirectives(vue.createElementVNode(
                "textarea",
                {
                  class: "dialog-textarea",
                  "onUpdate:modelValue": _cache[21] || (_cache[21] = ($event) => $data.leaseForm.remark = $event),
                  placeholder: "可填写办理说明"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.leaseForm.remark]
              ]),
              vue.createElementVNode("view", { class: "dialog-footer" }, [
                vue.createElementVNode("button", {
                  class: "dialog-btn cancel",
                  onClick: _cache[22] || (_cache[22] = (...args) => $options.closeLeaseDialog && $options.closeLeaseDialog(...args))
                }, "取消"),
                vue.createElementVNode("button", {
                  class: "dialog-btn confirm",
                  onClick: _cache[23] || (_cache[23] = (...args) => $options.confirmLease && $options.confirmLease(...args))
                }, "确认办理")
              ])
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ],
      64
      /* STABLE_FRAGMENT */
    );
  }
  const AdminPagesAdminParkingManage = /* @__PURE__ */ _export_sfc(_sfc_main$j, [["render", _sfc_render$i], ["__scopeId", "data-v-668f6823"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/parking-manage.vue"]]);
  const _sfc_main$i = {
    components: {
      adminSidebar
    },
    data() {
      return {
        communityInfo: {
          name: "智慧社区",
          address: "北京市朝阳区智慧路1号",
          totalHouses: 500,
          greenRate: 35,
          totalParkings: 800,
          propertyFee: 3.5
        },
        showSidebar: false,
        isSuperAdmin: false,
        communityList: [],
        currentCommunityId: null
      };
    },
    onLoad() {
      this.checkAdminRole();
      this.initData();
    },
    methods: {
      checkAdminRole() {
        const userInfo = uni.getStorageSync("userInfo");
        if (!userInfo || userInfo.role !== "admin" && userInfo.role !== "super_admin") {
          uni.showToast({ title: "无权限访问", icon: "none" });
          uni.redirectTo({ url: "/owner/pages/login/login" });
          return;
        }
        this.isSuperAdmin = userInfo.role === "super_admin";
      },
      async initData() {
        if (this.isSuperAdmin) {
          await this.loadCommunityList();
        } else {
          await this.loadCommunityInfo();
        }
      },
      async loadCommunityList() {
        try {
          try {
            const data = await request("/api/community/list", {}, "GET");
            if (data && Array.isArray(data)) {
              this.communityList = data;
              return;
            }
          } catch (e) {
            formatAppLog("log", "at admin/pages/admin/community-manage.vue:132", "API /api/community/list 可能不存在，使用模拟数据");
          }
          this.communityList = [
            { id: 1, name: "智慧社区A区", address: "北京市朝阳区智慧路1号" },
            { id: 2, name: "幸福家园B区", address: "北京市海淀区幸福路8号" },
            { id: 3, name: "阳光花园C区", address: "上海市浦东新区阳光大道99号" }
          ];
        } catch (err) {
          uni.showToast({ title: "加载社区列表失败", icon: "none" });
        }
      },
      async loadCommunityInfo(id) {
        try {
          let url = "/api/community/info";
          if (this.isSuperAdmin && id) {
            url = `/api/community/${id}`;
          }
          const data = await request(url, {}, "GET");
          if (data) {
            this.communityInfo = data;
          } else if (this.isSuperAdmin && id) {
            const selected = this.communityList.find((c) => c.id === id);
            if (selected) {
              this.communityInfo = {
                ...this.communityInfo,
                // 保留默认值
                ...selected,
                totalHouses: 0,
                // 默认值
                greenRate: 0,
                totalParkings: 0,
                propertyFee: 0
              };
            }
          }
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/community-manage.vue:174", "加载社区信息失败:", err);
          uni.showToast({
            title: (err == null ? void 0 : err.message) || "加载失败",
            icon: "none"
          });
        }
      },
      selectCommunity(item) {
        this.currentCommunityId = item.id;
        this.loadCommunityInfo(item.id);
      },
      backToList() {
        this.currentCommunityId = null;
        this.communityInfo = {};
      },
      handleAddCommunity() {
        uni.showToast({ title: "新增功能开发中", icon: "none" });
      },
      handleEditCommunity() {
        uni.showToast({ title: "编辑功能开发中", icon: "none" });
      }
    }
  };
  function _sfc_render$h(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[3] || (_cache[3] = ($event) => $data.showSidebar = $event),
      pageTitle: "社区管理",
      currentPage: "/admin/pages/admin/community-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createCommentVNode(" 超级管理员：社区列表 "),
          $data.isSuperAdmin && !$data.currentCommunityId ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "community-list"
          }, [
            vue.createElementVNode("view", { class: "list-header" }, [
              vue.createElementVNode("text", { class: "list-title" }, "社区列表"),
              vue.createElementVNode("button", {
                class: "add-btn",
                onClick: _cache[0] || (_cache[0] = (...args) => $options.handleAddCommunity && $options.handleAddCommunity(...args))
              }, "新增社区")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.communityList, (item, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  class: "community-item",
                  key: index,
                  onClick: ($event) => $options.selectCommunity(item)
                }, [
                  vue.createElementVNode("view", { class: "item-info" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "item-name" },
                      vue.toDisplayString(item.name),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "text",
                      { class: "item-address" },
                      vue.toDisplayString(item.address),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("text", { class: "arrow" }, ">")
                ], 8, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.communityList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-tip"
            }, " 暂无社区数据 ")) : vue.createCommentVNode("v-if", true)
          ])) : (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 1 },
            [
              vue.createCommentVNode(" 社区详情 (普通管理员直接显示，超级管理员选中后显示) "),
              vue.createElementVNode("view", { class: "community-detail" }, [
                $data.isSuperAdmin ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "back-bar",
                  onClick: _cache[1] || (_cache[1] = (...args) => $options.backToList && $options.backToList(...args))
                }, [
                  vue.createElementVNode("text", { class: "back-icon" }, "←"),
                  vue.createElementVNode("text", null, "返回社区列表")
                ])) : vue.createCommentVNode("v-if", true),
                vue.createElementVNode("view", { class: "community-info" }, [
                  vue.createElementVNode("view", { class: "info-item" }, [
                    vue.createElementVNode("text", { class: "info-label" }, "社区名称："),
                    vue.createElementVNode(
                      "text",
                      { class: "info-value" },
                      vue.toDisplayString($data.communityInfo.name),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "info-item" }, [
                    vue.createElementVNode("text", { class: "info-label" }, "社区地址："),
                    vue.createElementVNode(
                      "text",
                      { class: "info-value" },
                      vue.toDisplayString($data.communityInfo.address),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "info-item" }, [
                    vue.createElementVNode("text", { class: "info-label" }, "总户数："),
                    vue.createElementVNode(
                      "text",
                      { class: "info-value" },
                      vue.toDisplayString($data.communityInfo.totalHouses),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "info-item" }, [
                    vue.createElementVNode("text", { class: "info-label" }, "绿化率："),
                    vue.createElementVNode(
                      "text",
                      { class: "info-value" },
                      vue.toDisplayString($data.communityInfo.greenRate) + "%",
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "info-item" }, [
                    vue.createElementVNode("text", { class: "info-label" }, "停车位总数："),
                    vue.createElementVNode(
                      "text",
                      { class: "info-value" },
                      vue.toDisplayString($data.communityInfo.totalParkings),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "info-item" }, [
                    vue.createElementVNode("text", { class: "info-label" }, "物业管理费："),
                    vue.createElementVNode(
                      "text",
                      { class: "info-value" },
                      "¥" + vue.toDisplayString($data.communityInfo.propertyFee) + "/月",
                      1
                      /* TEXT */
                    )
                  ])
                ]),
                vue.createCommentVNode(" 操作按钮 "),
                vue.createElementVNode("view", { class: "action-section" }, [
                  vue.createElementVNode("button", {
                    class: "edit-btn",
                    onClick: _cache[2] || (_cache[2] = (...args) => $options.handleEditCommunity && $options.handleEditCommunity(...args))
                  }, " 编辑社区信息 ")
                ])
              ])
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          ))
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminCommunityManage = /* @__PURE__ */ _export_sfc(_sfc_main$i, [["render", _sfc_render$h], ["__scopeId", "data-v-48e2c863"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/community-manage.vue"]]);
  const _sfc_main$h = {
    components: { adminSidebar },
    data() {
      return {
        showSidebar: false,
        isEdit: false,
        noticeId: null,
        isSuperAdmin: false,
        communityList: [],
        selectedCommunityId: "",
        selectedCommunityName: "",
        form: {
          title: "",
          content: "",
          topFlag: false,
          expireDate: "",
          expireTimeVal: "23:59",
          publishStatus: "DRAFT"
        },
        initialSnapshot: ""
      };
    },
    computed: {
      startDate() {
        const d = /* @__PURE__ */ new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    },
    onLoad(options) {
      if (options.noticeId) {
        this.isEdit = true;
        this.noticeId = options.noticeId;
        this.loadNoticeDetail();
      } else {
        this.initialSnapshot = this.getFormSnapshot();
      }
      const userInfo = uni.getStorageSync("userInfo");
      this.isSuperAdmin = userInfo && userInfo.role === "super_admin";
      if (this.isSuperAdmin) {
        this.loadCommunityList();
      }
    },
    methods: {
      async loadCommunityList() {
        try {
          formatAppLog("log", "at admin/pages/admin/notice-edit.vue:151", "加载社区列表");
          const data = await request("/api/community/list", {}, "GET");
          formatAppLog("log", "at admin/pages/admin/notice-edit.vue:153", "社区列表返回", data && data.length ? data.length : 0);
          if (Array.isArray(data)) {
            this.communityList = data;
          }
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/notice-edit.vue:158", "社区列表加载失败", e && e.message ? e.message : e);
          this.communityList = [];
        }
      },
      handleCommunityChange(e) {
        const index = Number(e.detail.value);
        const item = this.communityList[index];
        if (item) {
          this.selectedCommunityId = item.id;
          this.selectedCommunityName = item.name;
          formatAppLog("log", "at admin/pages/admin/notice-edit.vue:168", "选择社区", { id: this.selectedCommunityId, name: this.selectedCommunityName });
        }
      },
      async loadNoticeDetail() {
        try {
          uni.showLoading({ title: "加载中..." });
          const res = await request(
            `/api/notice/detail/${this.noticeId}`,
            {},
            "GET"
          );
          formatAppLog("log", "at admin/pages/admin/notice-edit.vue:181", "公告详情", res);
          this.form.title = res.title;
          this.form.content = res.content;
          this.form.topFlag = !!res.topFlag;
          this.form.publishStatus = res.publishStatus || "DRAFT";
          if (res.expireTime) {
            this.form.expireDate = res.expireTime.split("T")[0].split(" ")[0];
          }
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/notice-edit.vue:193", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          uni.hideLoading();
          this.initialSnapshot = this.getFormSnapshot();
        }
      },
      handleDateChange(e) {
        this.form.expireDate = e.detail.value;
      },
      handleTimeChange(e) {
        this.form.expireTimeVal = e.detail.value;
      },
      handleCancel() {
        if (this.hasUnsavedChanges()) {
          uni.showModal({
            title: "保存为草稿",
            content: "是否保存为草稿并退出？",
            success: async (res) => {
              if (res.confirm) {
                try {
                  await this.handleSaveDraft();
                } finally {
                  uni.navigateBack();
                }
              } else {
                uni.navigateBack();
              }
            }
          });
        } else {
          uni.navigateBack();
        }
      },
      getFormSnapshot() {
        const { title, content, topFlag, expireDate, expireTimeVal } = this.form;
        return JSON.stringify({ title, content, topFlag, expireDate, expireTimeVal });
      },
      hasUnsavedChanges() {
        return this.initialSnapshot !== this.getFormSnapshot();
      },
      async handleSubmit(status = "PUBLISHED") {
        if (!this.form.title.trim()) {
          return uni.showToast({ title: "请输入标题", icon: "none" });
        }
        if (!this.form.content.trim()) {
          return uni.showToast({ title: "请输入内容", icon: "none" });
        }
        const userInfo = uni.getStorageSync("userInfo");
        uni.showLoading({ title: "提交中...", mask: true });
        try {
          const dto = {
            title: this.form.title,
            content: this.form.content,
            topFlag: this.form.topFlag,
            publishStatus: status,
            expireTime: this.form.expireDate ? `${this.form.expireDate}T${this.form.expireTimeVal}:00` : null
          };
          formatAppLog("log", "at admin/pages/admin/notice-edit.vue:259", "提交参数", { dto, status, userId: userInfo && userInfo.id });
          let targetId = this.noticeId;
          if (this.isEdit) {
            try {
              await request(
                `/api/notice/${this.noticeId}`,
                { data: dto, params: { adminId: userInfo.id } },
                "PUT"
              );
              formatAppLog("log", "at admin/pages/admin/notice-edit.vue:271", "更新公告成功", { id: this.noticeId });
            } catch (updateErr) {
              formatAppLog("error", "at admin/pages/admin/notice-edit.vue:273", "更新公告失败", updateErr && updateErr.message ? updateErr.message : updateErr);
            }
          } else {
            try {
              const res = await request(
                "/api/notice",
                { data: dto, params: { adminId: userInfo.id } },
                "POST"
              );
              targetId = res;
              formatAppLog("log", "at admin/pages/admin/notice-edit.vue:285", "创建公告成功", { id: targetId });
            } catch (createErr) {
              formatAppLog("error", "at admin/pages/admin/notice-edit.vue:287", "创建公告失败", createErr && createErr.message ? createErr.message : createErr);
            }
          }
          if (status === "PUBLISHED" && targetId) {
            const publishParams = { adminId: userInfo.id };
            if (this.isSuperAdmin && this.selectedCommunityId) {
              publishParams.communityId = this.selectedCommunityId;
            }
            formatAppLog("log", "at admin/pages/admin/notice-edit.vue:298", "调用发布接口", { id: targetId, params: publishParams });
            await request(
              `/api/notice/${targetId}/publish`,
              { params: publishParams },
              "PUT"
            );
            formatAppLog("log", "at admin/pages/admin/notice-edit.vue:304", "发布接口完成", { id: targetId });
          }
          if (status === "PUBLISHED" && this.isEdit && this.form.expireDate && targetId) {
            try {
              const expireDto = {
                noticeId: Number(targetId),
                // 转换为Long类型
                expireType: "CUSTOM",
                // 必须指定类型为CUSTOM
                customExpireTime: `${this.form.expireDate}T${this.form.expireTimeVal}:00`,
                days: null
                // CUSTOM类型时days可以为null
              };
              formatAppLog("log", "at admin/pages/admin/notice-edit.vue:318", "设置过期时间参数", expireDto);
              await request(
                "/api/notice/expire/set",
                {
                  data: expireDto,
                  // 使用正确的DTO结构
                  params: { adminId: userInfo.id }
                },
                "POST"
              );
              formatAppLog("log", "at admin/pages/admin/notice-edit.vue:329", "过期时间设置成功", { id: targetId });
            } catch (expireErr) {
              formatAppLog("error", "at admin/pages/admin/notice-edit.vue:331", "设置过期时间失败", expireErr && expireErr.message ? expireErr.message : expireErr);
              uni.showToast({
                title: "公告已更新，但过期时间设置失败",
                icon: "none",
                duration: 2e3
              });
            }
          } else if (status === "PUBLISHED" && this.isEdit && !this.form.expireDate) {
            try {
              const expireDto = {
                noticeId: Number(targetId),
                expireType: "NEVER",
                // 设置为永不过期
                customExpireTime: null,
                days: null
              };
              await request(
                "/api/notice/expire/set",
                {
                  data: expireDto,
                  params: { adminId: userInfo.id }
                },
                "POST"
              );
            } catch (clearErr) {
              formatAppLog("error", "at admin/pages/admin/notice-edit.vue:358", "清除过期时间失败", clearErr && clearErr.message ? clearErr.message : clearErr);
            }
          }
          uni.showToast({ title: "操作成功" });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/notice-edit.vue:368", "提交失败", e && e.message ? e.message : e, e && e.stack ? e.stack : "");
          uni.showToast({ title: e.message || "操作失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      async handleSaveDraft() {
        this.form.publishStatus = "DRAFT";
        await this.handleSubmit("DRAFT");
      },
      async handlePublish() {
        this.form.publishStatus = "PUBLISHED";
        await this.handleSubmit("PUBLISHED");
      }
    }
  };
  function _sfc_render$g(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[9] || (_cache[9] = ($event) => $data.showSidebar = $event),
      pageTitle: $data.isEdit ? "编辑公告" : "发布公告",
      currentPage: "/admin/pages/admin/notice-edit"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "edit-container" }, [
          vue.createElementVNode("view", { class: "form-card" }, [
            vue.createCommentVNode(" 标题 "),
            vue.createElementVNode("view", { class: "form-item" }, [
              vue.createElementVNode("text", { class: "label" }, "公告标题"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "input",
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.title = $event),
                  placeholder: "请输入标题",
                  "placeholder-class": "placeholder"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.form.title]
              ])
            ]),
            vue.createCommentVNode(" 内容 "),
            vue.createElementVNode("view", { class: "form-item" }, [
              vue.createElementVNode("text", { class: "label" }, "公告内容"),
              vue.withDirectives(vue.createElementVNode(
                "textarea",
                {
                  class: "textarea",
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.content = $event),
                  placeholder: "请输入公告详细内容...",
                  "placeholder-class": "placeholder",
                  maxlength: "-1"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.form.content]
              ])
            ]),
            vue.createCommentVNode(" 过期时间 "),
            vue.createElementVNode("view", { class: "form-item" }, [
              vue.createElementVNode("text", { class: "label" }, "过期时间"),
              vue.createElementVNode("view", { class: "datetime-row" }, [
                vue.createElementVNode("picker", {
                  mode: "date",
                  start: $options.startDate,
                  onChange: _cache[2] || (_cache[2] = (...args) => $options.handleDateChange && $options.handleDateChange(...args)),
                  class: "flex-1"
                }, [
                  vue.createElementVNode(
                    "view",
                    {
                      class: vue.normalizeClass(["picker-box", { "has-val": $data.form.expireDate }])
                    },
                    [
                      vue.createTextVNode(
                        vue.toDisplayString($data.form.expireDate || "选择日期") + " ",
                        1
                        /* TEXT */
                      ),
                      !$data.form.expireDate ? (vue.openBlock(), vue.createElementBlock("text", {
                        key: 0,
                        class: "picker-icon"
                      }, ">")) : vue.createCommentVNode("v-if", true)
                    ],
                    2
                    /* CLASS */
                  )
                ], 40, ["start"]),
                vue.createElementVNode("view", { class: "gap" }),
                vue.createElementVNode("picker", {
                  mode: "time",
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.handleTimeChange && $options.handleTimeChange(...args)),
                  class: "flex-1",
                  disabled: !$data.form.expireDate
                }, [
                  vue.createElementVNode(
                    "view",
                    {
                      class: vue.normalizeClass(["picker-box", { "has-val": $data.form.expireDate }])
                    },
                    [
                      vue.createTextVNode(
                        vue.toDisplayString($data.form.expireTimeVal) + " ",
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("text", { class: "picker-icon" }, ">")
                    ],
                    2
                    /* CLASS */
                  )
                ], 40, ["disabled"])
              ]),
              vue.createElementVNode("text", { class: "tip" }, "设置过期后，业主端将不再显示此公告")
            ]),
            vue.createCommentVNode(" 发布范围 "),
            $data.isSuperAdmin ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "form-item"
            }, [
              vue.createElementVNode("text", { class: "label" }, "发布范围"),
              vue.createElementVNode("picker", {
                mode: "selector",
                range: $data.communityList,
                "range-key": "name",
                onChange: _cache[4] || (_cache[4] = (...args) => $options.handleCommunityChange && $options.handleCommunityChange(...args))
              }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["picker-box", { "has-val": !!$data.selectedCommunityName }])
                  },
                  [
                    vue.createTextVNode(
                      vue.toDisplayString($data.selectedCommunityName || "请选择发布社区") + " ",
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("text", { class: "picker-icon" }, ">")
                  ],
                  2
                  /* CLASS */
                )
              ], 40, ["range"])
            ])) : (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "form-item"
            }, [
              vue.createElementVNode("text", { class: "label" }, "发布范围"),
              vue.createElementVNode("view", { class: "picker-box has-val" }, "当前社区")
            ])),
            vue.createCommentVNode(" 选项区 "),
            vue.createElementVNode("view", { class: "form-item switch-row" }, [
              vue.createElementVNode("text", { class: "label-inline" }, "置顶公告"),
              vue.createElementVNode("switch", {
                checked: $data.form.topFlag,
                color: "#2D81FF",
                style: { "transform": "scale(0.8)" },
                onChange: _cache[5] || (_cache[5] = ($event) => $data.form.topFlag = $event.detail.value)
              }, null, 40, ["checked"])
            ])
          ]),
          vue.createCommentVNode(" 按钮组 "),
          vue.createElementVNode("view", { class: "btn-group" }, [
            vue.createElementVNode("button", {
              class: "cancel-btn",
              onClick: _cache[6] || (_cache[6] = (...args) => $options.handleCancel && $options.handleCancel(...args))
            }, "取消"),
            vue.createElementVNode("button", {
              class: "draft-btn",
              onClick: _cache[7] || (_cache[7] = (...args) => $options.handleSaveDraft && $options.handleSaveDraft(...args))
            }, "存为草稿"),
            vue.createElementVNode(
              "button",
              {
                class: "submit-btn",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handlePublish && $options.handlePublish(...args))
              },
              vue.toDisplayString($data.isEdit ? "保存并发布" : "立即发布"),
              1
              /* TEXT */
            )
          ])
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar", "pageTitle"]);
  }
  const AdminPagesAdminNoticeEdit = /* @__PURE__ */ _export_sfc(_sfc_main$h, [["render", _sfc_render$g], ["__scopeId", "data-v-227539c9"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/notice-edit.vue"]]);
  const _imports_0 = "/static/empty.png";
  const _sfc_main$g = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        searchQuery: "",
        typeFilter: "all",
        // all, unpaid, paid
        loading: false,
        feeList: [],
        filterTabs: [
          { label: "全部", value: "all" },
          { label: "待缴费", value: "unpaid" },
          { label: "已缴费", value: "paid" }
        ],
        stats: {
          totalAmount: 0,
          paidAmount: 0,
          rate: 0
        },
        countStats: {
          total: 0,
          unpaid: 0,
          paid: 0
        },
        // 生成账单相关
        showGenerateModal: false,
        generateForm: {
          month: "",
          feeType: "wuye",
          feeTypeLabel: "物业费",
          deadline: ""
        },
        feeTypes: [
          { label: "物业费", value: "wuye" },
          { label: "停车费", value: "parking" },
          { label: "水费", value: "water" },
          { label: "电费", value: "electric" }
        ],
        // 分页
        currentPage: 1,
        pageSize: 10,
        total: 0
      };
    },
    computed: {
      totalPages() {
        return Math.ceil(this.total / this.pageSize) || 1;
      }
    },
    onLoad() {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      this.generateForm.month = `${year}-${month}`;
    },
    onShow() {
      this.loadData();
      this.loadCountStats();
    },
    methods: {
      handleStatsClick(status) {
        this.typeFilter = status;
        this.loadData();
      },
      async loadCountStats() {
        try {
          const totalReq = request("/api/fee/list", { pageNum: 1, pageSize: 1 }, "GET");
          const unpaidReq = request("/api/fee/list", { pageNum: 1, pageSize: 1, status: "UNPAID" }, "GET");
          const paidReq = request("/api/fee/list", { pageNum: 1, pageSize: 1, status: "PAID" }, "GET");
          const [totalRes, unpaidRes, paidRes] = await Promise.all([totalReq, unpaidReq, paidReq]);
          this.countStats = {
            total: (totalRes == null ? void 0 : totalRes.total) || 0,
            unpaid: (unpaidRes == null ? void 0 : unpaidRes.total) || 0,
            paid: (paidRes == null ? void 0 : paidRes.total) || 0
          };
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/fee-manage.vue:290", "加载统计数据失败", e);
        }
      },
      onSearch() {
        this.currentPage = 1;
        this.loadData();
      },
      switchTab(tabValue) {
        this.typeFilter = tabValue;
        this.currentPage = 1;
        this.loadData();
      },
      handlePrevPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadData();
        }
      },
      handleNextPage() {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadData();
        }
      },
      async loadData() {
        var _a;
        this.loading = true;
        try {
          const isStatusFilter = ["unpaid", "paid"].includes(this.typeFilter);
          const params = {
            keyword: this.searchQuery || void 0,
            status: isStatusFilter ? this.typeFilter === "unpaid" ? "UNPAID" : "PAID" : void 0,
            pageNum: this.currentPage,
            pageSize: this.pageSize
          };
          const data = await request("/api/fee/list", params, "GET");
          const records = data.records || [];
          this.total = typeof data.total === "number" ? data.total : ((_a = data.data) == null ? void 0 : _a.total) || records.length || 0;
          this.feeList = records.map((item) => {
            const feeCycle = item.feeCycle || "";
            const [year, month] = feeCycle.split("-");
            return {
              id: item.id,
              feeName: item.feeName || (year && month ? `${year}年${month}月费用` : `${feeCycle} 费用`),
              amount: item.amount,
              buildingNo: item.buildingNo,
              houseNo: item.houseNo,
              ownerName: item.ownerName,
              period: feeCycle,
              deadline: item.deadline || "月底",
              remindCount: item.remindCount || 0,
              // 新增：催缴次数
              status: item.status === "PAID" || item.status === "paid" || item.status === 1 ? "paid" : "unpaid"
            };
          });
          const total = this.feeList.reduce((sum, item) => sum + Number(item.amount), 0);
          const paid = this.feeList.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount), 0);
          this.stats = {
            totalAmount: total.toFixed(2),
            paidAmount: paid.toFixed(2),
            rate: total > 0 ? (paid / total * 100).toFixed(1) : 0
          };
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/fee-manage.vue:367", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      // 打开生成账单弹窗
      openGenerateModal() {
        this.showGenerateModal = true;
      },
      closeGenerateModal() {
        this.showGenerateModal = false;
      },
      onMonthChange(e) {
        this.generateForm.month = e.detail.value;
      },
      onFeeTypeChange(e) {
        const index = e.detail.value;
        this.generateForm.feeType = this.feeTypes[index].value;
        this.generateForm.feeTypeLabel = this.feeTypes[index].label;
      },
      onDeadlineChange(e) {
        this.generateForm.deadline = e.detail.value;
      },
      // 提交生成账单
      async submitGenerateBill() {
        if (!this.generateForm.month)
          return uni.showToast({ title: "请选择月份", icon: "none" });
        if (!this.generateForm.deadline)
          return uni.showToast({ title: "请选择截止日期", icon: "none" });
        try {
          uni.showLoading({ title: "生成中..." });
          const userInfo = uni.getStorageSync("userInfo") || {};
          const payload = {
            communityName: "",
            // 默认全小区，或者从 userInfo.communityName 获取
            buildingNo: "",
            // 默认全楼栋
            feeCycle: this.generateForm.month,
            // 对应 feeCycle (2026-02)
            dueDate: this.generateForm.deadline,
            // 对应 dueDate
            unitPrice: 2.5
            // 暂时硬编码或从配置获取，或者在弹窗增加输入框
          };
          const adminId = userInfo.id || userInfo.userId || 1;
          const url = `/api/fee/generate?adminId=${adminId}`;
          await request(url, payload, "POST");
          uni.hideLoading();
          uni.showToast({ title: "生成成功", icon: "success" });
          this.closeGenerateModal();
          this.loadData();
        } catch (e) {
          uni.hideLoading();
          formatAppLog("error", "at admin/pages/admin/fee-manage.vue:431", "生成账单失败:", e);
          uni.showToast({ title: "生成失败: " + (e.message || "接口错误"), icon: "none" });
        }
      },
      async handleBatchRemind() {
        try {
          uni.showLoading({ title: "发送中..." });
          const unpaidIds = this.feeList.filter((i) => i.status === "unpaid").map((i) => i.id);
          if (unpaidIds.length === 0) {
            uni.hideLoading();
            return uni.showToast({ title: "无待缴账单", icon: "none" });
          }
          await request("/api/fee/remind/batch", { ids: unpaidIds }, "POST");
          uni.hideLoading();
          uni.showToast({ title: "催缴发送成功", icon: "success" });
        } catch (e) {
          uni.hideLoading();
        }
      },
      handleRemind(item) {
        uni.showModal({
          title: "催缴通知",
          content: `确认向 ${item.ownerName} 发送 ${item.feeName} 的催缴通知吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                await request(`/api/fee/remind/${item.id}`, null, "POST");
                uni.showToast({ title: "发送成功", icon: "success" });
              } catch (e) {
                formatAppLog("error", "at admin/pages/admin/fee-manage.vue:466", "催缴失败", e);
                uni.showToast({ title: e.msg || "发送失败，请检查后端日志", icon: "none" });
              }
            }
          }
        });
      }
    }
  };
  function _sfc_render$f(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[18] || (_cache[18] = ($event) => $data.showSidebar = $event),
      pageTitle: "费用管理",
      currentPage: "/admin/pages/admin/fee-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "container" }, [
          vue.createCommentVNode(" 顶部搜索栏 "),
          vue.createElementVNode("view", { class: "header" }, [
            vue.createElementVNode("view", { class: "search-box" }, [
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "search-input",
                  type: "text",
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.searchQuery = $event),
                  placeholder: "搜索房号、业主姓名",
                  "confirm-type": "search",
                  onConfirm: _cache[1] || (_cache[1] = (...args) => $options.onSearch && $options.onSearch(...args))
                },
                null,
                544
                /* NEED_HYDRATION, NEED_PATCH */
              ), [
                [vue.vModelText, $data.searchQuery]
              ]),
              vue.createElementVNode("button", {
                class: "search-btn",
                onClick: _cache[2] || (_cache[2] = (...args) => $options.onSearch && $options.onSearch(...args))
              }, "搜索")
            ])
          ]),
          vue.createCommentVNode(" 统计卡片 "),
          vue.createElementVNode("view", { class: "stats-card-container" }, [
            vue.createElementVNode("view", {
              class: "stats-card",
              onClick: _cache[3] || (_cache[3] = ($event) => $options.handleStatsClick("all"))
            }, [
              vue.createElementVNode(
                "text",
                { class: "stats-number" },
                vue.toDisplayString($data.countStats.total),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stats-label" }, "总账单数")
            ]),
            vue.createElementVNode("view", {
              class: "stats-card status-unpaid",
              onClick: _cache[4] || (_cache[4] = ($event) => $options.handleStatsClick("unpaid"))
            }, [
              vue.createElementVNode(
                "text",
                { class: "stats-number" },
                vue.toDisplayString($data.countStats.unpaid),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stats-label" }, "待缴费")
            ]),
            vue.createElementVNode("view", {
              class: "stats-card status-paid",
              onClick: _cache[5] || (_cache[5] = ($event) => $options.handleStatsClick("paid"))
            }, [
              vue.createElementVNode(
                "text",
                { class: "stats-number" },
                vue.toDisplayString($data.countStats.paid),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stats-label" }, "已缴费")
            ])
          ]),
          vue.createCommentVNode(" 筛选栏 "),
          vue.createElementVNode("view", { class: "filter-bar" }, [
            vue.createElementVNode("view", { class: "filter-tabs" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.filterTabs, (tab) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: tab.value,
                    class: vue.normalizeClass(["filter-tab", { active: $data.typeFilter === tab.value }]),
                    onClick: ($event) => $options.switchTab(tab.value)
                  }, vue.toDisplayString(tab.label), 11, ["onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createCommentVNode(" 修改为打开弹窗 "),
            vue.createElementVNode("view", { class: "action-buttons" }, [
              vue.createElementVNode("button", {
                class: "action-btn generate",
                onClick: _cache[6] || (_cache[6] = (...args) => $options.openGenerateModal && $options.openGenerateModal(...args))
              }, "生成账单"),
              vue.createElementVNode("button", {
                class: "action-btn remind",
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handleBatchRemind && $options.handleBatchRemind(...args))
              }, "一键催缴")
            ])
          ]),
          vue.createCommentVNode(" 账单列表 "),
          vue.createElementVNode("view", { class: "list-container" }, [
            $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "loading-state"
            }, [
              vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
            ])) : $data.feeList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "fee-list"
            }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.feeList, (item) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: item.id,
                    class: "fee-item"
                  }, [
                    vue.createElementVNode("view", { class: "item-header" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "item-title" },
                        vue.toDisplayString(item.feeName),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "amount" },
                        "¥" + vue.toDisplayString(item.amount),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "item-info" }, [
                      vue.createElementVNode("view", { class: "info-row" }, [
                        vue.createElementVNode("text", { class: "label" }, "业主："),
                        vue.createElementVNode(
                          "text",
                          { class: "value" },
                          vue.toDisplayString(item.ownerName),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "info-row" }, [
                        vue.createElementVNode("text", { class: "label" }, "房号："),
                        vue.createElementVNode(
                          "text",
                          { class: "value" },
                          vue.toDisplayString(item.buildingNo) + "栋" + vue.toDisplayString(item.houseNo) + "室",
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "info-row" }, [
                        vue.createElementVNode("text", { class: "label" }, "账单周期："),
                        vue.createElementVNode(
                          "text",
                          { class: "value" },
                          vue.toDisplayString(item.period),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "info-row" }, [
                        vue.createElementVNode("text", { class: "label" }, "截止日期："),
                        vue.createElementVNode(
                          "text",
                          { class: "value" },
                          vue.toDisplayString(item.deadline),
                          1
                          /* TEXT */
                        )
                      ]),
                      item.status === "unpaid" ? (vue.openBlock(), vue.createElementBlock("view", {
                        key: 0,
                        class: "info-row"
                      }, [
                        vue.createElementVNode("text", { class: "label" }, "催缴次数："),
                        vue.createElementVNode(
                          "text",
                          {
                            class: "value",
                            style: { "color": "#ff9f43" }
                          },
                          vue.toDisplayString(item.remindCount || 0) + "次",
                          1
                          /* TEXT */
                        )
                      ])) : vue.createCommentVNode("v-if", true)
                    ]),
                    vue.createElementVNode("view", { class: "item-footer" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["status-tag", item.status])
                        },
                        vue.toDisplayString(item.status === "paid" ? "已缴费" : "待缴费"),
                        3
                        /* TEXT, CLASS */
                      ),
                      item.status === "unpaid" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 0,
                        class: "remind-btn",
                        onClick: ($event) => $options.handleRemind(item)
                      }, " 催缴 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                    ])
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : (vue.openBlock(), vue.createElementBlock("view", {
              key: 2,
              class: "empty-state"
            }, [
              vue.createElementVNode("image", {
                src: _imports_0,
                mode: "aspectFit",
                class: "empty-img"
              }),
              vue.createElementVNode("text", { class: "empty-text" }, "暂无账单记录")
            ])),
            vue.createCommentVNode(" 分页组件 "),
            $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 3,
              class: "pagination"
            }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, " 上一页 ", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-info" }, [
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString($data.currentPage),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "page-separator" }, "/"),
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString($options.totalPages),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, " 下一页 ", 8, ["disabled"])
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createCommentVNode(" 底部统计 "),
          vue.createElementVNode("view", { class: "stats-bar" }, [
            vue.createElementVNode("view", { class: "stat-item" }, [
              vue.createElementVNode("text", { class: "label" }, "本月应收"),
              vue.createElementVNode(
                "text",
                { class: "value" },
                "¥" + vue.toDisplayString($data.stats.totalAmount),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "stat-item" }, [
              vue.createElementVNode("text", { class: "label" }, "已收金额"),
              vue.createElementVNode(
                "text",
                { class: "value highlight" },
                "¥" + vue.toDisplayString($data.stats.paidAmount),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "stat-item" }, [
              vue.createElementVNode("text", { class: "label" }, "缴费率"),
              vue.createElementVNode(
                "text",
                { class: "value" },
                vue.toDisplayString($data.stats.rate) + "%",
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createCommentVNode(" 生成账单弹窗 "),
          $data.showGenerateModal ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "modal-mask",
            onClick: _cache[17] || (_cache[17] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
          }, [
            vue.createElementVNode("view", {
              class: "modal-content",
              onClick: _cache[16] || (_cache[16] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "modal-header" }, [
                vue.createElementVNode("text", { class: "modal-title" }, "生成本期账单"),
                vue.createElementVNode("text", {
                  class: "close-icon",
                  onClick: _cache[10] || (_cache[10] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
                }, "×")
              ]),
              vue.createElementVNode("view", { class: "modal-body" }, [
                vue.createElementVNode("view", { class: "form-item" }, [
                  vue.createElementVNode("text", { class: "label" }, "账单月份"),
                  vue.createElementVNode("picker", {
                    mode: "date",
                    fields: "month",
                    value: $data.generateForm.month,
                    onChange: _cache[11] || (_cache[11] = (...args) => $options.onMonthChange && $options.onMonthChange(...args))
                  }, [
                    vue.createElementVNode(
                      "view",
                      { class: "picker-value" },
                      vue.toDisplayString($data.generateForm.month || "请选择月份"),
                      1
                      /* TEXT */
                    )
                  ], 40, ["value"])
                ]),
                vue.createElementVNode("view", { class: "form-item" }, [
                  vue.createElementVNode("text", { class: "label" }, "费用类型"),
                  vue.createElementVNode("picker", {
                    range: $data.feeTypes,
                    "range-key": "label",
                    onChange: _cache[12] || (_cache[12] = (...args) => $options.onFeeTypeChange && $options.onFeeTypeChange(...args))
                  }, [
                    vue.createElementVNode(
                      "view",
                      { class: "picker-value" },
                      vue.toDisplayString($data.generateForm.feeTypeLabel || "请选择类型"),
                      1
                      /* TEXT */
                    )
                  ], 40, ["range"])
                ]),
                vue.createElementVNode("view", { class: "form-item" }, [
                  vue.createElementVNode("text", { class: "label" }, "截止日期"),
                  vue.createElementVNode("picker", {
                    mode: "date",
                    value: $data.generateForm.deadline,
                    onChange: _cache[13] || (_cache[13] = (...args) => $options.onDeadlineChange && $options.onDeadlineChange(...args))
                  }, [
                    vue.createElementVNode(
                      "view",
                      { class: "picker-value" },
                      vue.toDisplayString($data.generateForm.deadline || "请选择日期"),
                      1
                      /* TEXT */
                    )
                  ], 40, ["value"])
                ])
              ]),
              vue.createElementVNode("view", { class: "modal-footer" }, [
                vue.createElementVNode("button", {
                  class: "modal-btn cancel",
                  onClick: _cache[14] || (_cache[14] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
                }, "取消"),
                vue.createElementVNode("button", {
                  class: "modal-btn confirm",
                  onClick: _cache[15] || (_cache[15] = (...args) => $options.submitGenerateBill && $options.submitGenerateBill(...args))
                }, "确认生成")
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminFeeManage = /* @__PURE__ */ _export_sfc(_sfc_main$g, [["render", _sfc_render$f], ["__scopeId", "data-v-764c8d8b"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/fee-manage.vue"]]);
  const _sfc_main$f = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        searchQuery: "",
        statusFilter: "",
        loading: false,
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "PENDING", label: "待处理" },
          { value: "DONE", label: "已处理" }
        ],
        complaintList: [],
        // 分页相关
        currentPage: 1,
        pageSize: 10,
        total: 0,
        // 统计数据
        stats: {
          total: 0,
          pending: 0,
          processed: 0
        },
        // 处理弹窗
        showHandleModal: false,
        currentComplaint: null,
        handleResult: ""
      };
    },
    computed: {
      totalPages() {
        return Math.ceil(this.total / this.pageSize) || 1;
      }
    },
    onLoad() {
      this.loadData();
      this.loadStats();
    },
    methods: {
      async loadData() {
        var _a, _b;
        this.loading = true;
        try {
          const params = {
            keyword: this.searchQuery || void 0,
            status: this.statusFilter || void 0,
            pageNum: this.currentPage,
            pageSize: this.pageSize
          };
          const data = await request("/api/complaint/list", { params }, "GET");
          const records = Array.isArray(data) ? data : data.records || ((_a = data.data) == null ? void 0 : _a.records) || data.rows || [];
          this.total = typeof data.total === "number" ? data.total : ((_b = data.data) == null ? void 0 : _b.total) || records.length || 0;
          this.complaintList = records.map((item) => ({
            id: item.id,
            type: item.type,
            content: item.content,
            images: item.images,
            ownerName: item.ownerName,
            userName: item.userName,
            phone: item.phone,
            buildingNo: item.buildingNo,
            houseNo: item.houseNo,
            createTime: item.createTime,
            status: item.status,
            // PENDING/DONE
            result: item.result
          }));
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/complaint-manage.vue:254", "加载投诉列表失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
          this.complaintList = [];
          this.total = 0;
        } finally {
          this.loading = false;
        }
      },
      // 加载统计数据
      async loadStats() {
        try {
          const totalReq = request("/api/complaint/list", { params: { pageNum: 1, pageSize: 1 } }, "GET");
          const pendingReq = request("/api/complaint/list", { params: { pageNum: 1, pageSize: 1, status: "PENDING" } }, "GET");
          const processedReq = request("/api/complaint/list", { params: { pageNum: 1, pageSize: 1, status: "DONE" } }, "GET");
          const [totalRes, pendingRes, processedRes] = await Promise.all([totalReq, pendingReq, processedReq]);
          formatAppLog("log", "at admin/pages/admin/complaint-manage.vue:276", "Stats Response Data:", { totalRes, pendingRes, processedRes });
          this.stats = {
            total: (totalRes == null ? void 0 : totalRes.total) || 0,
            pending: (pendingRes == null ? void 0 : pendingRes.total) || 0,
            processed: (processedRes == null ? void 0 : processedRes.total) || 0
          };
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/complaint-manage.vue:284", "加载统计数据失败", e);
        }
      },
      handleStatsClick(status) {
        this.statusFilter = status;
        this.currentPage = 1;
        this.loadData();
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadData();
      },
      handleStatusChange(e) {
        this.statusFilter = this.statusOptions[e.detail.value].value;
        this.currentPage = 1;
        this.loadData();
      },
      handlePrevPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadData();
        }
      },
      handleNextPage() {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadData();
        }
      },
      openHandleModal(item) {
        this.currentComplaint = item;
        this.handleResult = "";
        this.showHandleModal = true;
      },
      closeHandleModal() {
        this.showHandleModal = false;
        this.currentComplaint = null;
      },
      async submitHandle() {
        if (!this.handleResult) {
          uni.showToast({ title: "请输入处理结果", icon: "none" });
          return;
        }
        uni.showLoading({ title: "提交中..." });
        try {
          const url = `/api/complaint/handle?id=${this.currentComplaint.id}&result=${encodeURIComponent(this.handleResult)}`;
          await request(url, {}, "PUT");
          const item = this.complaintList.find((i) => i.id === this.currentComplaint.id);
          if (item) {
            item.status = "DONE";
            item.result = this.handleResult;
          }
          uni.showToast({ title: "处理成功", icon: "success" });
          this.closeHandleModal();
          this.loadStats();
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/complaint-manage.vue:357", "处理投诉失败", e);
          uni.showToast({ title: "提交失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      makeCall(phone) {
        if (!phone)
          return;
        uni.makePhoneCall({ phoneNumber: phone });
      },
      previewImage(images, index) {
        if (!images)
          return;
        const urls = images.split(",");
        uni.previewImage({
          current: urls[index],
          urls
        });
      },
      getStatusClass(status) {
        return {
          "status-pending": status === "PENDING",
          "status-processed": status === "DONE"
        };
      },
      getStatusText(status) {
        const map = {
          "PENDING": "待处理",
          "DONE": "已处理"
        };
        return map[status] || status;
      },
      formatTime(time) {
        if (!time)
          return "";
        return new Date(time).toLocaleString();
      }
    }
  };
  function _sfc_render$e(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[15] || (_cache[15] = ($event) => $data.showSidebar = $event),
      pageTitle: "投诉处理",
      currentPage: "/admin/pages/admin/complaint-manage"
    }, {
      default: vue.withCtx(() => {
        var _a;
        return [
          vue.createElementVNode("view", { class: "manage-container" }, [
            vue.createCommentVNode(" 统计卡片 "),
            vue.createElementVNode("view", { class: "stats-card-container" }, [
              vue.createElementVNode("view", {
                class: "stats-card",
                onClick: _cache[0] || (_cache[0] = ($event) => $options.handleStatsClick(""))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "总投诉数")
              ]),
              vue.createElementVNode("view", {
                class: "stats-card status-pending",
                onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick("pending"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "待处理")
              ]),
              vue.createElementVNode("view", {
                class: "stats-card status-processed",
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("processed"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.processed),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "已处理")
              ])
            ]),
            vue.createCommentVNode(" 搜索和筛选栏 "),
            vue.createElementVNode("view", { class: "search-filter-bar" }, [
              vue.createElementVNode("view", { class: "search-box" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    placeholder: "搜索投诉内容、业主姓名",
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.searchQuery = $event),
                    onConfirm: _cache[4] || (_cache[4] = (...args) => $options.handleSearch && $options.handleSearch(...args)),
                    class: "search-input"
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ]),
                vue.createElementVNode("button", {
                  class: "search-btn",
                  onClick: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                }, "搜索")
              ]),
              vue.createElementVNode("view", { class: "filter-row" }, [
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $data.statusOptions.findIndex((opt) => opt.value === $data.statusFilter),
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args)),
                  class: "filter-picker"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "filter-picker-text" },
                    vue.toDisplayString(((_a = $data.statusOptions.find((opt) => opt.value === $data.statusFilter)) == null ? void 0 : _a.label) || "全部状态"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createCommentVNode(" 投诉列表 "),
            vue.createElementVNode("view", { class: "list-container" }, [
              $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "loading-state"
              }, [
                vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
              ])) : $data.complaintList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "complaint-list"
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.complaintList, (item) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: item.id,
                      class: "complaint-item"
                    }, [
                      vue.createElementVNode("view", { class: "item-header" }, [
                        vue.createElementVNode("view", { class: "title-row" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "item-title" },
                            vue.toDisplayString(item.type),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "time-text" },
                            vue.toDisplayString($options.formatTime(item.createTime)),
                            1
                            /* TEXT */
                          )
                        ]),
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-tag", $options.getStatusClass(item.status)])
                          },
                          vue.toDisplayString($options.getStatusText(item.status)),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "item-content" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "content-text" },
                          vue.toDisplayString(item.content),
                          1
                          /* TEXT */
                        ),
                        item.images ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "image-preview"
                        }, [
                          vue.createCommentVNode(" 假设 images 是逗号分隔的字符串 "),
                          (vue.openBlock(true), vue.createElementBlock(
                            vue.Fragment,
                            null,
                            vue.renderList(item.images.split(","), (img, index) => {
                              return vue.openBlock(), vue.createElementBlock("image", {
                                key: index,
                                src: img,
                                mode: "aspectFill",
                                class: "complain-img",
                                onClick: ($event) => $options.previewImage(item.images, index)
                              }, null, 8, ["src", "onClick"]);
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ])) : vue.createCommentVNode("v-if", true)
                      ]),
                      vue.createElementVNode("view", { class: "item-info" }, [
                        vue.createElementVNode("view", { class: "info-row" }, [
                          vue.createElementVNode("text", { class: "label" }, "投诉人："),
                          vue.createElementVNode("text", { class: "value" }, [
                            vue.createTextVNode(
                              vue.toDisplayString(item.ownerName || item.userName || "匿名") + " ",
                              1
                              /* TEXT */
                            ),
                            item.phone ? (vue.openBlock(), vue.createElementBlock("text", {
                              key: 0,
                              class: "phone",
                              onClick: ($event) => $options.makeCall(item.phone)
                            }, vue.toDisplayString(item.phone), 9, ["onClick"])) : vue.createCommentVNode("v-if", true)
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "info-row" }, [
                          vue.createElementVNode("text", { class: "label" }, "房号："),
                          item.buildingNo && item.houseNo ? (vue.openBlock(), vue.createElementBlock(
                            "text",
                            {
                              key: 0,
                              class: "value"
                            },
                            vue.toDisplayString(item.buildingNo) + "栋" + vue.toDisplayString(item.houseNo) + "室",
                            1
                            /* TEXT */
                          )) : (vue.openBlock(), vue.createElementBlock("text", {
                            key: 1,
                            class: "value"
                          }, "未绑定房屋"))
                        ]),
                        item.status === "DONE" ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "result-box"
                        }, [
                          vue.createElementVNode("text", { class: "label" }, "处理结果："),
                          vue.createElementVNode(
                            "text",
                            { class: "value" },
                            vue.toDisplayString(item.result),
                            1
                            /* TEXT */
                          )
                        ])) : vue.createCommentVNode("v-if", true)
                      ]),
                      vue.createElementVNode("view", { class: "item-footer" }, [
                        vue.createElementVNode("button", {
                          class: "action-btn handle",
                          onClick: ($event) => $options.openHandleModal(item)
                        }, vue.toDisplayString(String(item.status) === "PENDING" ? "立即处理" : "重新处理"), 9, ["onClick"]),
                        item.phone ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "action-btn call",
                          onClick: ($event) => $options.makeCall(item.phone)
                        }, " 联系业主 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                      ])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : (vue.openBlock(), vue.createElementBlock("view", {
                key: 2,
                class: "empty-state"
              }, [
                vue.createElementVNode("text", null, "暂无投诉记录")
              ])),
              vue.createCommentVNode(" 分页组件 "),
              $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 3,
                class: "pagination"
              }, [
                vue.createElementVNode("button", {
                  class: "page-btn",
                  disabled: $data.currentPage === 1,
                  onClick: _cache[7] || (_cache[7] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
                }, " 上一页 ", 8, ["disabled"]),
                vue.createElementVNode("view", { class: "page-info" }, [
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString($data.currentPage),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("text", { class: "page-separator" }, "/"),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString($options.totalPages),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("button", {
                  class: "page-btn",
                  disabled: $data.currentPage === $options.totalPages,
                  onClick: _cache[8] || (_cache[8] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
                }, " 下一页 ", 8, ["disabled"])
              ])) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createCommentVNode(" 处理弹窗 "),
            $data.showHandleModal ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "modal-mask",
              onClick: _cache[14] || (_cache[14] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
            }, [
              vue.createElementVNode("view", {
                class: "modal-content",
                onClick: _cache[13] || (_cache[13] = vue.withModifiers(() => {
                }, ["stop"]))
              }, [
                vue.createElementVNode("view", { class: "modal-header" }, [
                  vue.createElementVNode("text", { class: "modal-title" }, "处理投诉"),
                  vue.createElementVNode("text", {
                    class: "close-icon",
                    onClick: _cache[9] || (_cache[9] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
                  }, "×")
                ]),
                vue.createElementVNode("view", { class: "modal-body" }, [
                  vue.withDirectives(vue.createElementVNode(
                    "textarea",
                    {
                      "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $data.handleResult = $event),
                      placeholder: "请输入处理结果/回复内容",
                      class: "handle-textarea"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.handleResult]
                  ])
                ]),
                vue.createElementVNode("view", { class: "modal-footer" }, [
                  vue.createElementVNode("button", {
                    class: "cancel-btn",
                    onClick: _cache[11] || (_cache[11] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "confirm-btn",
                    onClick: _cache[12] || (_cache[12] = (...args) => $options.submitHandle && $options.submitHandle(...args))
                  }, "确认回复")
                ])
              ])
            ])) : vue.createCommentVNode("v-if", true)
          ])
        ];
      }),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminComplaintManage = /* @__PURE__ */ _export_sfc(_sfc_main$f, [["render", _sfc_render$e], ["__scopeId", "data-v-f00c65e1"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/complaint-manage.vue"]]);
  const _sfc_main$e = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        searchQuery: "",
        statusFilter: "",
        loading: false,
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "PENDING", label: "待审核" },
          { value: "APPROVED", label: "已通过" },
          { value: "REJECTED", label: "已拒绝" },
          { value: "EXPIRED", label: "已过期" }
        ],
        visitorList: [],
        // 分页相关
        currentPage: 1,
        pageSize: 10,
        total: 0,
        // 统计数据
        stats: {
          total: 0,
          pending: 0,
          approved: 0
        }
      };
    },
    computed: {
      totalPages() {
        return Math.ceil(this.total / this.pageSize) || 1;
      }
    },
    onLoad() {
      this.loadData();
      this.loadStats();
    },
    methods: {
      async loadData() {
        var _a, _b;
        this.loading = true;
        try {
          const params = {
            keyword: this.searchQuery || void 0,
            status: this.statusFilter || void 0,
            pageNum: this.currentPage,
            pageSize: this.pageSize
          };
          const data = await request("/api/visitor/list", { params }, "GET");
          const records = data.records || ((_a = data.data) == null ? void 0 : _a.records) || [];
          this.total = data.total || ((_b = data.data) == null ? void 0 : _b.total) || 0;
          this.visitorList = records.map((item) => ({
            id: item.id,
            visitorName: item.visitorName,
            visitorPhone: item.visitorPhone,
            ownerName: item.ownerName,
            buildingNo: item.buildingNo,
            houseNo: item.houseNo,
            visitTime: item.visitTime,
            reason: item.reason,
            carNo: item.carNo,
            status: item.status
            // PENDING/APPROVED/REJECTED/EXPIRED
          }));
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/visitor-manage.vue:213", "加载访客列表失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
          this.visitorList = [];
          this.total = 0;
        } finally {
          this.loading = false;
        }
      },
      // 加载统计数据
      async loadStats() {
        var _a, _b, _c;
        try {
          const totalReq = request("/api/visitor/list", { params: { pageSize: 1 } }, "GET");
          const pendingReq = request("/api/visitor/list", { params: { pageSize: 1, status: "PENDING" } }, "GET");
          const approvedReq = request("/api/visitor/list", { params: { pageSize: 1, status: "APPROVED" } }, "GET");
          const [totalRes, pendingRes, approvedRes] = await Promise.all([totalReq, pendingReq, approvedReq]);
          this.stats = {
            total: totalRes.total || ((_a = totalRes.data) == null ? void 0 : _a.total) || 0,
            pending: pendingRes.total || ((_b = pendingRes.data) == null ? void 0 : _b.total) || 0,
            approved: approvedRes.total || ((_c = approvedRes.data) == null ? void 0 : _c.total) || 0
          };
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/visitor-manage.vue:237", "加载统计数据失败", e);
        }
      },
      handleStatsClick(status) {
        this.statusFilter = status;
        this.searchQuery = "";
        this.currentPage = 1;
        this.loadData();
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadData();
      },
      handleStatusChange(e) {
        this.statusFilter = this.statusOptions[e.detail.value].value;
        this.currentPage = 1;
        this.loadData();
      },
      handlePrevPage() {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.loadData();
        }
      },
      handleNextPage() {
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.loadData();
        }
      },
      handleApprove(item) {
        uni.showModal({
          title: "通过审核",
          content: `确认允许 ${item.visitorName} 访问吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                const url = `/api/visitor/audit?id=${item.id}&status=APPROVED`;
                await request(url, {}, "PUT");
                item.status = "APPROVED";
                uni.showToast({ title: "审核通过", icon: "success" });
                this.loadStats();
              } catch (e) {
                uni.showToast({ title: "操作失败", icon: "none" });
              }
            }
          }
        });
      },
      handleReject(item) {
        uni.showModal({
          title: "拒绝申请",
          content: `确认拒绝 ${item.visitorName} 的访问申请吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                const url = `/api/visitor/audit?id=${item.id}&status=REJECTED`;
                await request(url, {}, "PUT");
                item.status = "REJECTED";
                uni.showToast({ title: "已拒绝", icon: "none" });
                this.loadStats();
              } catch (e) {
                uni.showToast({ title: "操作失败", icon: "none" });
              }
            }
          }
        });
      },
      makeCall(phone) {
        if (!phone)
          return;
        uni.makePhoneCall({ phoneNumber: phone });
      },
      getStatusClass(status) {
        return {
          "status-pending": status === "PENDING",
          "status-approved": status === "APPROVED",
          "status-rejected": status === "REJECTED",
          "status-expired": status === "EXPIRED"
        };
      },
      getStatusText(status) {
        const map = {
          "PENDING": "待审核",
          "APPROVED": "已通过",
          "REJECTED": "已拒绝",
          "EXPIRED": "已过期"
        };
        return map[status] || status;
      },
      formatTime(time) {
        return time;
      }
    }
  };
  function _sfc_render$d(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[9] || (_cache[9] = ($event) => $data.showSidebar = $event),
      pageTitle: "访客审核",
      currentPage: "/admin/pages/admin/visitor-manage"
    }, {
      default: vue.withCtx(() => {
        var _a;
        return [
          vue.createElementVNode("view", { class: "manage-container" }, [
            vue.createCommentVNode(" 统计卡片 "),
            vue.createElementVNode("view", { class: "stats-card-container" }, [
              vue.createElementVNode("view", {
                class: "stats-card",
                onClick: _cache[0] || (_cache[0] = ($event) => $options.handleStatsClick(""))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "总访问数")
              ]),
              vue.createElementVNode("view", {
                class: "stats-card status-pending",
                onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick("PENDING"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "待审核")
              ]),
              vue.createElementVNode("view", {
                class: "stats-card status-approved",
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("APPROVED"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.approved),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "已通过")
              ])
            ]),
            vue.createCommentVNode(" 搜索和筛选栏 "),
            vue.createElementVNode("view", { class: "search-filter-bar" }, [
              vue.createElementVNode("view", { class: "search-box" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    placeholder: "搜索访客姓名、业主姓名",
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.searchQuery = $event),
                    onConfirm: _cache[4] || (_cache[4] = (...args) => $options.handleSearch && $options.handleSearch(...args)),
                    class: "search-input"
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ]),
                vue.createElementVNode("button", {
                  class: "search-btn",
                  onClick: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                }, "搜索")
              ]),
              vue.createElementVNode("view", { class: "filter-row" }, [
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $data.statusOptions.findIndex((opt) => opt.value === $data.statusFilter),
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args)),
                  class: "filter-picker"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "filter-picker-text" },
                    vue.toDisplayString(((_a = $data.statusOptions.find((opt) => opt.value === $data.statusFilter)) == null ? void 0 : _a.label) || "全部状态"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createCommentVNode(" 访客列表 "),
            vue.createElementVNode("view", { class: "list-container" }, [
              $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "loading-state"
              }, [
                vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
              ])) : $data.visitorList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "visitor-list"
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.visitorList, (item) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: item.id,
                      class: "visitor-item"
                    }, [
                      vue.createElementVNode("view", { class: "item-header" }, [
                        vue.createElementVNode("view", { class: "header-left" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "item-title" },
                            vue.toDisplayString(item.visitorName),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("text", {
                            class: "phone-text",
                            onClick: ($event) => $options.makeCall(item.visitorPhone)
                          }, vue.toDisplayString(item.visitorPhone), 9, ["onClick"])
                        ]),
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-tag", $options.getStatusClass(item.status)])
                          },
                          vue.toDisplayString($options.getStatusText(item.status)),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "item-body" }, [
                        vue.createElementVNode("view", { class: "info-grid" }, [
                          vue.createElementVNode("view", { class: "info-item" }, [
                            vue.createElementVNode("text", { class: "label" }, "访问对象"),
                            vue.createElementVNode(
                              "text",
                              { class: "value" },
                              vue.toDisplayString(item.ownerName),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "info-item" }, [
                            vue.createElementVNode("text", { class: "label" }, "房号"),
                            vue.createElementVNode(
                              "text",
                              { class: "value" },
                              vue.toDisplayString(item.buildingNo) + "栋" + vue.toDisplayString(item.houseNo) + "室",
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "info-item full" }, [
                            vue.createElementVNode("text", { class: "label" }, "访问时间"),
                            vue.createElementVNode(
                              "text",
                              { class: "value highlight" },
                              vue.toDisplayString($options.formatTime(item.visitTime)),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "info-item" }, [
                            vue.createElementVNode("text", { class: "label" }, "访问事由"),
                            vue.createElementVNode(
                              "text",
                              { class: "value" },
                              vue.toDisplayString(item.reason),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "info-item" }, [
                            vue.createElementVNode("text", { class: "label" }, "车牌号"),
                            vue.createElementVNode(
                              "text",
                              { class: "value" },
                              vue.toDisplayString(item.carNo || "无"),
                              1
                              /* TEXT */
                            )
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "item-footer" }, [
                        vue.createElementVNode("button", {
                          class: "action-btn call",
                          onClick: ($event) => $options.makeCall(item.visitorPhone)
                        }, "联系访客", 8, ["onClick"]),
                        item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "audit-btns"
                        }, [
                          vue.createElementVNode("button", {
                            class: "action-btn reject",
                            onClick: ($event) => $options.handleReject(item)
                          }, "拒绝", 8, ["onClick"]),
                          vue.createElementVNode("button", {
                            class: "action-btn approve",
                            onClick: ($event) => $options.handleApprove(item)
                          }, "通过", 8, ["onClick"])
                        ])) : vue.createCommentVNode("v-if", true)
                      ])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : (vue.openBlock(), vue.createElementBlock("view", {
                key: 2,
                class: "empty-state"
              }, [
                vue.createElementVNode("text", null, "暂无访客申请记录")
              ])),
              vue.createCommentVNode(" 分页组件 "),
              $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 3,
                class: "pagination"
              }, [
                vue.createElementVNode("button", {
                  class: "page-btn",
                  disabled: $data.currentPage === 1,
                  onClick: _cache[7] || (_cache[7] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
                }, " 上一页 ", 8, ["disabled"]),
                vue.createElementVNode("view", { class: "page-info" }, [
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString($data.currentPage),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("text", { class: "page-separator" }, "/"),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString($options.totalPages),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("button", {
                  class: "page-btn",
                  disabled: $data.currentPage === $options.totalPages,
                  onClick: _cache[8] || (_cache[8] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
                }, " 下一页 ", 8, ["disabled"])
              ])) : vue.createCommentVNode("v-if", true)
            ])
          ])
        ];
      }),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminVisitorManage = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["render", _sfc_render$d], ["__scopeId", "data-v-20feed08"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/visitor-manage.vue"]]);
  const _sfc_main$d = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        loading: false,
        activityList: []
      };
    },
    onShow() {
      this.loadData();
    },
    methods: {
      async loadData() {
        this.loading = true;
        try {
          const params = {
            keyword: this.searchQuery || void 0
          };
          const data = await request("/api/activity/list", { params }, "GET");
          const list = data.records || data || [];
          this.activityList = list.map((item) => ({
            id: item.id,
            title: item.title,
            startTime: item.startTime,
            location: item.location,
            signupCount: item.signupCount || 0,
            maxCount: item.maxCount,
            status: item.status,
            // 直接使用后端返回的 status (PUBLISHED/DRAFT/ONLINE等)
            cover: item.cover || "/static/default-cover.png"
          }));
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/activity-manage.vue:93", "加载活动列表失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      // 移除 getStatus 方法，直接使用后端 status 字段映射样式和文本
      handleCreate() {
        uni.navigateTo({ url: "/admin/pages/admin/activity-edit" });
      },
      handleEdit(item) {
        uni.navigateTo({ url: `/admin/pages/admin/activity-edit?id=${item.id}` });
      },
      handleViewSignups(item) {
        uni.navigateTo({ url: `/admin/pages/admin/activity-signups?id=${item.id}` });
      },
      handleDelete(item) {
        uni.showModal({
          title: "确认删除",
          content: "确定要删除该活动吗？",
          success: async (res) => {
            if (res.confirm) {
              try {
                await request(`/api/activity/${item.id}`, {}, "DELETE");
                this.activityList = this.activityList.filter((i) => i.id !== item.id);
                uni.showToast({ title: "删除成功", icon: "success" });
              } catch (e) {
                uni.showToast({ title: "删除失败", icon: "none" });
              }
            }
          }
        });
      },
      getStatusClass(status) {
        const map = {
          "PUBLISHED": "status-published",
          "DRAFT": "status-draft",
          "ONLINE": "status-online",
          "ENDED": "status-ended"
        };
        return map[status] || "status-default";
      },
      getStatusText(status) {
        const map = {
          "PUBLISHED": "已发布",
          "DRAFT": "草稿",
          "ONLINE": "报名中",
          // 或进行中
          "ENDED": "已结束"
        };
        return map[status] || status;
      },
      formatTime(time) {
        return time;
      }
    }
  };
  function _sfc_render$c(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[1] || (_cache[1] = ($event) => $data.showSidebar = $event),
      pageTitle: "社区活动",
      currentPage: "/admin/pages/admin/activity-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createCommentVNode(" 操作栏 "),
          vue.createElementVNode("view", { class: "action-bar" }, [
            vue.createElementVNode("button", {
              class: "create-btn",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.handleCreate && $options.handleCreate(...args))
            }, "发布新活动")
          ]),
          vue.createCommentVNode(" 活动列表 "),
          vue.createElementVNode("view", { class: "list-container" }, [
            $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "loading-state"
            }, [
              vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
            ])) : $data.activityList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "activity-list"
            }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.activityList, (item) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: item.id,
                    class: "activity-item"
                  }, [
                    vue.createElementVNode("image", {
                      src: item.cover || "/static/default-cover.png",
                      mode: "aspectFill",
                      class: "cover-img"
                    }, null, 8, ["src"]),
                    vue.createElementVNode("view", { class: "item-content" }, [
                      vue.createElementVNode("view", { class: "item-header" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "item-title" },
                          vue.toDisplayString(item.title),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-tag", $options.getStatusClass(item.status)])
                          },
                          vue.toDisplayString($options.getStatusText(item.status)),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "item-info" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "time" },
                          "时间：" + vue.toDisplayString($options.formatTime(item.startTime)),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "location" },
                          "地点：" + vue.toDisplayString(item.location),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "signup-count" },
                          "报名人数：" + vue.toDisplayString(item.signupCount) + "/" + vue.toDisplayString(item.maxCount || "不限"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "item-footer" }, [
                        vue.createElementVNode("button", {
                          class: "mini-btn",
                          onClick: ($event) => $options.handleEdit(item)
                        }, "编辑", 8, ["onClick"]),
                        vue.createElementVNode("button", {
                          class: "mini-btn",
                          onClick: ($event) => $options.handleViewSignups(item)
                        }, "报名管理", 8, ["onClick"]),
                        vue.createElementVNode("button", {
                          class: "mini-btn delete",
                          onClick: ($event) => $options.handleDelete(item)
                        }, "删除", 8, ["onClick"])
                      ])
                    ])
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : (vue.openBlock(), vue.createElementBlock("view", {
              key: 2,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无活动")
            ]))
          ])
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminActivityManage = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["render", _sfc_render$c], ["__scopeId", "data-v-de138e10"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/activity-manage.vue"]]);
  const _sfc_main$c = {
    data() {
      return {
        activityId: null,
        form: {
          title: "",
          date: "",
          time: "",
          location: "",
          maxCount: "",
          content: ""
        }
      };
    },
    onLoad(options) {
      if (options.id) {
        this.activityId = options.id;
        this.loadActivityData(options.id);
        uni.setNavigationBarTitle({ title: "编辑活动" });
      }
    },
    methods: {
      async loadActivityData(id) {
        try {
          uni.showLoading({ title: "加载中..." });
          const res = await request(`/api/activity/${id}`, {}, "GET");
          if (res) {
            const [date, time] = (res.startTime || "").split("T");
            this.form = {
              title: res.title,
              content: res.content,
              date: date || "",
              time: (time || "").slice(0, 5),
              // 强制截取前5位 HH:mm
              location: res.location,
              maxCount: res.maxCount
            };
          }
          uni.hideLoading();
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: "加载失败", icon: "none" });
        }
      },
      bindDateChange(e) {
        this.form.date = e.detail.value;
      },
      bindTimeChange(e) {
        this.form.time = e.detail.value;
      },
      handlePublishCheck() {
        if (!this.validateForm())
          return;
        uni.showModal({
          title: "确认发布",
          content: "确定要立即发布该活动吗？取消则存为草稿。",
          cancelText: "存为草稿",
          confirmText: "确认发布",
          success: (res) => {
            if (res.confirm) {
              this.submitData("PUBLISHED");
            } else if (res.cancel) {
              this.submitData("DRAFT");
            }
          }
        });
      },
      handleDraft() {
        if (!this.validateForm())
          return;
        this.submitData("DRAFT");
      },
      validateForm() {
        if (!this.form.title || !this.form.date || !this.form.location) {
          uni.showToast({ title: "请完善信息", icon: "none" });
          return false;
        }
        return true;
      },
      async submitData(status) {
        try {
          uni.showLoading({ title: "提交中..." });
          let rawTime = this.form.time || "00:00";
          if (rawTime.length > 5) {
            rawTime = rawTime.substring(0, 5);
          }
          const cleanTime = rawTime + ":00";
          const startTime = `${this.form.date} ${cleanTime}`;
          formatAppLog("log", "at admin/pages/admin/activity-edit.vue:155", "清洗后的时间:", startTime);
          const data = {
            id: this.activityId,
            // 编辑时带上ID
            title: this.form.title,
            content: this.form.content,
            startTime,
            // 移除冗余的下划线字段，避免 400 错误
            location: this.form.location,
            maxCount: this.form.maxCount ? parseInt(this.form.maxCount) : null,
            status,
            coverUrl: ""
          };
          if (this.form.date.includes(" ")) {
            formatAppLog("warn", "at admin/pages/admin/activity-edit.vue:173", "Date字段异常:", this.form.date);
            const realDate = this.form.date.split(" ")[0];
            data.startTime = `${realDate} ${cleanTime}`;
          } else {
            data.startTime = `${this.form.date} ${cleanTime}`;
          }
          formatAppLog("log", "at admin/pages/admin/activity-edit.vue:180", "最终提交数据:", JSON.stringify(data));
          if (this.activityId) {
            formatAppLog("log", "at admin/pages/admin/activity-edit.vue:204", "正在更新活动, 数据:", JSON.stringify(data));
            if (data.id)
              data.id = parseInt(data.id);
            await request("/api/activity", data, "PUT");
          } else {
            await request("/api/activity/publish", data, "POST");
          }
          uni.hideLoading();
          uni.showToast({
            title: status === "DRAFT" ? "已存草稿" : "发布成功",
            icon: "success"
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: "提交失败", icon: "none" });
          formatAppLog("error", "at admin/pages/admin/activity-edit.vue:235", "活动提交失败", e);
        }
      }
    }
  };
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "edit-container" }, [
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "活动标题"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.title = $event),
            placeholder: "请输入活动标题"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.title]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "活动时间"),
        vue.createElementVNode(
          "picker",
          {
            mode: "date",
            onChange: _cache[1] || (_cache[1] = (...args) => $options.bindDateChange && $options.bindDateChange(...args))
          },
          [
            vue.createElementVNode(
              "view",
              { class: "picker" },
              vue.toDisplayString($data.form.date || "请选择日期"),
              1
              /* TEXT */
            )
          ],
          32
          /* NEED_HYDRATION */
        ),
        vue.createElementVNode(
          "picker",
          {
            mode: "time",
            onChange: _cache[2] || (_cache[2] = (...args) => $options.bindTimeChange && $options.bindTimeChange(...args))
          },
          [
            vue.createElementVNode(
              "view",
              { class: "picker" },
              vue.toDisplayString($data.form.time || "请选择时间"),
              1
              /* TEXT */
            )
          ],
          32
          /* NEED_HYDRATION */
        )
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "活动地点"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.form.location = $event),
            placeholder: "请输入活动地点"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.location]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "最大报名人数"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            type: "number",
            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.form.maxCount = $event),
            placeholder: "0表示不限"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.maxCount]
        ])
      ]),
      vue.createElementVNode("view", { class: "form-item" }, [
        vue.createElementVNode("text", { class: "label" }, "活动详情"),
        vue.withDirectives(vue.createElementVNode(
          "textarea",
          {
            class: "textarea",
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.form.content = $event),
            placeholder: "请输入活动详情描述"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.content]
        ])
      ]),
      vue.createElementVNode("view", { class: "btn-group" }, [
        vue.createElementVNode("button", {
          class: "submit-btn draft",
          onClick: _cache[6] || (_cache[6] = (...args) => $options.handleDraft && $options.handleDraft(...args))
        }, "存为草稿"),
        vue.createElementVNode("button", {
          class: "submit-btn publish",
          onClick: _cache[7] || (_cache[7] = (...args) => $options.handlePublishCheck && $options.handlePublishCheck(...args))
        }, "发布活动")
      ])
    ]);
  }
  const AdminPagesAdminActivityEdit = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__scopeId", "data-v-3b54f228"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/activity-edit.vue"]]);
  const _sfc_main$b = {
    data() {
      return {
        activityId: null,
        list: [],
        total: 0,
        loading: false,
        pageNum: 1,
        pageSize: 20,
        hasMore: true
      };
    },
    onLoad(options) {
      if (options.id) {
        this.activityId = options.id;
        this.loadData();
      }
    },
    onPullDownRefresh() {
      this.pageNum = 1;
      this.hasMore = true;
      this.loadData().then(() => {
        uni.stopPullDownRefresh();
      });
    },
    onReachBottom() {
      if (this.hasMore && !this.loading) {
        this.pageNum++;
        this.loadData();
      }
    },
    methods: {
      async loadData() {
        if (this.loading)
          return;
        this.loading = true;
        try {
          const res = await request("/api/activity/signup/list", {
            params: {
              activityId: this.activityId,
              pageNum: this.pageNum,
              pageSize: this.pageSize
            }
          }, "GET");
          const records = res.records || [];
          this.total = res.total || 0;
          if (this.pageNum === 1) {
            this.list = records;
          } else {
            this.list = [...this.list, ...records];
          }
          this.hasMore = records.length === this.pageSize;
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/activity-signups.vue:95", "加载报名列表失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      formatTime(time) {
        if (!time)
          return "";
        return time.replace("T", " ");
      }
    }
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", { class: "title" }, "报名列表"),
        vue.createElementVNode(
          "view",
          { class: "subtitle" },
          "共 " + vue.toDisplayString($data.total) + " 人报名",
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("view", { class: "list-container" }, [
        $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading-state"
        }, [
          vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
        ])) : $data.list.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "signup-list"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.list, (item, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "signup-item"
              }, [
                vue.createElementVNode("view", { class: "item-left" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "index" },
                    vue.toDisplayString(index + 1),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("view", { class: "user-info" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "name" },
                      vue.toDisplayString(item.userName || "未知用户"),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "text",
                      { class: "phone" },
                      vue.toDisplayString(item.userPhone || "暂无电话"),
                      1
                      /* TEXT */
                    )
                  ])
                ]),
                vue.createElementVNode("view", { class: "item-right" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "time" },
                    vue.toDisplayString($options.formatTime(item.signupTime)),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "status" },
                    vue.toDisplayString(item.status === "CANCELLED" ? "已取消" : "已报名"),
                    1
                    /* TEXT */
                  )
                ])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "empty-state"
        }, [
          vue.createElementVNode("text", null, "暂无报名记录")
        ]))
      ])
    ]);
  }
  const AdminPagesAdminActivitySignups = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__scopeId", "data-v-f56b704f"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/activity-signups.vue"]]);
  const _sfc_main$a = {
    data() {
      return {
        currentTab: "PENDING",
        list: [],
        tempItem: null
        // 当前操作的项
      };
    },
    onShow() {
      this.loadData();
    },
    methods: {
      switchTab(tab) {
        this.currentTab = tab;
        this.loadData();
      },
      statusText(status) {
        const map = {
          "PENDING": "待审核",
          "APPROVED": "已通过",
          "REJECTED": "已拒绝",
          "AWAITING_PAYMENT": "待缴费"
        };
        return map[status] || status;
      },
      async loadData() {
        try {
          uni.showLoading({ title: "加载中..." });
          const status = this.currentTab === "PENDING" ? "PENDING" : "";
          const res = await request({
            url: "/api/vehicle/audit/list",
            // 适配新路径
            method: "GET",
            params: { status }
          });
          formatAppLog("log", "at admin/pages/admin/car-audit.vue:122", "【DEBUG】车辆审核列表数据:", JSON.stringify(res));
          let rawList = Array.isArray(res) ? res : res.records || [];
          this.list = rawList.map((item) => ({
            ...item,
            // 尝试兼容常见的字段名
            ownerName: item.ownerName || item.userName || item.name || "未知用户",
            phone: item.phone || item.mobile || item.phoneNumber || "-",
            brand: item.brand || item.carBrand || "-",
            color: item.color || item.carColor || "-"
          }));
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/car-audit.vue:136", "加载失败", e);
          this.mockData();
        } finally {
          uni.hideLoading();
        }
      },
      mockData() {
        if (this.currentTab === "PENDING") {
          this.list = [
            {
              id: 1,
              plateNo: "粤A88888",
              status: "PENDING",
              ownerName: "张三",
              phone: "13800138000",
              brand: "奔驰",
              color: "黑色",
              spaceNo: "A-101",
              createTime: "2023-10-27 10:30:00"
            }
          ];
        } else {
          this.list = [
            {
              id: 2,
              plateNo: "粤B12345",
              status: "APPROVED",
              ownerName: "李四",
              phone: "13900139000",
              brand: "宝马",
              color: "白色",
              spaceNo: "A-102",
              createTime: "2023-10-26 15:20:00"
            }
          ];
        }
      },
      handleApprove(item) {
        uni.showModal({
          title: "确认通过",
          content: `确认通过车辆 ${item.plateNo} 的绑定申请吗？
通过后业主将需要进行缴费。`,
          success: async (res) => {
            if (res.confirm) {
              await this.submitAudit(item.id, "AWAITING_PAYMENT");
            }
          }
        });
      },
      handleReject(item) {
        uni.showModal({
          title: "拒绝申请",
          editable: true,
          placeholderText: "请输入拒绝原因",
          success: async (res) => {
            if (res.confirm) {
              const reason = res.content;
              if (!reason) {
                uni.showToast({ title: "请输入原因", icon: "none" });
                return;
              }
              await this.submitAudit(item.id, "REJECTED", reason);
            }
          }
        });
      },
      // async confirmReject(value) {
      //   if (!value) {
      //     uni.showToast({ title: '请输入拒绝原因', icon: 'none' })
      //     return
      //   }
      //   await this.submitAudit(this.tempItem.id, 'REJECTED', value)
      //   this.$refs.rejectPopup.close()
      // },
      // closeReject() {
      //   this.$refs.rejectPopup.close()
      // },
      async submitAudit(id, status, reason = "") {
        try {
          uni.showLoading({ title: "处理中..." });
          await request("/api/vehicle/audit", {
            id,
            status,
            rejectReason: reason
          }, "POST");
          uni.hideLoading();
          uni.showToast({ title: "操作成功", icon: "success" });
          this.loadData();
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: "操作成功(演示)", icon: "success" });
          this.list = this.list.filter((i) => i.id !== id);
        }
      }
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createCommentVNode(" 顶部选项卡 "),
      vue.createElementVNode("view", { class: "tabs" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab-item", { active: $data.currentTab === "PENDING" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $options.switchTab("PENDING"))
          },
          " 待审核 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab-item", { active: $data.currentTab === "HISTORY" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $options.switchTab("HISTORY"))
          },
          " 审核记录 ",
          2
          /* CLASS */
        )
      ]),
      vue.createCommentVNode(" 列表内容 "),
      vue.createElementVNode("view", { class: "list-container" }, [
        $data.list.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "empty-tip"
        }, "暂无数据")) : vue.createCommentVNode("v-if", true),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.list, (item) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "card",
              key: item.id
            }, [
              vue.createElementVNode("view", { class: "card-header" }, [
                vue.createElementVNode(
                  "text",
                  { class: "plate-no" },
                  vue.toDisplayString(item.plateNo),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  {
                    class: vue.normalizeClass(["status-tag", item.status])
                  },
                  vue.toDisplayString($options.statusText(item.status)),
                  3
                  /* TEXT, CLASS */
                )
              ]),
              vue.createElementVNode("view", { class: "card-body" }, [
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "申请人"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(item.ownerName) + " (" + vue.toDisplayString(item.phone) + ")",
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "车辆信息"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(item.brand) + " - " + vue.toDisplayString(item.color),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "申请车位"),
                  vue.createElementVNode(
                    "text",
                    { class: "value highlight" },
                    vue.toDisplayString(item.spaceNo),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "info-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "申请时间"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(item.createTime),
                    1
                    /* TEXT */
                  )
                ]),
                item.status === "REJECTED" ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "info-row reject-reason"
                }, [
                  vue.createElementVNode("text", { class: "label" }, "拒绝原因"),
                  vue.createElementVNode(
                    "text",
                    { class: "value" },
                    vue.toDisplayString(item.rejectReason),
                    1
                    /* TEXT */
                  )
                ])) : vue.createCommentVNode("v-if", true)
              ]),
              vue.createCommentVNode(" 操作按钮 (仅待审核状态显示) "),
              item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "card-footer"
              }, [
                vue.createElementVNode("button", {
                  class: "btn reject",
                  onClick: ($event) => $options.handleReject(item)
                }, "拒绝", 8, ["onClick"]),
                vue.createElementVNode("button", {
                  class: "btn approve",
                  onClick: ($event) => $options.handleApprove(item)
                }, "通过", 8, ["onClick"])
              ])) : vue.createCommentVNode("v-if", true)
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createCommentVNode(" 拒绝原因弹窗 "),
      vue.createCommentVNode(' <uni-popup ref="rejectPopup" type="dialog">\n      <uni-popup-dialog \n        mode="input" \n        title="拒绝申请" \n        placeholder="请输入拒绝原因" \n        :before-close="true" \n        @confirm="confirmReject" \n        @close="closeReject"\n      ></uni-popup-dialog>\n    </uni-popup> ')
    ]);
  }
  const AdminPagesAdminCarAudit = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__scopeId", "data-v-9dc841ea"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/car-audit.vue"]]);
  const _sfc_main$9 = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        loading: false,
        queryParams: {
          pageNum: 1,
          pageSize: 10,
          title: "",
          operName: "",
          status: ""
          // 0正常 1异常
        },
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: 0, label: "正常" },
          { value: 1, label: "异常" }
        ],
        logList: [],
        total: 0,
        // 详情弹窗
        showDetailModal: false,
        currentLog: {}
      };
    },
    computed: {
      totalPages() {
        return Math.ceil(this.total / this.queryParams.pageSize) || 1;
      }
    },
    onLoad() {
      this.loadData();
    },
    methods: {
      async loadData() {
        var _a, _b;
        this.loading = true;
        try {
          const params = {
            ...this.queryParams,
            status: this.queryParams.status === "" ? void 0 : this.queryParams.status
          };
          const res = await request("/api/monitor/operlog/list", { params }, "GET");
          const records = res.records || ((_a = res.data) == null ? void 0 : _a.records) || [];
          this.total = res.total || ((_b = res.data) == null ? void 0 : _b.total) || 0;
          this.logList = records;
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/oper-log.vue:216", "加载日志失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      handleSearch() {
        this.queryParams.pageNum = 1;
        this.loadData();
      },
      handleReset() {
        this.queryParams = {
          pageNum: 1,
          pageSize: 10,
          title: "",
          operName: "",
          status: ""
        };
        this.loadData();
      },
      handleStatusChange(e) {
        this.queryParams.status = this.statusOptions[e.detail.value].value;
      },
      handleClean() {
        uni.showModal({
          title: "警告",
          content: "确定要清空所有操作日志吗？此操作不可恢复！",
          confirmColor: "#ff4757",
          success: async (res) => {
            if (res.confirm) {
              try {
                await request("/api/monitor/operlog/clean", {}, "DELETE");
                uni.showToast({ title: "清空成功", icon: "success" });
                this.handleReset();
              } catch (e) {
                uni.showToast({ title: "清空失败", icon: "none" });
              }
            }
          }
        });
      },
      handleDetail(item) {
        this.currentLog = item;
        this.showDetailModal = true;
      },
      closeDetailModal() {
        this.showDetailModal = false;
      },
      handlePrevPage() {
        if (this.queryParams.pageNum > 1) {
          this.queryParams.pageNum--;
          this.loadData();
        }
      },
      handleNextPage() {
        if (this.queryParams.pageNum < this.totalPages) {
          this.queryParams.pageNum++;
          this.loadData();
        }
      },
      getBusinessType(type) {
        const map = {
          0: "其它",
          1: "新增",
          2: "修改",
          3: "删除",
          4: "授权",
          5: "导出",
          6: "导入",
          7: "强退",
          8: "生成代码",
          9: "清空数据"
        };
        return map[type] || type;
      },
      formatTime(time) {
        if (!time)
          return "";
        return new Date(time).toLocaleString();
      }
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[12] || (_cache[12] = ($event) => $data.showSidebar = $event),
      pageTitle: "操作日志",
      currentPage: "/admin/pages/admin/oper-log"
    }, {
      default: vue.withCtx(() => {
        var _a;
        return [
          vue.createElementVNode("view", { class: "manage-container" }, [
            vue.createCommentVNode(" 搜索和筛选栏 "),
            vue.createElementVNode("view", { class: "search-filter-bar" }, [
              vue.createElementVNode("view", { class: "search-row" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    placeholder: "请输入模块标题",
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.queryParams.title = $event),
                    class: "search-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.queryParams.title]
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    placeholder: "请输入操作人员",
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.queryParams.operName = $event),
                    class: "search-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.queryParams.operName]
                ])
              ]),
              vue.createElementVNode("view", { class: "search-row" }, [
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $data.statusOptions.findIndex((opt) => opt.value === $data.queryParams.status),
                  onChange: _cache[2] || (_cache[2] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args)),
                  class: "filter-picker"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "filter-picker-text" },
                    vue.toDisplayString(((_a = $data.statusOptions.find((opt) => opt.value === $data.queryParams.status)) == null ? void 0 : _a.label) || "全部状态"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range", "value"]),
                vue.createElementVNode("view", { class: "btn-group" }, [
                  vue.createElementVNode("button", {
                    class: "action-btn search",
                    onClick: _cache[3] || (_cache[3] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  }, "搜索"),
                  vue.createElementVNode("button", {
                    class: "action-btn reset",
                    onClick: _cache[4] || (_cache[4] = (...args) => $options.handleReset && $options.handleReset(...args))
                  }, "重置")
                ])
              ])
            ]),
            vue.createCommentVNode(" 操作栏 "),
            vue.createElementVNode("view", { class: "action-bar" }, [
              vue.createElementVNode("button", {
                class: "action-btn clean",
                onClick: _cache[5] || (_cache[5] = (...args) => $options.handleClean && $options.handleClean(...args))
              }, "清空日志")
            ]),
            vue.createCommentVNode(" 日志列表 "),
            vue.createElementVNode("view", { class: "list-container" }, [
              $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "loading-state"
              }, [
                vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
              ])) : $data.logList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "log-list"
              }, [
                vue.createCommentVNode(" 表头 (仅在大屏或模拟表格时显示，这里用卡片布局更适合移动端，但尝试模拟表格头部) "),
                vue.createElementVNode("view", { class: "list-header" }, [
                  vue.createElementVNode("text", { class: "col id" }, "日志编号"),
                  vue.createElementVNode("text", { class: "col title" }, "系统模块"),
                  vue.createElementVNode("text", { class: "col type" }, "业务类型"),
                  vue.createElementVNode("text", { class: "col user" }, "操作人员"),
                  vue.createElementVNode("text", { class: "col status" }, "状态"),
                  vue.createElementVNode("text", { class: "col time" }, "操作日期"),
                  vue.createElementVNode("text", { class: "col action" }, "操作")
                ]),
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.logList, (item) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: item.id,
                      class: "log-item"
                    }, [
                      vue.createElementVNode(
                        "text",
                        { class: "col id" },
                        vue.toDisplayString(item.id),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "col title" },
                        vue.toDisplayString(item.title),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "col type" },
                        vue.toDisplayString($options.getBusinessType(item.businessType)),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "col user" },
                        vue.toDisplayString(item.operName),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("view", { class: "col status" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-tag", item.status === 0 ? "success" : "fail"])
                          },
                          vue.toDisplayString(item.status === 0 ? "正常" : "失败"),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode(
                        "text",
                        { class: "col time" },
                        vue.toDisplayString($options.formatTime(item.operTime)),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("view", { class: "col action" }, [
                        vue.createElementVNode("button", {
                          class: "detail-btn",
                          onClick: ($event) => $options.handleDetail(item)
                        }, "详细", 8, ["onClick"])
                      ])
                    ]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : (vue.openBlock(), vue.createElementBlock("view", {
                key: 2,
                class: "empty-state"
              }, [
                vue.createElementVNode("text", null, "暂无操作日志")
              ])),
              vue.createCommentVNode(" 分页组件 "),
              $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 3,
                class: "pagination"
              }, [
                vue.createElementVNode("button", {
                  class: "page-btn",
                  disabled: $data.queryParams.pageNum === 1,
                  onClick: _cache[6] || (_cache[6] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
                }, " 上一页 ", 8, ["disabled"]),
                vue.createElementVNode("view", { class: "page-info" }, [
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString($data.queryParams.pageNum),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("text", { class: "page-separator" }, "/"),
                  vue.createElementVNode(
                    "text",
                    null,
                    vue.toDisplayString($options.totalPages),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("button", {
                  class: "page-btn",
                  disabled: $data.queryParams.pageNum === $options.totalPages,
                  onClick: _cache[7] || (_cache[7] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
                }, " 下一页 ", 8, ["disabled"])
              ])) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createCommentVNode(" 详情弹窗 "),
            $data.showDetailModal ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "modal-mask",
              onClick: _cache[11] || (_cache[11] = (...args) => $options.closeDetailModal && $options.closeDetailModal(...args))
            }, [
              vue.createElementVNode("view", {
                class: "modal-content",
                onClick: _cache[10] || (_cache[10] = vue.withModifiers(() => {
                }, ["stop"]))
              }, [
                vue.createElementVNode("view", { class: "modal-header" }, [
                  vue.createElementVNode("text", { class: "modal-title" }, "操作日志详情"),
                  vue.createElementVNode("text", {
                    class: "close-btn",
                    onClick: _cache[8] || (_cache[8] = (...args) => $options.closeDetailModal && $options.closeDetailModal(...args))
                  }, "×")
                ]),
                vue.createElementVNode("scroll-view", {
                  "scroll-y": "",
                  class: "modal-body"
                }, [
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "label" }, "操作模块："),
                    vue.createElementVNode(
                      "text",
                      { class: "value" },
                      vue.toDisplayString($data.currentLog.title) + " / " + vue.toDisplayString($options.getBusinessType($data.currentLog.businessType)),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "label" }, "请求地址："),
                    vue.createElementVNode(
                      "text",
                      { class: "value" },
                      vue.toDisplayString($data.currentLog.operUrl),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "label" }, "请求方式："),
                    vue.createElementVNode(
                      "text",
                      { class: "value" },
                      vue.toDisplayString($data.currentLog.requestMethod),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "label" }, "操作方法："),
                    vue.createElementVNode(
                      "text",
                      { class: "value code" },
                      vue.toDisplayString($data.currentLog.method),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "label" }, "请求参数："),
                    vue.createElementVNode(
                      "text",
                      { class: "value code" },
                      vue.toDisplayString($data.currentLog.operParam),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "label" }, "返回结果："),
                    vue.createElementVNode(
                      "text",
                      { class: "value code" },
                      vue.toDisplayString($data.currentLog.jsonResult),
                      1
                      /* TEXT */
                    )
                  ]),
                  $data.currentLog.status === 1 ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 0,
                    class: "detail-item"
                  }, [
                    vue.createElementVNode("text", { class: "label error" }, "错误信息："),
                    vue.createElementVNode(
                      "text",
                      { class: "value error" },
                      vue.toDisplayString($data.currentLog.errorMsg),
                      1
                      /* TEXT */
                    )
                  ])) : vue.createCommentVNode("v-if", true)
                ]),
                vue.createElementVNode("view", { class: "modal-footer" }, [
                  vue.createElementVNode("button", {
                    class: "modal-btn",
                    onClick: _cache[9] || (_cache[9] = (...args) => $options.closeDetailModal && $options.closeDetailModal(...args))
                  }, "关闭")
                ])
              ])
            ])) : vue.createCommentVNode("v-if", true)
          ])
        ];
      }),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminOperLog = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__scopeId", "data-v-3c9e5688"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/oper-log.vue"]]);
  const _sfc_main$8 = {
    data() {
      return {
        notices: []
      };
    },
    onShow() {
      this.loadNotices();
    },
    methods: {
      async loadNotices() {
        const user = uni.getStorageSync("userInfo");
        if (!(user == null ? void 0 : user.id))
          return;
        try {
          const data = await request({
            url: "/api/notice/list",
            method: "GET",
            params: {
              userId: user.id,
              pageNum: 1,
              pageSize: 100
            }
          });
          const records = data.records || [];
          this.notices = records.map((item) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            publishTime: item.publishTime,
            readFlag: item.readFlag,
            time: this.formatTime(item.publishTime),
            tag: this.getTag(item.targetType)
          }));
          formatAppLog("log", "at owner/pages/notice/list.vue:74", "【DEBUG】全部公告 =", this.notices);
        } catch (err) {
          formatAppLog("error", "at owner/pages/notice/list.vue:77", "加载全部公告失败", err);
        }
      },
      async openNoticeDetail(item) {
        if (item.readFlag === 0) {
          try {
            await request({
              url: `/api/notice/${item.id}/read`,
              method: "PUT"
            });
            item.readFlag = 1;
            this.notices = [...this.notices];
          } catch (err) {
            formatAppLog("error", "at owner/pages/notice/list.vue:91", "标记已读失败", err);
          }
        }
        uni.navigateTo({
          url: `/pages/notice/detail?notice=${encodeURIComponent(
            JSON.stringify(item)
          )}`
        });
      },
      formatTime(str) {
        if (!str)
          return "";
        const date = new Date(str.replace(" ", "T"));
        if (isNaN(date.getTime()))
          return "";
        return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(
          date.getMinutes()
        ).padStart(2, "0")}`;
      },
      getTag(type) {
        switch (type) {
          case "ALL":
            return "通知";
          case "COMMUNITY":
            return "小区";
          case "BUILDING":
            return "楼栋";
          case "USER":
            return "提醒";
          default:
            return "公告";
        }
      }
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 顶部标题 "),
      vue.createElementVNode("view", { class: "section-header" }, [
        vue.createElementVNode("text", { class: "section-title" }, "全部公告")
      ]),
      vue.createCommentVNode(" 公告列表 "),
      vue.createElementVNode("view", { class: "notice-list" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.notices, (item) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: item.id,
              class: "notice-item",
              onClick: ($event) => $options.openNoticeDetail(item)
            }, [
              vue.createElementVNode("view", { class: "notice-main" }, [
                vue.createElementVNode(
                  "text",
                  {
                    class: vue.normalizeClass(["notice-title", { unread: item.readFlag === 0 }])
                  },
                  vue.toDisplayString(item.title),
                  3
                  /* TEXT, CLASS */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "notice-time" },
                  vue.toDisplayString(item.time),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode(
                "text",
                { class: "notice-tag" },
                vue.toDisplayString(item.tag),
                1
                /* TEXT */
              )
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const OwnerPagesNoticeList = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__scopeId", "data-v-4f493c5b"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/notice/list.vue"]]);
  const _sfc_main$7 = {
    data() {
      return {
        notice: {}
      };
    },
    computed: {
      isFeeNotice() {
        if (!this.notice)
          return false;
        const title = this.notice.title || "";
        const content = this.notice.content || "";
        return title.includes("缴费") || title.includes("催缴") || content.includes("物业费");
      }
    },
    onLoad(options) {
      if (options.notice) {
        try {
          this.notice = JSON.parse(decodeURIComponent(options.notice));
          formatAppLog("log", "at owner/pages/notice/detail.vue:47", "【DEBUG】公告详情 =", this.notice);
        } catch (e) {
          formatAppLog("error", "at owner/pages/notice/detail.vue:49", "解析公告失败", e);
        }
      }
    },
    methods: {
      gotoPay() {
        uni.navigateTo({
          url: "/owner/pages/communityService/pay-fee"
        });
      }
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return $data.notice ? (vue.openBlock(), vue.createElementBlock("view", {
      key: 0,
      class: "page"
    }, [
      vue.createElementVNode("view", { class: "card" }, [
        vue.createElementVNode("view", { class: "header" }, [
          vue.createElementVNode(
            "text",
            { class: "title" },
            vue.toDisplayString($data.notice.title),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "meta" }, [
            vue.createElementVNode(
              "text",
              { class: "time" },
              vue.toDisplayString($data.notice.publishTime),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "tag" },
              vue.toDisplayString($data.notice.tag),
              1
              /* TEXT */
            )
          ])
        ]),
        vue.createElementVNode("view", { class: "content" }, [
          vue.createElementVNode(
            "text",
            { class: "text" },
            vue.toDisplayString($data.notice.content),
            1
            /* TEXT */
          ),
          vue.createCommentVNode(" 缴费快捷入口 "),
          $options.isFeeNotice ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "action-area"
          }, [
            vue.createElementVNode("button", {
              class: "pay-btn",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.gotoPay && $options.gotoPay(...args))
            }, "立即缴费")
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ])
    ])) : vue.createCommentVNode("v-if", true);
  }
  const OwnerPagesNoticeDetail = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/notice/detail.vue"]]);
  const _sfc_main$6 = {
    data() {
      return {
        topic: {},
        comments: [],
        newComment: "",
        userInfo: uni.getStorageSync("userInfo") || {}
      };
    },
    onLoad(options) {
      const id = options.id;
      this.loadTopic(id);
      this.loadComments(id);
    },
    methods: {
      async loadTopic(id) {
        const res = await request({ url: `/api/topic/${id}`, method: "GET" });
        this.topic = res;
      },
      async loadComments(topicId) {
        const res = await request({ url: `/api/topic/${topicId}/comments`, method: "GET" });
        this.comments = (res || []).map((c) => ({
          ...c,
          showReply: false,
          replyContent: "",
          replies: c.replies || []
        }));
      },
      async submitComment() {
        var _a;
        if (!this.newComment)
          return;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id)) {
          return uni.showToast({ title: "请先登录", icon: "none" });
        }
        const res = await request({
          url: `/api/topic/${this.topic.id}/comment`,
          method: "POST",
          data: { userId: this.userInfo.id, content: this.newComment }
        });
        if (res) {
          uni.showToast({ title: "评论成功", icon: "success" });
          this.newComment = "";
          this.loadComments(this.topic.id);
        }
      },
      showReplyInput(comment) {
        comment.showReply = !comment.showReply;
      },
      async submitReply(comment) {
        var _a;
        if (!comment.replyContent)
          return;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id)) {
          return uni.showToast({ title: "请先登录", icon: "none" });
        }
        const res = await request({
          url: `/api/topic/${this.topic.id}/comment`,
          method: "POST",
          data: {
            userId: this.userInfo.id,
            content: comment.replyContent,
            parentId: comment.id,
            rootId: comment.rootId || comment.id
          }
        });
        if (res) {
          uni.showToast({ title: "回复成功", icon: "success" });
          comment.replyContent = "";
          comment.showReply = false;
          this.loadComments(this.topic.id);
        }
      },
      async likeComment(comment) {
        var _a;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id)) {
          return uni.showToast({ title: "请先登录", icon: "none" });
        }
        try {
          const res = await request({
            url: `/api/topic/${this.topic.id}/like`,
            method: "PUT",
            params: { userId: this.userInfo.id }
          });
          if (res) {
            comment.likes = (comment.likes || 0) + 1;
            uni.showToast({ title: "点赞成功", icon: "success" });
          }
        } catch (err) {
          uni.showToast({ title: "点赞失败", icon: "none" });
        }
      }
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode(
        "view",
        { class: "title" },
        vue.toDisplayString($data.topic.title),
        1
        /* TEXT */
      ),
      vue.createElementVNode(
        "view",
        { class: "meta" },
        vue.toDisplayString($data.topic.author) + " · " + vue.toDisplayString($data.topic.time),
        1
        /* TEXT */
      ),
      vue.createElementVNode(
        "view",
        { class: "content" },
        vue.toDisplayString($data.topic.content),
        1
        /* TEXT */
      ),
      vue.createCommentVNode(" 评论区 "),
      vue.createElementVNode("view", { class: "comment-section" }, [
        vue.createElementVNode(
          "view",
          { class: "section-title" },
          "评论 (" + vue.toDisplayString($data.comments.length) + ")",
          1
          /* TEXT */
        ),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.comments, (c) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "comment-item",
              key: c.id
            }, [
              vue.createElementVNode("image", {
                class: "avatar",
                src: c.avatar || "/static/default-avatar.png"
              }, null, 8, ["src"]),
              vue.createElementVNode("view", { class: "comment-body" }, [
                vue.createElementVNode("view", { class: "comment-header" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "comment-author" },
                    vue.toDisplayString(c.username),
                    1
                    /* TEXT */
                  ),
                  c.badge ? (vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: 0,
                      class: "comment-badge"
                    },
                    vue.toDisplayString(c.badge),
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true)
                ]),
                vue.createElementVNode(
                  "text",
                  { class: "comment-content" },
                  vue.toDisplayString(c.content),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "comment-footer" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "comment-time" },
                    vue.toDisplayString(c.time),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("text", {
                    class: "comment-like",
                    onClick: ($event) => $options.likeComment(c)
                  }, "👍 " + vue.toDisplayString(c.likes || 0), 9, ["onClick"]),
                  vue.createElementVNode("text", {
                    class: "comment-reply",
                    onClick: ($event) => $options.showReplyInput(c)
                  }, "回复", 8, ["onClick"])
                ]),
                vue.createCommentVNode(" 回复输入框 "),
                c.showReply ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "reply-input"
                }, [
                  vue.withDirectives(vue.createElementVNode("input", {
                    "onUpdate:modelValue": ($event) => c.replyContent = $event,
                    placeholder: "写回复..."
                  }, null, 8, ["onUpdate:modelValue"]), [
                    [vue.vModelText, c.replyContent]
                  ]),
                  vue.createElementVNode("button", {
                    onClick: ($event) => $options.submitReply(c)
                  }, "提交", 8, ["onClick"])
                ])) : vue.createCommentVNode("v-if", true),
                vue.createCommentVNode(" 楼中楼 "),
                c.replies && c.replies.length ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "reply-list"
                }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(c.replies, (r) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        class: "reply-item",
                        key: r.id
                      }, [
                        vue.createElementVNode(
                          "text",
                          { class: "reply-author" },
                          vue.toDisplayString(r.username) + ":",
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "reply-content" },
                          vue.toDisplayString(r.content),
                          1
                          /* TEXT */
                        )
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])) : vue.createCommentVNode("v-if", true)
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createCommentVNode(" 一级评论输入框 "),
      vue.createElementVNode("view", { class: "comment-input" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.newComment = $event),
            placeholder: "写评论..."
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.newComment]
        ]),
        vue.createElementVNode("button", {
          onClick: _cache[1] || (_cache[1] = (...args) => $options.submitComment && $options.submitComment(...args))
        }, "提交")
      ])
    ]);
  }
  const OwnerPagesTopicDetail = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/topic/detail.vue"]]);
  const _sfc_main$5 = {
    data() {
      return {
        topics: [],
        likedTopics: [],
        showPostModal: false,
        newTopic: { title: "", content: "", imageUrls: [] },
        userInfo: null
      };
    },
    onLoad() {
      this.loadTopics();
    },
    onShow() {
      this.userInfo = uni.getStorageSync("userInfo") || {};
      if (!this.userInfo.id && this.userInfo.userId) {
        this.userInfo.id = this.userInfo.userId;
      }
      this.loadTopics();
    },
    methods: {
      async loadTopics() {
        try {
          const res = await request({
            url: "/api/topic/list",
            method: "GET",
            params: { pageNum: 1, pageSize: 20, status: "APPROVED" }
          });
          if (res == null ? void 0 : res.records) {
            this.topics = res.records.map((t) => ({
              id: t.id,
              title: t.title,
              author: t.authorName || "匿名",
              time: t.createTime ? new Date(t.createTime).toLocaleString() : "",
              content: t.content,
              likes: t.likeCount || 0,
              comments: t.commentCount || 0,
              showCommentInput: false,
              commentContent: ""
            }));
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/topic/list.vue:109", "加载话题失败", e);
        }
      },
      goDetail(id) {
        uni.navigateTo({
          url: `/pages/topic/detail?id=${id}`
        });
      },
      likeTopic(topic) {
        var _a;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id)) {
          uni.showToast({ title: "请先登录", icon: "none" });
          return;
        }
        if (this.likedTopics.includes(topic.id))
          return;
        request({
          url: `/api/topic/${topic.id}/like`,
          method: "PUT",
          params: { userId: this.userInfo.id }
        }).then((res) => {
          if (res === true) {
            topic.likes += 1;
            this.likedTopics.push(topic.id);
          }
        });
      },
      toggleCommentInput(topic) {
        topic.showCommentInput = !topic.showCommentInput;
      },
      commentTopic(topic) {
        if (!topic.commentContent)
          return;
        request({
          url: `/api/topic/${topic.id}/comment`,
          method: "POST",
          data: { userId: this.userInfo.id, content: topic.commentContent }
        }).then((res) => {
          if (res) {
            topic.comments += 1;
            topic.commentContent = "";
            topic.showCommentInput = false;
            uni.showToast({ title: "评论成功", icon: "success" });
          }
        });
      },
      openPostModal() {
        this.newTopic = { title: "", content: "", imageUrls: [] };
        this.showPostModal = true;
      },
      postTopic() {
        var _a;
        if (!((_a = this.userInfo) == null ? void 0 : _a.id))
          return;
        const { title, content, imageUrls } = this.newTopic;
        request({
          url: "/api/topic",
          method: "POST",
          data: { userId: this.userInfo.id, title, content, imageUrls }
        }).then((res) => {
          if (res) {
            uni.showToast({ title: "发布成功", icon: "success" });
            this.showPostModal = false;
            this.loadTopics();
          }
        });
      }
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 顶部标题和发帖按钮 "),
      vue.createElementVNode("view", { class: "section-header" }, [
        vue.createElementVNode("text", { class: "section-title" }, "热门话题"),
        vue.createElementVNode("text", {
          class: "section-link",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.openPostModal && $options.openPostModal(...args))
        }, "发帖")
      ]),
      vue.createCommentVNode(" 话题列表 "),
      (vue.openBlock(true), vue.createElementBlock(
        vue.Fragment,
        null,
        vue.renderList($data.topics, (topic) => {
          return vue.openBlock(), vue.createElementBlock("view", {
            key: topic.id,
            class: "topic-card",
            onClick: ($event) => $options.goDetail(topic.id)
          }, [
            vue.createElementVNode("view", { class: "card-header" }, [
              vue.createElementVNode("view", null, [
                vue.createElementVNode(
                  "text",
                  { class: "topic-title" },
                  vue.toDisplayString(topic.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "view",
                  { class: "topic-meta" },
                  vue.toDisplayString(topic.author) + " · " + vue.toDisplayString(topic.time),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode(
                "text",
                { class: "badge" },
                vue.toDisplayString(topic.category || "话题"),
                1
                /* TEXT */
              )
            ]),
            vue.createCommentVNode(" 摘要 "),
            vue.createElementVNode(
              "view",
              { class: "topic-content" },
              vue.toDisplayString(topic.content),
              1
              /* TEXT */
            ),
            vue.createElementVNode("view", { class: "topic-actions" }, [
              vue.createElementVNode("text", {
                class: vue.normalizeClass($data.likedTopics.includes(topic.id) ? "liked" : "like-btn"),
                onClick: vue.withModifiers(($event) => $options.likeTopic(topic), ["stop"])
              }, " 👍 " + vue.toDisplayString(topic.likes), 11, ["onClick"]),
              vue.createElementVNode("text", {
                onClick: vue.withModifiers(($event) => $options.toggleCommentInput(topic), ["stop"])
              }, "💬 " + vue.toDisplayString(topic.comments), 9, ["onClick"])
            ]),
            vue.createCommentVNode(" 评论输入框 "),
            topic.showCommentInput ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "comment-box"
            }, [
              vue.withDirectives(vue.createElementVNode("input", {
                "onUpdate:modelValue": ($event) => topic.commentContent = $event,
                placeholder: "写评论..."
              }, null, 8, ["onUpdate:modelValue"]), [
                [vue.vModelText, topic.commentContent]
              ]),
              vue.createElementVNode("button", {
                onClick: vue.withModifiers(($event) => $options.commentTopic(topic), ["stop"])
              }, "提交", 8, ["onClick"])
            ])) : vue.createCommentVNode("v-if", true)
          ], 8, ["onClick"]);
        }),
        128
        /* KEYED_FRAGMENT */
      )),
      vue.createCommentVNode(" 发帖弹窗 "),
      $data.showPostModal ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "mask"
      }, [
        vue.createElementVNode("view", { class: "dialog" }, [
          vue.createElementVNode("view", { class: "dialog-title" }, "发布话题"),
          vue.createElementVNode("view", { class: "form-item" }, [
            vue.createElementVNode("text", { class: "label" }, "标题"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.newTopic.title = $event),
                placeholder: "请输入标题"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.newTopic.title]
            ])
          ]),
          vue.createElementVNode("view", { class: "form-item" }, [
            vue.createElementVNode("text", { class: "label" }, "内容"),
            vue.withDirectives(vue.createElementVNode(
              "textarea",
              {
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.newTopic.content = $event),
                placeholder: "请输入内容",
                "auto-height": "",
                maxlength: "-1",
                class: "post-textarea"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.newTopic.content]
            ])
          ]),
          vue.createElementVNode("view", { class: "dialog-actions" }, [
            vue.createElementVNode("button", {
              class: "btn ghost",
              onClick: _cache[3] || (_cache[3] = ($event) => $data.showPostModal = false)
            }, "取消"),
            vue.createElementVNode("button", {
              class: "btn primary",
              onClick: _cache[4] || (_cache[4] = (...args) => $options.postTopic && $options.postTopic(...args))
            }, "发布")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const OwnerPagesTopicList = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/topic/list.vue"]]);
  const _sfc_main$4 = {
    data() {
      return {
        balance: 0,
        presetAmounts: [100, 200, 500],
        selectedAmount: null,
        customAmount: ""
      };
    },
    onLoad(options) {
      if (options.balance) {
        this.balance = Number(options.balance);
      }
      this.loadBalance();
    },
    methods: {
      selectAmount(amount) {
        this.selectedAmount = amount;
        this.customAmount = "";
      },
      // 监听输入框
      onInput(e) {
        this.selectedAmount = null;
      },
      // 查询余额
      async loadBalance() {
        try {
          const res = await request({
            url: "/api/parking/account/balance",
            method: "GET"
          });
          if (typeof res === "number") {
            this.balance = res;
          } else if (res && typeof res.data === "number") {
            this.balance = res.data;
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/parking/recharge.vue:91", "获取余额失败", e);
        }
      },
      // 充值
      async doRecharge() {
        let amount = this.selectedAmount;
        if (!amount && this.customAmount) {
          amount = Number(this.customAmount);
        }
        if (!amount || amount <= 0) {
          uni.showToast({ title: "请输入正确金额", icon: "none" });
          return;
        }
        try {
          uni.showLoading({ title: "充值中..." });
          await request("/api/parking/account/recharge", {
            amount,
            userId: uni.getStorageSync("userInfo").id || uni.getStorageSync("userInfo").userId
          }, "POST");
          uni.hideLoading();
          uni.showToast({ title: "充值成功", icon: "success" });
          this.selectedAmount = null;
          this.customAmount = "";
          this.loadBalance();
        } catch (e) {
          uni.hideLoading();
          formatAppLog("error", "at owner/pages/parking/recharge.vue:128", "充值失败:", e);
          uni.showToast({ title: "充值失败", icon: "none" });
        }
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 余额卡片 "),
      vue.createElementVNode("view", { class: "balance-card" }, [
        vue.createElementVNode("text", { class: "title" }, "账户余额"),
        vue.createElementVNode(
          "text",
          { class: "amount" },
          vue.toDisplayString($data.balance) + " 元",
          1
          /* TEXT */
        )
      ]),
      vue.createCommentVNode(" 快捷充值 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "快捷充值"),
        vue.createElementVNode("view", { class: "amount-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.presetAmounts, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item,
                class: vue.normalizeClass(["amount-item", { active: $data.selectedAmount === item }]),
                onClick: ($event) => $options.selectAmount(item)
              }, vue.toDisplayString(item) + " 元 ", 11, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ]),
      vue.createCommentVNode(" 自定义金额 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "自定义金额"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            type: "number",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.customAmount = $event),
            placeholder: "请输入充值金额",
            class: "amount-input"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.customAmount]
        ])
      ]),
      vue.createCommentVNode(" 充值按钮 "),
      vue.createElementVNode("button", {
        class: "btn primary",
        onClick: _cache[1] || (_cache[1] = (...args) => $options.doRecharge && $options.doRecharge(...args))
      }, " 立即充值 ")
    ]);
  }
  const OwnerPagesParkingRecharge = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/parking/recharge.vue"]]);
  const _sfc_main$3 = {
    data() {
      return {
        car: {},
        userInfo: {}
      };
    },
    onLoad() {
      const user = uni.getStorageSync("userInfo");
      this.userInfo = user;
      const eventChannel = this.getOpenerEventChannel();
      eventChannel.on("carDetail", (car) => {
        this.car = car;
      });
    },
    methods: {
      async renew() {
        if (!this.car.id) {
          uni.showToast({ title: "车位数据为空", icon: "none" });
          return;
        }
        try {
          const orderId = await request(
            "/api/parking/lease/order/create",
            {
              userId: this.userInfo.id,
              spaceId: this.car.id,
              leaseType: this.car.leaseType
            },
            "POST"
          );
          await request("/api/parking/lease/order/pay", {
            orderId,
            payChannel: "BALANCE"
          }, "POST");
          this.car.expire = this.calcNewExpire(this.car);
          if (this.car.leaseEndTime) {
            const newEnd = new Date(this.car.leaseEndTime);
            if (this.car.leaseType === "MONTHLY") {
              newEnd.setMonth(newEnd.getMonth() + 1);
            } else if (this.car.leaseType === "YEARLY") {
              newEnd.setFullYear(newEnd.getFullYear() + 1);
            }
            this.car.leaseEndTime = newEnd.toISOString();
          }
          uni.showToast({ title: "续费成功", icon: "success" });
        } catch (e) {
          uni.showToast({ title: e.message || "续费失败", icon: "none" });
        }
      },
      async openGate() {
        if (!this.car.plateNo) {
          uni.showToast({ title: "未绑定车牌", icon: "none" });
          return;
        }
        try {
          await request("/api/parking/gate/enter", {
            plateNo: this.car.plateNo
          }, "POST");
          uni.showToast({ title: "开闸成功", icon: "success" });
        } catch (e) {
          uni.showToast({ title: e.message || "开闸失败", icon: "none" });
        }
      },
      calcNewExpire(car) {
        if (!car.leaseEndTime)
          return car.expire;
        const end = new Date(car.leaseEndTime);
        if (car.leaseType === "MONTHLY")
          end.setMonth(end.getMonth() + 1);
        if (car.leaseType === "YEARLY")
          end.setFullYear(end.getFullYear() + 1);
        const format = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };
        return `${format(new Date(car.leaseStartTime))} ~ ${format(end)}`;
      },
      async bindPlate() {
        formatAppLog("log", "at owner/pages/parking/space-detail.vue:167", "🔹 点击绑定车牌按钮", this.car, this.userInfo);
        if (!this.car || !this.car.id) {
          uni.showToast({ title: "车位数据为空", icon: "none" });
          formatAppLog("error", "at owner/pages/parking/space-detail.vue:171", "❌ car 对象为空或 car.id 未获取");
          return;
        }
        uni.showModal({
          title: "绑定车牌",
          content: "请输入车牌号",
          placeholderText: "例如 京A12345",
          // H5/小程序可以自定义弹窗组件实现
          editable: true,
          // 可编辑输入框
          success: async (res) => {
            formatAppLog("log", "at owner/pages/parking/space-detail.vue:182", "🚀 showModal 返回：", res);
            if (res.confirm && res.content) {
              const plateNo = res.content.trim();
              if (!plateNo) {
                uni.showToast({ title: "车牌号不能为空", icon: "none" });
                formatAppLog("warn", "at owner/pages/parking/space-detail.vue:187", "❌ 用户未输入车牌号");
                return;
              }
              formatAppLog("log", "at owner/pages/parking/space-detail.vue:191", "绑定车牌号：", plateNo);
              try {
                const result = await request("/api/parking/plate/bind", {
                  spaceId: this.car.id,
                  plateNo
                }, "POST");
                formatAppLog("log", "at owner/pages/parking/space-detail.vue:197", "接口返回：", result);
                this.car.plateNo = plateNo;
                uni.showToast({ title: "绑定成功", icon: "success" });
              } catch (e) {
                formatAppLog("error", "at owner/pages/parking/space-detail.vue:201", "❌ 绑定接口报错：", e);
                uni.showToast({ title: e.message || "绑定失败", icon: "none" });
              }
            } else {
              formatAppLog("log", "at owner/pages/parking/space-detail.vue:205", "用户取消输入");
            }
          }
        });
      },
      async unbindPlate() {
        if (!this.car.plateNo) {
          uni.showToast({ title: "当前未绑定车牌", icon: "none" });
          return;
        }
        try {
          await request("/api/parking/plate/unbind", {
            userId: this.userInfo.id,
            spaceId: this.car.id,
            plateNo: this.car.plateNo
          }, "POST");
          this.car.plateNo = "";
          uni.showToast({ title: "解绑成功", icon: "success" });
        } catch (e) {
          uni.showToast({ title: e.message || "解绑失败", icon: "none" });
        }
      },
      goBack() {
        uni.navigateBack();
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createCommentVNode(" 车位信息卡片 "),
      $data.car && $data.car.id ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "car-info-card"
      }, [
        vue.createElementVNode("view", { class: "row" }, [
          vue.createElementVNode("text", { class: "label" }, "车位号："),
          vue.createElementVNode(
            "text",
            { class: "value" },
            vue.toDisplayString($data.car.slot),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "row" }, [
          vue.createElementVNode("text", { class: "label" }, "车位类型："),
          vue.createElementVNode(
            "text",
            { class: "value" },
            vue.toDisplayString($data.car.leaseType === "MONTHLY" ? "月卡" : $data.car.leaseType === "YEARLY" ? "年卡" : "永久"),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "row" }, [
          vue.createElementVNode("text", { class: "label" }, "有效期："),
          vue.createElementVNode(
            "text",
            { class: "value" },
            vue.toDisplayString($data.car.expire),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "row" }, [
          vue.createElementVNode("text", { class: "label" }, "所属小区："),
          vue.createElementVNode(
            "text",
            { class: "value" },
            vue.toDisplayString($data.car.communityName),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "row" }, [
          vue.createElementVNode("text", { class: "label" }, "状态："),
          vue.createElementVNode(
            "text",
            {
              class: vue.normalizeClass(["value", $data.car.active ? "status-on" : "status-off"])
            },
            vue.toDisplayString($data.car.statusText),
            3
            /* TEXT, CLASS */
          )
        ]),
        vue.createElementVNode("view", { class: "row" }, [
          vue.createElementVNode("text", { class: "label" }, "车牌号："),
          vue.createElementVNode(
            "text",
            { class: "value" },
            vue.toDisplayString($data.car.plateNo || "未绑定"),
            1
            /* TEXT */
          )
        ])
      ])) : (vue.openBlock(), vue.createElementBlock(
        vue.Fragment,
        { key: 1 },
        [
          vue.createCommentVNode(" 没拿到数据时 "),
          vue.createElementVNode("view", { class: "empty" }, [
            vue.createElementVNode("text", null, "❌ 未获取到车位数据")
          ])
        ],
        2112
        /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
      )),
      vue.createCommentVNode(" 操作按钮 "),
      vue.createElementVNode("view", { class: "action-buttons" }, [
        vue.createElementVNode("button", {
          class: "btn primary",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.renew && $options.renew(...args))
        }, "续费"),
        vue.createElementVNode("button", {
          class: "btn success",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.openGate && $options.openGate(...args))
        }, "开闸"),
        vue.createElementVNode("button", {
          class: "btn warning",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.bindPlate && $options.bindPlate(...args))
        }, "绑定车牌"),
        vue.createElementVNode("button", {
          class: "btn danger",
          onClick: _cache[3] || (_cache[3] = (...args) => $options.unbindPlate && $options.unbindPlate(...args))
        }, "解绑车牌"),
        vue.createElementVNode("button", {
          class: "btn default",
          onClick: _cache[4] || (_cache[4] = (...args) => $options.goBack && $options.goBack(...args))
        }, "返回")
      ])
    ]);
  }
  const OwnerPagesParkingSpaceDetail = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/parking/space-detail.vue"]]);
  const _sfc_main$2 = {
    data() {
      return {
        form: {
          plateNo: "",
          brand: "",
          color: "",
          spaceId: "",
          spaceName: ""
        },
        mySpaces: []
      };
    },
    onLoad() {
      this.loadMySpaces();
    },
    methods: {
      // 加载我的车位列表供选择
      async loadMySpaces() {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          const userId = (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId);
          if (!userId) {
            uni.showToast({ title: "请先登录", icon: "none" });
            return;
          }
          const communityId = userInfo.communityId;
          if (!communityId) {
            uni.showToast({ title: "未绑定小区", icon: "none" });
            return;
          }
          formatAppLog("log", "at owner/pages/parking/bind-car.vue:100", "【DEBUG】请求车位列表参数:", { communityId });
          const res = await request({
            url: "/api/parking/space/available",
            // 改为查询可用车位接口
            method: "GET",
            params: { communityId, pageSize: 100 }
          });
          formatAppLog("log", "at owner/pages/parking/bind-car.vue:106", "【DEBUG】车位列表数据:", JSON.stringify(res));
          this.mySpaces = Array.isArray(res) ? res : res.records || [];
        } catch (e) {
          formatAppLog("error", "at owner/pages/parking/bind-car.vue:111", "获取车位失败", e);
          uni.showToast({ title: "无法获取车位列表", icon: "none" });
        }
      },
      onSpaceChange(e) {
        const index = e.detail.value;
        const space = this.mySpaces[index];
        this.form.spaceId = space.id;
        this.form.spaceName = space.slot;
      },
      async handleSubmit() {
        if (!this.form.plateNo)
          return uni.showToast({ title: "请输入车牌号", icon: "none" });
        if (!this.form.spaceId)
          return uni.showToast({ title: "请选择关联车位", icon: "none" });
        const plateRegex = /^[\u4e00-\u9fa5][A-Z][A-Z0-9]{5,6}$/;
        if (!plateRegex.test(this.form.plateNo)) {
          return uni.showToast({ title: "车牌号格式不正确", icon: "none" });
        }
        try {
          uni.showLoading({ title: "提交申请中..." });
          const data = {
            plateNo: this.form.plateNo,
            brand: this.form.brand,
            color: this.form.color,
            spaceId: this.form.spaceId
          };
          await request("/api/vehicle/bind", data, "POST");
          uni.hideLoading();
          uni.showModal({
            title: "提交成功",
            content: "您的车辆绑定申请已提交，请耐心等待管理员审核。",
            showCancel: false,
            success: () => {
              uni.navigateBack();
            }
          });
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: "提交失败: " + (e.message || "请重试"), icon: "none" });
        }
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "form-card" }, [
        vue.createElementVNode("view", { class: "form-title" }, "车辆绑定申请"),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "车牌号码"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.plateNo = $event),
              placeholder: "请输入车牌号 (如: 粤A88888)",
              "placeholder-class": "placeholder"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.form.plateNo]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "车辆品牌"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.brand = $event),
              placeholder: "请输入车辆品牌 (如: 奔驰)",
              "placeholder-class": "placeholder"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.form.brand]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "车辆颜色"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.form.color = $event),
              placeholder: "请输入车辆颜色 (如: 黑色)",
              "placeholder-class": "placeholder"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.form.color]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "关联车位"),
          vue.createElementVNode("picker", {
            mode: "selector",
            range: $data.mySpaces,
            "range-key": "slot",
            onChange: _cache[3] || (_cache[3] = (...args) => $options.onSpaceChange && $options.onSpaceChange(...args))
          }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["picker-value", { placeholder: !$data.form.spaceId }])
              },
              vue.toDisplayString($data.form.spaceName || "请选择车位"),
              3
              /* TEXT, CLASS */
            )
          ], 40, ["range"])
        ]),
        vue.createElementVNode("view", { class: "tips" }, [
          vue.createElementVNode("text", null, "说明："),
          vue.createElementVNode("text", null, "1. 请填写真实有效的车辆信息。"),
          vue.createElementVNode("text", null, "2. 提交申请后，物业管理员将核实车辆和车位归属。"),
          vue.createElementVNode("text", null, "3. 审核通过后，该车辆将获得车牌识别进出权限。")
        ]),
        vue.createElementVNode("button", {
          class: "submit-btn",
          onClick: _cache[4] || (_cache[4] = (...args) => $options.handleSubmit && $options.handleSubmit(...args))
        }, "提交绑定申请")
      ])
    ]);
  }
  const OwnerPagesParkingBindCar = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-3fdde2a0"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/parking/bind-car.vue"]]);
  const _sfc_main$1 = {
    data() {
      return {
        communities: [],
        // 小区列表
        identityTypes: [
          { label: "业主", value: "OWNER" },
          { label: "家属", value: "FAMILY" },
          { label: "租户", value: "TENANT" }
        ],
        form: {
          communityId: "",
          communityName: "",
          buildingNo: "",
          houseNo: "",
          type: "",
          typeLabel: ""
        }
      };
    },
    onLoad() {
      this.loadCommunities();
    },
    methods: {
      async loadCommunities() {
        try {
          const res = await request({
            url: "/api/community/list",
            method: "GET"
          });
          this.communities = Array.isArray(res) ? res : res.records || [];
        } catch (e) {
          formatAppLog("error", "at owner/pages/mine/house-bind.vue:93", "获取小区列表失败", e);
          uni.showToast({ title: "无法获取小区列表", icon: "none" });
        }
      },
      onCommunityChange(e) {
        const index = e.detail.value;
        const selected = this.communities[index];
        this.form.communityId = selected.id;
        this.form.communityName = selected.name;
      },
      onTypeChange(e) {
        const index = e.detail.value;
        const selected = this.identityTypes[index];
        this.form.type = selected.value;
        this.form.typeLabel = selected.label;
      },
      async handleSubmit() {
        if (!this.form.communityId)
          return uni.showToast({ title: "请选择小区", icon: "none" });
        if (!this.form.buildingNo)
          return uni.showToast({ title: "请填写楼栋号", icon: "none" });
        if (!this.form.houseNo)
          return uni.showToast({ title: "请填写房屋号", icon: "none" });
        if (!this.form.type)
          return uni.showToast({ title: "请选择身份类型", icon: "none" });
        try {
          uni.showLoading({ title: "提交中..." });
          const userInfo = uni.getStorageSync("userInfo");
          await request("/api/house/bind", {
            userId: (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId),
            communityId: this.form.communityId,
            buildingNo: this.form.buildingNo,
            houseNo: this.form.houseNo,
            type: this.form.type
          }, "POST");
          uni.hideLoading();
          uni.showModal({
            title: "提交成功",
            content: "您的绑定申请已提交，请耐心等待管理员审核。",
            showCancel: false,
            success: () => {
              uni.navigateBack();
            }
          });
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: "提交失败：" + (e.message || "请重试"), icon: "none" });
        }
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "绑定房屋"),
        vue.createElementVNode("text", { class: "sub-title" }, "请填写真实的房屋信息以通过审核")
      ]),
      vue.createElementVNode("view", { class: "form-group" }, [
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "所属小区"),
          vue.createElementVNode("picker", {
            onChange: _cache[0] || (_cache[0] = (...args) => $options.onCommunityChange && $options.onCommunityChange(...args)),
            range: $data.communities,
            "range-key": "name"
          }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["picker-value", { placeholder: !$data.form.communityName }])
              },
              vue.toDisplayString($data.form.communityName || "请选择小区"),
              3
              /* TEXT, CLASS */
            )
          ], 40, ["range"])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "楼栋号"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.buildingNo = $event),
              placeholder: "例如：1号楼 或 A栋",
              "placeholder-class": "placeholder"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.form.buildingNo]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "房屋号"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.form.houseNo = $event),
              placeholder: "例如：101室",
              "placeholder-class": "placeholder"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.form.houseNo]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "身份类型"),
          vue.createElementVNode("picker", {
            onChange: _cache[3] || (_cache[3] = (...args) => $options.onTypeChange && $options.onTypeChange(...args)),
            range: $data.identityTypes,
            "range-key": "label"
          }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["picker-value", { placeholder: !$data.form.typeLabel }])
              },
              vue.toDisplayString($data.form.typeLabel || "请选择您的身份"),
              3
              /* TEXT, CLASS */
            )
          ], 40, ["range"])
        ])
      ]),
      vue.createElementVNode("button", {
        class: "submit-btn",
        onClick: _cache[4] || (_cache[4] = (...args) => $options.handleSubmit && $options.handleSubmit(...args))
      }, "提交绑定申请"),
      vue.createElementVNode("view", { class: "tips" }, [
        vue.createElementVNode("text", { class: "tips-title" }, "温馨提示："),
        vue.createElementVNode("text", { class: "tips-text" }, "1. 提交申请后，物业管理员将在24小时内进行审核。"),
        vue.createElementVNode("text", { class: "tips-text" }, "2. 审核通过后，您将获得该房屋的相关服务权限。")
      ])
    ]);
  }
  const OwnerPagesMineHouseBind = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-be943aa7"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/mine/house-bind.vue"]]);
  __definePage("owner/pages/index/index", OwnerPagesIndexIndex);
  __definePage("owner/pages/parking/index", OwnerPagesParkingIndex);
  __definePage("owner/pages/topic/index", OwnerPagesTopicIndex);
  __definePage("owner/pages/mine/index", OwnerPagesMineIndex);
  __definePage("owner/pages/communityService/index", OwnerPagesCommunityServiceIndex);
  __definePage("owner/pages/communityService/pay-fee", OwnerPagesCommunityServicePayFee);
  __definePage("owner/pages/communityService/visitor-apply", OwnerPagesCommunityServiceVisitorApply);
  __definePage("owner/pages/communityService/complaint", OwnerPagesCommunityServiceComplaint);
  __definePage("owner/pages/communityService/activity-list", OwnerPagesCommunityServiceActivityList);
  __definePage("owner/pages/mine/profile", OwnerPagesMineProfile);
  __definePage("owner/pages/login/login", OwnerPagesLoginLogin);
  __definePage("owner/pages/register/register", OwnerPagesRegisterRegister);
  __definePage("owner/pages/repair/repair", OwnerPagesRepairRepair);
  __definePage("admin/pages/admin/repair-manage", AdminPagesAdminRepairManage);
  __definePage("admin/pages/admin/dashboard/index", AdminPagesAdminDashboardIndex);
  __definePage("admin/pages/admin/user-manage", AdminPagesAdminUserManage);
  __definePage("admin/pages/admin/notice-manage", AdminPagesAdminNoticeManage);
  __definePage("admin/pages/admin/parking-manage", AdminPagesAdminParkingManage);
  __definePage("admin/pages/admin/community-manage", AdminPagesAdminCommunityManage);
  __definePage("admin/pages/admin/notice-edit", AdminPagesAdminNoticeEdit);
  __definePage("admin/pages/admin/fee-manage", AdminPagesAdminFeeManage);
  __definePage("admin/pages/admin/complaint-manage", AdminPagesAdminComplaintManage);
  __definePage("admin/pages/admin/visitor-manage", AdminPagesAdminVisitorManage);
  __definePage("admin/pages/admin/activity-manage", AdminPagesAdminActivityManage);
  __definePage("admin/pages/admin/activity-edit", AdminPagesAdminActivityEdit);
  __definePage("admin/pages/admin/activity-signups", AdminPagesAdminActivitySignups);
  __definePage("admin/pages/admin/car-audit", AdminPagesAdminCarAudit);
  __definePage("admin/pages/admin/oper-log", AdminPagesAdminOperLog);
  __definePage("owner/pages/notice/list", OwnerPagesNoticeList);
  __definePage("owner/pages/notice/detail", OwnerPagesNoticeDetail);
  __definePage("owner/pages/topic/detail", OwnerPagesTopicDetail);
  __definePage("owner/pages/topic/list", OwnerPagesTopicList);
  __definePage("owner/pages/parking/recharge", OwnerPagesParkingRecharge);
  __definePage("owner/pages/parking/space-detail", OwnerPagesParkingSpaceDetail);
  __definePage("owner/pages/parking/bind-car", OwnerPagesParkingBindCar);
  __definePage("owner/pages/mine/house-bind", OwnerPagesMineHouseBind);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/HBuilderProjects/smart-community/App.vue"]]);
  const rolePermissions = {
    // 普通用户权限
    owner: {
      // 增加 owner 别名，与 user 保持一致
      pages: [
        "/pages/index/index",
        "/pages/parking/index",
        "/pages/topic/index",
        "/pages/mine/index",
        "/pages/communityService/index",
        "/pages/login/login",
        "/pages/repair/repair",
        "/pages/notice/list",
        "/pages/notice/detail",
        "/pages/topic/detail",
        "/pages/topic/list",
        "/pages/parking/recharge",
        "/pages/parking/space-detail",
        "/owner/pages/communityService/pay-fee",
        "/owner/pages/communityService/visitor-apply",
        "/owner/pages/communityService/complaint",
        "/owner/pages/communityService/activity-list",
        "/owner/pages/mine/profile"
      ]
    },
    user: {
      pages: [
        "/pages/index/index",
        "/pages/parking/index",
        "/pages/topic/index",
        "/pages/mine/index",
        "/pages/communityService/index",
        "/pages/login/login",
        "/pages/repair/repair",
        "/pages/notice/list",
        "/pages/notice/detail",
        "/pages/topic/detail",
        "/pages/topic/list",
        "/pages/parking/recharge",
        "/pages/parking/space-detail",
        "/owner/pages/communityService/pay-fee",
        "/owner/pages/communityService/visitor-apply",
        "/owner/pages/communityService/complaint",
        "/owner/pages/communityService/activity-list",
        "/owner/pages/mine/profile"
      ]
    },
    // 管理员权限
    admin: {
      pages: [
        // 管理员专属页面
        "/admin/pages/admin/repair-manage",
        "/admin/pages/admin/user-manage",
        "/admin/pages/admin/notice-manage",
        "/admin/pages/admin/parking-manage",
        "/admin/pages/admin/community-manage",
        "/admin/pages/admin/notice-edit",
        "/admin/pages/admin/fee-manage",
        "/admin/pages/admin/complaint-manage",
        "/admin/pages/admin/visitor-manage",
        "/admin/pages/admin/activity-manage",
        "/admin/pages/admin/activity-edit",
        "/admin/pages/admin/activity-signups",
        // 可以访问的公共页面
        "/owner/pages/login/login"
      ]
    },
    // 超级管理员权限
    super_admin: {
      pages: [
        // 超级管理员拥有管理员所有页面
        "/admin/pages/admin/repair-manage",
        "/admin/pages/admin/user-manage",
        "/admin/pages/admin/notice-manage",
        "/admin/pages/admin/parking-manage",
        "/admin/pages/admin/community-manage",
        "/admin/pages/admin/notice-edit",
        "/admin/pages/admin/fee-manage",
        "/admin/pages/admin/complaint-manage",
        "/admin/pages/admin/visitor-manage",
        "/admin/pages/admin/activity-manage",
        "/admin/pages/admin/activity-edit",
        "/admin/pages/admin/activity-signups",
        // 可以访问的公共页面
        "/owner/pages/login/login"
      ]
    }
  };
  function checkPagePermission(pagePath, role) {
    formatAppLog("log", "at utils/permission.js:94", "[Permission Check] Path:", pagePath, "Role:", role);
    if (pagePath === "/owner/pages/login/login" || pagePath === "/pages/login/login") {
      return true;
    }
    if (role === "admin" || role === "super_admin") {
      if (pagePath.startsWith("/admin/") || pagePath.startsWith("/owner/")) {
        return true;
      }
    }
    if (!role) {
      formatAppLog("warn", "at utils/permission.js:111", "[Permission Denied] No role info");
      return false;
    }
    const permissions = rolePermissions[role];
    if (!permissions || !permissions.pages.includes(pagePath)) {
      if ((role === "user" || role === "owner") && pagePath.startsWith("/owner/")) {
        return true;
      }
      formatAppLog("warn", "at utils/permission.js:122", "[Permission Denied] Page not in whitelist:", pagePath);
      return false;
    }
    return true;
  }
  function goToHomeByRole() {
    const userInfo = uni.getStorageSync("userInfo");
    if (!userInfo) {
      uni.redirectTo({ url: "/owner/pages/login/login" });
      return;
    }
    if (userInfo.role === "admin" || userInfo.role === "super_admin") {
      uni.redirectTo({ url: "/admin/pages/admin/dashboard/index" });
    } else {
      uni.switchTab({ url: "/owner/pages/index/index" });
    }
  }
  uni.addInterceptor("navigateTo", {
    invoke(e) {
      formatAppLog("log", "at main.js:8", "拦截器触发:", e.url);
      const token = uni.getStorageSync("token");
      const userInfo = uni.getStorageSync("userInfo");
      const whiteList = ["/pages/login/login", "/owner/pages/login/login", "/owner/pages/register/register"];
      const isWhiteList = whiteList.some((path) => e.url.includes(path));
      formatAppLog("log", "at main.js:16", "是否白名单:", isWhiteList, "路径:", e.url);
      if (!isWhiteList) {
        if (!token) {
          formatAppLog("log", "at main.js:20", "未登录，跳转到登录页");
          uni.redirectTo({ url: "/owner/pages/login/login" });
          return false;
        }
        const pagePath = e.url.split("?")[0];
        if (checkPagePermission && !checkPagePermission(pagePath, userInfo == null ? void 0 : userInfo.role)) {
          formatAppLog("log", "at main.js:31", "无权限访问该页面");
          uni.showToast({ title: "无权限访问", icon: "none" });
          goToHomeByRole();
          return false;
        }
      }
      return true;
    }
  });
  uni.addInterceptor("switchTab", {
    invoke(e) {
      const token = uni.getStorageSync("token");
      const userInfo = uni.getStorageSync("userInfo");
      if (!token) {
        formatAppLog("log", "at main.js:48", "未登录，跳转到登录页");
        uni.redirectTo({ url: "/pages/login/login" });
        return false;
      }
      if ((userInfo == null ? void 0 : userInfo.role) === "admin" || (userInfo == null ? void 0 : userInfo.role) === "super_admin") {
        formatAppLog("log", "at main.js:55", "管理员禁止访问普通用户tabBar");
        uni.showToast({ title: "管理员请使用专属管理页面", icon: "none" });
        goToHomeByRole();
        return false;
      }
      return true;
    }
  });
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
