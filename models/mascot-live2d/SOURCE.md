# Q肥鱼 Live2D 模型来源

- 上游：Alps-Link/deepseek-whale-Desktop-pet，固定版本 `84aebd3056a1c10a496f8b526d9671eb0fd55842`。
- 来源路径：`live2d_viewer/model`，仅采用 Q肥鱼（c_0120），不采用仓库的其他模型。
- 模型制作：**B站 @氵六青（11272072）**，见原始 `使用须知.txt`。上游称已获作者允许使用和二次分发；原发布视频：<https://www.bilibili.com/video/BV16yYi69EQT>。
- 上游说明：<https://github.com/Alps-Link/deepseek-whale-Desktop-pet/blob/84aebd3056a1c10a496f8b526d9671eb0fd55842/README.md>
- 按上游 **CC BY-NC-SA 4.0** 非商业、署名、相同方式共享条件分发，保留原使用须知。协议副本见 `../../licenses/DAFEIYU-LIVE2D.txt`。不把上游针对直播的单独说明解释为本游戏商业化许可；不得出售本模型。

## 本项目的改动

两张贴图等比降至最长边 1024px；原 MOC3 绑定和 physics3 未修改。model3 文件删除未打包的动作/表情引用，保留 Idling、Touch 与六个表情。运行时仅预取触摸动作；眼睛、视线、头部、呼吸和口型由本游戏的参数驱动。没有教程作者的模型或视频素材，没有从整图伪造“Live2D”声明，也没有声称原创绑定。

`tools/pack-live2d.py` 将本目录资源压成 `src/art/live2d-assets.js`，用于无网络的 Blob 加载；`MANIFEST.json` 记录打包文件的 SHA-256。模型改编部分沿用 CC BY-NC-SA 4.0。模型并非 Cubism 编辑工程：不含 `.cmo3` 分层编辑源文件。

## 运行库单独许可

- Core：官方 `https://cubism.live2d.com/sdk-web/core/05/live2dcubismcore.min.js`，5.2 兼容版本；原样保留头部、版权和代码，属于官方标记的 Redistributable Code，不将其作为本项目原创或 MIT 代码。
- Core 许可：`../../licenses/LIVE2D-CORE-LICENSE.txt`。
- Cubism Framework：`../../licenses/LIVE2D-FRAMEWORK-LICENSE.txt`。
- PixiJS 6.5.10、pixi-live2d-display 0.4.0：各自 MIT，副本在 `../../licenses/`。
- 非商业模型的许可不替代 SDK 的出版/商业许可要求；更改用途之前须自行核验并取得所需授权。
