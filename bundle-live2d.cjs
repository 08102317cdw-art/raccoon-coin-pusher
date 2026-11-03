const fs=require('node:fs'),esbuild=require('esbuild');
fs.mkdirSync('src/vendor',{recursive:true});
esbuild.buildSync({entryPoints:['src/live2d-mascot.js'],outfile:'src/vendor/live2d-mascot.bundle.js',bundle:true,minify:true,format:'esm',target:'es2022',logLevel:'warning'});
