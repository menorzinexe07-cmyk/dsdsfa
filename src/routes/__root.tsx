import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import css from "../styles.css?url";
import panelCss from "../panel.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "color-scheme", content: "dark" },
      { title: "Zyra Apps — ZyraSallers" },
      { name: "theme-color", content: "#000000" },
      { name: "description", content: "Automatize suas vendas dentro do Discord com o ZyraSallers, da Zyra Applications." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: css },
      { rel: "stylesheet", href: panelCss },
    ],
  }),
  component: () => (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body><Outlet /><Scripts /></body>
    </html>
  ),
  notFoundComponent: () => (
    <div style={{ padding: 60, textAlign: "center" }}><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></div>
  ),
});
