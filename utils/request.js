// @/utils/request.js（最终版：修复header合并+跨域兼容）
const baseUrl = 'http://192.168.1.65:80'
// const baseUrl = 'http://localhost:80' 
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
        console.log('响应状态:', res.statusCode, '业务code:', code, 'msg:', msg, 'url:', requestUrl)
        
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
                content: msg || '请先登录',
                showCancel: false,
                success: () => {
                  uni.redirectTo({ url: '/owner/pages/login/login' })
                }
              })
              reject(new Error(msg || '未登录'));
            } else if (code === 403) {
              // 403无权限，显示详细提示
              console.warn('403无权限拦截:', requestUrl)
              uni.showModal({
                title: '权限提示',
                content: msg || '您没有权限执行此操作',
                showCancel: false
              })
              reject(new Error(msg || '无权限操作'));
            } else {
              // 其他业务错误，显示详细提示
              uni.showModal({
                title: '操作失败',
                content: msg || '操作失败，请重试',
                showCancel: false
              })
              reject(new Error(msg || '操作失败'));
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
              content: msg || '请先登录',
              showCancel: false,
              success: () => {
                uni.redirectTo({ url: '/owner/pages/login/login' })
              }
            })
            reject(new Error(msg || '未登录'));
          } else {
            // 其他状态码错误，显示详细提示
            const errMsg = msg || `请求失败，状态码: ${res.statusCode}`;
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
          errMsg = '请求失败，请重试';
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
