/**
 * 给 tsc 生成的类型声明补上 UMD 全局命名空间声明（export as namespace）：
 * 该语法只允许出现在 .d.ts 里（源文件 .ts 写会报 TS1315），所以在构建后追加。
 * 供 script 标签 + TypeScript 的接入方拿到 window.CkcExpertAgent 的类型。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.d.ts');
const text = fs.readFileSync(file, 'utf8');
if (!text.includes('export as namespace')) {
  fs.writeFileSync(
    file,
    text.trimEnd() +
      '\n\n// UMD 全局命名空间：script 标签引入后 window.CkcExpertAgent 上的导出\nexport as namespace CkcExpertAgent;\n',
  );
}
