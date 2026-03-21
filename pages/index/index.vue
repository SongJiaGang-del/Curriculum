<template>
	<view class="page">
		<view class="topbar card" @tap="openScheduleSwitcher">
			<view class="row-between">
				<view>
					<view class="title">{{ activeSchedule?.name || '未创建课表' }}</view>
					<view class="sub muted">
						<text>{{ weekText }}</text>
						<text class="dot">·</text>
						<text>{{ dateText }}</text>
					</view>
				</view>
				<view class="row">
					<view v-if="schedules.length" class="tag">{{ schedules.length }} 个课表</view>
				</view>
			</view>
		</view>

		<view class="board card" @touchstart="onTouchStart" @touchend="onTouchEnd">
						<!-- ★ 回到本周按钮（非本周时显示） -->
			<view v-if="isViewingOtherWeek" class="back-current" @tap.stop="goBackToCurrentWeek">
				<text>回到本周 (第{{ weekNo }}周)</text>
			</view>
			<view v-if="!activeSchedule || !coursesThisWeek.length" class="empty">
				<view class="empty-title">课表为空</view>
				<view class="empty-sub muted">点击下方「导入」开始</view>
				<view class="empty-btn btn btn-primary" @tap="openImportOptions">点击导入课表</view>
			</view>

			<view v-else class="grid-wrap">
				<scroll-view class="grid-scroll" scroll-y>
					<view class="grid">
						<!-- 左侧：节次/时间（独立一栏，flex 占比控制） -->
						<view class="time-pane" :style="timePaneStyle">
							<view class="header-cell">
								<text class="muted">节次</text>
							</view>
							<view class="time-cell" v-for="t in classTimes" :key="t.section" :style="{ height: cellH + 'rpx' }">
								<view class="sec">{{ t.section }}</view>
								<view class="tm muted">
									<text class="tm-line">{{ t.start }}</text>
									<text class="tm-line">{{ t.end }}</text>
								</view>
							</view>
						</view>

						<!-- 右侧：周一~周日（自适应占满剩余空间） -->
						<view class="days-pane">
							<view class="grid-header">
								<view class="day-col header-cell" v-for="d in days" :key="d.day">
									<view class="day-name">{{ d.label }}</view>
									<view class="day-sub muted">{{ d.sub }}</view>
								</view>
							</view>

							<view class="grid-body">
								<view class="day-col" v-for="d in days" :key="d.day">
									<view class="day-canvas" :style="{ height: bodyH + 'rpx' }">
										<view class="grid-bg">
											<view
												v-for="t in classTimes"
												:key="t.section"
												class="grid-cell"
												:style="{ height: cellH + 'rpx' }"
												@tap="onCellTap(d.day, t.section)"
											></view>
										</view>
										<view
											v-for="c in coursesByDay[d.day]"
											:key="c.id"
											class="course"
											:style="courseStyle(c)"
											@tap.stop="openCourse(c)"
											@longpress.stop="removeCourse(c)"
										>
											<view class="course-name">{{ split3(c.name) }}</view>
											<view class="course-mid">{{ formatRoom(c.room || '未填教室') }}</view>
											<view class="course-sub">{{ split3(c.teacher || '未填教师') }}</view>
										</view>
									</view>
								</view>
							</view>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<view class="bottom safe-bottom">
			<view class="bottom-inner card">
				<view class="bbtn" @tap="openImportOptions">
					<text class="bbtn-text">导入</text>
				</view>
				<view class="divider-v"></view>
				<view class="bbtn" @tap="toggleMore">
					<text class="bbtn-text">···</text>
				</view>
			</view>
		</view>

		<!-- 更多菜单 -->
		<view v-if="showMore" class="overlay-mask" @tap="closeMore">
			<view class="more-menu" @tap.stop>
				<view class="more-item" @tap="goSetting('times')">上课时间设置</view>
				<view class="more-item" @tap="goSetting('date')">日期校准</view>
				<view class="more-item" @tap="goSetting('manage')">课表管理</view>
			</view>
		</view>

		<!-- 导入选项 -->
		<view v-if="showImport" class="overlay-mask" @tap="closeImport">
			<view class="modal" @tap.stop>
				<view class="modal-title">导入课表</view>
				<view class="opt" @tap="goImport('jw')">教务系统导入</view>
				<view class="opt" @tap="goImport('excel')">Excel 导入（.xlsx）</view>
				<view class="opt" @tap="goImport('html')">HTML 导入</view>
				<view class="opt-cancel" @tap="closeImport">取消</view>
			</view>
		</view>

		<!-- 课程详情 -->
		<view v-if="detail.open" class="overlay-mask" @tap="closeCourse">
			<view class="detail card" @tap.stop>
				<view class="row-between">
					<view class="detail-title">{{ detail.course?.name }}</view>
					<view class="tag">{{ detailTag }}</view>
				</view>
				<view class="detail-row"><text class="muted">教师</text><text class="val">{{ detail.course?.teacher || '未填写' }}</text></view>
				<view class="detail-row"><text class="muted">教室</text><text class="val">{{ detail.course?.room || '未填写' }}</text></view>
				<view class="detail-row"><text class="muted">周次</text><text class="val">{{ weeksText(detail.course?.weeks) }}</text></view>
				<view class="detail-row"><text class="muted">节次</text><text class="val">第 {{ detail.course?.startSection }}-{{ detail.course?.endSection }} 节</text></view>
				<view class="detail-actions">
					<view class="btn btn-ghost" @tap="closeCourse">关闭</view>
				</view>
			</view>
		</view>

		<!-- 新增课程（双击格子） -->
		<view v-if="add.open" class="overlay-mask" @tap="closeAdd">
			<view class="add card" @tap.stop>
				<view class="row-between">
					<view class="add-title">新增课程</view>
					<view class="tag">{{ addTag }}</view>
				</view>
				<view class="afield">
					<view class="label muted">课程名</view>
					<input class="ainput" v-model="add.form.name" placeholder="例如：线性代数" />
				</view>
				<view class="afield">
					<view class="label muted">教师（可选）</view>
					<input class="ainput" v-model="add.form.teacher" placeholder="例如：张老师" />
				</view>
				<view class="afield">
					<view class="label muted">教室（可选）</view>
					<input class="ainput" v-model="add.form.room" placeholder="例如：A101" />
				</view>
				<view class="afield">
					<view class="label muted">周次（可选，例：1-16周 / 1-16周(单)）</view>
					<input class="ainput" v-model="add.form.weekText" placeholder="默认：1-16周" />
				</view>

				<view class="afield">
					<view class="label muted">结束节次</view>
					<picker mode="selector" :range="endSectionOptions" :value="endSectionIndex" @change="onPickEndSection">
						<view class="pick">{{ add.form.endSection }}（点击选择）</view>
					</picker>
				</view>

				<view class="actions">
					<view class="btn btn-ghost" @tap="closeAdd">取消</view>
					<view class="btn btn-primary" @tap="saveAdd">保存</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ensureInitStorage, getKeys, getStorage } from '@/utils/storage'
import { calcWeekNo, getEffectiveToday, getTermStartDate, getWeekdayCN } from '@/utils/date'
import { appendCourseToActive, ensureActiveSchedule, getCourseColor, getSchedules, newCourse, removeCourseFromActive, setActiveScheduleId } from '@/utils/timetable'

const days = computed(() => {
	// 计算当前查看周的周一日期
	const termStart = termStartDate.value
	const weekOffset = displayWeek.value - 1
	const monday = new Date(termStart.getTime() + weekOffset * 7 * 86400000)
	
	// 确保 monday 是周一
	const wd = monday.getDay() === 0 ? 7 : monday.getDay()
	const realMonday = new Date(monday.getTime() - (wd - 1) * 86400000)
	
	const arr = []
	for (var i = 0; i < 7; i++) {
		const x = new Date(realMonday.getTime() + i * 86400000)
		arr.push({
			day: i + 1,
			label: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
			sub: (x.getMonth() + 1) + '/' + x.getDate()
		})
	}
	return arr
})

const schedules = ref([])
const activeSchedule = ref(null)
const termStartDate = ref(new Date())
const classTimes = ref([])

// 左侧时间栏占比（0~1），用 rpx 换算后强制生效
const timePaneRatio = ref(0.11)
const timePaneStyle = computed(() => {
	const rpx = Math.round(750 * timePaneRatio.value)
	// 给一个合理下限，避免过窄导致时间看不清
	const w = Math.max(70, rpx)
	return {
		flex: `0 0 ${w}rpx`,
		width: `${w}rpx`
	}
})

const showMore = ref(false)
const showImport = ref(false)

const detail = reactive({ open: false, course: null })
const add = reactive({
	open: false,
	day: 1,
	section: 1,
	form: { name: '', teacher: '', room: '', weekText: '1-16周', endSection: 1 }
})

const lastTap = reactive({ t: 0, key: '' })

const cellH = 110
const bodyH = computed(() => classTimes.value.length * cellH)

const today = computed(() => getEffectiveToday())
const weekNo = computed(() => calcWeekNo(today.value, termStartDate.value))
// ★ 当前查看的周（默认跟随真实周）
const viewWeek = ref(0) // 0 表示跟随当前周
const displayWeek = computed(() => {
	return viewWeek.value > 0 ? viewWeek.value : weekNo.value
})

// 最大周数（从课程中自动计算）
const maxWeek = computed(() => {
	const list = activeSchedule.value?.courses || []
	let max = 16
	list.forEach(c => {
		if (Array.isArray(c.weeks)) {
			c.weeks.forEach(w => {
				if (w > max) max = w
			})
		}
	})
	return max
})

// 是否在查看非当前周
const isViewingOtherWeek = computed(() => {
	return viewWeek.value > 0 && viewWeek.value !== weekNo.value
})

// 是否在查看过去的周
const isViewingPastWeek = computed(() => {
	return displayWeek.value < weekNo.value
})

// 滑动手势
const touchStartX = ref(0)
const touchStartY = ref(0)

function onTouchStart(e) {
	var touch = e.touches || e.changedTouches
	if (touch && touch.length > 0) {
		touchStartX.value = touch[0].clientX
		touchStartY.value = touch[0].clientY
	}
}

function onTouchEnd(e) {
	var touch = e.changedTouches
	if (!touch || touch.length === 0) return

	var dx = touch[0].clientX - touchStartX.value
	var dy = touch[0].clientY - touchStartY.value

	// 只有水平滑动距离 > 垂直滑动距离 且 > 60px 才算有效滑动
	if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return

	var current = displayWeek.value

	if (dx < 0) {
		// 向左滑 → 下一周
		if (current < maxWeek.value) {
			viewWeek.value = current + 1
		}
	} else {
		// 向右滑 → 上一周
		if (current > 1) {
			viewWeek.value = current - 1
		}
	}
}

function goBackToCurrentWeek() {
	viewWeek.value = 0
}

const weekText = computed(() => {
	var w = displayWeek.value
	if (isViewingOtherWeek.value) {
		return '第 ' + w + ' 周（非本周）'
	}
	return '第 ' + w + ' 周（' + getWeekdayCN(today.value) + '）'
})
const dateText = computed(() => {
	const d = today.value
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	const dd = String(d.getDate()).padStart(2, '0')
	return `${d.getFullYear()}-${mm}-${dd}`
})

const coursesThisWeek = computed(() => {
	const list = activeSchedule.value?.courses || []
	const w = displayWeek.value
	return list.filter(c => Array.isArray(c.weeks) ? c.weeks.includes(w) : true)
})

const coursesByDay = computed(() => {
	const map = {}
	for (let i = 1; i <= 7; i++) map[i] = []
	coursesThisWeek.value.forEach(c => {
		const d = Number(c.day || 1)
		if (!map[d]) map[d] = []
		map[d].push(c)
	})
	Object.keys(map).forEach(k => {
		map[k].sort((a, b) => Number(a.startSection) - Number(b.startSection))
	})
	return map
})

const detailTag = computed(() => {
	const c = detail.course
	if (!c) return ''
	const map = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' }
	return `${map[c.day] || '周?'} · ${c.startSection}-${c.endSection}节`
})

const addTag = computed(() => {
	const map = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' }
	return `${map[add.day] || '周?'} · 第${add.section}节`
})

const endSectionOptions = computed(() => {
	const opts = []
	for (let i = add.section; i <= (classTimes.value.length || 12); i++) opts.push(i)
	return opts
})
const endSectionIndex = computed(() => Math.max(0, endSectionOptions.value.indexOf(add.form.endSection)))

function weeksText(weeks) {
	if (!Array.isArray(weeks) || weeks.length === 0) return '不限'
	if (weeks.length > 16) return `${weeks[0]}-${weeks[weeks.length - 1]}周`
	return weeks.join('，') + '周'
}

function split3(text) {
	const s = String(text || '').replace(/\s+/g, '')
	if (!s) return ''
	let out = ''
	for (let i = 0; i < s.length; i++) {
		out += s[i]
		if ((i + 1) % 3 === 0 && i !== s.length - 1) out += '\n'
	}
	return out
}

function formatRoom(text) {
	const raw = String(text || '').trim()
	const s = raw.replace(/\s+/g, '')
	if (!s) return ''
	// A011 / B203 这类：字母 + 3位数字，保持同一行
	if (/^[A-Za-z]\d{3}$/.test(s)) return s

	// 文字 + 数字（结尾数字需要保持同一行）
	const m = s.match(/^(.*?)(\d{1,6})$/)
	if (m) {
		const prefix = m[1]
		const digits = m[2]
		if (!prefix) return digits
		const p = split3(prefix)
		// 数字行轻微缩进，且数字不拆分
		return `${p}\n  ${digits}`
	}

	return split3(s)
}

function parseWeekTextInput(text) {
	const t = String(text || '').trim() || '1-16周'
	const m1 = t.match(/(\d+)\s*-\s*(\d+)\s*周/)
	const m2 = t.match(/(\d+(?:\s*[,，]\s*\d+)+)\s*周/)
	const odd = /单/.test(t)
	const even = /双/.test(t)
	let weeks = []
	if (m1) {
		const a = Number(m1[1])
		const b = Number(m1[2])
		for (let i = a; i <= b; i++) weeks.push(i)
	} else if (m2) {
		weeks = m2[1].split(/[,，]/).map(x => Number(x.trim())).filter(Boolean)
	} else {
		// 允许用户输入 1-16 或 1,2,3
		const m3 = t.match(/(\d+)\s*-\s*(\d+)/)
		const m4 = t.match(/(\d+(?:\s*[,，]\s*\d+)+)/)
		if (m3) {
			const a = Number(m3[1])
			const b = Number(m3[2])
			for (let i = a; i <= b; i++) weeks.push(i)
		} else if (m4) {
			weeks = m4[1].split(/[,，]/).map(x => Number(x.trim())).filter(Boolean)
		}
	}
	if (odd) weeks = weeks.filter(w => w % 2 === 1)
	if (even) weeks = weeks.filter(w => w % 2 === 0)
	// 兜底
	weeks = weeks.filter(w => Number.isFinite(w) && w >= 1 && w <= 60)
	return Array.from(new Set(weeks)).sort((a, b) => a - b)
}

function refresh() {
	ensureInitStorage()
	schedules.value = getSchedules()
	activeSchedule.value = ensureActiveSchedule()
	const KEYS = getKeys()
	classTimes.value = getStorage(KEYS.classTimes, [])

	// ★ 更新学期开始日期（触发 weekNo 和 days 重新计算）
	termStartDate.value = getTermStartDate()
}


function openScheduleSwitcher() {
	if (!schedules.value?.length) {
		uni.showToast({ title: '暂无课表，请先导入或新增', icon: 'none' })
		return
	}
	const names = schedules.value.map(s => s.name || '未命名课表')
	uni.showActionSheet({
		itemList: names,
		success: (res) => {
			const idx = res.tapIndex
			const picked = schedules.value[idx]
			if (!picked) return
			setActiveScheduleId(picked.id)
			refresh()
			uni.showToast({ title: '已切换课表', icon: 'none' })
		}
	})
}

function openImportOptions() {
	showImport.value = true
}
function closeImport() {
	showImport.value = false
}
function goImport(mode) {
	showImport.value = false
	uni.navigateTo({ url: `/pages/import/import?mode=${mode}` })
}

function toggleMore() {
	showMore.value = !showMore.value
}
function closeMore() {
	showMore.value = false
}
function goSetting(tab) {
	showMore.value = false
	uni.navigateTo({ url: `/pages/setting/setting?tab=${tab}` })
}

function openCourse(c) {
	detail.course = c
	detail.open = true
}
function closeCourse() {
	detail.open = false
	detail.course = null
}

function removeCourse(c) {
	uni.showModal({
		title: '删除课程',
		content: `确定删除「${c.name}」吗？`,
		confirmColor: '#ef4444',
		success: res => {
			if (!res.confirm) return
			removeCourseFromActive(c.id)
			refresh()
			uni.showToast({ title: '已删除', icon: 'none' })
		}
	})
}

function onCellTap(day, section) {
	const key = `${day}-${section}`
	const now = Date.now()
	if (lastTap.key === key && now - lastTap.t <= 320) {
		openAdd(day, section)
		lastTap.key = ''
		lastTap.t = 0
		return
	}
	lastTap.key = key
	lastTap.t = now
}

function openAdd(day, section) {
	if (!activeSchedule.value) {
		uni.showToast({ title: '请先导入或创建课表', icon: 'none' })
		return
	}
	add.day = day
	add.section = section
	add.form = { name: '', teacher: '', room: '', weekText: '1-16周', endSection: section }
	add.open = true
}
function closeAdd() {
	add.open = false
}
function onPickEndSection(e) {
	const idx = Number(e.detail.value || 0)
	const v = endSectionOptions.value[idx]
	if (v) add.form.endSection = v
}
function saveAdd() {
	const name = add.form.name.trim()
	if (!name) {
		uni.showToast({ title: '请输入课程名', icon: 'none' })
		return
	}
	const weeks = parseWeekTextInput(add.form.weekText)
	const c = newCourse({
		name,
		teacher: add.form.teacher.trim(),
		room: add.form.room.trim(),
		day: add.day,
		startSection: add.section,
		endSection: Number(add.form.endSection || add.section),
		weeks: weeks.length ? weeks : Array.from({ length: 16 }, (_, i) => i + 1),
		source: 'manual'
	})
	appendCourseToActive(c)
	refresh()
	closeAdd()
	uni.showToast({ title: '已添加', icon: 'none' })
}

function courseStyle(c) {
	const start = Number(c.startSection || 1)
	const end = Number(c.endSection || start)
	const top = (start - 1) * cellH + 6
	const h = (end - start + 1) * cellH - 12
	const bg = getCourseColor(c.name)

	// ★ 过去的周 → 灰色 + 半透明
	if (isViewingPastWeek.value) {
		return {
			top: top + 'rpx',
			height: h + 'rpx',
			background: 'rgba(156, 163, 175, 0.5)',
			opacity: '0.7'
		}
	}

	return {
		top: top + 'rpx',
		height: h + 'rpx',
		background: bg
	}
}

onMounted(() => {
	refresh()
})

onShow(() => {
	refresh()
})
</script>

<style lang="scss" scoped>
.page {
	padding: 20rpx 20rpx 140rpx;
	
}
.topbar {
	padding: 20rpx 22rpx;
	margin-bottom: 16rpx;
}
.title {
	font-size: 34rpx;
	font-weight: 800;
}
.sub {
	margin-top: 8rpx;
	font-size: 24rpx;
	display: flex;
	align-items: center;
}
.dot {
	margin: 0 10rpx;
}

.board {
	padding: 12rpx;
	max-height: 1200rpx;
}

.empty {
	padding: 90rpx 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.empty-title {
	font-size: 36rpx;
	font-weight: 800;
}
.empty-sub {
	margin-top: 10rpx;
	font-size: 26rpx;
}
.empty-btn {
	margin-top: 26rpx;
	width: 360rpx;
}

.grid-wrap {
	width: 100%;
}
.grid-scroll {
	width: 100%;
	max-height: 1200rpx;
}
.grid {
	width: 100%;
	display: flex;
}
.days-pane {
	flex: 1 1 0;
	min-width: 0;
}
.grid-header {
	display: flex;
}
.header-cell {
	height: 96rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}
.day-col {
	flex: 1 1 0;
	min-width: 0;
}
.day-name {
	font-size: 28rpx;
	font-weight: 700;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.day-sub {
	font-size: 22rpx;
	margin-top: 4rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.grid-body {
	display: flex;
}
.time-cell {
	border-top: 1rpx solid rgba(17, 24, 39, 0.06);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	padding: 0 6rpx;
	box-sizing: border-box;
}
.sec {
	font-size: 24rpx;
	font-weight: 700;
}
.tm {
	margin-top: 4rpx;
	font-size: 18rpx;
	line-height: 1.1;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.tm-line {
	display: block;
	white-space: nowrap;
	transform: scale(0.9);
	transform-origin: center;
}
.day-canvas {
	position: relative;
	border-left: 1rpx solid rgba(17, 24, 39, 0.06);
}
.grid-bg {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 1;
	display: flex;
	flex-direction: column;
}
.grid-cell {
	border-top: 1rpx solid rgba(17, 24, 39, 0.06);
}
.course {
	position: absolute;
	left: 6rpx;
	right: 6rpx;
	border-radius: 16rpx;
	padding: 4rpx 8rpx;
	color: #fff;
	overflow: hidden;
	box-shadow: 0 14rpx 22rpx rgba(0, 0, 0, 0.12);
	z-index: 2;
	display: flex;
	flex-direction: column;
	text-align: center;
}
.course-name {
	font-size: 20rpx;
	font-weight: 800;
	line-height: 1.15;
	white-space: pre-line;
	word-break: normal;
}
.course-mid {
	margin-top: 6rpx;
	font-size: 18rpx;
	opacity: 0.92;
	white-space: pre-line;
	word-break: normal;
}
.course-sub {
	margin-top: 6rpx;
	font-size: 18rpx;
	opacity: 0.9;
	white-space: pre-line;
	word-break: normal;
}

.bottom {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 16rpx 20rpx;
}
.bottom-inner {
	height: 92rpx;
	display: flex;
	align-items: center;
	justify-content: space-around;
}
.bbtn {
	flex: 1;
	height: 92rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
.divider-v {
	width: 1rpx;
	height: 44rpx;
	background: rgba(17, 24, 39, 0.12);
}
.bbtn-text {
	font-size: 32rpx;
	font-weight: 800;
}

.more-menu {
	position: absolute;
	right: 24rpx;
	bottom: 150rpx;
	width: 320rpx;
	background: rgba(255, 255, 255, 0.98);
	border-radius: 18rpx;
	overflow: hidden;
	box-shadow: 0 18rpx 40rpx rgba(0, 0, 0, 0.18);
}
.more-item {
	padding: 22rpx 22rpx;
	font-size: 28rpx;
}
.more-item + .more-item {
	border-top: 1rpx solid rgba(17, 24, 39, 0.06);
}

.opt {
	padding: 18rpx 10rpx;
	font-size: 30rpx;
	border-radius: 14rpx;
	background: rgba(37, 99, 235, 0.08);
	margin-top: 14rpx;
}
.opt-cancel {
	padding: 18rpx 10rpx;
	margin-top: 14rpx;
	font-size: 30rpx;
	border-radius: 14rpx;
	background: rgba(17, 24, 39, 0.06);
}

.detail {
	position: fixed;
	left: 40rpx;
	right: 40rpx;
	top: 30%;
	padding: 22rpx 22rpx;
}
.detail-title {
	font-size: 32rpx;
	font-weight: 900;
}
.detail-row {
	margin-top: 14rpx;
	display: flex;
	justify-content: space-between;
	font-size: 28rpx;
}
.val {
	margin-left: 18rpx;
	max-width: 420rpx;
	text-align: right;
}
.detail-actions {
	margin-top: 20rpx;
}

.add {
	position: fixed;
	left: 40rpx;
	right: 40rpx;
	top: 18%;
	padding: 22rpx;
}
.add-title {
	font-size: 32rpx;
	font-weight: 900;
}
.afield {
	margin-top: 14rpx;
}
.label {
	font-size: 24rpx;
	margin-bottom: 8rpx;
}
.ainput {
	height: 84rpx;
	border-radius: 16rpx;
	background: rgba(17, 24, 39, 0.04);
	padding: 0 16rpx;
}
.pick {
	height: 84rpx;
	border-radius: 16rpx;
	background: rgba(17, 24, 39, 0.04);
	padding: 0 16rpx;
	display: flex;
	align-items: center;
}

.week-nav {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 10rpx 0 6rpx;
	gap: 20rpx;
}

.week-arrow {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 26rpx;
	color: #374151;
	border-radius: 50%;
	background: rgba(17, 24, 39, 0.06);
}

.week-arrow.disabled {
	opacity: 0.3;
	pointer-events: none;
}

.week-label {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.week-num {
	font-size: 28rpx;
	font-weight: 800;
	color: #111827;
}

.week-tag {
	font-size: 20rpx;
	padding: 2rpx 12rpx;
	border-radius: 8rpx;
	font-weight: 600;
}

.week-tag.current {
	background: rgba(37, 99, 235, 0.12);
	color: #2563eb;
}

.week-tag.past {
	background: rgba(156, 163, 175, 0.2);
	color: #9ca3af;
}

.week-tag.future {
	background: rgba(245, 158, 11, 0.12);
	color: #f59e0b;
}

.back-current {
	text-align: center;
	padding: 8rpx 0;
	font-size: 24rpx;
	color: #2563eb;
	font-weight: 600;
}
</style>
