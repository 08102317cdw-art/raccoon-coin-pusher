# 浣熊推币机 · Raccoon Coin Pusher

一个以浣熊为主题的 3D 推币机街机小游戏，使用 Three.js 与 Rapier 物理引擎制作。支持桌面浏览器和手机触屏，包含老虎机奖励、连胜 Fever、音效与本地存档。

## 在线试玩

[打开在线试玩](https://08102317cdw-art.github.io/raccoon-coin-pusher/)

首次发布需在仓库 **Settings → Pages** 中选择 **Deploy from a branch**，分支设为 **main**、目录设为 **/(root)** 并保存；部署完成后上述链接生效。后续推送到 main 会自动更新网站。

在线版使用固定版本的 CDN 依赖，需要联网；离线单文件版按下方说明构建。

## 运行

需要 Node.js 18 或更高版本。

```sh
npm ci
npm run build
```

构建完成后，用浏览器打开 `dist/raccoon-coin-pusher.html` 即可游玩。生成的 HTML 是单文件版本，不需要游戏运行时联网。

## 操作

- 鼠标移动或触屏拖动：瞄准投币位置。
- 点击、长按或按空格：投币；手机也可点屏幕上的“投币”按钮。
- 让硬币穿过移动的绿色 `LUCKY` 门，触发老虎机奖励。
- 页面按钮可控制音效、音乐、玩法说明和存档重置。

游戏进度保存在浏览器的 `localStorage` 中。不同浏览器或设备之间不会自动同步。

## 技术栈

- [Three.js](https://threejs.org/)：3D 渲染、材质、灯光与后期效果。
- [Rapier](https://rapier.rs/)：硬币与推板的实时物理模拟。
- [esbuild](https://esbuild.github.io/)：将源码打包进独立 HTML。

## 项目结构

```text
index.html     在线试玩入口（GitHub Pages）
src/
  index.html   页面、HUD 与样式
  main.js      游戏场景、输入、物理与主循环
  slot.js      LUCKY 门、老虎机和奖励逻辑
  mascot.js    浣熊吉祥物
  textures.js  程序化材质与纹理
  audio.js     合成音效与音乐
build.sh       单文件构建脚本
```

## 许可证

本项目采用 MIT License，详见 [LICENSE](LICENSE)。
