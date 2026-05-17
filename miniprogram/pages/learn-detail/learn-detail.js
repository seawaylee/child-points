const cloud = require('../../utils/cloud')
const tts = require('../../utils/tts')

Page({
  data: {
    type: '',
    loading: true,
    item: null,
    playState: 'idle',  // 'idle' | 'loading' | 'playing'
    itemStatus: 'new'   // 'new' | 'learning' | 'mastered'
  },

  _playTimer: null,

  onLoad(options) {
    const { type } = options
    this.setData({ type: type || 'poem' })
    wx.setNavigationBarTitle({ title: this.getNavTitle(type) })

    if (type === 'poem') {
      this.loadPoem(options.id)
    } else {
      const item = wx.getStorageSync('learn_detail_item')
      if (item) {
        wx.removeStorageSync('learn_detail_item')
        this.setData({ item, loading: false })
        this.loadItemStatus(item._id, type)
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    }
  },

  onUnload() {
    clearTimeout(this._playTimer)
    tts.stop()
  },

  getNavTitle(type) {
    const titles = {
      poem: '古诗详情',
      word: '单词详情',
      sentence: '句子详情',
      article: '文章详情'
    }
    return titles[type] || '详情'
  },

  async loadPoem(poemId) {
    try {
      this.setData({ loading: true })
      const result = await cloud.callFunction('learn', {
        action: 'getPoem',
        poemId
      })
      const item = result
      if (typeof item.content === 'string') {
        item.content = item.content.split('\n').filter(l => l.trim())
      }
      this.setData({ item, loading: false })
      this.loadItemStatus(poemId, 'poem')
    } catch (err) {
      console.error('加载古诗详情失败', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadItemStatus(itemId, type) {
    if (!itemId) return
    try {
      const result = await cloud.callFunction('learn', {
        action: 'getItemProgressBatch',
        type,
        itemIds: [itemId]
      })
      const status = (result && result.progressMap && result.progressMap[itemId]) || 'new'
      this.setData({ itemStatus: status })
    } catch (err) {
      console.error('加载进度失败', err)
    }
  },

  async onMarkMastered() {
    const { type, item, itemStatus } = this.data
    if (!item) return
    const itemId = type === 'poem' ? (item._id || '') : (item._id || '')
    if (!itemId) return

    try {
      await cloud.callFunction('learn', {
        action: 'saveItemProgress',
        type,
        itemId,
        status: 'mastered'
      })
      this.setData({ itemStatus: 'mastered' })
      wx.showToast({ title: '已标记掌握', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onMarkLearning() {
    const { type, item } = this.data
    if (!item) return
    const itemId = item._id || ''
    if (!itemId) return

    try {
      await cloud.callFunction('learn', {
        action: 'saveItemProgress',
        type,
        itemId,
        status: 'learning'
      })
      this.setData({ itemStatus: 'learning' })
      wx.showToast({ title: '已标记学习中', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onResetProgress() {
    const { type, item } = this.data
    if (!item) return
    const itemId = item._id || ''
    if (!itemId) return

    try {
      await cloud.callFunction('learn', {
        action: 'saveItemProgress',
        type,
        itemId,
        status: 'new'
      })
      this.setData({ itemStatus: 'new' })
      wx.showToast({ title: '已重置', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onPlayTap() {
    const { item, type, playState } = this.data
    if (!item) return

    // 点击停止：立即重置
    if (playState === 'playing') {
      clearTimeout(this._playTimer)
      tts.stop()
      this.setData({ playState: 'idle' })
      return
    }

    if (playState === 'loading') return

    let text = ''
    let lang = 'zh'

    if (type === 'poem') {
      const c = item.content
      text = Array.isArray(c) ? c.join('\n') : (c || '')
      lang = 'zh'
    } else if (type === 'word') {
      text = item.word || ''
      lang = 'en'
    } else if (type === 'sentence' || type === 'article') {
      text = item.en || ''
      lang = 'en'
    }

    if (!text) return

    this.setData({ playState: 'loading' })

    // 英语单词用有道直连（快速，不走云函数）
    if (type === 'word') {
      try {
        const duration = await tts.playYoudao(text)
        this.setData({ playState: 'playing' })
        const timeout = (duration > 0 ? duration : 10) + 1
        this._playTimer = setTimeout(() => {
          this.setData({ playState: 'idle' })
        }, timeout * 1000)
      } catch (err) {
        this.setData({ playState: 'idle' })
        wx.showToast({ title: '播放失败', icon: 'none' })
      }
      return
    }

    // 其他类型走 MiMo 云函数
    try {
      const duration = await tts.speak(text, lang)
      this.setData({ playState: 'playing' })
      const timeout = (duration > 0 ? duration : 60) + 1
      this._playTimer = setTimeout(() => {
        this.setData({ playState: 'idle' })
      }, timeout * 1000)
    } catch (err) {
      console.error('TTS 播放失败', err)
      this.setData({ playState: 'idle' })
      wx.showToast({ title: '播放失败', icon: 'none' })
    }
  }
})
