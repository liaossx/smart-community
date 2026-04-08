import request from '@/utils/request'

// 查询参数列表
export function listConfig(query) {
  return request({
    url: '/api/system/config/all',
    method: 'GET',
    params: query
  })
}

// 按 configKey 查询参数（用于取某个配置值）
export function getConfigByKey(configKey) {
  return request({
    url: '/api/system/config/list',
    method: 'GET',
    params: { configKey }
  })
}

// 查询参数详细
export function getConfig(configId) {
  return request({
    url: '/api/system/config/' + configId,
    method: 'GET'
  })
}

// 新增参数配置
export function addConfig(data) {
  return request({
    url: '/api/system/config',
    method: 'POST',
    data: data
  })
}

// 修改参数配置
export function updateConfig(data) {
  return request({
    url: '/api/system/config',
    method: 'PUT',
    data: data
  })
}

// 删除参数配置
export function delConfig(configIds) {
  return request({
    url: '/api/system/config/' + configIds,
    method: 'DELETE'
  })
}
