import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await cp('index.html','dist/index.html');
await cp('src/style.css','dist/src/style.css');
console.log('Built offline-ready static app → dist/');
