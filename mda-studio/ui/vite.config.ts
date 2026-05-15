import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3101,
    host: "127.0.0.1",
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3100",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
