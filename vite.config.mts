import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      // UMD 全局变量名（script 标签引入后 window.CkcExpertAgent 上也能拿到导出）
      name: 'CkcExpertAgent',
      formats: ['umd'],
    },
    // 兼容性稍好的产物目标，便于放到 CDN 给各种接入方使用
    target: 'es2017',
    sourcemap: true,
  },
});
