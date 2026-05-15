const cloud = require('../../utils/cloud')
const app = getApp()

Page({
  data: {
    taskId: '',
    task: null,
    loading: true,
    // 时长选择
    durationPresets: [5, 10, 15, 30, 60],
    selectedDuration: 0,
    customDuration: '',
    showCustomInput: false,
    // 照片
    photoPath: '',
    photoUploaded: false,
    // 备注
    note: '',
    // 提交中
    submitting: false
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

  // 时长选择
  onDurationTap(e) {
    const { duration } = e.currentTarget.dataset
    this.setData({
      selectedDuration: duration,
      customDuration: '',
      showCustomInput: false
    })
  },

  onCustomDurationToggle() {
    this.setData({
      showCustomInput: !this.data.showCustomInput,
      selectedDuration: 0
    })
  },

  onCustomDurationInput(e) {
    const val = e.detail.value
    this.setData({
      customDuration: val,
      selectedDuration: parseInt(val) || 0
    })
  },

  // 照片
  onTakePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({
          photoPath: tempFilePath,
          photoUploaded: false
        })
      },
      fail: () => {
        // 用户取消选择
      }
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
    const { task, selectedDuration, photoPath, note, submitting } = this.data

    if (submitting) return

    if (!task) {
      wx.showToast({ title: '任务信息错误', icon: 'none' })
      return
    }

    if (!selectedDuration || selectedDuration <= 0) {
      wx.showToast({ title: '请选择或输入时长', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    try {
      let photoFileId = ''

      // 上传照片
      if (photoPath) {
        const familyInfo = app.getFamilyInfo()
        const familyId = familyInfo ? familyInfo._id : 'default'
        const cloudPath = `photos/${familyId}/${Date.now()}.jpg`
        const uploadRes = await cloud.uploadFile(cloudPath, photoPath)
        photoFileId = uploadRes.fileID
      }

      // 计算积分
      const points = selectedDuration * (task.pointsPerMinute || 1)

      // 提交记录
      await cloud.callFunction('record', {
        action: 'add',
        taskId: task._id,
        taskName: task.name,
        taskType: task.type,
        minutes: selectedDuration,
        photoFileId: photoFileId,
        note: note
      })

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
