Component({
  properties: {
    record: {
      type: Object,
      value: {}
    }
  },

  data: {
    timeStr: '',
    pointsSign: '',
    pointsColor: ''
  },

  observers: {
    'record': function (record) {
      if (!record) return

      var isEarn = record.taskType === 'earn'
      var timeStr = ''

      if (record.createdAt) {
        var date = new Date(record.createdAt)
        var hours = date.getHours()
        var minutes = date.getMinutes()
        timeStr = (hours < 10 ? '0' + hours : hours) + ':' + (minutes < 10 ? '0' + minutes : minutes)
      }

      this.setData({
        timeStr: timeStr,
        pointsSign: isEarn ? '+' : '',
        pointsColor: isEarn ? '#4CAF50' : '#F44336'
      })
    }
  },

  methods: {
    onPhotoTap: function () {
      if (this.properties.record.photoFileId) {
        this.triggerEvent('phototap', { photoFileId: this.properties.record.photoFileId })
      }
    }
  }
})