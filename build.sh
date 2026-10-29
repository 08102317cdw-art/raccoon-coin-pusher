#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
mkdir -p dist
./node_modules/.bin/esbuild src/main.js --bundle --minify --format=esm --target=es2022 --outfile=dist/bundle.js --log-level=warning
node -e '
const fs = require("node:fs");
const html = fs.readFileSync("src/index.html", "utf8");
const bundle = fs.readFileSync("dist/bundle.js", "utf8").replace(/<\/script/g, "<\\\\/script");
if (!html.includes("/*BUNDLE*/")) throw new Error("Missing /*BUNDLE*/ placeholder in src/index.html");
fs.writeFileSync("dist/raccoon-coin-pusher.html", html.replace("/*BUNDLE*/", () => bundle));
'
printf 'Built dist/raccoon-coin-pusher.html\n'
