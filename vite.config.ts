import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        additionalData: `
          @primary-color: #1890ff;
          @success-color: #52c41a;
          @warning-color: #faad14;
          @error-color: #f5222d;
        `
      }
    }
  }
})
