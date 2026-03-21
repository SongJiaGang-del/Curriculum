import { getKeys, getStorage, setStorage, toISODate } from './storage'

function parseISODate(s) {
	if (!s || typeof s !== 'string') return null
	const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (!m) return null
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
	if (Number.isNaN(d.getTime())) return null
	return d
}

export function getEffectiveToday() {
	const KEYS = getKeys()
	const calibrated = getStorage(KEYS.calibratedDate, '')
	const cd = parseISODate(calibrated)
	return cd || new Date()
}

export function getTermStartDate() {
	// 优先读当前活动课表的 termStart
	try {
		var KEYS = getKeys()
		var schedules = getStorage(KEYS.schedules, [])
		var activeId = getStorage(KEYS.activeScheduleId, '')
		if (activeId) {
			var active = schedules.find(function(s) { return s.id === activeId })
			if (active && active.termStart) {
				return new Date(active.termStart)
			}
		}
	} catch (e) {}

	// 兜底：读全局的
	var KEYS = getKeys()
	var ts = getStorage(KEYS.termStart, '')
	if (ts) return new Date(ts)

	// 默认：本学期大概开始日期
	var now = new Date()
	var month = now.getMonth()
	if (month >= 7) {
		return new Date(now.getFullYear(), 8, 1) // 9月1日
	} else {
		return new Date(now.getFullYear(), 1, 17) // 2月17日
	}
}

export function setTermStartDate(iso) {
	const KEYS = getKeys()
	setStorage(KEYS.termStart, iso)
}

export function setCalibratedDate(iso) {
	const KEYS = getKeys()
	setStorage(KEYS.calibratedDate, iso)
}

export function clearCalibratedDate() {
	const KEYS = getKeys()
	setStorage(KEYS.calibratedDate, '')
}

export function calcWeekNo(targetDate, termStartDate) {
	const t0 = new Date(termStartDate.getFullYear(), termStartDate.getMonth(), termStartDate.getDate()).getTime()
	const t1 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime()
	const diffDays = Math.floor((t1 - t0) / 86400000)
	return Math.max(1, Math.floor(diffDays / 7) + 1)
}

export function getWeekdayCN(d) {
	const day = d.getDay()
	return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day]
}

export function isoToday() {
	return toISODate(new Date())
}

