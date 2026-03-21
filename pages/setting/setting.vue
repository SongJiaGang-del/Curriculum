<template>
	<view class="page">
		<view class="tabs card">
			<view class="tab" :class="{ on: tab === 'times' }" @tap="tab = 'times'">上课时间</view>
			<view class="tab" :class="{ on: tab === 'date' }" @tap="tab = 'date'">日期校准</view>
			<view class="tab" :class="{ on: tab === 'manage' }" @tap="tab = 'manage'">课表管理</view>
		</view>

		<!-- 上课时间设置 -->
		<view v-if="tab === 'times'" class="card panel">
			<view class="row-between">
				<view class="p-title">1-13 节上课时间</view>
				<view class="tag">批量保存</view>
			</view>
			<view class="divider" style="margin: 14rpx 0"></view>

			<!-- 上午时段配置 -->
			<view class="period-wrap">
				<view class="period-title">上午时段（默认5节）</view>
				<view class="trow">
					<view class="sec">起始</view>
					<input class="tin" v-model="gen.morningStart" placeholder="08:00" />
					<view class="sec">节数</view>
					<input class="tin" v-model.number="gen.morningSections" placeholder="5" />
				</view>
			</view>

			<!-- 下午时段配置 -->
			<view class="period-wrap">
				<view class="period-title">下午时段（默认4节）</view>
				<view class="trow">
					<view class="sec">起始</view>
					<input class="tin" v-model="gen.afternoonStart" placeholder="13:30" />
					<view class="sec">节数</view>
					<input class="tin" v-model.number="gen.afternoonSections" placeholder="4" />
				</view>
			</view>

			<!-- 晚上时段配置 -->
			<view class="period-wrap">
				<view class="period-title">晚上时段（默认4节）</view>
				<view class="trow">
					<view class="sec">起始</view>
					<input class="tin" v-model="gen.eveningStart" placeholder="18:30" />
					<view class="sec">节数</view>
					<input class="tin" v-model.number="gen.eveningSections" placeholder="4" />
				</view>
			</view>

			<!-- 通用配置 -->
			<view class="trow">
				<view class="sec">课时</view>
				<input class="tin" v-model.number="gen.classMin" placeholder="40" />
				<view class="sec">课间</view>
				<input class="tin" v-model.number="gen.breakMin" placeholder="10" />
				<view class="btn-mini" @tap="applyGenerate">生成</view>
			</view>

			<!-- 课时列表 -->
			<view class="trow" v-for="t in times" :key="t.section">
				<view class="sec">{{ t.section }}</view>
				<input class="tin" v-model="t.start" placeholder="08:00" @input="handleStartTimeChange(t)" />
				<view class="dash muted">-</view>
				<input class="tin" v-model="t.end" placeholder="08:40" />
			</view>

			<view class="actions">
				<view class="btn btn-ghost" @tap="resetTimes">恢复默认</view>
				<view class="btn btn-primary" @tap="saveTimes">保存</view>
			</view>
		</view>

		<!-- 日期校准 -->
		<view v-else-if="tab === 'date'" class="card panel">
			<view class="p-title">日期校准</view>
			<view class="tag" style="margin-top: 8rpx">当前课表：{{ currentScheduleName }}</view>
			<view class="hint muted">选择“学期开始日期”和“当前日期”，系统会自动计算当前周次并更新首页显示。</view>

			<view class="divider" style="margin: 14rpx 0"></view>

			<view class="drow">
				<view class="label muted">学期开始（第1周周一）</view>
				<picker mode="date" :value="termStart" @change="onPickTermStart">
					<view class="pick">{{ termStart }}</view>
				</picker>
			</view>
			<view class="drow">
				<view class="label muted">当前日期（用于校准）</view>
				<picker mode="date" :value="calDate" @change="onPickCalDate">
					<view class="pick">{{ calDate }}</view>
				</picker>
			</view>

			<view class="tag" style="margin-top: 12rpx">计算结果：第 {{ computedWeek }} 周</view>

			<view class="actions">
				<view class="btn btn-ghost" @tap="clearCal">清除校准</view>
				<view class="btn btn-primary" @tap="saveDate">保存并生效</view>
			</view>
		</view>

		<!-- 课表管理 -->
		<view v-else class="card panel">
			<view class="row-between">
				<view class="p-title">课表管理</view>
				<view class="btn-mini" @tap="openAdd">新增课表</view>
			</view>
			<view class="hint muted">点击课表名称切换；删除需二次确认。</view>
			<view class="divider" style="margin: 14rpx 0"></view>

			<view v-if="schedules.length === 0" class="muted" style="padding: 20rpx 0">暂无课表，点击右上角新增。</view>

			<view v-for="s in schedules" :key="s.id" class="srow" @tap="switchSchedule(s.id)" @longpress.stop="openRename(s)">
				<view class="sname">
					<text class="name" :class="{ on: s.id === activeId }">{{ s.name }}</text>
					<text class="muted meta">（{{ (s.courses || []).length }} 门课）</text>
				</view>
				<view class="sactions">
					<view class="del" @tap.stop="delSchedule(s)">删除</view>
				</view>
			</view>
		</view>

		<!-- 新增课表弹窗 -->
		<view v-if="add.open" class="overlay-mask" @tap="closeAdd">
			<view class="add card" @tap.stop>
				<view class="add-title">新增课表</view>
				<input class="input" v-model="add.name" placeholder="例如：大二下学期" />
				<view class="actions">
					<view class="btn btn-ghost" @tap="closeAdd">取消</view>
					<view class="btn btn-primary" @tap="confirmAdd">创建</view>
				</view>
			</view>
		</view>
		
				<!-- 重命名课表弹窗 -->
				<view v-if="rename.open" class="overlay-mask" @tap="closeRename">
					<view class="add card" @tap.stop>
						<view class="add-title">重命名课表</view>
						<input class="input" v-model="rename.name" placeholder="输入新名称" />
						<view class="actions">
							<view class="btn btn-ghost" @tap="closeRename">取消</view>
							<view class="btn btn-primary" @tap="confirmRename">确定</view>
						</view>
					</view>
				</view>
	</view>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ensureInitStorage, getDefaultClassTimes, generateClassTimes, getKeys, getStorage, setStorage } from '@/utils/storage'
import { calcWeekNo, clearCalibratedDate, getTermStartDate, isoToday, setCalibratedDate } from '@/utils/date'
import { addSchedule, deleteSchedule, getActiveScheduleId, getSchedules, setActiveScheduleId, renameSchedule, setScheduleTermStart, getScheduleTermStart } from '@/utils/timetable'

const tab = ref('times')

const times = ref([])
const termStart = ref('')
const calDate = ref('')
const schedules = ref([])
const activeId = ref('')

// 分时段配置
const gen = reactive({
	morningStart: '08:00',
	morningSections: 5,
	afternoonStart: '13:30',
	afternoonSections: 4,
	eveningStart: '18:30',
	eveningSections: 4,
	classMin: 40,
	breakMin: 10
})

const add = reactive({ open: false, name: '' })
const rename = reactive({ open: false, id: '', name: '' })

function openRename(s) {
	rename.id = s.id
	rename.name = s.name || ''
	rename.open = true
}

function closeRename() {
	rename.open = false
}

function confirmRename() {
	var name = rename.name.trim()
	if (!name) {
		uni.showToast({ title: '名称不能为空', icon: 'none' })
		return
	}
	renameSchedule(rename.id, name)
	closeRename()
	refreshAll()
	uni.showToast({ title: '已重命名', icon: 'none' })
}

const computedWeek = computed(() => {
	const t0 = new Date(termStart.value)
	const t1 = new Date(calDate.value)
	if (Number.isNaN(t0.getTime()) || Number.isNaN(t1.getTime())) return 1
	return calcWeekNo(t1, t0)
})

// 解析时间字符串为分钟数（如08:00 → 480）
function parseTimeToMinutes(timeStr) {
	if (!/^\d{2}:\d{2}$/.test(timeStr)) return 0;
	const [hour, minute] = timeStr.split(':').map(Number);
	return hour * 60 + minute;
}

// 将分钟数转换为时间字符串（如480 → 08:00）
function formatMinutesToTime(minutes) {
	const hour = Math.floor(minutes / 60).toString().padStart(2, '0');
	const minute = (minutes % 60).toString().padStart(2, '0');
	return `${hour}:${minute}`;
}

// 判断时间段（上午/下午/晚上）
function getTimePeriod(minutes) {
	if (minutes <= 13 * 60) return 'morning'; // 上午（≤13:00）
	if (minutes <= 18 * 60) return 'afternoon'; // 下午（13:00~18:00）
	return 'evening'; // 晚上（≥18:00）
}

// 处理起始时间变化，自动更新结束时间+同时段后续课程
function handleStartTimeChange(timeItem) {
	const startStr = timeItem.start.trim();
	// 格式校验：必须是 HH:MM
	if (!/^\d{2}:\d{2}$/.test(startStr)) return;

	// 解析起始时间，计算当前课结束时间（+课时分钟数，默认40）
	const classMin = gen.classMin || 40;
	const startMinutes = parseTimeToMinutes(startStr);
	const endMinutes = startMinutes + classMin;
	timeItem.end = formatMinutesToTime(endMinutes);

	// 按时间段批量更新后续课程（同时间段内自动顺延）
	const currentPeriod = getTimePeriod(startMinutes);
	const currentIndex = times.value.findIndex(t => t.section === timeItem.section);
	
	// 遍历当前课程之后的所有课程
	for (let i = currentIndex + 1; i < times.value.length; i++) {
		const nextItem = times.value[i];
		const nextStartMinutes = parseTimeToMinutes(nextItem.start);
		const nextPeriod = getTimePeriod(nextStartMinutes);
		
		// 跨时间段则停止更新（上午→下午/下午→晚上 不联动）
		if (nextPeriod !== currentPeriod) break;

		// 以上一节课的结束时间 + 课间休息 作为当前课的起始时间
		const breakMin = gen.breakMin || 10;
		const prevEndMinutes = parseTimeToMinutes(times.value[i-1].end);
		nextItem.start = formatMinutesToTime(prevEndMinutes + breakMin);
		// 重新计算当前课的结束时间
		nextItem.end = formatMinutesToTime(prevEndMinutes + breakMin + classMin);
	}
}

function refreshAll() {
	ensureInitStorage()
	const KEYS = getKeys()
	times.value = getStorage(KEYS.classTimes, getDefaultClassTimes())
	// 优先读当前课表的学期开始日期
	var currentTermStart = getScheduleTermStart(getActiveScheduleId())
	termStart.value = currentTermStart || getStorage(KEYS.termStart, '')
	calDate.value = getStorage(KEYS.calibratedDate, '') || isoToday()

	const rule = getStorage(KEYS.classTimeRule, null)
	if (rule) {
		gen.morningStart = rule.morningStart || gen.morningStart
		gen.morningSections = Number(rule.morningSections ?? gen.morningSections)
		gen.afternoonStart = rule.afternoonStart || gen.afternoonStart
		gen.afternoonSections = Number(rule.afternoonSections ?? gen.afternoonSections)
		gen.eveningStart = rule.eveningStart || gen.eveningStart
		gen.eveningSections = Number(rule.eveningSections ?? gen.eveningSections)
		gen.classMin = Number(rule.classMin ?? gen.classMin)
		gen.breakMin = Number(rule.breakMin ?? gen.breakMin)
	}

	schedules.value = getSchedules()
	activeId.value = getActiveScheduleId()
}

function saveTimes() {
	const KEYS = getKeys()
	const ok = times.value.every(t => /^\d{2}:\d{2}$/.test(t.start) && /^\d{2}:\d{2}$/.test(t.end))
	if (!ok) {
		uni.showToast({ title: '时间格式应为 HH:MM', icon: 'none' })
		return
	}
	setStorage(KEYS.classTimes, times.value)
	uni.showToast({ title: '已保存', icon: 'none' })
}

function resetTimes() {
	times.value = getDefaultClassTimes()
}

function applyGenerate() {
	const KEYS = getKeys()
	// 校验必填参数
	const timeReg = /^\d{2}:\d{2}$/
	const isTimeValid = timeReg.test(gen.morningStart) && timeReg.test(gen.afternoonStart) && timeReg.test(gen.eveningStart)
	const isNumValid = gen.morningSections > 0 && gen.afternoonSections > 0 && gen.eveningSections > 0 && gen.classMin > 0 && gen.breakMin >= 0
	
	if (!isTimeValid || !isNumValid) {
		uni.showToast({ title: '请填写有效规则', icon: 'none' })
		return
	}
	
	// 生成分时段的课时
	times.value = generateClassTimes(
		gen.morningStart, gen.morningSections,
		gen.afternoonStart, gen.afternoonSections,
		gen.eveningStart, gen.eveningSections,
		gen.classMin, gen.breakMin
	)
	
	// 保存生成规则
	setStorage(KEYS.classTimeRule, {
		morningStart: gen.morningStart,
		morningSections: gen.morningSections,
		afternoonStart: gen.afternoonStart,
		afternoonSections: gen.afternoonSections,
		eveningStart: gen.eveningStart,
		eveningSections: gen.eveningSections,
		classMin: gen.classMin,
		breakMin: gen.breakMin
	})
	uni.showToast({ title: '已生成，记得点保存', icon: 'none' })
}

function onPickTermStart(e) {
	termStart.value = e.detail.value
}
function onPickCalDate(e) {
	calDate.value = e.detail.value
}

function clearCal() {
	clearCalibratedDate()
	calDate.value = isoToday()
	uni.showToast({ title: '已清除校准', icon: 'none' })
}

function saveDate() {
	const KEYS = getKeys()
	if (!termStart.value) {
		uni.showToast({ title: '请选择学期开始日期', icon: 'none' })
		return
	}

	// ★ 保存到当前活动课表
	var currentActiveId = getActiveScheduleId()
	if (currentActiveId) {
		setScheduleTermStart(currentActiveId, termStart.value)
	}

	// 同时保存全局的（作为默认值）
	setStorage(KEYS.termStart, termStart.value)

	setCalibratedDate(calDate.value)
	uni.showToast({ title: '已生效：第' + computedWeek.value + '周', icon: 'none' })
}

function switchSchedule(id) {
	setActiveScheduleId(id)
	activeId.value = id
	uni.showToast({ title: '已切换', icon: 'none' })
}

function delSchedule(s) {
	uni.showModal({
		title: '删除课表',
		content: `确定删除「${s.name}」吗？删除后无法恢复。`,
		confirmColor: '#ef4444',
		success: res => {
			if (!res.confirm) return
			deleteSchedule(s.id)
			refreshAll()
			uni.showToast({ title: '已删除', icon: 'none' })
		}
	})
}

function openAdd() {
	add.name = ''
	add.open = true
}
function closeAdd() {
	add.open = false
}
function confirmAdd() {
	const name = add.name.trim() || '新课表'
	addSchedule(name)
	closeAdd()
	refreshAll()
	uni.showToast({ title: '已创建', icon: 'none' })
}

onMounted(() => {
	refreshAll()
})

onLoad((q) => {
	ensureInitStorage()
	const t = q?.tab
	if (t === 'times' || t === 'date' || t === 'manage') tab.value = t
	refreshAll()
})


const currentScheduleName = computed(() => {
	var id = activeId.value
	if (!id) return '未选择'
	var s = schedules.value.find(function(item) { return item.id === id })
	return s ? s.name : '未知'
})
</script>

<style lang="scss" scoped>
.page {
	padding: 20rpx;
}
.tabs {
	display: flex;
	overflow: hidden;
}
.tab {
	flex: 1;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	color: #374151;
	background: rgba(17, 24, 39, 0.04);
}
.tab.on {
	background: #ffffff;
	font-weight: 900;
	color: #111827;
}
.panel {
	margin-top: 16rpx;
	padding: 20rpx;
}
.p-title {
	font-size: 30rpx;
	font-weight: 900;
}
.hint {
	margin-top: 10rpx;
	font-size: 24rpx;
	line-height: 1.4;
}

/* 时段标题 */
.period-title {
	font-size: 26rpx;
	font-weight: 800;
	margin: 16rpx 0 8rpx 0;
	color: #2563eb;
}
.period-wrap {
	margin-top: 10rpx;
}

.trow {
	display: flex;
	align-items: center;
	padding: 10rpx 0;
}
.sec {
	width: 70rpx;
	font-weight: 900;
}
.tin {
	flex: 1;
	height: 76rpx;
	border-radius: 16rpx;
	background: rgba(17, 24, 39, 0.04);
	padding: 0 14rpx;
}
.dash {
	width: 36rpx;
	text-align: center;
}

.actions {
	margin-top: 18rpx;
	display: flex;
	gap: 14rpx;
}
.actions .btn {
	flex: 1;
}

.drow {
	margin-top: 14rpx;
}
.label {
	font-size: 24rpx;
	margin-bottom: 8rpx;
}
.pick {
	height: 84rpx;
	border-radius: 16rpx;
	background: rgba(17, 24, 39, 0.04);
	padding: 0 16rpx;
	display: flex;
	align-items: center;
}

.btn-mini {
	padding: 10rpx 16rpx;
	border-radius: 14rpx;
	background: rgba(37, 99, 235, 0.12);
	color: #1d4ed8;
	font-size: 26rpx;
	font-weight: 800;
}

.srow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16rpx 0;
}
.srow + .srow {
	border-top: 1rpx solid rgba(17, 24, 39, 0.06);
}
.name {
	font-size: 28rpx;
	font-weight: 800;
}
.name.on {
	color: #2563eb;
}
.meta {
	margin-left: 10rpx;
	font-size: 24rpx;
}
.del {
	padding: 10rpx 14rpx;
	border-radius: 14rpx;
	background: rgba(239, 68, 68, 0.12);
	color: #dc2626;
	font-size: 24rpx;
	font-weight: 800;
}

.add {
	position: fixed;
	left: 50rpx;
	right: 50rpx;
	top: 35%;
	padding: 22rpx;
}
.add-title {
	font-size: 30rpx;
	font-weight: 900;
	margin-bottom: 12rpx;
}
.input {
	height: 84rpx;
	border-radius: 16rpx;
	background: rgba(17, 24, 39, 0.04);
	padding: 0 16rpx;
}

/* 新增：遮罩层样式（避免弹窗点击穿透） */
.overlay-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}
</style>