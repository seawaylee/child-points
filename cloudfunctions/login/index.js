const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { nickName, avatarUrl } = event

  try {
    const userRes = await db.collection('users').doc(OPENID).get()

    // User exists, update info
    await db.collection('users').doc(OPENID).update({
      data: {
        nickName,
        avatarUrl,
        updatedAt: db.serverDate()
      }
    })

    return {
      code: 0,
      data: {
        ...userRes.data,
        nickName,
        avatarUrl
      },
      msg: 'success'
    }
  } catch (err) {
    // User does not exist, create new
    const newUser = {
      _id: OPENID,
      nickName,
      avatarUrl,
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
