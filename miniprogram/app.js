const cloud = require('./utils/cloud')

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-d3gr5o0l455bab8a2',
        traceUser: true
      })
      this.login()
    }
    this.globalData = {}
    this.globalData.userInfo = null
    this.globalData.familyInfo = null
  },

  async login() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      })
      if (res.result && res.result.code === 0) {
        const userInfo = res.result.data
        this.globalData.userInfo = userInfo

        // 首次使用，昵称是默认的"新用户"，跳转到设置昵称页
        if (!userInfo.nickName || userInfo.nickName === '新用户') {
          wx.redirectTo({ url: '/pages/setup/setup' })
        }
      }
    } catch (err) {
      console.error('登录失败', err)
    }
  },

  getUserInfo() {
    return this.globalData.userInfo
  },

  setUserInfo(info) {
    this.globalData.userInfo = info
  },

  getFamilyInfo() {
    return this.globalData.familyInfo
  },

  setFamilyInfo(info) {
    this.globalData.familyInfo = info
  }
})
