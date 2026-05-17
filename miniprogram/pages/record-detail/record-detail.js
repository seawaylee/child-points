const cloud = require('../../utils/cloud')
const { formatPoints } = require('../../utils/util')
const app = getApp()

Page({
  data: {
    taskId: '',
    task: null,
    loading: true,
    // 时长选择（时长类）
    durationPresets: [5, 10, 15, 30, 60],
    selectedDuration: 0,
    customDuration: '',
    showCustomInput: false,
    // 次数选择（次数类）
    countPresets: [1, 2, 3, 5, 10],
    selectedCount: 0,
    customCount: '',
    showCustomCountInput: false,
    // 照片
    photoPath: '',
    photoUploaded: false,
    // 备注
    note: '',
    // 提交中
    submitting: false,
    // 积分预览
    pointsPreview: ''
  },

  _calcPoints() {
    const { selectedDuration, selectedCount, task } = this.data
    if (!task) return
    const mode = task.taskMode || 'duration'
    let pts = 0
    if (mode === 'count') {
      pts = (selectedCount || 0) * (task.pointsPerCount || 1)
    } else {
      pts = (selectedDuration || 0) * (task.pointsPerMinute || 1)
    }
    this.setData({ pointsPreview: formatPoints(pts) })
  },

  onLoad(options) {
    if (options.taskId) {
      this.setData({ taskId: options.taskId })
      this.loadTask(options.taskId)
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  async loadTask(taskId) {
    try {
      wx.showLoading({ title: '加载中...' })
      const tasks = await cloud.callFunction('task', { action: 'list' })
      const task = (tasks || []).find(t => t._id === taskId)
      if (task) {
        this.setData({ task, loading: false })
        wx.setNavigationBarTitle({ title: task.name })
        this._calcPoints()
      } else {
        wx.showToast({ title: '任务不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
      }
    } catch (err) {
      console.error('加载任务失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  // 时长选择（时长类）
  onDurationTap(e) {
    const { duration } = e.currentTarget.dataset
    this.setData({
      selectedDuration: duration,
      customDuration: '',
      showCustomInput: false
    })
    this._calcPoints()
  },

  onCustomDurationToggle() {
    this.setData({
      showCustomInput: !this.data.showCustomInput,
      selectedDuration: 0
    })
    this._calcPoints()
  },

  onCustomDurationInput(e) {
    const val = e.detail.value
    this.setData({
      customDuration: val,
      selectedDuration: parseInt(val) || 0
    })
    this._calcPoints()
  },

  // 次数选择（次数类）
  onCountTap(e) {
    const { count } = e.currentTarget.dataset
    this.setData({
      selectedCount: count,
      customCount: '',
      showCustomCountInput: false
    })
    this._calcPoints()
  },

  onCustomCountToggle() {
    this.setData({
      showCustomCountInput: !this.data.showCustomCountInput,
      selectedCount: 0
    })
    this._calcPoints()
  },

  onCustomCountInput(e) {
    const val = e.detail.value
    this.setData({
      customCount: val,
      selectedCount: parseInt(val) || 0
    })
    this._calcPoints()
  },

  // 照片
  onTakePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        wx.compressImage({
          src: tempFilePath,
          quality: 60,
          success: (compressRes) => {
            this.setData({
              photoPath: compressRes.tempFilePath,
              photoUploaded: false
            })
          },
          fail: () => {
            this.setData({
              photoPath: tempFilePath,
              photoUploaded: false
            })
          }
        })
      },
      fail: () => {}
    })
  },

  onRemovePhoto() {
    this.setData({
      photoPath: '',
      photoUploaded: false
    })
  },

  onPreviewPhoto() {
    if (this.data.photoPath) {
      wx.previewImage({
        urls: [this.data.photoPath]
      })
    }
  },

  // 备注
  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  // 提交
  async onSubmit() {
    const { task, selectedDuration, selectedCount, photoPath, note, submitting } = this.data

    if (submitting) return

    if (!task) {
      wx.showToast({ title: '任务信息错误', icon: 'none' })
      return
    }

    const taskMode = task.taskMode || 'duration'

    if (taskMode === 'count') {
      if (!selectedCount || selectedCount <= 0) {
        wx.showToast({ title: '请选择或输入次数', icon: 'none' })
        return
      }
    } else {
      if (!selectedDuration || selectedDuration <= 0) {
        wx.showToast({ title: '请选择或输入时长', icon: 'none' })
        return
      }
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    try {
      let photoFileId = ''

      if (photoPath) {
        const familyInfo = app.getFamilyInfo()
        const familyId = familyInfo ? familyInfo._id : 'default'
        const cloudPath = `photos/${familyId}/${Date.now()}.jpg`
        const uploadRes = await cloud.uploadFile(cloudPath, photoPath)
        photoFileId = uploadRes.fileID
      }

      const recordData = {
        action: 'add',
        taskId: task._id,
        taskName: task.name,
        taskType: task.type,
        photoFileId: photoFileId,
        note: note
      }

      if (taskMode === 'count') {
        recordData.count = selectedCount
      } else {
        recordData.minutes = selectedDuration
      }

      await cloud.callFunction('record', recordData)

      wx.hideLoading()
      wx.showToast({
        title: '记录成功！',
        icon: 'success',
        duration: 1500
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('提交失败', err)
      wx.hideLoading()
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
      this.setData({ submitting: false })
    }
  }
})
