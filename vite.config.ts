import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  // 某些 uni-app 构建目标会把 output.format 设为 iife，
  // 与“代码分割（多 chunk）”冲突导致：
  // Invalid value "iife" for option output.format ...
  // 这里禁用代码分割，避免该冲突。
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'es',
        inlineDynamicImports: true,
        manualChunks: undefined
      }
    }
  }
})