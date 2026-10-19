import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/chiyun-app/",
  build: {
    outDir: "../frontend/public/chiyun-app",
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [".monkeycode-ai.online"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: [".monkeycode-ai.online"],
  },
});
