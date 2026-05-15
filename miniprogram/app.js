App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        traceUser: true
      })
    }
    this.globalData = {}
    this.globalData.userInfo = null
    this.globalData.familyInfo = null
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
