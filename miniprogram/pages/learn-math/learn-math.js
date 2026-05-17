const cloud = require('../../utils/cloud')

Page({
  data: {
    grade: 1,
    gradeOptions: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
    opTypes: ['混合运算', '加法', '减法', '乘法', '除法'],
    opIndex: 0,
    problems: [],
    answers: {},
    results: {},
    submitted: false,
    score: 0,
    total: 10
  },

  onLoad() {
    this.generateProblems()
  },

  onGradeChange(e) {
    this.setData({
      grade: parseInt(e.detail.value) + 1,
      answers: {},
      results: {},
      submitted: false
    })
    this.generateProblems()
  },

  onOpChange(e) {
    const opMap = ['mixed', '+', '-', '×', '÷']
    this.setData({
      opIndex: e.detail.value,
      answers: {},
      results: {},
      submitted: false
    })
    this.generateProblems()
  },

  async generateProblems() {
    try {
      const { grade, opIndex, total } = this.data
      const opMap = ['mixed', '+', '-', '×', '÷']
      const result = await cloud.callFunction('learn', {
        action: 'randomMath',
        grade,
        type: opMap[opIndex],
        count: total
      })
      this.setData({ problems: result || [] })
    } catch (err) {
      console.error('生成题目失败', err)
      wx.showToast({ title: '生成题目失败', icon: 'none' })
    }
  },

  onAnswerInput(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      [`answers.${index}`]: e.detail.value
    })
  },

  onSubmit() {
    const { problems, answers } = this.data
    const results = {}
    let score = 0

    problems.forEach((p, i) => {
      const userAnswer = parseFloat(answers[i])
      const correct = userAnswer === p.answer
      results[i] = correct
      if (correct) score++
    })

    this.setData({ results, submitted: true, score })
  },

  onRetry() {
    this.setData({
      answers: {},
      results: {},
      submitted: false,
      score: 0
    })
    this.generateProblems()
  }
})
