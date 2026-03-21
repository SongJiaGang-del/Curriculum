<template>
	<view class="page">
		<view class="tabs card">
			<view class="tab" :class="{ on: tab === 'jw' }" @tap="switchTab('jw')">教务系统</view>
			<view class="tab" :class="{ on: tab === 'excel' }" @tap="switchTab('excel')">Excel</view>
			<view class="tab" :class="{ on: tab === 'html' }" @tap="switchTab('html')">HTML</view>
		</view>

		<view class="panel card">
			<!-- 教务导入 -->
			<view v-if="tab === 'jw'">
				<view class="field">
					<view class="label muted">选择学校</view>
					<picker mode="selector" :range="schools" range-key="name" @change="onPickSchool">
						<view class="input" style="line-height: 84rpx;">
							{{ selectedSchool ? selectedSchool.name : '请选择学校' }}
						</view>
					</picker>
				</view>
				<view class="btn btn-primary" style="margin-top: 16rpx" @tap="goWebviewImport">前往教务系统登录</view>
				<view class="hint muted">提示：登录后进入个人课表页面，点击悬浮的「课表导入」按钮即可提取课表。</view>
			</view>

			<!-- Excel 导入 -->
			<view v-else-if="tab === 'excel'">
				<view class="muted">请选择 .xlsx 文件（解析依赖 xlsx 库，H5 运行最稳定）。</view>
				<view class="btn btn-primary" style="margin-top: 16rpx" @tap="chooseExcel" :class="{ disabled: loading }">
					{{ loading ? '解析中...' : '选择文件并解析' }}
				</view>
				<view v-if="excelName" class="picked muted">已选择：{{ excelName }}</view>
				<view class="hint muted">建议格式：第一行「周一~周日」，第一列节次(1..12)，单元格内容如：课程@教师@教室@1-16周@1-2节。</view>
			</view>

			<!-- HTML 导入 -->
			<view v-else>
				<textarea class="textarea" v-model="htmlText" placeholder="粘贴包含 <table> 的HTML代码" />
				<view class="btn btn-primary" style="margin-top: 16rpx" @tap="doHtmlImport" :class="{ disabled: loading }">
					{{ loading ? '解析中...' : '解析并预览' }}
				</view>
				<view class="hint muted">支持从网页复制的课表 table，解析失败会提示你检查格式。</view>
			</view>
		</view>

		<view v-if="preview.open" class="preview card">
			<view class="row-between">
				<view class="p-title">预览（{{ preview.courses.length }}）</view>
				<view class="tag">将覆盖当前课表</view>
			</view>
			<view class="divider" style="margin: 14rpx 0"></view>

			<scroll-view scroll-y class="plist">
				<view class="pitem" v-for="c in preview.courses" :key="c.id">
					<view class="pname">{{ c.name }}</view>
					<view class="psub muted">
						<text>{{ dayLabel(c.day) }}</text>
						<text class="dot">·</text>
						<text>{{ c.startSection }}-{{ c.endSection }}节</text>
						<text class="dot">·</text>
						<text>{{ c.room || '未填教室' }}</text>
					</view>
					<view class="psub muted">{{ c.teacher || '未填教师' }} · {{ weeksText(c.weeks) }}</view>
				</view>
			</scroll-view>

			<view class="pactions">
				<view class="btn btn-ghost" @tap="clearPreview">取消</view>
				<view class="btn btn-primary" @tap="confirmSave">确认保存</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { onShow, onLoad } from '@dcloudio/uni-app'
import { reactive, ref } from 'vue'
import { ensureInitStorage } from '@/utils/storage'
import { addSchedule, ensureActiveSchedule, upsertCoursesToActive } from '@/utils/timetable'
import { parseExcelFileToCourses, parseHtmlToCourses, parseJwMock } from '@/utils/parse'

const tab = ref('jw')
const loading = ref(false)

const schools = ref([
	{ id: 'zhengfang_zjcu', name: '浙江传媒学院（正方教务系统）', url: 'http://newjw.cuz.edu.cn/jwglxt' },
	{ id: 'qiangzhi_gzy', name: '贵州中医药大学（强智教务系统）', url: 'https://jwgl.gzy.edu.cn/jsxsd/' },
	{ id: 'zhengfang_zjcu', name: '贵州师范大学（正方教务系统）', url: 'https://jwgl.gznu.edu.cn/jwglxt/xtgl/login_slogin.html' },
	{ id: 'zhengfang_ncut', name: '北方工业大学（正方教务系统）', url: 'https://jwxtbk.ncut.edu.cn' },
	{ id: 'jinzhi_hqu', name: '华侨大学（金智教务系统）', url: 'https://jwapp-hqu-edu-cn-s.atrust.hqu.edu.cn:9443/jwapp/sys/emaphome/portal/index.do?forceCas=1' },
	{ id: 'zhengfang_fjnu', name: '福建师范大学（正方教务系统）', url: 'http://jwglxt.fjnu.edu.cn/' },
	{ id: 'cust_portal', name: '长春理工大学（门户入口）', url: 'https://portal.cust.edu.cn' },
	{ id: 'xmu_jw', name: '厦门大学（教务系统）', url: 'https://jw.xmu.edu.cn/new/index.html' },

])
const selectedSchool = ref(schools.value[0])

const excelName = ref('')
const htmlText = ref('')

const preview = reactive({ open: false, courses: [] })

function switchTab(t) {
	tab.value = t
	clearPreview()
}

function openPreview(courses) {
	preview.courses = courses || []
	preview.open = true
}

function clearPreview() {
	preview.open = false
	preview.courses = []
}

function dayLabel(day) {
	return ['周?', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][Number(day) || 0] || '周?'
}

function weeksText(weeks) {
	if (!Array.isArray(weeks) || weeks.length === 0) return '不限周次'
	if (weeks.length > 16) return `${weeks[0]}-${weeks[weeks.length - 1]}周`
	return weeks.join('，') + '周'
}

function onPickSchool(e) {
	const idx = Number(e.detail.value)
	selectedSchool.value = schools.value[idx]
}

function goWebviewImport() {
	if (!selectedSchool.value) {
		uni.showToast({ title: '请先选择学校', icon: 'none' })
		return
	}

	// ★ 判断是否切换了学校
	var lastSchoolId = ''
	try { lastSchoolId = uni.getStorageSync('__last_jw_school') || '' } catch(e) {}
	
	var currentSchoolId = selectedSchool.value.id
	var needRelogin = lastSchoolId !== '' && lastSchoolId !== currentSchoolId
	
	// 记录当前学校
	try { uni.setStorageSync('__last_jw_school', currentSchoolId) } catch(e) {}

	uni.navigateTo({
		url: `/pages/import/webview?url=${encodeURIComponent(selectedSchool.value.url)}&schoolId=${selectedSchool.value.id}&clearCache=${needRelogin ? '1' : '0'}`
	})
}

async function chooseExcel() {
	if (loading.value) return
	try {
		loading.value = true
		const res = await uni.chooseFile({ count: 1, extension: ['xlsx'] })
		const f = res?.tempFiles?.[0]
		if (!f) throw new Error('未选择文件')
		excelName.value = f.name || ''
		const courses = await parseExcelFileToCourses(f)
		openPreview(courses)
	} catch (e) {
		uni.showToast({ title: e?.message || '解析失败，请检查数据格式', icon: 'none' })
	} finally {
		loading.value = false
	}
}

async function doHtmlImport() {
	if (loading.value) return
	try {
		loading.value = true
		await new Promise(r => setTimeout(r, 100))
		const courses = parseHtmlToCourses(htmlText.value)
		openPreview(courses)
	} catch (e) {
		uni.showToast({ title: e?.message || '解析失败，请检查数据格式', icon: 'none' })
	} finally {
		loading.value = false
	}
}

function confirmSave() {
	try {
		ensureInitStorage()
		let active = ensureActiveSchedule()
		if (!active) {
			active = addSchedule('我的课表')
		}
		upsertCoursesToActive(preview.courses)
		uni.showToast({ title: '已保存', icon: 'none' })
		clearPreview()
		setTimeout(() => {
			uni.navigateBack({ delta: 1 })
		}, 350)
	} catch (e) {
		uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
	}
}

onShow(() => {
	const temp = uni.getStorageSync('temp_import_courses')
	if (temp && Array.isArray(temp)) {
		openPreview(temp)
		uni.removeStorageSync('temp_import_courses')
	}
})

onLoad((q) => {
	ensureInitStorage()
	const m = q?.mode
	if (m === 'jw' || m === 'excel' || m === 'html') tab.value = m
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
.field {
	margin-bottom: 14rpx;
}
.label {
	font-size: 24rpx;
	margin-bottom: 8rpx;
}
.input {
	height: 84rpx;
	border-radius: 16rpx;
	background: rgba(17, 24, 39, 0.04);
	padding: 0 16rpx;
}
.textarea {
	width: 100%;
	min-height: 320rpx;
	border-radius: 16rpx;
	background: rgba(17, 24, 39, 0.04);
	padding: 16rpx;
	box-sizing: border-box;
}
.hint {
	margin-top: 14rpx;
	font-size: 24rpx;
	line-height: 1.4;
}
.picked {
	margin-top: 12rpx;
	font-size: 24rpx;
}
.disabled {
	opacity: 0.6;
}

.preview {
	margin-top: 16rpx;
	padding: 18rpx 18rpx 16rpx;
}
.p-title {
	font-size: 30rpx;
	font-weight: 900;
}
.plist {
	height: 520rpx;
}
.pitem {
	padding: 12rpx 0;
}
.pname {
	font-size: 28rpx;
	font-weight: 800;
}
.psub {
	margin-top: 6rpx;
	font-size: 24rpx;
}
.dot {
	margin: 0 10rpx;
}
.pactions {
	margin-top: 14rpx;
	display: flex;
	gap: 14rpx;
}
.pactions .btn {
	flex: 1;
}
</style>

