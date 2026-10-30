import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// nitro() gera o build no formato certo para cada hospedagem.
// Na Vercel o preset é detectado sozinho; local/VPS usa Node (.output).
export default defineConfig({
  server: { port: 3000 },
  plugins: [tanstackStart(), nitro(), viteReact()],
});
