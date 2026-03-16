/**
 * 首次集成包：生成给原生安卓宿主第一次接入 RN 所需的完整交付件
 *
 * 包含内容：
 *   1. JS Bundle + 静态资源
 *   2. 宿主侧原生代码模板（MainApplication、RNContainerActivity）
 *   3. Gradle/Manifest 配置片段
 *   4. 分步接入说明 README
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

const outBaseDir = path.join(rootDir, 'dist', 'android-first-integration');
const bundleDir = path.join(outBaseDir, '1-bundle');
const resDir = path.join(bundleDir, 'res');
const nativeDir = path.join(outBaseDir, '2-native-src');
const zipFile = path.join(outBaseDir, `rn-first-integration-${pkg.version}.zip`);

fs.rmSync(outBaseDir, { recursive: true, force: true });
fs.mkdirSync(resDir, { recursive: true });
fs.mkdirSync(nativeDir, { recursive: true });

// ─── Step 1: JS Bundle ───────────────────────────────────────────────────────
console.log('[1/5] 生成 Android JS Bundle...');
const bundleFile = path.join(bundleDir, 'index.android.bundle');
execSync(
  [
    'npx expo export:embed',
    '--platform android',
    '--dev false',
    '--entry-file index.js',
    `--bundle-output "${bundleFile}"`,
    `--assets-dest "${resDir}"`,
  ].join(' '),
  { stdio: 'inherit' }
);

// ─── Step 2: 原生代码模板 ──────────────────────────────────────────────────
console.log('[2/5] 生成宿主原生代码模板...');

// MainApplication 模板（宿主已有 Application 类则参考合并）
fs.writeFileSync(
  path.join(nativeDir, 'MainApplication.kt'),
  `package 【替换为宿主包名】

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

// 如果宿主已有 Application 类，将下方内容合并进去
class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages
    )
  }

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
`
);

// RNContainerActivity：宿主通过跳转此 Activity 展示 RN 页面
fs.writeFileSync(
  path.join(nativeDir, 'RNContainerActivity.kt'),
  `package 【替换为宿主包名】

import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

/**
 * 宿主通过 startActivity(Intent(this, RNContainerActivity::class.java)) 打开此页面
 * 也可通过 Intent extras 向 RN 传递初始参数
 */
class RNContainerActivity : ReactActivity() {

  // 对应 index.js 里 AppRegistry.registerComponent('main', ...) 的第一个参数
  override fun getMainComponentName(): String = "main"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {}
    )

  override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) super.invokeDefaultOnBackPressed()
      return
    }
    super.invokeDefaultOnBackPressed()
  }
}
`
);

// ─── Step 3: Gradle 配置片段 ───────────────────────────────────────────────
console.log('[3/5] 生成 Gradle 配置片段...');

fs.writeFileSync(
  path.join(nativeDir, 'gradle-snippets.md'),
  `# Gradle 配置说明

## android/settings.gradle 顶部追加

\`\`\`groovy
pluginManagement {
  def reactNativeGradlePlugin = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })")
    }.standardOutput.asText.get().trim()
  ).getParentFile().absolutePath
  includeBuild(reactNativeGradlePlugin)
  def expoPluginsPath = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })")
    }.standardOutput.asText.get().trim(),
    "../android/expo-gradle-plugin"
  ).absolutePath
  includeBuild(expoPluginsPath)
}
plugins {
  id("com.facebook.react.settings")
  id("expo-autolinking-settings")
}
extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->
  ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
}
expoAutolinking.useExpoModules()
expoAutolinking.useExpoVersionCatalog()
includeBuild(expoAutolinking.reactNativeGradlePlugin)
\`\`\`

## android/build.gradle dependencies 追加

\`\`\`groovy
classpath('com.android.tools.build:gradle')
classpath('com.facebook.react:react-native-gradle-plugin')
classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
\`\`\`

## app/build.gradle 顶部追加

\`\`\`groovy
apply plugin: "com.facebook.react"

react {
  // RN 入口文件
  entryFile = file("../../index.js")
  // 使用 Expo CLI 打包
  cliFile = new File(...)
  bundleCommand = "export:embed"
  autolinkLibrariesWithApp()
}
\`\`\`

## AndroidManifest.xml 权限追加

\`\`\`xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
\`\`\`

## AndroidManifest.xml application 内追加 RNContainerActivity

\`\`\`xml
<activity
  android:name=".RNContainerActivity"
  android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
  android:windowSoftInputMode="adjustResize"
  android:exported="false" />
\`\`\`
`
);

// ─── Step 4: manifest.json ────────────────────────────────────────────────
console.log('[4/5] 生成交付清单...');
const manifest = {
  packageName: pkg.name,
  version: pkg.version,
  moduleName: 'main',
  entryFile: 'index.js',
  rnVersion: pkg.dependencies['react-native'],
  expoVersion: pkg.dependencies['expo'],
  nativeDeps: Object.keys(pkg.dependencies).filter(
    (k) => !['react', 'react-native', 'expo'].includes(k)
  ),
  generatedAt: new Date().toISOString(),
  integrationType: 'first',
};
fs.writeFileSync(
  path.join(outBaseDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

// ─── Step 5: README ───────────────────────────────────────────────────────
const readme = `# RN 首次接入安卓原生 - 交付包说明

## 目录结构
- 1-bundle/index.android.bundle   JS 业务包
- 1-bundle/res/                   静态资源（图片/字体）
- 2-native-src/MainApplication.kt     宿主 Application 模板
- 2-native-src/RNContainerActivity.kt RN 容器 Activity 模板
- 2-native-src/gradle-snippets.md     Gradle/Manifest 配置说明
- manifest.json                       本次交付信息

## 接入步骤（共 5 步）

### 第 1 步：在 RN 项目根目录安装依赖（宿主工程同机器，或 CI）
把 RN 项目 node_modules 准备好（已有则跳过）

### 第 2 步：配置 Gradle
参考 2-native-src/gradle-snippets.md，按说明修改宿主的
settings.gradle / build.gradle / app/build.gradle / AndroidManifest.xml

### 第 3 步：添加原生代码
- 将 RNContainerActivity.kt 复制到宿主包名目录，修改顶部包名
- 若宿主没有 ReactApplication，将 MainApplication.kt 也一并复制；
  若已有 Application 类，将 MainApplication.kt 里的内容合并进去

### 第 4 步：放入 Bundle + 资源
- 将 1-bundle/index.android.bundle 复制到宿主 app/src/main/assets/
- 将 1-bundle/res/ 内容合并到宿主 app/src/main/res/

### 第 5 步：跳转打开
在宿主任意位置通过 Intent 打开 RN 页面：

\`\`\`kotlin
startActivity(Intent(this, RNContainerActivity::class.java))
\`\`\`

## 后续只更新 JS（不用重新发原生）
运行：npm run bundle:android:biz
替换宿主 assets/index.android.bundle 即可

## 必须重新发原生版本的情况
- 新增原生模块（如新 Expo 插件、第三方 Native Module）
- AndroidManifest 新增权限或组件
- 升级 react-native 或 expo 大版本
- 修改 Gradle 依赖
`;
fs.writeFileSync(path.join(outBaseDir, 'README.md'), readme, 'utf8');

// ─── 打 zip ────────────────────────────────────────────────────────────────
console.log('[5/5] 打 zip 交付件...');
execSync(`cd "${outBaseDir}" && zip -rq "${zipFile}" .`, { stdio: 'inherit' });

console.log(`\n✅ 完成: ${zipFile}`);
console.log(`   解压后参考 README.md 分 5 步完成首次接入`);
