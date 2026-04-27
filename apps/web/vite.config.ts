import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Ensure Vite can access sibling packages in the monorepo and pre-bundle axios
  server: {
    port: 5173,
    fs: {
      allow: [
        path.resolve(__dirname, ".."),
        path.resolve(__dirname, "../../packages"),
        path.resolve(__dirname, "../.."),
      ],
    },
    proxy: {
      // Proxy /api requests to the NestJS API so cookies are same-origin in dev
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["axios", "react-leaflet", "@react-leaflet/core", "leaflet"],
  },
});
