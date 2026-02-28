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
              resolve(data !== void 0 ? data : responseData);
            } else {
              if (code === 401) {
                formatAppLog("warn", "at utils/request.js:118", "401未登录拦截:", requestUrl);
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
                formatAppLog("warn", "at utils/request.js:130", "403无权限拦截:", requestUrl);
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
              formatAppLog("warn", "at utils/request.js:153", "HTTP 401 未登录:", requestUrl);
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
              formatAppLog("warn", "at utils/request.js:166", "HTTP错误:", res.statusCode, "url:", requestUrl);
              formatAppLog("warn", "at utils/request.js:167", "错误详情(Body):", JSON.stringify(res.data));
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
          formatAppLog("error", "at utils/request.js:196", "请求失败:", err && err.errMsg, "url:", requestUrl);
          uni.showModal({
            title: "网络错误",
            content: errMsg,
            showCancel: false
          });
          reject(new Error(errMsg));
        },
        complete: () => {
          formatAppLog("log", "at utils/request.js:206", "请求完成:", requestUrl);
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
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$z = {
    data() {
      return {
        userInfo: null,
        notices: [],
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
    },
    methods: {
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
          formatAppLog("error", "at owner/pages/index/index.vue:187", "公告加载失败", err);
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
            formatAppLog("error", "at owner/pages/index/index.vue:204", "标记已读失败", err);
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
  function _sfc_render$y(_ctx, _cache, $props, $setup, $data, $options) {
    var _a;
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "hero-card" }, [
        vue.createElementVNode("view", null, [
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
        vue.createElementVNode("view", {
          class: "status-badge",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.logout && $options.logout(...args))
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
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "社区公告"),
          vue.createElementVNode("view", {
            class: "section-link",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.gotoNoticeList && $options.gotoNoticeList(...args))
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
  const OwnerPagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$z, [["render", _sfc_render$y], ["__scopeId", "data-v-52d495ef"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/index/index.vue"]]);
  const _sfc_main$y = {
    data() {
      return {
        summary: {
          balance: 0
        },
        cars: [],
        userInfo: {}
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
          const list = await request.get("/api/parking/space/my");
          const format = (t) => {
            if (!t)
              return "长期有效";
            const d = new Date(t);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          };
          this.cars = list.map((item) => ({
            id: item.id,
            slot: item.slot,
            communityName: item.communityName,
            leaseType: item.leaseType,
            leaseStartTime: item.leaseStartTime,
            leaseEndTime: item.leaseEndTime,
            expire: item.leaseEndTime ? `${format(item.leaseStartTime)} ~ ${format(item.leaseEndTime)}` : `${format(item.leaseStartTime)} 起（永久）`,
            active: item.leaseStatus === "ACTIVE",
            statusText: item.statusText,
            // 🔹 新增车牌字段
            plateNo: item.plateNo || ""
          }));
        } catch (e) {
          formatAppLog("error", "at owner/pages/parking/index.vue:134", e);
          uni.showToast({ title: "获取车位失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      // 查询余额
      async loadBalance() {
        try {
          const balance = await request.get("/api/parking/account/balance");
          if (typeof balance === "number") {
            this.summary.balance = balance;
          } else if (balance && typeof balance.data === "number") {
            this.summary.balance = balance.data;
          } else {
            this.summary.balance = 0;
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/parking/index.vue:155", "获取余额失败", e);
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
      }
    }
  };
  function _sfc_render$x(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
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
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("view", { class: "section-header" }, [
          vue.createElementVNode("text", { class: "section-title" }, "我的车位"),
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
                    class: vue.normalizeClass(["car-status", car.active ? "status-on" : "status-off"])
                  },
                  vue.toDisplayString(car.statusText),
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
              ])
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const OwnerPagesParkingIndex = /* @__PURE__ */ _export_sfc(_sfc_main$y, [["render", _sfc_render$x], ["__scopeId", "data-v-b7a6754f"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/parking/index.vue"]]);
  const _sfc_main$x = {
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
  function _sfc_render$w(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
      vue.createElementVNode("view", { class: "section-header" }, [
        vue.createElementVNode("text", { class: "section-title" }, "热门话题"),
        vue.createElementVNode("text", {
          class: "section-link",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.openPostModal && $options.openPostModal(...args))
        }, "发帖")
      ]),
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
      $data.showPostModal ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "mask"
      }, [
        vue.createElementVNode("view", { class: "dialog" }, [
          vue.createElementVNode("view", { class: "dialog-title" }, "发布话题"),
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
  const OwnerPagesTopicIndex = /* @__PURE__ */ _export_sfc(_sfc_main$x, [["render", _sfc_render$w], ["__scopeId", "data-v-8ddf5b97"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/topic/index.vue"]]);
  const _sfc_main$w = {
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
    onLoad() {
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
  function _sfc_render$v(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesMineIndex = /* @__PURE__ */ _export_sfc(_sfc_main$w, [["render", _sfc_render$v], ["__scopeId", "data-v-d9f42c5e"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/mine/index.vue"]]);
  const _imports_0$1 = "/static/service/notice.png";
  const _imports_1 = "/static/service/repair.png";
  const _imports_2 = "/static/service/pay.png";
  const _imports_3 = "/static/service/visitor.png";
  const _imports_4 = "/static/service/complaint.png";
  const _imports_5 = "/static/service/activity.png";
  const _sfc_main$v = {
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
  function _sfc_render$u(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
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
      vue.createElementVNode("view", { class: "hero" }, [
        vue.createElementVNode("text", { class: "hero-title" }, "快递代收"),
        vue.createElementVNode("text", { class: "hero-sub" }, "支持扫码自提 · 24h 监控")
      ]),
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
                pkg.status === "ready" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 0,
                  class: "btn primary",
                  onClick: ($event) => $options.pickExpress(pkg)
                }, " 取件 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
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
  const OwnerPagesCommunityServiceIndex = /* @__PURE__ */ _export_sfc(_sfc_main$v, [["render", _sfc_render$u], ["__scopeId", "data-v-b9f812f4"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/communityService/index.vue"]]);
  const _sfc_main$u = {
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
  function _sfc_render$t(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
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
  const OwnerPagesCommunityServicePayFee = /* @__PURE__ */ _export_sfc(_sfc_main$u, [["render", _sfc_render$t], ["__scopeId", "data-v-e6979b53"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/communityService/pay-fee.vue"]]);
  const _sfc_main$t = {
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
  function _sfc_render$s(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesCommunityServiceVisitorApply = /* @__PURE__ */ _export_sfc(_sfc_main$t, [["render", _sfc_render$s], ["__scopeId", "data-v-c952a55e"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/communityService/visitor-apply.vue"]]);
  const _sfc_main$s = {
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
  function _sfc_render$r(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesCommunityServiceComplaint = /* @__PURE__ */ _export_sfc(_sfc_main$s, [["render", _sfc_render$r], ["__scopeId", "data-v-5b2ad19b"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/communityService/complaint.vue"]]);
  const _sfc_main$r = {
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
                uni.showToast({ title: e.message || "报名失败", icon: "none" });
              }
            }
          }
        });
      }
    }
  };
  function _sfc_render$q(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesCommunityServiceActivityList = /* @__PURE__ */ _export_sfc(_sfc_main$r, [["render", _sfc_render$q], ["__scopeId", "data-v-f96f344e"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/communityService/activity-list.vue"]]);
  const _sfc_main$q = {
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
          const res = await request.get("/api/user/info");
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
          formatAppLog("error", "at owner/pages/mine/profile.vue:117", "保存用户信息失败", e);
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
              uni.removeStorageSync("token");
              uni.removeStorageSync("userInfo");
              uni.reLaunch({ url: "/owner/pages/login/login" });
            }
          }
        });
      }
    }
  };
  function _sfc_render$p(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesMineProfile = /* @__PURE__ */ _export_sfc(_sfc_main$q, [["render", _sfc_render$p], ["__scopeId", "data-v-71d300c5"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/mine/profile.vue"]]);
  const _sfc_main$p = {
    data() {
      return {
        form: {
          username: "",
          password: "",
          role: "owner"
          // 默认选择业主
        }
      };
    },
    methods: {
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
          let role = this.form.role;
          let fullRole = "";
          if (result.token) {
            try {
              const payload = JSON.parse(atob(result.token.split(".")[1]));
              formatAppLog("log", "at owner/pages/login/login.vue:91", "Token 中的信息:", payload);
              if (payload.role) {
                fullRole = payload.role;
                role = payload.role.replace("ROLE_", "").toLowerCase();
              }
            } catch (e) {
              formatAppLog("log", "at owner/pages/login/login.vue:100", "Token 解码失败:", e);
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
          formatAppLog("log", "at owner/pages/login/login.vue:116", "登录返回的完整数据:", result);
          formatAppLog("log", "at owner/pages/login/login.vue:117", "保存的用户信息:", userInfo);
          uni.showToast({ title: "登录成功", icon: "success", duration: 1500 });
          setTimeout(() => {
            if (userInfo.role === "admin" || userInfo.role === "super_admin") {
              uni.redirectTo({ url: "/admin/pages/admin/repair-manage" });
            } else {
              uni.switchTab({ url: "/owner/pages/index/index" });
            }
          }, 1500);
        } catch (err) {
          uni.hideLoading();
          formatAppLog("error", "at owner/pages/login/login.vue:134", "登录错误:", err);
          const errorMessage = (err == null ? void 0 : err.message) || "登录失败，请重试";
          uni.showToast({ title: errorMessage, icon: "none" });
        }
      }
    }
  };
  function _sfc_render$o(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "login-container" }, [
      vue.createElementVNode("view", { class: "login-title" }, "智慧社区登录"),
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
      vue.createElementVNode("view", { class: "role-group" }, [
        vue.createElementVNode(
          "radio-group",
          {
            onChange: _cache[2] || (_cache[2] = (...args) => _ctx.onRoleChange && _ctx.onRoleChange(...args))
          },
          [
            vue.createElementVNode("label", { class: "role-item" }, [
              vue.createElementVNode("radio", {
                value: "owner",
                checked: $data.form.role === "owner"
              }, null, 8, ["checked"]),
              vue.createElementVNode("text", null, "业主")
            ]),
            vue.createElementVNode("label", { class: "role-item" }, [
              vue.createElementVNode("radio", {
                value: "admin",
                checked: $data.form.role === "admin"
              }, null, 8, ["checked"]),
              vue.createElementVNode("text", null, "管理员")
            ])
          ],
          32
          /* NEED_HYDRATION */
        )
      ]),
      vue.createElementVNode("button", {
        class: "login-btn",
        onClick: _cache[3] || (_cache[3] = (...args) => $options.handleLogin && $options.handleLogin(...args)),
        disabled: !$data.form.username || !$data.form.password
      }, " 登录 ", 8, ["disabled"])
    ]);
  }
  const OwnerPagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$p, [["render", _sfc_render$o], ["__scopeId", "data-v-cebd4568"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/login/login.vue"]]);
  const _sfc_main$o = {
    data() {
      return {
        form: {
          buildingNo: "",
          // 楼栋号
          houseNo: "",
          // 房屋号（纯房号）
          faultType: "",
          faultDesc: "",
          faultImgs: [],
          // 图片URL数组
          userId: ""
        }
      };
    },
    computed: {
      isFormValid() {
        return this.form.buildingNo && this.form.houseNo && this.form.faultType;
      }
    },
    onLoad() {
      const userInfo = uni.getStorageSync("userInfo");
      formatAppLog("log", "at owner/pages/repair/repair.vue:114", "用户信息:", userInfo);
      if (userInfo && userInfo.userId) {
        this.form.userId = userInfo.userId;
      } else {
        uni.redirectTo({ url: "/pages/login/login" });
      }
    },
    methods: {
      async handleSubmit() {
        try {
          const submitData = {
            ...this.form,
            faultImgs: this.form.faultImgs.join(",")
            // 数组转逗号分隔字符串
          };
          formatAppLog("log", "at owner/pages/repair/repair.vue:130", "提交报修数据:", submitData);
          await request({
            url: "/api/repair/submit",
            method: "POST",
            data: submitData
          });
          uni.showToast({ title: "报修提交成功", icon: "success" });
          this.resetForm();
        } catch (err) {
          formatAppLog("error", "at owner/pages/repair/repair.vue:145", "提交报修失败：", err);
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
          formatAppLog("error", "at owner/pages/repair/repair.vue:168", "选择图片失败:", err);
          uni.showToast({ title: "选择图片失败", icon: "none" });
        }
      },
      // 删除图片
      removeImage(index) {
        this.form.faultImgs.splice(index, 1);
      },
      // 重置表单
      resetForm() {
        this.form.buildingNo = "";
        this.form.houseNo = "";
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
  function _sfc_render$n(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "repair-container" }, [
      vue.createElementVNode("view", { class: "repair-title" }, "提交报修"),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "🏢"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.buildingNo = $event),
            placeholder: "请输入楼栋号（如：1栋）",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.buildingNo]
        ])
      ]),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "🏠"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.houseNo = $event),
            placeholder: "请输入房屋号（如：101）",
            "placeholder-class": "placeholder-style"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.form.houseNo]
        ])
      ]),
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "⚠️"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.form.faultType = $event),
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
      vue.createElementVNode("view", { class: "input-item input-textarea" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "📝"),
        vue.withDirectives(vue.createElementVNode(
          "textarea",
          {
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.form.faultDesc = $event),
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
              onClick: _cache[4] || (_cache[4] = (...args) => $options.chooseImage && $options.chooseImage(...args))
            }, [
              vue.createElementVNode("text", { class: "upload-icon" }, "+")
            ])
          ])
        ])
      ]),
      vue.createElementVNode("button", {
        class: "submit-btn",
        disabled: !$options.isFormValid,
        onClick: _cache[5] || (_cache[5] = (...args) => $options.handleSubmit && $options.handleSubmit(...args))
      }, " 提交报修 ", 8, ["disabled"]),
      vue.createElementVNode("button", {
        class: "back-btn",
        plain: "",
        onClick: _cache[6] || (_cache[6] = (...args) => $options.handleBackLogin && $options.handleBackLogin(...args))
      }, " 返回登录页 ")
    ]);
  }
  const OwnerPagesRepairRepair = /* @__PURE__ */ _export_sfc(_sfc_main$o, [["render", _sfc_render$n], ["__scopeId", "data-v-62de0cb9"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/repair/repair.vue"]]);
  const _sfc_main$n = {
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
  function _sfc_render$m(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "sidebar-container" }, [
      $props.showSidebar ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "sidebar-mask",
        onClick: _cache[0] || (_cache[0] = (...args) => $options.closeSidebar && $options.closeSidebar(...args))
      })) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode(
        "view",
        {
          class: vue.normalizeClass(["sidebar", { "sidebar-open": $props.showSidebar }])
        },
        [
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
      vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
    ]);
  }
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$n, [["render", _sfc_render$m], ["__scopeId", "data-v-d54a544d"], ["__file", "E:/HBuilderProjects/smart-community/components/admin-sidebar/admin-sidebar.vue"]]);
  const _sfc_main$m = {
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
  function _sfc_render$l(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "sidebar-container" }, [
      $props.showSidebar ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "sidebar-mask",
        onClick: _cache[0] || (_cache[0] = (...args) => $options.closeSidebar && $options.closeSidebar(...args))
      })) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode(
        "view",
        {
          class: vue.normalizeClass(["sidebar", { "sidebar-open": $props.showSidebar }])
        },
        [
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
      vue.createElementVNode("view", { class: "slot-container" }, [
        vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ])
    ]);
  }
  const adminSidebar = /* @__PURE__ */ _export_sfc(_sfc_main$m, [["render", _sfc_render$l], ["__scopeId", "data-v-f8592f70"], ["__file", "E:/HBuilderProjects/smart-community/admin/components/admin-sidebar/admin-sidebar.vue"]]);
  const _sfc_main$l = {
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
          cancelled: 0
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
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:383", "=== 全选/取消功能 ===");
        if (!this.repairList || this.repairList.length === 0) {
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:387", "列表为空，无法操作");
          return;
        }
        const isAllSelected = this.selectedIds.length === this.repairList.length;
        if (isAllSelected) {
          this.selectAll = false;
          this.selectedIds = [];
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:398", "取消全选成功");
        } else {
          this.selectAll = true;
          this.selectedIds = this.repairList.map((item) => String(item.id));
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:403", "全选成功，选中", this.selectedIds.length, "项");
        }
      },
      checkAdminRole() {
        const userInfo = uni.getStorageSync("userInfo");
        const token = uni.getStorageSync("token");
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:409", "检查管理员角色 - userInfo:", userInfo);
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:410", "检查管理员角色 - token:", token ? "存在" : "不存在");
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
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:429", "搜索参数:", params);
          const data = await request("/api/repair/admin/all", { params }, "GET");
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:434", "真实接口返回的搜索结果:", data);
          this.repairList = ((_a = data.data) == null ? void 0 : _a.records) || data.records || [];
          this.total = ((_b = data.data) == null ? void 0 : _b.total) || data.total || 0;
          this.calculateStats();
          this.selectAll = false;
          this.selectedIds = [];
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:448", "搜索失败:", err);
          this.repairList = [];
          this.total = 0;
          this.selectAll = false;
          this.selectedIds = [];
          uni.showToast({ title: "加载失败，请重试", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      // 统计数据方法 - 直接使用本地计算，不再调用不存在的接口
      loadStats() {
        this.calculateStats();
      },
      // 本地计算统计数据（降级方案）
      calculateStats() {
        this.stats = {
          total: this.repairList.length,
          pending: this.repairList.filter((item) => item.status === "pending").length,
          processing: this.repairList.filter((item) => item.status === "processing").length,
          completed: this.repairList.filter((item) => item.status === "completed").length,
          cancelled: this.repairList.filter((item) => item.status === "cancelled").length
        };
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
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:563", ...args);
        }
      },
      handleSelectAll(event) {
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:568", "全选按钮点击");
        const shouldSelectAll = !this.selectAll;
        this.selectAll = shouldSelectAll;
        if (shouldSelectAll) {
          this.selectedIds = [...this.repairList.map((item) => String(item.id))];
        } else {
          this.selectedIds = [];
        }
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:581", "更新完成:", this.selectedIds);
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
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:618", "批量处理失败:", err);
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
                formatAppLog("error", "at admin/pages/admin/repair-manage.vue:660", "批量完成失败:", err);
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
                formatAppLog("error", "at admin/pages/admin/repair-manage.vue:705", "批量取消失败:", err);
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
            formatAppLog("error", "at admin/pages/admin/repair-manage.vue:736", `更新ID为${id}的记录失败:`, e);
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
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:755", "导出参数:", params);
          await request("/api/repair/admin/export", { params }, "GET");
          uni.showToast({ title: "导出成功", icon: "success" });
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:763", "导出失败:", err);
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
        formatAppLog("log", "at admin/pages/admin/repair-manage.vue:782", "导出的数据:", csvContent);
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
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:823", actionName + "失败:", err);
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
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:887", "自动刷新已启动，间隔：" + this.autoRefreshInterval + "秒");
        }
      },
      // 停止自动刷新
      stopAutoRefresh() {
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = null;
          formatAppLog("log", "at admin/pages/admin/repair-manage.vue:896", "自动刷新已停止");
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
  function _sfc_render$k(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[24] || (_cache[24] = ($event) => $data.showSidebar = $event),
      pageTitle: "报修管理",
      currentPage: "/admin/pages/admin/repair-manage"
    }, {
      default: vue.withCtx(() => {
        var _a, _b;
        return [
          vue.createElementVNode("view", { class: "manage-container" }, [
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
              vue.createElementVNode("view", {
                class: "stats-card status-completed",
                onClick: _cache[3] || (_cache[3] = ($event) => $options.handleStatsClick("completed"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.completed),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "已完成")
              ]),
              vue.createElementVNode("view", {
                class: "stats-card status-cancelled",
                onClick: _cache[4] || (_cache[4] = ($event) => $options.handleStatsClick("cancelled"))
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-number" },
                  vue.toDisplayString($data.stats.cancelled),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-label" }, "已取消")
              ])
            ]),
            vue.createElementVNode("view", { class: "search-filter-bar" }, [
              vue.createElementVNode("view", { class: "search-box" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    placeholder: "搜索房屋编号、故障类型",
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.searchQuery = $event),
                    onConfirm: _cache[6] || (_cache[6] = (...args) => $options.handleSearch && $options.handleSearch(...args)),
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
                  onClick: _cache[7] || (_cache[7] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                }, "搜索")
              ]),
              vue.createElementVNode("view", { class: "filter-row" }, [
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $data.statusOptions.findIndex((opt) => opt.value === $data.statusFilter),
                  onChange: _cache[8] || (_cache[8] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args)),
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
                  onChange: _cache[9] || (_cache[9] = (...args) => $options.handleFaultTypeChange && $options.handleFaultTypeChange(...args)),
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
            $data.repairList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "batch-operation-bar"
            }, [
              vue.createElementVNode("view", { class: "batch-select" }, [
                vue.createElementVNode("view", { style: { "margin": "10px" } }, [
                  vue.createElementVNode("button", {
                    onClick: _cache[10] || (_cache[10] = (...args) => $options.testSelectAll && $options.testSelectAll(...args))
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
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "batch-buttons"
              }, [
                vue.createElementVNode("button", {
                  class: "batch-btn primary",
                  onClick: _cache[11] || (_cache[11] = (...args) => $options.handleBatchProcess && $options.handleBatchProcess(...args))
                }, " 批量处理 "),
                vue.createElementVNode("button", {
                  class: "batch-btn success",
                  onClick: _cache[12] || (_cache[12] = (...args) => $options.handleBatchComplete && $options.handleBatchComplete(...args))
                }, " 批量完成 "),
                vue.createElementVNode("button", {
                  class: "batch-btn danger",
                  onClick: _cache[13] || (_cache[13] = (...args) => $options.handleBatchCancel && $options.handleBatchCancel(...args))
                }, " 批量取消 "),
                vue.createElementVNode("button", {
                  class: "batch-btn export",
                  onClick: _cache[14] || (_cache[14] = (...args) => $options.handleExport && $options.handleExport(...args)),
                  disabled: $data.exporting
                }, vue.toDisplayString($data.exporting ? "导出中..." : "导出数据"), 9, ["disabled"])
              ])) : vue.createCommentVNode("v-if", true)
            ])) : vue.createCommentVNode("v-if", true),
            $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "loading-state"
            }, [
              vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
            ])) : (vue.openBlock(), vue.createElementBlock("view", {
              key: 2,
              class: "repair-list"
            }, [
              vue.createElementVNode(
                "checkbox-group",
                {
                  onChange: _cache[17] || (_cache[17] = (...args) => $options.handleCheckboxGroupChange && $options.handleCheckboxGroupChange(...args))
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
                        vue.createElementVNode("view", {
                          class: "checkbox-container",
                          onClick: _cache[15] || (_cache[15] = vue.withModifiers(() => {
                          }, ["stop"]))
                        }, [
                          vue.createElementVNode("checkbox", {
                            value: String(item.id),
                            checked: $data.selectedIds.includes(String(item.id))
                          }, null, 8, ["value", "checked"])
                        ]),
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
                          onClick: _cache[16] || (_cache[16] = vue.withModifiers(() => {
                          }, ["stop"]))
                        }, [
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
                            "text",
                            {
                              key: 2,
                              class: "processed-text"
                            },
                            vue.toDisplayString($options.getStatusText(item.status)),
                            1
                            /* TEXT */
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
            ])),
            $data.repairList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 3,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无报修记录")
            ])) : vue.createCommentVNode("v-if", true),
            $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 4,
              class: "pagination"
            }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[18] || (_cache[18] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
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
                onClick: _cache[19] || (_cache[19] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, " 下一页 ", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[20] || (_cache[20] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
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
          $data.showDetail ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "detail-modal",
            onClick: _cache[23] || (_cache[23] = (...args) => $options.closeDetail && $options.closeDetail(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content",
              onClick: _cache[22] || (_cache[22] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "报修详情"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[21] || (_cache[21] = (...args) => $options.closeDetail && $options.closeDetail(...args))
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
  const AdminPagesAdminRepairManage = /* @__PURE__ */ _export_sfc(_sfc_main$l, [["render", _sfc_render$k], ["__scopeId", "data-v-0d64d4ff"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/repair-manage.vue"]]);
  const _sfc_main$k = {
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
        saving: false
      };
    },
    computed: {
      roleFilterValue() {
        return this.roleFilter || "";
      }
    },
    onLoad() {
      this.loadUserList();
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
        this.loadUserList();
      },
      async loadUserList() {
        var _a;
        this.loading = true;
        try {
          const params = { pageNum: 1, pageSize: 20, keyword: this.searchKey };
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
        } catch (err) {
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:210", "加载用户列表失败:", err);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      handleSearch() {
        this.loadUserList();
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
              formatAppLog("error", "at admin/pages/admin/user-manage.vue:258", "修改用户状态失败:", err);
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
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:309", "保存用户信息失败:", err);
          uni.showToast({ title: (err == null ? void 0 : err.message) || "保存失败", icon: "none" });
        } finally {
          this.saving = false;
        }
      }
    }
  };
  function _sfc_render$j(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[7] || (_cache[7] = ($event) => $data.showSidebar = $event),
      pageTitle: "用户管理",
      currentPage: "/admin/pages/admin/user-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "search-section" }, [
            vue.createElementVNode("view", { class: "search-left" }, [
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  class: "search-input",
                  placeholder: "搜索用户姓名或手机号",
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.searchKey = $event),
                  onInput: _cache[1] || (_cache[1] = (...args) => $options.handleSearch && $options.handleSearch(...args))
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
                onChange: _cache[2] || (_cache[2] = (...args) => $options.handleRoleChange && $options.handleRoleChange(...args))
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
            ))
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "empty-state"
          }, [
            vue.createElementVNode("text", null, "暂无用户数据")
          ])),
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
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.editForm.realName = $event),
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
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.editForm.phone = $event),
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
                  onClick: _cache[5] || (_cache[5] = (...args) => $options.closeEditPanel && $options.closeEditPanel(...args))
                }, "取消"),
                vue.createElementVNode("button", {
                  class: "edit-save",
                  disabled: $data.saving,
                  onClick: _cache[6] || (_cache[6] = (...args) => $options.submitEdit && $options.submitEdit(...args))
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
  const AdminPagesAdminUserManage = /* @__PURE__ */ _export_sfc(_sfc_main$k, [["render", _sfc_render$j], ["__scopeId", "data-v-aff5800b"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/user-manage.vue"]]);
  const _sfc_main$j = {
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
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:264", e);
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
          formatAppLog("log", "at admin/pages/admin/notice-manage.vue:321", "准备发布公告", { id, adminId: userInfo && userInfo.id });
          await request(
            `/api/notice/${id}/publish`,
            { params: { adminId: userInfo.id } },
            "PUT"
          );
          formatAppLog("log", "at admin/pages/admin/notice-manage.vue:327", "发布成功", { id });
          uni.showToast({ title: "发布成功" });
          this.loadNoticeList();
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:331", "发布失败详情", e && e.message ? e.message : e, e && e.stack ? e.stack : "");
          uni.showToast({ title: "发布失败", icon: "none" });
        }
      },
      // 单个操作：下架
      async handleOffline(id) {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          formatAppLog("log", "at admin/pages/admin/notice-manage.vue:340", "准备下架公告", { id, adminId: userInfo && userInfo.id });
          await request(
            `/api/notice/${id}/offline`,
            { params: { adminId: userInfo.id } },
            "PUT"
          );
          formatAppLog("log", "at admin/pages/admin/notice-manage.vue:346", "下架成功", { id });
          uni.showToast({ title: "下架成功" });
          this.loadNoticeList();
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:350", "下架失败详情", e && e.message ? e.message : e, e && e.stack ? e.stack : "");
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
  function _sfc_render$i(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[12] || (_cache[12] = ($event) => $data.showSidebar = $event),
      pageTitle: "公告管理",
      currentPage: "/admin/pages/admin/notice-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
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
          vue.createElementVNode("view", { class: "tool-bar" }, [
            vue.createElementVNode("view", { class: "tool-left" }, [
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
            vue.createElementVNode("view", { class: "tool-right" }, [
              vue.createElementVNode("button", {
                class: "create-btn",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleAddNotice && $options.handleAddNotice(...args))
              }, "发布公告")
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : $data.noticeList.length ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "notice-list"
          }, [
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
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "empty-state"
          }, [
            vue.createElementVNode("text", null, "暂无公告数据")
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "pagination"
          }, [
            vue.createElementVNode("button", {
              class: "page-btn",
              disabled: $data.currentPage === 1,
              onClick: _cache[10] || (_cache[10] = (...args) => $options.prevPage && $options.prevPage(...args))
            }, " 上一页 ", 8, ["disabled"]),
            vue.createElementVNode(
              "text",
              null,
              vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPage),
              1
              /* TEXT */
            ),
            vue.createElementVNode("button", {
              class: "page-btn",
              disabled: $data.currentPage === $options.totalPage,
              onClick: _cache[11] || (_cache[11] = (...args) => $options.nextPage && $options.nextPage(...args))
            }, " 下一页 ", 8, ["disabled"])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminNoticeManage = /* @__PURE__ */ _export_sfc(_sfc_main$j, [["render", _sfc_render$i], ["__scopeId", "data-v-e729d483"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/notice-manage.vue"]]);
  const _sfc_main$i = {
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
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:499", "加载停车列表失败:", err);
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
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:530", "支付失败:", err);
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
          const finalList = shouldSlice ? filteredRecords.slice((effectivePageNum - 1) * effectivePageSize, effectivePageNum * effectivePageSize) : filteredRecords;
          this.spaceList = finalList;
          const stats = {
            total: filteredRecords.length,
            available: 0,
            occupied: 0,
            reserved: 0,
            disabled: 0
          };
          filteredRecords.forEach((item) => {
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
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:716", "加载车位列表失败:", err);
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
              formatAppLog("error", "at admin/pages/admin/parking-manage.vue:747", "预订失败:", e);
              uni.showToast({ title: (e == null ? void 0 : e.message) || "预订失败", icon: "none" });
            } finally {
              uni.hideLoading();
            }
          }
        });
      },
      handleOpenLease(space) {
        this.leaseDialogSpace = space;
        this.leaseForm.userId = "";
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
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:824", "办理失败:", err);
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
  function _sfc_render$h(_ctx, _cache, $props, $setup, $data, $options) {
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
                vue.createElementVNode("view", {
                  class: "tab-item",
                  onClick: _cache[2] || (_cache[2] = (...args) => $options.goCarAudit && $options.goCarAudit(...args))
                }, [
                  vue.createElementVNode("text", null, "车辆审核")
                ])
              ]),
              $data.currentTab === "order" ? (vue.openBlock(), vue.createElementBlock("view", { key: 0 }, [
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
                  ])
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
                $data.parkingList.length === 0 && !$data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "empty-state"
                }, [
                  vue.createElementVNode("text", null, "暂无停车记录")
                ])) : vue.createCommentVNode("v-if", true),
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
                    vue.renderList($data.spaceList, (space) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: space.id,
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
                $data.spaceList.length === 0 && !$data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "empty-state"
                }, [
                  vue.createElementVNode("text", null, "暂无车位信息")
                ])) : vue.createCommentVNode("v-if", true),
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
                vue.createElementVNode("text", { class: "dialog-label" }, "卡类型"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.leaseTypeOptions,
                  "range-key": "label",
                  onChange: _cache[17] || (_cache[17] = (...args) => $options.handleLeaseTypeChange && $options.handleLeaseTypeChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "dialog-picker-value" },
                    vue.toDisplayString($options.getLeaseTypeLabel($data.leaseForm.leaseType)),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ]),
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "时长(月)"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "dialog-input",
                    "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => $data.leaseForm.durationMonths = $event),
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
                  mode: "selector",
                  range: $data.payChannelOptions,
                  "range-key": "label",
                  onChange: _cache[19] || (_cache[19] = (...args) => $options.handlePayChannelChange && $options.handlePayChannelChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "dialog-picker-value" },
                    vue.toDisplayString($options.getPayChannelLabel($data.leaseForm.payChannel)),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ]),
              vue.createElementVNode("view", { class: "dialog-row" }, [
                vue.createElementVNode("text", { class: "dialog-label" }, "备注")
              ]),
              vue.withDirectives(vue.createElementVNode(
                "textarea",
                {
                  class: "dialog-textarea",
                  "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => $data.leaseForm.remark = $event),
                  placeholder: "可填写办理说明"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.leaseForm.remark]
              ])
            ]),
            vue.createElementVNode("view", { class: "dialog-footer" }, [
              vue.createElementVNode("button", {
                class: "dialog-btn cancel",
                onClick: _cache[21] || (_cache[21] = (...args) => $options.closeLeaseDialog && $options.closeLeaseDialog(...args))
              }, "取消"),
              vue.createElementVNode("button", {
                class: "dialog-btn confirm",
                onClick: _cache[22] || (_cache[22] = (...args) => $options.confirmLease && $options.confirmLease(...args))
              }, "确认办理")
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ],
      64
      /* STABLE_FRAGMENT */
    );
  }
  const AdminPagesAdminParkingManage = /* @__PURE__ */ _export_sfc(_sfc_main$i, [["render", _sfc_render$h], ["__scopeId", "data-v-668f6823"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/parking-manage.vue"]]);
  const _sfc_main$h = {
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
  function _sfc_render$g(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[3] || (_cache[3] = ($event) => $data.showSidebar = $event),
      pageTitle: "社区管理",
      currentPage: "/admin/pages/admin/community-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
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
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "community-detail"
          }, [
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
            vue.createElementVNode("view", { class: "action-section" }, [
              vue.createElementVNode("button", {
                class: "edit-btn",
                onClick: _cache[2] || (_cache[2] = (...args) => $options.handleEditCommunity && $options.handleEditCommunity(...args))
              }, " 编辑社区信息 ")
            ])
          ]))
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminCommunityManage = /* @__PURE__ */ _export_sfc(_sfc_main$h, [["render", _sfc_render$g], ["__scopeId", "data-v-48e2c863"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/community-manage.vue"]]);
  const _sfc_main$g = {
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
  function _sfc_render$f(_ctx, _cache, $props, $setup, $data, $options) {
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
  const AdminPagesAdminNoticeEdit = /* @__PURE__ */ _export_sfc(_sfc_main$g, [["render", _sfc_render$f], ["__scopeId", "data-v-227539c9"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/notice-edit.vue"]]);
  const _imports_0 = "/static/empty.png";
  const _sfc_main$f = {
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
        ]
      };
    },
    onLoad() {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      this.generateForm.month = `${year}-${month}`;
      this.loadData();
    },
    methods: {
      onSearch() {
        this.loadData();
      },
      switchTab(tabValue) {
        this.typeFilter = tabValue;
        this.loadData();
      },
      async loadData() {
        this.loading = true;
        try {
          const isStatusFilter = ["unpaid", "paid"].includes(this.typeFilter);
          const params = {
            keyword: this.searchQuery || void 0,
            status: isStatusFilter ? this.typeFilter === "unpaid" ? "UNPAID" : "PAID" : void 0,
            pageNum: 1,
            pageSize: 20
          };
          const data = await request("/api/fee/list", params, "GET");
          this.feeList = (data.records || []).map((item) => {
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
          formatAppLog("error", "at admin/pages/admin/fee-manage.vue:262", e);
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
          formatAppLog("error", "at admin/pages/admin/fee-manage.vue:326", "生成账单失败:", e);
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
                await request(`/api/fee/remind/${item.id}`, {}, "POST");
                uni.showToast({ title: "发送成功", icon: "success" });
              } catch (e) {
              }
            }
          }
        });
      }
    }
  };
  function _sfc_render$e(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[13] || (_cache[13] = ($event) => $data.showSidebar = $event),
      pageTitle: "费用管理",
      currentPage: "/admin/pages/admin/fee-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "container" }, [
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
            vue.createElementVNode("view", { class: "action-buttons" }, [
              vue.createElementVNode("button", {
                class: "action-btn generate",
                onClick: _cache[3] || (_cache[3] = (...args) => $options.openGenerateModal && $options.openGenerateModal(...args))
              }, "生成账单"),
              vue.createElementVNode("button", {
                class: "action-btn remind",
                onClick: _cache[4] || (_cache[4] = (...args) => $options.handleBatchRemind && $options.handleBatchRemind(...args))
              }, "一键催缴")
            ])
          ]),
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
            ]))
          ]),
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
          $data.showGenerateModal ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "modal-mask",
            onClick: _cache[12] || (_cache[12] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
          }, [
            vue.createElementVNode("view", {
              class: "modal-content",
              onClick: _cache[11] || (_cache[11] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "modal-header" }, [
                vue.createElementVNode("text", { class: "modal-title" }, "生成本期账单"),
                vue.createElementVNode("text", {
                  class: "close-icon",
                  onClick: _cache[5] || (_cache[5] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
                }, "×")
              ]),
              vue.createElementVNode("view", { class: "modal-body" }, [
                vue.createElementVNode("view", { class: "form-item" }, [
                  vue.createElementVNode("text", { class: "label" }, "账单月份"),
                  vue.createElementVNode("picker", {
                    mode: "date",
                    fields: "month",
                    value: $data.generateForm.month,
                    onChange: _cache[6] || (_cache[6] = (...args) => $options.onMonthChange && $options.onMonthChange(...args))
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
                    onChange: _cache[7] || (_cache[7] = (...args) => $options.onFeeTypeChange && $options.onFeeTypeChange(...args))
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
                    onChange: _cache[8] || (_cache[8] = (...args) => $options.onDeadlineChange && $options.onDeadlineChange(...args))
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
                  onClick: _cache[9] || (_cache[9] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
                }, "取消"),
                vue.createElementVNode("button", {
                  class: "modal-btn confirm",
                  onClick: _cache[10] || (_cache[10] = (...args) => $options.submitGenerateBill && $options.submitGenerateBill(...args))
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
  const AdminPagesAdminFeeManage = /* @__PURE__ */ _export_sfc(_sfc_main$f, [["render", _sfc_render$e], ["__scopeId", "data-v-764c8d8b"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/fee-manage.vue"]]);
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
          { value: "pending", label: "待处理" },
          { value: "processed", label: "已处理" }
        ],
        complaintList: [],
        // 处理弹窗
        showHandleModal: false,
        currentComplaint: null,
        handleResult: ""
      };
    },
    onLoad() {
      this.loadData();
    },
    methods: {
      async loadData() {
        this.loading = true;
        try {
          const params = {
            keyword: this.searchQuery || void 0,
            status: this.statusFilter || void 0
          };
          const data = await request("/api/complaint/list", { params }, "GET");
          this.complaintList = (data.records || []).map((item) => ({
            id: item.id,
            type: item.type,
            content: item.content,
            images: item.images,
            // 需要后端返回图片URL
            ownerName: item.ownerName,
            // 业主实名 (可能为空)
            userName: item.userName,
            // 登录用户名 (通常不为空)
            phone: item.phone,
            // 需要后端返回手机号
            buildingNo: item.buildingNo,
            houseNo: item.houseNo,
            createTime: item.createTime,
            status: item.status,
            // pending/processed
            result: item.result
          }));
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/complaint-manage.vue:192", "加载投诉列表失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      handleSearch() {
        this.loadData();
      },
      handleStatusChange(e) {
        this.statusFilter = this.statusOptions[e.detail.value].value;
        this.loadData();
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
      viewDetail(item) {
        uni.showModal({
          title: "投诉详情",
          content: `投诉内容：${item.content}

处理结果：${item.result || "暂无"}`,
          showCancel: false
        });
      },
      async submitHandle() {
        if (!this.handleResult) {
          uni.showToast({ title: "请输入处理结果", icon: "none" });
          return;
        }
        uni.showLoading({ title: "提交中..." });
        try {
          await request("/api/complaint/handle", {
            id: this.currentComplaint.id,
            result: this.handleResult
          }, "PUT");
          const item = this.complaintList.find((i) => i.id === this.currentComplaint.id);
          if (item) {
            item.status = "processed";
            item.result = this.handleResult;
          }
          uni.showToast({ title: "处理成功", icon: "success" });
          this.closeHandleModal();
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/complaint-manage.vue:251", "处理投诉失败", e);
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
          "status-pending": status === "pending",
          "status-processed": status === "processed"
        };
      },
      getStatusText(status) {
        const map = {
          "pending": "待处理",
          "processed": "已处理"
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
      "onUpdate:showSidebar": _cache[10] || (_cache[10] = ($event) => $data.showSidebar = $event),
      pageTitle: "投诉处理",
      currentPage: "/admin/pages/admin/complaint-manage"
    }, {
      default: vue.withCtx(() => {
        var _a;
        return [
          vue.createElementVNode("view", { class: "manage-container" }, [
            vue.createElementVNode("view", { class: "search-filter-bar" }, [
              vue.createElementVNode("view", { class: "search-box" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    placeholder: "搜索投诉内容、业主姓名",
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.searchQuery = $event),
                    onConfirm: _cache[1] || (_cache[1] = (...args) => $options.handleSearch && $options.handleSearch(...args)),
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
                  onClick: _cache[2] || (_cache[2] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                }, "搜索")
              ]),
              vue.createElementVNode("view", { class: "filter-row" }, [
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $data.statusOptions.findIndex((opt) => opt.value === $data.statusFilter),
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args)),
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
                        item.status === "processed" ? (vue.openBlock(), vue.createElementBlock("view", {
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
                        item.status === "pending" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "action-btn handle",
                          onClick: ($event) => $options.openHandleModal(item)
                        }, " 立即处理 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                        item.phone ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 1,
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
              ]))
            ]),
            $data.showHandleModal ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "modal-mask",
              onClick: _cache[9] || (_cache[9] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
            }, [
              vue.createElementVNode("view", {
                class: "modal-content",
                onClick: _cache[8] || (_cache[8] = vue.withModifiers(() => {
                }, ["stop"]))
              }, [
                vue.createElementVNode("view", { class: "modal-header" }, [
                  vue.createElementVNode("text", { class: "modal-title" }, "处理投诉"),
                  vue.createElementVNode("text", {
                    class: "close-icon",
                    onClick: _cache[4] || (_cache[4] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
                  }, "×")
                ]),
                vue.createElementVNode("view", { class: "modal-body" }, [
                  vue.withDirectives(vue.createElementVNode(
                    "textarea",
                    {
                      "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.handleResult = $event),
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
                    onClick: _cache[6] || (_cache[6] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "confirm-btn",
                    onClick: _cache[7] || (_cache[7] = (...args) => $options.submitHandle && $options.submitHandle(...args))
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
  const AdminPagesAdminComplaintManage = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["render", _sfc_render$d], ["__scopeId", "data-v-f00c65e1"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/complaint-manage.vue"]]);
  const _sfc_main$d = {
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
          { value: "pending", label: "待审核" },
          { value: "approved", label: "已通过" },
          { value: "rejected", label: "已拒绝" }
        ],
        visitorList: []
      };
    },
    onLoad() {
      this.loadData();
    },
    methods: {
      async loadData() {
        this.loading = true;
        try {
          const params = {
            keyword: this.searchQuery || void 0,
            status: this.statusFilter || void 0,
            pageNum: 1,
            pageSize: 10
          };
          const data = await request("/api/visitor/list", { params }, "GET");
          this.visitorList = (data.records || []).map((item) => ({
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
            // pending/approved/rejected
          }));
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/visitor-manage.vue:153", "加载访客列表失败", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      handleSearch() {
        this.loadData();
      },
      handleStatusChange(e) {
        this.statusFilter = this.statusOptions[e.detail.value].value;
        this.loadData();
      },
      handleApprove(item) {
        uni.showModal({
          title: "通过审核",
          content: `确认允许 ${item.visitorName} 访问吗？`,
          success: async (res) => {
            if (res.confirm) {
              try {
                await request("/api/visitor/audit", {
                  id: item.id,
                  status: "approved"
                }, "PUT");
                item.status = "approved";
                uni.showToast({ title: "审核通过", icon: "success" });
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
                await request("/api/visitor/audit", {
                  id: item.id,
                  status: "rejected"
                }, "PUT");
                item.status = "rejected";
                uni.showToast({ title: "已拒绝", icon: "none" });
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
          "status-pending": status === "pending",
          "status-approved": status === "approved",
          "status-rejected": status === "rejected"
        };
      },
      getStatusText(status) {
        const map = {
          "pending": "待审核",
          "approved": "已通过",
          "rejected": "已拒绝"
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
      "onUpdate:showSidebar": _cache[4] || (_cache[4] = ($event) => $data.showSidebar = $event),
      pageTitle: "访客审核",
      currentPage: "/admin/pages/admin/visitor-manage"
    }, {
      default: vue.withCtx(() => {
        var _a;
        return [
          vue.createElementVNode("view", { class: "manage-container" }, [
            vue.createElementVNode("view", { class: "search-filter-bar" }, [
              vue.createElementVNode("view", { class: "search-box" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    placeholder: "搜索访客姓名、业主姓名",
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.searchQuery = $event),
                    onConfirm: _cache[1] || (_cache[1] = (...args) => $options.handleSearch && $options.handleSearch(...args)),
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
                  onClick: _cache[2] || (_cache[2] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                }, "搜索")
              ]),
              vue.createElementVNode("view", { class: "filter-row" }, [
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $data.statusOptions.findIndex((opt) => opt.value === $data.statusFilter),
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args)),
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
                        item.status === "pending" ? (vue.openBlock(), vue.createElementBlock("view", {
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
              ]))
            ])
          ])
        ];
      }),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminVisitorManage = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["render", _sfc_render$c], ["__scopeId", "data-v-20feed08"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/visitor-manage.vue"]]);
  const _sfc_main$c = {
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
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[1] || (_cache[1] = ($event) => $data.showSidebar = $event),
      pageTitle: "社区活动",
      currentPage: "/admin/pages/admin/activity-manage"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "action-bar" }, [
            vue.createElementVNode("button", {
              class: "create-btn",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.handleCreate && $options.handleCreate(...args))
            }, "发布新活动")
          ]),
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
  const AdminPagesAdminActivityManage = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__scopeId", "data-v-de138e10"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/activity-manage.vue"]]);
  const _sfc_main$b = {
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
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
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
  const AdminPagesAdminActivityEdit = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__scopeId", "data-v-3b54f228"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/activity-edit.vue"]]);
  const _sfc_main$a = {
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
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
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
  const AdminPagesAdminActivitySignups = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__scopeId", "data-v-f56b704f"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/activity-signups.vue"]]);
  const _sfc_main$9 = {
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
          "REJECTED": "已拒绝"
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
          this.list = Array.isArray(res) ? res : res.records || [];
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/car-audit.vue:123", "加载失败", e);
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
          content: `确认批准车辆 ${item.plateNo} 的绑定申请吗？`,
          success: async (res) => {
            if (res.confirm) {
              await this.submitAudit(item.id, "APPROVED");
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
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
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
      ])
    ]);
  }
  const AdminPagesAdminCarAudit = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__scopeId", "data-v-9dc841ea"], ["__file", "E:/HBuilderProjects/smart-community/admin/pages/admin/car-audit.vue"]]);
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
      vue.createElementVNode("view", { class: "section-header" }, [
        vue.createElementVNode("text", { class: "section-title" }, "全部公告")
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
  const OwnerPagesNoticeList = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__scopeId", "data-v-4f493c5b"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/notice/list.vue"]]);
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
  const OwnerPagesNoticeDetail = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/notice/detail.vue"]]);
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
  const OwnerPagesTopicDetail = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/topic/detail.vue"]]);
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
      vue.createElementVNode("view", { class: "section-header" }, [
        vue.createElementVNode("text", { class: "section-title" }, "热门话题"),
        vue.createElementVNode("text", {
          class: "section-link",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.openPostModal && $options.openPostModal(...args))
        }, "发帖")
      ]),
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
  const OwnerPagesTopicList = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/topic/list.vue"]]);
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
          const res = await request.get("/api/parking/account/balance");
          if (typeof res === "number") {
            this.balance = res;
          } else if (res && typeof res.data === "number") {
            this.balance = res.data;
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/parking/recharge.vue:88", "获取余额失败", e);
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
          formatAppLog("error", "at owner/pages/parking/recharge.vue:125", "充值失败:", e);
          uni.showToast({ title: "充值失败", icon: "none" });
        }
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "page" }, [
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
      vue.createElementVNode("button", {
        class: "btn primary",
        onClick: _cache[1] || (_cache[1] = (...args) => $options.doRecharge && $options.doRecharge(...args))
      }, " 立即充值 ")
    ]);
  }
  const OwnerPagesParkingRecharge = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/parking/recharge.vue"]]);
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
          const orderId = await request.post(
            "/api/parking/lease/order/create",
            {
              userId: this.userInfo.id,
              spaceId: this.car.id,
              leaseType: this.car.leaseType
            }
          );
          await request.post("/api/parking/lease/order/pay", {
            orderId,
            payChannel: "BALANCE"
          });
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
          await request.post("/api/parking/gate/enter", {
            plateNo: this.car.plateNo
          });
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
        formatAppLog("log", "at owner/pages/parking/space-detail.vue:166", "🔹 点击绑定车牌按钮", this.car, this.userInfo);
        if (!this.car || !this.car.id) {
          uni.showToast({ title: "车位数据为空", icon: "none" });
          formatAppLog("error", "at owner/pages/parking/space-detail.vue:170", "❌ car 对象为空或 car.id 未获取");
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
            formatAppLog("log", "at owner/pages/parking/space-detail.vue:181", "🚀 showModal 返回：", res);
            if (res.confirm && res.content) {
              const plateNo = res.content.trim();
              if (!plateNo) {
                uni.showToast({ title: "车牌号不能为空", icon: "none" });
                formatAppLog("warn", "at owner/pages/parking/space-detail.vue:186", "❌ 用户未输入车牌号");
                return;
              }
              formatAppLog("log", "at owner/pages/parking/space-detail.vue:190", "绑定车牌号：", plateNo);
              try {
                const result = await request.post("/api/parking/plate/bind", {
                  spaceId: this.car.id,
                  plateNo
                });
                formatAppLog("log", "at owner/pages/parking/space-detail.vue:196", "接口返回：", result);
                this.car.plateNo = plateNo;
                uni.showToast({ title: "绑定成功", icon: "success" });
              } catch (e) {
                formatAppLog("error", "at owner/pages/parking/space-detail.vue:200", "❌ 绑定接口报错：", e);
                uni.showToast({ title: e.message || "绑定失败", icon: "none" });
              }
            } else {
              formatAppLog("log", "at owner/pages/parking/space-detail.vue:204", "用户取消输入");
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
          await request.post("/api/parking/plate/unbind", {
            userId: this.userInfo.id,
            spaceId: this.car.id,
            plateNo: this.car.plateNo
          });
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
      ])) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "empty"
      }, [
        vue.createElementVNode("text", null, "❌ 未获取到车位数据")
      ])),
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
  const OwnerPagesParkingSpaceDetail = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/parking/space-detail.vue"]]);
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
  const OwnerPagesParkingBindCar = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-3fdde2a0"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/parking/bind-car.vue"]]);
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
          const res = await request.get("/api/community/list");
          this.communities = Array.isArray(res) ? res : res.records || [];
        } catch (e) {
          formatAppLog("error", "at owner/pages/mine/house-bind.vue:90", "获取小区列表失败", e);
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
  const OwnerPagesMineHouseBind = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-be943aa7"], ["__file", "E:/HBuilderProjects/smart-community/owner/pages/mine/house-bind.vue"]]);
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
  __definePage("owner/pages/repair/repair", OwnerPagesRepairRepair);
  __definePage("admin/pages/admin/repair-manage", AdminPagesAdminRepairManage);
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
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "E:/HBuilderProjects/smart-community/App.vue"]]);
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
      uni.redirectTo({ url: "/admin/pages/admin/repair-manage" });
    } else {
      uni.switchTab({ url: "/owner/pages/index/index" });
    }
  }
  uni.addInterceptor("navigateTo", {
    invoke(e) {
      const token = uni.getStorageSync("token");
      const userInfo = uni.getStorageSync("userInfo");
      if (!e.url.includes("/pages/login/login")) {
        if (!token) {
          formatAppLog("log", "at main.js:14", "未登录，跳转到登录页");
          uni.redirectTo({ url: "/pages/login/login" });
          return false;
        }
        const pagePath = e.url.split("?")[0];
        if (!checkPagePermission(pagePath, userInfo == null ? void 0 : userInfo.role)) {
          formatAppLog("log", "at main.js:22", "无权限访问该页面");
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
        formatAppLog("log", "at main.js:39", "未登录，跳转到登录页");
        uni.redirectTo({ url: "/pages/login/login" });
        return false;
      }
      if ((userInfo == null ? void 0 : userInfo.role) === "admin" || (userInfo == null ? void 0 : userInfo.role) === "super_admin") {
        formatAppLog("log", "at main.js:46", "管理员禁止访问普通用户tabBar");
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
