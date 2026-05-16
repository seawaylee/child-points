const cloud = require('../../utils/cloud')
const app = getApp()

const ICON_MAP = {
  book: '📖', homework: '✏️', pen: '🖊️', run: '🏃', clean: '🧹',
  tv: '📺', game: '🎮', snack: '🍪'
}

Page({
  data: {
    tasks: [],
    loading: true
  },

  onLoad() {
    this.loadTasks()
  },

  onShow() {
    this.loadTasks()
  },

  onPullDownRefresh() {
    this.loadTasks().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadTasks() {
    try {
      this.setData({ loading: true })
      const tasks = (await cloud.callFunction('task', { action: 'list' }) || []).map(t => ({ ...t, emoji: ICON_MAP[t.icon] || t.icon || '⭐' }))
      const earnTasks = tasks.filter(t => t.type === 'earn')
      const spendTasks = tasks.filter(t => t.type === 'spend')
      this.setData({
        tasks,
        earnTasks,
        spendTasks,
        loading: false
      })
    } catch (err) {
      console.error('加载任务失败', err)
      this.setData({ loading: false, tasks: [] })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onTaskTap(e) {
    const { taskId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?taskId=${taskId}`
    })
  }
})
