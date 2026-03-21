import { newCourse, normalizeWeeks } from './timetable'
import * as XLSX from 'xlsx'

function cleanText(s) {
	return String(s || '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/<font[^>]*color=["']blue["'][^>]*>([^<]+)<\/font>/gi, '$1')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+\n/g, '\n')
		.replace(/\n\s+/g, '\n')
		.replace(/[ \t]{2,}/g, ' ')
		.trim()
}

function parseWeekText(text) {
	var t = cleanText(text)
	var m1 = t.match(/(\d+)\s*-\s*(\d+)\s*周/)
	var m2 = t.match(/(\d+(?:\s*[,，]\s*\d+)+)\s*周/)
	var odd = /单/.test(t)
	var even = /双/.test(t)
	var weeks = []

	if (m1) {
		var a = Number(m1[1]), b = Number(m1[2])
		if (!isNaN(a) && !isNaN(b) && a > 0 && b >= a && b <= 30) {
			for (var i = a; i <= b; i++) weeks.push(i)
		}
	} else if (m2) {
		weeks = m2[1].split(/[,，]/).map(function(x) { return Number(x.trim()) }).filter(function(x) { return !isNaN(x) && x > 0 })
	}

	if (weeks.length > 0) {
		if (odd) weeks = weeks.filter(function(w) { return w % 2 === 1 })
		if (even) weeks = weeks.filter(function(w) { return w % 2 === 0 })
	}
	if (weeks.length === 0) {
		weeks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
	}
	return normalizeWeeks ? normalizeWeeks(weeks) : weeks
}

function parseSectionText(text) {
	var t = cleanText(text)
	var m = t.match(/(\d+)\s*-\s*(\d+)\s*节/)
	if (m) return { start: Number(m[1]), end: Number(m[2]) }
	var s = t.match(/(\d+)\s*节/)
	if (s) return { start: Number(s[1]), end: Number(s[1]) }
	return null
}

function splitCellItems(cellText) {
	var t = cleanText(cellText)
	if (!t) return []
	return t.split(/\n|；|;|\|/g).map(function(x) { return x.trim() }).filter(Boolean)
}

function auditCourses(courses) {
	var invalid = []
	var list = Array.isArray(courses) ? courses : []
	list.forEach(function(c, i) {
		var issues = []
		if (!c || typeof c !== 'object') issues.push('not_object')
		else {
			if (!c.id) issues.push('id')
			if (!c.name) issues.push('name')
			if (!Number.isFinite(c.day) || c.day < 1 || c.day > 7) issues.push('day')
			if (!Number.isFinite(c.startSection) || c.startSection < 1) issues.push('startSection')
			if (!Number.isFinite(c.endSection) || c.endSection < 1) issues.push('endSection')
			if (!Array.isArray(c.weeks) || c.weeks.length === 0) issues.push('weeks')
		}
		if (issues.length) invalid.push({ index: i, issues: issues })
	})
	return { list: list, invalid: invalid }
}

function parseMatrixToCourses(matrix, source) {
	if (!Array.isArray(matrix) || matrix.length < 2) throw new Error('表格数据为空')
	var header = matrix[0].map(function(x) { return cleanText(x) })
	var dayIndex = []
	for (var c = 1; c < header.length; c++) {
		var map = { '周一':1,'周二':2,'周三':3,'周四':4,'周五':5,'周六':6,'周日':7,'星期一':1,'星期二':2,'星期三':3,'星期四':4,'星期五':5,'星期六':6,'星期日':7,'星期天':7 }
		dayIndex[c] = map[header[c]] || c
	}
	var courses = []
	for (var r = 1; r < matrix.length; r++) {
		var row = matrix[r]
		var sectionNo = Number(cleanText(row && row[0] ? row[0] : ''))
		if (isNaN(sectionNo)) continue
		for (var cc = 1; cc < (row || []).length; cc++) {
			var day = dayIndex[cc] || cc
			if (day < 1 || day > 7) continue
			var items = splitCellItems(row[cc])
			items.forEach(function(item) {
				var parts = item.split('@').map(function(x) { return x.trim() }).filter(Boolean)
				var name = parts[0] || ''
				if (!name) return
				var sec = parseSectionText(parts[4] || (sectionNo + '节')) || { start: sectionNo || 1, end: sectionNo || 1 }
				courses.push(newCourse({ name: name, teacher: parts[1]||'', room: parts[2]||'', day: day, startSection: sec.start, endSection: sec.end, weeks: parseWeekText(parts[3]||'1-16周'), source: source }))
			})
		}
	}
	if (courses.length === 0) throw new Error('未解析到课程')
	return courses
}

function readFileAsArrayBuffer(file) {
	return new Promise(function(resolve, reject) {
		try {
			var f = file && file.file ? file.file : file
			if (!f) return reject(new Error('未选择文件'))
			var reader = new FileReader()
			reader.onload = function() { resolve(reader.result) }
			reader.onerror = function() { reject(new Error('读取文件失败')) }
			reader.readAsArrayBuffer(f)
		} catch (e) {
			try {
				var fsm = uni.getFileSystemManager ? uni.getFileSystemManager() : null
				var path = file && (file.tempFilePath || file.path)
				if (!fsm || !path) return reject(new Error('不支持'))
				fsm.readFile({ filePath: path, success: function(res) { resolve(res.data) }, fail: function() { reject(new Error('读取失败')) } })
			} catch (e2) { reject(new Error('读取失败')) }
		}
	})
}

export function parseJwMock(payload) {
	if (!payload || !payload.username || !payload.password) throw new Error('请输入账号和密码')
	return [
		newCourse({ name: '高等数学', teacher: '张老师', room: 'A101', day: 1, startSection: 1, endSection: 2, weeks: parseWeekText('1-16周'), source: 'jw' }),
		newCourse({ name: '大学英语', teacher: '李老师', room: 'B203', day: 2, startSection: 3, endSection: 4, weeks: parseWeekText('1-16周(单)'), source: 'jw' }),
		newCourse({ name: '数据结构', teacher: '王老师', room: 'C301', day: 4, startSection: 5, endSection: 6, weeks: parseWeekText('2-14周(双)'), source: 'jw' }),
		newCourse({ name: '体育', teacher: '赵老师', room: '操场', day: 5, startSection: 7, endSection: 8, weeks: parseWeekText('1-16周'), source: 'jw' })
	]
}

export async function parseExcelFileToCourses(file) {
	var ab = await readFileAsArrayBuffer(file)
	var wb = XLSX.read(ab, { type: 'array' })
	var sn = wb.SheetNames && wb.SheetNames[0]
	if (!sn) throw new Error('Excel无工作表')
	return parseMatrixToCourses(XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false }), 'excel')
}

export function parseHtmlToCourses(html) {
	var text = String(html || '').trim()
	if (!text) throw new Error('请输入HTML代码')
	var tm = text.match(/<table[\s\S]*?>[\s\S]*?<\/table>/i)
	if (!tm) throw new Error('未找到 table 标签')
	var trList = tm[0].match(/<tr[\s\S]*?>[\s\S]*?<\/tr>/gi) || []
	var matrix = trList.map(function(tr) {
		var cl = tr.match(/<(td|th)[\s\S]*?>[\s\S]*?<\/\1>/gi) || []
		return cl.map(function(cell) { return cleanText(cell) })
	})
	return parseMatrixToCourses(matrix, 'html')
}

// ==================== 核心：正方HTML解析 ====================

export function parseZhengfangHTML(html) {
	if (!html) throw new Error('解析内容为空')

	var _lines = []
	function L(msg) {
		_lines.push(msg)
		try { uni.setStorageSync('__parse_log', _lines.join('\n')) } catch(e) {}
	}

	L('开始 len=' + html.length)
	var courses = []

	// ========== 1. 找课表 table ==========
	var tableHtml = ''
	var tm = html.match(/<table[^>]*id=["']?kbgrid_table_0["']?[^>]*>[\s\S]*?<\/table>/i)
	if (tm) { tableHtml = tm[0]; L('找到kbgrid_table_0') }
	if (!tableHtml) {
		tm = html.match(/<table[^>]*id=["']?[^"']*(?:table1|table_kb|kbtable)[^"']*["']?[^>]*>[\s\S]*?<\/table>/i)
		if (tm) { tableHtml = tm[0]; L('找到id匹配表格') }
	}
	if (!tableHtml) {
		var tables = html.match(/<table[\s\S]*?>[\s\S]*?<\/table>/gi) || []
		for (var ti = 0; ti < tables.length; ti++) {
			if ((tables[ti].indexOf('星期一') > -1 || tables[ti].indexOf('周一') > -1) &&
				(tables[ti].indexOf('星期二') > -1 || tables[ti].indexOf('周二') > -1)) {
				tableHtml = tables[ti]; break
			}
		}
	}
	if (!tableHtml) throw new Error('未找到课表表格')

	// ========== 2. 解析表头 ==========
	var trs = tableHtml.match(/<tr[\s\S]*?>[\s\S]*?<\/tr>/gi) || []
	L('tr=' + trs.length)

	var colDayMap = {}
	var headerRowIndex = -1
	var totalCols = 0

	for (var r = 0; r < trs.length; r++) {
		if (trs[r].indexOf('星期') > -1 || trs[r].indexOf('周一') > -1) {
			headerRowIndex = r
			var hCells = trs[r].match(/<(td|th)[\s\S]*?>[\s\S]*?<\/\1>/gi) || []

			// 计算真实列数（考虑colspan）
			var colIdx = 0
			for (var hc = 0; hc < hCells.length; hc++) {
				var hCsp = hCells[hc].match(/colspan=["']?(\d+)["']?/i)
				var hColspan = hCsp ? Number(hCsp[1]) : 1
				var ht = hCells[hc].replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim()

				var dn = 0
				if (ht.indexOf('星期一') > -1 || ht === '周一' || ht === '一') dn = 1
				else if (ht.indexOf('星期二') > -1 || ht === '周二' || ht === '二') dn = 2
				else if (ht.indexOf('星期三') > -1 || ht === '周三' || ht === '三') dn = 3
				else if (ht.indexOf('星期四') > -1 || ht === '周四' || ht === '四') dn = 4
				else if (ht.indexOf('星期五') > -1 || ht === '周五' || ht === '五') dn = 5
				else if (ht.indexOf('星期六') > -1 || ht === '周六' || ht === '六') dn = 6
				else if (ht.indexOf('星期日') > -1 || ht.indexOf('星期天') > -1 || ht === '周日' || ht === '日' || ht === '天') dn = 7

				if (dn > 0) colDayMap[colIdx] = dn
				L('  h[' + colIdx + ']="' + ht + '" day=' + dn)
				colIdx += hColspan
			}
			totalCols = colIdx
			L('dayMap=' + JSON.stringify(colDayMap) + ' totalCols=' + totalCols)
			break
		}
	}

	// ========== 3. ★★★ 构建 rowspan 跟踪器 ★★★ ==========
	// 这个数组记录每一列还剩多少行被上面的 rowspan 占据
	var rowspanRemain = []
	for (var rc = 0; rc < totalCols; rc++) rowspanRemain.push(0)

	// ========== 4. 逐行解析 ==========
	for (var ri = 0; ri < trs.length; ri++) {
		if (ri === headerRowIndex) continue

		var tr = trs[ri]
		var cells = tr.match(/<(td|th)[\s\S]*?>[\s\S]*?<\/\1>/gi) || []
		if (cells.length < 1) continue

		// ★★★ 核心：用 rowspan 跟踪器计算每个单元格的真实列位置 ★★★
		var cellPositions = [] // [{cellIndex, actualCol, colspan, rowspan}]
		var colPointer = 0
		var cellPointer = 0

		while (colPointer < totalCols && cellPointer < cells.length) {
			// 如果当前列被之前行的 rowspan 占据，跳过
			if (rowspanRemain[colPointer] > 0) {
				rowspanRemain[colPointer]--
				colPointer++
				continue
			}

			// 当前单元格放在 colPointer 位置
			var cellHtml = cells[cellPointer]
			var cspM = cellHtml.match(/colspan=["']?(\d+)["']?/i)
			var rspM = cellHtml.match(/rowspan=["']?(\d+)["']?/i)
			var colspan = cspM ? Number(cspM[1]) : 1
			var rowspan = rspM ? Number(rspM[1]) : 1

			cellPositions.push({
				cellIndex: cellPointer,
				actualCol: colPointer,
				colspan: colspan,
				rowspan: rowspan
			})

			// 记录 rowspan（占据后续行）
			for (var cs = 0; cs < colspan; cs++) {
				if (colPointer + cs < totalCols && rowspan > 1) {
					rowspanRemain[colPointer + cs] = rowspan - 1
				}
			}

			colPointer += colspan
			cellPointer++
		}

		// 处理剩余被 rowspan 占据的列
		while (colPointer < totalCols) {
			if (rowspanRemain[colPointer] > 0) rowspanRemain[colPointer]--
			colPointer++
		}

		// ★ 提取节次：找到"节次"列的内容
		var rowSection = 0
		for (var pi = 0; pi < cellPositions.length; pi++) {
			var pos = cellPositions[pi]
			// 节次通常在前3列
			if (pos.actualCol > 2) break
			var cellText = cells[pos.cellIndex].replace(/<[^>]+>/g, '').trim()
			var secMatch = cellText.match(/(\d+)/)
			if (secMatch) {
				var secNum = Number(secMatch[1])
				if (secNum >= 1 && secNum <= 20) {
					rowSection = secNum
					break
				}
			}
		}

		L('行' + ri + ' 格=' + cells.length + ' 节次=' + rowSection + ' 位置=' + cellPositions.map(function(p) { return p.actualCol }).join(','))

		// ★ 遍历每个单元格，用精确的列位置查找 day
		for (var pi2 = 0; pi2 < cellPositions.length; pi2++) {
			var pos2 = cellPositions[pi2]
			var day = colDayMap[pos2.actualCol]
			if (!day) continue

			var cellHtml2 = cells[pos2.cellIndex]
			var rowspan2 = pos2.rowspan

			// ========== 提取课程块 ==========
			var blocks = cellHtml2.match(/<div[^>]*class=["'][^"']*timetable_con[^"']*["'][^>]*>[\s\S]*?<\/div>/gi)
				|| cellHtml2.match(/<div[^>]*timetable_con[^>]*>[\s\S]*?<\/div>/gi)
				|| cellHtml2.match(/<div[^>]*class=["'][^"']*kbcontent[^"']*["'][^>]*>[\s\S]*?<\/div>/gi)
				|| []

			if (blocks.length > 0) {
				for (var bi = 0; bi < blocks.length; bi++) {
					var c = parseOneBlock(blocks[bi], day, rowSection, rowspan2)
					if (c) {
						courses.push(c)
						L('  +' + c.name + ' d=' + c.day + ' s=' + c.startSection + '-' + c.endSection)
					}
				}
				continue
			}

			// td 的 title
			var tdTitle = cellHtml2.match(/title="([\s\S]*?)"/i) || cellHtml2.match(/title='([\s\S]*?)'/i)
			if (tdTitle && tdTitle[1].length > 10) {
				var c2 = parseTitleToCourse(tdTitle[1], day, rowSection, rowspan2)
				if (c2) { courses.push(c2); continue }
			}

			// 纯文本兜底
			var lines = stripTags(cellHtml2).split('\n').map(function(x) { return x.trim() }).filter(function(x) { return x.length >= 2 && !/^[-_=]+$/.test(x) })
			if (lines.length >= 2) {
				var c3 = parseLinesBlock(lines, day, rowSection, rowspan2)
				if (c3) courses.push(c3)
			}
		}
	}

	L('解析结果=' + courses.length)

	// ========== 5. 全局 title 扫描兜底 ==========
	if (courses.length === 0) {
		var gtr = /title="([\s\S]*?)"/gi
		var gm
		while ((gm = gtr.exec(html)) !== null) {
			if (gm[1].length < 20) continue
			if (gm[1].indexOf('课程') > -1 || gm[1].indexOf('教师') > -1 || gm[1].indexOf('老师') > -1) {
				var gc = parseTitleToCourse(gm[1], 0, 1, 2)
				if (gc) courses.push(gc)
			}
		}
		L('全局title结果=' + courses.length)
	}

	// ========== 6. 去重 + 验证 ==========
	var unique = []
	var ks = new Set()
	for (var ui = 0; ui < courses.length; ui++) {
		var uc = courses[ui]
		var ws = Array.isArray(uc.weeks) ? uc.weeks.join(',') : ''
		var k = uc.name + '|' + uc.day + '|' + uc.startSection + '|' + uc.endSection + '|' + uc.room + '|' + ws
		if (!ks.has(k)) { ks.add(k); unique.push(uc) }
	}

	var valid = unique.filter(function(c) {
		return c && c.name && Number.isFinite(c.day) && c.day >= 1 && c.day <= 7 && Number.isFinite(c.startSection) && c.startSection >= 1 && Array.isArray(c.weeks) && c.weeks.length > 0
	})

	L('去重=' + unique.length + ' 有效=' + valid.length)

	if (valid.length === 0) throw new Error('未检测到有效课表数据')
	return valid

	// ==================== 内部函数 ====================

	function stripTags(s) {
		return String(s || '')
			.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
			.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1')
			.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/div>/gi, '\n')
			.replace(/<\/p>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/gi, ' ')
			.replace(/&amp;/gi, '&')
			.replace(/&lt;/gi, '<')
			.replace(/&gt;/gi, '>')
			.replace(/&quot;/gi, '"')
			.replace(/&#39;/gi, "'")
			.replace(/&#13;/g, '\n')
			.replace(/&#10;/g, '\n')
	}

	function decodeTitle(s) {
		return String(s || '')
			.replace(/&#13;/g, '\n').replace(/&#10;/g, '\n')
			.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
			.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
			.replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
			.replace(/\\n/g, '\n')
	}

	function classifyLine(line) {
		var t = line.trim()
		if (!t) return 'empty'
		if (/^[-—_=]{2,}$/.test(t)) return 'sep'
		if (/\d+.*周/.test(t)) return 'weeks'
		if (/第?\s*0?\d+\s*[-~]\s*0?\d+\s*节/.test(t) || /第?\s*0?\d+\s*节/.test(t)) return 'section'
		if (/[楼室区栋]/.test(t) || /校区/.test(t) || /^[A-Za-z][-]?\d{2,5}$/.test(t) || /^\d{1,2}-\d{3,4}$/.test(t)) return 'room'
		if (/^[\u4e00-\u9fa5]{2,5}$/.test(t.replace(/[,，、\s]/g, ''))) return 'teacher'
		return 'name'
	}

	function parseTitleToCourse(titleRaw, fallbackDay, fallbackSec, fallbackRowspan) {
		var t = decodeTitle(titleRaw)
		var name = '', teacher = '', room = ''
		var day = fallbackDay || 0
		var startSec = 0, endSec = 0, weeks = []

		var m = t.match(/(?:课程名称|课程名|课程)[：:]\s*([^\n\r]+)/)
		if (m) name = m[1].trim()
		m = t.match(/(?:上课教师|教师|老师|任课教师|授课教师|主讲教师|主讲)[：:]\s*([^\n\r]+)/)
		if (m) teacher = m[1].trim()
		m = t.match(/(?:上课地点|地点|教室|上课教室|上课地址)[：:]\s*([^\n\r]+)/)
		if (m) room = m[1].trim()
		m = t.match(/星期([一二三四五六日天])/)
		if (m) { var dm = {一:1,二:2,三:3,四:4,五:5,六:6,日:7,天:7}; day = dm[m[1]] || day }

		// ★ 节次提取：支持多种格式
		m = t.match(/第?\s*0?(\d+)\s*[-~]\s*0?(\d+)\s*节/)
		if (m) { startSec = Number(m[1]); endSec = Number(m[2]) }
		if (!startSec) {
			m = t.match(/第?\s*0?(\d+)\s*节/)
			if (m) { startSec = Number(m[1]); endSec = Number(m[1]) }
		}

		m = t.match(/(\d+(?:\s*[-,，]\s*\d+)*\s*周(?:\s*\((?:单|双)\))?)/)
		if (m) weeks = parseWeekText(m[1])

		// 逐行扫描兜底
		if (!name) {
			var lines = t.split('\n').map(function(x) { return x.trim() }).filter(Boolean)
			for (var i = 0; i < lines.length; i++) {
				var tp = classifyLine(lines[i])
				if (!name && tp === 'name') name = lines[i].replace(/[★☆●◆▲△▼▽■□◇]/g, '').trim()
				else if (!teacher && tp === 'teacher') teacher = lines[i]
				else if (!room && tp === 'room') room = lines[i]
				else if (tp === 'weeks' && !weeks.length) weeks = parseWeekText(lines[i])
				else if (tp === 'section' && !endSec) {
					var sm = lines[i].match(/0?(\d+)\s*[-~]\s*0?(\d+)/)
					if (sm) { startSec = Number(sm[1]); endSec = Number(sm[2]) }
				}
			}
		}

		// ★ 兜底：只有当 title 中没有节次信息时才用 fallback
		if (!weeks.length) weeks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
		if (!startSec) startSec = fallbackSec || 1
		if (!endSec) endSec = fallbackRowspan > 1 ? startSec + fallbackRowspan - 1 : startSec + 1
		if (!name || !day || day < 1 || day > 7) return null

		return newCourse({ name: name, teacher: teacher, room: room, day: day, startSection: startSec, endSection: endSec, weeks: weeks, source: 'zhengfang' })
	}

	function parseOneBlock(blockHtml, day, rowSec, rowspan) {
		// 1. title 优先
		var titleM = blockHtml.match(/title="([\s\S]*?)"/i) || blockHtml.match(/title='([\s\S]*?)'/i)
		if (titleM && titleM[1].length > 10) {
			var fromTitle = parseTitleToCourse(titleM[1], day, rowSec, rowspan)
			if (fromTitle) return fromTitle
		}

		// 2. a 标签 / 蓝字课程名
		var name = ''
		var m = blockHtml.match(/<a[^>]*>([^<]{2,})<\/a>/i)
		if (m) name = m[1].replace(/[★☆●◆▲△▼▽■□◇]/g, '').trim()
		if (!name) {
			m = blockHtml.match(/<font[^>]*color=["']?blue["']?[^>]*>([^<]+)<\/font>/i)
			if (m) name = m[1].replace(/[★☆●◆▲△▼▽■□◇]/g, '').trim()
		}

		// 3. 文本分类
		var teacher = '', room = '', weeks = [], startSec = 0, endSec = 0
		var lines = stripTags(blockHtml).split('\n').map(function(x) { return x.trim() }).filter(function(x) { return x.length >= 1 && !/^[-—_=]{2,}$/.test(x) })

		var unclass = []
		for (var i = 0; i < lines.length; i++) {
			var tp = classifyLine(lines[i])
			if (tp === 'weeks') {
				if (!weeks.length) weeks = parseWeekText(lines[i])
				var sm = lines[i].match(/0?(\d+)\s*[-~]\s*0?(\d+)\s*节/)
				if (sm) { startSec = Number(sm[1]); endSec = Number(sm[2]) }
			} else if (tp === 'section') {
				var sm2 = lines[i].match(/0?(\d+)\s*[-~]\s*0?(\d+)/)
				if (sm2) { startSec = Number(sm2[1]); endSec = Number(sm2[2]) }
			} else if (tp === 'room') {
				if (!room) room = lines[i]
			} else if (tp === 'teacher') {
				if (!teacher) teacher = lines[i]
			} else if (tp === 'name') {
				unclass.push(lines[i])
			}
		}

		if (!name && unclass.length > 0) name = unclass[0].replace(/[★☆●◆▲△▼▽■□◇]/g, '').trim()
		if (!teacher && unclass.length > 1 && /^[\u4e00-\u9fa5]{2,5}$/.test(unclass[1].replace(/[,，]/g, ''))) teacher = unclass[1]

		// ★ 只在内容中没有节次信息时才用 rowSec
		if (!weeks.length) weeks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
		if (!startSec) startSec = rowSec || 1
		if (!endSec) endSec = rowspan > 1 ? startSec + rowspan - 1 : startSec + 1
		if (!name || name.length < 2 || !day || day < 1 || day > 7) return null

		return newCourse({ name: name, teacher: teacher, room: room, day: day, startSection: startSec, endSection: endSec, weeks: weeks, source: 'zhengfang' })
	}

	function parseLinesBlock(lines, day, rowSec, rowspan) {
		var name = '', teacher = '', room = '', weeks = [], startSec = 0, endSec = 0
		for (var i = 0; i < lines.length; i++) {
			var tp = classifyLine(lines[i])
			if (tp === 'weeks' && !weeks.length) { weeks = parseWeekText(lines[i]); continue }
			if (tp === 'section' && !endSec) {
				var sm = lines[i].match(/0?(\d+)\s*[-~]\s*0?(\d+)/)
				if (sm) { startSec = Number(sm[1]); endSec = Number(sm[2]) }
				continue
			}
			if (tp === 'room' && !room) { room = lines[i]; continue }
			if (tp === 'teacher' && !teacher) { teacher = lines[i]; continue }
			if (!name) name = lines[i]
		}
		if (!weeks.length) weeks = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
		if (!startSec) startSec = rowSec || 1
		if (!endSec) endSec = startSec + 1
		if (!name || name.length < 2 || !day || day < 1 || day > 7) return null
		return newCourse({ name: name, teacher: teacher, room: room, day: day, startSection: startSec, endSection: endSec, weeks: weeks, source: 'zhengfang' })
	}
}

export function parseQiangzhiHTML(html) {
	if (!html) throw new Error('解析内容为空')

	var courses = []

	function decodeText(s) {
		return String(s || '')
			.replace(/&#13;/g, '\n')
			.replace(/&#10;/g, '\n')
			.replace(/&nbsp;/gi, ' ')
			.replace(/&amp;/gi, '&')
			.replace(/&lt;/gi, '<')
			.replace(/&gt;/gi, '>')
			.replace(/&quot;/gi, '"')
			.replace(/&#39;/gi, "'")
	}

	function stripTags(s) {
		return decodeText(s)
			.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
			.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1')
			.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/div>/gi, '\n')
			.replace(/<\/p>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/\s+\n/g, '\n')
			.replace(/\n\s+/g, '\n')
			.replace(/[ \t]{2,}/g, ' ')
			.trim()
	}

	function classifyLine(line) {
		var t = cleanText(line)
		if (!t) return 'empty'
		if (/^[-—_=]{2,}$/.test(t)) return 'sep'
		if (/\d+.*周/.test(t)) return 'weeks'
		if (/第?\s*0?\d+\s*[-~]\s*0?\d+\s*节/.test(t) || /第?\s*0?\d+\s*节/.test(t)) return 'section'
		if (/[楼室区栋]/.test(t) || /校区/.test(t) || /^[A-Za-z][-]?\d{2,5}$/.test(t) || /^\d{1,2}-\d{3,4}$/.test(t)) return 'room'
		if (/^[\u4e00-\u9fa5]{2,5}$/.test(t.replace(/[,，、\s]/g, ''))) return 'teacher'
		return 'name'
	}

	function parseDayText(ht) {
		var t = cleanText(ht).replace(/\s+/g, '')
		if (t.indexOf('星期一') > -1 || t === '周一' || t === '一') return 1
		if (t.indexOf('星期二') > -1 || t === '周二' || t === '二') return 2
		if (t.indexOf('星期三') > -1 || t === '周三' || t === '三') return 3
		if (t.indexOf('星期四') > -1 || t === '周四' || t === '四') return 4
		if (t.indexOf('星期五') > -1 || t === '周五' || t === '五') return 5
		if (t.indexOf('星期六') > -1 || t === '周六' || t === '六') return 6
		if (t.indexOf('星期日') > -1 || t.indexOf('星期天') > -1 || t === '周日' || t === '日' || t === '天') return 7
		return 0
	}

	function parseOneGroup(lines, day, rowSection, rowspan) {
		var name = ''
		var teacher = ''
		var room = ''
		var weeks = []
		var startSec = 0
		var endSec = 0

		for (var i = 0; i < lines.length; i++) {
			var line = lines[i]
			var tp = classifyLine(line)

			if (tp === 'weeks') {
				if (!weeks.length) weeks = parseWeekText(line)
				var sm = line.match(/0?(\d+)\s*[-~]\s*0?(\d+)\s*节/)
				if (sm) {
					startSec = Number(sm[1])
					endSec = Number(sm[2])
				}
				continue
			}

			if (tp === 'section') {
				var secM = line.match(/0?(\d+)\s*[-~]\s*0?(\d+)/)
				if (secM) {
					startSec = Number(secM[1])
					endSec = Number(secM[2])
				} else {
					var sec1 = line.match(/0?(\d+)\s*节/)
					if (sec1) {
						startSec = Number(sec1[1])
						endSec = Number(sec1[1])
					}
				}
				continue
			}

			if (tp === 'room' && !room) {
				room = line
				continue
			}

			if (tp === 'teacher' && !teacher) {
				teacher = line
				continue
			}

			if (!name && line.length >= 2) {
				name = line.replace(/[★☆●◆▲△▼▽■□◇]/g, '').trim()
			}
		}

		if (!weeks.length) weeks = Array.from({ length: 16 }, function(_, i) { return i + 1 })
		if (!startSec) startSec = rowSection || 1
		if (!endSec) endSec = rowspan > 1 ? startSec + rowspan - 1 : startSec + 1

		// 合法性过滤
		if (!name || name.length < 2) return null
		if (!day || day < 1 || day > 7) return null

		// 排除明显不是课程的内容
		if (/^(学年|学期|学院|专业|班级|查询|打印|返回|提交)/.test(name)) return null

		return newCourse({
			name: name,
			teacher: teacher,
			room: room,
			day: day,
			startSection: startSec,
			endSection: endSec,
			weeks: weeks,
			source: 'qiangzhi'
		})
	}

	// ========== 1. 精确寻找课表 table ==========
	var tables = html.match(/<table[\s\S]*?>[\s\S]*?<\/table>/gi) || []
	var tableHtml = ''

	// 优先找真正像课表的表格：同时含周一~周日且行数较多
	for (var i = 0; i < tables.length; i++) {
		var t = tables[i]
		var hitDays = 0
		if (t.indexOf('星期一') > -1 || t.indexOf('周一') > -1) hitDays++
		if (t.indexOf('星期二') > -1 || t.indexOf('周二') > -1) hitDays++
		if (t.indexOf('星期三') > -1 || t.indexOf('周三') > -1) hitDays++
		if (t.indexOf('星期四') > -1 || t.indexOf('周四') > -1) hitDays++
		if (t.indexOf('星期五') > -1 || t.indexOf('周五') > -1) hitDays++

		var trCount = (t.match(/<tr[\s\S]*?>[\s\S]*?<\/tr>/gi) || []).length
		if (hitDays >= 5 && trCount >= 6) {
			tableHtml = t
			break
		}
	}

	if (!tableHtml) {
		var tm = html.match(/<table[^>]*id=["']?kbtable["']?[^>]*>[\s\S]*?<\/table>/i)
		if (tm) tableHtml = tm[0]
	}

	if (!tableHtml) throw new Error('未找到强智课表表格')

	var trs = tableHtml.match(/<tr[\s\S]*?>[\s\S]*?<\/tr>/gi) || []
	if (trs.length < 2) throw new Error('强智课表结构异常')

	// ========== 2. 表头映射 ==========
	var colDayMap = {}
	var headerRowIndex = -1
	var totalCols = 0

	for (var r = 0; r < trs.length; r++) {
		if (trs[r].indexOf('星期') > -1 || trs[r].indexOf('周一') > -1) {
			headerRowIndex = r
			var hCells = trs[r].match(/<(td|th)[\s\S]*?>[\s\S]*?<\/\1>/gi) || []
			var colIdx = 0
			for (var hc = 0; hc < hCells.length; hc++) {
				var hCsp = hCells[hc].match(/colspan=["']?(\d+)["']?/i)
				var hColspan = hCsp ? Number(hCsp[1]) : 1
				var dn = parseDayText(hCells[hc])
				if (dn > 0) colDayMap[colIdx] = dn
				colIdx += hColspan
			}
			totalCols = colIdx
			break
		}
	}

	if (!totalCols) throw new Error('未识别到强智课表表头')

	// ========== 3. rowspan 跟踪 ==========
	var rowspanRemain = []
	for (var rc = 0; rc < totalCols; rc++) rowspanRemain.push(0)

	// ========== 4. 逐行解析 ==========
	for (var ri = 0; ri < trs.length; ri++) {
		if (ri === headerRowIndex) continue

		var tr = trs[ri]
		var cells = tr.match(/<(td|th)[\s\S]*?>[\s\S]*?<\/\1>/gi) || []
		if (cells.length < 1) continue

		var rowSection = 0
		for (var sci = 0; sci < Math.min(cells.length, 3); sci++) {
			var st = cells[sci].replace(/<[^>]+>/g, '').trim()
			var sm = st.match(/(\d+)/)
			if (sm) {
				var secNum = Number(sm[1])
				if (secNum >= 1 && secNum <= 20) {
					rowSection = secNum
					break
				}
			}
		}

		var cellPositions = []
		var colPointer = 0
		var cellPointer = 0

		while (colPointer < totalCols && cellPointer < cells.length) {
			if (rowspanRemain[colPointer] > 0) {
				rowspanRemain[colPointer]--
				colPointer++
				continue
			}

			var cellHtml = cells[cellPointer]
			var cspM = cellHtml.match(/colspan=["']?(\d+)["']?/i)
			var rspM = cellHtml.match(/rowspan=["']?(\d+)["']?/i)
			var colspan = cspM ? Number(cspM[1]) : 1
			var rowspan = rspM ? Number(rspM[1]) : 1

			cellPositions.push({
				cellIndex: cellPointer,
				actualCol: colPointer,
				colspan: colspan,
				rowspan: rowspan
			})

			for (var cs = 0; cs < colspan; cs++) {
				if (colPointer + cs < totalCols && rowspan > 1) {
					rowspanRemain[colPointer + cs] = rowspan - 1
				}
			}

			colPointer += colspan
			cellPointer++
		}

		while (colPointer < totalCols) {
			if (rowspanRemain[colPointer] > 0) rowspanRemain[colPointer]--
			colPointer++
		}

		// ========== 5. 解析课程格 ==========
		for (var pi = 0; pi < cellPositions.length; pi++) {
			var pos = cellPositions[pi]
			var day = colDayMap[pos.actualCol]
			if (!day) continue

			var cellHtml2 = cells[pos.cellIndex]
			var rowspan2 = pos.rowspan

			var text = stripTags(cellHtml2)
			var lines = text.split('\n').map(function(x) { return x.trim() }).filter(function(x) {
				return x.length > 0 && !/^[-—_=]{2,}$/.test(x)
			})

			if (lines.length < 2) continue

			// 先尝试 title 属性
			var titleM = cellHtml2.match(/title="([\s\S]*?)"/i) || cellHtml2.match(/title='([\s\S]*?)'/i)
			if (titleM && titleM[1].length > 10) {
				var titleLines = decodeText(titleM[1]).split('\n').map(function(x) { return cleanText(x) }).filter(Boolean)
				var tc = parseOneGroup(titleLines, day, rowSection, rowspan2)
				if (tc) {
					courses.push(tc)
					continue
				}
			}

			// 一个格子中多门课：按分隔线拆
			var groups = []
			var current = []
			for (var li = 0; li < lines.length; li++) {
				if (/^[-—_=]{3,}$/.test(lines[li])) {
					if (current.length >= 2) groups.push(current)
					current = []
				} else {
					current.push(lines[li])
				}
			}
			if (current.length >= 2) groups.push(current)
			if (groups.length === 0) groups = [lines]

			for (var gi = 0; gi < groups.length; gi++) {
				var c = parseOneGroup(groups[gi], day, rowSection, rowspan2)
				if (c) courses.push(c)
			}
		}
	}

	// ========== 6. 去重 ==========
	var unique = []
	var ks = new Set()
	for (var ui = 0; ui < courses.length; ui++) {
		var c = courses[ui]
		var ws = Array.isArray(c.weeks) ? c.weeks.join(',') : ''
		var k = c.name + '|' + c.day + '|' + c.startSection + '|' + c.endSection + '|' + c.room + '|' + ws
		if (!ks.has(k)) {
			ks.add(k)
			unique.push(c)
		}
	}

	if (unique.length === 0) {
		return parseZhengfangHTML(html)
	}

	return unique
}