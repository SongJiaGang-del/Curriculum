<template>
	<view class="page"></view>
</template>

<script>
import { parseZhengfangHTML, parseQiangzhiHTML } from '@/utils/parse'

export default {
	data() {
		return {
			url: '',
			clearCache: false,
			wv: null,
			parsing: false,
			chunks: [],
			expectedLen: 0,
			timer: null,
			reading: false
		}
	},

	onLoad(options) {
		this.url = options.url ? decodeURIComponent(options.url) : ''
		this.clearCache = options.clearCache === '1'
	},

	onReady() {
		// #ifdef APP-PLUS
		this.createNativeWebview()
		// #endif
	},

	onUnload() {
		this.cleanup()
	},

	methods: {
		cleanup() {
			if (this.timer) {
				clearInterval(this.timer)
				this.timer = null
			}
			if (this.wv) {
				try { this.wv.removeEventListener('loaded') } catch (e) {}
				try { this.wv.removeEventListener('titleUpdate') } catch (e) {}
				try { this.wv.close('none') } catch (e) {}
				this.wv = null
			}
		},

		createNativeWebview() {
			var self = this

			if (typeof plus === 'undefined') {
				uni.showModal({
					title: '不支持',
					content: '当前环境不支持，请使用 Excel/HTML 导入',
					showCancel: false,
					success: function () { uni.navigateBack() }
				})
				return
			}

			if (self.clearCache) {
				try {
					plus.navigator.removeAllCookie()
					plus.cache.clear()
				} catch (e) {}
				uni.showToast({ title: '已切换学校，请重新登录', icon: 'none', duration: 2000 })
			}

			var currentWebview = null
			try {
				var pages = getCurrentPages()
				var page = pages[pages.length - 1]
				currentWebview = page.$getAppWebview()
			} catch (e) {}

			if (!currentWebview) {
				try { currentWebview = plus.webview.currentWebview() } catch (e) {}
			}

			if (!currentWebview) {
				uni.showModal({
					title: '初始化失败',
					content: '无法获取页面实例',
					showCancel: false,
					success: function () { uni.navigateBack() }
				})
				return
			}

			var sysInfo = uni.getSystemInfoSync()
			var top = (sysInfo.statusBarHeight || 25) + 44

			var wvId = 'jw_' + Date.now()
			self.wv = plus.webview.create(self.url, wvId, {
				top: top + 'px',
				bottom: '0px',
				left: '0px',
				right: '0px'
			})

			currentWebview.append(self.wv)

			self.wv.addEventListener('loaded', function () {
				setTimeout(function () {
					self.injectScript()
				}, 1000)
			})

			self.wv.addEventListener('titleUpdate', function (e) {
				self.onTitleUpdate(e.title)
			})

			self.timer = setInterval(function () {
				if (self.wv && !self.reading) {
					self.injectScript()
				}
			}, 4000)
		},

		injectScript() {
			if (!this.wv) return

			var LG = 'console' + '.log'
			var ER = 'console' + '.error'

			var s = ';(function(){'
				+ 'var L=' + LG + '.bind(console);'
				+ 'var E=' + ER + '.bind(console);'
				+ 'if(window.__jw&&document.getElementById("__jb"))return;'
				+ 'window.__jw=1;'
				+ 'L("[JW] injected "+location.href);'
				+ 'function mk(){'
				+ 'if(document.getElementById("__jb"))return;'
				+ 'if(!document.body){setTimeout(mk,800);return;}'
				+ 'var b=document.createElement("div");'
				+ 'b.id="__jb";'
				+ 'b.innerText="\\u63d0\\u53d6\\u8bfe\\u8868";'
				+ 'var t=b.style;'
				+ 't.position="fixed";'
				+ 't.bottom="110px";'
				+ 't.right="20px";'
				+ 't.zIndex="2147483647";'
				+ 't.background="#2563eb";'
				+ 't.color="#fff";'
				+ 't.padding="14px 22px";'
				+ 't.borderRadius="28px";'
				+ 't.fontSize="16px";'
				+ 't.fontWeight="bold";'
				+ 't.boxShadow="0 6px 16px rgba(37,99,235,0.6)";'
				+ 't.cursor="pointer";'
				+ 't.textAlign="center";'
				+ 't.lineHeight="1.2";'
				+ 't.letterSpacing="1px";'
				+ 'b.onclick=function(e){e.preventDefault();e.stopPropagation();window.__ext();};'
				+ 'document.body.appendChild(b);'
				+ 'L("[JW] btn created");'
				+ '}'
				+ 'window.__ext=function(){'
				+ 'try{'
				+ 'L("[JW] extracting...");'
				+ 'var b=document.getElementById("__jb");'
				+ 'if(b){b.innerText="\\u63d0\\u53d6\\u4e2d...";b.style.background="#6b7280";}'
				+ 'var h="";'
				+ 'var fs=document.querySelectorAll("iframe");'
				+ 'L("[JW] iframes:"+fs.length);'
				+ 'for(var i=0;i<fs.length;i++){'
				+ 'try{'
				+ 'var d=null;'
				+ 'try{d=fs[i].contentDocument;}catch(e){}'
				+ 'if(!d){try{d=fs[i].contentWindow.document;}catch(e){}}'
				+ 'if(d&&d.querySelectorAll("table").length>0){'
				+ 'h=d.documentElement.outerHTML;'
				+ 'L("[JW] from iframe["+i+"] len:"+h.length);'
				+ 'break;}'
				+ '}catch(e){L("[JW] iframe err:"+e.message);}}'
				+ 'if(!h){h=document.documentElement.outerHTML;L("[JW] from main len:"+h.length);}'
				+ 'if(h.length>500000){'
				+ 'try{'
				+ 'var p=new DOMParser();'
				+ 'var dc=p.parseFromString(h,"text/html");'
				+ 'var ts=dc.querySelectorAll("table");'
				+ 'var r="<html><body>";'
				+ 'for(var j=0;j<ts.length;j++)r+=ts[j].outerHTML;'
				+ 'r+="</body></html>";'
				+ 'h=r;'
				+ '}catch(e){}}'
				+ 'window.__html=h;'
				+ 'L("[JW] ready len:"+h.length);'
				+ 'document.title="__JW_READY__:"+h.length;'
				+ 'if(b){b.innerText="\\u5904\\u7406\\u4e2d...";b.style.background="#f59e0b";}'
				+ '}catch(e){'
				+ 'E("[JW] err:"+e.message);'
				+ 'var b2=document.getElementById("__jb");'
				+ 'if(b2){'
				+ 'b2.innerText="\\u51fa\\u9519";'
				+ 'b2.style.background="#ef4444";'
				+ 'setTimeout(function(){b2.innerText="\\u63d0\\u53d6\\u8bfe\\u8868";b2.style.background="#2563eb";},2000);'
				+ '}'
				+ '}'
				+ '};'
				+ 'window.__ch=function(o,s){'
				+ 'document.title="__JW_C__"+(window.__html||"").substring(o,o+s);'
				+ '};'
				+ 'mk();'
				+ 'setTimeout(mk,500);'
				+ 'setTimeout(mk,1500);'
				+ 'setTimeout(mk,3000);'
				+ '})();'

			try {
				this.wv.evalJS(s)
			} catch (e) {}
		},

		onTitleUpdate(title) {
			if (!title) return

			if (title.indexOf('__JW_READY__:') === 0) {
				var len = parseInt(title.split(':')[1]) || 0
				if (len <= 0) return
				this.expectedLen = len
				this.chunks = []
				this.reading = true
				uni.showLoading({ title: '正在读取页面...', mask: true })
				var self = this
				setTimeout(function () { self.requestChunk(0) }, 200)
				return
			}

			if (title.indexOf('__JW_C__') === 0) {
				var chunk = title.substring(8)
				this.chunks.push(chunk)
				var received = 0
				for (var i = 0; i < this.chunks.length; i++) {
					received += this.chunks[i].length
				}
				if (chunk.length > 0 && received < this.expectedLen) {
					var self = this
					setTimeout(function () { self.requestChunk(received) }, 30)
				} else {
					var html = this.chunks.join('')
					this.chunks = []
					this.reading = false
					uni.hideLoading()
					try {
						this.wv.evalJS(
							'var b=document.getElementById("__jb");'
							+ 'if(b){b.innerText="\\u63d0\\u53d6\\u8bfe\\u8868";b.style.background="#2563eb";}'
						)
					} catch (e) {}
					this.startParse(html)
				}
				return
			}
		},

		requestChunk(offset) {
			if (!this.wv) return
			this.wv.evalJS('window.__ch(' + offset + ',5000);')
		},

		startParse(html) {
			if (this.parsing) return
			this.parsing = true

			uni.showLoading({ title: '正在解析课表...', mask: true })

			var self = this
			setTimeout(function () {
				try {
					var schoolId = ''
					try { schoolId = uni.getStorageSync('__last_jw_school') || '' } catch (e) {}

					var courses
					if (schoolId.indexOf('qiangzhi') === 0) {
						courses = parseQiangzhiHTML(html)
					} else {
						courses = parseZhengfangHTML(html)
					}

					var debugLog = ''
					try { debugLog = uni.getStorageSync('__parse_log') || '' } catch (e) {}

					self.parsing = false
					uni.hideLoading()

					if (!courses || courses.length === 0) {
						uni.showModal({
							title: '未找到课表',
							content: ('未检测到课表数据\n\n调试:\n' + debugLog).substring(0, 1400),
							showCancel: false
						})
						return
					}

					var valid = courses.filter(function (c) {
						return c && c.name && c.day >= 1 && c.day <= 7 && c.startSection >= 1
					})

					if (valid.length === 0) {
						uni.showModal({
							title: '解析异常',
							content: ('格式异常\n\n调试:\n' + debugLog).substring(0, 1400),
							showCancel: false
						})
						return
					}

					var summary = valid.slice(0, 5).map(function (c) {
						var dn = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][c.day] || '?'
						return c.name + ' ' + dn + ' ' + c.startSection + '-' + c.endSection + '节'
					}).join('\n')

					uni.showModal({
						title: '解析到 ' + valid.length + ' 门课',
						content: '前5门预览:\n' + summary,
						showCancel: true,
						cancelText: '取消',
						confirmText: '保存',
						success: function (res) {
							if (res.confirm) {
								uni.setStorageSync('temp_import_courses', valid)
								uni.showToast({
									title: '成功导入 ' + valid.length + ' 门课',
									icon: 'success',
									duration: 2000
								})
								setTimeout(function () {
									uni.navigateBack()
								}, 2000)
							}
						}
					})

				} catch (err) {
					self.parsing = false
					uni.hideLoading()

					var debugLog2 = ''
					try { debugLog2 = uni.getStorageSync('__parse_log') || '' } catch (e) {}

					uni.showModal({
						title: '解析失败',
						content: (((err && err.message) || '未知错误') + '\n\n调试:\n' + debugLog2).substring(0, 1400),
						showCancel: false
					})
				}
			}, 200)
		}
	}
}
</script>

<style scoped>
.page {
	width: 100vw;
	height: 100vh;
	background: #f5f5f5;
}
</style>