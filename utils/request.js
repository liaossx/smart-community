// @/utils/request.js（统一请求配置）
const DEFAULT_BASE_URL = 'http://192.168.1.65:80'

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '')
}

function getBaseUrl() {
  const customBaseUrl = normalizeBaseUrl(uni.getStorageSync('apiBaseUrl'))
  if (customBaseUrl) {
    return customBaseUrl
  }

  // H5 部署到 nginx 同域时，优先走当前域名，避免跨域
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location && /^https?:$/.test(window.location.protocol)) {
    const host = window.location.hostname || ''
    const isLocalPreview = host === 'localhost' || host === '127.0.0.1'
    if (!isLocalPreview) {
      return normalizeBaseUrl(window.location.origin)
    }
  }
  // #endif

  return DEFAULT_BASE_URL
}

function getRequestHint(requestUrl) {
  const hints = []

  // #ifdef H5
  hints.push('如果你现在是浏览器预览，请优先检查后端 CORS 或直接用同域 nginx 地址访问前端。')
  // #endif

  // #ifdef APP-PLUS
  hints.push('如果你现在是真机预览，请确认手机和服务器在同一局域网，并且手机浏览器能打开该地址。')
  // #endif

  hints.push(`请确认接口基地址可访问：${requestUrl}`)
  return hints.join('')
}

function request(options) {
  // 1. 兼容两种调用方式
  let finalOptions = {};
  if (typeof options === 'string') {
    // 方式1：简化调用 request(url, params/data, method)
    // 智能判断第二个参数：如果是GET/DELETE，视为params；如果是POST/PUT，视为data
    const url = options;
    const payload = arguments[1] || {};
    const method = arguments[2] || 'POST'; // 默认为POST（兼容旧逻辑，虽然通常GET应该显式指定或用 request.get）

    let params = {};
    let data = {};

    // 如果显式传递了 { params: ..., data: ... } 结构（旧代码风格），则解构
    if (payload.params || payload.data) {
        params = payload.params || {};
        data = payload.data || {};
    } else {
        // 否则根据 method 智能分配
        if (method === 'GET' || method === 'DELETE') {
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
    // 方式2：完整选项调用 request({ url, method, data })
    finalOptions = {
      url: '',
      params: {},
      data: {},
      method: 'POST',
      ...options
    };
  }
  
  // 统一设置header（简化token获取逻辑）
  const token = uni.getStorageSync('token');
  const hasToken = !!token
  try {
    console.log('Token存在:', hasToken, hasToken ? `len=${String(token).length}` : '')
  } catch (e) {}
  const headers = {
    // GET请求不需要application/json Content-Type
    ...(finalOptions.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
    ...finalOptions.header
  };
  
  // 确保token存在时才添加Authorization头
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  } else {
    console.warn('未注入Authorization头(无token)')
  }
  
  finalOptions.header = headers;

  // 2. 拼接URL参数（params）
  const baseUrl = getBaseUrl()
  let requestUrl = baseUrl + finalOptions.url;
  if (finalOptions.params && Object.keys(finalOptions.params).length > 0) {
    console.log('请求参数:', finalOptions.params)
    const paramStr = Object.entries(finalOptions.params)
      // 过滤掉空值或undefined的参数
      .filter(([key, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    if (paramStr) {
      requestUrl += (requestUrl.includes('?') ? '&' : '?') + paramStr;
    }
  }

  // 3. 显示加载中
  uni.showLoading({ title: '加载中...', mask: true })

  return new Promise((resolve, reject) => {
    console.log('当前API基地址:', baseUrl)
    console.log('发送请求:', requestUrl, finalOptions.method, finalOptions.data)
    console.log('请求头已带授权:', Boolean(finalOptions.header && finalOptions.header.Authorization))
    
    // 返回 task 对象以便外部可以 abort
    const requestTask = uni.request({
      url: requestUrl,
      data: finalOptions.data,
      method: finalOptions.method,
      header: finalOptions.header,
      timeout: 10000,
      success: (res) => {
        uni.hideLoading()
        
        // 解析响应数据
        const responseData = res.data || {};
        const { code, msg, data } = responseData;
        const bizCode = typeof code === 'string' ? parseInt(code, 10) : code;
        const rawMsg = msg == null ? '' : String(msg)
        let normalizedMsg = rawMsg
        if (normalizedMsg.includes('Duplicate entry') || normalizedMsg.includes('SQLIntegrityConstraintViolationException')) {
          if (normalizedMsg.includes('sys_user_register_request') && normalizedMsg.toLowerCase().includes('username')) {
            normalizedMsg = '用户名已存在或已提交注册申请，请更换用户名'
          } else {
            normalizedMsg = '数据已存在，请勿重复提交'
          }
        }
        console.log('响应状态:', res.statusCode, '业务code:', code, 'msg:', rawMsg, 'url:', requestUrl)
        
        // 检查状态码
        if (res.statusCode === 200) {
          // HTTP状态码为200，检查业务code
          if (bizCode === 200 || bizCode === 0 || bizCode === undefined || Number.isNaN(bizCode)) {
            // 业务code为200、0、undefined或无法解析时，视为成功
            const resolvedData = data != null ? data : responseData;
            console.log('Request resolved with:', JSON.stringify(resolvedData).substring(0, 200) + '...');
            resolve(resolvedData);
          } else {
            // 业务code不为200，视为失败
            
            // 处理不同的业务错误
            if (code === 401) {
              // 401未登录，直接提示用户并跳转
              console.warn('401未登录拦截:', requestUrl)
              uni.showModal({
                title: '登录提示',
                content: normalizedMsg || '请先登录',
                showCancel: false,
                success: () => {
                  uni.redirectTo({ url: '/owner/pages/login/login' })
                }
              })
              reject(new Error(normalizedMsg || '未登录'));
            } else if (code === 403) {
              // 403无权限，显示详细提示
              console.warn('403无权限拦截:', requestUrl)
              uni.showModal({
                title: '权限提示',
                content: normalizedMsg || '您没有权限执行此操作',
                showCancel: false
              })
              reject(new Error(normalizedMsg || '无权限操作'));
            } else {
              // 其他业务错误，显示详细提示
              uni.showModal({
                title: '操作失败',
                content: normalizedMsg || '操作失败，请重试',
                showCancel: false
              })
              reject(new Error(normalizedMsg || '操作失败'));
            }
          }
        } else {
          // HTTP状态码不为200，视为失败
          
          // 处理401状态码
          if (res.statusCode === 401) {
            // 401未登录，直接提示用户并跳转
            console.warn('HTTP 401 未登录:', requestUrl)
            uni.showModal({
              title: '登录提示',
              content: normalizedMsg || '请先登录',
              showCancel: false,
              success: () => {
                uni.redirectTo({ url: '/owner/pages/login/login' })
              }
            })
            reject(new Error(normalizedMsg || '未登录'));
          } else {
            // 其他状态码错误，显示详细提示
            const errMsg = normalizedMsg || `请求失败，状态码: ${res.statusCode}`;
            console.warn('HTTP错误:', res.statusCode, 'url:', requestUrl)
            console.warn('错误详情(Body):', JSON.stringify(res.data)) // 新增：打印后端返回的具体错误信息
            uni.showModal({
              title: '网络错误',
              content: errMsg,
              showCancel: false
            })
            reject(new Error(errMsg));
          }
        }
      },
      fail: (err) => {
        uni.hideLoading()
        
        let errMsg = '网络错误，请重试';
        
        // 处理不同类型的网络错误
        if (err.errMsg.includes('timeout')) {
          errMsg = '请求超时，请检查网络连接';
        } else if (err.errMsg.includes('connect')) {
          errMsg = '无法连接到服务器，请检查服务器是否启动';
        } else if (err.errMsg.includes('abort')) {
          errMsg = '请求被中止，请检查网络设置';
        } else if (err.errMsg.includes('fail')) {
          errMsg = getRequestHint(requestUrl);
        } else {
          errMsg = err.errMsg || errMsg;
        }
        
        // 显示详细的错误提示
        console.error('请求失败:', err && err.errMsg, 'url:', requestUrl)
        uni.showModal({
          title: '网络错误',
          content: errMsg,
          showCancel: false
        })
        
        reject(new Error(errMsg));
      },
      complete: () => {
        console.log('请求完成:', requestUrl)
      }
    })
    
    if (finalOptions.returnTask) {
      return requestTask;
    }
  })
}
request.get = (url, options = {}) => {
  // 如果 options 有 data 或 params，可以直接传入
  return request({ url, method: 'GET', ...options });
}

request.post = (url, data = {}, options = {}) => {
  return request({ url, method: 'POST', data, ...options });
}

request.put = (url, data = {}, options = {}) => {
  return request({ url, method: 'PUT', data, ...options });
}

request.delete = (url, options = {}) => {
  return request({ url, method: 'DELETE', ...options });
}

// Debug log to ensure methods are attached
console.log('request.js loaded. Methods attached:', {
  get: typeof request.get,
  post: typeof request.post,
  put: typeof request.put,
  delete: typeof request.delete
});

export default request;
