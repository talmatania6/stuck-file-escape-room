import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built `dist` folder works when dragged into netlify.com/drop
export default defineConfig({
  base: './',
  plugins: [react()],
});
