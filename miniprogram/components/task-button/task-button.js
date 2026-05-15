Component({
  properties: {
    task: {
      type: Object,
      value: {}
    },
    compact: {
      type: Boolean,
      value: false
    }
  },

  data: {
    icon: '',
    bgColor: '',
    typeTag: '',
    typeColor: ''
  },

  observers: {
    'task': function (task) {
      if (!task || !task.type) return

      const iconMap = {
        book: '📖',
        homework: '✏️',
        pen: '🖊️',
        run: '🏃',
        clean: '🧹',
        tv: '📺',
        game: '🎮',
        snack: '🍪'
      }

      const icon = iconMap[task.icon] || iconMap[task.name] || '⭐'
      const isEarn = task.type === 'earn'

      this.setData({
        icon: icon,
        bgColor: isEarn ? '#E8F5E9' : '#FFEBEE',
        typeTag: isEarn ? '赚' : '花',
        typeColor: isEarn ? '#4CAF50' : '#F44336'
      })
    }
  },

  methods: {
    onTap: function () {
      this.triggerEvent('tap', { task: this.properties.task })
    }
  }
})