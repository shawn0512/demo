/**
 * [将微信API转为Promise]
 *
 * @param {Function} wxapi 
 * @example
 * const request = promisify(wx.request)
 */
function promisify(wxapi) {
  return (options, ...params) => {
    return new Promise((resolve, reject) => {
      wxapi(extend({ }, options, {
        success: resolve,
        fail: reject
      }), ...params)
    })
  }
}

/**
 * [获取一个十六进制的缓存时间戳]
 *
 * @param {Number} second 缓存时间（秒）
 * @example
 * const cache = cacheTime(5)
 * -> '1db3e0337'
 */
function cacheTime(second) {
  return parseInt(
    (new Date()).getTime() /
    (1e3 * (Number(second) || 0.2))
  ).toString(16)
}

/**
 * [将请求对象转为字符串]
 *
 * @param {Object} options 请求参数
 * @returns {string}
 * @example
 * const str = parseQuerys2String({ a: 1 })
 * -> ?a=1
 */
function parseQuerys2String(options) {
  const querys = []
  try {
    Object
      .keys(options)
      .forEach((key) => {
        querys.push(`${key}=${options[key]}`)
      })
  } catch (err) { }
  return querys.join('&')
}

/**
 * [对象扩展]
 *
 * @param {Object} target 目标对象
 * @param {Object} extendObjs 扩展对象
 * @returns {Object}
 */
function extend(target, ...extendObjs) {
  for (let i = 0; i < extendObjs.length; i++) {
    const currObj = extendObjs[i]
    for (const key in currObj) {
      target[key] = isObject(currObj[key]) ? extend(target[key] || { }, currObj[key]) : currObj[key]
    }
  }
  return target
}

/**
 * [类型判断: 是否集合]
 *
 * @param {Object} o 对象
 * @returns {Boolean}
 */
function isObject(o) {
  return o && (
    o.constructor === Object ||
    Object.prototype.toString.call(o) === '[object Object]'
  )
}

module.exports = {
  promisify,
  extend,
  parseQuerys2String,
  cacheTime
}
