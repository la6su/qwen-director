import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const apiTarget = process.env.QWEN_API_PROXY_TARGET ?? 'http://127.0.0.1:4310';

export default defineConfig({
  plugins: [vue()],
  server: { proxy: { '/v1': apiTarget, '/health': apiTarget, '/ready': apiTarget, '/metrics': apiTarget } },
  preview: { proxy: { '/v1': apiTarget, '/health': apiTarget, '/ready': apiTarget, '/metrics': apiTarget } },
});
