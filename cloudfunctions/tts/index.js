const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const crypto = require('crypto')
const https = require('https')

// Node.js 原生 HTTPS 请求（无需外部依赖）
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      req.destroy()
      reject(new Error('请求超时'))
    }, 20000)
    const req = https.get(url, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        clearTimeout(timeout)
        resolve(Buffer.concat(chunks))
      })
      res.on('error', err => {
        clearTimeout(timeout)
        reject(err)
      })
    })
    req.on('error', err => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }
    }
    const timeout = setTimeout(() => {
      req.destroy()
      reject(new Error('请求超时'))
    }, 30000)
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        clearTimeout(timeout)
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('JSON解析失败: ' + data.substring(0, 200)))
        }
      })
    })
    req.on('error', err => {
      clearTimeout(timeout)
      reject(err)
    })
    req.write(body)
    req.end()
  })
}

const MIMO_API_KEY = process.env.MIMO_API_KEY || 'sk-chrod9847p5ji7qd77rzs1bg3fyu1jw031495om3vx3hxprs'

exports.main = async (event) => {
  const { action, text, lang } = event

  if (action !== 'speak') return { code: -1, msg: '未知操作' }
  if (!text) return { code: -1, msg: '缺少text参数' }

  const language = lang || 'zh'
  const cleanText = text.replace(/[\n\r]+/g, language === 'zh' ? '，' : '. ').substring(0, 500)
  const hash = crypto.createHash('md5').update(`${language}:${cleanText}`).digest('hex')
  const cloudPath = `tts/${hash}.mp3`

  async function uploadAudio(buffer) {
    const uploadRes = await cloud.uploadFile({ cloudPath, fileContent: buffer })
    const tempUrlRes = await cloud.getTempFileURL({ fileList: [uploadRes.fileID] })
    return tempUrlRes.fileList[0].tempFileURL
  }

  // 1. MiMo TTS
  try {
    console.log('[TTS] MiMo 开始, text:', cleanText.substring(0, 50))
    const prompt = language === 'en'
      ? 'Read the following text clearly and naturally'
      : '用清晰的儿童教学语气朗读以下内容'
    const result = await httpsPost(
      'https://api.xiaomimimo.com/v1/chat/completions',
      JSON.stringify({
        model: 'mimo-v2.5-tts',
        messages: [
          { role: 'user', content: prompt },
          { role: 'assistant', content: cleanText }
        ],
        audio: { format: 'mp3', voice: '苏打' }
      }),
      { 'Content-Type': 'application/json', 'api-key': MIMO_API_KEY }
    )
    console.log('[TTS] MiMo 返回 keys:', Object.keys(result))
    const audioData = result.choices?.[0]?.message?.audio?.data
    if (!audioData) throw new Error('MiMo 无音频: ' + JSON.stringify(result).substring(0, 200))
    const buffer = Buffer.from(audioData, 'base64')
    console.log('[TTS] MiMo 成功, size:', buffer.length)
    const url = await uploadAudio(buffer)
    return { code: 0, data: { url }, msg: 'success' }
  } catch (err) {
    console.error('[TTS] MiMo 失败:', err.message)
  }

  // 2. 百度 TTS
  try {
    console.log('[TTS] 百度开始')
    const lan = language === 'en' ? 'en' : 'zh'
    const spd = language === 'en' ? 5 : 4
    const baiduUrl = `https://tts.baidu.com/text2audio?lan=${lan}&ie=UTF-8&spd=${spd}&text=${encodeURIComponent(cleanText)}`
    const buffer = await httpsGet(baiduUrl)
    if (buffer.length < 200) throw new Error('百度音频太小: ' + buffer.length)
    console.log('[TTS] 百度成功, size:', buffer.length)
    const url = await uploadAudio(buffer)
    return { code: 0, data: { url }, msg: 'success' }
  } catch (err) {
    console.error('[TTS] 百度失败:', err.message)
  }

  return { code: -1, msg: 'TTS 服务暂不可用' }
}
