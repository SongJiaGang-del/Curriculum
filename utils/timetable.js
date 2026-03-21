import { getKeys, getStorage, setStorage } from './storage'

function uid() {
	return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function getSchedules() {
	const KEYS = getKeys()
	return getStorage(KEYS.schedules, [])
}

export function saveSchedules(list) {
	const KEYS = getKeys()
	setStorage(KEYS.schedules, list)
}

export function getActiveScheduleId() {
	const KEYS = getKeys()
	return getStorage(KEYS.activeScheduleId, '')
}

export function setActiveScheduleId(id) {
	const KEYS = getKeys()
	setStorage(KEYS.activeScheduleId, id)
}

export function getActiveSchedule() {
	const schedules = getSchedules()
	const id = getActiveScheduleId()
	if (!id) return null
	return schedules.find(s => s.id === id) || null
}

export function ensureActiveSchedule() {
	const schedules = getSchedules()
	let id = getActiveScheduleId()
	let active = id ? schedules.find(s => s.id === id) : null
	if (active) return active
	if (schedules.length === 0) return null
	id = schedules[0].id
	setActiveScheduleId(id)
	return schedules[0]
}

export function createEmptySchedule(name = '新课表') {
	const now = new Date()
	return {
		id: uid(),
		name,
		createdAt: now.toISOString(),
		updatedAt: now.toISOString(),
		courses: []
	}
}

export function addSchedule(name) {
	const schedules = getSchedules()
	const s = createEmptySchedule(name)
	schedules.unshift(s)
	saveSchedules(schedules)
	setActiveScheduleId(s.id)
	return s
}

export function deleteSchedule(id) {
	const schedules = getSchedules().filter(s => s.id !== id)
	saveSchedules(schedules)
	const active = getActiveScheduleId()
	if (active === id) {
		setActiveScheduleId(schedules[0]?.id || '')
	}
}

export function renameSchedule(id, name) {
	
	const KEYS = getKeys()
	const list = getStorage(KEYS.schedules, [])
	const target = list.find(s => s.id === id)
	if (target) {
		target.name = name
		setStorage(KEYS.schedules, list)
	}
}

export function upsertCoursesToActive(courses) {
	const schedules = getSchedules()
	const id = getActiveScheduleId()
	const s = schedules.find(it => it.id === id)
	if (!s) return
	s.courses = Array.isArray(courses) ? courses : []
	s.updatedAt = new Date().toISOString()
	saveSchedules(schedules)
}

export function appendCourseToActive(course) {
	const schedules = getSchedules()
	const id = getActiveScheduleId()
	const s = schedules.find(it => it.id === id)
	if (!s) return
	const c = course?.id ? course : newCourse(course)
	s.courses = Array.isArray(s.courses) ? [...s.courses, c] : [c]
	s.updatedAt = new Date().toISOString()
	saveSchedules(schedules)
	return c
}

export function removeCourseFromActive(courseId) {
	const schedules = getSchedules()
	const id = getActiveScheduleId()
	const s = schedules.find(it => it.id === id)
	if (!s) return
	s.courses = (s.courses || []).filter(c => c.id !== courseId)
	s.updatedAt = new Date().toISOString()
	saveSchedules(schedules)
}

export function getCourseColor(name) {
	// 通过课程名 hash 成稳定颜色
	const palette = [
		'#2563eb',
		'#7c3aed',
		'#db2777',
		'#ea580c',
		'#16a34a',
		'#0891b2',
		'#b45309',
		'#4f46e5'
	]
	let h = 0
	for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
	return palette[h % palette.length]
}

export function normalizeWeeks(weeks) {
	const set = new Set()
		; (Array.isArray(weeks) ? weeks : []).forEach(w => {
			const n = Number(w)
			if (Number.isFinite(n) && n >= 1 && n <= 60) set.add(n)
		})
	return Array.from(set).sort((a, b) => a - b)
}

export function newCourse(partial) {
	return {
		id: uid(),
		name: partial?.name || '',
		teacher: partial?.teacher || '',
		room: partial?.room || '',
		day: Number(partial?.day || 1), // 1-7
		startSection: Number(partial?.startSection || 1),
		endSection: Number(partial?.endSection || partial?.startSection || 1),
		weeks: normalizeWeeks(partial?.weeks || []),
		source: partial?.source || ''
	}
}

export function setScheduleTermStart(scheduleId, termStart) {
	var list = getSchedules()
	var target = list.find(function(s) { return s.id === scheduleId })
	if (target) {
		target.termStart = termStart
		saveSchedules(list)
	}
}

export function getScheduleTermStart(scheduleId) {
	var list = getSchedules()
	var target = list.find(function(s) { return s.id === scheduleId })
	return target && target.termStart ? target.termStart : ''
}