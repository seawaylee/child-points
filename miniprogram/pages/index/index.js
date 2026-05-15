const cloud = require('../../utils/cloud')
const app = getApp()

const ICON_MAP = {
  book: '📖', homework: '✏️', pen: '🖊️', run: '🏃', clean: '🧹',
  tv: '📺', game: '🎮', snack: '🍪'
}

Page({
  data: {
    hasFamily: false,
    loading: true,
    childName: '',
    balance: 0,
    earnTasks: [],
    spendTasks: [],
    todayEarned: 0,
    todaySpent: 0
  },

  onLoad() {
    this.loadFamilyInfo()
  },

  onShow() {
    if (this.data.hasFamily) {
      this.loadBalance()
      this.loadTasks()
    }
  },

  onPullDownRefresh() {
    if (this.data.hasFamily) {
      Promise.all([
        this.loadBalance(),
        this.loadTasks()
      ]).finally(() => {
        wx.stopPullDownRefresh()
      })
    } else {
      this.loadFamilyInfo().finally(() => {
        wx.stopPullDownRefresh()
      })
    }
  },

  async loadFamilyInfo() {
    try {
      wx.showLoading({ title: '加载中...' })
      const familyInfo = await cloud.callFunction('family', { action: 'get' })
      if (familyInfo) {
        app.setFamilyInfo(familyInfo)
        this.setData({
          hasFamily: true,
          childName: familyInfo.childName || '宝贝'
        })
        await Promise.all([
          this.loadBalance(),
          this.loadTasks()
        ])
      } else {
        this.setData({ hasFamily: false })
      }
    } catch (err) {
      console.error('加载家庭信息失败', err)
      this.setData({ hasFamily: false })
    } finally {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  async loadBalance() {
    try {
      const summary = await cloud.callFunction('stats', { action: 'summary' })
      this.setData({
        balance: summary.balance || 0,
        todayEarned: summary.todayEarn || 0,
        todaySpent: summary.todaySpend || 0
      })
    } catch (err) {
      console.error('加载积分失败', err)
    }
  },

  async loadTasks() {
    try {
      const tasks = await cloud.callFunction('task', { action: 'list' })
      const earnTasks = (tasks || []).filter(t => t.type === 'earn').map(t => ({ ...t, emoji: ICON_MAP[t.icon] || '⭐' }))
      const spendTasks = (tasks || []).filter(t => t.type === 'spend').map(t => ({ ...t, emoji: ICON_MAP[t.icon] || '⭐' }))
      this.setData({ earnTasks, spendTasks })
    } catch (err) {
      console.error('加载任务失败', err)
    }
  },

  onTaskTap(e) {
    const { taskId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?taskId=${taskId}`
    })
  },

  onCreateFamily() {
    wx.navigateTo({ url: '/pages/family/family?mode=create' })
  },

  onJoinFamily() {
    wx.navigateTo({ url: '/pages/family/family?mode=join' })
  },

  onSettingsTap() {
    wx.navigateTo({ url: '/pages/family/family' })
  }
})
