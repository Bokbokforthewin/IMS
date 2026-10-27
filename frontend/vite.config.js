import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load APP_URL directly from your root .env file
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.APP_URL || 'http://192.168.10.17:8000';

  return {
    plugins: [react(), tailwindcss()],

    // Expose APP_URL globally to React components
    define: {
      'import.meta.env.APP_URL': JSON.stringify(backendTarget),
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      host: true,
      port: 5173,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        "/storage": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});