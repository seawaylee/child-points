/**
 * 递归转换 BSON 扩展类型为原生 JS 类型
 * 如 {"$numberInt":"1"} → 1, {"$numberLong":"123456"} → 123456
 */
function convertBSON(obj) {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(convertBSON)
  if (typeof obj === 'object') {
    if (obj.$numberInt !== undefined) return parseInt(obj.$numberInt, 10)
    if (obj.$numberLong !== undefined) return parseInt(obj.$numberLong, 10)
    if (obj.$numberDouble !== undefined) return parseFloat(obj.$numberDouble)
    const result = {}
    for (const key in obj) {
      result[key] = convertBSON(obj[key])
    }
    return result
  }
  return obj
}

const cloud = {
  callFunction(name, data = {}) {
    return wx.cloud.callFunction({
      name,
      data
    }).then(res => {
      if (res.result && res.result.code === 0) {
        return convertBSON(res.result.data)
      }
      return Promise.reject(res.result || { code: -1, msg: '调用失败' })
    })
  },

  uploadFile(cloudPath, filePath) {
    return wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
  },

  getTempFileURL(fileID) {
    return wx.cloud.getTempFileURL({
      fileList: [fileID]
    }).then(res => {
      return res.fileList[0].tempFileURL
    })
  }
}

module.exports = cloud
