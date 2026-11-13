import { defineConfig } from 'vite';

export default defineConfig({
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
