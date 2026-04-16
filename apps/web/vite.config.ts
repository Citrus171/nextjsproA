import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Ensure Vite can access sibling packages in the monorepo and pre-bundle axios
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, ".."), path.resolve(__dirname, "../../packages"), path.resolve(__dirname, "../..")],
    },
    proxy: {
      // Proxy /api requests to the NestJS API so cookies are same-origin in dev
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
  optimizeDeps: {
    include: ["axios"],
  },
});
