const KEYS = {
	schedules: 'curriculum:schedules',
	activeScheduleId: 'curriculum:activeScheduleId',
	classTimes: 'curriculum:classTimes',
	termStart: 'curriculum:termStart',
	calibratedDate: 'curriculum:calibratedDate',
	classTimeRule: 'curriculum:classTimeRule'
}

export function getStorage(key, fallback) {
	try {
		const v = uni.getStorageSync(key)
		return v === '' || v === undefined || v === null ? fallback : v
	} catch (e) {
		return fallback
	}
}

export function setStorage(key, value) {
	uni.setStorageSync(key, value)
}

export function removeStorage(key) {
	uni.removeStorageSync(key)
}

// 分时段生成课时（上午/下午/晚上）
export function generateClassTimes(
	morningStart = '08:00', morningSections = 5,
	afternoonStart = '13:30', afternoonSections = 4,
	eveningStart = '18:30', eveningSections = 4,
	classMin = 40, breakMin = 10
) {
	function toMinutes(hhmm) {
		const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
		if (!m) return 0
		return Number(m[1]) * 60 + Number(m[2])
	}
	function toHHMM(min) {
		const h = Math.floor(min / 60) % 24
		const m = min % 60
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
	}

	const list = []
	let cur

	// 生成上午课时
	cur = toMinutes(morningStart)
	for (let i = 0; i < Number(morningSections); i++) {
		const s = toHHMM(cur)
		const e = toHHMM(cur + Number(classMin))
		list.push({ section: list.length + 1, start: s, end: e })
		cur += Number(classMin) + Number(breakMin)
	}

	// 生成下午课时
	cur = toMinutes(afternoonStart)
	for (let i = 0; i < Number(afternoonSections); i++) {
		const s = toHHMM(cur)
		const e = toHHMM(cur + Number(classMin))
		list.push({ section: list.length + 1, start: s, end: e })
		cur += Number(classMin) + Number(breakMin)
	}

	// 生成晚上课时
	cur = toMinutes(eveningStart)
	for (let i = 0; i < Number(eveningSections); i++) {
		const s = toHHMM(cur)
		const e = toHHMM(cur + Number(classMin))
		list.push({ section: list.length + 1, start: s, end: e })
		cur += Number(classMin) + Number(breakMin)
	}

	return list
}

export function getDefaultClassTimes() {
	// 上午5节(8:00)、下午4节(13:30)、晚上4节(18:30)，每节课40分钟，课间10分钟
	return generateClassTimes('08:00', 5, '13:30', 4, '18:30', 4, 40, 10)
}

export function ensureInitStorage() {
	const schedules = getStorage(KEYS.schedules, null)
	if (!schedules) {
		setStorage(KEYS.schedules, [])
	}
	const classTimes = getStorage(KEYS.classTimes, null)
	if (!classTimes) {
		setStorage(KEYS.classTimes, getDefaultClassTimes())
	}
	const termStart = getStorage(KEYS.termStart, null)
	if (!termStart) {
		// 默认：本周周一作为学期起始（用户可在日期校准中调整）
		const now = new Date()
		const day = now.getDay() === 0 ? 7 : now.getDay()
		const monday = new Date(now.getTime() - (day - 1) * 86400000)
		setStorage(KEYS.termStart, toISODate(monday))
	}
}

export function toISODate(d) {
	const yyyy = d.getFullYear()
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${yyyy}-${mm}-${dd}`
}

export function getKeys() {
	return KEYS
}