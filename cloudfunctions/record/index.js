const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 100

// Action: add a new record
async function addAction(OPENID, { taskId, taskName, taskType, minutes, count, photoFileId, note }) {
  if (!taskId) {
    return { code: -1, msg: '缺少必要参数' }
  }

  // Query task to get pointsPerMinute and familyId
  const taskRes = await db.collection('tasks').doc(taskId).get()
  const task = taskRes.data

  const taskMode = task.taskMode || 'duration'
  let points = 0
  let recordMinutes = minutes || 0
  let recordCount = count || 0

  if (taskMode === 'count') {
    recordCount = recordCount || 1
    points = recordCount * (task.pointsPerCount || 1)
  } else {
    recordMinutes = recordMinutes || 1
    points = recordMinutes * (task.pointsPerMinute || 1)
  }

  // If it's a spend type, make points negative
  if (taskType === 'spend' || task.type === 'spend') {
    points = -Math.abs(points)
  }

  // Get user info for nickname
  const userRes = await db.collection('users').doc(OPENID).get()
  const user = userRes.data

  const recordData = {
    familyId: task.familyId,
    taskId,
    taskName: taskName || task.name,
    taskType: taskType || task.type,
    taskMode,
    minutes: recordMinutes,
    count: recordCount,
    points,
    photoFileId: photoFileId || '',
    note: note || '',
    createdBy: OPENID,
    createdByNick: user.nickName || '',
    createdAt: db.serverDate()
  }

  const res = await db.collection('records').add({ data: recordData })

  return {
    code: 0,
    data: { _id: res._id, ...recordData },
    msg: 'success'
  }
}

// Action: list records with pagination and date filtering
async function listAction({ familyId, startDate, endDate, page = 1, pageSize = 20 }) {
  if (!familyId) {
    return { code: -1, msg: '缺少familyId' }
  }

  const query = { familyId }

  // Date filtering
  if (startDate || endDate) {
    query.createdAt = {}
    if (startDate) {
      query.createdAt = _.gte(new Date(startDate))
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (query.createdAt) {
        query.createdAt = _.gte(new Date(startDate)).and(_.lte(end))
      } else {
        query.createdAt = _.lte(end)
      }
    }
  }

  // Get total count
  const countRes = await db.collection('records')
    .where(query)
    .count()

  const total = countRes.total
  const skip = (page - 1) * pageSize

  // Fetch paginated records
  const recordsRes = await db.collection('records')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    data: {
      list: recordsRes.data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    },
    msg: 'success'
  }
}

// Action: get balance for a family
async function getBalanceAction({ familyId }) {
  if (!familyId) {
    return { code: -1, msg: '缺少familyId' }
  }

  // Since cloud database aggregation has limits, we fetch all records
  // and sum in code. For large datasets, use aggregate pipeline.
  const countRes = await db.collection('records')
    .where({ familyId })
    .count()

  let balance = 0
  const total = countRes.total

  if (total === 0) {
    return { code: 0, data: { balance: 0 }, msg: 'success' }
  }

  // Use aggregate pipeline to sum points
  const aggRes = await db.collection('records')
    .where({ familyId })
    .field({ points: true })
    .get()

  for (const record of aggRes.data) {
    balance += record.points || 0
  }

  // If there are more than MAX_LIMIT records, need to paginate
  if (total > MAX_LIMIT) {
    const pages = Math.ceil(total / MAX_LIMIT)
    for (let i = 1; i < pages; i++) {
      const moreRes = await db.collection('records')
        .where({ familyId })
        .field({ points: true })
        .skip(i * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .get()

      for (const record of moreRes.data) {
        balance += record.points || 0
      }
    }
  }

  return {
    code: 0,
    data: { balance },
    msg: 'success'
  }
}

// Action: delete a record (creator or admin only)
async function deleteAction(OPENID, { recordId }) {
  if (!recordId) {
    return { code: -1, msg: '缺少recordId' }
  }

  // Get the record
  const recordRes = await db.collection('records').doc(recordId).get()
  const record = recordRes.data

  // Get user info to check role
  const userRes = await db.collection('users').doc(OPENID).get()
  const user = userRes.data

  // Check permission: creator or admin
  if (record.createdBy !== OPENID && user.role !== 'admin') {
    return { code: -1, msg: '无权删除此记录' }
  }

  // Verify same family
  if (user.familyId !== record.familyId) {
    return { code: -1, msg: '无权删除此记录' }
  }

  await db.collection('records').doc(recordId).remove()

  return { code: 0, data: null, msg: 'success' }
}

async function getUserFamilyId(OPENID) {
  const userRes = await db.collection('users').doc(OPENID).get()
  return userRes.data.familyId
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  try {
    switch (action) {
      case 'add':
        return await addAction(OPENID, event)
      case 'list': {
        const familyId = event.familyId || await getUserFamilyId(OPENID)
        return await listAction({ ...event, familyId })
      }
      case 'getBalance': {
        const familyId = event.familyId || await getUserFamilyId(OPENID)
        return await getBalanceAction({ familyId })
      }
      case 'delete':
        return await deleteAction(OPENID, event)
      default:
        return { code: -1, msg: '未知的操作类型' }
    }
  } catch (err) {
    return { code: -1, msg: err.message || '操作失败' }
  }
}
