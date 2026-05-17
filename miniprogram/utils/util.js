function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = padZero(d.getMonth() + 1)
  const day = padZero(d.getDate())
  return `${year}-${month}-${day}`
}

function formatTime(date) {
  const d = new Date(date)
  const hour = padZero(d.getHours())
  const minute = padZero(d.getMinutes())
  return `${hour}:${minute}`
}

function formatDateTime(date) {
  return formatDate(date) + ' ' + formatTime(date)
}

function padZero(n) {
  return n < 10 ? '0' + n : '' + n
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekStart() {
  const d = getTodayStart()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d
}

function getMonthStart() {
  const d = getTodayStart()
  d.setDate(1)
  return d
}

function formatPoints(num) {
  if (num == null) return '0'
  const n = Number(num)
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1)
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  formatPoints,
  generateInviteCode,
  getTodayStart,
  getWeekStart,
  getMonthStart
}
