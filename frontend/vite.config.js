import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // 👈 1. Added this missing import
import path from "path"; // 👈 2. Added this to handle folder paths

export default defineConfig({
  plugins: [react(), tailwindcss()],

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
        target: "http://localhost/IMS/backend/public",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
