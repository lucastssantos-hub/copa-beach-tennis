import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const isCapitao = process.env.APP === "capitao";

// Dois alvos de build (links separados no GitHub Pages):
//   APP=admin   (padrão) → app principal (/, /org, /capitao, /telao) → base /copa-beach-tennis/  → outDir dist
//   APP=capitao          → app legado do Capitão                      → base /copa-capitao/       → outDir dist-capitao
export default defineConfig({
  base: process.env.NODE_ENV === "production"
    ? (isCapitao ? "/copa-capitao/" : "/copa-beach-tennis/")
    : "/",
  plugins: [react(), tailwindcss()],
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: { port: 5174 },
  build: {
    outDir: isCapitao ? "dist-capitao" : "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: isCapitao
        ? resolve(dir, "legacy-capitao.html")
        : { main: resolve(dir, "index.html"), legacy: resolve(dir, "legacy.html") },
    },
  },
});
