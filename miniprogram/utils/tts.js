let audioContext = null

function speak(text, lang) {
  return new Promise((resolve, reject) => {
    if (audioContext) {
      audioContext.destroy()
    }
    audioContext = wx.createInnerAudioContext()
    const ctx = audioContext

    ctx.onPlay = () => {
      // 延迟取 duration（刚播放时可能为0）
      setTimeout(() => resolve(ctx.duration || 0), 300)
    }

    ctx.onError = () => {
      reject(new Error('音频播放失败'))
    }

    wx.cloud.callFunction({
      name: 'tts',
      data: { action: 'speak', text, lang: lang || 'zh' }
    }).then(res => {
      const result = res.result
      if (!result || result.code !== 0) {
        reject(new Error(result ? result.msg : 'TTS 调用失败'))
        return
      }
      const url = (result.data && result.data.url) || result.url
      if (!url) {
        reject(new Error('TTS 无音频URL'))
        return
      }
      ctx.src = url
      ctx.play()
    }).catch(reject)
  })
}

function stop() {
  if (audioContext) {
    audioContext.destroy()
    audioContext = null
  }
}

// 有道发音（英语单词专用，直连不走云函数）
function playYoudao(text) {
  return new Promise((resolve, reject) => {
    if (audioContext) {
      audioContext.destroy()
    }
    audioContext = wx.createInnerAudioContext()
    const ctx = audioContext

    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`

    ctx.onPlay = () => {
      setTimeout(() => resolve(ctx.duration || 0), 300)
    }

    ctx.onError = () => {
      reject(new Error('音频播放失败'))
    }

    ctx.src = url
    ctx.play()
  })
}

module.exports = { speak, stop, playYoudao }
