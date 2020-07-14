import { promisify, parseQuerys2String, cacheTime } from './function'

const request = promisify(wx.request)
const wxLogin = promisify(wx.login)
const showModal = promisify(wx.showModal)

const LANG = {
  1000: '您可以选择登录或注册xx账号领取优惠券和参与活动获取更优惠的价格。',
  1111: '砍价团、领券、和签到专属福利需要绑定您的手机号哦~',
  1112: '参加企业内购需校验企业员工身份，请用企业预留的手机号进行认证！'
}

/**
 * [登录校验]
 *
 * @description 全局登录校验
 * @param {Number} loginType 登录类型，默认0
 * 0.静默登录，仅在内部异常时抛出catch
 * 1.强制登录，若用户未登录则提示用户授权
 * 2.非强制登录，若用户未登录或登录信息失效，走入catch
 * @return {Promise}
 * .then(res): 用户数据
 * .catch(err): 用户未登录
 * @example
 * checkLogin(1).then((res) => { })
 */

export function checkLogin(loginType = 0) {
  return new Promise((resolve, reject) => {
    // 调用鉴权接口拿到登录状态
    const loginStatus = getLoginStatus()

    loginStatus.then((res) => {
      const { errorCode } = res
      if (errorCode === 0) {
        // 已登录状态
        resolve(res)
      } else {
        if (loginType === 0) {
          doSilentLogin().then(resolve).catch(reject)
        } else if (loginType === 2) {
          reject()
        } else {
          doForceLogin().then(resolve)
        }
      }
    })
      
    loginStatus.catch((err) => {
      // console.error(err)
      // 非强制登录
      if (loginType === 2) {
        reject()
      }
    })
  })
}

/**
 * [手机用户校验]
 *
 * @description 全局手机用户校验
 * @param {Number} loginType 登录类型，默认0
 * 0.手机用户，若非手机用户则提示用户授权，用户可以选择不授权，走入catch
 * 1.强制用户授权手机号码
 * @return {Promise}
 * .then(res): 用户数据
 * .catch(err): 用户未登录
 * @example
 * checkMobile(1).then((res) => { })
 */
export function checkMobile(loginType = 0) {
  return new Promise((resolve, reject) => {
    // 调用鉴权接口拿到登录状态
    const loginStatus = getLoginStatus()

    loginStatus.then((res) => {
      const { errorCode, tempUser } = res
      if (errorCode === 0) {
        // 已登录状态
        if (tempUser) {
          // 临时用户
          doMobileLogin(loginType).catch(reject)
        } else {
          // 已绑定手机号码
          resolve(res)
        }
      } else {
        reject()
      }
    })
  })
}

/**
 * [企业用户校验]
 *
 * @description 企业用户校验
 * @param {Number} loginType 登录类型，默认1
 * 0.企业用户，若非企业用户则提示用户绑定，用户可以选择不绑定，走入catch
 * 1.强制用户绑定手机号码
 * @return {Promise}
 * .then(res): 用户数据
 * .catch(err): 用户未登录
 * @example
 * checkWork(1).then((res) => { })
 */
export function checkWork(loginType = 1) {
  return new Promise((resolve, reject) => {
    const workStatus = getWorkStatus()
    
    workStatus.then((res) => {
      console.log(res)
    })
    
    workStatus.catch((err) => {
      if (err.errorCode === 1112) {
        doWorkLogin(loginType).catch(reject)
      } else {
        reject()
      }
    })
  })
}

// 登录
export function doLogin() {
  return new Promise((resolve, reject) => {
    wxLogin().then((wxres) => {
      if (wxres.errMsg === 'login:ok' && wxres.code) {
        const version = cacheTime(5)
        const { code } = wxres
        const param = {
          url: 'API URI',
          data: { version, code },
          dataType: 'json',
          method: 'POST'
        }

        const http = request(param)

        http.then((res) => {
          if (res.statusCode === 200) {
            const { errorCode } = res.data
            if (errorCode === 0) {
              // 登录成功
              try {
                const {
                  user_token: miniToken,
                  tmp_user: tempUser,
                  userId,
                  openId,
                  pusherType,
                  headImg,
                  nickName
                } = res.data.data

                const miniUser = {
                  errorCode,
                  miniToken,
                  tempUser,
                  userId,
                  openId,
                  pusherType,
                  headImg,
                  nickName
                }

                wx.setStorageSync('miniUser', miniUser)
                resolve(miniUser)
              } catch (err) {
                // console.error(err)
                reject(res.data)
              }
            } else {
              reject(res.data)
            }
          }
        })
      } else {
        reject()
      }
    })
  }) 
}

// 强制登录
function doForceLogin() {
  return new Promise((resolve, reject) => {
    doLogin()
      .then(resolve)
      .catch((err) => {
        if (err.errorCode === 1000) {
          // 全新用户，未授权
          doAuth(1)
        }
      })
  })
}

// 静默登录
function doSilentLogin() {
  return new Promise((resolve, reject) => {
    doLogin()
      .then(resolve)
      .catch((err) => {
        if (err.errorCode === 1000) {
          // 全新用户，未授权
          doAuth(3).catch(reject)
        }
      })
  })
}

// 提示授权
function doAuth(loginType) {
  return new Promise((resolve, reject) => {
    const param = {
      title: '温馨提醒',
      content: LANG[1000],
      confirmColor: '#ff3d33',
      showCancel: loginType !== 1,
      confirmText: '登录注册',
      cancelText: '继续体验'
    }

    const modal = showModal(param)
    modal.then((res) => {
      if (res.confirm) {
        let origin = ''

        try {
          const { route, options } = getCurrentPages().pop()
          const querys = encodeURIComponent(parseQuerys2String(options))
          origin = `?origin=${encodeURIComponent(route + '?' + querys)}`
        } catch(err) { }

        const navigate = (origin && loginType === 1) ? 'redirectTo' : 'navigateTo'
        wx[navigate]({ url: `/pages/user/auth/auth${origin}` })
      } else {
        console.warn('用户点击取消')
        reject()
      }
    })

    modal.catch((err) => { })
  })
}

// 提示授权
function doMobileLogin(loginType) {
  return new Promise((resolve, reject) => {
    const param = {
      title: '温馨提醒',
      content: LANG[1111],
      confirmColor: '#ff3d33',
      showCancel: loginType !== 1,
      confirmText: '去绑定',
      cancelText: '继续体验'
    }

    const modal = showModal(param)
    modal.then((res) => {
      if (res.confirm) {
        let origin = ''

        try {
          const { route, options } = getCurrentPages().pop()
          const querys = encodeURIComponent(parseQuerys2String(options))
          origin = `?origin=${encodeURIComponent(route + '?' + querys)}`
        } catch(err) { }

        const navigate = (origin && loginType === 1) ? 'redirectTo' : 'navigateTo'
        wx[navigate]({ url: `/pages/user/bind/bind${origin}` })
      } else {
        console.warn('用户点击取消')
        reject()
      }
    })

    modal.catch((err) => { })
  })
}

// 提示授权
function doWorkLogin(loginType) {
  return new Promise((resolve, reject) => {
    const param = {
      title: '温馨提醒',
      content: LANG[1112],
      confirmColor: '#ff3d33',
      showCancel: loginType !== 1,
      confirmText: '去认证',
      cancelText: '继续体验'
    }

    const modal = showModal(param)
    modal.then((res) => {
      if (res.confirm) {
        let origin = ''

        try {
          const { route, options } = getCurrentPages().pop()
          const querys = encodeURIComponent(parseQuerys2String(options))
          origin = `?origin=${encodeURIComponent(route + '?' + querys)}`
        } catch(err) { }

        const navigate = (origin && loginType === 1) ? 'redirectTo' : 'navigateTo'
        wx[navigate]({ url: `/pages/user/bind/enterprise${origin}` })
      } else {
        console.warn('用户点击取消')
        reject()
      }
    })
  })
}

// 获取登录状态
function getLoginStatus() {
  return new Promise((resolve, reject) => {
    const miniToken = (wx.getStorageSync('miniUser') || { }).miniToken || ''
    const version = cacheTime(5)
    const param = {
      url: 'API URI',
      data: { version },
      dataType: 'json',
      method: 'POST',
      header: { 'cookie': `user_token=${miniToken}` }
    }

    const http = request(param)
    http.then((res) => {
      if (res.statusCode === 200) {
        // 接口调通
        const { errorCode = '' } = res.data || { }

        if (errorCode === 0) {
          // 已登录
          const miniUser = wx.getStorageSync('miniUser')
          resolve(miniUser)
        } else if (/^(1107)+$/.test(errorCode)) {
          // 1107: token失效或无token
          resolve(res.data)
        } else {
          // 接口异常
          reject(res.data)
        }
      } else {
        // 接口异常
        reject(res)
      }
    })
      
    http.catch(reject)
  })
}

// 获取企业绑定状态
function getWorkStatus() {
  return new Promise((resolve, reject) => {
    const miniToken = (wx.getStorageSync('miniUser') || { }).miniToken || ''
    const version = cacheTime(5)
    const param = {
      url: 'API URI',
      data: { version },
      dataType: 'json',
      method: 'POST',
      header: { 'cookie': `user_token=${miniToken}` }
    }

    const http = request(param)
    http.then((res) => {
      if (res.statusCode === 200) {
        // 接口调通
        const { errorCode = '' } = res.data || { }

        if (errorCode === 0) {
          // 已登录
          resolve(res.data)
        } else if (/^(1112)+$/.test(errorCode)) {
          reject(res.data)
        } else {
          // 接口异常
          reject(res.data)
        }
      } else {
        // 接口异常
        reject(res)
      }
    })
      
    http.catch(reject)
  })
}
