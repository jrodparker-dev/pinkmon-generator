import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages, set VITE_BASE to "/<repo-name>/"
// Example (Git Bash):
//   set VITE_BASE=/MyRepoName/ && npm run build
export default defineConfig({
  plugins: [react()],
  base: './',
});

