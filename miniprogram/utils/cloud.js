const cloud = {
  callFunction(name, data = {}) {
    return wx.cloud.callFunction({
      name,
      data
    }).then(res => {
      if (res.result && res.result.code === 0) {
        return res.result.data
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
