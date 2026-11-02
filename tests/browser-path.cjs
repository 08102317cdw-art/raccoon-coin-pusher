const fs = require('node:fs');
const paths = [
  process.env.CHROMIUM_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/local/bin/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
module.exports = paths.find(file => fs.existsSync(file));
if (!module.exports) throw new Error('找不到 Chromium 浏览器，请通过 CHROMIUM_PATH 指定可执行文件。');
