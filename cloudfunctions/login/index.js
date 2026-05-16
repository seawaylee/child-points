const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { nickName, avatarUrl } = event

  try {
    const userRes = await db.collection('users').doc(OPENID).get()

    // User exists, update info if provided
    if (nickName || avatarUrl) {
      const updateData = { updatedAt: db.serverDate() }
      if (nickName) updateData.nickName = nickName
      if (avatarUrl) updateData.avatarUrl = avatarUrl
      await db.collection('users').doc(OPENID).update({ data: updateData })
    }

    return {
      code: 0,
      data: {
        ...userRes.data,
        ...(nickName ? { nickName } : {}),
        ...(avatarUrl ? { avatarUrl } : {})
      },
      msg: 'success'
    }
  } catch (err) {
    // User does not exist, create new
    const newUser = {
      _id: OPENID,
      nickName: nickName || '新用户',
      avatarUrl: avatarUrl || '',
      familyId: null,
      role: null,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }

    await db.collection('users').add({ data: newUser })

    return {
      code: 0,
      data: newUser,
      msg: 'success'
    }
  }
}
