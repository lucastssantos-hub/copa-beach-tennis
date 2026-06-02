import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/copa-beach-tennis/" : "/",
  plugins: [react()],
  server: { port: 5174 },
});
