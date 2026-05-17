const cloud = require('../../utils/cloud')

const GROUP_SIZE = 10

Page({
  data: {
    activeTab: 'word',
    tabs: [
      { key: 'word', name: '单词' },
      { key: 'sentence', name: '短句' },
      { key: 'paragraph', name: '段落' },
      { key: 'article', name: '文章' }
    ],

    // 单词筛选
    gradeOptions: ['三年级', '四年级', '五年级', '六年级'],
    gradeIndex: 0,

    // 短句/段落/文章难度
    levelOptions: ['初级', '中级', '高级'],
    levelIndex: 0,

    // 状态筛选
    statusFilter: 'all',
    statusOptions: ['all', 'new', 'learning', 'mastered'],
    statusLabels: { all: '全部', new: '未学', learning: '学习中', mastered: '已掌握' },

    // 进度
    progressMap: {},
    progressCounts: { mastered: 0, learning: 0, total: 0 },

    // 学习模式
    mode: 'browse', // 'browse' | 'study'
    allItems: [],
    currentGroup: [],
    currentGroupIndex: 0,
    currentItemIndex: 0,
    showRating: false,
    showWordDetail: false,
    masteredIds: [],

    // 数据
    items: [],
    filteredItems: [],
    loading: false,
    page: 1,
    hasMore: true,

    // 统计
    masteredCount: 0,
    learningCount: 0
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (this.data.items.length > 0 && this.data.mode === 'browse') {
      this.loadProgress()
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, items: [], hasMore: true, mode: 'browse' })
    this.loadData().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.mode === 'browse' && this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  onTabTap(e) {
    const { key } = e.currentTarget.dataset
    this.setData({
      activeTab: key,
      page: 1,
      items: [],
      hasMore: true,
      mode: 'browse',
      showRating: false,
      showWordDetail: false,
      statusFilter: 'all'
    })
    this.loadData()
  },

  onGradeChange(e) {
    this.setData({ gradeIndex: e.detail.value, page: 1, items: [], hasMore: true, mode: 'browse', statusFilter: 'all' })
    this.loadData()
  },

  onLevelChange(e) {
    this.setData({ levelIndex: e.detail.value, page: 1, items: [], hasMore: true, mode: 'browse', statusFilter: 'all' })
    this.loadData()
  },

  onStatusFilter(e) {
    const { status } = e.currentTarget.dataset
    this.setData({ statusFilter: status })
    this.applyFilter()
  },

  applyFilter() {
    const { items, statusFilter, progressMap } = this.data
    if (statusFilter === 'all') {
      this.setData({ filteredItems: items })
      return
    }
    const filtered = items.filter(item => {
      const s = progressMap[item._id] || 'new'
      return s === statusFilter
    })
    this.setData({ filteredItems: filtered })
  },

  async loadProgress() {
    try {
      const { activeTab } = this.data
      const typeMap = { word: 'word', sentence: 'sentence', paragraph: 'sentence', article: 'article' }
      const type = typeMap[activeTab]
      const result = await cloud.callFunction('learn', {
        action: 'getItemProgress',
        type
      })
      if (result) {
        const pm = result.progressMap || {}
        const masteredIds = Object.keys(pm).filter(k => pm[k] === 'mastered')
        this.setData({
          progressMap: pm,
          masteredIds,
          progressCounts: result.counts || { mastered: 0, learning: 0, total: 0 }
        })
        this.applyFilter()
      }
    } catch (err) {
      console.error('加载进度失败', err)
    }
  },

  // 切换到学习模式
  onStartStudy() {
    const items = this.data.items
    if (items.length === 0) {
      wx.showToast({ title: '暂无内容', icon: 'none' })
      return
    }

    const groups = []
    for (let i = 0; i < items.length; i += GROUP_SIZE) {
      groups.push(items.slice(i, i + GROUP_SIZE))
    }

    this.setData({
      mode: 'study',
      allItems: items,
      groups,
      currentGroupIndex: 0,
      currentItemIndex: 0,
      currentGroup: groups[0],
      showWordDetail: false
    })
  },

  // 学习模式下：点击当前项
  onStudyItemTap() {
    this.setData({ showWordDetail: !this.data.showWordDetail })
  },

  // 下一个
  onNextItem() {
    const { currentItemIndex, currentGroup } = this.data
    if (currentItemIndex < currentGroup.length - 1) {
      this.setData({
        currentItemIndex: currentItemIndex + 1,
        showWordDetail: false
      })
    }
  },

  // 上一个
  onPrevItem() {
    const { currentItemIndex } = this.data
    if (currentItemIndex > 0) {
      this.setData({
        currentItemIndex: currentItemIndex - 1,
        showWordDetail: false
      })
    }
  },

  // 完成一组，弹出评分
  onFinishGroup() {
    this.setData({ showRating: true })
  },

  // 快捷评分
  async onRate(e) {
    const { rating } = e.currentTarget.dataset
    const { activeTab, currentGroup, currentGroupIndex, gradeIndex, levelIndex } = this.data
    const type = `english_${activeTab}`
    const groupId = `${activeTab}_${gradeIndex}_${levelIndex}_g${currentGroupIndex}`
    const itemIds = currentGroup.map(item => item._id)

    try {
      await cloud.callFunction('learn', {
        action: 'saveProgress',
        type,
        groupId,
        itemIds,
        rating: parseInt(rating)
      })

      const status = rating >= 3 ? 'mastered' : 'learning'
      // 同时保存每个 item 的进度
      for (const itemId of itemIds) {
        await cloud.callFunction('learn', {
          action: 'saveItemProgress',
          type: activeTab === 'paragraph' ? 'sentence' : activeTab,
          itemId,
          status
        })
      }

      const newMasteredIds = rating >= 3 ? [...this.data.masteredIds, ...itemIds] : this.data.masteredIds

      this.setData({
        showRating: false,
        masteredIds: newMasteredIds,
        masteredCount: newMasteredIds.length
      })

      const nextIndex = currentGroupIndex + 1
      if (nextIndex < this.data.groups.length) {
        this.setData({
          currentGroupIndex: nextIndex,
          currentGroup: this.data.groups[nextIndex],
          currentItemIndex: 0,
          showWordDetail: false
        })
      } else {
        wx.showToast({ title: '全部学完了！', icon: 'success' })
        this.setData({ mode: 'browse' })
        this.loadProgress()
      }
    } catch (err) {
      console.error('保存进度失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  onCloseRating() {
    this.setData({ showRating: false })
  },

  onExitStudy() {
    this.setData({ mode: 'browse', showRating: false, showWordDetail: false })
    this.loadProgress()
  },

  async loadData() {
    const { activeTab, gradeIndex, levelIndex } = this.data
    this.setData({ loading: true })

    try {
      let result
      if (activeTab === 'word') {
        result = await cloud.callFunction('learn', {
          action: 'listWords',
          grade: gradeIndex + 3,
          page: 1
        })
      } else if (activeTab === 'sentence') {
        result = await cloud.callFunction('learn', {
          action: 'listSentences',
          category: 'sentence',
          level: levelIndex + 1,
          page: 1
        })
      } else if (activeTab === 'paragraph') {
        result = await cloud.callFunction('learn', {
          action: 'listSentences',
          category: 'paragraph',
          level: levelIndex + 1,
          page: 1
        })
      } else if (activeTab === 'article') {
        result = await cloud.callFunction('learn', {
          action: 'listArticles',
          level: levelIndex + 1,
          page: 1
        })
      }

      const items = result || []
      this.setData({
        items,
        filteredItems: items,
        hasMore: items.length >= 20,
        loading: false
      })
      this.loadProgress()
    } catch (err) {
      console.error('加载数据失败', err)
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    const nextPage = this.data.page + 1
    const { activeTab, gradeIndex, levelIndex } = this.data
    this.setData({ loading: true })

    try {
      let result
      if (activeTab === 'word') {
        result = await cloud.callFunction('learn', {
          action: 'listWords',
          grade: gradeIndex + 3,
          page: nextPage
        })
      } else if (activeTab === 'sentence' || activeTab === 'paragraph') {
        result = await cloud.callFunction('learn', {
          action: 'listSentences',
          category: activeTab,
          level: levelIndex + 1,
          page: nextPage
        })
      } else if (activeTab === 'article') {
        result = await cloud.callFunction('learn', {
          action: 'listArticles',
          level: levelIndex + 1,
          page: nextPage
        })
      }

      this.setData({
        items: [...this.data.items, ...(result || [])],
        page: nextPage,
        hasMore: (result || []).length >= 20,
        loading: false
      })
      this.applyFilter()
    } catch (err) {
      console.error('加载更多失败', err)
      this.setData({ loading: false })
    }
  },

  onItemTap(e) {
    const { index } = e.currentTarget.dataset
    const item = this.data.filteredItems[index] || this.data.items[index]
    if (!item) return

    const { activeTab } = this.data
    const typeMap = {
      word: 'word',
      sentence: 'sentence',
      paragraph: 'sentence',
      article: 'article'
    }

    wx.setStorageSync('learn_detail_item', item)
    wx.navigateTo({
      url: `/pages/learn-detail/learn-detail?type=${typeMap[activeTab]}`
    })
  }
})
