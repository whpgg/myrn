import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const outBaseDir = path.join(rootDir, 'dist', 'android-biz');
const outBundleDir = path.join(outBaseDir, 'package');
const resDir = path.join(outBundleDir, 'res');
const bundleFile = path.join(outBundleDir, 'index.android.bundle');
const zipFile = path.join(outBaseDir, `rn-biz-${pkg.version}.zip`);

fs.rmSync(outBaseDir, { recursive: true, force: true });
fs.mkdirSync(resDir, { recursive: true });

console.log('[1/4] 生成 Android JS Bundle...');
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

console.log('[2/4] 生成业务包清单 manifest...');
const manifest = {
  packageName: pkg.name,
  version: pkg.version,
  moduleName: 'main',
  entryFile: 'index.js',
  bundleFile: 'index.android.bundle',
  assetsDir: 'res',
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(outBundleDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

console.log('[3/4] 复制交付说明...');
const readme = [
  '# Android RN 业务包交付说明',
  '',
  '## 包内容',
  '- index.android.bundle',
  '- res/ (图片/字体等静态资源)',
  '- manifest.json',
  '',
  '## 宿主侧加载',
  '1. 将 index.android.bundle 放到宿主 app/src/main/assets/',
  '2. 将 res/ 合并到宿主 app/src/main/res/ 或宿主自定义资源目录',
  "3. 宿主以 moduleName = 'main' 创建 ReactRootView 加载 RN 页面",
  '',
  '## 版本策略',
  '- 仅 JS/样式/图片资源变化: 可只替换本业务包',
  '- 新增原生依赖(原生模块/权限/AndroidManifest/Gradle): 宿主必须重新发版',
].join('\n');
fs.writeFileSync(path.join(outBundleDir, 'README.md'), readme, 'utf8');

console.log('[4/4] 打成 zip 交付件...');
execSync(`cd "${outBundleDir}" && zip -rq "${zipFile}" .`, { stdio: 'inherit' });

console.log(`\n完成: ${zipFile}`);
