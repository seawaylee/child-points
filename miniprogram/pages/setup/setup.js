const cloud = require('../../utils/cloud')
const app = getApp()

Page({
  data: {
    nickName: '',
    presets: ['爸爸', '妈妈', '爷爷', '奶奶', '姥姥', '姥爷']
  },

  onInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  onPresetTap(e) {
    const name = e.currentTarget.dataset.name
    this.setData({ nickName: name })
  },

  async onSubmit() {
    const { nickName } = this.data
    if (!nickName.trim()) return

    wx.showLoading({ title: '保存中...' })
    try {
      const result = await cloud.callFunction('login', {
        nickName: nickName.trim()
      })
      app.setUserInfo(result)
      wx.hideLoading()

      wx.switchTab({ url: '/pages/index/index' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }
})
