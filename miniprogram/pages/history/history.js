const cloud = require('../../utils/cloud')
const { formatDate, formatTime } = require('../../utils/util')

Page({
  data: {
    groupedRecords: [],
    weekEarned: 0,
    weekSpent: 0,
    loading: true,
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.loadStats()
    this.loadRecords()
  },

  onShow() {
    if (this.data.groupedRecords.length > 0) {
      this.refreshRecords()
    }
  },

  onPullDownRefresh() {
    this.refreshRecords().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadRecords()
    }
  },

  async loadStats() {
    try {
      const summary = await cloud.callFunction('stats', { action: 'summary' })
      this.setData({
        weekEarned: summary.weekEarn || 0,
        weekSpent: summary.weekSpend || 0
      })
    } catch (err) {
      console.error('加载统计失败', err)
    }
  },

  async refreshRecords() {
    this.setData({ page: 1, hasMore: true, groupedRecords: [] })
    await Promise.all([this.loadStats(), this.loadRecords()])
  },

  async loadRecords() {
    if (this.data.loading && this.data.page > 1) return

    try {
      this.setData({ loading: true })
      const { page, pageSize } = this.data
      const result = await cloud.callFunction('record', {
        action: 'list',
        page,
        pageSize
      })

      const records = (result.list || []).map(r => ({
        ...r,
        timeStr: formatTime(new Date(r.createdAt)),
        pointsText: r.taskType === 'earn' ? `+${r.points}` : `${r.points}`
      }))

      // 批量转换照片 fileID 为临时 URL
      const fileIds = records.filter(r => r.photoFileId).map(r => r.photoFileId)
      if (fileIds.length > 0) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: fileIds })
          const urlMap = {}
          urlRes.fileList.forEach(f => { urlMap[f.fileID] = f.tempFileURL })
          records.forEach(r => {
            if (r.photoFileId && urlMap[r.photoFileId]) {
              r.photoUrl = urlMap[r.photoFileId]
            }
          })
        } catch (e) {
          console.error('获取照片链接失败', e)
        }
      }

      const grouped = this.groupByDate(records)
      const allGrouped = page === 1 ? grouped : this.mergeGroups(this.data.groupedRecords, grouped)

      this.setData({
        groupedRecords: allGrouped,
        hasMore: records.length >= pageSize,
        page: page + 1,
        loading: false
      })
    } catch (err) {
      console.error('加载记录失败', err)
      this.setData({ loading: false })
    }
  },

  groupByDate(records) {
    const groups = {}
    records.forEach(r => {
      const date = formatDate(new Date(r.createdAt))
      if (!groups[date]) {
        groups[date] = { date, dateText: this.getDateText(date), records: [] }
      }
      groups[date].records.push(r)
    })
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  },

  mergeGroups(existing, newGroups) {
    const map = {}
    existing.forEach(g => { map[g.date] = { ...g } })
    newGroups.forEach(g => {
      if (map[g.date]) {
        map[g.date].records = map[g.date].records.concat(g.records)
      } else {
        map[g.date] = g
      }
    })
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
  },

  getDateText(dateStr) {
    const today = formatDate(new Date())
    const yesterday = formatDate(new Date(Date.now() - 86400000))
    if (dateStr === today) return '今天'
    if (dateStr === yesterday) return '昨天'
    return dateStr
  },

  onPreviewPhoto(e) {
    const { fileid, url } = e.currentTarget.dataset
    if (url) {
      wx.previewImage({ current: url, urls: [url] })
    } else if (fileid) {
      wx.cloud.getTempFileURL({
        fileList: [fileid],
        success: res => {
          const tempUrl = res.fileList[0].tempFileURL
          wx.previewImage({ current: tempUrl, urls: [tempUrl] })
        }
      })
    }
  },

  onLongPressRecord(e) {
    const { recordId, taskName, points, pointsText, taskType } = e.currentTarget.dataset
    const absPoints = Math.abs(points)
    const action = taskType === 'earn' ? '扣除' : '返还'

    wx.showModal({
      title: '撤销记录',
      content: `撤销「${taskName}」${pointsText}？将${action} ${absPoints} 积分`,
      confirmColor: '#ff5252',
      confirmText: '撤销',
      success: async (res) => {
        if (res.confirm) {
          await this.doDeleteRecord(recordId)
        }
      }
    })
  },

  async doDeleteRecord(recordId) {
    wx.showLoading({ title: '撤销中...' })
    try {
      await cloud.callFunction('record', {
        action: 'delete',
        recordId
      })
      wx.hideLoading()
      wx.showToast({ title: '已撤销', icon: 'success' })
      this.refreshRecords()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '撤销失败', icon: 'none' })
    }
  }
})
