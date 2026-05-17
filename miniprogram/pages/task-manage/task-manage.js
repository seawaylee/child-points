const cloud = require('../../utils/cloud')
const { formatPoints } = require('../../utils/util')

const ICON_MAP = {
  book: '📖', homework: '✏️', pen: '🖊️', run: '🏃', clean: '🧹',
  tv: '📺', game: '🎮', snack: '🍪'
}

// 每个任务卡片的高度（rpx 转 px 近似值）
const ITEM_HEIGHT = 60

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
    // 左滑删除
    touchStartX: 0,
    touchStartY: 0,
    swipedTaskId: '',
    // 拖拽排序
    dragging: false,
    dragIndex: -1,
    dragList: '',
    dragStartY: 0
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
      const tasks = (await cloud.callFunction('task', { action: 'listAll' }) || []).map(t => ({
        ...t,
        emoji: ICON_MAP[t.icon] || t.icon || '⭐',
        pointsLabel: t.taskMode === 'count'
          ? formatPoints(t.pointsPerCount || 1) + '分/次'
          : formatPoints(t.pointsPerMinute || 1) + '分/分钟'
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
    if (this.data.dragging) return
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
    const val = e.detail.value
    this.setData({ formPointsPerMinute: val })
  },

  onFormPPCInput(e) {
    const val = e.detail.value
    this.setData({ formPointsPerCount: val })
  },

  async onSubmitForm() {
    const { editTaskId, formName, formType, formIcon, formTaskMode, formPointsPerMinute, formPointsPerCount, formEnabled } = this.data

    if (!formName.trim()) {
      wx.showToast({ title: '请输入任务名称', icon: 'none' })
      return
    }

    const ppm = parseFloat(formPointsPerMinute) || 1
    const ppc = parseFloat(formPointsPerCount) || 1

    wx.showLoading({ title: '保存中...' })
    try {
      const taskData = {
        name: formName.trim(),
        type: formType,
        icon: formIcon.trim(),
        taskMode: formTaskMode,
        pointsPerMinute: formTaskMode === 'duration' ? ppm : 0,
        pointsPerCount: formTaskMode === 'count' ? ppc : 0,
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

  // === 左滑删除 ===
  onTouchStart(e) {
    if (this.data.dragging) return
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY
    })
  },

  onTouchEnd(e) {
    if (this.data.dragging) return
    const { touchStartX, touchStartY } = this.data
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - touchStartX
    const deltaY = Math.abs(endY - touchStartY)

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

  // === 长按拖拽排序 ===
  onDragStart(e) {
    const { index, list } = e.currentTarget.dataset
    // 用 SelectorQuery 获取拖拽区域起始 Y 坐标
    const query = wx.createSelectorQuery().in(this)
    query.selectAll('.task-swipe-wrap').boundingClientRect()
    query.exec((res) => {
      const rects = res[0]
      if (!rects || rects.length === 0) return
      // 只取对应 list 的项（earn 在前，spend 在后）
      const earnLen = this.data.earnTasks.length
      const items = list === 'earn' ? rects.slice(0, earnLen) : rects.slice(earnLen)
      this._dragItemRects = items
      this.setData({
        dragging: true,
        dragIndex: index,
        dragList: list,
        swipedTaskId: ''
      })
      wx.vibrateShort({ type: 'light' })
    })
  },

  onDragMove(e) {
    if (!this.data.dragging) return
    const { dragIndex, dragList } = this.data
    const currentY = e.touches[0].clientY
    const key = dragList === 'earn' ? 'earnTasks' : 'spendTasks'
    const tasks = this.data[key]

    if (!this._dragItemRects || this._dragItemRects.length === 0) return

    let targetIndex = -1
    for (let i = 0; i < this._dragItemRects.length; i++) {
      const rect = this._dragItemRects[i]
      if (currentY >= rect.top && currentY <= rect.bottom) {
        targetIndex = i
        break
      }
    }

    if (targetIndex >= 0 && targetIndex !== dragIndex) {
      const newTasks = [...tasks]
      const item = newTasks.splice(dragIndex, 1)[0]
      newTasks.splice(targetIndex, 0, item)
      // 同步更新 rects 缓存的位置
      const movedRect = this._dragItemRects.splice(dragIndex, 1)[0]
      this._dragItemRects.splice(targetIndex, 0, movedRect)
      this.setData({
        [key]: newTasks,
        dragIndex: targetIndex
      })
    }
  },

  onDragEnd(e) {
    if (!this.data.dragging) return
    const { dragList } = this.data
    const key = dragList === 'earn' ? 'earnTasks' : 'spendTasks'
    const tasks = this.data[key]
    this.setData({ dragging: false, dragIndex: -1, dragList: '' })
    this.saveOrder(tasks)
  },

  async saveOrder(tasks) {
    const reorderData = tasks.map((t, i) => ({ _id: t._id, sortOrder: i }))
    try {
      await cloud.callFunction('task', {
        action: 'reorder',
        tasks: reorderData
      })
    } catch (err) {
      console.error('排序保存失败', err)
    }
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
