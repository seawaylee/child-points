const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const PAGE_SIZE = 20

// Action: list poems with filters
async function listPoems({ dynasty, form, level, page }) {
  const p = Math.max(1, page || 1)
  const where = {}
  if (dynasty) where.dynasty = dynasty
  if (form) where.form = form
  if (level) where.level = level

  const countRes = await db.collection('poems').where(where).count()
  const total = countRes.total

  const res = await db.collection('poems')
    .where(where)
    .orderBy('createdAt', 'asc')
    .skip((p - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .get()

  return {
    code: 0,
    data: res.data,
    total,
    page: p,
    pageSize: PAGE_SIZE,
    msg: 'success'
  }
}

// Action: get a single poem by id
async function getPoem({ poemId }) {
  if (!poemId) return { code: -1, msg: '缺少poemId' }
  const res = await db.collection('poems').doc(poemId).get()
  return { code: 0, data: res.data, msg: 'success' }
}

// Action: list English words by grade
async function listWords({ grade, page }) {
  const p = Math.max(1, page || 1)
  const where = {}
  if (grade) where.grade = grade

  const countRes = await db.collection('english_words').where(where).count()
  const total = countRes.total

  const res = await db.collection('english_words')
    .where(where)
    .skip((p - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .get()

  return {
    code: 0,
    data: res.data,
    total,
    page: p,
    pageSize: PAGE_SIZE,
    msg: 'success'
  }
}

// Action: list English sentences by level
async function listSentences({ level, category, page }) {
  const p = Math.max(1, page || 1)
  const where = {}
  if (level) where.level = level
  if (category) where.category = category

  const countRes = await db.collection('english_sentences').where(where).count()
  const total = countRes.total

  const res = await db.collection('english_sentences')
    .where(where)
    .skip((p - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .get()

  return {
    code: 0,
    data: res.data,
    total,
    page: p,
    pageSize: PAGE_SIZE,
    msg: 'success'
  }
}

// Action: list English articles by level
async function listArticles({ level, page }) {
  const p = Math.max(1, page || 1)
  const where = {}
  if (level) where.level = level

  const countRes = await db.collection('english_articles').where(where).count()
  const total = countRes.total

  const res = await db.collection('english_articles')
    .where(where)
    .skip((p - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .get()

  return {
    code: 0,
    data: res.data,
    total,
    page: p,
    pageSize: PAGE_SIZE,
    msg: 'success'
  }
}

// Action: generate random math problems
async function randomMath({ grade, type, count }) {
  const c = Math.min(Math.max(count || 10, 1), 50)
  const gradeNum = Math.min(Math.max(parseInt(grade) || 1, 1), 6)

  const problems = []
  for (let i = 0; i < c; i++) {
    problems.push(generateMathProblem(gradeNum, type || 'mixed'))
  }

  return { code: 0, data: problems, msg: 'success' }
}

function generateMathProblem(grade, type) {
  let a, b, op, answer

  const maxNum = grade <= 2 ? 20 : grade <= 4 ? 100 : 1000
  const ops = type === 'mixed'
    ? ['+', '-', '×', '÷']
    : [type]

  op = ops[Math.floor(Math.random() * ops.length)]

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * maxNum) + 1
      b = Math.floor(Math.random() * maxNum) + 1
      answer = a + b
      break
    case '-':
      a = Math.floor(Math.random() * maxNum) + 1
      b = Math.floor(Math.random() * a) + 1
      answer = a - b
      break
    case '×':
      const mulMax = grade <= 3 ? 9 : 12
      a = Math.floor(Math.random() * mulMax) + 2
      b = Math.floor(Math.random() * mulMax) + 2
      answer = a * b
      break
    case '÷':
      const divMax = grade <= 3 ? 9 : 12
      b = Math.floor(Math.random() * divMax) + 2
      answer = Math.floor(Math.random() * divMax) + 1
      a = b * answer
      break
    default:
      a = 1
      b = 1
      op = '+'
      answer = 2
  }

  return {
    expression: `${a} ${op} ${b}`,
    answer,
    op,
    grade
  }
}

// Action: batch import data
async function batchImportAction({ collection, data }) {
  if (!collection || !data || !Array.isArray(data)) {
    return { code: -1, msg: '缺少collection或data参数' }
  }

  const MAX_BATCH = 20
  let imported = 0

  for (let i = 0; i < data.length; i += MAX_BATCH) {
    const batch = data.slice(i, i + MAX_BATCH)
    const tasks = batch.map(item => db.collection(collection).add({ data: item }))
    await Promise.all(tasks)
    imported += batch.length
  }

  return { code: 0, msg: 'success', imported }
}

// Action: save per-item progress
async function saveItemProgress(OPENID, { type, itemId, status }) {
  if (!type || !itemId) return { code: -1, msg: '缺少type或itemId' }

  if (status === 'new') {
    // 重置：删除记录
    const existing = await db.collection('item_progress')
      .where({ openid: OPENID, type, itemId }).get()
    if (existing.data.length > 0) {
      await db.collection('item_progress').doc(existing.data[0]._id).remove()
    }
    return { code: 0, data: { status: 'new' }, msg: 'success' }
  }

  const data = {
    openid: OPENID,
    type,
    itemId,
    status: status || 'learning',
    studiedAt: db.serverDate()
  }

  const existing = await db.collection('item_progress')
    .where({ openid: OPENID, type, itemId }).get()

  if (existing.data.length > 0) {
    await db.collection('item_progress').doc(existing.data[0]._id).update({ data })
  } else {
    data.createdAt = db.serverDate()
    await db.collection('item_progress').add({ data })
  }

  return { code: 0, data: { status: data.status }, msg: 'success' }
}

// Action: get all item progress for a type
async function getItemProgress(OPENID, { type }) {
  if (!type) return { code: -1, msg: '缺少type' }

  const res = await db.collection('item_progress')
    .where({ openid: OPENID, type }).get()

  const progressMap = {}
  let mastered = 0, learning = 0
  res.data.forEach(item => {
    progressMap[item.itemId] = item.status
    if (item.status === 'mastered') mastered++
    else learning++
  })

  // 查内容总数
  const collectionMap = {
    poem: 'poems', word: 'english_words',
    sentence: 'english_sentences', article: 'english_articles'
  }
  let total = 0
  const col = collectionMap[type]
  if (col) {
    const countRes = await db.collection(col).count()
    total = countRes.total
  }

  return {
    code: 0,
    data: { progressMap, counts: { mastered, learning, total } },
    msg: 'success'
  }
}

// Action: get progress for specific item IDs
async function getItemProgressBatch(OPENID, { type, itemIds }) {
  if (!type || !itemIds || !itemIds.length) {
    return { code: 0, data: { progressMap: {} }, msg: 'success' }
  }

  const res = await db.collection('item_progress')
    .where({ openid: OPENID, type, itemId: _.in(itemIds) }).get()

  const progressMap = {}
  res.data.forEach(item => {
    progressMap[item.itemId] = item.status
  })

  return { code: 0, data: { progressMap }, msg: 'success' }
}

// Action: save study progress
async function saveProgress(OPENID, { type, groupId, itemIds, rating }) {
  if (!type || !groupId) {
    return { code: -1, msg: '缺少type或groupId' }
  }

  const status = rating >= 3 ? 'mastered' : rating >= 2 ? 'learning' : 'new'
  const data = {
    openid: OPENID,
    type,
    groupId,
    itemIds: itemIds || [],
    rating: rating || 1,
    status,
    studiedAt: db.serverDate()
  }

  // Upsert: update if exists, insert if not
  const existing = await db.collection('learn_progress')
    .where({ openid: OPENID, type, groupId })
    .get()

  if (existing.data.length > 0) {
    await db.collection('learn_progress').doc(existing.data[0]._id).update({ data })
  } else {
    await db.collection('learn_progress').add({ data })
  }

  return { code: 0, data: { status, rating }, msg: 'success' }
}

// Action: get study progress for a type
async function getProgress(OPENID, { type }) {
  if (!type) return { code: -1, msg: '缺少type' }

  const res = await db.collection('learn_progress')
    .where({ openid: OPENID, type })
    .get()

  const mastered = res.data.filter(p => p.status === 'mastered').length
  const learning = res.data.filter(p => p.status === 'learning').length

  return {
    code: 0,
    data: {
      groups: res.data,
      mastered,
      learning,
      total: res.data.length
    },
    msg: 'success'
  }
}

// Action: get group progress
async function getGroupProgress(OPENID, { type, groupId }) {
  const res = await db.collection('learn_progress')
    .where({ openid: OPENID, type, groupId })
    .get()

  if (res.data.length > 0) {
    return { code: 0, data: res.data[0], msg: 'success' }
  }
  return { code: 0, data: null, msg: 'success' }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  try {
    switch (action) {
      case 'listPoems':
        return await listPoems(event)
      case 'getPoem':
        return await getPoem(event)
      case 'listWords':
        return await listWords(event)
      case 'listSentences':
        return await listSentences(event)
      case 'listArticles':
        return await listArticles(event)
      case 'randomMath':
        return await randomMath(event)
      case 'batchImport':
        return await batchImportAction(event)
      case 'saveItemProgress':
        return await saveItemProgress(OPENID, event)
      case 'getItemProgress':
        return await getItemProgress(OPENID, event)
      case 'getItemProgressBatch':
        return await getItemProgressBatch(OPENID, event)
      case 'saveProgress':
        return await saveProgress(OPENID, event)
      case 'getProgress':
        return await getProgress(OPENID, event)
      case 'getGroupProgress':
        return await getGroupProgress(OPENID, event)
      default:
        return { code: -1, msg: '未知的操作类型' }
    }
  } catch (err) {
    return { code: -1, msg: err.message || '操作失败' }
  }
}
