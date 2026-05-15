const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

async function getUserInfo(OPENID) {
  const userRes = await db.collection('users').doc(OPENID).get()
  return userRes.data
}

// Action: list tasks for a family
async function listAction({ familyId }) {
  if (!familyId) {
    return { code: -1, msg: '缺少familyId' }
  }

  const res = await db.collection('tasks')
    .where({ familyId, enabled: true })
    .orderBy('sortOrder', 'asc')
    .get()

  return {
    code: 0,
    data: res.data,
    msg: 'success'
  }
}

// Action: list all tasks including disabled (admin only)
async function listAllAction({ familyId }) {
  if (!familyId) {
    return { code: -1, msg: '缺少familyId' }
  }

  const res = await db.collection('tasks')
    .where({ familyId })
    .orderBy('sortOrder', 'asc')
    .get()

  return {
    code: 0,
    data: res.data,
    msg: 'success'
  }
}

// Action: add a new task (admin only)
async function addAction(OPENID, { familyId, name, type, pointsPerMinute, icon }) {
  if (!familyId || !name || !type) {
    return { code: -1, msg: '缺少必要参数' }
  }

  const user = await getUserInfo(OPENID)
  if (user.role !== 'admin') {
    return { code: -1, msg: '仅管理员可以添加任务' }
  }

  const existingTasks = await db.collection('tasks')
    .where({ familyId })
    .orderBy('sortOrder', 'desc')
    .limit(1)
    .get()

  const maxSortOrder = existingTasks.data.length > 0
    ? existingTasks.data[0].sortOrder + 1
    : 0

  const taskData = {
    familyId,
    name,
    type,
    pointsPerMinute: pointsPerMinute || 1,
    icon: icon || '',
    enabled: true,
    sortOrder: maxSortOrder,
    createdAt: db.serverDate()
  }

  const res = await db.collection('tasks').add({ data: taskData })

  return {
    code: 0,
    data: { _id: res._id, ...taskData },
    msg: 'success'
  }
}

// Action: update a task (admin only)
async function updateAction(OPENID, { taskId, name, type, pointsPerMinute, icon, enabled }) {
  if (!taskId) {
    return { code: -1, msg: '缺少taskId' }
  }

  const user = await getUserInfo(OPENID)
  if (user.role !== 'admin') {
    return { code: -1, msg: '仅管理员可以修改任务' }
  }

  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (type !== undefined) updateData.type = type
  if (pointsPerMinute !== undefined) updateData.pointsPerMinute = pointsPerMinute
  if (icon !== undefined) updateData.icon = icon
  if (enabled !== undefined) updateData.enabled = enabled

  await db.collection('tasks').doc(taskId).update({
    data: updateData
  })

  return { code: 0, data: null, msg: 'success' }
}

// Action: delete a task (admin only)
async function deleteAction(OPENID, { taskId }) {
  if (!taskId) {
    return { code: -1, msg: '缺少taskId' }
  }

  const user = await getUserInfo(OPENID)
  if (user.role !== 'admin') {
    return { code: -1, msg: '仅管理员可以删除任务' }
  }

  const taskRes = await db.collection('tasks').doc(taskId).get()
  const task = taskRes.data

  if (user.familyId !== task.familyId) {
    return { code: -1, msg: '无权删除此任务' }
  }

  await db.collection('tasks').doc(taskId).remove()

  return { code: 0, data: null, msg: 'success' }
}

// Action: reorder tasks (admin only)
async function reorderAction(OPENID, { tasks }) {
  if (!tasks || !Array.isArray(tasks)) {
    return { code: -1, msg: '缺少tasks参数' }
  }

  const user = await getUserInfo(OPENID)
  if (user.role !== 'admin') {
    return { code: -1, msg: '仅管理员可以调整任务排序' }
  }

  const updatePromises = tasks.map(task => {
    return db.collection('tasks').doc(task._id).update({
      data: { sortOrder: task.sortOrder }
    })
  })

  await Promise.all(updatePromises)

  return { code: 0, data: null, msg: 'success' }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  try {
    const user = await getUserInfo(OPENID)
    const familyId = event.familyId || user.familyId

    switch (action) {
      case 'list':
        return await listAction({ familyId })
      case 'listAll':
        if (user.role !== 'admin') return { code: -1, msg: '仅管理员可查看全部任务' }
        return await listAllAction({ familyId })
      case 'add':
        return await addAction(OPENID, { familyId, name: event.name, type: event.type, pointsPerMinute: event.pointsPerMinute, icon: event.icon })
      case 'update':
        return await updateAction(OPENID, event)
      case 'delete':
        return await deleteAction(OPENID, event)
      case 'reorder':
        return await reorderAction(OPENID, event)
      default:
        return { code: -1, msg: '未知的操作类型' }
    }
  } catch (err) {
    return { code: -1, msg: err.message || '操作失败' }
  }
}
