import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "html-inject-app-name",
      transformIndexHtml(html) {
        return html.replace(/__APP_NAME__/g, pkg.name);
      },
    },
  ],
  define: {
    __APP_NAME__: JSON.stringify(pkg.name),
  },
  root: "client",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.PORTLESS_URL!.replace("://", "://api."),
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: [
      "@tanstack/react-query",
    ],
  },
});
