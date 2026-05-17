const cloud = require('../../utils/cloud')

Page({
  data: {
    activeTab: 'poem',
    tabs: [
      { key: 'poem', name: '古诗' },
      { key: 'idiom', name: '成语' },
      { key: 'daily', name: '日积月累' }
    ],

    // 古诗筛选
    levelOptions: ['全部', '小学', '初中', '高中'],
    levelIndex: 0,
    dynastyOptions: ['全部', '唐', '宋', '元', '明', '清', '汉'],
    dynastyIndex: 0,

    // 状态筛选
    statusFilter: 'all',
    statusOptions: ['all', 'new', 'learning', 'mastered'],
    statusLabels: { all: '全部', new: '未学', learning: '学习中', mastered: '已掌握' },

    // 进度
    progressMap: {},
    progressCounts: { mastered: 0, learning: 0, total: 0 },

    // 诗词列表
    poems: [],
    filteredPoems: [],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadPoems()
  },

  onShow() {
    // 从详情页返回时刷新进度
    if (this.data.poems.length > 0) {
      this.loadProgress()
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, poems: [], hasMore: true })
    this.loadPoems().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMorePoems()
    }
  },

  onTabTap(e) {
    const { key } = e.currentTarget.dataset
    this.setData({ activeTab: key })
  },

  onDynastyChange(e) {
    this.setData({ dynastyIndex: e.detail.value, page: 1, poems: [], hasMore: true })
    this.loadPoems()
  },

  onLevelChange(e) {
    this.setData({ levelIndex: e.detail.value, page: 1, poems: [], hasMore: true })
    this.loadPoems()
  },

  onStatusFilter(e) {
    const { status } = e.currentTarget.dataset
    this.setData({ statusFilter: status })
    this.applyFilter()
  },

  applyFilter() {
    const { poems, statusFilter, progressMap } = this.data
    if (statusFilter === 'all') {
      this.setData({ filteredPoems: poems })
      return
    }
    const filtered = poems.filter(p => {
      const s = progressMap[p._id] || 'new'
      return s === statusFilter
    })
    this.setData({ filteredPoems: filtered })
  },

  async loadProgress() {
    try {
      const result = await cloud.callFunction('learn', {
        action: 'getItemProgress',
        type: 'poem'
      })
      if (result) {
        this.setData({
          progressMap: result.progressMap || {},
          progressCounts: result.counts || { mastered: 0, learning: 0, total: 0 }
        })
        this.applyFilter()
      }
    } catch (err) {
      console.error('加载进度失败', err)
    }
  },

  async loadPoems() {
    this.setData({ loading: true })
    try {
      const { dynastyOptions, dynastyIndex, levelOptions, levelIndex } = this.data
      const dynasty = dynastyIndex > 0 ? dynastyOptions[dynastyIndex] : ''
      const level = levelIndex > 0 ? levelOptions[levelIndex] : ''

      const result = await cloud.callFunction('learn', {
        action: 'listPoems',
        dynasty,
        level,
        page: 1
      })

      const poems = result || []
      this.setData({
        poems,
        filteredPoems: poems,
        hasMore: poems.length >= 20,
        loading: false
      })
      this.loadProgress()
    } catch (err) {
      console.error('加载古诗失败', err)
      this.setData({ loading: false })
    }
  },

  async loadMorePoems() {
    const nextPage = this.data.page + 1
    this.setData({ loading: true })
    try {
      const { dynastyOptions, dynastyIndex, levelOptions, levelIndex } = this.data
      const dynasty = dynastyIndex > 0 ? dynastyOptions[dynastyIndex] : ''
      const level = levelIndex > 0 ? levelOptions[levelIndex] : ''

      const result = await cloud.callFunction('learn', {
        action: 'listPoems',
        dynasty,
        level,
        page: nextPage
      })

      const newPoems = result || []
      this.setData({
        poems: [...this.data.poems, ...newPoems],
        page: nextPage,
        hasMore: newPoems.length >= 20,
        loading: false
      })
      this.applyFilter()
    } catch (err) {
      console.error('加载更多古诗失败', err)
      this.setData({ loading: false })
    }
  },

  onPoemTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/learn-detail/learn-detail?type=poem&id=${id}`
    })
  }
})
