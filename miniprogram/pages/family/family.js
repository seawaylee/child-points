const cloud = require('../../utils/cloud')
const app = getApp()

Page({
  data: {
    mode: '', // 'create', 'join', '' (view)
    familyInfo: null,
    loading: true,
    // 创建/加入表单
    familyName: '',
    childName: '',
    inviteCode: '',
    // 编辑模式
    editingFamilyName: false,
    editingChildName: false,
    editFamilyNameValue: '',
    editChildNameValue: '',
    // 成员列表
    members: [],
    // 权限
    isAdmin: false
  },

  onLoad(options) {
    const mode = options.mode || ''
    this.setData({ mode })
    if (mode === 'create') {
      wx.setNavigationBarTitle({ title: '创建家庭' })
      this.setData({ loading: false })
    } else if (mode === 'join') {
      wx.setNavigationBarTitle({ title: '加入家庭' })
      this.setData({ loading: false })
    } else {
      wx.setNavigationBarTitle({ title: '家庭管理' })
      this.loadFamilyInfo()
    }
  },

  async loadFamilyInfo() {
    try {
      wx.showLoading({ title: '加载中...' })
      const familyInfo = await cloud.callFunction('family', { action: 'get' })
      if (familyInfo) {
        app.setFamilyInfo(familyInfo)
        this.setData({
          familyInfo,
          members: familyInfo.membersInfo || [],
          isAdmin: familyInfo.currentUserRole === 'admin',
          loading: false
        })
      } else {
        wx.showToast({ title: '未找到家庭信息', icon: 'none' })
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('加载家庭信息失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  // === 创建家庭 ===
  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value })
  },

  onChildNameInput(e) {
    this.setData({ childName: e.detail.value })
  },

  async onCreateFamily() {
    const { familyName, childName } = this.data
    if (!familyName.trim()) {
      wx.showToast({ title: '请输入家庭名称', icon: 'none' })
      return
    }
    if (!childName.trim()) {
      wx.showToast({ title: '请输入宝贝名字', icon: 'none' })
      return
    }

    wx.showLoading({ title: '创建中...' })
    try {
      const result = await cloud.callFunction('family', {
        action: 'create',
        name: familyName.trim(),
        childName: childName.trim()
      })
      app.setFamilyInfo(result)
      wx.hideLoading()
      wx.showToast({ title: '创建成功！', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('创建家庭失败', err)
      wx.hideLoading()
      wx.showToast({ title: '创建失败', icon: 'none' })
    }
  },

  // === 加入家庭 ===
  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() })
  },

  async onJoinFamily() {
    const { inviteCode } = this.data
    if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
      wx.showToast({ title: '请输入6位邀请码', icon: 'none' })
      return
    }

    wx.showLoading({ title: '加入中...' })
    try {
      const result = await cloud.callFunction('family', {
        action: 'join',
        inviteCode: inviteCode.trim()
      })
      app.setFamilyInfo(result)
      wx.hideLoading()
      wx.showToast({ title: '加入成功！', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('加入家庭失败', err)
      wx.hideLoading()
      wx.showToast({ title: err.msg || '加入失败，请检查邀请码', icon: 'none' })
    }
  },

  // === 查看模式 ===
  onCopyInviteCode() {
    const code = this.data.familyInfo && this.data.familyInfo.inviteCode
    if (!code) {
      wx.showToast({ title: '暂无邀请码', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({ title: '已复制邀请码', icon: 'success' })
      }
    })
  },

  onEditFamilyName() {
    this.setData({
      editingFamilyName: true,
      editFamilyNameValue: this.data.familyInfo.name || ''
    })
  },

  onEditFamilyNameInput(e) {
    this.setData({ editFamilyNameValue: e.detail.value })
  },

  async onSaveFamilyName() {
    const { editFamilyNameValue, familyInfo } = this.data
    if (!editFamilyNameValue.trim()) {
      wx.showToast({ title: '名称不能为空', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中...' })
    try {
      const updated = await cloud.callFunction('family', {
        action: 'update',
        name: editFamilyNameValue.trim()
      })
      this.setData({
        'familyInfo.name': editFamilyNameValue.trim(),
        editingFamilyName: false
      })
      app.setFamilyInfo(this.data.familyInfo)
      wx.hideLoading()
      wx.showToast({ title: '已更新', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  onCancelEditFamilyName() {
    this.setData({ editingFamilyName: false })
  },

  onEditChildName() {
    this.setData({
      editingChildName: true,
      editChildNameValue: this.data.familyInfo.childName || ''
    })
  },

  onEditChildNameInput(e) {
    this.setData({ editChildNameValue: e.detail.value })
  },

  async onSaveChildName() {
    const { editChildNameValue } = this.data
    if (!editChildNameValue.trim()) {
      wx.showToast({ title: '名称不能为空', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中...' })
    try {
      await cloud.callFunction('family', {
        action: 'update',
        childName: editChildNameValue.trim()
      })
      this.setData({
        'familyInfo.childName': editChildNameValue.trim(),
        editingChildName: false
      })
      app.setFamilyInfo(this.data.familyInfo)
      wx.hideLoading()
      wx.showToast({ title: '已更新', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  onCancelEditChildName() {
    this.setData({ editingChildName: false })
  },

  onGoTaskManage() {
    wx.navigateTo({ url: '/pages/task-manage/task-manage' })
  },

  async onLeaveFamily() {
    wx.showModal({
      title: '确认退出',
      content: '退出后将无法查看家庭数据，确定退出吗？',
      confirmColor: '#ff5252',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' })
          try {
            await cloud.callFunction('family', { action: 'leave' })
            app.setFamilyInfo(null)
            wx.hideLoading()
            wx.showToast({ title: '已退出家庭', icon: 'success' })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '退出失败', icon: 'none' })
          }
        }
      }
    })
  }
})
