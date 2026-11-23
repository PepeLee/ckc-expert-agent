import { defineConfig } from 'vite';
// 版本号单一来源是 package.json 的 version（注入产物里的 __CKC_VERSION__），发版只改一处
import pkg from './package.json';

export default defineConfig({
  define: {
    __CKC_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      // UMD 全局变量名（script 标签引入后 window.CkcExpertAgent 上也能拿到导出）
      name: 'CkcExpertAgent',
      // ESM（npm / 打包器入口）+ UMD（script 标签 CDN 入口）
      formats: ['es', 'umd'],
      // 产物文件名：UMD 名固定为部署约定的 ckc-expert-agent.umd.js；ESM 用 .mjs 后缀（package.json 未设 type:module，.mjs 才能被 Node/打包器确定无疑地按 ESM 解析）
      fileName: (format) => (format === 'es' ? 'ckc-expert-agent.es.mjs' : 'ckc-expert-agent.umd.js'),
    },
    // 兼容性稍好的产物目标，便于放到 CDN 给各种接入方使用
    target: 'es2017',
    sourcemap: true,
  },
});
