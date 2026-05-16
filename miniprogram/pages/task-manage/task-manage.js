const cloud = require('../../utils/cloud')

const ICON_MAP = {
  book: '📖', homework: '✏️', pen: '🖊️', run: '🏃', clean: '🧹',
  tv: '📺', game: '🎮', snack: '🍪'
}

Page({
  data: {
    tasks: [],
    earnTasks: [],
    spendTasks: [],
    loading: true,
    // 弹窗
    showForm: false,
    editTaskId: '',
    formName: '',
    formType: 'earn',
    formIcon: '',
    formTaskMode: 'duration',
    formPointsPerMinute: 1,
    formPointsPerCount: 1,
    formEnabled: true,
    // 删除
    touchStartX: 0,
    touchStartY: 0,
    swipedTaskId: ''
  },

  onLoad() {
    this.loadTasks()
  },

  onShow() {
    this.loadTasks()
  },

  async loadTasks() {
    try {
      this.setData({ loading: true })
      const tasks = (await cloud.callFunction('task', { action: 'list' }) || []).map(t => ({
        ...t,
        emoji: ICON_MAP[t.icon] || t.icon || '⭐'
      }))
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
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // === 添加/编辑任务 ===
  onAddTask() {
    this.setData({
      showForm: true,
      editTaskId: '',
      formName: '',
      formType: 'earn',
      formIcon: '',
      formTaskMode: 'duration',
      formPointsPerMinute: 1,
      formPointsPerCount: 1,
      formEnabled: true
    })
  },

  onEditTask(e) {
    const { task } = e.currentTarget.dataset
    this.setData({
      showForm: true,
      editTaskId: task._id,
      formName: task.name || '',
      formType: task.type || 'earn',
      formIcon: task.icon || '',
      formTaskMode: task.taskMode || 'duration',
      formPointsPerMinute: task.pointsPerMinute || 1,
      formPointsPerCount: task.pointsPerCount || 1,
      formEnabled: task.enabled !== false
    })
  },

  onCloseForm() {
    this.setData({ showForm: false })
  },

  onFormNameInput(e) {
    this.setData({ formName: e.detail.value })
  },

  onFormTypeChange(e) {
    const type = e.currentTarget.dataset.type
    if (type) {
      this.setData({ formType: type })
    }
  },

  onFormTaskModeChange(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode) {
      this.setData({ formTaskMode: mode })
    }
  },

  onFormIconInput(e) {
    this.setData({ formIcon: e.detail.value })
  },

  onFormPPMInput(e) {
    this.setData({ formPointsPerMinute: parseFloat(e.detail.value) || 1 })
  },

  onFormPPCInput(e) {
    this.setData({ formPointsPerCount: parseFloat(e.detail.value) || 1 })
  },

  async onSubmitForm() {
    const { editTaskId, formName, formType, formIcon, formTaskMode, formPointsPerMinute, formPointsPerCount, formEnabled } = this.data

    if (!formName.trim()) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    try {
      const taskData = {
        name: formName.trim(),
        type: formType,
        icon: formIcon.trim(),
        taskMode: formTaskMode,
        pointsPerMinute: formTaskMode === 'duration' ? formPointsPerMinute : 0,
        pointsPerCount: formTaskMode === 'count' ? formPointsPerCount : 0,
        enabled: formEnabled
      }

      if (editTaskId) {
        await cloud.callFunction('task', {
          action: 'update',
          taskId: editTaskId,
          ...taskData
        })
      } else {
        await cloud.callFunction('task', {
          action: 'add',
          ...taskData
        })
      }
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.setData({ showForm: false })
      this.loadTasks()
    } catch (err) {
      console.error('保存任务失败', err)
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // === 删除任务 ===
  onTouchStart(e) {
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY
    })
  },

  onTouchEnd(e) {
    const { touchStartX, touchStartY } = this.data
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - touchStartX
    const deltaY = Math.abs(endY - touchStartY)

    // 水平滑动超过60且水平位移大于垂直位移
    if (deltaX < -60 && deltaY < 40) {
      const { taskId } = e.currentTarget.dataset
      this.setData({ swipedTaskId: taskId })
    } else if (deltaX > 30) {
      this.setData({ swipedTaskId: '' })
    }
  },

  async onDeleteTask(e) {
    const { taskId } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定删除此任务吗？',
      confirmColor: '#ff5252',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          try {
            await cloud.callFunction('task', {
              action: 'delete',
              taskId
            })
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            this.setData({ swipedTaskId: '' })
            this.loadTasks()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 阻止事件冒泡
  onPreventBubble() {},

  // 点击空白处收起滑动
  onTapBlank() {
    this.setData({ swipedTaskId: '' })
  },

  // === 启用/禁用 ===
  async onToggleEnabled(e) {
    const { taskId, enabled } = e.currentTarget.dataset
    wx.showLoading({ title: '更新中...' })
    try {
      await cloud.callFunction('task', {
        action: 'update',
        taskId,
        enabled: !enabled
      })
      wx.hideLoading()
      this.loadTasks()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  }
})
