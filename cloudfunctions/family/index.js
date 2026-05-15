const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// Default task templates for a new family
const DEFAULT_TASKS = [
  { name: '看书', type: 'earn', pointsPerMinute: 1, icon: 'book' },
  { name: '做作业', type: 'earn', pointsPerMinute: 1, icon: 'homework' },
  { name: '练字', type: 'earn', pointsPerMinute: 1, icon: 'pen' },
  { name: '运动', type: 'earn', pointsPerMinute: 1, icon: 'run' },
  { name: '做家务', type: 'earn', pointsPerMinute: 1, icon: 'clean' },
  { name: '看电视', type: 'spend', pointsPerMinute: 1, icon: 'tv' },
  { name: '玩游戏', type: 'spend', pointsPerMinute: 1, icon: 'game' },
  { name: '吃零食', type: 'spend', pointsPerMinute: 1, icon: 'snack' }
]

// Generate a 6-char invite code using uppercase letters + digits, excluding I/O/0/1
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Action: create a new family
async function createAction(OPENID, { name, childName }) {
  if (!name || !childName) {
    return { code: -1, msg: '缺少必要参数' }
  }

  // Check if user already belongs to a family
  const userRes = await db.collection('users').doc(OPENID).get()
  if (userRes.data.familyId) {
    return { code: -1, msg: '您已属于一个家庭，无法再创建' }
  }

  // Generate unique invite code
  let inviteCode = ''
  let isUnique = false
  while (!isUnique) {
    inviteCode = generateInviteCode()
    const existRes = await db.collection('families')
      .where({ inviteCode })
      .count()
    if (existRes.total === 0) {
      isUnique = true
    }
  }

  // Create family document
  const familyData = {
    name,
    childName,
    childAvatar: '',
    inviteCode,
    members: [OPENID],
    createdBy: OPENID,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }

  const familyRes = await db.collection('families').add({ data: familyData })
  const familyId = familyRes._id

  // Update user's familyId and role
  await db.collection('users').doc(OPENID).update({
    data: {
      familyId,
      role: 'admin',
      updatedAt: db.serverDate()
    }
  })

  // Create default task templates
  const taskPromises = DEFAULT_TASKS.map((task, index) => {
    return db.collection('tasks').add({
      data: {
        ...task,
        familyId,
        enabled: true,
        sortOrder: index,
        createdAt: db.serverDate()
      }
    })
  })
  await Promise.all(taskPromises)

  return {
    code: 0,
    data: {
      _id: familyId,
      ...familyData
    },
    msg: 'success'
  }
}

// Action: join a family by invite code
async function joinAction(OPENID, { inviteCode }) {
  if (!inviteCode) {
    return { code: -1, msg: '缺少邀请码' }
  }

  // Check if user already belongs to a family
  const userRes = await db.collection('users').doc(OPENID).get()
  if (userRes.data.familyId) {
    return { code: -1, msg: '您已属于一个家庭，无法再加入' }
  }

  // Find family by invite code
  const familyRes = await db.collection('families')
    .where({ inviteCode })
    .get()

  if (familyRes.data.length === 0) {
    return { code: -1, msg: '邀请码无效' }
  }

  const family = familyRes.data[0]

  // Check if already a member
  if (family.members.includes(OPENID)) {
    return { code: -1, msg: '您已是该家庭成员' }
  }

  // Add openid to family members
  await db.collection('families').doc(family._id).update({
    data: {
      members: _.push(OPENID),
      updatedAt: db.serverDate()
    }
  })

  // Update user's familyId and role
  await db.collection('users').doc(OPENID).update({
    data: {
      familyId: family._id,
      role: 'member',
      updatedAt: db.serverDate()
    }
  })

  return {
    code: 0,
    data: family,
    msg: 'success'
  }
}

// Action: get current user's family info
async function getAction(OPENID) {
  const userRes = await db.collection('users').doc(OPENID).get()
  const user = userRes.data

  if (!user.familyId) {
    return { code: -1, msg: '您尚未加入任何家庭' }
  }

  const familyRes = await db.collection('families').doc(user.familyId).get()
  const family = familyRes.data

  // Get all members' nicknames and avatars
  const membersInfo = []
  if (family.members && family.members.length > 0) {
    const memberRes = await db.collection('users')
      .where({ _id: _.in(family.members) })
      .field({ nickName: true, avatarUrl: true, role: true })
      .get()

    for (const m of memberRes.data) {
      membersInfo.push({
        _id: m._id,
        nickName: m.nickName,
        avatarUrl: m.avatarUrl,
        role: m.role
      })
    }
  }

  return {
    code: 0,
    data: {
      ...family,
      membersInfo,
      currentUserRole: user.role
    },
    msg: 'success'
  }
}

// Action: update family info (admin only)
async function updateAction(OPENID, { name, childName, childAvatar }) {
  const userRes = await db.collection('users').doc(OPENID).get()
  const user = userRes.data

  if (!user.familyId) {
    return { code: -1, msg: '您尚未加入任何家庭' }
  }

  if (user.role !== 'admin') {
    return { code: -1, msg: '仅管理员可以修改家庭信息' }
  }

  const updateData = { updatedAt: db.serverDate() }
  if (name !== undefined) updateData.name = name
  if (childName !== undefined) updateData.childName = childName
  if (childAvatar !== undefined) updateData.childAvatar = childAvatar

  await db.collection('families').doc(user.familyId).update({
    data: updateData
  })

  return { code: 0, data: null, msg: 'success' }
}

// Action: get family invite code
async function getInviteCodeAction(OPENID) {
  const userRes = await db.collection('users').doc(OPENID).get()
  const user = userRes.data

  if (!user.familyId) {
    return { code: -1, msg: '您尚未加入任何家庭' }
  }

  const familyRes = await db.collection('families').doc(user.familyId).get()
  const family = familyRes.data

  return {
    code: 0,
    data: { inviteCode: family.inviteCode },
    msg: 'success'
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  try {
    switch (action) {
      case 'create':
        return await createAction(OPENID, event)
      case 'join':
        return await joinAction(OPENID, event)
      case 'get':
        return await getAction(OPENID)
      case 'update':
        return await updateAction(OPENID, event)
      case 'getInviteCode':
        return await getInviteCodeAction(OPENID)
      default:
        return { code: -1, msg: '未知的操作类型' }
    }
  } catch (err) {
    return { code: -1, msg: err.message || '操作失败' }
  }
}
