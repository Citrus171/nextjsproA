import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

async function getVisualizerPlugin(): Promise<Plugin | null> {
  try {
    const { visualizer } = await import("rollup-plugin-visualizer");
    return visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    });
  } catch {
    return null;
  }
}

export default defineConfig(async () => {
  const visualizerPlugin = await getVisualizerPlugin();
  return {
    plugins: [react(), ...(visualizerPlugin ? [visualizerPlugin] : [])],
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
