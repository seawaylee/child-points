const cloud = require('../../utils/cloud')

Page({
  data: {
    categories: [
      {
        key: 'chinese',
        icon: '📜',
        name: '语文',
        desc: '古诗、成语、日积月累',
        color: '#E8F5E9',
        borderColor: '#4CAF50',
        url: '/pages/learn-chinese/learn-chinese'
      },
      {
        key: 'math',
        icon: '🔢',
        name: '数学',
        desc: '口算练习、数学挑战',
        color: '#E3F2FD',
        borderColor: '#2196F3',
        url: '/pages/learn-math/learn-math'
      },
      {
        key: 'english',
        icon: '🇬🇧',
        name: '英语',
        desc: '单词、短句、段落、文章',
        color: '#FFF3E0',
        borderColor: '#FF9800',
        url: '/pages/learn-english/learn-english'
      }
    ],
    progressData: {
      chinese: { mastered: 0, learning: 0, total: 0 },
      english: { mastered: 0, learning: 0, total: 0 }
    }
  },

  onShow() {
    this.loadProgress()
  },

  async loadProgress() {
    try {
      const types = ['poem', 'word', 'sentence', 'article']
      const results = await Promise.all(
        types.map(type => cloud.callFunction('learn', { action: 'getItemProgress', type }))
      )

      let chineseMastered = 0, chineseLearning = 0, chineseTotal = 0
      let englishMastered = 0, englishLearning = 0, englishTotal = 0

      results.forEach((result, i) => {
        if (!result) return
        const c = result.counts || {}
        if (types[i] === 'poem') {
          chineseMastered += c.mastered || 0
          chineseLearning += c.learning || 0
          chineseTotal += c.total || 0
        } else {
          englishMastered += c.mastered || 0
          englishLearning += c.learning || 0
          englishTotal += c.total || 0
        }
      })

      this.setData({
        progressData: {
          chinese: { mastered: chineseMastered, learning: chineseLearning, total: chineseTotal },
          english: { mastered: englishMastered, learning: englishLearning, total: englishTotal }
        }
      })
    } catch (err) {
      console.error('加载进度失败', err)
    }
  },

  onCategoryTap(e) {
    const { url } = e.currentTarget.dataset
    wx.navigateTo({ url })
  }
})
