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
  const DEFAULT_BASE_URL = "http://192.168.1.65:80";
  function normalizeBaseUrl(url) {
    return String(url || "").replace(/\/+$/, "");
  }
  function getBaseUrl() {
    const customBaseUrl = normalizeBaseUrl(uni.getStorageSync("apiBaseUrl"));
    if (customBaseUrl) {
      return customBaseUrl;
    }
    return DEFAULT_BASE_URL;
  }
  function getRequestHint(requestUrl) {
    const hints = [];
    hints.push("如果你现在是真机预览，请确认手机和服务器在同一局域网，并且手机浏览器能打开该地址。");
    hints.push(`请确认接口基地址可访问：${requestUrl}`);
    return hints.join("");
  }
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
      formatAppLog("log", "at utils/request.js:90", "Token存在:", hasToken, hasToken ? `len=${String(token).length}` : "");
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
      formatAppLog("warn", "at utils/request.js:102", "未注入Authorization头(无token)");
    }
    finalOptions.header = headers;
    const baseUrl = getBaseUrl();
    let requestUrl = baseUrl + finalOptions.url;
    if (finalOptions.params && Object.keys(finalOptions.params).length > 0) {
      formatAppLog("log", "at utils/request.js:111", "请求参数:", finalOptions.params);
      const paramStr = Object.entries(finalOptions.params).filter(([key, value]) => value !== null && value !== void 0 && value !== "").map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
      if (paramStr) {
        requestUrl += (requestUrl.includes("?") ? "&" : "?") + paramStr;
      }
    }
    uni.showLoading({ title: "加载中...", mask: true });
    return new Promise((resolve, reject) => {
      formatAppLog("log", "at utils/request.js:126", "当前API基地址:", baseUrl);
      formatAppLog("log", "at utils/request.js:127", "发送请求:", requestUrl, finalOptions.method, finalOptions.data);
      formatAppLog("log", "at utils/request.js:128", "请求头已带授权:", Boolean(finalOptions.header && finalOptions.header.Authorization));
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
          const rawMsg = msg == null ? "" : String(msg);
          let normalizedMsg = rawMsg;
          if (normalizedMsg.includes("Duplicate entry") || normalizedMsg.includes("SQLIntegrityConstraintViolationException")) {
            if (normalizedMsg.includes("sys_user_register_request") && normalizedMsg.toLowerCase().includes("username")) {
              normalizedMsg = "用户名已存在或已提交注册申请，请更换用户名";
            } else {
              normalizedMsg = "数据已存在，请勿重复提交";
            }
          }
          formatAppLog("log", "at utils/request.js:153", "响应状态:", res.statusCode, "业务code:", code, "msg:", rawMsg, "url:", requestUrl);
          if (res.statusCode === 200) {
            if (bizCode === 200 || bizCode === 0 || bizCode === void 0 || Number.isNaN(bizCode)) {
              const resolvedData = data != null ? data : responseData;
              formatAppLog("log", "at utils/request.js:161", "Request resolved with:", JSON.stringify(resolvedData).substring(0, 200) + "...");
              resolve(resolvedData);
            } else {
              if (code === 401) {
                formatAppLog("warn", "at utils/request.js:169", "401未登录拦截:", requestUrl);
                uni.showModal({
                  title: "登录提示",
                  content: normalizedMsg || "请先登录",
                  showCancel: false,
                  success: () => {
                    uni.redirectTo({ url: "/owner/pages/login/login" });
                  }
                });
                reject(new Error(normalizedMsg || "未登录"));
              } else if (code === 403) {
                formatAppLog("warn", "at utils/request.js:181", "403无权限拦截:", requestUrl);
                uni.showModal({
                  title: "权限提示",
                  content: normalizedMsg || "您没有权限执行此操作",
                  showCancel: false
                });
                reject(new Error(normalizedMsg || "无权限操作"));
              } else {
                uni.showModal({
                  title: "操作失败",
                  content: normalizedMsg || "操作失败，请重试",
                  showCancel: false
                });
                reject(new Error(normalizedMsg || "操作失败"));
              }
            }
          } else {
            if (res.statusCode === 401) {
              formatAppLog("warn", "at utils/request.js:204", "HTTP 401 未登录:", requestUrl);
              uni.showModal({
                title: "登录提示",
                content: normalizedMsg || "请先登录",
                showCancel: false,
                success: () => {
                  uni.redirectTo({ url: "/owner/pages/login/login" });
                }
              });
              reject(new Error(normalizedMsg || "未登录"));
            } else {
              const errMsg = normalizedMsg || `请求失败，状态码: ${res.statusCode}`;
              formatAppLog("warn", "at utils/request.js:217", "HTTP错误:", res.statusCode, "url:", requestUrl);
              formatAppLog("warn", "at utils/request.js:218", "错误详情(Body):", JSON.stringify(res.data));
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
            errMsg = getRequestHint(requestUrl);
          } else {
            errMsg = err.errMsg || errMsg;
          }
          formatAppLog("error", "at utils/request.js:247", "请求失败:", err && err.errMsg, "url:", requestUrl);
          uni.showModal({
            title: "网络错误",
            content: errMsg,
            showCancel: false
          });
          reject(new Error(errMsg));
        },
        complete: () => {
          formatAppLog("log", "at utils/request.js:257", "请求完成:", requestUrl);
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
  formatAppLog("log", "at utils/request.js:284", "request.js loaded. Methods attached:", {
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
  const _sfc_main$F = {
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
            } else if (userInfo.role === "worker") {
              uni.redirectTo({ url: "/admin/pages/admin/worker-tasks" });
            } else {
              uni.switchTab({ url: "/owner/pages/index/index" });
            }
          }, 1500);
        } catch (err) {
          uni.hideLoading();
          formatAppLog("error", "at owner/pages/login/login.vue:131", "登录错误:", err);
          const errorMessage = (err == null ? void 0 : err.message) || "登录失败，请重试";
          uni.showToast({ title: errorMessage, icon: "none" });
        }
      }
    }
  };
  function _sfc_render$E(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$F, [["render", _sfc_render$E], ["__scopeId", "data-v-cebd4568"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/login/login.vue"]]);
  const _sfc_main$E = {
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
  function _sfc_render$D(_ctx, _cache, $props, $setup, $data, $options) {
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
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$E, [["render", _sfc_render$D], ["__scopeId", "data-v-d54a544d"], ["__file", "D:/HBuilderProjects/smart-community/components/admin-sidebar/admin-sidebar.vue"]]);
  const _sfc_main$D = {
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
      },
      pageBreadcrumb: {
        type: String,
        default: "Home > Dashboard"
      },
      showPageBanner: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        appName: "智慧社区",
        version: "物业运营后台",
        userName: "管理员",
        userInitial: "A",
        userRoleLabel: "管理员",
        currentDate: "",
        currentTime: "",
        weather: "多云 26°C 12km/h",
        lastSignIn: "昨天 16:54",
        menuList: [
          { text: "仪表盘", icon: "◫", path: "/admin/pages/admin/dashboard/index", roles: ["admin", "super_admin"] },
          { text: "任务中心", icon: "⌘", path: "/admin/pages/admin/worker-tasks", roles: ["worker"] },
          { text: "报修管理", icon: "⌂", path: "/admin/pages/admin/repair-manage", roles: ["admin", "super_admin"], badge: 0 },
          { text: "工单管理", icon: "▣", path: "/admin/pages/admin/work-order-manage", roles: ["admin", "super_admin"], badge: 0 },
          { text: "公告管理", icon: "✉", path: "/admin/pages/admin/notice-manage", roles: ["admin", "super_admin"] },
          { text: "费用管理", icon: "¥", path: "/admin/pages/admin/fee-manage", roles: ["admin", "super_admin"] },
          { text: "投诉处理", icon: "☏", path: "/admin/pages/admin/complaint-manage", roles: ["admin", "super_admin"], badge: 0 },
          { text: "访客审核", icon: "◉", path: "/admin/pages/admin/visitor-manage", roles: ["admin", "super_admin"], badge: 0 },
          { text: "注册审核", icon: "✓", path: "/admin/pages/admin/register-review", roles: ["super_admin"] },
          { text: "房屋绑定审核", icon: "⌂", path: "/admin/pages/admin/house-bind-review", roles: ["admin", "super_admin"] },
          { text: "社区活动", icon: "✦", path: "/admin/pages/admin/activity-manage", roles: ["admin", "super_admin"] },
          { text: "停车管理", icon: "▤", path: "/admin/pages/admin/parking-manage", roles: ["admin", "super_admin"] },
          { text: "用户管理", icon: "☺", path: "/admin/pages/admin/user-manage", roles: ["admin", "super_admin"] },
          { text: "操作日志", icon: "≣", path: "/admin/pages/admin/oper-log", roles: ["super_admin"] },
          { text: "系统配置", icon: "⚙", path: "/admin/pages/admin/system-config", roles: ["super_admin"] }
        ],
        timer: null
      };
    },
    computed: {
      filteredMenuList() {
        const userInfo = uni.getStorageSync("userInfo");
        const role = userInfo ? userInfo.role : "";
        return this.menuList.filter((item) => {
          if (!item.roles)
            return true;
          return item.roles.includes(role);
        });
      }
    },
    mounted() {
      this.initUserInfo();
      this.updateDateTime();
      this.timer = setInterval(() => {
        this.updateDateTime();
      }, 1e3);
    },
    beforeDestroy() {
      if (this.timer) {
        clearInterval(this.timer);
      }
    },
    methods: {
      initUserInfo() {
        const userInfo = uni.getStorageSync("userInfo");
        if (userInfo && userInfo.username) {
          this.userName = userInfo.username;
          this.userInitial = userInfo.username.charAt(0).toUpperCase();
        }
        if (userInfo && userInfo.role) {
          const roleMap = {
            super_admin: "超级管理员",
            admin: "管理员",
            worker: "维修人员"
          };
          this.userRoleLabel = roleMap[userInfo.role] || "管理员";
        }
      },
      updateDateTime() {
        const now = /* @__PURE__ */ new Date();
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = days[now.getDay()];
        const date = now.getDate();
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        this.currentDate = `${day}, ${date} ${month} ${year}`;
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        this.currentTime = `${hours}:${minutes}:${seconds}`;
      },
      handleMenuClick(menu) {
        if (this.currentPage === menu.path)
          return;
        uni.navigateTo({
          url: menu.path,
          fail: () => {
            uni.switchTab({
              url: menu.path
            });
          }
        });
      },
      showSearch() {
        uni.showToast({ title: "搜索功能开发中", icon: "none" });
      },
      showUserMenu() {
        uni.showActionSheet({
          itemList: ["个人信息", "修改密码", "退出登录"],
          success: (res) => {
            if (res.tapIndex === 2) {
              this.handleLogout();
            }
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
              uni.reLaunch({ url: "/owner/pages/login/login" });
            }
          }
        });
      }
    }
  };
  function _sfc_render$C(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "admin-layout" }, [
      vue.createElementVNode("view", { class: "sidebar-fixed" }, [
        vue.createElementVNode("view", { class: "sidebar-header" }, [
          vue.createElementVNode("view", { class: "brand-row" }, [
            vue.createElementVNode(
              "text",
              { class: "brand-name" },
              vue.toDisplayString($data.appName),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "brand-version" },
              vue.toDisplayString($data.version),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "header-tools" }, [
            vue.createElementVNode("view", { class: "tool-chip" }, "☰"),
            vue.createElementVNode("view", { class: "tool-chip tool-chip-badge" }, [
              vue.createElementVNode("text", null, "✉"),
              vue.createElementVNode("text", { class: "chip-badge" }, "23")
            ]),
            vue.createElementVNode("view", { class: "tool-chip tool-chip-badge" }, [
              vue.createElementVNode("text", null, "⚠"),
              vue.createElementVNode("text", { class: "chip-badge success" }, "5")
            ])
          ])
        ]),
        vue.createElementVNode("view", {
          class: "menu-search",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.showSearch && $options.showSearch(...args))
        }, [
          vue.createElementVNode("text", { class: "menu-search-icon" }, "⌕"),
          vue.createElementVNode("text", { class: "menu-search-text" }, "搜索内容")
        ]),
        vue.createElementVNode("scroll-view", {
          class: "menu-scroll",
          "scroll-y": ""
        }, [
          vue.createElementVNode("view", { class: "menu-section" }, [
            vue.createElementVNode("view", { class: "menu-section-head" }, [
              vue.createElementVNode("text", { class: "menu-section-title" }, "工作台"),
              vue.createElementVNode("text", { class: "menu-section-gear" }, "⚙")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($options.filteredMenuList, (menu, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: index,
                  class: vue.normalizeClass(["menu-item", { "menu-item-active": $props.currentPage === menu.path }]),
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
                  ),
                  menu.badge && menu.badge > 0 ? (vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: 0,
                      class: "menu-badge"
                    },
                    vue.toDisplayString(menu.badge > 99 ? "99+" : menu.badge),
                    1
                    /* TEXT */
                  )) : (vue.openBlock(), vue.createElementBlock("text", {
                    key: 1,
                    class: "menu-dot"
                  }, "•"))
                ], 10, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])
      ]),
      vue.createElementVNode("view", { class: "main-content" }, [
        vue.createElementVNode("view", { class: "top-navbar" }, [
          vue.createElementVNode("view", { class: "nav-left" }, [
            vue.createElementVNode("view", { class: "nav-chip" }, [
              vue.createElementVNode("text", { class: "nav-chip-icon" }, "📅"),
              vue.createElementVNode(
                "text",
                { class: "nav-chip-text" },
                vue.toDisplayString($data.currentDate),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "nav-chip" }, [
              vue.createElementVNode("text", { class: "nav-chip-icon" }, "🕒"),
              vue.createElementVNode(
                "text",
                { class: "nav-chip-text" },
                vue.toDisplayString($data.currentTime),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "nav-chip nav-chip-wide" }, [
              vue.createElementVNode("text", { class: "nav-chip-icon" }, "☼"),
              vue.createElementVNode(
                "text",
                { class: "nav-chip-text" },
                vue.toDisplayString($data.weather),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "nav-right" }, [
            vue.createElementVNode("view", {
              class: "user-avatar",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.showUserMenu && $options.showUserMenu(...args))
            }, [
              vue.createElementVNode(
                "text",
                { class: "avatar-text" },
                vue.toDisplayString($data.userInitial),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", {
              class: "user-block",
              onClick: _cache[2] || (_cache[2] = (...args) => $options.showUserMenu && $options.showUserMenu(...args))
            }, [
              vue.createElementVNode(
                "text",
                { class: "user-greet" },
                "Hi, " + vue.toDisplayString($data.userName),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "user-role" },
                vue.toDisplayString($data.userRoleLabel),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", {
              class: "nav-action",
              onClick: _cache[3] || (_cache[3] = (...args) => $options.showUserMenu && $options.showUserMenu(...args))
            }, [
              vue.createElementVNode("text", { class: "nav-action-text" }, "设置")
            ]),
            vue.createElementVNode("view", {
              class: "nav-action nav-action-square",
              onClick: _cache[4] || (_cache[4] = (...args) => $options.handleLogout && $options.handleLogout(...args))
            }, [
              vue.createElementVNode("text", { class: "nav-action-text" }, "⎋")
            ])
          ])
        ]),
        $props.showPageBanner ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "page-banner"
        }, [
          vue.createElementVNode("view", { class: "page-banner-left" }, [
            vue.createElementVNode("view", { class: "banner-fold" }),
            vue.createElementVNode("view", null, [
              vue.createElementVNode(
                "text",
                { class: "banner-title" },
                vue.toDisplayString($props.pageTitle),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "banner-breadcrumb" },
                vue.toDisplayString($props.pageBreadcrumb),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "page-banner-right" }, [
            vue.createElementVNode("text", { class: "welcome-icon" }, "ℹ"),
            vue.createElementVNode(
              "text",
              { class: "welcome-text" },
              "欢迎回来，" + vue.toDisplayString($data.userName) + "。上次登录时间 " + vue.toDisplayString($data.lastSignIn),
              1
              /* TEXT */
            )
          ])
        ])) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("view", { class: "page-toolbar" }, [
          vue.createElementVNode("view", { class: "toolbar-left" }, [
            vue.createElementVNode("text", { class: "toolbar-home" }, "⌂"),
            vue.createElementVNode(
              "text",
              { class: "toolbar-breadcrumb" },
              vue.toDisplayString($props.pageBreadcrumb),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", {
            class: "toolbar-search",
            onClick: _cache[5] || (_cache[5] = (...args) => $options.showSearch && $options.showSearch(...args))
          }, [
            vue.createElementVNode("text", { class: "toolbar-search-text" }, "搜索记录...")
          ])
        ]),
        vue.createElementVNode("scroll-view", {
          class: "page-content-scroll",
          "scroll-y": ""
        }, [
          vue.createElementVNode("view", { class: "page-content" }, [
            vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
          ])
        ])
      ])
    ]);
  }
  const adminSidebar = /* @__PURE__ */ _export_sfc(_sfc_main$D, [["render", _sfc_render$C], ["__scopeId", "data-v-f8592f70"], ["__file", "D:/HBuilderProjects/smart-community/admin/components/admin-sidebar/admin-sidebar.vue"]]);
  const _sfc_main$C = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        loading: false,
        currentTab: "ASSIGNED",
        submitting: false,
        taskList: [],
        tabs: [
          { label: "待处理", value: "ASSIGNED", statusClass: "tab-assigned" },
          { label: "进行中", value: "PROCESSING", statusClass: "tab-processing" },
          { label: "已完成", value: "COMPLETED", statusClass: "tab-completed" }
        ],
        showCompleteForm: false,
        currentTask: null,
        completeForm: {
          result: "",
          images: []
        }
      };
    },
    computed: {
      currentTabLabel() {
        const tab = this.tabs.find((item) => item.value === this.currentTab);
        return tab ? tab.label : "";
      }
    },
    onLoad() {
      this.loadTasks();
    },
    onShow() {
      this.loadTasks();
    },
    methods: {
      async loadTasks() {
        this.loading = true;
        try {
          const res = await request("/api/workorder/list", {
            params: {
              status: this.currentTab
            }
          }, "GET");
          const data = res.data || res;
          const list = data.records || data || [];
          this.taskList = Array.isArray(list) ? list.slice().sort((a, b) => {
            const diff = this.getPriorityRank(b.priority) - this.getPriorityRank(a.priority);
            if (diff !== 0)
              return diff;
            return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime();
          }) : [];
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/worker-tasks.vue:236", "加载任务失败", error);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      switchTab(tab) {
        if (this.currentTab === tab)
          return;
        this.currentTab = tab;
        this.loadTasks();
      },
      getPriorityText(priority) {
        const map = {
          LOW: "低",
          MEDIUM: "中",
          HIGH: "高",
          URGENT: "紧急",
          "1": "低",
          "2": "中",
          "3": "高",
          "4": "紧急"
        };
        return map[String(priority).toUpperCase()] || priority || "低";
      },
      getPriorityClass(priority) {
        if (!priority)
          return "priority-low";
        const map = {
          LOW: "priority-low",
          "1": "priority-low",
          MEDIUM: "priority-medium",
          "2": "priority-medium",
          HIGH: "priority-high",
          "3": "priority-high",
          URGENT: "priority-urgent",
          "4": "priority-urgent"
        };
        return map[String(priority).toUpperCase()] || "priority-low";
      },
      getPriorityRank(priority) {
        const map = {
          LOW: 1,
          "1": 1,
          MEDIUM: 2,
          "2": 2,
          HIGH: 3,
          "3": 3,
          URGENT: 4,
          "4": 4
        };
        return map[String(priority).toUpperCase()] || 1;
      },
      getRepairDesc(item) {
        if (!item)
          return "";
        const desc = item.repairInfo && item.repairInfo.faultDesc || item.faultDesc || item.repairFaultDesc || item.repairDesc || item.repair && item.repair.faultDesc;
        if (desc)
          return desc;
        if (item.repairId)
          return `报修ID: ${item.repairId}`;
        return "";
      },
      getRepairType(item) {
        if (!item)
          return "未知";
        return item.repairInfo && item.repairInfo.faultType || item.faultType || item.repairFaultType || item.repairType || item.repair && item.repair.faultType || "未知";
      },
      getOwnerPhone(item) {
        if (!item)
          return "未知";
        return item.repairInfo && item.repairInfo.ownerPhone || item.ownerPhone || item.userPhone || item.phone || item.repairUserPhone || item.repair && (item.repair.ownerPhone || item.repair.userPhone || item.repair.phone) || "未知";
      },
      getRepairAddress(item) {
        if (!item)
          return "地点未知";
        return item.repairInfo && item.repairInfo.address || item.address || item.repairAddress || item.repair && item.repair.address || item.location || "社区内";
      },
      formatTime(time) {
        if (!time)
          return "-";
        const date = new Date(time);
        if (Number.isNaN(date.getTime()))
          return time;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}`;
      },
      async handleStart(orderId) {
        try {
          await request(`/api/workorder/worker/start?orderId=${orderId}`, {}, "POST");
          uni.showToast({ title: "已开始处理", icon: "success" });
          this.loadTasks();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/worker-tasks.vue:343", "开始处理失败", error);
          uni.showToast({ title: "操作失败", icon: "none" });
        }
      },
      openCompleteForm(task) {
        this.currentTask = task;
        this.completeForm = {
          result: "",
          images: []
        };
        this.showCompleteForm = true;
      },
      closeCompleteForm() {
        this.showCompleteForm = false;
        this.currentTask = null;
      },
      chooseImage() {
        uni.chooseImage({
          count: 3 - this.completeForm.images.length,
          success: (res) => {
            this.completeForm.images = this.completeForm.images.concat(res.tempFilePaths || []).slice(0, 3);
          }
        });
      },
      removeImage(index) {
        this.completeForm.images.splice(index, 1);
      },
      async handleCompleteSubmit() {
        if (!this.completeForm.result.trim()) {
          uni.showToast({ title: "请输入处理结果", icon: "none" });
          return;
        }
        if (!this.currentTask || !this.currentTask.id) {
          uni.showToast({ title: "未找到任务信息", icon: "none" });
          return;
        }
        this.submitting = true;
        try {
          await request("/api/workorder/worker/complete", {
            data: {
              orderId: this.currentTask.id,
              result: this.completeForm.result,
              images: this.completeForm.images.join(",")
            }
          }, "POST");
          uni.showToast({ title: "提交成功", icon: "success" });
          this.closeCompleteForm();
          this.loadTasks();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/worker-tasks.vue:392", "提交失败", error);
          uni.showToast({ title: "提交失败", icon: "none" });
        } finally {
          this.submitting = false;
        }
      }
    }
  };
  function _sfc_render$B(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[8] || (_cache[8] = ($event) => $data.showSidebar = $event),
      pageTitle: "任务中心",
      currentPage: "/admin/pages/admin/worker-tasks",
      pageBreadcrumb: "管理后台 / 任务中心",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "维修任务中心"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一按后台任务表格页呈现待处理、处理中和已完成工单，并保留处理结果提交流程。")
            ]),
            vue.createElementVNode("view", { class: "overview-chip" }, [
              vue.createElementVNode("text", { class: "overview-chip-label" }, "当前阶段"),
              vue.createElementVNode(
                "text",
                { class: "overview-chip-value" },
                vue.toDisplayString($options.currentTabLabel),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar worker-status-bar" }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.tabs, (tab) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: tab.value,
                  class: vue.normalizeClass(["status-summary-card", [tab.statusClass, { active: $data.currentTab === tab.value }]]),
                  onClick: ($event) => $options.switchTab(tab.value)
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "summary-label" },
                    vue.toDisplayString(tab.label),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "summary-value" },
                    vue.toDisplayString($data.currentTab === tab.value ? $data.taskList.length : "-"),
                    1
                    /* TEXT */
                  )
                ], 10, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "当前阶段：" + vue.toDisplayString($options.currentTabLabel),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "任务数 " + vue.toDisplayString($data.taskList.length) + " 条",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode("button", {
                class: "row-btn ghost",
                onClick: _cache[0] || (_cache[0] = (...args) => $options.loadTasks && $options.loadTasks(...args))
              }, "刷新列表")
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "scroll-table" }, [
              vue.createElementVNode("view", { class: "table-head worker-table" }, [
                vue.createElementVNode("text", { class: "table-col col-order" }, "工单号"),
                vue.createElementVNode("text", { class: "table-col col-type" }, "报修类型"),
                vue.createElementVNode("text", { class: "table-col col-desc" }, "报修内容"),
                vue.createElementVNode("text", { class: "table-col col-phone" }, "手机号"),
                vue.createElementVNode("text", { class: "table-col col-address" }, "报修地点"),
                vue.createElementVNode("text", { class: "table-col col-priority" }, "优先级"),
                vue.createElementVNode("text", { class: "table-col col-time" }, "创建时间"),
                vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
              ]),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.taskList, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: item.id || index,
                      class: "table-row worker-table",
                      style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                    },
                    [
                      vue.createElementVNode("view", { class: "table-col col-order" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "primary-text" },
                          vue.toDisplayString(item.orderNo || item.id || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-type" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString($options.getRepairType(item)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-desc" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "desc-text" },
                          vue.toDisplayString($options.getRepairDesc(item) || "暂无描述"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-phone" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString($options.getOwnerPhone(item)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-address" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "desc-text" },
                          vue.toDisplayString($options.getRepairAddress(item)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-priority" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-pill", $options.getPriorityClass(item.priority)])
                          },
                          vue.toDisplayString($options.getPriorityText(item.priority)),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-time" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString($options.formatTime(item.createTime)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                        item.status === "ASSIGNED" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "row-btn primary",
                          onClick: ($event) => $options.handleStart(item.id)
                        }, " 开始处理 ", 8, ["onClick"])) : item.status === "PROCESSING" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 1,
                          class: "row-btn secondary-warn",
                          onClick: ($event) => $options.openCompleteForm(item)
                        }, " 提交完成 ", 8, ["onClick"])) : (vue.openBlock(), vue.createElementBlock("text", {
                          key: 2,
                          class: "minor-text"
                        }, "已完成"))
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
            $data.taskList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode(
                "text",
                null,
                "暂无" + vue.toDisplayString($options.currentTabLabel) + "的任务",
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.showCompleteForm ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "detail-modal",
            onClick: _cache[7] || (_cache[7] = (...args) => $options.closeCompleteForm && $options.closeCompleteForm(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content worker-detail-content",
              onClick: _cache[6] || (_cache[6] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "提交处理结果"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[1] || (_cache[1] = (...args) => $options.closeCompleteForm && $options.closeCompleteForm(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "工单号:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentTask ? $data.currentTask.orderNo || $data.currentTask.id : "-"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "处理结果:"),
                  vue.withDirectives(vue.createElementVNode(
                    "textarea",
                    {
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.completeForm.result = $event),
                      class: "modal-textarea",
                      maxlength: "500",
                      placeholder: "请输入处理过程及结果描述"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.completeForm.result]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "现场图片:"),
                  vue.createElementVNode("view", { class: "upload-grid" }, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList($data.completeForm.images, (img, index) => {
                        return vue.openBlock(), vue.createElementBlock("view", {
                          key: index,
                          class: "upload-card"
                        }, [
                          vue.createElementVNode("image", {
                            src: img,
                            class: "upload-img",
                            mode: "aspectFill"
                          }, null, 8, ["src"]),
                          vue.createElementVNode("text", {
                            class: "upload-remove",
                            onClick: ($event) => $options.removeImage(index)
                          }, "×", 8, ["onClick"])
                        ]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    )),
                    $data.completeForm.images.length < 3 ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 0,
                      class: "upload-card upload-card-add",
                      onClick: _cache[3] || (_cache[3] = (...args) => $options.chooseImage && $options.chooseImage(...args))
                    }, [
                      vue.createElementVNode("text", { class: "upload-plus" }, "+"),
                      vue.createElementVNode("text", { class: "upload-tip" }, "添加图片")
                    ])) : vue.createCommentVNode("v-if", true)
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[4] || (_cache[4] = (...args) => $options.closeCompleteForm && $options.closeCompleteForm(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    disabled: $data.submitting,
                    onClick: _cache[5] || (_cache[5] = (...args) => $options.handleCompleteSubmit && $options.handleCompleteSubmit(...args))
                  }, "提交完成", 8, ["disabled"])
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminWorkerTasks = /* @__PURE__ */ _export_sfc(_sfc_main$C, [["render", _sfc_render$B], ["__scopeId", "data-v-27def734"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/worker-tasks.vue"]]);
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
    },
    onShow() {
      this.loadBalance();
      this.loadCars();
    },
    // 监听下拉刷新
    onPullDownRefresh() {
      Promise.all([this.loadBalance(), this.loadCars()]).finally(() => {
        uni.stopPullDownRefresh();
      });
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
            formatAppLog("log", "at owner/pages/parking/index.vue:206", "【DEBUG】使用模拟车位数据");
          }
          formatAppLog("log", "at owner/pages/parking/index.vue:212", "【DEBUG】我的车位数据:", JSON.stringify(list));
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
          formatAppLog("error", "at owner/pages/parking/index.vue:267", e);
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
          formatAppLog("error", "at owner/pages/parking/index.vue:299", "获取余额失败", e);
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
          formatAppLog("error", "at owner/pages/parking/index.vue:398", "支付失败:", e);
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
          const user = uni.getStorageSync("userInfo") || {};
          if (!(user == null ? void 0 : user.communityId)) {
            uni.showModal({
              title: "提示",
              content: "请先绑定房屋以查看本小区话题",
              showCancel: false,
              success: () => {
                uni.navigateTo({ url: "/owner/pages/mine/house-bind" });
              }
            });
            return;
          }
          const data = await request({
            url: "/api/topic/list",
            method: "GET",
            params: { pageNum: 1, pageSize: 10, status: "APPROVED", communityId: user.communityId }
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
          formatAppLog("error", "at owner/pages/topic/index.vue:140", "加载话题失败", e);
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
  const _sfc_main$y = {
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
  function _sfc_render$x(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesCommunityServicePayFee = /* @__PURE__ */ _export_sfc(_sfc_main$y, [["render", _sfc_render$x], ["__scopeId", "data-v-e6979b53"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/pay-fee.vue"]]);
  const _sfc_main$x = {
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
  function _sfc_render$w(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesCommunityServiceVisitorApply = /* @__PURE__ */ _export_sfc(_sfc_main$x, [["render", _sfc_render$w], ["__scopeId", "data-v-c952a55e"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/visitor-apply.vue"]]);
  const _sfc_main$w = {
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
  function _sfc_render$v(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesCommunityServiceComplaint = /* @__PURE__ */ _export_sfc(_sfc_main$w, [["render", _sfc_render$v], ["__scopeId", "data-v-5b2ad19b"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/complaint.vue"]]);
  const _sfc_main$v = {
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
  function _sfc_render$u(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesCommunityServiceActivityList = /* @__PURE__ */ _export_sfc(_sfc_main$v, [["render", _sfc_render$u], ["__scopeId", "data-v-f96f344e"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/communityService/activity-list.vue"]]);
  const _sfc_main$u = {
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
  function _sfc_render$t(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesMineProfile = /* @__PURE__ */ _export_sfc(_sfc_main$u, [["render", _sfc_render$t], ["__scopeId", "data-v-71d300c5"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/mine/profile.vue"]]);
  const _sfc_main$t = {
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
          formatAppLog("log", "at owner/pages/index/index.vue:150", "未读消息接口返回:", res);
          if (res.code === 200) {
            this.unreadCount = (typeof res.data === "number" ? res.data : res) || 0;
          } else if (typeof res === "number") {
            this.unreadCount = res;
          }
        } catch (err) {
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
          const res = await request({
            url: "/api/notice/list",
            method: "GET",
            params: {
              userId: user.id,
              pageNum: 1,
              pageSize: 5
            }
          });
          const records = Array.isArray(res) ? res : res.records || [];
          const readCacheRaw = uni.getStorageSync("noticeReadIds");
          const readCacheSet = new Set((Array.isArray(readCacheRaw) ? readCacheRaw : []).map((v) => String(v)));
          this.notices = records.slice(0, 4).map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            publishTime: n.publishTime,
            // 🔴 修复映射：强制检查 readFlag 或 read_flag，且默认设为 0 (未读) 
            // 如果字段不存在或为 null，则视为未读，以便显示红色
            readFlag: readCacheSet.has(String(n.id)) ? 1 : n.readFlag !== void 0 && n.readFlag !== null ? Number(n.readFlag) : n.read_flag !== void 0 && n.read_flag !== null ? Number(n.read_flag) : 0,
            time: this.formatTime(n.publishTime),
            tag: this.getTag(n.targetType)
          }));
        } catch (err) {
          formatAppLog("error", "at owner/pages/index/index.vue:222", "公告加载失败", err);
          if (err.code === 403 || err.msg && err.msg.includes("权限")) {
            this.notices = [];
          }
        }
      },
      async openNoticeDetail(item) {
        if (item.readFlag === 0) {
          try {
            const user = uni.getStorageSync("userInfo");
            const userId = (user == null ? void 0 : user.id) || (user == null ? void 0 : user.userId);
            await request({
              url: `/api/notice/${item.id}/read`,
              method: "POST",
              params: userId ? { userId } : {}
            });
            const raw = uni.getStorageSync("noticeReadIds");
            const arr = Array.isArray(raw) ? raw.map((v) => String(v)) : [];
            const sid = String(item.id);
            if (!arr.includes(sid)) {
              arr.push(sid);
              uni.setStorageSync("noticeReadIds", arr);
            }
            item.readFlag = 1;
            this.notices = [...this.notices];
          } catch (err) {
            formatAppLog("error", "at owner/pages/index/index.vue:250", "标记已读失败", err);
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
  function _sfc_render$s(_ctx, _cache, $props, $setup, $data, $options) {
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
                  vue.createElementVNode(
                    "text",
                    {
                      class: "notice-title",
                      style: vue.normalizeStyle({ color: item.readFlag === 0 ? "#ff4d4f" : "#1f2430", fontWeight: item.readFlag === 0 ? "600" : "400" })
                    },
                    vue.toDisplayString(item.title),
                    5
                    /* TEXT, STYLE */
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
  const OwnerPagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$t, [["render", _sfc_render$s], ["__scopeId", "data-v-52d495ef"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/index/index.vue"]]);
  const _sfc_main$s = {
    data() {
      return {
        form: {
          username: "",
          password: "",
          confirmPassword: "",
          phone: "",
          realName: "",
          role: "owner"
        },
        roleOptions: [
          { label: "业主(owner)", value: "owner" },
          { label: "工作人员(worker)", value: "worker" },
          { label: "管理员(admin)", value: "admin" }
        ],
        roleIndex: 0,
        loading: false
      };
    },
    computed: {
      currentRoleLabel() {
        const found = this.roleOptions.find((v) => v.value === this.form.role);
        return found ? found.label : "业主(owner)";
      }
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
      handleRoleChange(e) {
        var _a, _b;
        const idx = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) ?? 0);
        this.roleIndex = Number.isNaN(idx) ? 0 : idx;
        this.form.role = ((_b = this.roleOptions[this.roleIndex]) == null ? void 0 : _b.value) || "owner";
      },
      // 提交注册
      async handleRegister() {
        if (!this.validateForm())
          return;
        this.loading = true;
        try {
          const role = this.form.role || "owner";
          await request({
            url: "/api/user/register",
            method: "POST",
            data: {
              username: this.form.username,
              password: this.form.password,
              phone: this.form.phone,
              realName: this.form.realName,
              role
            }
          });
          const successText = role === "owner" ? "注册成功" : "已提交审核";
          uni.showToast({ title: successText, icon: "success" });
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
  function _sfc_render$r(_ctx, _cache, $props, $setup, $data, $options) {
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
      vue.createElementVNode("view", { class: "input-item" }, [
        vue.createElementVNode("text", { class: "input-icon" }, "🎭"),
        vue.createElementVNode("picker", {
          class: "role-picker",
          range: $data.roleOptions,
          "range-key": "label",
          value: $data.roleIndex,
          onChange: _cache[5] || (_cache[5] = (...args) => $options.handleRoleChange && $options.handleRoleChange(...args))
        }, [
          vue.createElementVNode("view", { class: "picker-value" }, [
            vue.createElementVNode(
              "text",
              { class: "picker-text" },
              vue.toDisplayString($options.currentRoleLabel),
              1
              /* TEXT */
            ),
            vue.createElementVNode("text", { class: "picker-arrow" }, "▼")
          ])
        ], 40, ["range", "value"])
      ]),
      vue.createElementVNode("view", { class: "role-tip" }, " 业主账号可直接登录，工作人员和管理员账号提交后需要后台审核。 "),
      vue.createCommentVNode(" 注册按钮 "),
      vue.createElementVNode("button", {
        class: "register-btn",
        onClick: _cache[6] || (_cache[6] = (...args) => $options.handleRegister && $options.handleRegister(...args)),
        disabled: $data.loading
      }, vue.toDisplayString($data.loading ? "注册中..." : "立即注册"), 9, ["disabled"]),
      vue.createCommentVNode(" 返回登录 "),
      vue.createElementVNode("view", {
        class: "login-link",
        onClick: _cache[7] || (_cache[7] = (...args) => $options.goToLogin && $options.goToLogin(...args))
      }, " 已有账号？去登录 ")
    ]);
  }
  const OwnerPagesRegisterRegister = /* @__PURE__ */ _export_sfc(_sfc_main$s, [["render", _sfc_render$r], ["__scopeId", "data-v-e10ddd9f"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/register/register.vue"]]);
  const _sfc_main$r = {
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
            url: "/api/house/getHouseInfoByUserId",
            method: "GET"
            // 后端从Token中获取userId，无需传参
          });
          const list = Array.isArray(res) ? res : res.data || [];
          if (list.length > 0) {
            this.myHouses = list.map((house) => ({
              ...house,
              displayText: `${house.buildingNo}栋 ${house.houseNo}室`
            }));
            if (this.myHouses.length === 1) {
              this.selectHouse(this.myHouses[0]);
            }
          }
        } catch (e) {
          formatAppLog("error", "at owner/pages/repair/repair.vue:145", "加载房屋列表失败", e);
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
          formatAppLog("log", "at owner/pages/repair/repair.vue:170", "提交报修数据:", submitData);
          await request({
            url: "/api/repair/submit",
            method: "POST",
            data: submitData
          });
          uni.showToast({ title: "报修提交成功", icon: "success" });
          this.resetForm();
        } catch (err) {
          formatAppLog("error", "at owner/pages/repair/repair.vue:185", "提交报修失败：", err);
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
          formatAppLog("error", "at owner/pages/repair/repair.vue:208", "选择图片失败:", err);
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
  function _sfc_render$q(_ctx, _cache, $props, $setup, $data, $options) {
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
  const OwnerPagesRepairRepair = /* @__PURE__ */ _export_sfc(_sfc_main$r, [["render", _sfc_render$q], ["__scopeId", "data-v-62de0cb9"], ["__file", "D:/HBuilderProjects/smart-community/owner/pages/repair/repair.vue"]]);
  function listConfig(query) {
    return request({
      url: "/api/system/config/all",
      method: "GET",
      params: query
    });
  }
  function getConfigByKey(configKey) {
    return request({
      url: "/api/system/config/list",
      method: "GET",
      params: { configKey }
    });
  }
  function getConfig(configId) {
    return request({
      url: "/api/system/config/" + configId,
      method: "GET"
    });
  }
  function addConfig(data) {
    return request({
      url: "/api/system/config",
      method: "POST",
      data
    });
  }
  function updateConfig(data) {
    return request({
      url: "/api/system/config",
      method: "PUT",
      data
    });
  }
  function delConfig(configIds) {
    return request({
      url: "/api/system/config/" + configIds,
      method: "DELETE"
    });
  }
  const _sfc_main$q = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        repairList: [],
        searchQuery: "",
        statusFilter: "",
        faultTypeFilter: "",
        monthOptions: [],
        monthIndex: 0,
        monthValue: "",
        loading: false,
        loadingDetail: false,
        currentPage: 1,
        pageSize: 10,
        total: 0,
        showDetail: false,
        currentRepair: null,
        selectedIds: [],
        selectAll: false,
        exporting: false,
        autoRefresh: true,
        autoRefreshInterval: 30,
        timerId: null,
        repairTimeout: 24,
        stats: {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
          today: 0
        },
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "pending", label: "待处理" },
          { value: "processing", label: "处理中" },
          { value: "completed", label: "已完成" },
          { value: "cancelled", label: "已取消" }
        ],
        faultTypeOptions: [
          { value: "", label: "全部类型" },
          { value: "水电维修", label: "水电维修" },
          { value: "家电维修", label: "家电维修" },
          { value: "门窗维修", label: "门窗维修" },
          { value: "电器维修", label: "电器维修" }
        ]
      };
    },
    onLoad() {
      this.checkAdminRole();
      this.initMonthOptions();
      this.loadRepairConfig();
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
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      currentMonthLabel() {
        const option = this.monthOptions[this.monthIndex];
        return option ? option.label : this.monthValue || "选择月份";
      },
      currentStatusLabel() {
        const option = this.statusOptions.find((opt) => opt.value === this.statusFilter);
        return option ? option.label : "全部状态";
      },
      currentFaultTypeLabel() {
        const option = this.faultTypeOptions.find((opt) => opt.value === this.faultTypeFilter);
        return option ? option.label : "全部类型";
      }
    },
    methods: {
      initMonthOptions() {
        const now = /* @__PURE__ */ new Date();
        const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const options = [];
        for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          options.push({ label: value, value });
        }
        this.monthOptions = options;
        this.monthValue = current;
        this.monthIndex = Math.max(0, options.findIndex((item) => item.value === current));
      },
      handleMonthChange(e) {
        var _a;
        const nextIndex = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const nextOption = this.monthOptions[nextIndex];
        if (!nextOption)
          return;
        this.monthIndex = nextIndex;
        this.monthValue = nextOption.value;
        this.currentPage = 1;
        this.loadRepairs();
      },
      handleStatsClick(status) {
        this.statusFilter = status === "all" ? "" : status;
        this.currentPage = 1;
        this.loadRepairs();
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadRepairs();
      },
      handleResetFilters() {
        this.searchQuery = "";
        this.statusFilter = "";
        this.faultTypeFilter = "";
        this.currentPage = 1;
        this.loadRepairs();
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.statusFilter = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
        this.currentPage = 1;
        this.loadRepairs();
      },
      handleFaultTypeChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.faultTypeFilter = ((_b = this.faultTypeOptions[index]) == null ? void 0 : _b.value) || "";
        this.currentPage = 1;
        this.loadRepairs();
      },
      handlePrevPage() {
        if (this.currentPage <= 1)
          return;
        this.currentPage -= 1;
        this.loadRepairs();
      },
      handleNextPage() {
        if (this.currentPage >= this.totalPages)
          return;
        this.currentPage += 1;
        this.loadRepairs();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadRepairs();
      },
      checkAdminRole() {
        const userInfo = uni.getStorageSync("userInfo");
        if (!userInfo || userInfo.role !== "admin" && userInfo.role !== "super_admin") {
          uni.showToast({ title: "无权限访问", icon: "none" });
          uni.redirectTo({ url: "/owner/pages/login/login" });
        }
      },
      async loadRepairConfig() {
        try {
          const res = await getConfigByKey("repair.timeout");
          const list = res.rows || res.data || res.records || [];
          let configValue = null;
          if (Array.isArray(list) && list.length > 0) {
            configValue = list[0].configValue;
          } else if (res.data && res.data.configValue) {
            configValue = res.data.configValue;
          }
          if (configValue !== null && configValue !== void 0) {
            this.repairTimeout = parseFloat(configValue) || 24;
          }
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:462", "获取报修超时配置失败:", error);
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
            faultType: this.faultTypeFilter || void 0,
            keyword: this.searchQuery || void 0,
            month: this.monthValue || void 0
          };
          const data = await request("/api/repair/admin/all", { params }, "GET");
          const list = ((_a = data.data) == null ? void 0 : _a.records) || data.records || [];
          this.repairList = list.slice().sort((a, b) => {
            const urgencyDiff = this.getRepairUrgencyRank(b) - this.getRepairUrgencyRank(a);
            if (urgencyDiff !== 0)
              return urgencyDiff;
            return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime();
          });
          this.total = Number(((_b = data.data) == null ? void 0 : _b.total) || data.total || this.repairList.length || 0);
          this.selectAll = false;
          this.selectedIds = [];
          this.calculateStats();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:490", "加载报修列表失败:", error);
          this.repairList = [];
          this.total = 0;
          this.selectAll = false;
          this.selectedIds = [];
          this.calculateStats();
          uni.showToast({ title: "加载失败，请重试", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      calculateStats() {
        const counters = {
          total: this.total || this.repairList.length,
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
          today: 0
        };
        const today = /* @__PURE__ */ new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const d = today.getDate();
        this.repairList.forEach((item) => {
          if (item.status && counters[item.status] !== void 0) {
            counters[item.status] += 1;
          }
          if (item.createTime) {
            const createdAt = new Date(item.createTime);
            if (createdAt.getFullYear() === y && createdAt.getMonth() === m && createdAt.getDate() === d) {
              counters.today += 1;
            }
          }
        });
        this.stats = counters;
      },
      isTimeout(item) {
        if (!item || item.status !== "pending" || !item.createTime)
          return false;
        const createTime = new Date(item.createTime).getTime();
        const now = Date.now();
        return (now - createTime) / (1e3 * 60 * 60) > this.repairTimeout;
      },
      getRepairUrgencyRank(item) {
        if (!item)
          return 1;
        const urgentFlag = item.urgent ?? item.isUrgent ?? item.emergency ?? item.isEmergency;
        if (urgentFlag === true || urgentFlag === 1 || urgentFlag === "1")
          return 4;
        if (this.isTimeout(item))
          return 4;
        const priority = Number(item.priority);
        if (Number.isFinite(priority) && priority > 0)
          return priority;
        return 1;
      },
      formatHouse(item) {
        if (!item)
          return "-";
        return `${item.buildingNo || ""}${item.houseNo || ""}` || "-";
      },
      getTimeoutText(item) {
        return this.isTimeout(item) ? "超时待处理" : "正常";
      },
      openDetail(item) {
        this.currentRepair = item;
        this.loadingDetail = false;
        this.showDetail = true;
      },
      closeDetail() {
        this.showDetail = false;
        this.currentRepair = null;
        this.loadingDetail = false;
      },
      handleCheckboxGroupChange(event) {
        this.selectedIds = event.detail.value || [];
        this.selectAll = this.selectedIds.length === this.repairList.length;
      },
      testSelectAll() {
        if (!this.repairList.length)
          return;
        const isAllSelected = this.selectedIds.length === this.repairList.length;
        this.selectAll = !isAllSelected;
        this.selectedIds = isAllSelected ? [] : this.repairList.map((item) => String(item.id));
        this.$forceUpdate();
      },
      async batchUpdateFallback(ids, status, remark = "") {
        for (const id of ids) {
          await request("/api/repair/admin/updateStatus", {
            params: {
              repairId: id,
              status,
              remark
            }
          }, "POST");
        }
      },
      async handleBatchProcess() {
        if (!this.selectedIds.length) {
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
        } catch (error) {
          try {
            await this.batchUpdateFallback(this.selectedIds, "processing");
            uni.showToast({ title: "批量处理成功", icon: "success" });
            this.loadRepairs();
          } catch (fallbackError) {
            formatAppLog("error", "at admin/pages/admin/repair-manage.vue:611", "批量处理失败:", fallbackError);
            uni.showToast({ title: "批量处理失败", icon: "none" });
          }
        } finally {
          uni.hideLoading();
        }
      },
      async handleBatchComplete() {
        if (!this.selectedIds.length) {
          uni.showToast({ title: "请选择要完成的报修", icon: "none" });
          return;
        }
        uni.showModal({
          title: "确认批量完成",
          content: `确定要将选中的${this.selectedIds.length}个报修设为已完成吗？`,
          success: async (res) => {
            if (!res.confirm)
              return;
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
            } catch (error) {
              try {
                await this.batchUpdateFallback(this.selectedIds, "completed", "批量完成");
                uni.showToast({ title: "批量完成成功", icon: "success" });
                this.loadRepairs();
              } catch (fallbackError) {
                formatAppLog("error", "at admin/pages/admin/repair-manage.vue:646", "批量完成失败:", fallbackError);
                uni.showToast({ title: "批量完成失败", icon: "none" });
              }
            } finally {
              uni.hideLoading();
            }
          }
        });
      },
      async handleBatchCancel() {
        if (!this.selectedIds.length) {
          uni.showToast({ title: "请选择要取消的报修", icon: "none" });
          return;
        }
        uni.showModal({
          title: "确认批量取消",
          content: `确定要取消选中的${this.selectedIds.length}个报修吗？`,
          success: async (res) => {
            if (!res.confirm)
              return;
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
            } catch (error) {
              try {
                await this.batchUpdateFallback(this.selectedIds, "cancelled", "批量取消");
                uni.showToast({ title: "批量取消成功", icon: "success" });
                this.loadRepairs();
              } catch (fallbackError) {
                formatAppLog("error", "at admin/pages/admin/repair-manage.vue:683", "批量取消失败:", fallbackError);
                uni.showToast({ title: "批量取消失败", icon: "none" });
              }
            } finally {
              uni.hideLoading();
            }
          }
        });
      },
      async handleExport() {
        try {
          this.exporting = true;
          uni.showLoading({ title: "导出中..." });
          await request("/api/repair/admin/export", {
            params: {
              status: this.statusFilter || void 0,
              faultType: this.faultTypeFilter || void 0,
              keyword: this.searchQuery || void 0
            }
          }, "GET");
          uni.showToast({ title: "导出成功", icon: "success" });
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:705", "导出失败:", error);
          uni.showToast({ title: "导出失败，请重试", icon: "none" });
        } finally {
          this.exporting = false;
          uni.hideLoading();
        }
      },
      async handleSetProcessing(repairId) {
        const result = await this.updateRepairStatus(repairId, "processing", "受理");
        if (result && result.success) {
          this.promptGoAssign(repairId);
        }
      },
      async handleAcceptFromDetail() {
        if (!this.currentRepair || !this.currentRepair.id)
          return;
        const repairId = this.currentRepair.id;
        const result = await this.updateRepairStatus(repairId, "processing", "受理");
        if (result && result.success) {
          this.closeDetail();
          this.promptGoAssign(repairId);
        }
      },
      async handleCancelRepair(repairId) {
        uni.showModal({
          title: "确认取消",
          content: "确定要取消这条报修吗？",
          success: async (res) => {
            if (res.confirm) {
              await this.updateRepairStatus(repairId, "cancelled", "取消报修");
            }
          }
        });
      },
      async updateRepairStatus(repairId, status, actionName) {
        try {
          uni.showLoading({ title: "处理中..." });
          await request("/api/repair/admin/updateStatus", {
            params: {
              repairId,
              status
            }
          }, "POST");
          uni.showToast({ title: `${actionName}成功`, icon: "success" });
          this.loadRepairs();
          return { success: true };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/repair-manage.vue:751", `${actionName}失败:`, error);
          uni.showToast({ title: `${actionName}失败`, icon: "none" });
          return { success: false };
        } finally {
          uni.hideLoading();
        }
      },
      promptGoAssign(repairId) {
        uni.showModal({
          title: "受理成功",
          content: "已生成工单，是否前往工单管理进行指派？",
          confirmText: "去指派",
          cancelText: "留在本页",
          success: (res) => {
            if (res.confirm) {
              this.goToWorkOrderManage("PENDING", repairId);
            }
          }
        });
      },
      goToWorkOrderManage(status, repairId) {
        const query = [];
        if (status)
          query.push(`status=${encodeURIComponent(status)}`);
        if (repairId)
          query.push(`repairId=${encodeURIComponent(repairId)}`);
        const url = `/admin/pages/admin/work-order-manage${query.length ? `?${query.join("&")}` : ""}`;
        uni.navigateTo({ url });
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
        const map = {
          pending: "待处理",
          processing: "处理中",
          completed: "已完成",
          cancelled: "已取消"
        };
        return map[status] || status || "-";
      },
      formatTime(time) {
        if (!time)
          return "-";
        return new Date(time).toLocaleString();
      },
      startAutoRefresh() {
        if (!this.autoRefresh)
          return;
        this.stopAutoRefresh();
        this.timerId = setInterval(() => {
          this.loadRepairs();
        }, this.autoRefreshInterval * 1e3);
      },
      stopAutoRefresh() {
        if (!this.timerId)
          return;
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }
  };
  function _sfc_render$p(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[27] || (_cache[27] = ($event) => $data.showSidebar = $event),
      pageTitle: "报修管理",
      currentPage: "/admin/pages/admin/repair-manage",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "报修工单列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "采用标准后台数据页的筛选、表头、数据行与操作列结构。")
            ]),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.monthOptions,
              "range-key": "label",
              onChange: _cache[0] || (_cache[0] = (...args) => $options.handleMonthChange && $options.handleMonthChange(...args))
            }, [
              vue.createElementVNode("view", { class: "month-filter-chip" }, [
                vue.createElementVNode("text", { class: "month-filter-label" }, "统计月份"),
                vue.createElementVNode(
                  "text",
                  { class: "month-filter-value" },
                  vue.toDisplayString($options.currentMonthLabel),
                  1
                  /* TEXT */
                )
              ])
            ], 40, ["range"])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.statusFilter === "" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick("all"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "全部"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card pending", { active: $data.statusFilter === "pending" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("pending"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "待处理"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card processing", { active: $data.statusFilter === "processing" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.handleStatsClick("processing"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "处理中"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.processing),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode("view", { class: "status-summary-card today" }, [
              vue.createElementVNode("text", { class: "summary-label" }, "今日新增"),
              vue.createElementVNode(
                "text",
                { class: "summary-value" },
                vue.toDisplayString($data.stats.today),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "搜索房屋编号、故障类型、描述",
                    onConfirm: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $data.statusOptions.findIndex((opt) => opt.value === $data.statusFilter),
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "类型"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.faultTypeOptions,
                  "range-key": "label",
                  value: $data.faultTypeOptions.findIndex((opt) => opt.value === $data.faultTypeFilter),
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleFaultTypeChange && $options.handleFaultTypeChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentFaultTypeLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "button",
                {
                  class: "toolbar-chip",
                  onClick: _cache[10] || (_cache[10] = (...args) => $options.testSelectAll && $options.testSelectAll(...args))
                },
                vue.toDisplayString($data.selectedIds.length === $data.repairList.length && $data.repairList.length ? "取消全选" : "全选当前页"),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 0,
                  class: "toolbar-meta active"
                },
                "已选 " + vue.toDisplayString($data.selectedIds.length) + " 条",
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock("button", {
                key: 0,
                class: "toolbar-action primary",
                onClick: _cache[11] || (_cache[11] = (...args) => $options.handleBatchProcess && $options.handleBatchProcess(...args))
              }, "批量处理")) : vue.createCommentVNode("v-if", true),
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock("button", {
                key: 1,
                class: "toolbar-action success",
                onClick: _cache[12] || (_cache[12] = (...args) => $options.handleBatchComplete && $options.handleBatchComplete(...args))
              }, "批量完成")) : vue.createCommentVNode("v-if", true),
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock("button", {
                key: 2,
                class: "toolbar-action danger",
                onClick: _cache[13] || (_cache[13] = (...args) => $options.handleBatchCancel && $options.handleBatchCancel(...args))
              }, "批量取消")) : vue.createCommentVNode("v-if", true),
              vue.createElementVNode("button", {
                class: "toolbar-action ghost",
                disabled: $data.exporting,
                onClick: _cache[14] || (_cache[14] = (...args) => $options.handleExport && $options.handleExport(...args))
              }, vue.toDisplayString($data.exporting ? "导出中..." : "导出数据"), 9, ["disabled"])
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "table-head" }, [
              vue.createElementVNode("text", { class: "table-col col-check" }, "选择"),
              vue.createElementVNode("text", { class: "table-col col-id" }, "编号"),
              vue.createElementVNode("text", { class: "table-col col-house" }, "房屋信息"),
              vue.createElementVNode("text", { class: "table-col col-type" }, "故障类型"),
              vue.createElementVNode("text", { class: "table-col col-desc" }, "故障描述"),
              vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
              vue.createElementVNode("text", { class: "table-col col-time" }, "提交时间"),
              vue.createElementVNode("text", { class: "table-col col-timeout" }, "响应"),
              vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
            ]),
            $data.repairList.length > 0 ? (vue.openBlock(), vue.createElementBlock(
              "checkbox-group",
              {
                key: 0,
                onChange: _cache[17] || (_cache[17] = (...args) => $options.handleCheckboxGroupChange && $options.handleCheckboxGroupChange(...args))
              },
              [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.repairList, (item, index) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: item.id,
                      class: "table-row",
                      style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` }),
                      onClick: ($event) => $options.openDetail(item)
                    }, [
                      vue.createElementVNode("view", {
                        class: "table-col col-check row-check",
                        onClick: _cache[15] || (_cache[15] = vue.withModifiers(() => {
                        }, ["stop"]))
                      }, [
                        vue.createElementVNode("checkbox", {
                          value: String(item.id),
                          checked: $data.selectedIds.includes(String(item.id))
                        }, null, 8, ["value", "checked"])
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-id" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "primary-text" },
                          "#" + vue.toDisplayString(item.id),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-house" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "primary-text" },
                          vue.toDisplayString($options.formatHouse(item)),
                          1
                          /* TEXT */
                        ),
                        $options.isTimeout(item) ? (vue.openBlock(), vue.createElementBlock("text", {
                          key: 0,
                          class: "row-inline-tag warning"
                        }, "已超时")) : vue.createCommentVNode("v-if", true)
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-type" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(item.faultType || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-desc" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "desc-text" },
                          vue.toDisplayString(item.faultDesc || "暂无描述"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-status" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                          },
                          vue.toDisplayString($options.getStatusText(item.status)),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-time" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString($options.formatTime(item.createTime)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-timeout" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString($options.getTimeoutText(item)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", {
                        class: "table-col col-actions row-actions",
                        onClick: _cache[16] || (_cache[16] = vue.withModifiers(() => {
                        }, ["stop"]))
                      }, [
                        vue.createElementVNode("button", {
                          class: "row-btn ghost",
                          onClick: ($event) => $options.openDetail(item)
                        }, "详情", 8, ["onClick"]),
                        item.status === "pending" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "row-btn primary",
                          onClick: ($event) => $options.handleSetProcessing(item.id)
                        }, "受理", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                        item.status === "pending" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 1,
                          class: "row-btn danger",
                          onClick: ($event) => $options.handleCancelRepair(item.id)
                        }, "取消", 8, ["onClick"])) : item.status === "processing" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 2,
                          class: "row-btn primary",
                          onClick: ($event) => $options.goToWorkOrderManage("PENDING", item.id)
                        }, "指派", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                        item.status === "processing" || item.status === "completed" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 3,
                          class: "row-btn ghost",
                          onClick: ($event) => $options.goToWorkOrderManage("", item.id)
                        }, "工单", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                      ])
                    ], 12, ["onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ],
              32
              /* NEED_HYDRATION */
            )) : (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无报修记录")
            ]))
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[18] || (_cache[18] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[19] || (_cache[19] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
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
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ]),
        $data.showDetail ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "detail-modal",
          onClick: _cache[26] || (_cache[26] = (...args) => $options.closeDetail && $options.closeDetail(...args))
        }, [
          vue.createElementVNode("view", {
            class: "detail-content",
            onClick: _cache[25] || (_cache[25] = vue.withModifiers(() => {
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
                  vue.toDisplayString($options.formatHouse($data.currentRepair)),
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
              ])) : vue.createCommentVNode("v-if", true),
              vue.createElementVNode("view", { class: "detail-actions" }, [
                $data.currentRepair.status === "pending" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 0,
                  class: "detail-btn primary",
                  onClick: _cache[22] || (_cache[22] = (...args) => $options.handleAcceptFromDetail && $options.handleAcceptFromDetail(...args))
                }, "受理并生成工单")) : $data.currentRepair.status === "processing" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 1,
                  class: "detail-btn primary",
                  onClick: _cache[23] || (_cache[23] = ($event) => $options.goToWorkOrderManage("PENDING", $data.currentRepair.id))
                }, "去工单指派")) : $data.currentRepair.status === "completed" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 2,
                  class: "detail-btn secondary",
                  onClick: _cache[24] || (_cache[24] = ($event) => $options.goToWorkOrderManage("", $data.currentRepair.id))
                }, "查看工单")) : vue.createCommentVNode("v-if", true)
              ])
            ])) : vue.createCommentVNode("v-if", true)
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminRepairManage = /* @__PURE__ */ _export_sfc(_sfc_main$q, [["render", _sfc_render$p], ["__scopeId", "data-v-0d64d4ff"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/repair-manage.vue"]]);
  const _sfc_main$p = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        loading: false,
        assigning: false,
        workOrderList: [],
        workerList: [],
        repairIdFilter: "",
        statusFilter: "",
        currentPage: 1,
        pageSize: 10,
        total: 0,
        stats: {
          total: 0,
          pending: 0,
          assigned: 0,
          processing: 0,
          completed: 0
        },
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "PENDING", label: "待指派" },
          { value: "ASSIGNED", label: "已指派" },
          { value: "PROCESSING", label: "处理中" },
          { value: "COMPLETED", label: "已完成" }
        ],
        priorityOptions: [
          { value: 1, label: "低" },
          { value: 2, label: "中" },
          { value: 3, label: "高" },
          { value: 4, label: "紧急" }
        ],
        showAssignDialog: false,
        currentOrder: null,
        selectedWorker: null,
        assignPriority: 1,
        monthOptions: [],
        monthIndex: 0,
        monthValue: ""
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      currentMonthLabel() {
        const option = this.monthOptions[this.monthIndex];
        return option ? option.label : this.monthValue || "选择月份";
      },
      currentStatusLabel() {
        const option = this.statusOptions.find((item) => item.value === this.statusFilter);
        return option ? option.label : "全部状态";
      },
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.statusFilter));
      },
      priorityPickerIndex() {
        return Math.max(0, this.priorityOptions.findIndex((item) => item.value === this.assignPriority));
      }
    },
    onLoad(options) {
      this.checkAdminRole();
      this.initMonthOptions();
      this.applyRouteFilters(options);
      this.loadWorkers();
      this.refreshPage();
    },
    methods: {
      checkAdminRole() {
        const userInfo = uni.getStorageSync("userInfo");
        if (!userInfo || userInfo.role !== "admin" && userInfo.role !== "super_admin") {
          uni.showToast({ title: "无权限访问", icon: "none" });
          uni.redirectTo({ url: "/owner/pages/login/login" });
        }
      },
      applyRouteFilters(options) {
        if (!options)
          return;
        if (options.status) {
          const status = String(options.status).toUpperCase();
          if (this.statusOptions.some((item) => item.value === status)) {
            this.statusFilter = status;
          }
        }
        if (options.repairId !== void 0 && options.repairId !== null) {
          this.repairIdFilter = String(options.repairId);
        }
      },
      initMonthOptions() {
        const now = /* @__PURE__ */ new Date();
        const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const options = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          options.push({ label: value, value });
        }
        this.monthOptions = options;
        this.monthValue = current;
        this.monthIndex = Math.max(0, options.findIndex((item) => item.value === current));
      },
      refreshPage() {
        this.loadWorkOrders();
        this.loadStats();
      },
      handleMonthChange(e) {
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const option = this.monthOptions[index];
        if (!option)
          return;
        this.monthIndex = index;
        this.monthValue = option.value;
        this.currentPage = 1;
        this.refreshPage();
      },
      handleSearch() {
        this.currentPage = 1;
        this.refreshPage();
      },
      handleResetFilters() {
        this.repairIdFilter = "";
        this.statusFilter = "";
        this.currentPage = 1;
        this.refreshPage();
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.statusFilter = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
        this.currentPage = 1;
        this.loadWorkOrders();
      },
      handleStatsClick(status) {
        this.statusFilter = status;
        this.currentPage = 1;
        this.loadWorkOrders();
      },
      handlePageChange(delta) {
        const nextPage = this.currentPage + delta;
        if (nextPage < 1 || nextPage > this.totalPages)
          return;
        this.currentPage = nextPage;
        this.loadWorkOrders();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadWorkOrders();
      },
      getListParams(extra = {}) {
        return {
          pageNum: extra.pageNum || this.currentPage,
          pageSize: extra.pageSize || this.pageSize,
          month: this.monthValue || void 0,
          status: extra.status !== void 0 ? extra.status : this.statusFilter || void 0,
          repairId: this.repairIdFilter || void 0
        };
      },
      async loadWorkOrders() {
        var _a, _b;
        this.loading = true;
        try {
          const res = await request("/api/workorder/list", {
            params: this.getListParams()
          }, "GET");
          const data = (res == null ? void 0 : res.data) || res || {};
          const list = data.records || ((_a = data.data) == null ? void 0 : _a.records) || [];
          this.workOrderList = list.slice().sort((a, b) => {
            const priorityDiff = this.getPriorityRank(b.priority) - this.getPriorityRank(a.priority);
            if (priorityDiff !== 0)
              return priorityDiff;
            return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime();
          });
          this.total = Number(data.total || ((_b = data.data) == null ? void 0 : _b.total) || this.workOrderList.length || 0);
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/work-order-manage.vue:433", "加载工单失败", error);
          this.workOrderList = [];
          this.total = 0;
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      async loadWorkers() {
        try {
          const res = await request("/api/user/inner/list/role", {
            params: { role: "worker" }
          }, "GET");
          const rawList = (res == null ? void 0 : res.data) || res || [];
          const list = Array.isArray(rawList) ? rawList : rawList.records || rawList.data || [];
          this.workerList = list.map((item) => ({
            ...item,
            displayName: `${item.name || item.username || "未命名"}${item.phone ? ` (${item.phone})` : ""}`
          }));
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/work-order-manage.vue:454", "加载维修员失败", error);
          this.workerList = [];
        }
      },
      async loadStats() {
        const extractTotal = (res) => {
          var _a;
          const data = (res == null ? void 0 : res.data) || res || {};
          return Number(data.total || ((_a = data.data) == null ? void 0 : _a.total) || 0);
        };
        const buildParams = (status) => ({
          pageNum: 1,
          pageSize: 1,
          month: this.monthValue || void 0,
          status: status || void 0,
          repairId: this.repairIdFilter || void 0
        });
        try {
          const [totalRes, pendingRes, assignedRes, processingRes, completedRes] = await Promise.all([
            request("/api/workorder/list", { params: buildParams("") }, "GET"),
            request("/api/workorder/list", { params: buildParams("PENDING") }, "GET"),
            request("/api/workorder/list", { params: buildParams("ASSIGNED") }, "GET"),
            request("/api/workorder/list", { params: buildParams("PROCESSING") }, "GET"),
            request("/api/workorder/list", { params: buildParams("COMPLETED") }, "GET")
          ]);
          this.stats.total = extractTotal(totalRes);
          this.stats.pending = extractTotal(pendingRes);
          this.stats.assigned = extractTotal(assignedRes);
          this.stats.processing = extractTotal(processingRes);
          this.stats.completed = extractTotal(completedRes);
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/work-order-manage.vue:487", "加载工单统计失败", error);
        }
      },
      getStatusText(status) {
        const map = {
          PENDING: "待指派",
          ASSIGNED: "已指派",
          PROCESSING: "处理中",
          COMPLETED: "已完成"
        };
        return map[status] || status || "-";
      },
      getStatusClass(status) {
        const map = {
          PENDING: "status-pending",
          ASSIGNED: "status-assigned",
          PROCESSING: "status-processing",
          COMPLETED: "status-completed"
        };
        return map[status] || "";
      },
      getPriorityText(priority) {
        const map = {
          LOW: "低",
          MEDIUM: "中",
          HIGH: "高",
          URGENT: "紧急",
          1: "低",
          2: "中",
          3: "高",
          4: "紧急"
        };
        return map[String(priority).toUpperCase()] || map[Number(priority)] || priority || "低";
      },
      getPriorityRank(priority) {
        const map = {
          LOW: 1,
          MEDIUM: 2,
          HIGH: 3,
          URGENT: 4,
          1: 1,
          2: 2,
          3: 3,
          4: 4
        };
        return map[String(priority).toUpperCase()] || map[Number(priority)] || 1;
      },
      getPriorityClass(priority) {
        const map = {
          LOW: "priority-low",
          MEDIUM: "priority-medium",
          HIGH: "priority-high",
          URGENT: "priority-urgent",
          1: "priority-low",
          2: "priority-medium",
          3: "priority-high",
          4: "priority-urgent"
        };
        return map[String(priority).toUpperCase()] || map[Number(priority)] || "priority-low";
      },
      getWorkerName(item) {
        return item.workerName || item.assigneeName || "-";
      },
      getWorkerPhone(item) {
        return item.workerPhone || item.assigneePhone || "-";
      },
      getLatestTime(item) {
        return item.updateTime || item.completeTime || item.finishTime || item.processTime || item.assignTime || item.startTime || item.createTime || "";
      },
      formatTime(time) {
        if (!time)
          return "-";
        return new Date(time).toLocaleString();
      },
      reuseRepairFilter(repairId) {
        this.repairIdFilter = repairId ? String(repairId) : "";
        this.currentPage = 1;
        this.refreshPage();
      },
      openAssignDialog(order) {
        this.currentOrder = order;
        this.selectedWorker = null;
        this.assignPriority = Number((order == null ? void 0 : order.priority) || 1) || 1;
        this.showAssignDialog = true;
      },
      closeAssignDialog() {
        this.showAssignDialog = false;
        this.currentOrder = null;
        this.selectedWorker = null;
        this.assignPriority = 1;
      },
      handleWorkerSelect(e) {
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.selectedWorker = this.workerList[index] || null;
      },
      handlePrioritySelect(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.assignPriority = ((_b = this.priorityOptions[index]) == null ? void 0 : _b.value) || 1;
      },
      async handleAssignSubmit() {
        if (!this.currentOrder)
          return;
        if (!this.selectedWorker) {
          uni.showToast({ title: "请选择维修员", icon: "none" });
          return;
        }
        this.assigning = true;
        try {
          await request("/api/workorder/admin/assign", {
            data: {
              orderId: this.currentOrder.id,
              workerId: this.selectedWorker.userId || this.selectedWorker.id,
              workerName: this.selectedWorker.name || this.selectedWorker.username,
              workerPhone: this.selectedWorker.phone,
              priority: this.assignPriority
            }
          }, "POST");
          uni.showToast({ title: "指派成功", icon: "success" });
          this.closeAssignDialog();
          this.refreshPage();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/work-order-manage.vue:608", "指派失败:", error);
          uni.showToast({ title: "指派失败", icon: "none" });
        } finally {
          this.assigning = false;
        }
      }
    }
  };
  function _sfc_render$o(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[20] || (_cache[20] = ($event) => $data.showSidebar = $event),
      pageTitle: "工单管理",
      currentPage: "/admin/pages/admin/work-order-manage",
      pageBreadcrumb: "管理后台 / 工单管理",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "工单数据列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "延续统一后台表格页结构，聚焦指派、状态流转与维修人员信息。")
            ]),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.monthOptions,
              "range-key": "label",
              onChange: _cache[0] || (_cache[0] = (...args) => $options.handleMonthChange && $options.handleMonthChange(...args))
            }, [
              vue.createElementVNode("view", { class: "month-filter-chip" }, [
                vue.createElementVNode("text", { class: "month-filter-label" }, "统计月份"),
                vue.createElementVNode(
                  "text",
                  { class: "month-filter-value" },
                  vue.toDisplayString($options.currentMonthLabel),
                  1
                  /* TEXT */
                )
              ])
            ], 40, ["range"])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.statusFilter === "" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick(""))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "全部工单"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card pending", { active: $data.statusFilter === "PENDING" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("PENDING"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "待指派"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card assigned", { active: $data.statusFilter === "ASSIGNED" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.handleStatsClick("ASSIGNED"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已指派"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.assigned),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card processing", { active: $data.statusFilter === "PROCESSING" }]),
                onClick: _cache[4] || (_cache[4] = ($event) => $options.handleStatsClick("PROCESSING"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "处理中"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.processing),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid" }, [
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关联报修ID"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.repairIdFilter = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "输入 repairId 进行筛选",
                    onConfirm: _cache[6] || (_cache[6] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.repairIdFilter]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "工单状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              $data.repairIdFilter ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 0,
                  class: "toolbar-meta active"
                },
                "当前报修ID: " + vue.toDisplayString($data.repairIdFilter),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "待指派 " + vue.toDisplayString($data.stats.pending) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "已完成 " + vue.toDisplayString($data.stats.completed) + " 条",
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "table-head" }, [
              vue.createElementVNode("text", { class: "table-col col-order" }, "工单号"),
              vue.createElementVNode("text", { class: "table-col col-repair" }, "关联报修"),
              vue.createElementVNode("text", { class: "table-col col-priority" }, "优先级"),
              vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
              vue.createElementVNode("text", { class: "table-col col-worker" }, "维修人员"),
              vue.createElementVNode("text", { class: "table-col col-phone" }, "联系电话"),
              vue.createElementVNode("text", { class: "table-col col-create" }, "创建时间"),
              vue.createElementVNode("text", { class: "table-col col-update" }, "最近时间"),
              vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.workOrderList, (item, index) => {
                return vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: item.id,
                    class: "table-row",
                    style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                  },
                  [
                    vue.createElementVNode("view", { class: "table-col col-order" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "primary-text" },
                        vue.toDisplayString(item.orderNo || item.id || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-repair" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        "#" + vue.toDisplayString(item.repairId || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-priority" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["priority-pill", $options.getPriorityClass(item.priority)])
                        },
                        vue.toDisplayString($options.getPriorityText(item.priority)),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-status" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                        },
                        vue.toDisplayString($options.getStatusText(item.status)),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-worker" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString($options.getWorkerName(item)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-phone" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString($options.getWorkerPhone(item)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-create" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString($options.formatTime(item.createTime)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-update" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString($options.formatTime($options.getLatestTime(item))),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                      item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 0,
                        class: "row-btn primary",
                        onClick: ($event) => $options.openAssignDialog(item)
                      }, "指派维修员", 8, ["onClick"])) : (vue.openBlock(), vue.createElementBlock("button", {
                        key: 1,
                        class: "row-btn ghost",
                        onClick: ($event) => $options.reuseRepairFilter(item.repairId)
                      }, "查看同报修", 8, ["onClick"]))
                    ])
                  ],
                  4
                  /* STYLE */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.workOrderList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无工单数据")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[10] || (_cache[10] = ($event) => $options.handlePageChange(-1))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[11] || (_cache[11] = ($event) => $options.handlePageChange(1))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[12] || (_cache[12] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ]),
        $data.showAssignDialog ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "detail-modal",
          onClick: _cache[19] || (_cache[19] = (...args) => $options.closeAssignDialog && $options.closeAssignDialog(...args))
        }, [
          vue.createElementVNode("view", {
            class: "detail-content",
            onClick: _cache[18] || (_cache[18] = vue.withModifiers(() => {
            }, ["stop"]))
          }, [
            vue.createElementVNode("view", { class: "detail-header" }, [
              vue.createElementVNode("text", { class: "detail-title" }, "指派维修任务"),
              vue.createElementVNode("button", {
                class: "close-btn",
                onClick: _cache[13] || (_cache[13] = (...args) => $options.closeAssignDialog && $options.closeAssignDialog(...args))
              }, "关闭")
            ]),
            vue.createElementVNode("view", { class: "detail-body" }, [
              vue.createElementVNode("view", { class: "detail-item" }, [
                vue.createElementVNode("text", { class: "detail-label" }, "工单号:"),
                vue.createElementVNode(
                  "text",
                  { class: "detail-value" },
                  vue.toDisplayString($data.currentOrder ? $data.currentOrder.orderNo || $data.currentOrder.id : "-"),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "detail-item" }, [
                vue.createElementVNode("text", { class: "detail-label" }, "关联报修:"),
                vue.createElementVNode(
                  "text",
                  { class: "detail-value" },
                  "#" + vue.toDisplayString($data.currentOrder && $data.currentOrder.repairId ? $data.currentOrder.repairId : "-"),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "detail-item" }, [
                vue.createElementVNode("text", { class: "detail-label" }, "维修人员:"),
                vue.createElementVNode("view", { class: "detail-picker-wrap" }, [
                  vue.createElementVNode("picker", {
                    mode: "selector",
                    range: $data.workerList,
                    "range-key": "displayName",
                    onChange: _cache[14] || (_cache[14] = (...args) => $options.handleWorkerSelect && $options.handleWorkerSelect(...args))
                  }, [
                    vue.createElementVNode("view", { class: "detail-picker" }, [
                      $data.selectedWorker ? (vue.openBlock(), vue.createElementBlock(
                        "text",
                        {
                          key: 0,
                          class: "detail-picker-text"
                        },
                        vue.toDisplayString($data.selectedWorker.displayName),
                        1
                        /* TEXT */
                      )) : (vue.openBlock(), vue.createElementBlock("text", {
                        key: 1,
                        class: "detail-picker-placeholder"
                      }, "请选择维修员"))
                    ])
                  ], 40, ["range"])
                ])
              ]),
              vue.createElementVNode("view", { class: "detail-item" }, [
                vue.createElementVNode("text", { class: "detail-label" }, "优先级:"),
                vue.createElementVNode("view", { class: "detail-picker-wrap" }, [
                  vue.createElementVNode("picker", {
                    mode: "selector",
                    range: $data.priorityOptions,
                    "range-key": "label",
                    value: $options.priorityPickerIndex,
                    onChange: _cache[15] || (_cache[15] = (...args) => $options.handlePrioritySelect && $options.handlePrioritySelect(...args))
                  }, [
                    vue.createElementVNode("view", { class: "detail-picker" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "detail-picker-text" },
                        vue.toDisplayString($options.getPriorityText($data.assignPriority)),
                        1
                        /* TEXT */
                      )
                    ])
                  ], 40, ["range", "value"])
                ])
              ]),
              !$data.workerList.length ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "form-tip"
              }, [
                vue.createElementVNode("text", null, "暂无可用维修人员数据")
              ])) : vue.createCommentVNode("v-if", true),
              vue.createElementVNode("view", { class: "detail-actions" }, [
                vue.createElementVNode("button", {
                  class: "detail-btn secondary",
                  onClick: _cache[16] || (_cache[16] = (...args) => $options.closeAssignDialog && $options.closeAssignDialog(...args))
                }, "取消"),
                vue.createElementVNode("button", {
                  class: "detail-btn primary",
                  onClick: _cache[17] || (_cache[17] = (...args) => $options.handleAssignSubmit && $options.handleAssignSubmit(...args)),
                  loading: $data.assigning,
                  disabled: !$data.selectedWorker
                }, " 确认指派 ", 8, ["loading", "disabled"])
              ])
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminWorkOrderManage = /* @__PURE__ */ _export_sfc(_sfc_main$p, [["render", _sfc_render$o], ["__scopeId", "data-v-810b75f0"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/work-order-manage.vue"]]);
  const block0 = (Comp) => {
    (Comp.$renderjs || (Comp.$renderjs = [])).push("echarts");
    (Comp.$renderjsModules || (Comp.$renderjsModules = {}))["echarts"] = "a9f75d12";
  };
  const _sfc_main$o = {
    components: { adminSidebar },
    data() {
      return {
        userInfo: {},
        stats: [
          { label: "小区总数", value: "-", icon: "▦", bg: "linear-gradient(135deg, #5e78a2 0%, #7991b2 100%)" },
          { label: "住户总数", value: "-", icon: "☺", bg: "linear-gradient(135deg, #7da4b8 0%, #92bac8 100%)" },
          { label: "待办事项", value: "-", icon: "≣", bg: "linear-gradient(135deg, #6a7fa3 0%, #88a0c0 100%)" },
          { label: "今日报修", value: "-", icon: "⌘", bg: "linear-gradient(135deg, #7ab38a 0%, #9cc3a4 100%)" }
        ],
        menus: [
          { name: "仪表盘", icon: "◫", color: "linear-gradient(135deg, #617ca4 0%, #7f97b6 100%)", path: "/admin/pages/admin/dashboard/index" },
          { name: "报修管理", icon: "⌂", color: "linear-gradient(135deg, #6f86a8 0%, #8fa1bf 100%)", path: "/admin/pages/admin/repair-manage", badgeKey: "repair" },
          { name: "工单管理", icon: "▣", color: "linear-gradient(135deg, #607099 0%, #7c8db0 100%)", path: "/admin/pages/admin/work-order-manage", badgeKey: "workorder" },
          { name: "公告管理", icon: "✉", color: "linear-gradient(135deg, #8ea0b7 0%, #a7b6c9 100%)", path: "/admin/pages/admin/notice-manage" },
          { name: "费用管理", icon: "¥", color: "linear-gradient(135deg, #c0a57b 0%, #d6b98f 100%)", path: "/admin/pages/admin/fee-manage" },
          { name: "投诉处理", icon: "☏", color: "linear-gradient(135deg, #a98578 0%, #c29e90 100%)", path: "/admin/pages/admin/complaint-manage", badgeKey: "complaint" },
          { name: "访客审核", icon: "◉", color: "linear-gradient(135deg, #7fa494 0%, #95b7a9 100%)", path: "/admin/pages/admin/visitor-manage", badgeKey: "visitor" },
          { name: "社区活动", icon: "✦", color: "linear-gradient(135deg, #8c96b5 0%, #adb4cb 100%)", path: "/admin/pages/admin/activity-manage" },
          { name: "停车管理", icon: "▤", color: "linear-gradient(135deg, #7ea0ae 0%, #97b7c4 100%)", path: "/admin/pages/admin/parking-manage" },
          { name: "用户管理", icon: "☺", color: "linear-gradient(135deg, #86a18e 0%, #a1b9aa 100%)", path: "/admin/pages/admin/user-manage" },
          { name: "系统配置", icon: "⚙", color: "linear-gradient(135deg, #8d95a6 0%, #a5adbd 100%)", path: "/admin/pages/admin/system-config" }
        ],
        menuBadges: {},
        repairTrend: [],
        complaintType: [],
        workOrderStats: [],
        compareStats: {},
        monthOptions: [],
        monthIndex: 0,
        monthValue: ""
      };
    },
    computed: {
      currentMonthLabel() {
        const opt = this.monthOptions && this.monthOptions[this.monthIndex];
        return opt && opt.label || this.monthValue || "选择月份";
      }
    },
    onShow() {
      const userInfo = uni.getStorageSync("userInfo");
      if (userInfo) {
        if (userInfo.role === "worker") {
          uni.redirectTo({ url: "/admin/pages/admin/worker-tasks" });
          return;
        }
        this.userInfo = userInfo;
        if (!this.monthOptions || this.monthOptions.length === 0) {
          this.initMonthOptions();
        }
        this.loadDashboardData();
        this.loadRepairStats();
      } else {
        uni.redirectTo({ url: "/owner/pages/login/login" });
      }
    },
    methods: {
      initMonthOptions() {
        const now = /* @__PURE__ */ new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const current = `${y}-${String(m).padStart(2, "0")}`;
        const opts = [];
        for (let i = 0; i < 12; i++) {
          const d = new Date(y, m - 1 - i, 1);
          const yy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const value = `${yy}-${mm}`;
          opts.push({ label: value, value });
        }
        this.monthOptions = opts;
        this.monthValue = current;
        this.monthIndex = Math.max(0, opts.findIndex((o) => o.value === current));
      },
      handleMonthChange(e) {
        const idx = Number(e && e.detail ? e.detail.value : 0);
        const option = this.monthOptions && this.monthOptions[idx];
        if (!option)
          return;
        this.monthIndex = idx;
        this.monthValue = option.value;
        this.loadDashboardData();
        this.loadRepairStats();
      },
      async loadRepairStats() {
        try {
          const params = this.monthValue ? { month: this.monthValue } : {};
          const res = await request({ url: "/api/repair/stats", method: "GET", params });
          const data = res.data || res;
          if (data.workorder) {
            this.workOrderStats = [
              { name: "待指派", value: data.workorder.pending || 0 },
              { name: "已指派", value: data.workorder.assigned || 0 },
              { name: "处理中", value: data.workorder.processing || 0 },
              { name: "已完成", value: data.workorder.completed || 0 }
            ];
          }
          if (data.repair && data.workorder) {
            this.compareStats = {
              repair: data.repair.total || 0,
              workorder: data.workorder.total || 0
            };
          }
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/dashboard/index.vue:199", "加载统计失败", e);
        }
      },
      async loadDashboardData() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
        try {
          const params = this.monthValue ? { month: this.monthValue } : {};
          const raw = await request({ url: "/api/admin/stats/overview", method: "GET", params });
          const data = raw && raw.data ? raw.data : raw;
          if (!data)
            return;
          this.stats[0].value = ((_a = data.community) == null ? void 0 : _a.total) ?? data.communityTotal ?? 0;
          this.stats[1].value = ((_b = data.user) == null ? void 0 : _b.owner) ?? ((_c = data.user) == null ? void 0 : _c.total) ?? ((_d = data.user) == null ? void 0 : _d.resident) ?? ((_e = data.user) == null ? void 0 : _e.count) ?? data.ownerTotal ?? data.residentTotal ?? data.userTotal ?? 0;
          const repairPending = ((_g = (_f = data.repair) == null ? void 0 : _f.repair) == null ? void 0 : _g.pending) ?? ((_h = data.repair) == null ? void 0 : _h.pending) ?? 0;
          const workorderPending = ((_j = (_i = data.repair) == null ? void 0 : _i.workorder) == null ? void 0 : _j.pending) ?? ((_k = data.workorder) == null ? void 0 : _k.pending) ?? 0;
          const complaintPending = ((_l = data.complaint) == null ? void 0 : _l.pending) ?? 0;
          const visitorPending = ((_m = data.visitor) == null ? void 0 : _m.pending) ?? 0;
          const pendingTotal = complaintPending + repairPending + visitorPending + workorderPending;
          this.stats[2].value = data.todoTotal ?? pendingTotal;
          this.stats[3].value = data.todayRepair ?? ((_n = data.repair) == null ? void 0 : _n.todayRepair) ?? ((_o = data.repair) == null ? void 0 : _o.today) ?? 0;
          this.menuBadges = {
            repair: repairPending,
            workorder: workorderPending,
            complaint: complaintPending,
            visitor: visitorPending
          };
          if (data.repairTrend && data.repairTrend.length > 0) {
            this.repairTrend = data.repairTrend;
          } else {
            const today = /* @__PURE__ */ new Date();
            const dates = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date(today);
              d.setDate(today.getDate() - i);
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              dates.push(`${m}-${day}`);
            }
            this.repairTrend = dates.map((d) => ({ date: d, count: 0 }));
          }
          if (data.complaintType && data.complaintType.length > 0) {
            const typeMap = {
              noise: "噪音扰民",
              environment: "环境卫生",
              env: "环境卫生",
              sanitation: "环境卫生",
              facility: "设施损坏",
              repair: "设施损坏",
              security: "安保问题",
              safety: "安保问题",
              other: "其他"
            };
            this.complaintType = data.complaintType.map((item) => ({
              ...item,
              name: typeMap[(item.name || "").toLowerCase()] || item.name
            }));
          } else {
            this.complaintType = [
              { name: "暂无数据", value: 0, itemStyle: { color: "#c7ccd5" } }
            ];
          }
        } catch (e) {
          formatAppLog("error", "at admin/pages/admin/dashboard/index.vue:274", "加载看板数据失败", e);
        }
      },
      navigateTo(url) {
        uni.navigateTo({ url });
      },
      getMenuBadge(menu) {
        if (!menu || !menu.badgeKey)
          return 0;
        return Number(this.menuBadges[menu.badgeKey] || 0);
      }
    }
  };
  function _sfc_render$n(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      pageTitle: "仪表盘",
      currentPage: "/admin/pages/admin/dashboard/index",
      pageBreadcrumb: "管理后台 / 仪表盘"
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "dashboard" }, [
          vue.createElementVNode("view", { class: "dashboard-topbar" }, [
            vue.createElementVNode("view", { class: "dashboard-title-group" }, [
              vue.createElementVNode("text", { class: "dashboard-title" }, "清晰、明亮、高效"),
              vue.createElementVNode("text", { class: "dashboard-subtitle" }, "更清爽的社区后台控制台，优先强化卡片边框、层级和可读性。")
            ]),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.monthOptions,
              "range-key": "label",
              onChange: _cache[0] || (_cache[0] = (...args) => $options.handleMonthChange && $options.handleMonthChange(...args))
            }, [
              vue.createElementVNode("view", { class: "stats-filter-btn" }, [
                vue.createElementVNode(
                  "text",
                  { class: "stats-filter-text" },
                  vue.toDisplayString($options.currentMonthLabel),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", { class: "stats-filter-arrow" }, "▼")
              ])
            ], 40, ["range"])
          ]),
          vue.createElementVNode("view", { class: "panel-card stats-panel" }, [
            vue.createElementVNode("view", { class: "panel-header" }, [
              vue.createElementVNode("text", { class: "panel-title" }, "核心指标")
            ]),
            vue.createElementVNode("view", { class: "stats-grid" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.stats, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: "stat-card",
                    key: index
                  }, [
                    vue.createElementVNode(
                      "view",
                      {
                        class: "stat-accent",
                        style: vue.normalizeStyle({ background: item.bg })
                      },
                      null,
                      4
                      /* STYLE */
                    ),
                    vue.createElementVNode(
                      "view",
                      {
                        class: "stat-icon-wrap",
                        style: vue.normalizeStyle({ background: item.bg })
                      },
                      [
                        vue.createElementVNode(
                          "text",
                          { class: "stat-icon" },
                          vue.toDisplayString(item.icon),
                          1
                          /* TEXT */
                        )
                      ],
                      4
                      /* STYLE */
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
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          vue.createElementVNode("view", { class: "chart-grid" }, [
            vue.createElementVNode("view", { class: "panel-card chart-panel" }, [
              vue.createElementVNode("view", { class: "panel-header" }, [
                vue.createElementVNode("text", { class: "panel-title" }, "近七日报修趋势")
              ]),
              vue.createElementVNode("view", {
                id: "repairChart",
                class: "echart-container",
                prop: vue.wp($data.repairTrend),
                "change:prop": _ctx.echarts.updateRepairChart
              }, null, 8, ["prop", "change:prop"])
            ]),
            vue.createElementVNode("view", { class: "panel-card chart-panel" }, [
              vue.createElementVNode("view", { class: "panel-header" }, [
                vue.createElementVNode("text", { class: "panel-title" }, "投诉类型分布")
              ]),
              vue.createElementVNode("view", {
                id: "complaintChart",
                class: "echart-container",
                prop: vue.wp($data.complaintType),
                "change:prop": _ctx.echarts.updateComplaintChart
              }, null, 8, ["prop", "change:prop"])
            ])
          ]),
          vue.createElementVNode("view", { class: "chart-grid" }, [
            vue.createElementVNode("view", { class: "panel-card chart-panel" }, [
              vue.createElementVNode("view", { class: "panel-header" }, [
                vue.createElementVNode("text", { class: "panel-title" }, "工单处理状态")
              ]),
              vue.createElementVNode("view", {
                id: "workOrderChart",
                class: "echart-container",
                prop: vue.wp($data.workOrderStats),
                "change:prop": _ctx.echarts.updateWorkOrderChart
              }, null, 8, ["prop", "change:prop"])
            ]),
            vue.createElementVNode("view", { class: "panel-card chart-panel" }, [
              vue.createElementVNode("view", { class: "panel-header" }, [
                vue.createElementVNode("text", { class: "panel-title" }, "报修与工单对比")
              ]),
              vue.createElementVNode("view", {
                id: "compareChart",
                class: "echart-container",
                prop: vue.wp($data.compareStats),
                "change:prop": _ctx.echarts.updateCompareChart
              }, null, 8, ["prop", "change:prop"])
            ])
          ]),
          vue.createElementVNode("view", { class: "panel-card menu-panel" }, [
            vue.createElementVNode("view", { class: "panel-header" }, [
              vue.createElementVNode("text", { class: "panel-title" }, "快捷入口")
            ]),
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
                      [
                        vue.createElementVNode(
                          "text",
                          { class: "menu-icon-text" },
                          vue.toDisplayString(menu.icon),
                          1
                          /* TEXT */
                        ),
                        $options.getMenuBadge(menu) > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "badge-dot"
                        })) : vue.createCommentVNode("v-if", true)
                      ],
                      4
                      /* STYLE */
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
        ])
      ]),
      _: 1
      /* STABLE */
    });
  }
  if (typeof block0 === "function")
    block0(_sfc_main$o);
  const AdminPagesAdminDashboardIndex = /* @__PURE__ */ _export_sfc(_sfc_main$o, [["render", _sfc_render$n], ["__scopeId", "data-v-21c44072"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/dashboard/index.vue"]]);
  const _sfc_main$n = {
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
        editRoleOptions: [
          { label: "业主", value: "owner" },
          { label: "工作人员", value: "worker" },
          { label: "管理员", value: "admin" },
          { label: "超级管理员", value: "super_admin" }
        ],
        communityList: [],
        communityListLoading: false,
        communityLoadError: "",
        showEditPanel: false,
        editForm: {
          userId: null,
          realName: "",
          phone: "",
          role: "",
          communityId: ""
        },
        saving: false,
        currentPage: 1,
        pageSize: 10,
        total: 0,
        stats: {
          total: 0,
          admin: 0,
          owner: 0
        },
        monthOptions: [],
        monthIndex: 0,
        monthValue: ""
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      rolePickerIndex() {
        return Math.max(0, this.roleOptions.findIndex((item) => item.value === this.roleFilter));
      },
      currentRoleLabel() {
        const current = this.roleOptions.find((item) => item.value === this.roleFilter);
        return current ? current.label : "全部角色";
      },
      currentMonthLabel() {
        const option = this.monthOptions[this.monthIndex];
        return option ? option.label : this.monthValue || "选择月份";
      },
      normalizedEditRole() {
        return String(this.editForm.role || "").toLowerCase();
      },
      editRoleIndex() {
        return Math.max(0, this.editRoleOptions.findIndex((item) => item.value === this.normalizedEditRole));
      },
      currentEditRoleLabel() {
        const current = this.editRoleOptions.find((item) => item.value === this.normalizedEditRole);
        return current ? current.label : "业主";
      },
      needsEditCommunityAssignment() {
        return this.normalizedEditRole === "admin" || this.normalizedEditRole === "worker";
      },
      editCommunityIndex() {
        const index = this.communityList.findIndex((item) => String(item.id) === String(this.editForm.communityId));
        return index >= 0 ? index : 0;
      },
      editCommunityLabel() {
        const current = this.communityList.find((item) => String(item.id) === String(this.editForm.communityId));
        return current ? current.name : "";
      },
      editCommunityDisplayText() {
        if (this.communityListLoading)
          return "社区列表加载中...";
        if (this.editCommunityLabel)
          return this.editCommunityLabel;
        if (this.communityLoadError)
          return "社区列表加载失败";
        if (!this.communityList.length)
          return "暂无可选社区";
        return this.normalizedEditRole === "admin" ? "请选择负责社区" : "请选择所属社区";
      },
      editCommunityTip() {
        if (this.communityListLoading)
          return "正在加载社区列表，请稍候。";
        if (this.communityLoadError)
          return this.communityLoadError;
        if (!this.communityList.length)
          return "当前未获取到社区数据，无法完成该角色编辑。";
        return this.normalizedEditRole === "admin" ? "管理员账号需要绑定负责社区，便于后续按社区管理业务。" : "工作人员账号需要绑定所属社区，便于后续按社区接收任务。";
      }
    },
    onLoad() {
      this.initMonthOptions();
      this.loadUserList();
      this.loadStats();
    },
    methods: {
      initMonthOptions() {
        const now = /* @__PURE__ */ new Date();
        const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const options = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          options.push({ label: value, value });
        }
        this.monthOptions = options;
        this.monthValue = current;
        this.monthIndex = Math.max(0, options.findIndex((item) => item.value === current));
      },
      extractTotal(data) {
        var _a, _b;
        if (typeof (data == null ? void 0 : data.total) === "number")
          return data.total;
        if (typeof ((_a = data == null ? void 0 : data.data) == null ? void 0 : _a.total) === "number")
          return data.data.total;
        if (Array.isArray(data == null ? void 0 : data.records))
          return data.records.length;
        if (Array.isArray((_b = data == null ? void 0 : data.data) == null ? void 0 : _b.records))
          return data.data.records.length;
        if (Array.isArray(data))
          return data.length;
        return 0;
      },
      handleMonthChange(e) {
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const option = this.monthOptions[index];
        if (!option)
          return;
        this.monthIndex = index;
        this.monthValue = option.value;
        this.currentPage = 1;
        this.loadUserList();
        this.loadStats();
      },
      getRoleLabel(role) {
        const val = role == null ? "" : String(role).toLowerCase();
        if (val === "admin")
          return "管理员";
        if (val === "worker")
          return "工作人员";
        if (val === "super_admin")
          return "超级管理员";
        if (val === "owner")
          return "业主";
        return role || "未知角色";
      },
      handleRoleChange(e) {
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
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
            keyword: this.searchKey || void 0,
            month: this.monthValue || void 0,
            role: this.roleFilter || void 0
          };
          const res = await request("/api/admin/user/list", { params }, "GET");
          const records = (res == null ? void 0 : res.records) || ((_a = res == null ? void 0 : res.data) == null ? void 0 : _a.records) || [];
          this.userList = (Array.isArray(records) ? records : []).map((item) => ({
            userId: item.userId || item.id,
            realName: item.realName,
            username: item.username,
            phone: item.phone,
            role: item.role,
            communityId: item.communityId,
            communityName: item.communityName,
            status: item.status,
            createTime: item.createTime || item.registerTime || item.applyTime
          }));
          this.total = Number((res == null ? void 0 : res.total) || ((_b = res == null ? void 0 : res.data) == null ? void 0 : _b.total) || 0);
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:421", "加载用户列表失败:", error);
          uni.showToast({ title: "加载失败", icon: "none" });
          this.userList = [];
          this.total = 0;
        } finally {
          this.loading = false;
        }
      },
      async loadStats() {
        try {
          const month = this.monthValue || void 0;
          const [totalRes, adminRes, ownerRes] = await Promise.all([
            request("/api/admin/user/list", { params: { pageSize: 1, month } }, "GET"),
            request("/api/admin/user/list", { params: { pageSize: 1, role: "admin", month } }, "GET"),
            request("/api/admin/user/list", { params: { pageSize: 1, role: "owner", month } }, "GET")
          ]);
          this.stats = {
            total: this.extractTotal(totalRes),
            admin: this.extractTotal(adminRes),
            owner: this.extractTotal(ownerRes)
          };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:443", "加载用户统计失败", error);
        }
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadUserList();
      },
      handleResetFilters() {
        this.searchKey = "";
        this.roleFilter = "";
        this.currentPage = 1;
        this.loadUserList();
      },
      handlePrevPage() {
        if (this.currentPage <= 1)
          return;
        this.currentPage -= 1;
        this.loadUserList();
      },
      handleNextPage() {
        if (this.currentPage >= this.totalPages)
          return;
        this.currentPage += 1;
        this.loadUserList();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadUserList();
      },
      async ensureCommunityList() {
        if (this.communityListLoading || this.communityList.length > 0)
          return;
        this.communityListLoading = true;
        this.communityLoadError = "";
        try {
          const data = await request("/api/house/community/all", {}, "GET");
          const list = Array.isArray(data) ? data : Array.isArray(data == null ? void 0 : data.records) ? data.records : [];
          this.communityList = list.map((item) => ({
            id: item == null ? void 0 : item.id,
            name: (item == null ? void 0 : item.name) || (item == null ? void 0 : item.communityName) || `社区${(item == null ? void 0 : item.id) || ""}`
          })).filter((item) => item.id != null);
          if (!this.communityList.length) {
            this.communityLoadError = "社区列表为空，请先确认社区数据是否已配置。";
          }
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:490", "加载社区列表失败:", error);
          this.communityList = [];
          this.communityLoadError = (error == null ? void 0 : error.message) || "社区列表加载失败，请检查社区查询接口。";
        } finally {
          this.communityListLoading = false;
        }
      },
      async handleEditUser(user) {
        this.editForm = {
          userId: user.userId,
          realName: user.realName || "",
          phone: user.phone || "",
          role: String(user.role || "").toLowerCase(),
          communityId: user.communityId != null ? String(user.communityId) : ""
        };
        this.showEditPanel = true;
        if (this.needsEditCommunityAssignment) {
          await this.ensureCommunityList();
        }
      },
      handleEditRoleChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.editForm.role = ((_b = this.editRoleOptions[index]) == null ? void 0 : _b.value) || "owner";
        if (!this.needsEditCommunityAssignment) {
          this.editForm.communityId = "";
          return;
        }
        this.ensureCommunityList();
      },
      handleEditCommunityChange(e) {
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const selected = this.communityList[index];
        this.editForm.communityId = (selected == null ? void 0 : selected.id) != null ? String(selected.id) : "";
      },
      async handleToggleStatus(user) {
        const userId = user.userId;
        if (!userId) {
          uni.showToast({ title: "缺少用户ID", icon: "none" });
          return;
        }
        const currentStatus = user.status;
        const targetStatus = currentStatus === 1 ? 0 : 1;
        uni.showModal({
          title: targetStatus === 0 ? "禁用用户" : "启用用户",
          content: targetStatus === 0 ? "确定要禁用该用户吗？" : "确定要启用该用户吗？",
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await request(`/api/admin/user/${userId}/status`, { params: { status: targetStatus } }, "PUT");
              uni.showToast({ title: "操作成功", icon: "success" });
              this.loadUserList();
            } catch (error) {
              formatAppLog("error", "at admin/pages/admin/user-manage.vue:542", "修改用户状态失败:", error);
              uni.showToast({ title: (error == null ? void 0 : error.message) || "操作失败", icon: "none" });
            }
          }
        });
      },
      closeEditPanel() {
        if (this.saving)
          return;
        this.showEditPanel = false;
        this.editForm = {
          userId: null,
          realName: "",
          phone: "",
          role: "",
          communityId: ""
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
        if (this.needsEditCommunityAssignment && !this.editForm.communityId) {
          uni.showToast({
            title: this.normalizedEditRole === "admin" ? "请选择负责社区" : "请选择所属社区",
            icon: "none"
          });
          return;
        }
        this.saving = true;
        try {
          const payload = {
            userId: this.editForm.userId,
            realName: this.editForm.realName,
            phone: this.editForm.phone,
            role: this.editForm.role,
            communityId: this.needsEditCommunityAssignment ? Number(this.editForm.communityId) : null
          };
          await request("/api/admin/user/update", {
            data: payload
          }, "PUT");
          uni.showToast({ title: "保存成功", icon: "success" });
          this.closeEditPanel();
          this.loadUserList();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/user-manage.vue:595", "保存用户信息失败:", error);
          uni.showToast({ title: (error == null ? void 0 : error.message) || "保存失败", icon: "none" });
        } finally {
          this.saving = false;
        }
      },
      formatTime(time) {
        if (!time)
          return "-";
        const date = new Date(String(time).replace(" ", "T"));
        if (Number.isNaN(date.getTime()))
          return String(time);
        return date.toLocaleString();
      }
    }
  };
  function _sfc_render$m(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[21] || (_cache[21] = ($event) => $data.showSidebar = $event),
      pageTitle: "用户管理",
      currentPage: "/admin/pages/admin/user-manage",
      pageBreadcrumb: "管理后台 / 用户管理",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "用户列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一为后台表格页，保留按月份统计、角色筛选、用户编辑与启停用操作。")
            ]),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.monthOptions,
              "range-key": "label",
              onChange: _cache[0] || (_cache[0] = (...args) => $options.handleMonthChange && $options.handleMonthChange(...args))
            }, [
              vue.createElementVNode("view", { class: "month-filter-chip" }, [
                vue.createElementVNode("text", { class: "month-filter-label" }, "统计月份"),
                vue.createElementVNode(
                  "text",
                  { class: "month-filter-value" },
                  vue.toDisplayString($options.currentMonthLabel),
                  1
                  /* TEXT */
                )
              ])
            ], 40, ["range"])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar user-status-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.roleFilter === "" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick(""))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "总用户数"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card admin", { active: $data.roleFilter === "admin" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("admin"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "管理员"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.admin),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card owner", { active: $data.roleFilter === "owner" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.handleStatsClick("owner"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "业主"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.owner),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid user-query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.searchKey = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "搜索姓名、账号或手机号",
                    onConfirm: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchKey]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "用户角色"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.roleOptions,
                  "range-key": "label",
                  value: $options.rolePickerIndex,
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleRoleChange && $options.handleRoleChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentRoleLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "当前筛选：" + vue.toDisplayString($options.currentRoleLabel),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "月份：" + vue.toDisplayString($options.currentMonthLabel),
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "scroll-table" }, [
              vue.createElementVNode("view", { class: "table-head user-table" }, [
                vue.createElementVNode("text", { class: "table-col col-name" }, "姓名"),
                vue.createElementVNode("text", { class: "table-col col-username" }, "账号"),
                vue.createElementVNode("text", { class: "table-col col-phone" }, "手机号"),
                vue.createElementVNode("text", { class: "table-col col-role" }, "角色"),
                vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
                vue.createElementVNode("text", { class: "table-col col-time" }, "最近时间"),
                vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
              ]),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.userList, (user, index) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: user.userId,
                      class: "table-row user-table",
                      style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                    },
                    [
                      vue.createElementVNode("view", { class: "table-col col-name" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "primary-text" },
                          vue.toDisplayString(user.realName || user.username || "未填写姓名"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-username" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(user.username || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-phone" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(user.phone || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-role" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString($options.getRoleLabel(user.role)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-status" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-pill", user.status === 1 ? "status-active" : "status-disabled"])
                          },
                          vue.toDisplayString(user.status === 1 ? "正常" : "已禁用"),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-time" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString($options.formatTime(user.createTime)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                        vue.createElementVNode("button", {
                          class: "row-btn ghost",
                          onClick: ($event) => $options.handleEditUser(user)
                        }, "编辑", 8, ["onClick"]),
                        vue.createElementVNode("button", {
                          class: vue.normalizeClass(["row-btn", user.status === 1 ? "secondary-warn" : "primary"]),
                          onClick: ($event) => $options.handleToggleStatus(user)
                        }, vue.toDisplayString(user.status === 1 ? "禁用" : "启用"), 11, ["onClick"])
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
            $data.userList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无用户数据")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[11] || (_cache[11] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          $data.showEditPanel ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "detail-modal",
            onClick: _cache[20] || (_cache[20] = (...args) => $options.closeEditPanel && $options.closeEditPanel(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content",
              onClick: _cache[19] || (_cache[19] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "编辑用户"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[12] || (_cache[12] = (...args) => $options.closeEditPanel && $options.closeEditPanel(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "角色:"),
                  vue.createElementVNode("picker", {
                    mode: "selector",
                    range: $data.editRoleOptions,
                    "range-key": "label",
                    value: $options.editRoleIndex,
                    onChange: _cache[13] || (_cache[13] = (...args) => $options.handleEditRoleChange && $options.handleEditRoleChange(...args))
                  }, [
                    vue.createElementVNode("view", { class: "modal-picker" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "modal-picker-text" },
                        vue.toDisplayString($options.currentEditRoleLabel),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("text", { class: "modal-picker-arrow" }, ">")
                    ])
                  ], 40, ["range", "value"])
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "姓名:"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "form-input-inline",
                      "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => $data.editForm.realName = $event),
                      placeholder: "请输入姓名"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.editForm.realName]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "手机号:"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "form-input-inline",
                      "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event) => $data.editForm.phone = $event),
                      placeholder: "请输入手机号"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.editForm.phone]
                  ])
                ]),
                $options.needsEditCommunityAssignment ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "detail-item detail-item-block"
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "detail-label" },
                    vue.toDisplayString($options.normalizedEditRole === "admin" ? "负责社区:" : "所属社区:"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("picker", {
                    mode: "selector",
                    range: $data.communityList,
                    "range-key": "name",
                    value: $options.editCommunityIndex,
                    disabled: $data.communityListLoading || $data.communityList.length === 0,
                    onChange: _cache[16] || (_cache[16] = (...args) => $options.handleEditCommunityChange && $options.handleEditCommunityChange(...args))
                  }, [
                    vue.createElementVNode(
                      "view",
                      {
                        class: vue.normalizeClass(["modal-picker", { placeholder: !$options.editCommunityLabel }])
                      },
                      [
                        vue.createElementVNode(
                          "text",
                          { class: "modal-picker-text" },
                          vue.toDisplayString($options.editCommunityDisplayText),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("text", { class: "modal-picker-arrow" }, ">")
                      ],
                      2
                      /* CLASS */
                    )
                  ], 40, ["range", "value", "disabled"]),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-tip" },
                    vue.toDisplayString($options.editCommunityTip),
                    1
                    /* TEXT */
                  )
                ])) : vue.createCommentVNode("v-if", true),
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[17] || (_cache[17] = (...args) => $options.closeEditPanel && $options.closeEditPanel(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    disabled: $data.saving,
                    onClick: _cache[18] || (_cache[18] = (...args) => $options.submitEdit && $options.submitEdit(...args))
                  }, "保存", 8, ["disabled"])
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminUserManage = /* @__PURE__ */ _export_sfc(_sfc_main$n, [["render", _sfc_render$m], ["__scopeId", "data-v-aff5800b"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/user-manage.vue"]]);
  const _sfc_main$m = {
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
        filters: {
          title: "",
          publishStatus: "",
          topFlag: ""
        },
        selectedIds: [],
        statusStats: {
          published: 0,
          draft: 0,
          offline: 0
        },
        statusOptions: [
          { label: "全部状态", value: "" },
          { label: "已发布", value: "PUBLISHED" },
          { label: "草稿", value: "DRAFT" },
          { label: "已下架", value: "OFFLINE" }
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
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      isAllSelected() {
        return this.noticeList.length > 0 && this.selectedIds.length === this.noticeList.length;
      },
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.filters.publishStatus));
      },
      topPickerIndex() {
        return Math.max(0, this.topOptions.findIndex((item) => item.value === this.filters.topFlag));
      },
      currentStatusLabel() {
        return this.getStatusLabel(this.filters.publishStatus) || "全部状态";
      },
      currentTopLabel() {
        return this.getTopLabel(this.filters.topFlag) || "全部置顶";
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
      normalizeNoticeList(res) {
        if (Array.isArray(res))
          return { records: res, total: res.length };
        if (Array.isArray(res.records))
          return { records: res.records, total: res.total || res.records.length };
        if (res.data && Array.isArray(res.data.records))
          return { records: res.data.records, total: res.data.total || res.data.records.length };
        if (res.data && Array.isArray(res.data))
          return { records: res.data, total: res.total || res.data.length };
        return { records: [], total: 0 };
      },
      calculateStatusStats() {
        const stats = {
          published: 0,
          draft: 0,
          offline: 0
        };
        this.noticeList.forEach((item) => {
          const status = String(item.publishStatus || "").toUpperCase();
          if (status === "PUBLISHED")
            stats.published += 1;
          if (status === "DRAFT")
            stats.draft += 1;
          if (status === "OFFLINE")
            stats.offline += 1;
        });
        this.statusStats = stats;
      },
      async loadNoticeList() {
        this.loading = true;
        this.selectedIds = [];
        this.selectAll = false;
        try {
          const params = {
            pageNum: this.currentPage,
            pageSize: this.pageSize,
            orderByColumn: "top_flag desc, publish_time",
            isAsc: "desc",
            ...this.filters
          };
          Object.keys(params).forEach((key) => {
            if (params[key] === "" || params[key] === null || params[key] === void 0) {
              delete params[key];
            }
          });
          const res = await request("/api/notice/admin/list", { params }, "GET");
          const normalized = this.normalizeNoticeList(res);
          this.noticeList = normalized.records;
          this.total = Number(normalized.total || 0);
          this.calculateStatusStats();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:301", error);
          this.noticeList = [];
          this.total = 0;
          this.calculateStatusStats();
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadNoticeList();
      },
      handleResetFilters() {
        this.filters = {
          title: "",
          publishStatus: "",
          topFlag: ""
        };
        this.currentPage = 1;
        this.loadNoticeList();
      },
      applyQuickFilter(status, topFlag) {
        this.filters.publishStatus = status;
        this.filters.topFlag = topFlag;
        this.currentPage = 1;
        this.loadNoticeList();
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.filters.publishStatus = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
        this.handleSearch();
      },
      handleTopChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.filters.topFlag = ((_b = this.topOptions[index]) == null ? void 0 : _b.value) || "";
        this.handleSearch();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadNoticeList();
      },
      getStatusLabel(val) {
        const option = this.statusOptions.find((item) => item.value === val);
        return option ? option.label : "";
      },
      getTopLabel(val) {
        const option = this.topOptions.find((item) => item.value === val);
        return option ? option.label : "";
      },
      getStatusText(status) {
        const map = {
          PUBLISHED: "已发布",
          DRAFT: "草稿",
          OFFLINE: "已下架"
        };
        return map[String(status || "").toUpperCase()] || status || "-";
      },
      getStatusClass(status) {
        const map = {
          PUBLISHED: "status-published",
          DRAFT: "status-draft",
          OFFLINE: "status-offline"
        };
        return map[String(status || "").toUpperCase()] || "status-offline";
      },
      handleAddNotice() {
        uni.navigateTo({ url: "/admin/pages/admin/notice-edit" });
      },
      handleEditNotice(id) {
        uni.navigateTo({ url: `/admin/pages/admin/notice-edit?noticeId=${id}` });
      },
      async handlePublish(id) {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          await request(`/api/notice/${id}/publish`, { params: { adminId: userInfo.id } }, "PUT");
          uni.showToast({ title: "发布成功" });
          this.loadNoticeList();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:383", "发布失败详情", error);
          uni.showToast({ title: "发布失败", icon: "none" });
        }
      },
      async handleOffline(id) {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          await request(`/api/notice/${id}/offline`, { params: { adminId: userInfo.id } }, "PUT");
          uni.showToast({ title: "下架成功" });
          this.loadNoticeList();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/notice-manage.vue:394", "下架失败详情", error);
          uni.showToast({ title: "下架失败", icon: "none" });
        }
      },
      async handleDeleteNotice(id) {
        const userInfo = uni.getStorageSync("userInfo");
        uni.showModal({
          title: "确认删除",
          content: "确定要删除这条公告吗？",
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await request(`/api/notice/${id}`, { params: { adminId: userInfo.id } }, "DELETE");
              uni.showToast({ title: "删除成功" });
              this.loadNoticeList();
            } catch (error) {
              uni.showToast({ title: "删除失败", icon: "none" });
            }
          }
        });
      },
      async handleBatchDelete() {
        if (!this.selectedIds.length)
          return;
        const userInfo = uni.getStorageSync("userInfo");
        uni.showModal({
          title: "批量删除",
          content: `确定要删除选中的 ${this.selectedIds.length} 条公告吗？`,
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await request("/api/notice/batch/delete", {
                data: { noticeIds: this.selectedIds },
                params: { adminId: userInfo.id }
              }, "POST");
              uni.showToast({ title: "批量删除成功" });
              this.loadNoticeList();
            } catch (error) {
              uni.showToast({ title: "批量删除失败", icon: "none" });
            }
          }
        });
      },
      async handleBatchOffline() {
        if (!this.selectedIds.length)
          return;
        const userInfo = uni.getStorageSync("userInfo");
        uni.showModal({
          title: "批量下架",
          content: `确定要下架选中的 ${this.selectedIds.length} 条公告吗？`,
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await request("/api/notice/batch/offline", {
                data: { noticeIds: this.selectedIds },
                params: { adminId: userInfo.id }
              }, "POST");
              uni.showToast({ title: "批量下架成功" });
              this.loadNoticeList();
            } catch (error) {
              uni.showToast({ title: "批量下架失败", icon: "none" });
            }
          }
        });
      },
      async handleReadStat(id) {
        try {
          const res = await request(`/api/notice/${id}/read-stat`, {}, "GET");
          const content = `阅读量：${res.readCount || 0}
点赞数：${res.likeCount || 0}
收藏数：${res.collectCount || 0}`;
          uni.showModal({
            title: "公告数据统计",
            content,
            showCancel: false
          });
        } catch (error) {
          uni.showToast({ title: "获取统计失败", icon: "none" });
        }
      },
      toggleSelect(id) {
        const index = this.selectedIds.indexOf(id);
        if (index > -1) {
          this.selectedIds.splice(index, 1);
        } else {
          this.selectedIds.push(id);
        }
        this.selectedIds = [...this.selectedIds];
        this.selectAll = this.isAllSelected;
      },
      testSelectAll() {
        const shouldSelectAll = !this.isAllSelected;
        this.selectAll = shouldSelectAll;
        this.selectedIds = shouldSelectAll ? this.noticeList.map((item) => item.id) : [];
        this.$forceUpdate();
      },
      prevPage() {
        if (this.currentPage <= 1)
          return;
        this.currentPage -= 1;
        this.loadNoticeList();
      },
      nextPage() {
        if (this.currentPage >= this.totalPage)
          return;
        this.currentPage += 1;
        this.loadNoticeList();
      }
    }
  };
  function _sfc_render$l(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[17] || (_cache[17] = ($event) => $data.showSidebar = $event),
      pageTitle: "公告管理",
      currentPage: "/admin/pages/admin/notice-manage",
      pageBreadcrumb: "管理后台 / 公告管理",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "公告发布列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一使用后台列表页结构，保留搜索、批量操作、发布、下架与数据统计。")
            ]),
            vue.createElementVNode("button", {
              class: "primary-action-btn",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.handleAddNotice && $options.handleAddNotice(...args))
            }, "发布公告")
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar" }, [
            vue.createElementVNode("view", {
              class: "status-summary-card",
              onClick: _cache[1] || (_cache[1] = ($event) => $options.applyQuickFilter("", ""))
            }, [
              vue.createElementVNode("text", { class: "summary-label" }, "当前列表"),
              vue.createElementVNode(
                "text",
                { class: "summary-value" },
                vue.toDisplayString($data.total),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", {
              class: "status-summary-card published",
              onClick: _cache[2] || (_cache[2] = ($event) => $options.applyQuickFilter("PUBLISHED", ""))
            }, [
              vue.createElementVNode("text", { class: "summary-label" }, "已发布"),
              vue.createElementVNode(
                "text",
                { class: "summary-value" },
                vue.toDisplayString($data.statusStats.published),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", {
              class: "status-summary-card draft",
              onClick: _cache[3] || (_cache[3] = ($event) => $options.applyQuickFilter("DRAFT", ""))
            }, [
              vue.createElementVNode("text", { class: "summary-label" }, "草稿"),
              vue.createElementVNode(
                "text",
                { class: "summary-value" },
                vue.toDisplayString($data.statusStats.draft),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", {
              class: "status-summary-card offline",
              onClick: _cache[4] || (_cache[4] = ($event) => $options.applyQuickFilter("OFFLINE", ""))
            }, [
              vue.createElementVNode("text", { class: "summary-label" }, "已下架"),
              vue.createElementVNode(
                "text",
                { class: "summary-value" },
                vue.toDisplayString($data.statusStats.offline),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "标题关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.filters.title = $event),
                    class: "query-input",
                    placeholder: "搜索公告标题",
                    "confirm-type": "search",
                    onConfirm: _cache[6] || (_cache[6] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.filters.title]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "发布状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "置顶状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.topOptions,
                  "range-key": "label",
                  value: $options.topPickerIndex,
                  onChange: _cache[8] || (_cache[8] = (...args) => $options.handleTopChange && $options.handleTopChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentTopLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "button",
                {
                  class: "toolbar-chip",
                  onClick: _cache[11] || (_cache[11] = (...args) => $options.testSelectAll && $options.testSelectAll(...args))
                },
                vue.toDisplayString($options.isAllSelected ? "取消全选" : "全选当前页"),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 0,
                  class: "toolbar-meta active"
                },
                "已选 " + vue.toDisplayString($data.selectedIds.length) + " 条",
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock("button", {
                key: 0,
                class: "toolbar-action danger",
                onClick: _cache[12] || (_cache[12] = (...args) => $options.handleBatchDelete && $options.handleBatchDelete(...args))
              }, "批量删除")) : vue.createCommentVNode("v-if", true),
              $data.selectedIds.length > 0 ? (vue.openBlock(), vue.createElementBlock("button", {
                key: 1,
                class: "toolbar-action ghost",
                onClick: _cache[13] || (_cache[13] = (...args) => $options.handleBatchOffline && $options.handleBatchOffline(...args))
              }, "批量下架")) : vue.createCommentVNode("v-if", true)
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "table-head" }, [
              vue.createElementVNode("text", { class: "table-col col-check" }, "选择"),
              vue.createElementVNode("text", { class: "table-col col-title" }, "标题"),
              vue.createElementVNode("text", { class: "table-col col-content" }, "内容摘要"),
              vue.createElementVNode("text", { class: "table-col col-top" }, "置顶"),
              vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
              vue.createElementVNode("text", { class: "table-col col-time" }, "发布时间"),
              vue.createElementVNode("text", { class: "table-col col-read" }, "数据"),
              vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.noticeList, (notice, index) => {
                return vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: notice.id,
                    class: "table-row",
                    style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                  },
                  [
                    vue.createElementVNode("view", {
                      class: "table-col col-check row-check",
                      onClick: vue.withModifiers(($event) => $options.toggleSelect(notice.id), ["stop"])
                    }, [
                      vue.createElementVNode("checkbox", {
                        checked: $data.selectedIds.includes(notice.id),
                        color: "#2D81FF",
                        style: { "transform": "scale(0.8)" }
                      }, null, 8, ["checked"])
                    ], 8, ["onClick"]),
                    vue.createElementVNode("view", { class: "table-col col-title" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "primary-text" },
                        vue.toDisplayString(notice.title || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-content" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "desc-text" },
                        vue.toDisplayString(notice.content || "暂无内容"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-top" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["badge-pill", notice.topFlag ? "badge-top" : "badge-plain"])
                        },
                        vue.toDisplayString(notice.topFlag ? "置顶" : "普通"),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-status" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["status-pill", $options.getStatusClass(notice.publishStatus)])
                        },
                        vue.toDisplayString($options.getStatusText(notice.publishStatus)),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-time" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString(notice.publishTime || "未发布"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-read" }, [
                      vue.createElementVNode("button", {
                        class: "row-btn ghost",
                        onClick: ($event) => $options.handleReadStat(notice.id)
                      }, "查看数据", 8, ["onClick"])
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                      vue.createElementVNode("button", {
                        class: "row-btn ghost",
                        onClick: ($event) => $options.handleEditNotice(notice.id)
                      }, "编辑", 8, ["onClick"]),
                      notice.publishStatus !== "PUBLISHED" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 0,
                        class: "row-btn primary",
                        onClick: ($event) => $options.handlePublish(notice.id)
                      }, "发布", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                      notice.publishStatus === "PUBLISHED" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 1,
                        class: "row-btn secondary-warn",
                        onClick: ($event) => $options.handleOffline(notice.id)
                      }, "下架", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                      vue.createElementVNode("button", {
                        class: "row-btn danger",
                        onClick: ($event) => $options.handleDeleteNotice(notice.id)
                      }, "删除", 8, ["onClick"])
                    ])
                  ],
                  4
                  /* STYLE */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.noticeList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无公告数据")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPage) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[14] || (_cache[14] = (...args) => $options.prevPage && $options.prevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPage,
                onClick: _cache[15] || (_cache[15] = (...args) => $options.nextPage && $options.nextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[16] || (_cache[16] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminNoticeManage = /* @__PURE__ */ _export_sfc(_sfc_main$m, [["render", _sfc_render$l], ["__scopeId", "data-v-e729d483"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/notice-manage.vue"]]);
  const _sfc_main$l = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        loading: false,
        currentTab: "order",
        pageSizeOptions: [10, 20, 50],
        parkingList: [],
        currentPage: 1,
        pageSize: 10,
        total: 0,
        orderStats: {
          total: 0,
          unpaid: 0,
          paid: 0,
          cancelled: 0
        },
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
    computed: {
      currentTabLabel() {
        return this.currentTab === "space" ? "车位管理" : "停车订单";
      },
      currentOrderStatusLabel() {
        const option = this.statusOptions.find((item) => item.value === this.queryParams.status);
        return option ? option.label : "全部状态";
      },
      currentSpaceStatusLabel() {
        const option = this.spaceStatusOptions.find((item) => item.value === this.spaceQueryParams.status);
        return option ? option.label : "全部状态";
      },
      orderStatusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.queryParams.status));
      },
      spaceStatusPickerIndex() {
        return Math.max(0, this.spaceStatusOptions.findIndex((item) => item.value === this.spaceQueryParams.status));
      },
      orderPageSizeIndex() {
        return Math.max(0, this.pageSizeOptions.indexOf(this.pageSize));
      },
      spacePageSizeIndex() {
        return Math.max(0, this.pageSizeOptions.indexOf(this.spacePageSize));
      },
      orderTotalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      spaceTotalPages() {
        return Math.max(1, Math.ceil(this.spaceTotal / this.spacePageSize));
      }
    },
    onLoad() {
      if (!this.checkAdminRole())
        return;
      this.refreshCurrentTab();
    },
    onShow() {
      if (!this.checkAdminRole())
        return;
      this.refreshCurrentTab();
    },
    methods: {
      checkAdminRole() {
        const userInfo = uni.getStorageSync("userInfo");
        if (!userInfo || userInfo.role !== "admin" && userInfo.role !== "super_admin") {
          uni.showToast({ title: "无权限访问", icon: "none" });
          uni.redirectTo({ url: "/owner/pages/login/login" });
          return false;
        }
        return true;
      },
      refreshCurrentTab() {
        if (this.currentTab === "space") {
          this.loadSpaceStats();
          this.loadSpaceList();
        } else {
          this.loadOrderStats();
          this.loadParkingList();
        }
      },
      switchTab(tab) {
        if (this.currentTab === tab)
          return;
        this.currentTab = tab;
        this.refreshCurrentTab();
      },
      goCarAudit() {
        uni.navigateTo({
          url: "/admin/pages/admin/car-audit"
        });
      },
      async fetchOrderTotal(status) {
        const params = {
          pageNum: 1,
          pageSize: 1
        };
        if (this.queryParams.plateNo)
          params.plateNo = this.queryParams.plateNo;
        if (status)
          params.status = status;
        const res = await request("/api/parking/order/admin/list", { params }, "GET");
        return typeof (res == null ? void 0 : res.total) === "number" ? res.total : 0;
      },
      async loadOrderStats() {
        try {
          const [total, unpaid, paid, cancelled] = await Promise.all([
            this.fetchOrderTotal(""),
            this.fetchOrderTotal("UNPAID"),
            this.fetchOrderTotal("PAID"),
            this.fetchOrderTotal("CANCELLED")
          ]);
          this.orderStats = { total, unpaid, paid, cancelled };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:574", "加载订单统计失败:", error);
        }
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadOrderStats();
        this.loadParkingList();
      },
      resetOrderQuery() {
        this.queryParams = {
          plateNo: "",
          status: ""
        };
        this.currentPage = 1;
        this.pageSize = 10;
        this.loadOrderStats();
        this.loadParkingList();
      },
      handleStatusChange(e) {
        const index = Number(e.detail.value);
        const option = this.statusOptions[index];
        this.queryParams.status = option ? option.value : "";
      },
      applyQuickOrderStatus(status) {
        this.queryParams.status = status;
        this.currentPage = 1;
        this.loadOrderStats();
        this.loadParkingList();
      },
      handleOrderPageSizeChange(e) {
        const index = Number(e.detail.value);
        const pageSize = this.pageSizeOptions[index];
        if (pageSize) {
          this.pageSize = pageSize;
          this.currentPage = 1;
          this.loadParkingList();
        }
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
          const res = await request("/api/parking/order/admin/list", { params }, "GET");
          const records = Array.isArray(res && res.records) ? res.records : [];
          const statusFilter = (this.queryParams.status || "").toString().toUpperCase();
          const filteredRecords = statusFilter ? records.filter((item) => {
            const val = (item.status || "").toString().toUpperCase();
            if (statusFilter === "CANCELLED")
              return val === "CANCELLED" || val === "CANCEL";
            return val === statusFilter;
          }) : records;
          const backendTotal = typeof (res == null ? void 0 : res.total) === "number" ? res.total : 0;
          const backendPageNum = Number((res == null ? void 0 : res.pageNum) ? res.pageNum : this.currentPage);
          const backendPageSize = Number((res == null ? void 0 : res.pageSize) ? res.pageSize : this.pageSize);
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
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:660", "加载停车列表失败:", error);
          uni.showToast({
            title: (error == null ? void 0 : error.message) || "加载失败",
            icon: "none"
          });
        } finally {
          this.loading = false;
        }
      },
      async handleRenew(orderId) {
        try {
          const userInfo = uni.getStorageSync("userInfo");
          const userId = userInfo && (userInfo.id || userInfo.userId);
          if (!userId) {
            uni.showToast({ title: "请先登录", icon: "none" });
            return;
          }
          uni.showLoading({ title: "处理中..." });
          await request(`/api/parking/order/${orderId}/pay`, {
            data: {
              userId,
              payChannel: "WECHAT",
              payRemark: "管理员端支付"
            }
          }, "PUT");
          uni.showToast({ title: "支付成功", icon: "success" });
          this.loadOrderStats();
          this.loadParkingList();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:689", "支付失败:", error);
          uni.showToast({
            title: (error == null ? void 0 : error.message) || "支付失败",
            icon: "none"
          });
        } finally {
          uni.hideLoading();
        }
      },
      getOrderStatusClass(status) {
        const val = (status || "").toString().toUpperCase();
        if (val === "PAID" || val === "SUCCESS" || val === "ACTIVE")
          return "order-paid";
        if (val === "UNPAID" || val === "WAITING_PAY")
          return "order-unpaid";
        if (val === "CANCELLED" || val === "CANCEL")
          return "order-cancelled";
        return "order-expired";
      },
      getOrderStatusText(status) {
        const val = (status || "").toString().toUpperCase();
        const statusMap = {
          UNPAID: "待支付",
          WAITING_PAY: "待支付",
          PAID: "已支付",
          SUCCESS: "已支付",
          ACTIVE: "正常",
          EXPIRED: "已过期",
          CANCELLED: "已取消",
          CANCEL: "已取消"
        };
        return statusMap[val] || status || "";
      },
      getOrderTypeText(type) {
        return String(type).toUpperCase() === "TEMP" ? "临时停车" : "固定车位";
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
        if (val === "BALANCE")
          return "余额";
        return channel || "-";
      },
      async fetchSpaceTotal(status) {
        const params = {
          pageNum: 1,
          pageSize: 1
        };
        if (this.spaceQueryParams.spaceNo)
          params.spaceNo = this.spaceQueryParams.spaceNo;
        if (status)
          params.status = status;
        const res = await request("/api/parking/space/admin/list", { params }, "GET");
        return typeof (res == null ? void 0 : res.total) === "number" ? res.total : 0;
      },
      async loadSpaceStats() {
        try {
          const [total, available, occupied, reserved, disabled] = await Promise.all([
            this.fetchSpaceTotal(""),
            this.fetchSpaceTotal("AVAILABLE"),
            this.fetchSpaceTotal("OCCUPIED"),
            this.fetchSpaceTotal("RESERVED"),
            this.fetchSpaceTotal("DISABLED")
          ]);
          this.spaceStats = { total, available, occupied, reserved, disabled };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:755", "加载车位统计失败:", error);
        }
      },
      handleSpaceSearch() {
        this.spacePageNum = 1;
        this.loadSpaceStats();
        this.loadSpaceList();
      },
      resetSpaceQuery() {
        this.spaceQueryParams = {
          spaceNo: "",
          status: ""
        };
        this.spacePageNum = 1;
        this.spacePageSize = 10;
        this.loadSpaceStats();
        this.loadSpaceList();
      },
      handleSpaceStatusChange(e) {
        const index = Number(e.detail.value);
        const option = this.spaceStatusOptions[index];
        this.spaceQueryParams.status = option ? option.value : "";
      },
      applyQuickSpaceStatus(status) {
        this.spaceQueryParams.status = status;
        this.spacePageNum = 1;
        this.loadSpaceStats();
        this.loadSpaceList();
      },
      handleSpacePageSizeChange(e) {
        const index = Number(e.detail.value);
        const pageSize = this.pageSizeOptions[index];
        if (pageSize) {
          this.spacePageSize = pageSize;
          this.spacePageNum = 1;
          this.loadSpaceList();
        }
      },
      getLeaseTypeLabel(value) {
        const option = this.leaseTypeOptions.find((item) => item.value === value);
        return option ? option.label : "请选择类型";
      },
      getPayChannelLabel(value) {
        const option = this.payChannelOptions.find((item) => item.value === value);
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
        const diff = expire - Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1e3;
        return diff > 0 && diff <= sevenDays;
      },
      getSpaceStatusText(status) {
        const val = (status || "").toString().toUpperCase();
        const statusMap = {
          AVAILABLE: "空闲可用",
          FREE: "空闲可用",
          OCCUPIED: "已占用",
          RESERVED: "已预订",
          DISABLED: "已禁用"
        };
        return statusMap[val] || status || "";
      },
      getSpaceStatusClass(status) {
        const val = (status || "").toString().toUpperCase();
        if (val === "AVAILABLE" || val === "FREE")
          return "space-available";
        if (val === "OCCUPIED")
          return "space-occupied";
        if (val === "RESERVED")
          return "space-reserved";
        if (val === "DISABLED")
          return "space-disabled";
        return "space-disabled";
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
          const res = await request("/api/parking/space/admin/list", { params }, "GET");
          const records = Array.isArray(res && res.records) ? res.records : [];
          const spaceStatusFilter = (this.spaceQueryParams.status || "").toString().toUpperCase();
          const filteredRecords = spaceStatusFilter ? records.filter((item) => {
            const val = (item.status || "").toString().toUpperCase();
            if (spaceStatusFilter === "AVAILABLE") {
              return val === "AVAILABLE" || val === "FREE";
            }
            return val === spaceStatusFilter;
          }) : records;
          const backendTotal = typeof (res == null ? void 0 : res.total) === "number" ? res.total : 0;
          const backendPageNum = Number((res == null ? void 0 : res.pageNum) ? res.pageNum : this.spacePageNum);
          const backendPageSize = Number((res == null ? void 0 : res.pageSize) ? res.pageSize : this.spacePageSize);
          const shouldSlice = filteredRecords.length > backendPageSize && (backendTotal === 0 || backendTotal === filteredRecords.length);
          const effectivePageNum = shouldSlice ? this.spacePageNum : backendPageNum;
          const effectivePageSize = shouldSlice ? this.spacePageSize : backendPageSize;
          this.spaceTotal = backendTotal > 0 ? backendTotal : filteredRecords.length;
          if (!shouldSlice) {
            this.spacePageNum = backendPageNum;
            this.spacePageSize = backendPageSize;
          }
          const uniqueRecords = [];
          const seenKeys = /* @__PURE__ */ new Set();
          filteredRecords.forEach((item) => {
            const key = item.id || item.spaceNo;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueRecords.push(item);
            }
          });
          this.spaceList = shouldSlice ? uniqueRecords.slice((effectivePageNum - 1) * effectivePageSize, effectivePageNum * effectivePageSize) : uniqueRecords;
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:877", "加载车位列表失败:", error);
          uni.showToast({ title: "加载失败", icon: "none" });
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
              this.loadSpaceStats();
              this.loadSpaceList();
            } catch (error) {
              formatAppLog("error", "at admin/pages/admin/parking-manage.vue:909", "预订失败:", error);
              uni.showToast({ title: (error == null ? void 0 : error.message) || "预订失败", icon: "none" });
            } finally {
              uni.hideLoading();
            }
          }
        });
      },
      handleOpenLease(space) {
        this.leaseDialogSpace = space;
        this.leaseForm = {
          userId: space.userId || space.ownerId || "",
          plateNo: space.plateNo || "",
          leaseType: "MONTHLY",
          durationMonths: 1,
          payChannel: "CASH",
          remark: ""
        };
        this.showLeaseDialog = true;
      },
      closeLeaseDialog() {
        this.showLeaseDialog = false;
        this.leaseDialogSpace = null;
      },
      handleLeaseTypeChange(e) {
        const index = Number(e.detail.value);
        const option = this.leaseTypeOptions[index];
        if (option)
          this.leaseForm.leaseType = option.value;
      },
      handlePayChannelChange(e) {
        const index = Number(e.detail.value);
        const option = this.payChannelOptions[index];
        if (option)
          this.leaseForm.payChannel = option.value;
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
        if (!duration || duration <= 0)
          duration = 1;
        try {
          uni.showLoading({ title: "创建订单中..." });
          const orderId = await request("/api/parking/lease/order/create", {
            data: {
              userId,
              spaceId: this.leaseDialogSpace.id,
              plateNo,
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
          this.closeLeaseDialog();
          this.loadSpaceStats();
          this.loadSpaceList();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/parking-manage.vue:984", "办理失败:", error);
          uni.showToast({ title: (error == null ? void 0 : error.message) || "办理失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      changePage(delta) {
        const next = this.currentPage + delta;
        if (next < 1 || next > this.orderTotalPages)
          return;
        this.currentPage = next;
        this.loadParkingList();
      },
      changeSpacePage(delta) {
        const next = this.spacePageNum + delta;
        if (next < 1 || next > this.spaceTotalPages)
          return;
        this.spacePageNum = next;
        this.loadSpaceList();
      },
      formatTime(time) {
        if (!time)
          return "";
        const date = new Date(time);
        if (Number.isNaN(date.getTime()))
          return time;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}`;
      }
    }
  };
  function _sfc_render$k(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[39] || (_cache[39] = ($event) => $data.showSidebar = $event),
      pageTitle: "停车管理",
      currentPage: "/admin/pages/admin/parking-manage",
      pageBreadcrumb: "管理后台 / 停车管理",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "停车业务中心"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一管理停车订单和车位资源，并保留车辆审核、订单支付、车位预订和月卡办理流程。")
            ]),
            vue.createElementVNode("view", { class: "overview-actions" }, [
              vue.createElementVNode("view", { class: "overview-chip" }, [
                vue.createElementVNode("text", { class: "overview-chip-label" }, "当前模块"),
                vue.createElementVNode(
                  "text",
                  { class: "overview-chip-value" },
                  vue.toDisplayString($options.currentTabLabel),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("button", {
                class: "primary-action-btn",
                onClick: _cache[0] || (_cache[0] = (...args) => $options.goCarAudit && $options.goCarAudit(...args))
              }, "车辆审核")
            ])
          ]),
          vue.createElementVNode("view", { class: "tab-switch-bar" }, [
            vue.createElementVNode(
              "button",
              {
                class: vue.normalizeClass(["tab-switch-btn", { active: $data.currentTab === "order" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.switchTab("order"))
              },
              " 停车订单 ",
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "button",
              {
                class: vue.normalizeClass(["tab-switch-btn", { active: $data.currentTab === "space" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.switchTab("space"))
              },
              " 车位管理 ",
              2
              /* CLASS */
            )
          ]),
          $data.currentTab === "order" ? (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 0 },
            [
              vue.createElementVNode("view", { class: "status-summary-bar parking-order-bar" }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card", { active: $data.queryParams.status === "" }]),
                    onClick: _cache[3] || (_cache[3] = ($event) => $options.applyQuickOrderStatus(""))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "全部订单"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.orderStats.total),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card unpaid", { active: $data.queryParams.status === "UNPAID" }]),
                    onClick: _cache[4] || (_cache[4] = ($event) => $options.applyQuickOrderStatus("UNPAID"))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "待支付"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.orderStats.unpaid),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card paid", { active: $data.queryParams.status === "PAID" }]),
                    onClick: _cache[5] || (_cache[5] = ($event) => $options.applyQuickOrderStatus("PAID"))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "已支付"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.orderStats.paid),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card cancelled", { active: $data.queryParams.status === "CANCELLED" }]),
                    onClick: _cache[6] || (_cache[6] = ($event) => $options.applyQuickOrderStatus("CANCELLED"))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "已取消"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.orderStats.cancelled),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                )
              ]),
              vue.createElementVNode("view", { class: "query-panel" }, [
                vue.createElementVNode("view", { class: "query-grid parking-query-grid" }, [
                  vue.createElementVNode("view", { class: "query-field" }, [
                    vue.createElementVNode("text", { class: "query-label" }, "车牌号"),
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $data.queryParams.plateNo = $event),
                        class: "query-input",
                        type: "text",
                        placeholder: "请输入车牌号",
                        onConfirm: _cache[8] || (_cache[8] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                      },
                      null,
                      544
                      /* NEED_HYDRATION, NEED_PATCH */
                    ), [
                      [vue.vModelText, $data.queryParams.plateNo]
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "query-field" }, [
                    vue.createElementVNode("text", { class: "query-label" }, "订单状态"),
                    vue.createElementVNode("picker", {
                      mode: "selector",
                      range: $data.statusOptions,
                      "range-key": "label",
                      value: $options.orderStatusPickerIndex,
                      onChange: _cache[9] || (_cache[9] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "query-picker" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "query-picker-text" },
                          vue.toDisplayString($options.currentOrderStatusLabel),
                          1
                          /* TEXT */
                        )
                      ])
                    ], 40, ["range", "value"])
                  ])
                ]),
                vue.createElementVNode("view", { class: "query-actions" }, [
                  vue.createElementVNode("button", {
                    class: "query-btn primary",
                    onClick: _cache[10] || (_cache[10] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  }, "查询"),
                  vue.createElementVNode("button", {
                    class: "query-btn secondary",
                    onClick: _cache[11] || (_cache[11] = (...args) => $options.resetOrderQuery && $options.resetOrderQuery(...args))
                  }, "重置")
                ])
              ]),
              vue.createElementVNode("view", { class: "table-toolbar" }, [
                vue.createElementVNode("view", { class: "toolbar-left-group" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "toolbar-meta" },
                    "共 " + vue.toDisplayString($data.total) + " 条订单",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "toolbar-meta active" },
                    "当前状态：" + vue.toDisplayString($options.currentOrderStatusLabel),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "toolbar-right-group" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "toolbar-meta" },
                    "当前页 " + vue.toDisplayString($data.parkingList.length) + " 条",
                    1
                    /* TEXT */
                  )
                ])
              ]),
              $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "loading-state"
              }, [
                vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
              ])) : (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "table-panel"
              }, [
                vue.createElementVNode("view", { class: "scroll-table" }, [
                  vue.createElementVNode("view", { class: "table-head parking-order-table" }, [
                    vue.createElementVNode("text", { class: "table-col col-order" }, "订单号"),
                    vue.createElementVNode("text", { class: "table-col col-plate" }, "车牌号"),
                    vue.createElementVNode("text", { class: "table-col col-space" }, "车位 / 业主"),
                    vue.createElementVNode("text", { class: "table-col col-type" }, "类型 / 金额"),
                    vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
                    vue.createElementVNode("text", { class: "table-col col-time" }, "停车时段"),
                    vue.createElementVNode("text", { class: "table-col col-pay" }, "支付信息"),
                    vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
                  ]),
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList($data.parkingList, (parking, index) => {
                      return vue.openBlock(), vue.createElementBlock(
                        "view",
                        {
                          key: parking.orderId || index,
                          class: "table-row parking-order-table",
                          style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                        },
                        [
                          vue.createElementVNode("view", { class: "table-col col-order" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "primary-text" },
                              vue.toDisplayString(parking.orderNo || "-"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-plate" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "plain-text" },
                              vue.toDisplayString(parking.plateNo || "-"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-space" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "primary-text" },
                              vue.toDisplayString(parking.spaceNo || "-"),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "text",
                              { class: "minor-text" },
                              vue.toDisplayString(parking.ownerName || "暂无业主"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-type" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "plain-text" },
                              vue.toDisplayString($options.getOrderTypeText(parking.orderType)),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "text",
                              { class: "minor-text" },
                              vue.toDisplayString(parking.amount != null ? `${parking.amount} 元` : "-"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-status" }, [
                            vue.createElementVNode(
                              "text",
                              {
                                class: vue.normalizeClass(["status-pill", $options.getOrderStatusClass(parking.status)])
                              },
                              vue.toDisplayString($options.getOrderStatusText(parking.status)),
                              3
                              /* TEXT, CLASS */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-time" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "desc-text" },
                              vue.toDisplayString($options.formatTime(parking.startTime)) + " ~ " + vue.toDisplayString($options.formatTime(parking.endTime)),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-pay" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "plain-text" },
                              vue.toDisplayString($options.formatPayChannel(parking.payChannel)),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "text",
                              { class: "minor-text" },
                              vue.toDisplayString(parking.payTime ? $options.formatTime(parking.payTime) : "未支付"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                            $options.isUnpaid(parking.status) ? (vue.openBlock(), vue.createElementBlock("button", {
                              key: 0,
                              class: "row-btn primary",
                              onClick: ($event) => $options.handleRenew(parking.orderId)
                            }, "去支付", 8, ["onClick"])) : (vue.openBlock(), vue.createElementBlock("text", {
                              key: 1,
                              class: "minor-text"
                            }, "无需处理"))
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
                $data.parkingList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "empty-state"
                }, [
                  vue.createElementVNode("text", null, "暂无停车订单")
                ])) : vue.createCommentVNode("v-if", true)
              ])),
              $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 2,
                class: "pagination"
              }, [
                vue.createElementVNode("view", { class: "page-meta" }, [
                  vue.createElementVNode(
                    "text",
                    null,
                    "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.orderTotalPages) + " 页",
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "page-controls" }, [
                  vue.createElementVNode("button", {
                    class: "page-btn",
                    disabled: $data.currentPage <= 1,
                    onClick: _cache[12] || (_cache[12] = ($event) => $options.changePage(-1))
                  }, "上一页", 8, ["disabled"]),
                  vue.createElementVNode("button", {
                    class: "page-btn",
                    disabled: $data.currentPage >= $options.orderTotalPages,
                    onClick: _cache[13] || (_cache[13] = ($event) => $options.changePage(1))
                  }, "下一页", 8, ["disabled"]),
                  vue.createElementVNode("view", { class: "page-size" }, [
                    vue.createElementVNode("text", null, "每页"),
                    vue.createElementVNode("picker", {
                      mode: "selector",
                      range: $data.pageSizeOptions,
                      value: $options.orderPageSizeIndex,
                      onChange: _cache[14] || (_cache[14] = (...args) => $options.handleOrderPageSizeChange && $options.handleOrderPageSizeChange(...args))
                    }, [
                      vue.createElementVNode(
                        "text",
                        { class: "page-size-text" },
                        vue.toDisplayString($data.pageSize) + " 条",
                        1
                        /* TEXT */
                      )
                    ], 40, ["range", "value"])
                  ])
                ])
              ])) : vue.createCommentVNode("v-if", true)
            ],
            64
            /* STABLE_FRAGMENT */
          )) : (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 1 },
            [
              vue.createElementVNode("view", { class: "status-summary-bar parking-space-bar" }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card", { active: $data.spaceQueryParams.status === "" }]),
                    onClick: _cache[15] || (_cache[15] = ($event) => $options.applyQuickSpaceStatus(""))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "全部车位"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.spaceStats.total),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card available", { active: $data.spaceQueryParams.status === "AVAILABLE" }]),
                    onClick: _cache[16] || (_cache[16] = ($event) => $options.applyQuickSpaceStatus("AVAILABLE"))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "空闲可用"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.spaceStats.available),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card occupied", { active: $data.spaceQueryParams.status === "OCCUPIED" }]),
                    onClick: _cache[17] || (_cache[17] = ($event) => $options.applyQuickSpaceStatus("OCCUPIED"))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "已占用"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.spaceStats.occupied),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card reserved", { active: $data.spaceQueryParams.status === "RESERVED" }]),
                    onClick: _cache[18] || (_cache[18] = ($event) => $options.applyQuickSpaceStatus("RESERVED"))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "已预订"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.spaceStats.reserved),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["status-summary-card disabled", { active: $data.spaceQueryParams.status === "DISABLED" }]),
                    onClick: _cache[19] || (_cache[19] = ($event) => $options.applyQuickSpaceStatus("DISABLED"))
                  },
                  [
                    vue.createElementVNode("text", { class: "summary-label" }, "已禁用"),
                    vue.createElementVNode(
                      "text",
                      { class: "summary-value" },
                      vue.toDisplayString($data.spaceStats.disabled),
                      1
                      /* TEXT */
                    )
                  ],
                  2
                  /* CLASS */
                )
              ]),
              vue.createElementVNode("view", { class: "query-panel" }, [
                vue.createElementVNode("view", { class: "query-grid parking-query-grid" }, [
                  vue.createElementVNode("view", { class: "query-field" }, [
                    vue.createElementVNode("text", { class: "query-label" }, "车位号"),
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => $data.spaceQueryParams.spaceNo = $event),
                        class: "query-input",
                        type: "text",
                        placeholder: "请输入车位号",
                        onConfirm: _cache[21] || (_cache[21] = (...args) => $options.handleSpaceSearch && $options.handleSpaceSearch(...args))
                      },
                      null,
                      544
                      /* NEED_HYDRATION, NEED_PATCH */
                    ), [
                      [vue.vModelText, $data.spaceQueryParams.spaceNo]
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "query-field" }, [
                    vue.createElementVNode("text", { class: "query-label" }, "车位状态"),
                    vue.createElementVNode("picker", {
                      mode: "selector",
                      range: $data.spaceStatusOptions,
                      "range-key": "label",
                      value: $options.spaceStatusPickerIndex,
                      onChange: _cache[22] || (_cache[22] = (...args) => $options.handleSpaceStatusChange && $options.handleSpaceStatusChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "query-picker" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "query-picker-text" },
                          vue.toDisplayString($options.currentSpaceStatusLabel),
                          1
                          /* TEXT */
                        )
                      ])
                    ], 40, ["range", "value"])
                  ])
                ]),
                vue.createElementVNode("view", { class: "query-actions" }, [
                  vue.createElementVNode("button", {
                    class: "query-btn primary",
                    onClick: _cache[23] || (_cache[23] = (...args) => $options.handleSpaceSearch && $options.handleSpaceSearch(...args))
                  }, "查询"),
                  vue.createElementVNode("button", {
                    class: "query-btn secondary",
                    onClick: _cache[24] || (_cache[24] = (...args) => $options.resetSpaceQuery && $options.resetSpaceQuery(...args))
                  }, "重置")
                ])
              ]),
              vue.createElementVNode("view", { class: "table-toolbar" }, [
                vue.createElementVNode("view", { class: "toolbar-left-group" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "toolbar-meta" },
                    "共 " + vue.toDisplayString($data.spaceTotal) + " 个车位",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "toolbar-meta active" },
                    "当前状态：" + vue.toDisplayString($options.currentSpaceStatusLabel),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "toolbar-right-group" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "toolbar-meta" },
                    "当前页 " + vue.toDisplayString($data.spaceList.length) + " 条",
                    1
                    /* TEXT */
                  )
                ])
              ]),
              $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "loading-state"
              }, [
                vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
              ])) : (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "table-panel"
              }, [
                vue.createElementVNode("view", { class: "scroll-table" }, [
                  vue.createElementVNode("view", { class: "table-head parking-space-table" }, [
                    vue.createElementVNode("text", { class: "table-col col-space-no" }, "车位号"),
                    vue.createElementVNode("text", { class: "table-col col-space-status" }, "状态"),
                    vue.createElementVNode("text", { class: "table-col col-owner" }, "业主"),
                    vue.createElementVNode("text", { class: "table-col col-plate" }, "车牌号"),
                    vue.createElementVNode("text", { class: "table-col col-expire" }, "到期时间"),
                    vue.createElementVNode("text", { class: "table-col col-remind" }, "续期提醒"),
                    vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
                  ]),
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList($data.spaceList, (space, index) => {
                      return vue.openBlock(), vue.createElementBlock(
                        "view",
                        {
                          key: space.id ? `${space.id}-${index}` : `${space.spaceNo}-${index}`,
                          class: "table-row parking-space-table",
                          style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                        },
                        [
                          vue.createElementVNode("view", { class: "table-col col-space-no" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "primary-text" },
                              vue.toDisplayString(space.spaceNo || "-"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-space-status" }, [
                            vue.createElementVNode(
                              "text",
                              {
                                class: vue.normalizeClass(["status-pill", $options.getSpaceStatusClass(space.status)])
                              },
                              vue.toDisplayString($options.getSpaceStatusText(space.status)),
                              3
                              /* TEXT, CLASS */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-owner" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "plain-text" },
                              vue.toDisplayString(space.ownerName || "暂无业主"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-plate" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "plain-text" },
                              vue.toDisplayString(space.plateNo || "-"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-expire" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "minor-text" },
                              vue.toDisplayString($options.formatTime(space.expireTime) || "未设置"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-remind" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "minor-text" },
                              vue.toDisplayString($options.isSpaceNearExpire(space.expireTime) ? "即将到期" : "正常"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                            vue.createElementVNode("button", {
                              class: "row-btn primary",
                              onClick: ($event) => $options.handleOpenLease(space)
                            }, "办理月卡", 8, ["onClick"]),
                            $options.isSpaceReservable(space) ? (vue.openBlock(), vue.createElementBlock("button", {
                              key: 0,
                              class: "row-btn secondary-warn",
                              onClick: ($event) => $options.handleReserve(space)
                            }, "预订车位", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
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
                $data.spaceList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "empty-state"
                }, [
                  vue.createElementVNode("text", null, "暂无车位信息")
                ])) : vue.createCommentVNode("v-if", true)
              ])),
              $data.spaceTotal > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 2,
                class: "pagination"
              }, [
                vue.createElementVNode("view", { class: "page-meta" }, [
                  vue.createElementVNode(
                    "text",
                    null,
                    "第 " + vue.toDisplayString($data.spacePageNum) + " / " + vue.toDisplayString($options.spaceTotalPages) + " 页",
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "page-controls" }, [
                  vue.createElementVNode("button", {
                    class: "page-btn",
                    disabled: $data.spacePageNum <= 1,
                    onClick: _cache[25] || (_cache[25] = ($event) => $options.changeSpacePage(-1))
                  }, "上一页", 8, ["disabled"]),
                  vue.createElementVNode("button", {
                    class: "page-btn",
                    disabled: $data.spacePageNum >= $options.spaceTotalPages,
                    onClick: _cache[26] || (_cache[26] = ($event) => $options.changeSpacePage(1))
                  }, "下一页", 8, ["disabled"]),
                  vue.createElementVNode("view", { class: "page-size" }, [
                    vue.createElementVNode("text", null, "每页"),
                    vue.createElementVNode("picker", {
                      mode: "selector",
                      range: $data.pageSizeOptions,
                      value: $options.spacePageSizeIndex,
                      onChange: _cache[27] || (_cache[27] = (...args) => $options.handleSpacePageSizeChange && $options.handleSpacePageSizeChange(...args))
                    }, [
                      vue.createElementVNode(
                        "text",
                        { class: "page-size-text" },
                        vue.toDisplayString($data.spacePageSize) + " 条",
                        1
                        /* TEXT */
                      )
                    ], 40, ["range", "value"])
                  ])
                ])
              ])) : vue.createCommentVNode("v-if", true)
            ],
            64
            /* STABLE_FRAGMENT */
          )),
          $data.showLeaseDialog ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "detail-modal",
            onClick: _cache[38] || (_cache[38] = (...args) => $options.closeLeaseDialog && $options.closeLeaseDialog(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content lease-detail-content",
              onClick: _cache[37] || (_cache[37] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "办理月卡 / 年卡"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[28] || (_cache[28] = (...args) => $options.closeLeaseDialog && $options.closeLeaseDialog(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "lease-grid" }, [
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "车位号:"),
                    vue.createElementVNode(
                      "text",
                      { class: "detail-value lease-static-value" },
                      vue.toDisplayString($data.leaseDialogSpace && $data.leaseDialogSpace.spaceNo),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "用户ID:"),
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        class: "form-input-inline",
                        "onUpdate:modelValue": _cache[29] || (_cache[29] = ($event) => $data.leaseForm.userId = $event),
                        type: "number",
                        placeholder: "请输入用户ID"
                      },
                      null,
                      512
                      /* NEED_PATCH */
                    ), [
                      [vue.vModelText, $data.leaseForm.userId]
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "车牌号:"),
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        class: "form-input-inline",
                        "onUpdate:modelValue": _cache[30] || (_cache[30] = ($event) => $data.leaseForm.plateNo = $event),
                        placeholder: "请输入车牌号"
                      },
                      null,
                      512
                      /* NEED_PATCH */
                    ), [
                      [vue.vModelText, $data.leaseForm.plateNo]
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "时长(月):"),
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        class: "form-input-inline",
                        "onUpdate:modelValue": _cache[31] || (_cache[31] = ($event) => $data.leaseForm.durationMonths = $event),
                        type: "number",
                        placeholder: "默认 1 个月"
                      },
                      null,
                      512
                      /* NEED_PATCH */
                    ), [
                      [vue.vModelText, $data.leaseForm.durationMonths]
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "卡类型:"),
                    vue.createElementVNode("picker", {
                      mode: "selector",
                      range: $data.leaseTypeOptions,
                      "range-key": "label",
                      onChange: _cache[32] || (_cache[32] = (...args) => $options.handleLeaseTypeChange && $options.handleLeaseTypeChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "modal-picker" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "modal-picker-text" },
                          vue.toDisplayString($options.getLeaseTypeLabel($data.leaseForm.leaseType)),
                          1
                          /* TEXT */
                        )
                      ])
                    ], 40, ["range"])
                  ]),
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "支付方式:"),
                    vue.createElementVNode("picker", {
                      mode: "selector",
                      range: $data.payChannelOptions,
                      "range-key": "label",
                      onChange: _cache[33] || (_cache[33] = (...args) => $options.handlePayChannelChange && $options.handlePayChannelChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "modal-picker" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "modal-picker-text" },
                          vue.toDisplayString($options.getPayChannelLabel($data.leaseForm.payChannel)),
                          1
                          /* TEXT */
                        )
                      ])
                    ], 40, ["range"])
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "备注:"),
                  vue.withDirectives(vue.createElementVNode(
                    "textarea",
                    {
                      class: "modal-textarea",
                      "onUpdate:modelValue": _cache[34] || (_cache[34] = ($event) => $data.leaseForm.remark = $event),
                      maxlength: "300",
                      placeholder: "可填写办理说明"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.leaseForm.remark]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[35] || (_cache[35] = (...args) => $options.closeLeaseDialog && $options.closeLeaseDialog(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    onClick: _cache[36] || (_cache[36] = (...args) => $options.confirmLease && $options.confirmLease(...args))
                  }, "确认办理")
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminParkingManage = /* @__PURE__ */ _export_sfc(_sfc_main$l, [["render", _sfc_render$k], ["__scopeId", "data-v-668f6823"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/parking-manage.vue"]]);
  const _sfc_main$k = {
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
      this.isSuperAdmin = !!(userInfo && userInfo.role === "super_admin");
      if (this.isSuperAdmin) {
        this.loadCommunityList();
      }
    },
    methods: {
      async loadCommunityList() {
        try {
          const data = await request("/api/house/community/all", {}, "GET");
          const list = Array.isArray(data) ? data : data && Array.isArray(data.records) ? data.records : [];
          this.communityList = list;
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/notice-edit.vue:158", "社区列表加载失败", error);
          this.communityList = [];
        }
      },
      handleCommunityChange(e) {
        const index = Number(e.detail.value);
        const item = this.communityList[index];
        if (item) {
          this.selectedCommunityId = item.id;
          this.selectedCommunityName = item.name;
        }
      },
      async loadNoticeDetail() {
        try {
          uni.showLoading({ title: "加载中..." });
          const res = await request(`/api/notice/${this.noticeId}`, {}, "GET");
          this.form.title = res.title || "";
          this.form.content = res.content || "";
          this.form.topFlag = !!res.topFlag;
          this.form.publishStatus = res.publishStatus || "DRAFT";
          if (res.expireTime) {
            const normalized = String(res.expireTime).replace(" ", "T");
            const [datePart, timePart = "23:59:00"] = normalized.split("T");
            this.form.expireDate = datePart;
            this.form.expireTimeVal = timePart.slice(0, 5);
          }
          if (res.communityId && res.communityName) {
            this.selectedCommunityId = res.communityId;
            this.selectedCommunityName = res.communityName;
          }
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/notice-edit.vue:189", "公告详情加载失败", error);
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
        if (!this.hasUnsavedChanges()) {
          uni.navigateBack();
          return;
        }
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
          uni.showToast({ title: "请输入标题", icon: "none" });
          return;
        }
        if (!this.form.content.trim()) {
          uni.showToast({ title: "请输入内容", icon: "none" });
          return;
        }
        if (this.isSuperAdmin && !this.selectedCommunityId) {
          uni.showToast({ title: "请选择发布社区", icon: "none" });
          return;
        }
        const userInfo = uni.getStorageSync("userInfo");
        uni.showLoading({ title: "提交中...", mask: true });
        try {
          const dto = {
            title: this.form.title,
            content: this.form.content,
            topFlag: this.form.topFlag,
            targetType: "COMMUNITY",
            communityId: this.isSuperAdmin ? Number(this.selectedCommunityId) : void 0,
            publishStatus: status,
            expireTime: this.form.expireDate ? `${this.form.expireDate}T${this.form.expireTimeVal}:00` : null
          };
          const userId = userInfo && (userInfo.id || userInfo.userId);
          let targetId = this.noticeId;
          if (this.isEdit) {
            try {
              await request(`/api/notice/${this.noticeId}`, {
                data: dto,
                params: { userId }
              }, "PUT");
            } catch (updateError) {
              formatAppLog("error", "at admin/pages/admin/notice-edit.vue:264", "更新公告失败", updateError);
            }
          } else {
            try {
              const res = await request("/api/notice", {
                data: dto,
                params: { userId }
              }, "POST");
              targetId = res && typeof res === "object" && (res.id || res.noticeId) ? res.id || res.noticeId : res;
            } catch (createError) {
              formatAppLog("error", "at admin/pages/admin/notice-edit.vue:274", "创建公告失败", createError);
            }
          }
          if (status === "PUBLISHED" && this.isEdit && targetId) {
            try {
              const expireDto = {
                noticeIds: [Number(targetId)],
                expireType: this.form.expireDate ? "CUSTOM" : "NEVER",
                customExpireTime: this.form.expireDate ? `${this.form.expireDate}T${this.form.expireTimeVal}:00` : null,
                days: null
              };
              await request("/api/notice/expire/batch", {
                data: expireDto,
                params: { userId }
              }, "POST");
            } catch (expireError) {
              formatAppLog("error", "at admin/pages/admin/notice-edit.vue:290", "设置过期时间失败", expireError);
              if (this.form.expireDate) {
                uni.showToast({
                  title: "公告已更新，但过期时间设置失败",
                  icon: "none",
                  duration: 2e3
                });
              }
            }
          }
          uni.showToast({ title: "操作成功", icon: "success" });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/notice-edit.vue:305", "提交失败", error);
          uni.showToast({ title: error.message || "操作失败", icon: "none" });
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
  function _sfc_render$j(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[9] || (_cache[9] = ($event) => $data.showSidebar = $event),
      pageTitle: $data.isEdit ? "编辑公告" : "发布公告",
      currentPage: "/admin/pages/admin/notice-manage",
      pageBreadcrumb: $data.isEdit ? "管理后台 / 公告管理 / 编辑公告" : "管理后台 / 公告管理 / 发布公告",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "edit-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode(
                "text",
                { class: "overview-title" },
                vue.toDisplayString($data.isEdit ? "公告编辑" : "公告发布"),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一使用后台表单页结构，保留草稿保存、正式发布、过期时间和超管社区投放能力。")
            ]),
            vue.createElementVNode("view", { class: "overview-chip" }, [
              vue.createElementVNode("text", { class: "overview-chip-label" }, "当前状态"),
              vue.createElementVNode(
                "text",
                { class: "overview-chip-value" },
                vue.toDisplayString($data.isEdit ? "编辑中" : "新建中"),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "form-card" }, [
            vue.createElementVNode("view", { class: "form-grid" }, [
              vue.createElementVNode("view", { class: "form-field form-field-wide" }, [
                vue.createElementVNode("text", { class: "form-label required" }, "公告标题"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.form.title = $event),
                    class: "form-input",
                    type: "text",
                    placeholder: "请输入公告标题"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.form.title]
                ])
              ]),
              vue.createElementVNode("view", { class: "form-field form-field-wide" }, [
                vue.createElementVNode("text", { class: "form-label required" }, "公告内容"),
                vue.withDirectives(vue.createElementVNode(
                  "textarea",
                  {
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.form.content = $event),
                    class: "form-textarea notice-textarea",
                    maxlength: "-1",
                    placeholder: "请输入公告详细内容"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.form.content]
                ])
              ]),
              vue.createElementVNode("view", { class: "form-field" }, [
                vue.createElementVNode("text", { class: "form-label" }, "过期日期"),
                vue.createElementVNode("picker", {
                  mode: "date",
                  start: $options.startDate,
                  onChange: _cache[2] || (_cache[2] = (...args) => $options.handleDateChange && $options.handleDateChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    {
                      class: vue.normalizeClass(["picker-box", { "has-val": !!$data.form.expireDate }])
                    },
                    [
                      vue.createElementVNode(
                        "text",
                        null,
                        vue.toDisplayString($data.form.expireDate || "请选择日期"),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("text", { class: "picker-icon" }, ">")
                    ],
                    2
                    /* CLASS */
                  )
                ], 40, ["start"]),
                vue.createElementVNode("text", { class: "field-tip" }, "设置过期后，业主端将不再显示此公告。")
              ]),
              vue.createElementVNode("view", { class: "form-field" }, [
                vue.createElementVNode("text", { class: "form-label" }, "过期时间"),
                vue.createElementVNode("picker", {
                  mode: "time",
                  disabled: !$data.form.expireDate,
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.handleTimeChange && $options.handleTimeChange(...args))
                }, [
                  vue.createElementVNode(
                    "view",
                    {
                      class: vue.normalizeClass(["picker-box", { "has-val": !!$data.form.expireDate }])
                    },
                    [
                      vue.createElementVNode(
                        "text",
                        null,
                        vue.toDisplayString($data.form.expireTimeVal),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("text", { class: "picker-icon" }, ">")
                    ],
                    2
                    /* CLASS */
                  )
                ], 40, ["disabled"]),
                vue.createElementVNode(
                  "text",
                  { class: "field-tip" },
                  vue.toDisplayString($data.form.expireDate ? "默认精确到分钟。" : "请先选择过期日期。"),
                  1
                  /* TEXT */
                )
              ]),
              $data.isSuperAdmin ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "form-field"
              }, [
                vue.createElementVNode("text", { class: "form-label required" }, "发布社区"),
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
                      vue.createElementVNode(
                        "text",
                        null,
                        vue.toDisplayString($data.selectedCommunityName || "请选择发布社区"),
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
                class: "form-field"
              }, [
                vue.createElementVNode("text", { class: "form-label" }, "发布范围"),
                vue.createElementVNode("view", { class: "picker-box has-val" }, [
                  vue.createElementVNode("text", null, "当前社区")
                ])
              ])),
              vue.createElementVNode("view", { class: "form-field switch-row" }, [
                vue.createElementVNode("text", { class: "field-label" }, "置顶公告"),
                vue.createElementVNode("switch", {
                  checked: $data.form.topFlag,
                  color: "#2D81FF",
                  style: { "transform": "scale(0.82)" },
                  onChange: _cache[5] || (_cache[5] = ($event) => $data.form.topFlag = $event.detail.value)
                }, null, 40, ["checked"])
              ])
            ])
          ]),
          vue.createElementVNode("view", { class: "action-bar-card" }, [
            vue.createElementVNode("button", {
              class: "ghost-btn",
              onClick: _cache[6] || (_cache[6] = (...args) => $options.handleCancel && $options.handleCancel(...args))
            }, "取消"),
            vue.createElementVNode("button", {
              class: "warn-btn",
              onClick: _cache[7] || (_cache[7] = (...args) => $options.handleSaveDraft && $options.handleSaveDraft(...args))
            }, "存为草稿"),
            vue.createElementVNode(
              "button",
              {
                class: "primary-btn",
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
    }, 8, ["showSidebar", "pageTitle", "pageBreadcrumb"]);
  }
  const AdminPagesAdminNoticeEdit = /* @__PURE__ */ _export_sfc(_sfc_main$k, [["render", _sfc_render$j], ["__scopeId", "data-v-227539c9"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/notice-edit.vue"]]);
  const _sfc_main$j = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        searchQuery: "",
        typeFilter: "all",
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
        currentPage: 1,
        pageSize: 10,
        total: 0
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      tabPickerIndex() {
        return Math.max(0, this.filterTabs.findIndex((item) => item.value === this.typeFilter));
      },
      currentTabLabel() {
        const current = this.filterTabs.find((item) => item.value === this.typeFilter);
        return current ? current.label : "全部";
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
      normalizeFeeResponse(data) {
        if (Array.isArray(data))
          return { records: data, total: data.length };
        if (Array.isArray(data.records))
          return { records: data.records, total: data.total || data.records.length };
        if (data.data && Array.isArray(data.data.records))
          return { records: data.data.records, total: data.data.total || data.data.records.length };
        return { records: [], total: 0 };
      },
      handleStatsClick(status) {
        this.typeFilter = status;
        this.currentPage = 1;
        this.loadData();
      },
      handleTabPickerChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.typeFilter = ((_b = this.filterTabs[index]) == null ? void 0 : _b.value) || "all";
        this.currentPage = 1;
        this.loadData();
      },
      async loadCountStats() {
        var _a, _b, _c;
        try {
          const totalReq = request("/api/fee/list", { pageNum: 1, pageSize: 1 }, "GET");
          const unpaidReq = request("/api/fee/list", { pageNum: 1, pageSize: 1, status: "UNPAID" }, "GET");
          const paidReq = request("/api/fee/list", { pageNum: 1, pageSize: 1, status: "PAID" }, "GET");
          const [totalRes, unpaidRes, paidRes] = await Promise.all([totalReq, unpaidReq, paidReq]);
          this.countStats = {
            total: (totalRes == null ? void 0 : totalRes.total) || ((_a = totalRes == null ? void 0 : totalRes.data) == null ? void 0 : _a.total) || 0,
            unpaid: (unpaidRes == null ? void 0 : unpaidRes.total) || ((_b = unpaidRes == null ? void 0 : unpaidRes.data) == null ? void 0 : _b.total) || 0,
            paid: (paidRes == null ? void 0 : paidRes.total) || ((_c = paidRes == null ? void 0 : paidRes.data) == null ? void 0 : _c.total) || 0
          };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/fee-manage.vue:336", "加载统计数据失败", error);
        }
      },
      onSearch() {
        this.currentPage = 1;
        this.loadData();
      },
      handleResetFilters() {
        this.searchQuery = "";
        this.typeFilter = "all";
        this.currentPage = 1;
        this.loadData();
      },
      handlePrevPage() {
        if (this.currentPage <= 1)
          return;
        this.currentPage -= 1;
        this.loadData();
      },
      handleNextPage() {
        if (this.currentPage >= this.totalPages)
          return;
        this.currentPage += 1;
        this.loadData();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadData();
      },
      async loadData() {
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
          const normalized = this.normalizeFeeResponse(data);
          const records = normalized.records;
          this.total = Number(normalized.total || 0);
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
              status: item.status === "PAID" || item.status === "paid" || item.status === 1 ? "paid" : "unpaid"
            };
          });
          const totalAmount = this.feeList.reduce((sum, item) => sum + Number(item.amount || 0), 0);
          const paidAmount = this.feeList.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
          this.stats = {
            totalAmount: totalAmount.toFixed(2),
            paidAmount: paidAmount.toFixed(2),
            rate: totalAmount > 0 ? (paidAmount / totalAmount * 100).toFixed(1) : 0
          };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/fee-manage.vue:410", error);
          this.feeList = [];
          this.total = 0;
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      formatHouse(item) {
        const buildingNo = item.buildingNo || "-";
        const houseNo = item.houseNo || "-";
        return `${buildingNo}栋${houseNo}室`;
      },
      formatAmount(value) {
        const num = Number(value || 0);
        return num.toFixed(2);
      },
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
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.generateForm.feeType = this.feeTypes[index].value;
        this.generateForm.feeTypeLabel = this.feeTypes[index].label;
      },
      onDeadlineChange(e) {
        this.generateForm.deadline = e.detail.value;
      },
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
            buildingNo: "",
            feeCycle: this.generateForm.month,
            dueDate: this.generateForm.deadline,
            unitPrice: 2.5
          };
          const adminId = userInfo.id || userInfo.userId || 1;
          const url = `/api/fee/generate?adminId=${adminId}`;
          await request(url, payload, "POST");
          uni.hideLoading();
          uni.showToast({ title: "生成成功", icon: "success" });
          this.closeGenerateModal();
          this.loadData();
          this.loadCountStats();
        } catch (error) {
          uni.hideLoading();
          formatAppLog("error", "at admin/pages/admin/fee-manage.vue:467", "生成账单失败:", error);
          uni.showToast({ title: "生成失败: " + (error.message || "接口错误"), icon: "none" });
        }
      },
      async handleBatchRemind() {
        try {
          uni.showLoading({ title: "发送中..." });
          const unpaidIds = this.feeList.filter((item) => item.status === "unpaid").map((item) => item.id);
          if (!unpaidIds.length) {
            uni.hideLoading();
            return uni.showToast({ title: "无待缴账单", icon: "none" });
          }
          await request("/api/fee/remind/batch", { ids: unpaidIds }, "POST");
          uni.hideLoading();
          this.feeList = this.feeList.map((item) => {
            if (item.status !== "unpaid")
              return item;
            return { ...item, remindCount: (Number(item.remindCount) || 0) + 1 };
          });
          uni.showToast({ title: "催缴发送成功", icon: "success" });
        } catch (error) {
          uni.hideLoading();
        }
      },
      handleRemind(item) {
        uni.showModal({
          title: "催缴通知",
          content: `确认向 ${item.ownerName} 发送 ${item.feeName} 的催缴通知吗？`,
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await request(`/api/fee/remind/${item.id}`, null, "POST");
              const index = this.feeList.findIndex((current) => current.id === item.id);
              if (index !== -1) {
                const current = this.feeList[index];
                const nextCount = (Number(current.remindCount) || 0) + 1;
                this.feeList.splice(index, 1, { ...current, remindCount: nextCount });
              }
              uni.showToast({ title: "发送成功", icon: "success" });
            } catch (error) {
              formatAppLog("error", "at admin/pages/admin/fee-manage.vue:506", "催缴失败", error);
              uni.showToast({ title: error.msg || "发送失败，请检查后端日志", icon: "none" });
            }
          }
        });
      }
    }
  };
  function _sfc_render$i(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[21] || (_cache[21] = ($event) => $data.showSidebar = $event),
      pageTitle: "费用管理",
      currentPage: "/admin/pages/admin/fee-manage",
      pageBreadcrumb: "管理后台 / 费用管理",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "费用账单列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一成后台数据表格页，保留生成账单、单条催缴、批量催缴与金额统计。")
            ]),
            vue.createElementVNode("view", { class: "overview-actions" }, [
              vue.createElementVNode("button", {
                class: "ghost-action-btn",
                onClick: _cache[0] || (_cache[0] = (...args) => $options.handleBatchRemind && $options.handleBatchRemind(...args))
              }, "一键催缴"),
              vue.createElementVNode("button", {
                class: "primary-action-btn",
                onClick: _cache[1] || (_cache[1] = (...args) => $options.openGenerateModal && $options.openGenerateModal(...args))
              }, "生成账单")
            ])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.typeFilter === "all" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("all"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "总账单数"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.countStats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card unpaid", { active: $data.typeFilter === "unpaid" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.handleStatsClick("unpaid"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "待缴费"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.countStats.unpaid),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card paid", { active: $data.typeFilter === "paid" }]),
                onClick: _cache[4] || (_cache[4] = ($event) => $options.handleStatsClick("paid"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已缴费"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.countStats.paid),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "搜索房号、业主姓名",
                    "confirm-type": "search",
                    onConfirm: _cache[6] || (_cache[6] = (...args) => $options.onSearch && $options.onSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "费用状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.filterTabs,
                  "range-key": "label",
                  value: $options.tabPickerIndex,
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleTabPickerChange && $options.handleTabPickerChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentTabLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.onSearch && $options.onSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "本月应收 ¥" + vue.toDisplayString($data.stats.totalAmount),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "已收 ¥" + vue.toDisplayString($data.stats.paidAmount),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "缴费率 " + vue.toDisplayString($data.stats.rate) + "%",
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "table-head" }, [
              vue.createElementVNode("text", { class: "table-col col-name" }, "账单名称"),
              vue.createElementVNode("text", { class: "table-col col-owner" }, "业主"),
              vue.createElementVNode("text", { class: "table-col col-house" }, "房号"),
              vue.createElementVNode("text", { class: "table-col col-period" }, "账单周期"),
              vue.createElementVNode("text", { class: "table-col col-deadline" }, "截止日期"),
              vue.createElementVNode("text", { class: "table-col col-amount" }, "金额"),
              vue.createElementVNode("text", { class: "table-col col-remind" }, "催缴次数"),
              vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
              vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.feeList, (item, index) => {
                return vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: item.id,
                    class: "table-row",
                    style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                  },
                  [
                    vue.createElementVNode("view", { class: "table-col col-name" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "primary-text" },
                        vue.toDisplayString(item.feeName),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-owner" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString(item.ownerName || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-house" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString($options.formatHouse(item)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-period" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString(item.period || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-deadline" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString(item.deadline || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-amount" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "amount-text" },
                        "¥" + vue.toDisplayString($options.formatAmount(item.amount)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-remind" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString(item.remindCount || 0) + " 次",
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-status" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["status-pill", item.status])
                        },
                        vue.toDisplayString(item.status === "paid" ? "已缴费" : "待缴费"),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                      item.status === "unpaid" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 0,
                        class: "row-btn danger",
                        onClick: ($event) => $options.handleRemind(item)
                      }, "催缴", 8, ["onClick"])) : (vue.openBlock(), vue.createElementBlock("text", {
                        key: 1,
                        class: "row-note"
                      }, "无需催缴"))
                    ])
                  ],
                  4
                  /* STYLE */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.feeList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无账单记录")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[11] || (_cache[11] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[12] || (_cache[12] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("view", { class: "stats-footer" }, [
            vue.createElementVNode("view", { class: "footer-stat-item" }, [
              vue.createElementVNode("text", { class: "footer-label" }, "本月应收"),
              vue.createElementVNode(
                "text",
                { class: "footer-value" },
                "¥" + vue.toDisplayString($data.stats.totalAmount),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "footer-stat-item" }, [
              vue.createElementVNode("text", { class: "footer-label" }, "已收金额"),
              vue.createElementVNode(
                "text",
                { class: "footer-value highlight" },
                "¥" + vue.toDisplayString($data.stats.paidAmount),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "footer-stat-item" }, [
              vue.createElementVNode("text", { class: "footer-label" }, "缴费率"),
              vue.createElementVNode(
                "text",
                { class: "footer-value" },
                vue.toDisplayString($data.stats.rate) + "%",
                1
                /* TEXT */
              )
            ])
          ]),
          $data.showGenerateModal ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "detail-modal",
            onClick: _cache[20] || (_cache[20] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content",
              onClick: _cache[19] || (_cache[19] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "生成本期账单"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[13] || (_cache[13] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "账单月份:"),
                  vue.createElementVNode("view", { class: "detail-picker-wrap" }, [
                    vue.createElementVNode("picker", {
                      mode: "date",
                      fields: "month",
                      value: $data.generateForm.month,
                      onChange: _cache[14] || (_cache[14] = (...args) => $options.onMonthChange && $options.onMonthChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "detail-picker" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "detail-picker-text" },
                          vue.toDisplayString($data.generateForm.month || "请选择月份"),
                          1
                          /* TEXT */
                        )
                      ])
                    ], 40, ["value"])
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "费用类型:"),
                  vue.createElementVNode("view", { class: "detail-picker-wrap" }, [
                    vue.createElementVNode("picker", {
                      range: $data.feeTypes,
                      "range-key": "label",
                      onChange: _cache[15] || (_cache[15] = (...args) => $options.onFeeTypeChange && $options.onFeeTypeChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "detail-picker" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "detail-picker-text" },
                          vue.toDisplayString($data.generateForm.feeTypeLabel || "请选择类型"),
                          1
                          /* TEXT */
                        )
                      ])
                    ], 40, ["range"])
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "截止日期:"),
                  vue.createElementVNode("view", { class: "detail-picker-wrap" }, [
                    vue.createElementVNode("picker", {
                      mode: "date",
                      value: $data.generateForm.deadline,
                      onChange: _cache[16] || (_cache[16] = (...args) => $options.onDeadlineChange && $options.onDeadlineChange(...args))
                    }, [
                      vue.createElementVNode("view", { class: "detail-picker" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "detail-picker-text" },
                          vue.toDisplayString($data.generateForm.deadline || "请选择日期"),
                          1
                          /* TEXT */
                        )
                      ])
                    ], 40, ["value"])
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[17] || (_cache[17] = (...args) => $options.closeGenerateModal && $options.closeGenerateModal(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    onClick: _cache[18] || (_cache[18] = (...args) => $options.submitGenerateBill && $options.submitGenerateBill(...args))
                  }, "确认生成")
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminFeeManage = /* @__PURE__ */ _export_sfc(_sfc_main$j, [["render", _sfc_render$i], ["__scopeId", "data-v-764c8d8b"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/fee-manage.vue"]]);
  const _sfc_main$i = {
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
        currentPage: 1,
        pageSize: 10,
        total: 0,
        stats: {
          total: 0,
          pending: 0,
          processed: 0
        },
        showHandleModal: false,
        currentComplaint: null,
        handleResult: "",
        monthOptions: [],
        monthIndex: 0,
        monthValue: ""
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      currentMonthLabel() {
        const option = this.monthOptions[this.monthIndex];
        return option ? option.label : this.monthValue || "选择月份";
      },
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.statusFilter));
      },
      currentStatusLabel() {
        const current = this.statusOptions.find((item) => item.value === this.statusFilter);
        return current ? current.label : "全部状态";
      }
    },
    onLoad() {
      this.initMonthOptions();
      this.loadData();
      this.loadStats();
    },
    methods: {
      initMonthOptions() {
        const now = /* @__PURE__ */ new Date();
        const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const options = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          options.push({ label: value, value });
        }
        this.monthOptions = options;
        this.monthValue = current;
        this.monthIndex = Math.max(0, options.findIndex((item) => item.value === current));
      },
      normalizeComplaintResponse(data) {
        if (Array.isArray(data))
          return { records: data, total: data.length };
        if (Array.isArray(data.records))
          return { records: data.records, total: data.total || data.records.length };
        if (data.data && Array.isArray(data.data.records))
          return { records: data.data.records, total: data.data.total || data.data.records.length };
        if (Array.isArray(data.rows))
          return { records: data.rows, total: data.total || data.rows.length };
        return { records: [], total: 0 };
      },
      extractTotal(data) {
        var _a, _b;
        if (typeof (data == null ? void 0 : data.total) === "number")
          return data.total;
        if (typeof ((_a = data == null ? void 0 : data.data) == null ? void 0 : _a.total) === "number")
          return data.data.total;
        if (Array.isArray(data == null ? void 0 : data.records))
          return data.records.length;
        if (Array.isArray((_b = data == null ? void 0 : data.data) == null ? void 0 : _b.records))
          return data.data.records.length;
        if (Array.isArray(data))
          return data.length;
        return 0;
      },
      handleMonthChange(e) {
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const option = this.monthOptions[index];
        if (!option)
          return;
        this.monthIndex = index;
        this.monthValue = option.value;
        this.currentPage = 1;
        this.loadData();
        this.loadStats();
      },
      async loadData() {
        this.loading = true;
        try {
          const params = {
            keyword: this.searchQuery || void 0,
            status: this.statusFilter || void 0,
            month: this.monthValue || void 0,
            pageNum: this.currentPage,
            pageSize: this.pageSize
          };
          const data = await request("/api/complaint/list", { params }, "GET");
          const normalized = this.normalizeComplaintResponse(data);
          this.total = Number(normalized.total || 0);
          this.complaintList = normalized.records.map((item) => ({
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
            result: item.result
          }));
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/complaint-manage.vue:341", "加载投诉列表失败", error);
          this.complaintList = [];
          this.total = 0;
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      async loadStats() {
        try {
          const month = this.monthValue || void 0;
          const [totalRes, pendingRes, processedRes] = await Promise.all([
            request("/api/complaint/list", { params: { pageNum: 1, pageSize: 1, month } }, "GET"),
            request("/api/complaint/list", { params: { pageNum: 1, pageSize: 1, status: "PENDING", month } }, "GET"),
            request("/api/complaint/list", { params: { pageNum: 1, pageSize: 1, status: "DONE", month } }, "GET")
          ]);
          this.stats = {
            total: this.extractTotal(totalRes),
            pending: this.extractTotal(pendingRes),
            processed: this.extractTotal(processedRes)
          };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/complaint-manage.vue:363", "加载统计数据失败", error);
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
      handleResetFilters() {
        this.searchQuery = "";
        this.statusFilter = "";
        this.currentPage = 1;
        this.loadData();
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.statusFilter = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
        this.currentPage = 1;
        this.loadData();
      },
      handlePrevPage() {
        if (this.currentPage <= 1)
          return;
        this.currentPage -= 1;
        this.loadData();
      },
      handleNextPage() {
        if (this.currentPage >= this.totalPages)
          return;
        this.currentPage += 1;
        this.loadData();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadData();
      },
      openHandleModal(item) {
        this.currentComplaint = item;
        this.handleResult = (item == null ? void 0 : item.result) || "";
        this.showHandleModal = true;
      },
      closeHandleModal() {
        this.showHandleModal = false;
        this.currentComplaint = null;
        this.handleResult = "";
      },
      async submitHandle() {
        if (!this.handleResult.trim()) {
          uni.showToast({ title: "请输入处理结果", icon: "none" });
          return;
        }
        uni.showLoading({ title: "提交中..." });
        try {
          const url = `/api/complaint/handle?id=${this.currentComplaint.id}&result=${encodeURIComponent(this.handleResult)}`;
          await request(url, {}, "PUT");
          uni.showToast({ title: "处理成功", icon: "success" });
          this.closeHandleModal();
          this.loadData();
          this.loadStats();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/complaint-manage.vue:428", "处理投诉失败", error);
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
        const urls = String(images).split(",").filter(Boolean);
        if (!urls.length)
          return;
        uni.previewImage({
          current: urls[index] || urls[0],
          urls
        });
      },
      getImageCount(images) {
        if (!images)
          return 0;
        return String(images).split(",").filter(Boolean).length;
      },
      getOwnerText(item) {
        return item.ownerName || item.userName || "匿名";
      },
      getStatusClass(status) {
        return status === "DONE" ? "status-processed" : "status-pending";
      },
      getStatusText(status) {
        const map = {
          PENDING: "待处理",
          DONE: "已处理"
        };
        return map[status] || status || "-";
      },
      formatHouse(item) {
        if (item.buildingNo && item.houseNo) {
          return `${item.buildingNo}栋${item.houseNo}室`;
        }
        return "未绑定房屋";
      },
      formatTime(time) {
        if (!time)
          return "-";
        const date = new Date(String(time).replace(" ", "T"));
        if (Number.isNaN(date.getTime()))
          return String(time);
        return date.toLocaleString();
      }
    }
  };
  function _sfc_render$h(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[18] || (_cache[18] = ($event) => $data.showSidebar = $event),
      pageTitle: "投诉处理",
      currentPage: "/admin/pages/admin/complaint-manage",
      pageBreadcrumb: "管理后台 / 投诉处理",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "投诉工单列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一按后台表格页方式呈现，保留回复处理、联系业主和图片查看。")
            ]),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.monthOptions,
              "range-key": "label",
              onChange: _cache[0] || (_cache[0] = (...args) => $options.handleMonthChange && $options.handleMonthChange(...args))
            }, [
              vue.createElementVNode("view", { class: "month-filter-chip" }, [
                vue.createElementVNode("text", { class: "month-filter-label" }, "统计月份"),
                vue.createElementVNode(
                  "text",
                  { class: "month-filter-value" },
                  vue.toDisplayString($options.currentMonthLabel),
                  1
                  /* TEXT */
                )
              ])
            ], 40, ["range"])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.statusFilter === "" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick(""))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "总投诉数"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card pending", { active: $data.statusFilter === "PENDING" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("PENDING"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "待处理"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card processed", { active: $data.statusFilter === "DONE" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.handleStatsClick("DONE"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已处理"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.processed),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "搜索投诉内容、业主姓名",
                    onConfirm: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "处理状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "待处理 " + vue.toDisplayString($data.stats.pending) + " 条",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "已处理 " + vue.toDisplayString($data.stats.processed) + " 条",
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "table-head" }, [
              vue.createElementVNode("text", { class: "table-col col-type" }, "投诉类型"),
              vue.createElementVNode("text", { class: "table-col col-content" }, "投诉内容"),
              vue.createElementVNode("text", { class: "table-col col-owner" }, "投诉人"),
              vue.createElementVNode("text", { class: "table-col col-house" }, "房号"),
              vue.createElementVNode("text", { class: "table-col col-time" }, "提交时间"),
              vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
              vue.createElementVNode("text", { class: "table-col col-image" }, "图片"),
              vue.createElementVNode("text", { class: "table-col col-result" }, "处理结果"),
              vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.complaintList, (item, index) => {
                return vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: item.id,
                    class: "table-row",
                    style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                  },
                  [
                    vue.createElementVNode("view", { class: "table-col col-type" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "primary-text" },
                        vue.toDisplayString(item.type || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-content" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "desc-text" },
                        vue.toDisplayString(item.content || "暂无内容"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-owner" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString($options.getOwnerText(item)),
                        1
                        /* TEXT */
                      ),
                      item.phone ? (vue.openBlock(), vue.createElementBlock("text", {
                        key: 0,
                        class: "minor-link",
                        onClick: ($event) => $options.makeCall(item.phone)
                      }, vue.toDisplayString(item.phone), 9, ["onClick"])) : vue.createCommentVNode("v-if", true)
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-house" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString($options.formatHouse(item)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-time" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString($options.formatTime(item.createTime)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-status" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                        },
                        vue.toDisplayString($options.getStatusText(item.status)),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-image" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString($options.getImageCount(item.images)) + " 张",
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-result" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "desc-text" },
                        vue.toDisplayString(item.result || "待回复"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                      $options.getImageCount(item.images) > 0 ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 0,
                        class: "row-btn ghost",
                        onClick: ($event) => $options.previewImage(item.images, 0)
                      }, "图片", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                      vue.createElementVNode("button", {
                        class: "row-btn primary",
                        onClick: ($event) => $options.openHandleModal(item)
                      }, vue.toDisplayString(String(item.status) === "PENDING" ? "处理" : "重处理"), 9, ["onClick"]),
                      item.phone ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 1,
                        class: "row-btn ghost",
                        onClick: ($event) => $options.makeCall(item.phone)
                      }, "联系", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                    ])
                  ],
                  4
                  /* STYLE */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.complaintList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无投诉记录")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[11] || (_cache[11] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          $data.showHandleModal ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "detail-modal",
            onClick: _cache[17] || (_cache[17] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content",
              onClick: _cache[16] || (_cache[16] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "处理投诉"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[12] || (_cache[12] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "投诉类型:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentComplaint ? $data.currentComplaint.type : "-"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "投诉人:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentComplaint ? $options.getOwnerText($data.currentComplaint) : "-"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "回复内容:"),
                  vue.withDirectives(vue.createElementVNode(
                    "textarea",
                    {
                      "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => $data.handleResult = $event),
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
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[14] || (_cache[14] = (...args) => $options.closeHandleModal && $options.closeHandleModal(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    onClick: _cache[15] || (_cache[15] = (...args) => $options.submitHandle && $options.submitHandle(...args))
                  }, "确认回复")
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminComplaintManage = /* @__PURE__ */ _export_sfc(_sfc_main$i, [["render", _sfc_render$h], ["__scopeId", "data-v-f00c65e1"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/complaint-manage.vue"]]);
  const _sfc_main$h = {
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
        currentPage: 1,
        pageSize: 10,
        total: 0,
        stats: {
          total: 0,
          pending: 0,
          approved: 0
        },
        monthOptions: [],
        monthIndex: 0,
        monthValue: ""
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      currentMonthLabel() {
        const option = this.monthOptions[this.monthIndex];
        return option ? option.label : this.monthValue || "选择月份";
      },
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.statusFilter));
      },
      currentStatusLabel() {
        const current = this.statusOptions.find((item) => item.value === this.statusFilter);
        return current ? current.label : "全部状态";
      }
    },
    onLoad() {
      this.initMonthOptions();
      this.loadData();
      this.loadStats();
    },
    methods: {
      initMonthOptions() {
        const now = /* @__PURE__ */ new Date();
        const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const options = [];
        for (let i = 0; i < 12; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          options.push({ label: value, value });
        }
        this.monthOptions = options;
        this.monthValue = current;
        this.monthIndex = Math.max(0, options.findIndex((item) => item.value === current));
      },
      normalizeVisitorResponse(data) {
        if (Array.isArray(data))
          return { records: data, total: data.length };
        if (Array.isArray(data.records))
          return { records: data.records, total: data.total || data.records.length };
        if (data.data && Array.isArray(data.data.records))
          return { records: data.data.records, total: data.data.total || data.data.records.length };
        return { records: [], total: 0 };
      },
      extractTotal(data) {
        var _a, _b;
        if (typeof (data == null ? void 0 : data.total) === "number")
          return data.total;
        if (typeof ((_a = data == null ? void 0 : data.data) == null ? void 0 : _a.total) === "number")
          return data.data.total;
        if (Array.isArray(data == null ? void 0 : data.records))
          return data.records.length;
        if (Array.isArray((_b = data == null ? void 0 : data.data) == null ? void 0 : _b.records))
          return data.data.records.length;
        if (Array.isArray(data))
          return data.length;
        return 0;
      },
      handleMonthChange(e) {
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const option = this.monthOptions[index];
        if (!option)
          return;
        this.monthIndex = index;
        this.monthValue = option.value;
        this.currentPage = 1;
        this.loadData();
        this.loadStats();
      },
      async loadData() {
        this.loading = true;
        try {
          const params = {
            keyword: this.searchQuery || void 0,
            status: this.statusFilter || void 0,
            month: this.monthValue || void 0,
            pageNum: this.currentPage,
            pageSize: this.pageSize
          };
          const data = await request("/api/visitor/list", { params }, "GET");
          const normalized = this.normalizeVisitorResponse(data);
          this.total = Number(normalized.total || 0);
          this.visitorList = normalized.records.map((item) => ({
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
          }));
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/visitor-manage.vue:299", "加载访客列表失败", error);
          this.visitorList = [];
          this.total = 0;
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      async loadStats() {
        try {
          const month = this.monthValue || void 0;
          const [totalRes, pendingRes, approvedRes] = await Promise.all([
            request("/api/visitor/list", { params: { pageSize: 1, month } }, "GET"),
            request("/api/visitor/list", { params: { pageSize: 1, status: "PENDING", month } }, "GET"),
            request("/api/visitor/list", { params: { pageSize: 1, status: "APPROVED", month } }, "GET")
          ]);
          this.stats = {
            total: this.extractTotal(totalRes),
            pending: this.extractTotal(pendingRes),
            approved: this.extractTotal(approvedRes)
          };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/visitor-manage.vue:321", "加载统计数据失败", error);
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
      handleResetFilters() {
        this.searchQuery = "";
        this.statusFilter = "";
        this.currentPage = 1;
        this.loadData();
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.statusFilter = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
        this.currentPage = 1;
        this.loadData();
      },
      handlePrevPage() {
        if (this.currentPage <= 1)
          return;
        this.currentPage -= 1;
        this.loadData();
      },
      handleNextPage() {
        if (this.currentPage >= this.totalPages)
          return;
        this.currentPage += 1;
        this.loadData();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadData();
      },
      handleApprove(item) {
        uni.showModal({
          title: "通过审核",
          content: `确认允许 ${item.visitorName} 访问吗？`,
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              const url = `/api/visitor/audit?id=${item.id}&status=APPROVED`;
              await request(url, {}, "PUT");
              uni.showToast({ title: "审核通过", icon: "success" });
              this.loadData();
              this.loadStats();
            } catch (error) {
              uni.showToast({ title: "操作失败", icon: "none" });
            }
          }
        });
      },
      handleReject(item) {
        uni.showModal({
          title: "拒绝申请",
          content: `确认拒绝 ${item.visitorName} 的访问申请吗？`,
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              const url = `/api/visitor/audit?id=${item.id}&status=REJECTED`;
              await request(url, {}, "PUT");
              uni.showToast({ title: "已拒绝", icon: "none" });
              this.loadData();
              this.loadStats();
            } catch (error) {
              uni.showToast({ title: "操作失败", icon: "none" });
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
        const map = {
          PENDING: "status-pending",
          APPROVED: "status-approved",
          REJECTED: "status-rejected",
          EXPIRED: "status-expired"
        };
        return map[status] || "status-expired";
      },
      getStatusText(status) {
        const map = {
          PENDING: "待审核",
          APPROVED: "已通过",
          REJECTED: "已拒绝",
          EXPIRED: "已过期"
        };
        return map[status] || status || "-";
      },
      formatHouse(item) {
        if (item.buildingNo && item.houseNo) {
          return `${item.buildingNo}栋${item.houseNo}室`;
        }
        return "-";
      },
      formatTime(time) {
        if (!time)
          return "-";
        const date = new Date(String(time).replace(" ", "T"));
        if (Number.isNaN(date.getTime()))
          return String(time);
        return date.toLocaleString();
      }
    }
  };
  function _sfc_render$g(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[12] || (_cache[12] = ($event) => $data.showSidebar = $event),
      pageTitle: "访客审核",
      currentPage: "/admin/pages/admin/visitor-manage",
      pageBreadcrumb: "管理后台 / 访客审核",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "访客申请列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一为后台审核列表页，保留通过、拒绝和联系访客三类操作。")
            ]),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.monthOptions,
              "range-key": "label",
              onChange: _cache[0] || (_cache[0] = (...args) => $options.handleMonthChange && $options.handleMonthChange(...args))
            }, [
              vue.createElementVNode("view", { class: "month-filter-chip" }, [
                vue.createElementVNode("text", { class: "month-filter-label" }, "统计月份"),
                vue.createElementVNode(
                  "text",
                  { class: "month-filter-value" },
                  vue.toDisplayString($options.currentMonthLabel),
                  1
                  /* TEXT */
                )
              ])
            ], 40, ["range"])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.statusFilter === "" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.handleStatsClick(""))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "总访问数"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card pending", { active: $data.statusFilter === "PENDING" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleStatsClick("PENDING"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "待审核"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card approved", { active: $data.statusFilter === "APPROVED" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.handleStatsClick("APPROVED"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已通过"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.approved),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "搜索访客姓名、业主姓名",
                    onConfirm: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "审核状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "待审核 " + vue.toDisplayString($data.stats.pending) + " 条",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "已通过 " + vue.toDisplayString($data.stats.approved) + " 条",
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "table-head" }, [
              vue.createElementVNode("text", { class: "table-col col-visitor" }, "访客"),
              vue.createElementVNode("text", { class: "table-col col-phone" }, "联系电话"),
              vue.createElementVNode("text", { class: "table-col col-owner" }, "访问对象"),
              vue.createElementVNode("text", { class: "table-col col-house" }, "房号"),
              vue.createElementVNode("text", { class: "table-col col-time" }, "访问时间"),
              vue.createElementVNode("text", { class: "table-col col-reason" }, "访问事由"),
              vue.createElementVNode("text", { class: "table-col col-car" }, "车牌号"),
              vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
              vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.visitorList, (item, index) => {
                return vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: item.id,
                    class: "table-row",
                    style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                  },
                  [
                    vue.createElementVNode("view", { class: "table-col col-visitor" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "primary-text" },
                        vue.toDisplayString(item.visitorName || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-phone" }, [
                      vue.createElementVNode("text", {
                        class: "minor-link",
                        onClick: ($event) => $options.makeCall(item.visitorPhone)
                      }, vue.toDisplayString(item.visitorPhone || "-"), 9, ["onClick"])
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-owner" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString(item.ownerName || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-house" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString($options.formatHouse(item)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-time" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString($options.formatTime(item.visitTime)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-reason" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "desc-text" },
                        vue.toDisplayString(item.reason || "暂无说明"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-car" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString(item.carNo || "无"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-status" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                        },
                        vue.toDisplayString($options.getStatusText(item.status)),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                      vue.createElementVNode("button", {
                        class: "row-btn ghost",
                        onClick: ($event) => $options.makeCall(item.visitorPhone)
                      }, "联系访客", 8, ["onClick"]),
                      item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 0,
                        class: "row-btn secondary-warn",
                        onClick: ($event) => $options.handleReject(item)
                      }, "拒绝", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                      item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 1,
                        class: "row-btn primary",
                        onClick: ($event) => $options.handleApprove(item)
                      }, "通过", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                    ])
                  ],
                  4
                  /* STYLE */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.visitorList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无访客申请记录")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[11] || (_cache[11] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminVisitorManage = /* @__PURE__ */ _export_sfc(_sfc_main$h, [["render", _sfc_render$g], ["__scopeId", "data-v-20feed08"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/visitor-manage.vue"]]);
  const _sfc_main$g = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        loading: false,
        searchQuery: "",
        statusFilter: "",
        roleFilter: "",
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "PENDING", label: "待审核" },
          { value: "ACTIVE", label: "已通过" },
          { value: "REJECTED", label: "已驳回" },
          { value: "DISABLED", label: "已禁用" }
        ],
        roleOptions: [
          { value: "", label: "全部角色" },
          { value: "owner", label: "业主(owner)" },
          { value: "worker", label: "工作人员(worker)" },
          { value: "admin", label: "管理员(admin)" },
          { value: "super_admin", label: "超级管理员(super_admin)" }
        ],
        requestList: [],
        currentPage: 1,
        pageSize: 10,
        total: 0,
        stats: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        },
        showRejectModal: false,
        rejectReason: "",
        currentItem: null,
        showApproveModal: false,
        communityList: [],
        communityListLoading: false,
        communityLoadError: "",
        approveRole: "owner",
        approveCommunityId: "",
        approveRoleOptions: [
          { value: "owner", label: "业主(owner)" },
          { value: "worker", label: "工作人员(worker)" },
          { value: "admin", label: "管理员(admin)" },
          { value: "super_admin", label: "超级管理员(super_admin)" }
        ]
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.statusFilter));
      },
      rolePickerIndex() {
        return Math.max(0, this.roleOptions.findIndex((item) => item.value === this.roleFilter));
      },
      currentStatusLabel() {
        const current = this.statusOptions.find((item) => item.value === this.statusFilter);
        return current ? current.label : "全部状态";
      },
      currentRoleLabel() {
        const current = this.roleOptions.find((item) => item.value === this.roleFilter);
        return current ? current.label : "全部角色";
      },
      approveRoleIndex() {
        return Math.max(0, this.approveRoleOptions.findIndex((item) => item.value === this.approveRole));
      },
      approveRoleLabel() {
        const current = this.approveRoleOptions.find((item) => item.value === this.approveRole);
        return current ? current.label : "业主(owner)";
      },
      needsCommunityAssignment() {
        return this.approveRole === "admin" || this.approveRole === "worker";
      },
      approveCommunityIndex() {
        const index = this.communityList.findIndex((item) => String(item.id) === String(this.approveCommunityId));
        return index >= 0 ? index : 0;
      },
      approveCommunityLabel() {
        const current = this.communityList.find((item) => String(item.id) === String(this.approveCommunityId));
        return current ? current.name : "";
      },
      approveCommunityDisplayText() {
        if (this.communityListLoading)
          return "社区列表加载中...";
        if (this.approveCommunityLabel)
          return this.approveCommunityLabel;
        if (this.communityLoadError)
          return "社区列表加载失败";
        if (!this.communityList.length)
          return "暂无可选社区";
        return this.approveRole === "admin" ? "请选择负责社区" : "请选择所属社区";
      },
      approveCommunityTip() {
        if (this.communityListLoading)
          return "正在加载社区列表，请稍候。";
        if (this.communityLoadError)
          return this.communityLoadError;
        if (!this.communityList.length)
          return "当前未获取到社区数据，无法完成该角色审批。";
        return this.approveRole === "admin" ? "管理员账号通过后将绑定到所选社区，便于后续按社区管理数据。" : "工作人员账号通过后将绑定到所选社区，便于后续按社区接收任务。";
      }
    },
    onShow() {
      this.loadData();
      this.loadStats();
    },
    methods: {
      extractTotal(data) {
        var _a, _b;
        if (typeof (data == null ? void 0 : data.total) === "number")
          return data.total;
        if (typeof ((_a = data == null ? void 0 : data.data) == null ? void 0 : _a.total) === "number")
          return data.data.total;
        if (Array.isArray(data == null ? void 0 : data.records))
          return data.records.length;
        if (Array.isArray((_b = data == null ? void 0 : data.data) == null ? void 0 : _b.records))
          return data.data.records.length;
        if (Array.isArray(data))
          return data.length;
        return 0;
      },
      async loadStats() {
        try {
          const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
            request("/api/admin/user/register-requests", { params: { pageNum: 1, pageSize: 1, role: this.roleFilter || void 0 } }, "GET"),
            request("/api/admin/user/register-requests", { params: { pageNum: 1, pageSize: 1, role: this.roleFilter || void 0, status: "PENDING" } }, "GET"),
            request("/api/admin/user/register-requests", { params: { pageNum: 1, pageSize: 1, role: this.roleFilter || void 0, status: "ACTIVE" } }, "GET"),
            request("/api/admin/user/register-requests", { params: { pageNum: 1, pageSize: 1, role: this.roleFilter || void 0, status: "REJECTED" } }, "GET")
          ]);
          this.stats = {
            total: this.extractTotal(totalRes),
            pending: this.extractTotal(pendingRes),
            approved: this.extractTotal(approvedRes),
            rejected: this.extractTotal(rejectedRes)
          };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/register-review.vue:414", "加载注册审核统计失败", error);
        }
      },
      async loadData() {
        var _a, _b;
        this.loading = true;
        try {
          const params = {
            pageNum: this.currentPage,
            pageSize: this.pageSize,
            keyword: this.searchQuery || void 0,
            status: this.statusFilter || void 0,
            role: this.roleFilter || void 0
          };
          const res = await request("/api/admin/user/register-requests", { params }, "GET");
          const page = Array.isArray(res == null ? void 0 : res.records) || Array.isArray((_a = res == null ? void 0 : res.data) == null ? void 0 : _a.records) ? ((_b = res == null ? void 0 : res.data) == null ? void 0 : _b.records) ? res.data : res : (res == null ? void 0 : res.data) || res;
          const records = Array.isArray(page == null ? void 0 : page.records) ? page.records : Array.isArray(res) ? res : [];
          const total = (page == null ? void 0 : page.total) ?? (res == null ? void 0 : res.total) ?? records.length ?? 0;
          this.requestList = records.map((item) => ({
            id: item == null ? void 0 : item.id,
            username: item == null ? void 0 : item.username,
            phone: item == null ? void 0 : item.phone,
            realName: item == null ? void 0 : item.realName,
            role: item == null ? void 0 : item.role,
            status: item == null ? void 0 : item.status,
            applyTime: item == null ? void 0 : item.applyTime,
            rejectReason: item == null ? void 0 : item.rejectReason
          }));
          this.total = Number(total) || 0;
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/register-review.vue:444", "加载注册申请失败", error);
          uni.showToast({ title: "加载失败", icon: "none" });
          this.requestList = [];
          this.total = 0;
        } finally {
          this.loading = false;
        }
      },
      handleSearch() {
        this.currentPage = 1;
        this.loadData();
        this.loadStats();
      },
      handleResetFilters() {
        this.searchQuery = "";
        this.statusFilter = "";
        this.roleFilter = "";
        this.currentPage = 1;
        this.loadData();
        this.loadStats();
      },
      applyQuickStatus(status) {
        this.statusFilter = status;
        this.currentPage = 1;
        this.loadData();
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.statusFilter = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
        this.currentPage = 1;
        this.loadData();
      },
      handleRoleChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.roleFilter = ((_b = this.roleOptions[index]) == null ? void 0 : _b.value) || "";
        this.currentPage = 1;
        this.loadData();
        this.loadStats();
      },
      handlePrevPage() {
        if (this.currentPage <= 1)
          return;
        this.currentPage -= 1;
        this.loadData();
      },
      handleNextPage() {
        if (this.currentPage >= this.totalPages)
          return;
        this.currentPage += 1;
        this.loadData();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadData();
      },
      openReject(item) {
        this.currentItem = item;
        this.rejectReason = "";
        this.showRejectModal = true;
      },
      closeReject() {
        this.showRejectModal = false;
        this.currentItem = null;
        this.rejectReason = "";
      },
      async confirmReject() {
        var _a;
        if (!((_a = this.currentItem) == null ? void 0 : _a.id))
          return;
        if (!this.rejectReason.trim()) {
          uni.showToast({ title: "请输入驳回原因", icon: "none" });
          return;
        }
        uni.showLoading({ title: "提交中..." });
        try {
          await request(`/api/admin/user/register-requests/${this.currentItem.id}/reject`, { data: { reason: this.rejectReason } }, "PUT");
          uni.showToast({ title: "已驳回", icon: "success" });
          this.closeReject();
          this.loadData();
          this.loadStats();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/register-review.vue:524", "驳回注册申请失败", error);
          uni.showToast({ title: "操作失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      async ensureCommunityList() {
        if (this.communityListLoading || this.communityList.length > 0)
          return;
        this.communityListLoading = true;
        this.communityLoadError = "";
        try {
          const data = await request("/api/house/community/list", {}, "GET");
          const list = Array.isArray(data) ? data : Array.isArray(data == null ? void 0 : data.records) ? data.records : [];
          this.communityList = list.map((item) => ({
            id: item == null ? void 0 : item.id,
            name: (item == null ? void 0 : item.name) || (item == null ? void 0 : item.communityName) || `社区${(item == null ? void 0 : item.id) || ""}`
          })).filter((item) => item.id != null);
          if (!this.communityList.length) {
            this.communityLoadError = "社区列表为空，请先确认社区数据是否已配置。";
          }
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/register-review.vue:547", "加载社区列表失败", error);
          this.communityList = [];
          this.communityLoadError = (error == null ? void 0 : error.message) || "社区列表加载失败，请检查社区查询接口。";
        } finally {
          this.communityListLoading = false;
        }
      },
      async openApprove(item) {
        this.currentItem = item;
        this.approveRole = (item == null ? void 0 : item.role) || "owner";
        this.approveCommunityId = (item == null ? void 0 : item.communityId) ? String(item.communityId) : "";
        this.showApproveModal = true;
        if (this.needsCommunityAssignment) {
          await this.ensureCommunityList();
        }
      },
      closeApprove() {
        this.showApproveModal = false;
        this.currentItem = null;
        this.approveRole = "owner";
        this.approveCommunityId = "";
      },
      handleApproveRoleChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.approveRole = ((_b = this.approveRoleOptions[index]) == null ? void 0 : _b.value) || "owner";
        if (!this.needsCommunityAssignment) {
          this.approveCommunityId = "";
          return;
        }
        this.ensureCommunityList();
      },
      handleApproveCommunityChange(e) {
        var _a;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        const selected = this.communityList[index];
        this.approveCommunityId = (selected == null ? void 0 : selected.id) != null ? String(selected.id) : "";
      },
      async confirmApprove() {
        var _a;
        if (!((_a = this.currentItem) == null ? void 0 : _a.id))
          return;
        if (this.needsCommunityAssignment && !this.approveCommunityId) {
          uni.showToast({
            title: this.approveRole === "admin" ? "请选择负责社区" : "请选择所属社区",
            icon: "none"
          });
          return;
        }
        uni.showLoading({ title: "提交中..." });
        try {
          const payload = {
            role: this.approveRole
          };
          if (this.needsCommunityAssignment) {
            payload.communityId = Number(this.approveCommunityId);
          }
          await request(
            `/api/admin/user/register-requests/${this.currentItem.id}/approve`,
            { data: payload },
            "PUT"
          );
          uni.showToast({ title: "已通过", icon: "success" });
          this.closeApprove();
          this.loadData();
          this.loadStats();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/register-review.vue:610", "通过注册申请失败", error);
          uni.showToast({ title: "操作失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      getStatusText(status) {
        switch (status) {
          case "PENDING":
            return "待审核";
          case "ACTIVE":
            return "已通过";
          case "REJECTED":
            return "已驳回";
          case "DISABLED":
            return "已禁用";
          default:
            return status || "-";
        }
      },
      getStatusClass(status) {
        switch (status) {
          case "PENDING":
            return "status-pending";
          case "ACTIVE":
            return "status-approved";
          case "REJECTED":
            return "status-rejected";
          case "DISABLED":
            return "status-disabled";
          default:
            return "status-disabled";
        }
      },
      getRoleText(role) {
        const found = this.roleOptions.find((item) => item.value === role);
        return found ? found.label : role || "-";
      },
      formatTime(str) {
        if (!str)
          return "-";
        const date = new Date(String(str).replace(" ", "T"));
        if (Number.isNaN(date.getTime()))
          return String(str);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        return `${month}-${day} ${hour}:${minute}`;
      }
    }
  };
  function _sfc_render$f(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[26] || (_cache[26] = ($event) => $data.showSidebar = $event),
      pageTitle: "注册审核",
      currentPage: "/admin/pages/admin/register-review",
      pageBreadcrumb: "管理后台 / 注册审核",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "注册申请列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一为后台审核表格页，保留通过、驳回和角色确认流程。")
            ]),
            vue.createElementVNode("view", { class: "overview-chip" }, [
              vue.createElementVNode("text", { class: "overview-chip-label" }, "审批动作"),
              vue.createElementVNode("text", { class: "overview-chip-value" }, "用户开通")
            ])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar register-status-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.statusFilter === "" }]),
                onClick: _cache[0] || (_cache[0] = ($event) => $options.applyQuickStatus(""))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "全部申请"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card pending", { active: $data.statusFilter === "PENDING" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.applyQuickStatus("PENDING"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "待审核"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card approved", { active: $data.statusFilter === "ACTIVE" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.applyQuickStatus("ACTIVE"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已通过"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.approved),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card rejected", { active: $data.statusFilter === "REJECTED" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.applyQuickStatus("REJECTED"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已驳回"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.rejected),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid register-query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "搜索用户名、姓名或手机号",
                    onConfirm: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "审核状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "申请角色"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.roleOptions,
                  "range-key": "label",
                  value: $options.rolePickerIndex,
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleRoleChange && $options.handleRoleChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentRoleLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "待审核 " + vue.toDisplayString($data.stats.pending) + " 条",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "当前角色筛选：" + vue.toDisplayString($options.currentRoleLabel),
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "scroll-table" }, [
              vue.createElementVNode("view", { class: "table-head register-table" }, [
                vue.createElementVNode("text", { class: "table-col col-name" }, "申请人"),
                vue.createElementVNode("text", { class: "table-col col-username" }, "用户名"),
                vue.createElementVNode("text", { class: "table-col col-phone" }, "手机号"),
                vue.createElementVNode("text", { class: "table-col col-role" }, "申请角色"),
                vue.createElementVNode("text", { class: "table-col col-time" }, "申请时间"),
                vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
                vue.createElementVNode("text", { class: "table-col col-reason" }, "驳回原因"),
                vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
              ]),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.requestList, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: item.id,
                      class: "table-row register-table",
                      style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                    },
                    [
                      vue.createElementVNode("view", { class: "table-col col-name" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "primary-text" },
                          vue.toDisplayString(item.realName || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-username" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(item.username || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-phone" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(item.phone || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-role" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString($options.getRoleText(item.role)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-time" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString($options.formatTime(item.applyTime)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-status" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                          },
                          vue.toDisplayString($options.getStatusText(item.status)),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-reason" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "desc-text" },
                          vue.toDisplayString(item.rejectReason || "无"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                        item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "row-btn secondary-warn",
                          onClick: ($event) => $options.openReject(item)
                        }, "驳回", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                        item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 1,
                          class: "row-btn primary",
                          onClick: ($event) => $options.openApprove(item)
                        }, "通过", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
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
            $data.requestList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无注册申请")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[11] || (_cache[11] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[12] || (_cache[12] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          $data.showRejectModal ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "detail-modal",
            onClick: _cache[18] || (_cache[18] = (...args) => $options.closeReject && $options.closeReject(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content",
              onClick: _cache[17] || (_cache[17] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "驳回申请"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[13] || (_cache[13] = (...args) => $options.closeReject && $options.closeReject(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "申请人:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentItem ? $data.currentItem.realName : "-"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "驳回原因:"),
                  vue.withDirectives(vue.createElementVNode(
                    "textarea",
                    {
                      class: "modal-textarea",
                      "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => $data.rejectReason = $event),
                      placeholder: "请输入驳回原因",
                      maxlength: "200"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.rejectReason]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[15] || (_cache[15] = (...args) => $options.closeReject && $options.closeReject(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    onClick: _cache[16] || (_cache[16] = (...args) => $options.confirmReject && $options.confirmReject(...args))
                  }, "确定")
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          $data.showApproveModal ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 4,
            class: "detail-modal",
            onClick: _cache[25] || (_cache[25] = (...args) => $options.closeApprove && $options.closeApprove(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content",
              onClick: _cache[24] || (_cache[24] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "通过申请"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[19] || (_cache[19] = (...args) => $options.closeApprove && $options.closeApprove(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "申请人:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentItem ? $data.currentItem.realName : "-"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "确认角色:"),
                  vue.createElementVNode("picker", {
                    mode: "selector",
                    range: $data.approveRoleOptions,
                    "range-key": "label",
                    value: $options.approveRoleIndex,
                    onChange: _cache[20] || (_cache[20] = (...args) => $options.handleApproveRoleChange && $options.handleApproveRoleChange(...args))
                  }, [
                    vue.createElementVNode("view", { class: "modal-picker" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "modal-picker-text" },
                        vue.toDisplayString($options.approveRoleLabel),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("text", { class: "modal-picker-arrow" }, ">")
                    ])
                  ], 40, ["range", "value"])
                ]),
                $options.needsCommunityAssignment ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "detail-item detail-item-block"
                }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "负责社区:"),
                  vue.createElementVNode("picker", {
                    mode: "selector",
                    range: $data.communityList,
                    "range-key": "name",
                    value: $options.approveCommunityIndex,
                    disabled: $data.communityListLoading || $data.communityList.length === 0,
                    onChange: _cache[21] || (_cache[21] = (...args) => $options.handleApproveCommunityChange && $options.handleApproveCommunityChange(...args))
                  }, [
                    vue.createElementVNode(
                      "view",
                      {
                        class: vue.normalizeClass(["modal-picker", { placeholder: !$options.approveCommunityLabel }])
                      },
                      [
                        vue.createElementVNode(
                          "text",
                          { class: "modal-picker-text" },
                          vue.toDisplayString($options.approveCommunityDisplayText),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("text", { class: "modal-picker-arrow" }, ">")
                      ],
                      2
                      /* CLASS */
                    )
                  ], 40, ["range", "value", "disabled"]),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-tip" },
                    vue.toDisplayString($options.approveCommunityTip),
                    1
                    /* TEXT */
                  )
                ])) : vue.createCommentVNode("v-if", true),
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[22] || (_cache[22] = (...args) => $options.closeApprove && $options.closeApprove(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    onClick: _cache[23] || (_cache[23] = (...args) => $options.confirmApprove && $options.confirmApprove(...args))
                  }, "确定")
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminRegisterReview = /* @__PURE__ */ _export_sfc(_sfc_main$g, [["render", _sfc_render$f], ["__scopeId", "data-v-637f93cb"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/register-review.vue"]]);
  const _sfc_main$f = {
    components: { adminSidebar },
    data() {
      return {
        showSidebar: false,
        loading: false,
        searchQuery: "",
        statusFilter: "PENDING",
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "PENDING", label: "待审核" },
          { value: "APPROVED", label: "已通过" },
          { value: "REJECTED", label: "已驳回" }
        ],
        requestList: [],
        currentPage: 1,
        pageSize: 10,
        total: 0,
        stats: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        },
        showRejectModal: false,
        rejectReason: "",
        currentItem: null
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50, 100];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.statusFilter));
      },
      currentStatusLabel() {
        const current = this.statusOptions.find((item) => item.value === this.statusFilter);
        return current ? current.label : "全部状态";
      }
    },
    onShow() {
      this.loadData();
      this.loadStats();
    },
    methods: {
      handleSearch() {
        this.currentPage = 1;
        this.loadData();
      },
      handleResetFilters() {
        this.searchQuery = "";
        this.statusFilter = "PENDING";
        this.currentPage = 1;
        this.loadData();
      },
      applyQuickStatus(status) {
        this.statusFilter = status;
        this.currentPage = 1;
        this.loadData();
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.statusFilter = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
        this.currentPage = 1;
        this.loadData();
      },
      extractTotal(data) {
        var _a, _b;
        if (typeof (data == null ? void 0 : data.total) === "number")
          return data.total;
        if (typeof ((_a = data == null ? void 0 : data.data) == null ? void 0 : _a.total) === "number")
          return data.data.total;
        if (Array.isArray(data == null ? void 0 : data.records))
          return data.records.length;
        if (Array.isArray((_b = data == null ? void 0 : data.data) == null ? void 0 : _b.records))
          return data.data.records.length;
        if (Array.isArray(data))
          return data.length;
        return 0;
      },
      async loadData() {
        var _a, _b;
        this.loading = true;
        try {
          const params = {
            pageNum: this.currentPage,
            pageSize: this.pageSize,
            keyword: this.searchQuery || void 0,
            status: this.statusFilter || void 0
          };
          const res = await request("/api/admin/house/bind-requests", { params }, "GET");
          const page = Array.isArray(res == null ? void 0 : res.records) || Array.isArray((_a = res == null ? void 0 : res.data) == null ? void 0 : _a.records) ? ((_b = res == null ? void 0 : res.data) == null ? void 0 : _b.records) ? res.data : res : (res == null ? void 0 : res.data) || res;
          const records = Array.isArray(page == null ? void 0 : page.records) ? page.records : Array.isArray(res) ? res : [];
          const total = (page == null ? void 0 : page.total) ?? (res == null ? void 0 : res.total) ?? records.length ?? 0;
          this.requestList = records.map((item) => ({
            id: item == null ? void 0 : item.id,
            userId: item == null ? void 0 : item.userId,
            username: item == null ? void 0 : item.username,
            realName: item == null ? void 0 : item.realName,
            phone: item == null ? void 0 : item.phone,
            communityName: item == null ? void 0 : item.communityName,
            buildingNo: item == null ? void 0 : item.buildingNo,
            houseNo: item == null ? void 0 : item.houseNo,
            identityType: (item == null ? void 0 : item.identityType) ?? (item == null ? void 0 : item.type),
            status: item == null ? void 0 : item.status,
            applyTime: item == null ? void 0 : item.applyTime,
            rejectReason: item == null ? void 0 : item.rejectReason
          }));
          this.total = Number(total) || 0;
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/house-bind-review.vue:310", "加载绑定申请失败", error);
          uni.showToast({ title: "加载失败", icon: "none" });
          this.requestList = [];
          this.total = 0;
        } finally {
          this.loading = false;
        }
      },
      async loadStats() {
        try {
          const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
            request("/api/admin/house/bind-requests", { params: { pageNum: 1, pageSize: 1 } }, "GET"),
            request("/api/admin/house/bind-requests", { params: { pageNum: 1, pageSize: 1, status: "PENDING" } }, "GET"),
            request("/api/admin/house/bind-requests", { params: { pageNum: 1, pageSize: 1, status: "APPROVED" } }, "GET"),
            request("/api/admin/house/bind-requests", { params: { pageNum: 1, pageSize: 1, status: "REJECTED" } }, "GET")
          ]);
          this.stats = {
            total: this.extractTotal(totalRes),
            pending: this.extractTotal(pendingRes),
            approved: this.extractTotal(approvedRes),
            rejected: this.extractTotal(rejectedRes)
          };
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/house-bind-review.vue:333", "加载绑定统计失败", error);
        }
      },
      handlePrevPage() {
        if (this.currentPage <= 1)
          return;
        this.currentPage -= 1;
        this.loadData();
      },
      handleNextPage() {
        if (this.currentPage >= this.totalPages)
          return;
        this.currentPage += 1;
        this.loadData();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50, 100];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 10;
        this.currentPage = 1;
        this.loadData();
      },
      confirmApprove(item) {
        if (!(item == null ? void 0 : item.id))
          return;
        uni.showModal({
          title: "确认通过",
          content: "确认通过该房屋绑定申请吗？",
          success: async (res) => {
            if (!res.confirm)
              return;
            uni.showLoading({ title: "提交中..." });
            try {
              await request(`/api/admin/house/bind-requests/${item.id}/approve`, {}, "PUT");
              uni.showToast({ title: "已通过", icon: "success" });
              this.loadData();
              this.loadStats();
            } catch (error) {
              uni.showToast({ title: "操作失败", icon: "none" });
            } finally {
              uni.hideLoading();
            }
          }
        });
      },
      openReject(item) {
        this.currentItem = item;
        this.rejectReason = "";
        this.showRejectModal = true;
      },
      closeReject() {
        this.showRejectModal = false;
        this.currentItem = null;
        this.rejectReason = "";
      },
      async submitReject() {
        var _a;
        if (!((_a = this.currentItem) == null ? void 0 : _a.id))
          return;
        if (!this.rejectReason.trim()) {
          uni.showToast({ title: "请输入驳回原因", icon: "none" });
          return;
        }
        uni.showLoading({ title: "提交中..." });
        try {
          await request(
            `/api/admin/house/bind-requests/${this.currentItem.id}/reject`,
            { data: { reason: this.rejectReason } },
            "PUT"
          );
          uni.showToast({ title: "已驳回", icon: "success" });
          this.closeReject();
          this.loadData();
          this.loadStats();
        } catch (error) {
          uni.showToast({ title: "操作失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      },
      getStatusText(status) {
        switch (status) {
          case "PENDING":
            return "待审核";
          case "APPROVED":
            return "已通过";
          case "REJECTED":
            return "已驳回";
          default:
            return status || "-";
        }
      },
      getStatusClass(status) {
        switch (status) {
          case "PENDING":
            return "status-pending";
          case "APPROVED":
            return "status-approved";
          case "REJECTED":
            return "status-rejected";
          default:
            return "status-rejected";
        }
      },
      getIdentityText(type) {
        switch (type) {
          case "OWNER":
            return "业主";
          case "FAMILY":
            return "家属";
          case "TENANT":
            return "租户";
          default:
            return type || "-";
        }
      },
      formatHouse(item) {
        const community = (item == null ? void 0 : item.communityName) ? `${item.communityName} ` : "";
        const building = (item == null ? void 0 : item.buildingNo) ? `${item.buildingNo}` : "";
        const house = (item == null ? void 0 : item.houseNo) ? `${item.houseNo}` : "";
        return `${community}${building}${house}`.trim() || "-";
      },
      formatTime(str) {
        if (!str)
          return "-";
        const date = new Date(String(str).replace(" ", "T"));
        if (Number.isNaN(date.getTime()))
          return String(str);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        return `${month}-${day} ${hour}:${minute}`;
      }
    }
  };
  function _sfc_render$e(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[18] || (_cache[18] = ($event) => $data.showSidebar = $event),
      pageTitle: "房屋绑定审核",
      currentPage: "/admin/pages/admin/house-bind-review",
      pageBreadcrumb: "管理后台 / 房屋绑定审核",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "房屋绑定申请列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一为后台审核表格页，保留通过、驳回和驳回原因记录。")
            ])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.statusFilter === "" }]),
                onClick: _cache[0] || (_cache[0] = ($event) => $options.applyQuickStatus(""))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "全部申请"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card pending", { active: $data.statusFilter === "PENDING" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.applyQuickStatus("PENDING"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "待审核"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.pending),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card approved", { active: $data.statusFilter === "APPROVED" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.applyQuickStatus("APPROVED"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已通过"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.approved),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card rejected", { active: $data.statusFilter === "REJECTED" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.applyQuickStatus("REJECTED"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已驳回"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.rejected),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "搜索姓名/手机号/房号",
                    onConfirm: _cache[5] || (_cache[5] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "审核状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[6] || (_cache[6] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "待审核 " + vue.toDisplayString($data.stats.pending) + " 条",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "已驳回 " + vue.toDisplayString($data.stats.rejected) + " 条",
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "table-head" }, [
              vue.createElementVNode("text", { class: "table-col col-name" }, "申请人"),
              vue.createElementVNode("text", { class: "table-col col-phone" }, "手机号"),
              vue.createElementVNode("text", { class: "table-col col-house" }, "房屋"),
              vue.createElementVNode("text", { class: "table-col col-identity" }, "身份"),
              vue.createElementVNode("text", { class: "table-col col-time" }, "申请时间"),
              vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
              vue.createElementVNode("text", { class: "table-col col-reason" }, "驳回原因"),
              vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.requestList, (item, index) => {
                return vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: item.id,
                    class: "table-row",
                    style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                  },
                  [
                    vue.createElementVNode("view", { class: "table-col col-name" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "primary-text" },
                        vue.toDisplayString(item.realName || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-phone" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString(item.phone || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-house" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString($options.formatHouse(item)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-identity" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString($options.getIdentityText(item.identityType)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-time" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString($options.formatTime(item.applyTime)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-status" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                        },
                        vue.toDisplayString($options.getStatusText(item.status)),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-reason" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "desc-text" },
                        vue.toDisplayString(item.rejectReason || "无"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                      item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 0,
                        class: "row-btn secondary-warn",
                        onClick: ($event) => $options.openReject(item)
                      }, "驳回", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                      item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 1,
                        class: "row-btn primary",
                        onClick: ($event) => $options.confirmApprove(item)
                      }, "通过", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                    ])
                  ],
                  4
                  /* STYLE */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.requestList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无绑定申请")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.currentPage) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === 1,
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.currentPage === $options.totalPages,
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50, 100],
                  value: $options.pageSizeIndex,
                  onChange: _cache[11] || (_cache[11] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          $data.showRejectModal ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "detail-modal",
            onClick: _cache[17] || (_cache[17] = (...args) => $options.closeReject && $options.closeReject(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content",
              onClick: _cache[16] || (_cache[16] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "驳回申请"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[12] || (_cache[12] = (...args) => $options.closeReject && $options.closeReject(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "detail-item" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "申请人:"),
                  vue.createElementVNode(
                    "text",
                    { class: "detail-value" },
                    vue.toDisplayString($data.currentItem ? $data.currentItem.realName : "-"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "驳回原因:"),
                  vue.withDirectives(vue.createElementVNode(
                    "textarea",
                    {
                      class: "modal-textarea",
                      "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => $data.rejectReason = $event),
                      placeholder: "请输入驳回原因",
                      maxlength: "200"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.rejectReason]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[14] || (_cache[14] = (...args) => $options.closeReject && $options.closeReject(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    onClick: _cache[15] || (_cache[15] = (...args) => $options.submitReject && $options.submitReject(...args))
                  }, "确定")
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminHouseBindReview = /* @__PURE__ */ _export_sfc(_sfc_main$f, [["render", _sfc_render$e], ["__scopeId", "data-v-ded85ad2"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/house-bind-review.vue"]]);
  const _sfc_main$e = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        loading: false,
        searchQuery: "",
        statusFilter: "",
        rawActivityList: [],
        activityList: [],
        total: 0,
        stats: {
          total: 0,
          published: 0,
          online: 0,
          draft: 0
        },
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "PUBLISHED", label: "已发布" },
          { value: "ONLINE", label: "报名中" },
          { value: "DRAFT", label: "草稿" },
          { value: "ENDED", label: "已结束" }
        ]
      };
    },
    computed: {
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.statusFilter));
      },
      currentStatusLabel() {
        const current = this.statusOptions.find((item) => item.value === this.statusFilter);
        return current ? current.label : "全部状态";
      }
    },
    onShow() {
      this.loadData();
    },
    methods: {
      normalizeActivityResponse(data) {
        if (Array.isArray(data))
          return data;
        if (Array.isArray(data.records))
          return data.records;
        if (data.data && Array.isArray(data.data.records))
          return data.data.records;
        if (data.data && Array.isArray(data.data))
          return data.data;
        return [];
      },
      calculateStats(list = this.rawActivityList) {
        const stats = {
          total: list.length,
          published: 0,
          online: 0,
          draft: 0
        };
        list.forEach((item) => {
          if (item.status === "PUBLISHED")
            stats.published += 1;
          if (item.status === "ONLINE")
            stats.online += 1;
          if (item.status === "DRAFT")
            stats.draft += 1;
        });
        this.stats = stats;
      },
      applyStatusFilter() {
        const filtered = this.statusFilter ? this.rawActivityList.filter((item) => item.status === this.statusFilter) : this.rawActivityList.slice();
        this.activityList = filtered;
        this.total = filtered.length;
      },
      async loadData() {
        this.loading = true;
        try {
          const params = {
            keyword: this.searchQuery || void 0
          };
          const data = await request("/api/activity/list", { params }, "GET");
          const list = this.normalizeActivityResponse(data);
          this.rawActivityList = list.map((item) => ({
            id: item.id,
            title: item.title,
            startTime: item.startTime,
            location: item.location,
            signupCount: item.signupCount || 0,
            maxCount: item.maxCount,
            status: item.status,
            cover: item.cover || "/static/default-cover.png"
          }));
          this.calculateStats();
          this.applyStatusFilter();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/activity-manage.vue:241", "加载活动列表失败", error);
          this.rawActivityList = [];
          this.activityList = [];
          this.total = 0;
          this.calculateStats();
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      handleSearch() {
        this.loadData();
      },
      handleResetFilters() {
        this.searchQuery = "";
        this.statusFilter = "";
        this.loadData();
      },
      applyQuickStatus(status) {
        this.statusFilter = status;
        this.applyStatusFilter();
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.statusFilter = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
        this.applyStatusFilter();
      },
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
            if (!res.confirm)
              return;
            try {
              await request(`/api/activity/${item.id}`, {}, "DELETE");
              uni.showToast({ title: "删除成功", icon: "success" });
              this.loadData();
            } catch (error) {
              uni.showToast({ title: "删除失败", icon: "none" });
            }
          }
        });
      },
      getStatusClass(status) {
        const map = {
          PUBLISHED: "status-published",
          DRAFT: "status-draft",
          ONLINE: "status-online",
          ENDED: "status-ended"
        };
        return map[status] || "status-default";
      },
      getStatusText(status) {
        const map = {
          PUBLISHED: "已发布",
          DRAFT: "草稿",
          ONLINE: "报名中",
          ENDED: "已结束"
        };
        return map[status] || status || "-";
      },
      formatTime(time) {
        if (!time)
          return "-";
        const date = new Date(String(time).replace(" ", "T"));
        if (Number.isNaN(date.getTime()))
          return String(time);
        return date.toLocaleString();
      }
    }
  };
  function _sfc_render$d(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[10] || (_cache[10] = ($event) => $data.showSidebar = $event),
      pageTitle: "社区活动",
      currentPage: "/admin/pages/admin/activity-manage",
      pageBreadcrumb: "管理后台 / 社区活动",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "社区活动列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一为后台活动管理表格页，保留发布、编辑、报名管理与删除操作。")
            ]),
            vue.createElementVNode("button", {
              class: "primary-action-btn",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.handleCreate && $options.handleCreate(...args))
            }, "发布新活动")
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.statusFilter === "" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.applyQuickStatus(""))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "全部活动"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card published", { active: $data.statusFilter === "PUBLISHED" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.applyQuickStatus("PUBLISHED"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已发布"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.published),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card online", { active: $data.statusFilter === "ONLINE" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.applyQuickStatus("ONLINE"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "报名中"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.online),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card draft", { active: $data.statusFilter === "DRAFT" }]),
                onClick: _cache[4] || (_cache[4] = ($event) => $options.applyQuickStatus("DRAFT"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "草稿"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.stats.draft),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "搜索活动标题、地点",
                    onConfirm: _cache[6] || (_cache[6] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "活动状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "共 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "报名中 " + vue.toDisplayString($data.stats.online) + " 条",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "草稿 " + vue.toDisplayString($data.stats.draft) + " 条",
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "table-head" }, [
              vue.createElementVNode("text", { class: "table-col col-title" }, "活动标题"),
              vue.createElementVNode("text", { class: "table-col col-cover" }, "封面"),
              vue.createElementVNode("text", { class: "table-col col-time" }, "开始时间"),
              vue.createElementVNode("text", { class: "table-col col-location" }, "地点"),
              vue.createElementVNode("text", { class: "table-col col-signup" }, "报名人数"),
              vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
              vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.activityList, (item, index) => {
                return vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: item.id,
                    class: "table-row",
                    style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                  },
                  [
                    vue.createElementVNode("view", { class: "table-col col-title" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "primary-text" },
                        vue.toDisplayString(item.title || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-cover" }, [
                      vue.createElementVNode("image", {
                        src: item.cover || "/static/default-cover.png",
                        mode: "aspectFill",
                        class: "cover-thumb"
                      }, null, 8, ["src"])
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-time" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "minor-text" },
                        vue.toDisplayString($options.formatTime(item.startTime)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-location" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString(item.location || "-"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-signup" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "plain-text" },
                        vue.toDisplayString(item.signupCount) + "/" + vue.toDisplayString(item.maxCount || "不限"),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-status" }, [
                      vue.createElementVNode(
                        "text",
                        {
                          class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                        },
                        vue.toDisplayString($options.getStatusText(item.status)),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                      vue.createElementVNode("button", {
                        class: "row-btn ghost",
                        onClick: ($event) => $options.handleEdit(item)
                      }, "编辑", 8, ["onClick"]),
                      vue.createElementVNode("button", {
                        class: "row-btn primary",
                        onClick: ($event) => $options.handleViewSignups(item)
                      }, "报名管理", 8, ["onClick"]),
                      vue.createElementVNode("button", {
                        class: "row-btn danger",
                        onClick: ($event) => $options.handleDelete(item)
                      }, "删除", 8, ["onClick"])
                    ])
                  ],
                  4
                  /* STYLE */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.activityList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无活动")
            ])) : vue.createCommentVNode("v-if", true)
          ]))
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminActivityManage = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["render", _sfc_render$d], ["__scopeId", "data-v-de138e10"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/activity-manage.vue"]]);
  const _sfc_main$d = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
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
      }
    },
    methods: {
      async loadActivityData(id) {
        try {
          uni.showLoading({ title: "加载中..." });
          const res = await request(`/api/activity/${id}`, {}, "GET");
          if (res) {
            const source = String(res.startTime || "").replace(" ", "T");
            const [date, time] = source.split("T");
            this.form = {
              title: res.title || "",
              content: res.content || "",
              date: date || "",
              time: (time || "").slice(0, 5),
              location: res.location || "",
              maxCount: res.maxCount != null ? String(res.maxCount) : ""
            };
          }
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/activity-edit.vue:122", "加载活动失败", error);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          uni.hideLoading();
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
      buildStartTime() {
        let rawTime = this.form.time || "00:00";
        if (rawTime.length > 5) {
          rawTime = rawTime.substring(0, 5);
        }
        const cleanTime = `${rawTime}:00`;
        const cleanDate = this.form.date.includes(" ") ? this.form.date.split(" ")[0] : this.form.date;
        return `${cleanDate} ${cleanTime}`;
      },
      async submitData(status) {
        try {
          uni.showLoading({ title: "提交中..." });
          const data = {
            id: this.activityId ? parseInt(this.activityId, 10) : void 0,
            title: this.form.title,
            content: this.form.content,
            startTime: this.buildStartTime(),
            location: this.form.location,
            maxCount: this.form.maxCount ? parseInt(this.form.maxCount, 10) : null,
            status,
            coverUrl: ""
          };
          if (this.activityId) {
            await request("/api/activity", data, "PUT");
          } else {
            await request("/api/activity/publish", data, "POST");
          }
          uni.showToast({
            title: status === "DRAFT" ? "已存草稿" : "发布成功",
            icon: "success"
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1200);
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/activity-edit.vue:199", "活动提交失败", error);
          uni.showToast({ title: "提交失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      }
    }
  };
  function _sfc_render$c(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[8] || (_cache[8] = ($event) => $data.showSidebar = $event),
      pageTitle: $data.activityId ? "编辑活动" : "发布活动",
      currentPage: "/admin/pages/admin/activity-manage",
      pageBreadcrumb: $data.activityId ? "管理后台 / 社区活动 / 编辑活动" : "管理后台 / 社区活动 / 发布活动",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "edit-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode(
                "text",
                { class: "overview-title" },
                vue.toDisplayString($data.activityId ? "活动编辑" : "活动发布"),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一使用后台表单页结构，保留草稿保存和正式发布流程。")
            ]),
            vue.createElementVNode("view", { class: "overview-chip" }, [
              vue.createElementVNode("text", { class: "overview-chip-label" }, "当前模式"),
              vue.createElementVNode(
                "text",
                { class: "overview-chip-value" },
                vue.toDisplayString($data.activityId ? "编辑中" : "新建中"),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "form-card" }, [
            vue.createElementVNode("view", { class: "form-grid" }, [
              vue.createElementVNode("view", { class: "form-field form-field-wide" }, [
                vue.createElementVNode("text", { class: "form-label required" }, "活动标题"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "form-input",
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
              vue.createElementVNode("view", { class: "form-field" }, [
                vue.createElementVNode("text", { class: "form-label required" }, "活动日期"),
                vue.createElementVNode(
                  "picker",
                  {
                    mode: "date",
                    onChange: _cache[1] || (_cache[1] = (...args) => $options.bindDateChange && $options.bindDateChange(...args))
                  },
                  [
                    vue.createElementVNode(
                      "view",
                      {
                        class: vue.normalizeClass(["picker-box", { "has-val": !!$data.form.date }])
                      },
                      [
                        vue.createElementVNode(
                          "text",
                          null,
                          vue.toDisplayString($data.form.date || "请选择日期"),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("text", { class: "picker-icon" }, ">")
                      ],
                      2
                      /* CLASS */
                    )
                  ],
                  32
                  /* NEED_HYDRATION */
                )
              ]),
              vue.createElementVNode("view", { class: "form-field" }, [
                vue.createElementVNode("text", { class: "form-label" }, "活动时间"),
                vue.createElementVNode(
                  "picker",
                  {
                    mode: "time",
                    onChange: _cache[2] || (_cache[2] = (...args) => $options.bindTimeChange && $options.bindTimeChange(...args))
                  },
                  [
                    vue.createElementVNode(
                      "view",
                      {
                        class: vue.normalizeClass(["picker-box", { "has-val": !!$data.form.time }])
                      },
                      [
                        vue.createElementVNode(
                          "text",
                          null,
                          vue.toDisplayString($data.form.time || "请选择时间"),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("text", { class: "picker-icon" }, ">")
                      ],
                      2
                      /* CLASS */
                    )
                  ],
                  32
                  /* NEED_HYDRATION */
                )
              ]),
              vue.createElementVNode("view", { class: "form-field" }, [
                vue.createElementVNode("text", { class: "form-label required" }, "活动地点"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "form-input",
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
              vue.createElementVNode("view", { class: "form-field" }, [
                vue.createElementVNode("text", { class: "form-label" }, "最大报名人数"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "form-input",
                    type: "number",
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.form.maxCount = $event),
                    placeholder: "0 表示不限"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.form.maxCount]
                ])
              ]),
              vue.createElementVNode("view", { class: "form-field form-field-wide" }, [
                vue.createElementVNode("text", { class: "form-label" }, "活动详情"),
                vue.withDirectives(vue.createElementVNode(
                  "textarea",
                  {
                    class: "form-textarea",
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.form.content = $event),
                    placeholder: "请输入活动详情描述"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.form.content]
                ]),
                vue.createElementVNode("text", { class: "field-tip" }, "发布时间将按后端返回状态进行管理，编辑时沿用当前活动 ID。")
              ])
            ])
          ]),
          vue.createElementVNode("view", { class: "action-bar-card" }, [
            vue.createElementVNode("button", {
              class: "warn-btn",
              onClick: _cache[6] || (_cache[6] = (...args) => $options.handleDraft && $options.handleDraft(...args))
            }, "存为草稿"),
            vue.createElementVNode(
              "button",
              {
                class: "primary-btn",
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handlePublishCheck && $options.handlePublishCheck(...args))
              },
              vue.toDisplayString($data.activityId ? "保存并发布" : "立即发布"),
              1
              /* TEXT */
            )
          ])
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar", "pageTitle", "pageBreadcrumb"]);
  }
  const AdminPagesAdminActivityEdit = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["render", _sfc_render$c], ["__scopeId", "data-v-3b54f228"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/activity-edit.vue"]]);
  const _sfc_main$c = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        activityId: null,
        list: [],
        total: 0,
        loading: false,
        pageNum: 1,
        pageSize: 20,
        searchQuery: "",
        statusFilter: "",
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: "SIGNED", label: "已报名" },
          { value: "CANCELLED", label: "已取消" }
        ]
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
      },
      pageSizeIndex() {
        const options = [10, 20, 50];
        return Math.max(0, options.indexOf(this.pageSize));
      },
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.statusFilter));
      },
      currentStatusLabel() {
        const current = this.statusOptions.find((item) => item.value === this.statusFilter);
        return current ? current.label : "全部状态";
      },
      pageStats() {
        return this.list.reduce((stats, item) => {
          stats.total += 1;
          if (item.status === "CANCELLED") {
            stats.cancelled += 1;
          } else {
            stats.signed += 1;
          }
          return stats;
        }, {
          total: 0,
          signed: 0,
          cancelled: 0
        });
      },
      displayList() {
        const keyword = this.searchQuery.trim().toLowerCase();
        return this.list.filter((item) => {
          const matchesStatus = !this.statusFilter || this.normalizeStatus(item.status) === this.statusFilter;
          if (!matchesStatus)
            return false;
          if (!keyword)
            return true;
          const haystack = `${item.userName || ""} ${item.userPhone || ""}`.toLowerCase();
          return haystack.includes(keyword);
        });
      }
    },
    onLoad(options) {
      if (options.id) {
        this.activityId = options.id;
        this.loadData();
      }
    },
    methods: {
      normalizeStatus(status) {
        return status === "CANCELLED" ? "CANCELLED" : "SIGNED";
      },
      async loadData() {
        var _a, _b;
        if (!this.activityId || this.loading)
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
          const records = res.records || ((_a = res.data) == null ? void 0 : _a.records) || res.data || [];
          this.list = Array.isArray(records) ? records : [];
          this.total = Number(res.total || ((_b = res.data) == null ? void 0 : _b.total) || this.list.length || 0);
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/activity-signups.vue:244", "加载报名列表失败", error);
          uni.showToast({ title: "加载失败", icon: "none" });
          this.list = [];
          this.total = 0;
        } finally {
          this.loading = false;
        }
      },
      handleRefresh() {
        this.loadData();
      },
      handleResetFilters() {
        this.searchQuery = "";
        this.statusFilter = "";
      },
      handleStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.statusFilter = ((_b = this.statusOptions[index]) == null ? void 0 : _b.value) || "";
      },
      handlePrevPage() {
        if (this.pageNum <= 1)
          return;
        this.pageNum -= 1;
        this.loadData();
      },
      handleNextPage() {
        if (this.pageNum >= this.totalPages)
          return;
        this.pageNum += 1;
        this.loadData();
      },
      handlePageSizeChange(e) {
        var _a;
        const options = [10, 20, 50];
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.pageSize = options[index] || 20;
        this.pageNum = 1;
        this.loadData();
      },
      getStatusClass(status) {
        return this.normalizeStatus(status) === "CANCELLED" ? "status-cancelled" : "status-signed";
      },
      getStatusText(status) {
        return this.normalizeStatus(status) === "CANCELLED" ? "已取消" : "已报名";
      },
      formatTime(time) {
        if (!time)
          return "-";
        return String(time).replace("T", " ");
      }
    }
  };
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[10] || (_cache[10] = ($event) => $data.showSidebar = $event),
      pageTitle: "活动报名",
      currentPage: "/admin/pages/admin/activity-manage",
      pageBreadcrumb: "管理后台 / 社区活动 / 报名管理",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "活动报名列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一按后台表格页展示当前活动的报名记录，并支持当前页快速筛选。")
            ]),
            vue.createElementVNode("view", { class: "overview-chip" }, [
              vue.createElementVNode("text", { class: "overview-chip-label" }, "活动 ID"),
              vue.createElementVNode(
                "text",
                { class: "overview-chip-value" },
                vue.toDisplayString($data.activityId || "-"),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar signup-status-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.statusFilter === "" }]),
                onClick: _cache[0] || (_cache[0] = ($event) => $data.statusFilter = "")
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "当前页总数"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.pageStats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card signed", { active: $data.statusFilter === "SIGNED" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $data.statusFilter = "SIGNED")
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已报名"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.pageStats.signed),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card cancelled", { active: $data.statusFilter === "CANCELLED" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $data.statusFilter = "CANCELLED")
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已取消"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.pageStats.cancelled),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid signup-query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "按姓名或手机号筛选当前页"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "报名状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[4] || (_cache[4] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[5] || (_cache[5] = (...args) => $options.handleRefresh && $options.handleRefresh(...args))
              }, "刷新"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[6] || (_cache[6] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "活动总报名 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "当前页显示 " + vue.toDisplayString($options.displayList.length) + " 条",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "每页 " + vue.toDisplayString($data.pageSize) + " 条",
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "scroll-table" }, [
              vue.createElementVNode("view", { class: "table-head signup-table" }, [
                vue.createElementVNode("text", { class: "table-col col-index" }, "序号"),
                vue.createElementVNode("text", { class: "table-col col-name" }, "报名人"),
                vue.createElementVNode("text", { class: "table-col col-phone" }, "联系电话"),
                vue.createElementVNode("text", { class: "table-col col-time" }, "报名时间"),
                vue.createElementVNode("text", { class: "table-col col-status" }, "状态")
              ]),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($options.displayList, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: item.id || `${item.userName}-${index}`,
                      class: "table-row signup-table",
                      style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                    },
                    [
                      vue.createElementVNode("view", { class: "table-col col-index" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString(($data.pageNum - 1) * $data.pageSize + index + 1),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-name" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "primary-text" },
                          vue.toDisplayString(item.userName || "未知用户"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-phone" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(item.userPhone || "暂无电话"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-time" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString($options.formatTime(item.signupTime)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-status" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                          },
                          vue.toDisplayString($options.getStatusText(item.status)),
                          3
                          /* TEXT, CLASS */
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
            $options.displayList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无报名记录")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.pageNum) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.pageNum <= 1,
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.pageNum >= $options.totalPages,
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: [10, 20, 50],
                  value: $options.pageSizeIndex,
                  onChange: _cache[9] || (_cache[9] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminActivitySignups = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__scopeId", "data-v-f56b704f"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/activity-signups.vue"]]);
  const _sfc_main$b = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        currentTab: "PENDING",
        list: [],
        searchQuery: "",
        historyStatusFilter: "",
        historyStatusOptions: [
          { value: "", label: "全部记录" },
          { value: "APPROVED", label: "已通过" },
          { value: "REJECTED", label: "已拒绝" },
          { value: "AWAITING_PAYMENT", label: "待缴费" }
        ]
      };
    },
    computed: {
      pendingCount() {
        return this.currentTab === "PENDING" ? this.list.length : 0;
      },
      historyCount() {
        if (this.currentTab !== "HISTORY")
          return 0;
        return this.list.length;
      },
      approvedCount() {
        return this.list.filter((item) => item.status === "APPROVED").length;
      },
      rejectedCount() {
        return this.list.filter((item) => item.status === "REJECTED").length;
      },
      historyStatusIndex() {
        return Math.max(0, this.historyStatusOptions.findIndex((item) => item.value === this.historyStatusFilter));
      },
      currentHistoryStatusLabel() {
        const current = this.historyStatusOptions.find((item) => item.value === this.historyStatusFilter);
        return current ? current.label : "全部记录";
      },
      displayList() {
        const keyword = this.searchQuery.trim().toLowerCase();
        return this.list.filter((item) => {
          if (this.currentTab === "HISTORY" && this.historyStatusFilter && item.status !== this.historyStatusFilter) {
            return false;
          }
          if (!keyword)
            return true;
          const haystack = `${item.plateNo || ""} ${item.ownerName || ""} ${item.phone || ""} ${item.spaceNo || ""}`.toLowerCase();
          return haystack.includes(keyword);
        });
      }
    },
    onShow() {
      this.loadData();
    },
    methods: {
      switchTab(tab) {
        this.currentTab = tab;
        this.searchQuery = "";
        if (tab === "PENDING") {
          this.historyStatusFilter = "";
        }
        this.loadData();
      },
      handleHistoryStatus(status) {
        this.currentTab = "HISTORY";
        this.historyStatusFilter = status;
        this.loadData();
      },
      handleHistoryStatusChange(e) {
        var _a, _b;
        const index = Number(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.value) || 0);
        this.historyStatusFilter = ((_b = this.historyStatusOptions[index]) == null ? void 0 : _b.value) || "";
      },
      handleResetFilters() {
        this.searchQuery = "";
        this.historyStatusFilter = "";
      },
      statusText(status) {
        const map = {
          PENDING: "待审核",
          APPROVED: "已通过",
          REJECTED: "已拒绝",
          AWAITING_PAYMENT: "待缴费"
        };
        return map[status] || status || "-";
      },
      getStatusClass(status) {
        const map = {
          PENDING: "status-pending",
          APPROVED: "status-approved",
          REJECTED: "status-rejected",
          AWAITING_PAYMENT: "status-awaiting"
        };
        return map[status] || "status-awaiting";
      },
      async loadData() {
        var _a;
        try {
          uni.showLoading({ title: "加载中..." });
          const status = this.currentTab === "PENDING" ? "PENDING" : "";
          const res = await request({
            url: "/api/vehicle/audit/list",
            method: "GET",
            params: { status }
          });
          const rawList = Array.isArray(res) ? res : res.records || ((_a = res.data) == null ? void 0 : _a.records) || [];
          const normalized = rawList.map((item) => ({
            ...item,
            ownerName: item.ownerName || item.userName || item.name || "未知用户",
            phone: item.phone || item.mobile || item.phoneNumber || "-",
            brand: item.brand || item.carBrand || "-",
            color: item.color || item.carColor || "-"
          }));
          this.list = this.currentTab === "HISTORY" ? normalized.filter((item) => item.status !== "PENDING") : normalized;
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/car-audit.vue:272", "加载车辆审核失败", error);
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
            },
            {
              id: 3,
              plateNo: "沪C67890",
              status: "REJECTED",
              ownerName: "王五",
              phone: "13700137000",
              brand: "特斯拉",
              color: "灰色",
              spaceNo: "B-201",
              createTime: "2023-10-25 09:10:00",
              rejectReason: "资料不完整"
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
            if (!res.confirm)
              return;
            await this.submitAudit(item.id, "APPROVED");
          }
        });
      },
      handleReject(item) {
        uni.showModal({
          title: "拒绝申请",
          editable: true,
          placeholderText: "请输入拒绝原因",
          success: async (res) => {
            if (!res.confirm)
              return;
            const reason = res.content;
            if (!reason) {
              uni.showToast({ title: "请输入原因", icon: "none" });
              return;
            }
            await this.submitAudit(item.id, "REJECTED", reason);
          }
        });
      },
      async submitAudit(id, status, reason = "") {
        try {
          uni.showLoading({ title: "处理中..." });
          await request("/api/vehicle/audit", {
            id,
            status,
            rejectReason: reason
          }, "POST");
          uni.showToast({ title: "操作成功", icon: "success" });
          this.loadData();
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/car-audit.vue:358", "车辆审核操作失败", error);
          uni.showToast({ title: "操作成功(演示)", icon: "success" });
          this.list = this.list.filter((item) => item.id !== id);
        } finally {
          uni.hideLoading();
        }
      },
      formatTime(time) {
        if (!time)
          return "-";
        return String(time).replace("T", " ");
      }
    }
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[8] || (_cache[8] = ($event) => $data.showSidebar = $event),
      pageTitle: "车辆审核",
      currentPage: "/admin/pages/admin/car-audit",
      pageBreadcrumb: "管理后台 / 停车管理 / 车辆审核",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "车辆审核列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一为后台审核表格页，保留通过、拒绝和审核历史切换。")
            ]),
            vue.createElementVNode("view", { class: "overview-chip" }, [
              vue.createElementVNode("text", { class: "overview-chip-label" }, "当前视图"),
              vue.createElementVNode(
                "text",
                { class: "overview-chip-value" },
                vue.toDisplayString($data.currentTab === "PENDING" ? "待审核" : "审核记录"),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar car-status-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card pending", { active: $data.currentTab === "PENDING" }]),
                onClick: _cache[0] || (_cache[0] = ($event) => $options.switchTab("PENDING"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "待审核"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.currentTab === "PENDING" ? $data.list.length : $options.pendingCount),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card history", { active: $data.currentTab === "HISTORY" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.switchTab("HISTORY"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "审核记录"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($data.currentTab === "HISTORY" ? $data.list.length : $options.historyCount),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card approved", { active: $data.historyStatusFilter === "APPROVED" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.handleHistoryStatus("APPROVED"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已通过"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.approvedCount),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card rejected", { active: $data.historyStatusFilter === "REJECTED" }]),
                onClick: _cache[3] || (_cache[3] = ($event) => $options.handleHistoryStatus("REJECTED"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "已拒绝"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.rejectedCount),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid car-query-grid" }, [
              vue.createElementVNode("view", { class: "query-field query-field-wide" }, [
                vue.createElementVNode("text", { class: "query-label" }, "关键词"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.searchQuery = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "按车牌号、申请人或车位号筛选当前列表"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.searchQuery]
                ])
              ]),
              $data.currentTab === "HISTORY" ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "query-field"
              }, [
                vue.createElementVNode("text", { class: "query-label" }, "记录状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.historyStatusOptions,
                  "range-key": "label",
                  value: $options.historyStatusIndex,
                  onChange: _cache[5] || (_cache[5] = (...args) => $options.handleHistoryStatusChange && $options.handleHistoryStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentHistoryStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[6] || (_cache[6] = (...args) => $options.loadData && $options.loadData(...args))
              }, "刷新"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[7] || (_cache[7] = (...args) => $options.handleResetFilters && $options.handleResetFilters(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "当前列表 " + vue.toDisplayString($options.displayList.length) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                vue.toDisplayString($data.currentTab === "PENDING" ? "待审核视图" : "历史记录视图"),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "table-panel" }, [
            vue.createElementVNode("view", { class: "scroll-table" }, [
              vue.createElementVNode("view", { class: "table-head car-table" }, [
                vue.createElementVNode("text", { class: "table-col col-plate" }, "车牌号"),
                vue.createElementVNode("text", { class: "table-col col-owner" }, "申请人"),
                vue.createElementVNode("text", { class: "table-col col-car" }, "车辆信息"),
                vue.createElementVNode("text", { class: "table-col col-space" }, "申请车位"),
                vue.createElementVNode("text", { class: "table-col col-time" }, "申请时间"),
                vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
                vue.createElementVNode("text", { class: "table-col col-reason" }, "拒绝原因"),
                vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
              ]),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($options.displayList, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: item.id || `${item.plateNo}-${index}`,
                      class: "table-row car-table",
                      style: vue.normalizeStyle({ animationDelay: `${Math.min(320, index * 40)}ms` })
                    },
                    [
                      vue.createElementVNode("view", { class: "table-col col-plate" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "primary-text" },
                          vue.toDisplayString(item.plateNo || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-owner" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(item.ownerName || "未知用户"),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString(item.phone || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-car" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(item.brand || "-"),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString(item.color || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-space" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(item.spaceNo || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-time" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString($options.formatTime(item.createTime)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-status" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                          },
                          vue.toDisplayString($options.statusText(item.status)),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-reason" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "desc-text" },
                          vue.toDisplayString(item.rejectReason || "无"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                        item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "row-btn secondary-warn",
                          onClick: ($event) => $options.handleReject(item)
                        }, "拒绝", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                        item.status === "PENDING" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 1,
                          class: "row-btn primary",
                          onClick: ($event) => $options.handleApprove(item)
                        }, "通过", 8, ["onClick"])) : (vue.openBlock(), vue.createElementBlock("text", {
                          key: 2,
                          class: "minor-text"
                        }, "已处理"))
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
            $options.displayList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无数据")
            ])) : vue.createCommentVNode("v-if", true)
          ])
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminCarAudit = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__scopeId", "data-v-9dc841ea"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/car-audit.vue"]]);
  const _sfc_main$a = {
    components: {
      adminSidebar
    },
    data() {
      return {
        showSidebar: false,
        loading: false,
        pageSizeOptions: [10, 20, 50],
        queryParams: {
          pageNum: 1,
          pageSize: 10,
          title: "",
          operName: "",
          status: ""
        },
        statusOptions: [
          { value: "", label: "全部状态" },
          { value: 0, label: "正常" },
          { value: 1, label: "异常" }
        ],
        logList: [],
        total: 0,
        showDetailModal: false,
        currentLog: {}
      };
    },
    computed: {
      totalPages() {
        return Math.max(1, Math.ceil(this.total / this.queryParams.pageSize));
      },
      pageSizeIndex() {
        return Math.max(0, this.pageSizeOptions.indexOf(this.queryParams.pageSize));
      },
      statusPickerIndex() {
        return Math.max(0, this.statusOptions.findIndex((item) => item.value === this.queryParams.status));
      },
      currentStatusLabel() {
        const current = this.statusOptions.find((item) => item.value === this.queryParams.status);
        return current ? current.label : "全部状态";
      },
      pageStats() {
        return this.logList.reduce((stats, item) => {
          stats.total += 1;
          if (Number(item.status) === 0) {
            stats.normal += 1;
          } else {
            stats.fail += 1;
          }
          return stats;
        }, {
          total: 0,
          normal: 0,
          fail: 0
        });
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
          this.logList = Array.isArray(records) ? records : [];
        } catch (error) {
          formatAppLog("error", "at admin/pages/admin/oper-log.vue:299", "加载日志失败", error);
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
        const index = Number(e.detail.value);
        this.queryParams.status = this.statusOptions[index].value;
      },
      applyQuickStatus(status) {
        this.queryParams.status = status;
        this.queryParams.pageNum = 1;
        this.loadData();
      },
      handlePageSizeChange(e) {
        const index = Number(e.detail.value);
        const pageSize = this.pageSizeOptions[index];
        if (pageSize) {
          this.queryParams.pageSize = pageSize;
          this.queryParams.pageNum = 1;
          this.loadData();
        }
      },
      handlePrevPage() {
        if (this.queryParams.pageNum > 1) {
          this.queryParams.pageNum -= 1;
          this.loadData();
        }
      },
      handleNextPage() {
        if (this.queryParams.pageNum < this.totalPages) {
          this.queryParams.pageNum += 1;
          this.loadData();
        }
      },
      handleClean() {
        uni.showModal({
          title: "清空日志",
          content: "确定要清空所有操作日志吗？该操作不可恢复。",
          confirmColor: "#ee6374",
          success: async (res) => {
            if (!res.confirm)
              return;
            try {
              await request("/api/monitor/operlog/clean", {}, "DELETE");
              uni.showToast({ title: "清空成功", icon: "success" });
              this.handleReset();
            } catch (error) {
              formatAppLog("error", "at admin/pages/admin/oper-log.vue:361", "清空日志失败", error);
              uni.showToast({ title: "清空失败", icon: "none" });
            }
          }
        });
      },
      handleDetail(item) {
        this.currentLog = item || {};
        this.showDetailModal = true;
      },
      closeDetailModal() {
        this.showDetailModal = false;
        this.currentLog = {};
      },
      getStatusClass(status) {
        return Number(status) === 0 ? "status-normal" : "status-fail";
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
        return map[type] || type || "-";
      },
      formatTime(time) {
        if (!time)
          return "-";
        const date = new Date(time);
        if (Number.isNaN(date.getTime()))
          return time;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        const second = String(date.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[17] || (_cache[17] = ($event) => $data.showSidebar = $event),
      pageTitle: "操作日志",
      currentPage: "/admin/pages/admin/oper-log",
      pageBreadcrumb: "管理后台 / 操作日志",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "系统操作日志"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一使用后台表格页展示系统模块操作记录，保留条件筛选、分页和日志详情查看。")
            ]),
            vue.createElementVNode("view", { class: "overview-chip" }, [
              vue.createElementVNode("text", { class: "overview-chip-label" }, "当前页码"),
              vue.createElementVNode(
                "text",
                { class: "overview-chip-value" },
                vue.toDisplayString($data.queryParams.pageNum),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar oper-status-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: $data.queryParams.status === "" }]),
                onClick: _cache[0] || (_cache[0] = ($event) => $options.applyQuickStatus(""))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "当前页总数"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.pageStats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card success", { active: $data.queryParams.status === 0 }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.applyQuickStatus(0))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "正常日志"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.pageStats.normal),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card fail", { active: $data.queryParams.status === 1 }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.applyQuickStatus(1))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "异常日志"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.pageStats.fail),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid oper-query-grid" }, [
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "模块标题"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.queryParams.title = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "请输入模块标题",
                    onConfirm: _cache[4] || (_cache[4] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.queryParams.title]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "操作人员"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.queryParams.operName = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "请输入操作人员",
                    onConfirm: _cache[6] || (_cache[6] = (...args) => $options.handleSearch && $options.handleSearch(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.queryParams.operName]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "执行状态"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.statusOptions,
                  "range-key": "label",
                  value: $options.statusPickerIndex,
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleStatusChange && $options.handleStatusChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentStatusLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.handleReset && $options.handleReset(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "日志总量 " + vue.toDisplayString($data.total) + " 条",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                "当前页 " + vue.toDisplayString($data.logList.length) + " 条",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode("button", {
                class: "row-btn danger",
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handleClean && $options.handleClean(...args))
              }, "清空日志")
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "scroll-table" }, [
              vue.createElementVNode("view", { class: "table-head oper-table" }, [
                vue.createElementVNode("text", { class: "table-col col-id" }, "日志编号"),
                vue.createElementVNode("text", { class: "table-col col-title" }, "系统模块"),
                vue.createElementVNode("text", { class: "table-col col-type" }, "业务类型"),
                vue.createElementVNode("text", { class: "table-col col-user" }, "操作人员"),
                vue.createElementVNode("text", { class: "table-col col-status" }, "状态"),
                vue.createElementVNode("text", { class: "table-col col-time" }, "操作时间"),
                vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
              ]),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.logList, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: item.id || index,
                      class: "table-row oper-table",
                      style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                    },
                    [
                      vue.createElementVNode("view", { class: "table-col col-id" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          "#" + vue.toDisplayString(item.id),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-title" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "primary-text" },
                          vue.toDisplayString(item.title || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-type" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString($options.getBusinessType(item.businessType)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-user" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "plain-text" },
                          vue.toDisplayString(item.operName || "-"),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-status" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["status-pill", $options.getStatusClass(item.status)])
                          },
                          vue.toDisplayString(item.status === 0 ? "正常" : "失败"),
                          3
                          /* TEXT, CLASS */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-time" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "minor-text" },
                          vue.toDisplayString($options.formatTime(item.operTime)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                        vue.createElementVNode("button", {
                          class: "row-btn ghost",
                          onClick: ($event) => $options.handleDetail(item)
                        }, "查看详情", 8, ["onClick"])
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
            $data.logList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无操作日志")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.total > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "pagination"
          }, [
            vue.createElementVNode("view", { class: "page-meta" }, [
              vue.createElementVNode(
                "text",
                null,
                "第 " + vue.toDisplayString($data.queryParams.pageNum) + " / " + vue.toDisplayString($options.totalPages) + " 页",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "page-controls" }, [
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.queryParams.pageNum <= 1,
                onClick: _cache[11] || (_cache[11] = (...args) => $options.handlePrevPage && $options.handlePrevPage(...args))
              }, "上一页", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "page-btn",
                disabled: $data.queryParams.pageNum >= $options.totalPages,
                onClick: _cache[12] || (_cache[12] = (...args) => $options.handleNextPage && $options.handleNextPage(...args))
              }, "下一页", 8, ["disabled"]),
              vue.createElementVNode("view", { class: "page-size" }, [
                vue.createElementVNode("text", null, "每页"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.pageSizeOptions,
                  value: $options.pageSizeIndex,
                  onChange: _cache[13] || (_cache[13] = (...args) => $options.handlePageSizeChange && $options.handlePageSizeChange(...args))
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "page-size-text" },
                    vue.toDisplayString($data.queryParams.pageSize) + " 条",
                    1
                    /* TEXT */
                  )
                ], 40, ["range", "value"])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          $data.showDetailModal ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "detail-modal",
            onClick: _cache[16] || (_cache[16] = (...args) => $options.closeDetailModal && $options.closeDetailModal(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content log-detail-content",
              onClick: _cache[15] || (_cache[15] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode("text", { class: "detail-title" }, "操作日志详情"),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[14] || (_cache[14] = (...args) => $options.closeDetailModal && $options.closeDetailModal(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("scroll-view", {
                "scroll-y": "",
                class: "log-detail-scroll"
              }, [
                vue.createElementVNode("view", { class: "detail-body" }, [
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "操作模块:"),
                    vue.createElementVNode(
                      "text",
                      { class: "detail-value" },
                      vue.toDisplayString($data.currentLog.title || "-") + " / " + vue.toDisplayString($options.getBusinessType($data.currentLog.businessType)),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "请求地址:"),
                    vue.createElementVNode(
                      "text",
                      { class: "detail-value" },
                      vue.toDisplayString($data.currentLog.operUrl || "-"),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "请求方式:"),
                    vue.createElementVNode(
                      "text",
                      { class: "detail-value" },
                      vue.toDisplayString($data.currentLog.requestMethod || "-"),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "操作方法:"),
                    vue.createElementVNode(
                      "text",
                      { class: "detail-value log-code" },
                      vue.toDisplayString($data.currentLog.method || "-"),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "请求参数:"),
                    vue.createElementVNode(
                      "text",
                      { class: "detail-value log-code" },
                      vue.toDisplayString($data.currentLog.operParam || "-"),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "返回结果:"),
                    vue.createElementVNode(
                      "text",
                      { class: "detail-value log-code" },
                      vue.toDisplayString($data.currentLog.jsonResult || "-"),
                      1
                      /* TEXT */
                    )
                  ]),
                  $data.currentLog.status === 1 ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 0,
                    class: "detail-item detail-item-block"
                  }, [
                    vue.createElementVNode("text", { class: "detail-label" }, "错误信息:"),
                    vue.createElementVNode(
                      "text",
                      { class: "detail-value log-error" },
                      vue.toDisplayString($data.currentLog.errorMsg || "-"),
                      1
                      /* TEXT */
                    )
                  ])) : vue.createCommentVNode("v-if", true)
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminOperLog = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__scopeId", "data-v-3c9e5688"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/oper-log.vue"]]);
  const _sfc_main$9 = {
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
            sys_yes_no: [
              { value: "Y", label: "是" },
              { value: "N", label: "否" }
            ]
          }
        },
        queryParams: {
          pageNum: 1,
          pageSize: 10,
          configName: void 0,
          configKey: void 0,
          configType: void 0
        },
        form: {},
        selectedConfig: null
      };
    },
    computed: {
      configTypePickerIndex() {
        const current = this.queryParams.configType;
        if (current === void 0 || current === null)
          return -1;
        return Math.max(0, this.dict.type.sys_yes_no.findIndex((item) => item.value === current));
      },
      currentTypeLabel() {
        if (!this.queryParams.configType)
          return "全部参数";
        return this.queryParams.configType === "Y" ? "系统内置" : "业务参数";
      },
      stats() {
        return this.configList.reduce((result, item) => {
          result.total += 1;
          if (item.configType === "Y") {
            result.builtin += 1;
          } else {
            result.custom += 1;
          }
          return result;
        }, {
          total: 0,
          builtin: 0,
          custom: 0
        });
      }
    },
    onLoad() {
      this.getList();
    },
    methods: {
      getList() {
        this.loading = true;
        listConfig(this.queryParams).then((response) => {
          var _a, _b;
          const list = Array.isArray(response) ? response : response.rows || ((_a = response.data) == null ? void 0 : _a.records) || response.data || response.records || [];
          const raw = Array.isArray(list) ? list : [];
          const normalized = raw.map((item) => {
            const configId = (item == null ? void 0 : item.configId) ?? (item == null ? void 0 : item.config_id) ?? (item == null ? void 0 : item.id);
            return {
              ...item,
              configId,
              configName: (item == null ? void 0 : item.configName) ?? (item == null ? void 0 : item.config_name) ?? (item == null ? void 0 : item.name),
              configKey: (item == null ? void 0 : item.configKey) ?? (item == null ? void 0 : item.config_key) ?? (item == null ? void 0 : item.key),
              configValue: (item == null ? void 0 : item.configValue) ?? (item == null ? void 0 : item.config_value) ?? (item == null ? void 0 : item.value),
              configType: (item == null ? void 0 : item.configType) ?? (item == null ? void 0 : item.config_type) ?? (item == null ? void 0 : item.type),
              createTime: (item == null ? void 0 : item.createTime) ?? (item == null ? void 0 : item.create_time),
              remark: (item == null ? void 0 : item.remark) ?? (item == null ? void 0 : item.remarks)
            };
          });
          this.configList = normalized.filter((item) => item && item.configId !== void 0 && item.configId !== null);
          this.total = Array.isArray(response) ? this.configList.length : response.total || ((_b = response.data) == null ? void 0 : _b.total) || this.configList.length || 0;
        }).catch((error) => {
          formatAppLog("error", "at admin/pages/admin/system-config.vue:319", "获取配置列表失败:", error);
          uni.showToast({ title: "加载失败", icon: "none" });
        }).finally(() => {
          this.loading = false;
        });
      },
      cancel() {
        this.open = false;
        this.reset();
      },
      reset() {
        this.form = {
          configId: void 0,
          configName: void 0,
          configKey: void 0,
          configValue: void 0,
          configType: "N",
          remark: void 0
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
          configName: void 0,
          configKey: void 0,
          configType: void 0
        };
        this.handleQuery();
      },
      applyQuickType(type) {
        this.queryParams.configType = type;
        this.handleQuery();
      },
      handleSelectionChange(e) {
        this.ids = e.detail.value;
        this.single = this.ids.length !== 1;
        this.multiple = !this.ids.length;
        if (this.ids.length === 1) {
          this.selectedConfig = this.configList.find((item) => String(item.configId) === this.ids[0]) || null;
        } else {
          this.selectedConfig = null;
        }
      },
      handleTypeChange(e) {
        const index = Number(e.detail.value);
        const option = this.dict.type.sys_yes_no[index];
        this.queryParams.configType = option ? option.value : void 0;
      },
      handleFormTypeChange(e) {
        this.form.configType = e.detail.value;
      },
      handleAdd() {
        this.reset();
        this.title = "添加参数";
        this.open = true;
      },
      handleUpdate(row) {
        this.reset();
        const configId = (row == null ? void 0 : row.configId) ?? (row == null ? void 0 : row.config_id) ?? (row == null ? void 0 : row.id) ?? this.ids[0];
        if (configId === void 0 || configId === null || configId === "") {
          uni.showToast({ title: "未获取到配置ID", icon: "none" });
          return;
        }
        getConfig(configId).then((response) => {
          const data = response.data || response;
          this.form = {
            ...data,
            configId: (data == null ? void 0 : data.configId) ?? (data == null ? void 0 : data.config_id) ?? (data == null ? void 0 : data.id),
            configType: (data == null ? void 0 : data.configType) ?? (data == null ? void 0 : data.config_type) ?? (data == null ? void 0 : data.type) ?? "N"
          };
          this.title = "修改参数";
          this.open = true;
        }).catch((error) => {
          formatAppLog("error", "at admin/pages/admin/system-config.vue:397", "获取配置详情失败:", error);
          uni.showToast({ title: "加载详情失败", icon: "none" });
        });
      },
      submitForm() {
        if (!this.form.configName || !this.form.configKey || !this.form.configValue) {
          uni.showToast({ title: "必填项不能为空", icon: "none" });
          return;
        }
        const action = this.form.configId !== void 0 ? updateConfig(this.form) : addConfig(this.form);
        action.then(() => {
          uni.showToast({
            title: this.form.configId !== void 0 ? "修改成功" : "新增成功",
            icon: "success"
          });
          this.open = false;
          this.getList();
        }).catch((error) => {
          formatAppLog("error", "at admin/pages/admin/system-config.vue:415", "保存参数失败:", error);
          uni.showToast({ title: "保存失败", icon: "none" });
        });
      },
      handleDelete(row) {
        const rowId = (row == null ? void 0 : row.configId) ?? (row == null ? void 0 : row.config_id) ?? (row == null ? void 0 : row.id);
        const configIds = rowId ? [rowId] : this.ids;
        const hasBuiltIn = this.configList.some((item) => configIds.map(String).includes(String(item.configId)) && item.configType === "Y");
        if (hasBuiltIn) {
          uni.showToast({ title: "包含系统内置参数，不允许删除", icon: "none" });
          return;
        }
        if (!configIds.length) {
          uni.showToast({ title: "请选择要删除的数据", icon: "none" });
          return;
        }
        uni.showModal({
          title: "删除确认",
          content: "是否确认删除选中参数？",
          success: (res) => {
            if (!res.confirm)
              return;
            const doDelete = async () => {
              for (const id of configIds) {
                await delConfig(id);
              }
            };
            doDelete().then(() => {
              this.ids = [];
              this.selectedConfig = null;
              this.single = true;
              this.multiple = true;
              this.getList();
              uni.showToast({ title: "删除成功", icon: "success" });
            }).catch((error) => {
              formatAppLog("error", "at admin/pages/admin/system-config.vue:449", "删除参数失败:", error);
              uni.showToast({ title: "删除失败", icon: "none" });
            });
          }
        });
      },
      formatTime(time) {
        if (!time)
          return "-";
        const date = new Date(time);
        if (Number.isNaN(date.getTime()))
          return time;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hour = String(date.getHours()).padStart(2, "0");
        const minute = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}`;
      }
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_admin_sidebar = resolveEasycom(vue.resolveDynamicComponent("admin-sidebar"), __easycom_0);
    return vue.openBlock(), vue.createBlock(_component_admin_sidebar, {
      showSidebar: $data.showSidebar,
      "onUpdate:showSidebar": _cache[24] || (_cache[24] = ($event) => $data.showSidebar = $event),
      pageTitle: "系统参数配置",
      currentPage: "/admin/pages/admin/system-config",
      pageBreadcrumb: "管理后台 / 系统配置",
      showPageBanner: false
    }, {
      default: vue.withCtx(() => [
        vue.createElementVNode("view", { class: "manage-container" }, [
          vue.createElementVNode("view", { class: "overview-panel" }, [
            vue.createElementVNode("view", { class: "overview-copy" }, [
              vue.createElementVNode("text", { class: "overview-title" }, "系统参数列表"),
              vue.createElementVNode("text", { class: "overview-subtitle" }, "统一以后台参数表格页管理系统配置，保留新增、编辑、删除和内置参数限制。")
            ]),
            vue.createElementVNode("view", { class: "overview-chip" }, [
              vue.createElementVNode("text", { class: "overview-chip-label" }, "配置总数"),
              vue.createElementVNode(
                "text",
                { class: "overview-chip-value" },
                vue.toDisplayString($data.total),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "status-summary-bar config-status-bar" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card", { active: !$data.queryParams.configType }]),
                onClick: _cache[0] || (_cache[0] = ($event) => $options.applyQuickType(void 0))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "全部参数"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.stats.total),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card custom", { active: $data.queryParams.configType === "N" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $options.applyQuickType("N"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "业务参数"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.stats.custom),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["status-summary-card builtin", { active: $data.queryParams.configType === "Y" }]),
                onClick: _cache[2] || (_cache[2] = ($event) => $options.applyQuickType("Y"))
              },
              [
                vue.createElementVNode("text", { class: "summary-label" }, "系统内置"),
                vue.createElementVNode(
                  "text",
                  { class: "summary-value" },
                  vue.toDisplayString($options.stats.builtin),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "query-panel" }, [
            vue.createElementVNode("view", { class: "query-grid config-query-grid" }, [
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "参数名称"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.queryParams.configName = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "请输入参数名称",
                    onConfirm: _cache[4] || (_cache[4] = (...args) => $options.handleQuery && $options.handleQuery(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.queryParams.configName]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "参数键名"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.queryParams.configKey = $event),
                    class: "query-input",
                    type: "text",
                    placeholder: "请输入参数键名",
                    onConfirm: _cache[6] || (_cache[6] = (...args) => $options.handleQuery && $options.handleQuery(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.queryParams.configKey]
                ])
              ]),
              vue.createElementVNode("view", { class: "query-field" }, [
                vue.createElementVNode("text", { class: "query-label" }, "系统内置"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.dict.type.sys_yes_no,
                  "range-key": "label",
                  value: $options.configTypePickerIndex,
                  onChange: _cache[7] || (_cache[7] = (...args) => $options.handleTypeChange && $options.handleTypeChange(...args))
                }, [
                  vue.createElementVNode("view", { class: "query-picker" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "query-picker-text" },
                      vue.toDisplayString($options.currentTypeLabel),
                      1
                      /* TEXT */
                    )
                  ])
                ], 40, ["range", "value"])
              ])
            ]),
            vue.createElementVNode("view", { class: "query-actions" }, [
              vue.createElementVNode("button", {
                class: "query-btn primary",
                onClick: _cache[8] || (_cache[8] = (...args) => $options.handleQuery && $options.handleQuery(...args))
              }, "查询"),
              vue.createElementVNode("button", {
                class: "query-btn secondary",
                onClick: _cache[9] || (_cache[9] = (...args) => $options.resetQuery && $options.resetQuery(...args))
              }, "重置")
            ])
          ]),
          vue.createElementVNode("view", { class: "table-toolbar" }, [
            vue.createElementVNode("view", { class: "toolbar-left-group" }, [
              vue.createElementVNode("button", {
                class: "row-btn primary",
                onClick: _cache[10] || (_cache[10] = (...args) => $options.handleAdd && $options.handleAdd(...args))
              }, "新增参数"),
              vue.createElementVNode("button", {
                class: "row-btn ghost",
                disabled: $data.single,
                onClick: _cache[11] || (_cache[11] = ($event) => $options.handleUpdate($data.selectedConfig))
              }, "修改", 8, ["disabled"]),
              vue.createElementVNode("button", {
                class: "row-btn danger",
                disabled: $data.multiple,
                onClick: _cache[12] || (_cache[12] = ($event) => $options.handleDelete())
              }, "删除", 8, ["disabled"])
            ]),
            vue.createElementVNode("view", { class: "toolbar-right-group" }, [
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta" },
                "已选 " + vue.toDisplayString($data.ids.length) + " 项",
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toolbar-meta active" },
                vue.toDisplayString($options.currentTypeLabel),
                1
                /* TEXT */
              )
            ])
          ]),
          $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "table-panel"
          }, [
            vue.createElementVNode("view", { class: "scroll-table" }, [
              vue.createElementVNode("view", { class: "table-head config-table" }, [
                vue.createElementVNode("text", { class: "table-col col-check" }, "选择"),
                vue.createElementVNode("text", { class: "table-col col-id" }, "主键"),
                vue.createElementVNode("text", { class: "table-col col-name" }, "参数名称"),
                vue.createElementVNode("text", { class: "table-col col-key" }, "参数键名"),
                vue.createElementVNode("text", { class: "table-col col-value" }, "参数键值"),
                vue.createElementVNode("text", { class: "table-col col-type" }, "内置"),
                vue.createElementVNode("text", { class: "table-col col-remark" }, "备注"),
                vue.createElementVNode("text", { class: "table-col col-time" }, "创建时间"),
                vue.createElementVNode("text", { class: "table-col col-actions" }, "操作")
              ]),
              vue.createElementVNode(
                "checkbox-group",
                {
                  onChange: _cache[13] || (_cache[13] = (...args) => $options.handleSelectionChange && $options.handleSelectionChange(...args))
                },
                [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList($data.configList, (item, index) => {
                      return vue.openBlock(), vue.createElementBlock(
                        "view",
                        {
                          key: item.configId,
                          class: "table-row config-table",
                          style: vue.normalizeStyle({ animationDelay: `${Math.min(360, index * 40)}ms` })
                        },
                        [
                          vue.createElementVNode("view", { class: "table-col col-check" }, [
                            vue.createElementVNode("checkbox", {
                              value: String(item.configId),
                              checked: $data.ids.includes(String(item.configId))
                            }, null, 8, ["value", "checked"])
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-id" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "minor-text" },
                              "#" + vue.toDisplayString(item.configId),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-name" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "primary-text" },
                              vue.toDisplayString(item.configName || "-"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-key" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "plain-text" },
                              vue.toDisplayString(item.configKey || "-"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-value" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "desc-text" },
                              vue.toDisplayString(item.configValue || "-"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-type" }, [
                            vue.createElementVNode(
                              "text",
                              {
                                class: vue.normalizeClass(["status-pill", item.configType === "Y" ? "type-builtin" : "type-custom"])
                              },
                              vue.toDisplayString(item.configType === "Y" ? "是" : "否"),
                              3
                              /* TEXT, CLASS */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-remark" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "desc-text" },
                              vue.toDisplayString(item.remark || "无"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-time" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "minor-text" },
                              vue.toDisplayString($options.formatTime(item.createTime)),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "table-col col-actions row-actions" }, [
                            vue.createElementVNode("button", {
                              class: "row-btn ghost",
                              onClick: ($event) => $options.handleUpdate(item)
                            }, "修改", 8, ["onClick"]),
                            item.configType !== "Y" ? (vue.openBlock(), vue.createElementBlock("button", {
                              key: 0,
                              class: "row-btn danger",
                              onClick: ($event) => $options.handleDelete(item)
                            }, "删除", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                          ])
                        ],
                        4
                        /* STYLE */
                      );
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ],
                32
                /* NEED_HYDRATION */
              )
            ]),
            $data.configList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-state"
            }, [
              vue.createElementVNode("text", null, "暂无配置参数")
            ])) : vue.createCommentVNode("v-if", true)
          ])),
          $data.open ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "detail-modal",
            onClick: _cache[23] || (_cache[23] = (...args) => $options.cancel && $options.cancel(...args))
          }, [
            vue.createElementVNode("view", {
              class: "detail-content config-detail-content",
              onClick: _cache[22] || (_cache[22] = vue.withModifiers(() => {
              }, ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "detail-header" }, [
                vue.createElementVNode(
                  "text",
                  { class: "detail-title" },
                  vue.toDisplayString($data.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("button", {
                  class: "close-btn",
                  onClick: _cache[14] || (_cache[14] = (...args) => $options.cancel && $options.cancel(...args))
                }, "关闭")
              ]),
              vue.createElementVNode("view", { class: "detail-body" }, [
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "参数名称:"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "form-input-inline",
                      "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event) => $data.form.configName = $event),
                      placeholder: "请输入参数名称"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.form.configName]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "参数键名:"),
                  vue.withDirectives(vue.createElementVNode("input", {
                    class: "form-input-inline",
                    "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => $data.form.configKey = $event),
                    disabled: $data.form.configType === "Y" && $data.form.configId !== void 0,
                    style: vue.normalizeStyle({ backgroundColor: $data.form.configType === "Y" && $data.form.configId !== void 0 ? "#f5f7fa" : "#fbfdff" }),
                    placeholder: "请输入参数键名"
                  }, null, 12, ["disabled"]), [
                    [vue.vModelText, $data.form.configKey]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "参数键值:"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "form-input-inline",
                      "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => $data.form.configValue = $event),
                      placeholder: "请输入参数键值"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.form.configValue]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "系统内置:"),
                  vue.createElementVNode(
                    "radio-group",
                    {
                      onChange: _cache[18] || (_cache[18] = (...args) => $options.handleFormTypeChange && $options.handleFormTypeChange(...args)),
                      class: "config-radio-group"
                    },
                    [
                      vue.createElementVNode("label", { class: "config-radio-label" }, [
                        vue.createElementVNode("radio", {
                          value: "Y",
                          checked: $data.form.configType === "Y"
                        }, null, 8, ["checked"]),
                        vue.createElementVNode("text", null, "是")
                      ]),
                      vue.createElementVNode("label", { class: "config-radio-label" }, [
                        vue.createElementVNode("radio", {
                          value: "N",
                          checked: $data.form.configType === "N"
                        }, null, 8, ["checked"]),
                        vue.createElementVNode("text", null, "否")
                      ])
                    ],
                    32
                    /* NEED_HYDRATION */
                  )
                ]),
                vue.createElementVNode("view", { class: "detail-item detail-item-block" }, [
                  vue.createElementVNode("text", { class: "detail-label" }, "备注:"),
                  vue.withDirectives(vue.createElementVNode(
                    "textarea",
                    {
                      class: "modal-textarea",
                      "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => $data.form.remark = $event),
                      maxlength: "300",
                      placeholder: "请输入备注"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $data.form.remark]
                  ])
                ]),
                vue.createElementVNode("view", { class: "detail-actions" }, [
                  vue.createElementVNode("button", {
                    class: "detail-btn secondary",
                    onClick: _cache[20] || (_cache[20] = (...args) => $options.cancel && $options.cancel(...args))
                  }, "取消"),
                  vue.createElementVNode("button", {
                    class: "detail-btn primary",
                    onClick: _cache[21] || (_cache[21] = (...args) => $options.submitForm && $options.submitForm(...args))
                  }, "保存")
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      _: 1
      /* STABLE */
    }, 8, ["showSidebar"]);
  }
  const AdminPagesAdminSystemConfig = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__scopeId", "data-v-9435e33c"], ["__file", "D:/HBuilderProjects/smart-community/admin/pages/admin/system-config.vue"]]);
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
          const params = {
            userId: user.id,
            pageNum: 1,
            pageSize: 100
          };
          formatAppLog("log", "at owner/pages/notice/list.vue:57", "【NOTICE_DEBUG】请求公告列表 params =", params);
          const data = await request({
            url: "/api/notice/list",
            method: "GET",
            params
          });
          formatAppLog("log", "at owner/pages/notice/list.vue:64", "【NOTICE_DEBUG】公告列表原始响应 =", data);
          const records = Array.isArray(data && data.records) ? data.records : [];
          formatAppLog("log", "at owner/pages/notice/list.vue:66", "【NOTICE_DEBUG】公告 records.length =", records.length);
          const readCacheRaw = uni.getStorageSync("noticeReadIds");
          const readCacheSet = new Set((Array.isArray(readCacheRaw) ? readCacheRaw : []).map((v) => String(v)));
          const uid = String(user.id);
          const getTargetUserId = (item) => {
            return (item == null ? void 0 : item.targetUserId) ?? (item == null ? void 0 : item.target_user_id) ?? (item == null ? void 0 : item.target_userId) ?? (item == null ? void 0 : item.targetUserID) ?? (item == null ? void 0 : item.toUserId) ?? (item == null ? void 0 : item.to_user_id) ?? (item == null ? void 0 : item.userId) ?? (item == null ? void 0 : item.user_id) ?? null;
          };
          const isUserTarget = (item) => {
            const t = (item == null ? void 0 : item.targetType) ?? (item == null ? void 0 : item.target_type) ?? "";
            return String(t).toUpperCase() === "USER";
          };
          const userTypeItems = records.filter(isUserTarget);
          const mismatchUserTargets = userTypeItems.filter((item) => {
            const t = getTargetUserId(item);
            if (t === null || t === void 0 || t === "")
              return true;
            return String(t) !== uid;
          });
          formatAppLog("log", "at owner/pages/notice/list.vue:92", "【NOTICE_DEBUG】USER类型数量 =", userTypeItems.length);
          formatAppLog("log", "at owner/pages/notice/list.vue:93", "【NOTICE_DEBUG】USER类型 target_user 不匹配数量 =", mismatchUserTargets.length);
          formatAppLog("log", "at owner/pages/notice/list.vue:94", "【NOTICE_DEBUG】USER类型不匹配样本 =", mismatchUserTargets.slice(0, 5).map((item) => ({
            id: item == null ? void 0 : item.id,
            title: item == null ? void 0 : item.title,
            targetType: (item == null ? void 0 : item.targetType) ?? (item == null ? void 0 : item.target_type),
            targetUserId: getTargetUserId(item)
          })));
          const feeLike = records.filter((item) => {
            const text = `${(item == null ? void 0 : item.title) || ""}${(item == null ? void 0 : item.content) || ""}${(item == null ? void 0 : item.type) || ""}${(item == null ? void 0 : item.category) || ""}`;
            return /缴费|账单|物业费|水费|电费|燃气费|停车费/i.test(text);
          });
          formatAppLog("log", "at owner/pages/notice/list.vue:105", "【NOTICE_DEBUG】疑似缴费提醒数量 =", feeLike.length);
          formatAppLog("log", "at owner/pages/notice/list.vue:106", "【NOTICE_DEBUG】疑似缴费提醒样本 =", feeLike.slice(0, 5).map((item) => ({
            id: item == null ? void 0 : item.id,
            title: item == null ? void 0 : item.title,
            targetType: (item == null ? void 0 : item.targetType) ?? (item == null ? void 0 : item.target_type),
            targetUserId: getTargetUserId(item)
          })));
          this.notices = records.map((item) => {
            const id = item == null ? void 0 : item.id;
            const readFlag = readCacheSet.has(String(id)) ? 1 : Number((item == null ? void 0 : item.readFlag) ?? (item == null ? void 0 : item.read_flag) ?? 0);
            return {
              id,
              title: item.title,
              content: item.content,
              publishTime: item.publishTime,
              readFlag,
              time: this.formatTime(item.publishTime),
              tag: this.getTag(item.targetType)
            };
          });
          formatAppLog("log", "at owner/pages/notice/list.vue:129", "【DEBUG】全部公告 =", this.notices);
        } catch (err) {
          formatAppLog("error", "at owner/pages/notice/list.vue:132", "加载全部公告失败", err);
        }
      },
      async openNoticeDetail(item) {
        if (item.readFlag === 0) {
          try {
            const user = uni.getStorageSync("userInfo");
            const userId = (user == null ? void 0 : user.id) || (user == null ? void 0 : user.userId);
            await request({
              url: `/api/notice/${item.id}/read`,
              method: "POST",
              params: userId ? { userId } : {}
            });
            const raw = uni.getStorageSync("noticeReadIds");
            const arr = Array.isArray(raw) ? raw.map((v) => String(v)) : [];
            const sid = String(item.id);
            if (!arr.includes(sid)) {
              arr.push(sid);
              uni.setStorageSync("noticeReadIds", arr);
            }
            item.readFlag = 1;
            this.notices = [...this.notices];
          } catch (err) {
            formatAppLog("error", "at owner/pages/notice/list.vue:156", "标记已读失败", err);
          }
        }
        uni.navigateTo({
          url: `/owner/pages/notice/detail?notice=${encodeURIComponent(
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
        if (this.car.leaseStatus === "PENDING") {
          uni.showToast({ title: "车位审核中，不可续费", icon: "none" });
          return;
        }
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
        if (this.car.leaseStatus === "PENDING") {
          uni.showToast({ title: "车位正在审核中，无法开闸", icon: "none" });
          return;
        }
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
        if (this.car.leaseStatus === "PENDING") {
          uni.showToast({ title: "车位审核中，不可绑定", icon: "none" });
          return;
        }
        formatAppLog("log", "at owner/pages/parking/space-detail.vue:181", "🔹 点击绑定车牌按钮", this.car, this.userInfo);
        if (!this.car || !this.car.id) {
          uni.showToast({ title: "车位数据为空", icon: "none" });
          formatAppLog("error", "at owner/pages/parking/space-detail.vue:185", "❌ car 对象为空或 car.id 未获取");
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
            formatAppLog("log", "at owner/pages/parking/space-detail.vue:196", "🚀 showModal 返回：", res);
            if (res.confirm && res.content) {
              const plateNo = res.content.trim();
              if (!plateNo) {
                uni.showToast({ title: "车牌号不能为空", icon: "none" });
                formatAppLog("warn", "at owner/pages/parking/space-detail.vue:201", "❌ 用户未输入车牌号");
                return;
              }
              formatAppLog("log", "at owner/pages/parking/space-detail.vue:205", "绑定车牌号：", plateNo);
              try {
                const result = await request("/api/parking/plate/bind", {
                  spaceId: this.car.id,
                  plateNo
                }, "POST");
                formatAppLog("log", "at owner/pages/parking/space-detail.vue:211", "接口返回：", result);
                this.car.plateNo = plateNo;
                uni.showToast({ title: "绑定成功", icon: "success" });
              } catch (e) {
                formatAppLog("error", "at owner/pages/parking/space-detail.vue:215", "❌ 绑定接口报错：", e);
                uni.showToast({ title: e.message || "绑定失败", icon: "none" });
              }
            } else {
              formatAppLog("log", "at owner/pages/parking/space-detail.vue:219", "用户取消输入");
            }
          }
        });
      },
      async unbindPlate() {
        if (this.car.leaseStatus === "PENDING") {
          uni.showToast({ title: "车位审核中，不可解绑", icon: "none" });
          return;
        }
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
        vue.createElementVNode(
          "button",
          {
            class: vue.normalizeClass(["btn primary", { disabled: $data.car.leaseStatus === "PENDING" }]),
            onClick: _cache[0] || (_cache[0] = (...args) => $options.renew && $options.renew(...args))
          },
          "续费",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "button",
          {
            class: vue.normalizeClass(["btn success", { disabled: $data.car.leaseStatus === "PENDING" }]),
            onClick: _cache[1] || (_cache[1] = (...args) => $options.openGate && $options.openGate(...args))
          },
          "开闸",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "button",
          {
            class: vue.normalizeClass(["btn warning", { disabled: $data.car.leaseStatus === "PENDING" }]),
            onClick: _cache[2] || (_cache[2] = (...args) => $options.bindPlate && $options.bindPlate(...args))
          },
          "绑定车牌",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "button",
          {
            class: vue.normalizeClass(["btn danger", { disabled: $data.car.leaseStatus === "PENDING" }]),
            onClick: _cache[3] || (_cache[3] = (...args) => $options.unbindPlate && $options.unbindPlate(...args))
          },
          "解绑车牌",
          2
          /* CLASS */
        ),
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
          const list = Array.isArray(res) ? res : res.records || [];
          const uniqueMap = /* @__PURE__ */ new Map();
          list.forEach((item) => {
            if (item.id && !uniqueMap.has(item.id)) {
              uniqueMap.set(item.id, item);
            }
          });
          const uniqueList = Array.from(uniqueMap.values());
          this.mySpaces = uniqueList.filter((space) => {
            const status = (space.status || "").toString().toUpperCase();
            return status === "AVAILABLE" || status === "FREE";
          });
        } catch (e) {
          formatAppLog("error", "at owner/pages/parking/bind-car.vue:126", "获取车位失败", e);
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
            url: "/api/house/community/list",
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
        var _a, _b;
        if (!this.form.communityId)
          return uni.showToast({ title: "请选择小区", icon: "none" });
        if (!this.form.buildingNo)
          return uni.showToast({ title: "请填写楼栋号", icon: "none" });
        if (!this.form.houseNo)
          return uni.showToast({ title: "请填写房屋号", icon: "none" });
        if (!this.form.type)
          return uni.showToast({ title: "请选择身份类型", icon: "none" });
        try {
          uni.showLoading({ title: "查询房屋..." });
          const userInfo = uni.getStorageSync("userInfo");
          const userId = (userInfo == null ? void 0 : userInfo.id) || (userInfo == null ? void 0 : userInfo.userId);
          if (!userId) {
            uni.hideLoading();
            return uni.showToast({ title: "未获取到用户信息，请重新登录", icon: "none" });
          }
          const buildingNo = String(this.form.buildingNo || "").trim();
          const houseNo = String(this.form.houseNo || "").trim().replace(/[室号]$/u, "");
          const houseInfo = await request({
            url: "/api/house/info",
            method: "GET",
            params: { buildingNo, houseNo }
          });
          const houseId = (houseInfo == null ? void 0 : houseInfo.id) ?? (houseInfo == null ? void 0 : houseInfo.houseId) ?? ((_a = houseInfo == null ? void 0 : houseInfo.data) == null ? void 0 : _a.id) ?? ((_b = houseInfo == null ? void 0 : houseInfo.data) == null ? void 0 : _b.houseId);
          if (!houseId) {
            uni.hideLoading();
            return uni.showToast({ title: "未找到对应房屋，请检查楼栋号和房屋号", icon: "none" });
          }
          uni.showLoading({ title: "提交中..." });
          await request({
            url: "/api/house/bind",
            method: "POST",
            params: {
              userId,
              houseId,
              type: this.form.type
            }
          });
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
  __definePage("owner/pages/login/login", OwnerPagesLoginLogin);
  __definePage("admin/pages/admin/worker-tasks", AdminPagesAdminWorkerTasks);
  __definePage("owner/pages/parking/index", OwnerPagesParkingIndex);
  __definePage("owner/pages/topic/index", OwnerPagesTopicIndex);
  __definePage("owner/pages/mine/index", OwnerPagesMineIndex);
  __definePage("owner/pages/communityService/pay-fee", OwnerPagesCommunityServicePayFee);
  __definePage("owner/pages/communityService/visitor-apply", OwnerPagesCommunityServiceVisitorApply);
  __definePage("owner/pages/communityService/complaint", OwnerPagesCommunityServiceComplaint);
  __definePage("owner/pages/communityService/activity-list", OwnerPagesCommunityServiceActivityList);
  __definePage("owner/pages/mine/profile", OwnerPagesMineProfile);
  __definePage("owner/pages/index/index", OwnerPagesIndexIndex);
  __definePage("owner/pages/register/register", OwnerPagesRegisterRegister);
  __definePage("owner/pages/repair/repair", OwnerPagesRepairRepair);
  __definePage("admin/pages/admin/repair-manage", AdminPagesAdminRepairManage);
  __definePage("admin/pages/admin/work-order-manage", AdminPagesAdminWorkOrderManage);
  __definePage("admin/pages/admin/dashboard/index", AdminPagesAdminDashboardIndex);
  __definePage("admin/pages/admin/user-manage", AdminPagesAdminUserManage);
  __definePage("admin/pages/admin/notice-manage", AdminPagesAdminNoticeManage);
  __definePage("admin/pages/admin/parking-manage", AdminPagesAdminParkingManage);
  __definePage("admin/pages/admin/notice-edit", AdminPagesAdminNoticeEdit);
  __definePage("admin/pages/admin/fee-manage", AdminPagesAdminFeeManage);
  __definePage("admin/pages/admin/complaint-manage", AdminPagesAdminComplaintManage);
  __definePage("admin/pages/admin/visitor-manage", AdminPagesAdminVisitorManage);
  __definePage("admin/pages/admin/register-review", AdminPagesAdminRegisterReview);
  __definePage("admin/pages/admin/house-bind-review", AdminPagesAdminHouseBindReview);
  __definePage("admin/pages/admin/activity-manage", AdminPagesAdminActivityManage);
  __definePage("admin/pages/admin/activity-edit", AdminPagesAdminActivityEdit);
  __definePage("admin/pages/admin/activity-signups", AdminPagesAdminActivitySignups);
  __definePage("admin/pages/admin/car-audit", AdminPagesAdminCarAudit);
  __definePage("admin/pages/admin/oper-log", AdminPagesAdminOperLog);
  __definePage("admin/pages/admin/system-config", AdminPagesAdminSystemConfig);
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
    if (role === "admin") {
      const denyPages = [
        "/admin/pages/admin/register-review",
        "/admin/pages/admin/system-config"
      ];
      if (denyPages.includes(pagePath)) {
        return false;
      }
    }
    if (role === "admin" || role === "super_admin") {
      if (pagePath.startsWith("/admin/") || pagePath.startsWith("/owner/")) {
        return true;
      }
    }
    if (!role) {
      formatAppLog("warn", "at utils/permission.js:121", "[Permission Denied] No role info");
      return false;
    }
    const permissions = rolePermissions[role];
    if (!permissions || !permissions.pages.includes(pagePath)) {
      if ((role === "user" || role === "owner") && pagePath.startsWith("/owner/")) {
        return true;
      }
      formatAppLog("warn", "at utils/permission.js:132", "[Permission Denied] Page not in whitelist:", pagePath);
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
        const needBindPrefixes = ["/owner/pages/topic", "/owner/pages/communityService", "/owner/pages/parking"];
        const allowWithoutBind = [
          "/owner/pages/login/login",
          "/owner/pages/register/register",
          "/owner/pages/index/index",
          "/owner/pages/mine/index",
          "/owner/pages/mine/profile",
          "/owner/pages/mine/house-bind",
          "/owner/pages/notice/list",
          "/owner/pages/notice/detail"
        ];
        const noCommunity = !(userInfo == null ? void 0 : userInfo.communityId);
        const isNeedBind = needBindPrefixes.some((p) => pagePath.startsWith(p));
        const isAllow = allowWithoutBind.includes(pagePath);
        if ((userInfo == null ? void 0 : userInfo.role) === "owner" && noCommunity && isNeedBind && !isAllow) {
          uni.showModal({
            title: "提示",
            content: "请先绑定房屋以开启社区相关功能",
            showCancel: false,
            success: () => {
              uni.navigateTo({ url: "/owner/pages/mine/house-bind" });
            }
          });
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
        formatAppLog("log", "at main.js:75", "未登录，跳转到登录页");
        uni.redirectTo({ url: "/owner/pages/login/login" });
        return false;
      }
      if ((userInfo == null ? void 0 : userInfo.role) === "admin" || (userInfo == null ? void 0 : userInfo.role) === "super_admin") {
        formatAppLog("log", "at main.js:82", "管理员禁止访问普通用户tabBar");
        uni.showToast({ title: "管理员请使用专属管理页面", icon: "none" });
        goToHomeByRole();
        return false;
      }
      const target = e.url.split("?")[0];
      const needBindTabs = ["/owner/pages/topic/index", "/owner/pages/parking/index"];
      if ((userInfo == null ? void 0 : userInfo.role) === "owner" && !(userInfo == null ? void 0 : userInfo.communityId) && needBindTabs.includes(target)) {
        uni.showModal({
          title: "提示",
          content: "请先绑定房屋以访问该功能",
          showCancel: false,
          success: () => {
            uni.navigateTo({ url: "/owner/pages/mine/house-bind" });
          }
        });
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
