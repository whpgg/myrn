# Android Native 接入 React Native 总结

## 背景

本项目的目标不是把整个 Android 工程改造成纯 React Native，而是在不影响原生 Android 独立开发的前提下，把外层的 Expo + React Native 工程接入到 `android-native-app` 中，并通过原生按钮跳转到 RN 页面。

整体思路是：

1. 原生 App 继续保持自己的启动、页面、调试和打包流程
2. 在原生工程里接入 React Native 运行时
3. 新建一个承载 RN 的 `ReactActivity`
4. 从原生页面跳转到这个 RN 容器页
5. 打包 APK 时把 JS bundle 和原生依赖一起带进去

---

## 本项目结构

```text
blankrn/
├── index.js
├── App.js
├── metro.config.js
├── package.json
├── node_modules/
└── android-native-app/
    ├── settings.gradle.kts
    ├── build.gradle.kts
    ├── gradle.properties
    └── app/
        ├── build.gradle.kts
        └── src/main/
            ├── AndroidManifest.xml
            └── java/com/example/myapp/
                ├── MainActivity.kt
                ├── MainApplication.kt
                └── RNContainerActivity.kt
```

说明：

- 根目录 `blankrn/` 是 Expo + RN 工程
- `android-native-app/` 是原生 Android 子工程
- 原生工程通过 Gradle 指向上一级目录，把外层 RN 工程接进来

---

## 一、接入 RN 需要做哪些事

### 1. 准备 RN 入口

RN 工程至少要有入口文件和根组件，例如：

- `index.js`
- `App.js`

其中 `index.js` 负责注册 RN 根组件。本项目里使用：

```js
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```

它最终会注册名为 `main` 的组件，原生侧的 `ReactActivity` 也必须返回同一个组件名。

### 2. 让原生 Gradle 能找到 RN 工程

原生工程要明确知道下面这些路径：

- RN 项目根目录
- JS 入口文件
- `react-native` 目录
- `@react-native/codegen` 目录
- Expo / RN 的 Gradle plugin 和 autolinking 信息

本项目的关键点是 `android-native-app` 在子目录中，所以通过 `rootDir.parentFile` 指向外层 RN 根目录。

### 3. 初始化 React Native 运行时

原生应用启动时，需要在 `Application` 中初始化 RN 环境。核心工作包括：

- `Application` 实现 `ReactApplication`
- 提供 `ReactHost`
- 在 `onCreate()` 中调用 RN 初始化逻辑
- 如果使用 Expo，还要初始化 Expo 生命周期

### 4. 提供 RN 页面容器

原生侧需要新建一个 Activity 专门承载 RN 页面，通常做法是：

- 继承 `ReactActivity`
- 重写 `getMainComponentName()`
- 返回 JS 侧注册的根组件名

如果使用 Expo，还要使用 Expo 提供的 `ReactActivityDelegateWrapper`。

### 5. 从原生页面跳转到 RN 页面

原生页面保持自己的 UI 和业务逻辑，只在点击某个按钮时跳转到 RN 容器页，例如：

```kotlin
startActivity(Intent(this, RNContainerActivity::class.java))
```

### 6. 注册 Android 组件和权限

在 `AndroidManifest.xml` 中至少要配置：

- 自定义 `Application`
- RN 容器 Activity
- 常见权限，如 `INTERNET`

### 7. 让原生模块自动链接

如果 RN 页面依赖这些包：

- `react-native-webview`
- `react-native-safe-area-context`
- `expo-image-picker`
- `expo-screen-orientation`

那么它们不只是 JS 依赖，还需要把对应 Android 原生模块一起接入。  
现在通常不手动维护 `Package` 列表，而是交给：

- React Native autolinking
- Expo autolinking

### 8. 打包时把 JS bundle 带进 APK

这是原生接入 RN 最容易漏掉的一步。

如果只是在开发时依赖 Metro 远程提供 JS，那么打包出来的 APK 很可能会在打开 RN 页面时出现：

- 找不到脚本
- 白屏
- 提示未运行 Metro

所以需要确保构建时会生成 bundle，并打进 APK。

---

## 二、本项目里的实现映射

### 1. RN 入口文件

- `index.js`
- `App.js`
- `metro.config.js`

作用：

- `index.js` 负责注册根组件
- `App.js` 是 RN 页面根组件
- `metro.config.js` 是打包配置

### 2. Gradle 配置

涉及文件：

- `android-native-app/settings.gradle.kts`
- `android-native-app/build.gradle.kts`
- `android-native-app/app/build.gradle.kts`
- `android-native-app/gradle.properties`

作用：

- 找到 Expo / RN 的 Gradle 插件
- 开启 autolinking
- 指向外层 RN 工程根目录
- 指向 `index.js`
- 指向 `node_modules/react-native`
- 配置 Hermes、NDK、JVM target、compileSdk 等构建参数

### 3. 原生初始化

涉及文件：

- `android-native-app/app/src/main/java/com/example/myapp/MainApplication.kt`

作用：

- 实现 `ReactApplication`
- 创建 `ReactHost`
- 在应用启动时初始化 RN 和 Expo

### 4. RN 容器页面

涉及文件：

- `android-native-app/app/src/main/java/com/example/myapp/RNContainerActivity.kt`

作用：

- 作为 RN 的承载页面
- 返回根组件名 `main`
- 接管 RN 页面生命周期

### 5. 原生跳转入口

涉及文件：

- `android-native-app/app/src/main/java/com/example/myapp/MainActivity.kt`

作用：

- 保持原生 Activity 不变
- 点击按钮后跳转到 `RNContainerActivity`

### 6. Android 注册

涉及文件：

- `android-native-app/app/src/main/AndroidManifest.xml`

作用：

- 注册 `MainApplication`
- 注册 `RNContainerActivity`
- 配置所需权限

---

## 三、运行链路

完整链路可以理解为：

1. 启动原生 App
2. `MainApplication` 初始化 React Native 和 Expo
3. 用户停留在原生 `MainActivity`
4. 用户点击按钮
5. 原生跳转到 `RNContainerActivity`
6. `RNContainerActivity` 根据组件名 `main` 加载 RN 页面
7. RN 运行时加载已打包进 APK 的 JS bundle
8. `index.js` 启动 `App.js`
9. RN 页面显示出来

---

## 四、最小接入清单

如果以后要在别的原生 Android 项目里再接一次 RN，最小操作清单可以记成下面这几项：

1. 准备 RN 工程入口文件，如 `index.js`
2. 在 Android Gradle 中配置 RN 根目录、入口文件和 `react-native` 路径
3. 接入 React Native Gradle plugin
4. 如果使用 Expo，接入 Expo autolinking 和 Expo Gradle plugin
5. 自定义 `Application` 并初始化 RN
6. 新建一个继承 `ReactActivity` 的 RN 容器页
7. 在原生页面中通过 `Intent` 跳转到 RN 容器页
8. 在 `AndroidManifest.xml` 中注册 `Application`、Activity 和权限
9. 确保构建时会打包 JS bundle 到 APK
10. 校验自动链接的原生模块是否都已正确参与构建

---

## 五、容易踩的坑

### 1. 组件名对不上

JS 入口注册的名字和 `ReactActivity#getMainComponentName()` 返回值必须一致，否则 RN 页面无法渲染。

### 2. 只配了 JS，没配原生模块

JS 包装上了不代表 Android 原生侧就能工作，像 WebView、图片选择器、安全区这些都需要 autolinking 正常生效。

### 3. 只在 debug 能跑，打包后不行

如果 APK 里没有 JS bundle，安装后打开 RN 页面会直接失败。  
所以“能连 Metro 跑起来”不等于“APK 可用”。

### 4. Android Studio 环境里找不到 node

命令行里能跑，不代表 Android Studio 启动的 Gradle 进程也能找到 `node`。  
这类问题往往和 GUI 环境变量有关，不一定是项目代码问题。

### 5. Android 构建版本不兼容

常见包括：

- Gradle 版本不兼容
- Kotlin / Java target 不一致
- compileSdk 太低
- NDK 版本错误或损坏

这些问题虽然不是 RN 逻辑本身，但往往是实际接入里最耗时间的部分。

---

## 六、一句话总结

原生接入 RN，本质上就是：

让 Android 工程在构建期找到 RN 工程，在运行期初始化 RN 容器，在页面层通过一个 `ReactActivity` 把 RN 页面挂进原生 App，并确保最终 APK 自带可执行的 JS bundle 和所需原生模块。

