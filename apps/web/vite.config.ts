import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async () => {
  const { visualizer } = await import("rollup-plugin-visualizer");
  return {
    plugins: [
      react(),
      visualizer({
        filename: "dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
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
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (
              id.includes("react-dom") ||
              id.includes("react-router-dom") ||
              (id.includes("node_modules/react/") &&
                !id.includes("react-dom") &&
                !id.includes("react-router"))
            ) {
              return "vendor";
            }
            if (id.includes("@tanstack/react-query")) {
              return "tanstack";
            }
          },
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
  };
});
