# nutpi-utils

一个专为 HarmonyOS 应用开发的 UTS 工具库，提供电话、短信、系统信息、电池状态等原生功能的便捷调用。

## 特性

- 🔥 专为 HarmonyOS 平台设计
- 📱 支持拨打电话功能
- 💬 支持发送短信功能
- 🔋 获取设备电池信息
- 📊 获取系统设备信息
- 🚪 应用退出功能
- 🌐 网络状态监听

## 安装

### 通过 uni_modules 安装

1. 将 `nutpi-utils` 文件夹复制到项目的 `uni_modules` 目录下
2. 在需要使用的页面中导入相应的功能模块

```javascript
// 导入所需功能
import { makeCall, sendSms, getBatteryInfo, getSystemInfo, exitAPP } from '@/uni_modules/nutpi-utils';
```

## API 文档

### makeCall(phoneNumber)

拨打电话功能

**参数：**
- `phoneNumber` (string): 要拨打的电话号码

**示例：**
```javascript
makePhoneCall() {
    // #ifdef APP-HARMONY
    makeCall('17752170152');
    // #endif

    // #ifndef APP-HARMONY
    uni.showToast({
        title: '当前平台不支持拨打电话功能',
        icon: 'none'
    });
    // #endif
}
```

### sendSms(phoneNumber, message)

发送短信功能

**参数：**
- `phoneNumber` (string): 接收短信的手机号码
- `message` (string): 短信内容

**示例：**
```javascript
sendMessage() {
    // 验证手机号码格式
    if (!this.phoneNumber || !/^1[3-9]\d{9}$/.test(this.phoneNumber)) {
        uni.showToast({
            title: '请输入正确的手机号码',
            icon: 'none'
        });
        return;
    }

    // #ifdef APP-HARMONY
    let messageContent = '系统工具应用';
    // 发送短信
    sendSms(this.phoneNumber, messageContent);
    // #endif

    // #ifndef APP-HARMONY
    uni.showToast({
        title: '当前平台不支持发送短信功能',
        icon: 'none'
    });
    // #endif
}
```

### getSystemInfo()

获取系统设备信息

**返回值：**
- `Object`: 包含设备信息的对象
  - `brand`: 设备品牌
  - `deviceModel`: 设备型号
  - `platform`: 系统类型
  - `system`: 系统版本

**示例：**
```javascript
async initSystemInfo() {
    this.systemInfo = getSystemInfo();
    console.log('设备信息:', this.systemInfo);
}
```

### getBatteryInfo(options)

获取设备电池信息

**参数：**
- `options` (Object): 配置选项
  - `success` (Function): 成功回调函数
  - `fail` (Function): 失败回调函数

**示例：**
```javascript
getBatteryInfo() {
    getBatteryInfo({
        success: (res) => {
            this.batteryLevel = res.level;
            console.log('电池电量:', res.level + '%');
        },
        fail: () => {
            this.batteryLevel = '未知';
            console.log('获取电池信息失败');
        }
    });
}
```

### exitAPP()

退出应用程序

**示例：**
```javascript
exitApplication() {
    // 调用退出应用模块
    exitAPP();
}
```

### getNetworkType(callback)

获取网络类型并监听网络状态变化

**参数：**
- `callback` (Function): 网络状态变化回调函数

**返回值：**
- `Promise<string>`: 当前网络类型

**示例：**
```javascript
async initNetworkInfo() {
    try {
        this.networkType = await getNetworkType((type) => {
            this.networkType = type;
            console.log('网络类型变化:', type);
        });
    } catch (e) {
        this.networkType = '获取失败';
    }
}
```

## 完整使用示例

```vue
<template>
    <view class="container">
        <button @click="makePhoneCall">拨打电话</button>
        <input v-model="phoneNumber" placeholder="请输入手机号" />
        <button @click="sendMessage">发送短信</button>
        <button @click="getBatteryInfo">获取电池信息</button>
        <button @click="exitApplication">退出应用</button>
        
        <view v-if="systemInfo">
            <text>设备品牌：{{ systemInfo.brand }}</text>
            <text>设备型号：{{ systemInfo.deviceModel }}</text>
        </view>
    </view>
</template>

<script>
// #ifdef APP-HARMONY
import { makeCall, sendSms, getBatteryInfo, getSystemInfo, exitAPP, getNetworkType } from '@/uni_modules/nutpi-utils';
// #endif

export default {
    data() {
        return {
            phoneNumber: '',
            systemInfo: null,
            batteryLevel: 0,
            networkType: '未知'
        }
    },
    onLoad() {
        this.initSystemInfo();
        this.initNetworkInfo();
        this.getBatteryInfo();
    },
    methods: {
        makePhoneCall() {
            // #ifdef APP-HARMONY
            makeCall('17752170152');
            // #endif
        },
        
        sendMessage() {
            if (!this.phoneNumber) {
                uni.showToast({ title: '请输入手机号', icon: 'none' });
                return;
            }
            // #ifdef APP-HARMONY
            sendSms(this.phoneNumber, '来自系统工具的消息');
            // #endif
        },
        
        async initSystemInfo() {
            this.systemInfo = getSystemInfo();
        },
        
        getBatteryInfo() {
            getBatteryInfo({
                success: (res) => {
                    this.batteryLevel = res.level;
                },
                fail: () => {
                    this.batteryLevel = '未知';
                }
            });
        },
        
        async initNetworkInfo() {
            try {
                this.networkType = await getNetworkType((type) => {
                    this.networkType = type;
                });
            } catch (e) {
                this.networkType = '获取失败';
            }
        },
        
        exitApplication() {
            exitAPP();
        }
    }
}
</script>
```

## 平台兼容性

| 平台 | 支持状态 | 备注 |
|------|----------|------|
| HarmonyOS | ✅ 完全支持 | 所有功能均可正常使用 |
| Android | ❌ 不支持 | 需要原生开发 |
| iOS | ❌ 不支持 | 需要原生开发 |
| Web | ❌ 不支持 | 浏览器安全限制 |

## 注意事项

1. **平台检测**：建议使用条件编译 `#ifdef APP-HARMONY` 来确保代码只在支持的平台运行
2. **错误处理**：所有 API 调用都应该包含适当的错误处理逻辑
3. **用户体验**：在不支持的平台上应该提供友好的提示信息

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础的电话、短信、系统信息功能

## 开发文档

- [UTS 语法](https://uniapp.dcloud.net.cn/tutorial/syntax-uts.html)
- [UTS API插件](https://uniapp.dcloud.net.cn/plugin/uts-plugin.html)
- [UTS uni-app兼容模式组件](https://uniapp.dcloud.net.cn/plugin/uts-component.html)
- [UTS 标准模式组件](https://doc.dcloud.net.cn/uni-app-x/plugin/uts-vue-component.html)
- [Hello UTS](https://gitcode.net/dcloud/hello-uts)

## 许可证

MIT License

## 作者

坚果派 (nutpi)
- 公众号：nutpi
- 电话：17752170152
- 官网：https://www.nutpi.net/

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。