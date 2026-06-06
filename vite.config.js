import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const isCapitao = process.env.APP === "capitao";

// Dois alvos de build (links separados no GitHub Pages):
//   APP=admin   (padrão) → site da Organização  → base /copa-beach-tennis/  → outDir dist
//   APP=capitao          → site do Capitão       → base /copa-capitao/       → outDir dist-capitao
export default defineConfig({
  base: process.env.NODE_ENV === "production"
    ? (isCapitao ? "/copa-capitao/" : "/copa-beach-tennis/")
    : "/",
  plugins: [react()],
  server: { port: 5174 },
  build: {
    outDir: isCapitao ? "dist-capitao" : "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: isCapitao ? resolve(dir, "capitao.html") : resolve(dir, "index.html"),
    },
  },
});
