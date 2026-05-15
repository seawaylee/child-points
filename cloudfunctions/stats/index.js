const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 100

// Helper: get start of today
function getStartOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

// Helper: get start of this week (Monday)
function getStartOfWeek() {
  const now = new Date()
  const day = now.getDay()
  // Monday is day 1, Sunday is day 0
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Helper: fetch all records for a family (with pagination)
async function fetchAllRecords(familyId) {
  const countRes = await db.collection('records')
    .where({ familyId })
    .count()

  const total = countRes.total
  if (total === 0) return []

  const allRecords = []
  const pages = Math.ceil(total / MAX_LIMIT)

  for (let i = 0; i < pages; i++) {
    const res = await db.collection('records')
      .where({ familyId })
      .skip(i * MAX_LIMIT)
      .limit(MAX_LIMIT)
      .get()
    allRecords.push(...res.data)
  }

  return allRecords
}

// Action: summary statistics
async function summaryAction({ familyId }) {
  if (!familyId) {
    return { code: -1, msg: '缺少familyId' }
  }

  const records = await fetchAllRecords(familyId)

  const startOfToday = getStartOfToday()
  const startOfWeek = getStartOfWeek()

  let totalEarn = 0
  let totalSpend = 0
  let todayEarn = 0
  let todaySpend = 0
  let weekEarn = 0
  let weekSpend = 0

  for (const record of records) {
    const points = record.points || 0
    const createdAt = record.createdAt

    // Total
    if (points > 0) {
      totalEarn += points
    } else {
      totalSpend += Math.abs(points)
    }

    // Today
    if (createdAt && new Date(createdAt) >= startOfToday) {
      if (points > 0) {
        todayEarn += points
      } else {
        todaySpend += Math.abs(points)
      }
    }

    // This week
    if (createdAt && new Date(createdAt) >= startOfWeek) {
      if (points > 0) {
        weekEarn += points
      } else {
        weekSpend += Math.abs(points)
      }
    }
  }

  return {
    code: 0,
    data: {
      totalEarn,
      totalSpend,
      balance: totalEarn - totalSpend,
      todayEarn,
      todaySpend,
      weekEarn,
      weekSpend
    },
    msg: 'success'
  }
}

// Action: recent records
async function recentAction({ familyId, limit = 10 }) {
  if (!familyId) {
    return { code: -1, msg: '缺少familyId' }
  }

  const res = await db.collection('records')
    .where({ familyId })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return {
    code: 0,
    data: res.data,
    msg: 'success'
  }
}

async function getUserFamilyId(OPENID) {
  const userRes = await db.collection('users').doc(OPENID).get()
  return userRes.data.familyId
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  try {
    const familyId = event.familyId || await getUserFamilyId(OPENID)
    if (!familyId) {
      return { code: -1, msg: '您尚未加入任何家庭' }
    }

    switch (action) {
      case 'summary':
        return await summaryAction({ familyId })
      case 'recent':
        return await recentAction({ familyId, limit: event.limit })
      default:
        return { code: -1, msg: '未知的操作类型' }
    }
  } catch (err) {
    return { code: -1, msg: err.message || '操作失败' }
  }
}
