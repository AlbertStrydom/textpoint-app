import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

function matchesNodeModule(id: string, packageNames: string[]) {
  return packageNames.some((packageName) =>
    id.includes(`/node_modules/${packageName}/`) || id.includes(`\\node_modules\\${packageName}\\`)
  );
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@drizzle": path.resolve(import.meta.dirname, "drizzle"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }
          if (matchesNodeModule(id, ["react", "react-dom", "scheduler", "wouter"])) {
            return "react-core";
          }
          if (matchesNodeModule(id, ["@tanstack", "@trpc", "superjson", "zod"])) {
            return "trpc-data";
          }
          if (
            matchesNodeModule(id, [
              "@radix-ui",
              "next-themes",
              "sonner",
              "cmdk",
              "vaul",
              "embla-carousel-react",
              "react-resizable-panels",
            ])
          ) {
            return "ui-kit";
          }
          if (
            matchesNodeModule(id, [
              "date-fns",
              "moment",
              "react-big-calendar",
              "react-day-picker",
            ])
          ) {
            return "calendar";
          }
          if (matchesNodeModule(id, ["framer-motion", "recharts", "react-dnd", "react-dnd-html5-backend"])) {
            return "interactive";
          }
          if (matchesNodeModule(id, ["lucide-react"])) {
            return "icons";
          }
          if (id.includes("mermaid")) return "mermaid";
          if (id.includes("xlsx")) return "xlsx";
          if (id.includes("jspdf")) return "pdf-export";
          if (id.includes("papaparse")) return "csv-export";
          if (id.includes("cytoscape")) return "cytoscape";
          if (id.includes("html2canvas")) return "html-capture";
          if (id.includes("@tanstack")) return "tanstack";
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
