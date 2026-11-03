# 角色素材署名与许可

《大肥鱼推币机》为免费、非商业、非官方同人项目，与 DeepSeek 及角色原作者无隶属关系、无官方背书。没有因为改名就取得独占名称、商标或全部角色权利。

## 使用的立绘

- 来源：[CrossPet / characters/deepseek](https://github.com/lokicorvus/crosspet/tree/5c64326b6e7fc175eda0360c0bb5c4732541d138/characters/deepseek)
- 固定上游版本：`5c64326b6e7fc175eda0360c0bb5c4732541d138`
- 文件：`idle.webp`、`happy.webp`、`eat.webp`。本作转换为 `src/art/{idle,happy,eat}.js` 中的 WebP data URI。
- 原型「溟月」：**上善无形**，https://space.bilibili.com/4456176
- 深蓝女仆鲸鱼娘设定（社区昵称「大肥鱼」）：**ZipZipPipe**，https://space.bilibili.com/4168597
- 本次采用的 Q 版表情立绘：**CrossPet / lokicorvus**，由上游按角色设定使用 AI 工具重新绘制。
- 上游许可：[characters/LICENSE.md](https://github.com/lokicorvus/crosspet/blob/5c64326b6e7fc175eda0360c0bb5c4732541d138/characters/LICENSE.md)，副本保存在 [licenses/CHARACTER-ART.md](licenses/CHARACTER-ART.md)。

## 改动与分享

本作将立绘等比缩小、WebP 压缩；老虎机取脸部裁切；用于启动页、侧栏、亚克力立牌及收藏立牌，并加入表情切换和位置动画。未声称这些立绘是本项目原创。

以上美术及改编美术按 **CC BY-NC-SA 4.0** 发布。须保留署名，不得用于商业目的，公开分享改编美术时按相同协议发布。完整协议见 [licenses/CC-BY-NC-SA-4.0.txt](licenses/CC-BY-NC-SA-4.0.txt)。

代码使用 MIT；MIT 不覆盖上述美术、既有角色设定或商标。DeepSeek 等名称和商标归各自权利人所有。计划商业化前须另行获得相关许可。原作者如对使用方式有异议，请在本仓库提交 Issue。

## v3.2 原创街机环境与纹样

`src/arcade-room.js` 内的夜间游乐厅背景为本项目使用 AI 辅助生成的原创环境图，不含 RACCOIN 的截图或拆包素材。`src/cabinet-finish.js`、金币与机身纹样为本项目新绘制的程序化美术。

原版官方截图与用户提供截图仅用于视觉分析，不被打包进游戏。既有大肥鱼角色素材的署名与非商业许可不变。


## v4.2 机台模型、标志与通用语音

- `models/whale-cabinet.blend` / `.glb`：本项目原创 Blender 建模，重建脚本为 `tools/build-cabinet.py`。未使用 Tripo3D 或 RACCOIN 下载模型；不包含 RACCOIN 的几何、美术或拆包资产。
- `src/brand.js`：本项目新绘制的鲸鱼标志与金属舱门图案，不代表官方商标授权。
- `src/art/lcd-art.js`：本项目使用 AI 辅助生成的原创海湾插画。
- `src/art/voice-clips.js`：本项目原创台词，使用 Microsoft Edge 通用中文合成语音 `zh-CN-XiaoxiaoNeural` 合成；不是角色官方配音，没有模仿或克隆特定真人。合成声音不按代码 MIT 许可声称取得专属权利。整个游戏保持免费、非商业用途；分发和后续用途需遵守相应服务条款。
- 原角色立绘及其 CC BY-NC-SA 4.0 约束不变。新增声音不表示已取得既有角色、名称或商标的官方许可。

## v4.3 真实 Live2D 吉祥物

机台吉祥物改为 Q肥鱼的原生 Cubism MOC3 模型，模型制作 **B站 @氵六青（11272072）**，由 [Alps-Link/deepseek-whale-Desktop-pet](https://github.com/Alps-Link/deepseek-whale-Desktop-pet/blob/84aebd3056a1c10a496f8b526d9671eb0fd55842/README.md) 按 CC BY-NC-SA 4.0 分享。本项目不声称从零绘制或绑定；两张贴图降为 1024px、选取部分动作并加入视线、眨眼、呼吸、触摸及通用合成语音的音量口型驱动。游戏保持非商业，模型不得出售。原 MOC3 与物理绑定未修改，不包含 Cubism `.cmo3` 编辑工程。详见 [模型来源与改动](models/mascot-live2d/SOURCE.md) 和随附原始使用须知。

- Live2D Cubism Core © Live2D Inc.：官方 SDK 的 Redistributable Code，遵循 [专有软件许可副本](licenses/LIVE2D-CORE-LICENSE.txt)，不是 MIT。
- Cubism Framework：遵循 [Live2D Open Software License 副本](licenses/LIVE2D-FRAMEWORK-LICENSE.txt)。
- PixiJS 6.5.10：[MIT](licenses/PIXI-MIT.txt)；pixi-live2d-display 0.4.0（Guan）：[MIT](licenses/PIXI-LIVE2D-DISPLAY-MIT.txt)。
- 运行库与美术的权利分别保留，不因本项目代码的 MIT 而改变。启动页、收藏物与后备立绘仍使用上述 CrossPet 美术。
